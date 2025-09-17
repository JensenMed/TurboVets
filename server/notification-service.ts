import { storage } from "./storage";
import WebSocketManager from "./websocket";
import { InsertNotification, User } from "@shared/schema";

class NotificationService {
  private wsManager?: WebSocketManager;

  setWebSocketManager(wsManager: WebSocketManager) {
    this.wsManager = wsManager;
  }

  async createAndSendNotification(notificationData: InsertNotification) {
    try {
      // Create notification in database
      const notification = await storage.createNotification(notificationData);

      // Send real-time notification if WebSocket is available
      if (this.wsManager) {
        this.wsManager.sendNotificationToUser(
          notificationData.userId,
          notificationData.organizationId,
          {
            ...notification,
            task: notificationData.taskId ? { id: notificationData.taskId } : undefined
          }
        );
      }

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Task assignment notification
  async notifyTaskAssigned(taskId: string, assigneeId: string, assignedByUserId: string, organizationId: string) {
    if (assigneeId === assignedByUserId) return; // Don't notify if self-assigned

    const assignedByUser = await storage.getUserById(assignedByUserId);
    if (!assignedByUser) return;

    const task = await storage.getTask(taskId);
    if (!task) return;

    await this.createAndSendNotification({
      userId: assigneeId,
      type: 'task_assigned',
      title: 'New task assigned',
      message: `${assignedByUser.firstName} ${assignedByUser.lastName} assigned you to "${task.title}"`,
      isRead: false,
      taskId,
      triggeredByUserId: assignedByUserId,
      organizationId,
    });
  }

  // Task status change notification  
  async notifyTaskStatusChanged(taskId: string, newStatus: string, changedByUserId: string, organizationId: string) {
    const task = await storage.getTask(taskId);
    if (!task || !task.assigneeId || task.assigneeId === changedByUserId) return;

    const changedByUser = await storage.getUserById(changedByUserId);
    if (!changedByUser) return;

    const statusLabels = {
      todo: 'To Do',
      in_progress: 'In Progress', 
      done: 'Done'
    };

    await this.createAndSendNotification({
      userId: task.assigneeId,
      type: 'task_status_changed',
      title: 'Task status updated',
      message: `${changedByUser.firstName} ${changedByUser.lastName} moved "${task.title}" to ${statusLabels[newStatus as keyof typeof statusLabels] || newStatus}`,
      isRead: false,
      taskId,
      triggeredByUserId: changedByUserId,
      organizationId,
    });
  }

  // Comment notification (with @mention support)
  async notifyTaskComment(taskId: string, commentContent: string, commenterId: string, organizationId: string) {
    const task = await storage.getTask(taskId);
    if (!task) return;

    const commenter = await storage.getUserById(commenterId);
    if (!commenter) return;

    // Notify task assignee (if different from commenter)
    if (task.assigneeId && task.assigneeId !== commenterId) {
      await this.createAndSendNotification({
        userId: task.assigneeId,
        type: 'task_comment',
        title: 'New comment on your task',
        message: `${commenter.firstName} ${commenter.lastName} commented on "${task.title}"`,
        isRead: false,
        taskId,
        triggeredByUserId: commenterId,
        organizationId,
      });
    }

    // Handle @mentions
    await this.handleMentions(commentContent, taskId, commenterId, organizationId, commenter);
  }

  // Parse @mentions and send notifications
  private async handleMentions(content: string, taskId: string, mentionedByUserId: string, organizationId: string, mentionedByUser: User) {
    // Simple mention regex - matches @username or @"firstname lastname"
    const mentionRegex = /@(?:"([^"]+)"|(\w+))/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      const mentionText = match[1] || match[2]; // Quoted name or username
      mentions.push(mentionText);
    }

    if (mentions.length === 0) return;

    // Get all users in organization to match mentions
    const orgUsers = await storage.getUsersInOrganization(organizationId);
    const task = await storage.getTask(taskId);
    if (!task) return;

    for (const mention of mentions) {
      // Try to find user by firstname lastname or email
      const mentionedUser = orgUsers.find(user => {
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
        const email = user.email?.toLowerCase() || '';
        return fullName === mention.toLowerCase() || 
               email === mention.toLowerCase() ||
               email.split('@')[0] === mention.toLowerCase();
      });

      if (mentionedUser && mentionedUser.id !== mentionedByUserId) {
        await this.createAndSendNotification({
          userId: mentionedUser.id,
          type: 'mention',
          title: 'You were mentioned',
          message: `${mentionedByUser.firstName} ${mentionedByUser.lastName} mentioned you in "${task.title}"`,
          isRead: false,
          taskId,
          triggeredByUserId: mentionedByUserId,
          organizationId,
        });
      }
    }
  }
}

export const notificationService = new NotificationService();