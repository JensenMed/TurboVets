import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertTaskSchema, updateTaskSchema, insertTaskCommentSchema } from "@shared/schema";
import { z } from "zod";

// Middleware to check user role
const requireRole = (roles: string[]) => {
  return async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      req.currentUser = user;
      next();
    } catch (error) {
      console.error("Role check error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};

// Middleware to ensure user is in same organization
const requireSameOrganization = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUser(userId);
    if (!user?.organizationId) {
      return res.status(400).json({ message: "User not associated with an organization" });
    }

    req.currentUser = user;
    req.organizationId = user.organizationId;
    next();
  } catch (error) {
    console.error("Organization check error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        // Create user if they don't exist (first time login)
        const newUser = await storage.upsertUser({
          id: userId,
          email: req.user.claims.email,
          firstName: req.user.claims.first_name,
          lastName: req.user.claims.last_name,
          profileImageUrl: req.user.claims.profile_image_url,
          role: 'employee',
        });
        return res.json(newUser);
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Organization routes
  app.post('/api/organizations', isAuthenticated, async (req: any, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Organization name is required" });
      }

      const organization = await storage.createOrganization({ name });
      
      // Update user to be admin of this organization AND set their organizationId
      const userId = req.user.claims.sub;
      await storage.updateUserRole(userId, 'admin');
      await storage.updateUserOrganization(userId, organization.id);
      
      res.json(organization);
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(500).json({ message: "Failed to create organization" });
    }
  });

  // User management routes
  app.get('/api/users', isAuthenticated, requireSameOrganization, async (req: any, res) => {
    try {
      const users = await storage.getUsersInOrganization(req.organizationId);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/users/:userId/role', 
    isAuthenticated, 
    requireSameOrganization,
    requireRole(['admin']),
    async (req: any, res) => {
      try {
        const { userId } = req.params;
        const { role } = req.body;
        
        if (!['admin', 'manager', 'employee'].includes(role)) {
          return res.status(400).json({ message: "Invalid role" });
        }

        // Critical security fix: Verify target user belongs to same organization
        const targetUser = await storage.getUserById(userId);
        if (!targetUser) {
          return res.status(404).json({ message: "User not found" });
        }
        
        if (targetUser.organizationId !== req.organizationId) {
          return res.status(403).json({ message: "Cannot modify users from other organizations" });
        }

        const user = await storage.updateUserRole(userId, role);
        res.json(user);
      } catch (error) {
        console.error("Error updating user role:", error);
        res.status(500).json({ message: "Failed to update user role" });
      }
    }
  );

  // Task routes
  app.get('/api/tasks', isAuthenticated, requireSameOrganization, async (req: any, res) => {
    try {
      const { status, assigneeId, search } = req.query;
      const tasks = await storage.getTasksInOrganization(req.organizationId, {
        status: status as string,
        assigneeId: assigneeId as string,
        search: search as string,
      });
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get('/api/tasks/stats', isAuthenticated, requireSameOrganization, async (req: any, res) => {
    try {
      const stats = await storage.getTaskStats(req.organizationId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching task stats:", error);
      res.status(500).json({ message: "Failed to fetch task stats" });
    }
  });

  app.get('/api/tasks/:taskId', isAuthenticated, requireSameOrganization, async (req: any, res) => {
    try {
      const { taskId } = req.params;
      const task = await storage.getTask(taskId);
      
      if (!task || task.organizationId !== req.organizationId) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post('/api/tasks', 
    isAuthenticated, 
    requireSameOrganization,
    requireRole(['admin', 'manager']),
    async (req: any, res) => {
      try {
        const taskData = insertTaskSchema.parse({
          ...req.body,
          creatorId: req.user.claims.sub,
          organizationId: req.organizationId,
        });

        // Critical security fix: Validate assignee belongs to same organization
        if (taskData.assigneeId) {
          const assignee = await storage.getUserById(taskData.assigneeId);
          if (!assignee || assignee.organizationId !== req.organizationId) {
            return res.status(400).json({ message: "Assignee not found in your organization" });
          }
        }

        const task = await storage.createTask(taskData);
        res.json(task);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: "Invalid task data", errors: error.errors });
        }
        console.error("Error creating task:", error);
        res.status(500).json({ message: "Failed to create task" });
      }
    }
  );

  app.patch('/api/tasks/:taskId',
    isAuthenticated,
    requireSameOrganization,
    async (req: any, res) => {
      try {
        const { taskId } = req.params;
        const task = await storage.getTask(taskId);
        
        if (!task || task.organizationId !== req.organizationId) {
          return res.status(404).json({ message: "Task not found" });
        }

        // Only allow task assignees, creators, managers, and admins to update tasks
        const user = req.currentUser;
        const canUpdate = user.role === 'admin' || 
                         user.role === 'manager' || 
                         task.assigneeId === user.id || 
                         task.creatorId === user.id;

        if (!canUpdate) {
          return res.status(403).json({ message: "Cannot update this task" });
        }

        // Critical security fix: Whitelist allowed fields and block dangerous ones
        const allowedFields = ['title', 'description', 'status', 'priority', 'category', 'assigneeId', 'dueDate'];
        const updates: any = {};
        
        for (const field of allowedFields) {
          if (req.body[field] !== undefined) {
            updates[field] = req.body[field];
          }
        }

        // Critical security fix: Validate assignee organization if updating assigneeId
        if (updates.assigneeId && updates.assigneeId !== task.assigneeId) {
          const assignee = await storage.getUserById(updates.assigneeId);
          if (!assignee || assignee.organizationId !== req.organizationId) {
            return res.status(400).json({ message: "Assignee not found in your organization" });
          }
        }

        // Set completedAt server-side when status changes to done
        if (updates.status === 'done' && task.status !== 'done') {
          updates.completedAt = new Date();
        } else if (updates.status !== 'done') {
          updates.completedAt = null;
        }

        const updateData = updateTaskSchema.parse({
          ...updates,
          id: taskId,
        });

        const updatedTask = await storage.updateTask(taskId, updateData);
        res.json(updatedTask);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: "Invalid task data", errors: error.errors });
        }
        console.error("Error updating task:", error);
        res.status(500).json({ message: "Failed to update task" });
      }
    }
  );

  app.delete('/api/tasks/:taskId',
    isAuthenticated,
    requireSameOrganization,
    requireRole(['admin', 'manager']),
    async (req: any, res) => {
      try {
        const { taskId } = req.params;
        const task = await storage.getTask(taskId);
        
        if (!task || task.organizationId !== req.organizationId) {
          return res.status(404).json({ message: "Task not found" });
        }

        await storage.deleteTask(taskId);
        res.json({ message: "Task deleted successfully" });
      } catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).json({ message: "Failed to delete task" });
      }
    }
  );

  // Task comments routes
  app.get('/api/tasks/:taskId/comments', 
    isAuthenticated, 
    requireSameOrganization, 
    async (req: any, res) => {
      try {
        const { taskId } = req.params;
        const task = await storage.getTask(taskId);
        
        if (!task || task.organizationId !== req.organizationId) {
          return res.status(404).json({ message: "Task not found" });
        }

        const comments = await storage.getTaskComments(taskId);
        res.json(comments);
      } catch (error) {
        console.error("Error fetching task comments:", error);
        res.status(500).json({ message: "Failed to fetch task comments" });
      }
    }
  );

  app.post('/api/tasks/:taskId/comments',
    isAuthenticated,
    requireSameOrganization,
    async (req: any, res) => {
      try {
        const { taskId } = req.params;
        const task = await storage.getTask(taskId);
        
        if (!task || task.organizationId !== req.organizationId) {
          return res.status(404).json({ message: "Task not found" });
        }

        const commentData = insertTaskCommentSchema.parse({
          ...req.body,
          taskId,
          userId: req.user.claims.sub,
        });

        const comment = await storage.addTaskComment(commentData);
        res.json(comment);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: "Invalid comment data", errors: error.errors });
        }
        console.error("Error adding task comment:", error);
        res.status(500).json({ message: "Failed to add task comment" });
      }
    }
  );

  const httpServer = createServer(app);
  return httpServer;
}
