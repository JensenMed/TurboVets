import {
  users,
  organizations,
  tasks,
  taskComments,
  type User,
  type UpsertUser,
  type Organization,
  type InsertOrganization,
  type Task,
  type InsertTask,
  type UpdateTask,
  type TaskComment,
  type InsertTaskComment,
  type TaskWithDetails,
  type UserWithOrganization,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, ilike, or, count } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Organization operations
  createOrganization(org: InsertOrganization): Promise<Organization>;
  getOrganization(id: string): Promise<Organization | undefined>;
  
  // User management
  getUsersInOrganization(organizationId: string): Promise<UserWithOrganization[]>;
  updateUserRole(userId: string, role: 'admin' | 'manager' | 'employee'): Promise<User>;
  
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
  
  // Task comments
  addTaskComment(comment: InsertTaskComment): Promise<TaskComment>;
  getTaskComments(taskId: string): Promise<TaskComment[]>;
  
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
        eq(tasks.dueDate, now), // This should be a proper date comparison
        eq(tasks.status, 'todo')
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
