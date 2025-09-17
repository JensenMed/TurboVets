import {
  users,
  organizations,
  tasks,
  taskComments,
  notifications,
  type User,
  type UpsertUser,
  type Organization,
  type InsertOrganization,
  type Task,
  type InsertTask,
  type UpdateTask,
  type TaskComment,
  type InsertTaskComment,
  type Notification,
  type InsertNotification,
  type TaskWithDetails,
  type UserWithOrganization,
  type NotificationWithDetails,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, ilike, or, count, lt } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Organization operations
  createOrganization(org: InsertOrganization): Promise<Organization>;
  getOrganization(id: string): Promise<Organization | undefined>;
  
  // User management
  getUserById(userId: string): Promise<User | null>;
  getUsersInOrganization(organizationId: string): Promise<UserWithOrganization[]>;
  updateUserRole(userId: string, role: 'admin' | 'manager' | 'employee'): Promise<User>;
  updateUserOrganization(userId: string, organizationId: string): Promise<User>;
  
  // Task operations
  createTask(task: InsertTask): Promise<Task>;
  updateTask(taskId: string, updates: Partial<UpdateTask>): Promise<Task>;
  deleteTask(taskId: string): Promise<void>;
  getTask(taskId: string): Promise<TaskWithDetails | undefined>;
  getTasksInOrganization(organizationId: string, filters?: {
    status?: string;
    assigneeId?: string;
    search?: string;
  }): Promise<TaskWithDetails[]>;
  reorderTask(taskId: string, newPosition: string, newStatus?: string): Promise<Task>;
  
  // Task comments
  addTaskComment(comment: InsertTaskComment): Promise<TaskComment>;
  getTaskComments(taskId: string): Promise<TaskComment[]>;

  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string, organizationId: string): Promise<NotificationWithDetails[]>;
  markNotificationAsRead(notificationId: string, userId: string): Promise<void>;
  markAllNotificationsAsRead(userId: string, organizationId: string): Promise<void>;
  deleteNotification(notificationId: string, userId: string): Promise<void>;
  getUnreadNotificationCount(userId: string, organizationId: string): Promise<number>;
  
  // Analytics
  getTaskStats(organizationId: string): Promise<{
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    overdue: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Organization operations
  async createOrganization(orgData: InsertOrganization): Promise<Organization> {
    const [org] = await db
      .insert(organizations)
      .values(orgData)
      .returning();
    return org;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  // User management
  async getUsersInOrganization(organizationId: string): Promise<UserWithOrganization[]> {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        role: users.role,
        organizationId: users.organizationId,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        organization: organizations,
      })
      .from(users)
      .leftJoin(organizations, eq(users.organizationId, organizations.id))
      .where(eq(users.organizationId, organizationId));

    return result.map(row => ({
      ...row,
      organization: row.organization || undefined
    })) as UserWithOrganization[];
  }

  async updateUserRole(userId: string, role: 'admin' | 'manager' | 'employee'): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserOrganization(userId: string, organizationId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ organizationId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUserById(userId: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return user || null;
  }

  // Task operations
  async createTask(taskData: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values(taskData)
      .returning();
    return task;
  }

  async updateTask(taskId: string, updates: Partial<UpdateTask>): Promise<Task> {
    const [task] = await db
      .update(tasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tasks.id, taskId))
      .returning();
    return task;
  }

  async deleteTask(taskId: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, taskId));
  }

  async reorderTask(taskId: string, newPosition: string, newStatus?: string): Promise<Task> {
    const updates: any = { position: newPosition, updatedAt: new Date() };
    if (newStatus) {
      updates.status = newStatus;
      if (newStatus === 'done') {
        updates.completedAt = new Date();
      } else {
        updates.completedAt = null;
      }
    }
    
    const [task] = await db
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, taskId))
      .returning();
    return task;
  }

  async getTask(taskId: string): Promise<TaskWithDetails | undefined> {
    const [task] = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        category: tasks.category,
        assigneeId: tasks.assigneeId,
        creatorId: tasks.creatorId,
        organizationId: tasks.organizationId,
        dueDate: tasks.dueDate,
        completedAt: tasks.completedAt,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        assignee: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          role: users.role,
          organizationId: users.organizationId,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .where(eq(tasks.id, taskId));

    return task as TaskWithDetails;
  }

  async getTasksInOrganization(
    organizationId: string,
    filters?: {
      status?: string;
      assigneeId?: string;
      search?: string;
    }
  ): Promise<TaskWithDetails[]> {
    let query = db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        category: tasks.category,
        assigneeId: tasks.assigneeId,
        creatorId: tasks.creatorId,
        organizationId: tasks.organizationId,
        dueDate: tasks.dueDate,
        completedAt: tasks.completedAt,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        assignee: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          role: users.role,
          organizationId: users.organizationId,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .where(eq(tasks.organizationId, organizationId));

    let conditions = [eq(tasks.organizationId, organizationId)];

    if (filters?.status) {
      conditions.push(eq(tasks.status, filters.status as any));
    }

    if (filters?.assigneeId) {
      conditions.push(eq(tasks.assigneeId, filters.assigneeId));
    }

    if (filters?.search) {
      conditions.push(or(
        ilike(tasks.title, `%${filters.search}%`),
        ilike(tasks.description, `%${filters.search}%`)
      ));
    }

    // Apply all conditions to the base query
    query = query.where(conditions.length > 1 ? and(...conditions) : conditions[0]);

    const result = await query.orderBy(desc(tasks.createdAt));
    return result as TaskWithDetails[];
  }

  // Task comments
  async addTaskComment(commentData: InsertTaskComment): Promise<TaskComment> {
    const [comment] = await db
      .insert(taskComments)
      .values(commentData)
      .returning();
    return comment;
  }

  async getTaskComments(taskId: string): Promise<TaskComment[]> {
    return await db
      .select()
      .from(taskComments)
      .where(eq(taskComments.taskId, taskId))
      .orderBy(desc(taskComments.createdAt));
  }

  // Notifications
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(notificationData)
      .returning();
    return notification;
  }

  async getUserNotifications(userId: string, organizationId: string): Promise<NotificationWithDetails[]> {
    const result = await db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        isRead: notifications.isRead,
        taskId: notifications.taskId,
        commentId: notifications.commentId,
        triggeredByUserId: notifications.triggeredByUserId,
        organizationId: notifications.organizationId,
        createdAt: notifications.createdAt,
        task: {
          id: tasks.id,
          title: tasks.title,
          status: tasks.status,
          priority: tasks.priority,
        },
        triggeredByUser: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        }
      })
      .from(notifications)
      .leftJoin(tasks, eq(notifications.taskId, tasks.id))
      .leftJoin(users, eq(notifications.triggeredByUserId, users.id))
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.organizationId, organizationId)
      ))
      .orderBy(desc(notifications.createdAt))
      .limit(50); // Limit to last 50 notifications

    return result.map(row => ({
      ...row,
      task: row.task.id ? row.task : undefined,
      triggeredByUser: row.triggeredByUser.id ? row.triggeredByUser : undefined,
    })) as NotificationWithDetails[];
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      ));
  }

  async markAllNotificationsAsRead(userId: string, organizationId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.organizationId, organizationId),
        eq(notifications.isRead, false)
      ));
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    await db
      .delete(notifications)
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      ));
  }

  async getUnreadNotificationCount(userId: string, organizationId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.organizationId, organizationId),
        eq(notifications.isRead, false)
      ));
    
    return result.count;
  }

  // Analytics
  async getTaskStats(organizationId: string): Promise<{
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    overdue: number;
  }> {
    const [totalResult] = await db
      .select({ count: count() })
      .from(tasks)
      .where(eq(tasks.organizationId, organizationId));

    const [todoResult] = await db
      .select({ count: count() })
      .from(tasks)
      .where(and(eq(tasks.organizationId, organizationId), eq(tasks.status, 'todo')));

    const [inProgressResult] = await db
      .select({ count: count() })
      .from(tasks)
      .where(and(eq(tasks.organizationId, organizationId), eq(tasks.status, 'in_progress')));

    const [doneResult] = await db
      .select({ count: count() })
      .from(tasks)
      .where(and(eq(tasks.organizationId, organizationId), eq(tasks.status, 'done')));

    // For overdue, check tasks with due date in the past and not completed
    const now = new Date();
    const [overdueResult] = await db
      .select({ count: count() })
      .from(tasks)
      .where(and(
        eq(tasks.organizationId, organizationId),
        lt(tasks.dueDate, now), // Fixed: use lt() for proper date comparison
        or(eq(tasks.status, 'todo'), eq(tasks.status, 'in_progress')) // Fixed: include in_progress tasks
      ));

    return {
      total: totalResult.count,
      todo: todoResult.count,
      inProgress: inProgressResult.count,
      done: doneResult.count,
      overdue: overdueResult.count,
    };
  }
}

export const storage = new DatabaseStorage();
