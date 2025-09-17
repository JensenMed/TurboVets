import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { TaskWithDetails, User } from "@shared/schema";
import { X, Edit, Flag, Tag, Calendar, User as UserIcon } from "lucide-react";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskWithDetails | null;
}

const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "done"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  category: z.string().optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

const statusColors = {
  todo: "bg-gray-100 text-gray-800",
  in_progress: "bg-amber-100 text-amber-800",
  done: "bg-green-100 text-green-800",
};

const priorityColors = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

export default function TaskModal({ isOpen, onClose, task }: TaskModalProps) {
  const [isEditing, setIsEditing] = useState(!task);
  const [newComment, setNewComment] = useState("");
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task?.title || "",
      description: task?.description || "",
      status: task?.status || "todo",
      priority: task?.priority || "medium",
      category: task?.category || "",
      assigneeId: task?.assigneeId || "",
      dueDate: task?.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : "",
    },
  });

  // Fetch users for assignee dropdown  
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async (): Promise<User[]> => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  // Fetch task comments if viewing existing task
  const { data: comments = [] } = useQuery({
    queryKey: ['/api/tasks', task?.id, 'comments'],
    queryFn: async () => {
      if (!task?.id) return [];
      const response = await fetch(`/api/tasks/${task.id}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
    enabled: !!task?.id,
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const payload = {
        ...data,
        assigneeId: data.assigneeId || undefined, // Convert empty string to undefined
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
      };
      await apiRequest("POST", "/api/tasks", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/stats'] });
      toast({
        title: "Success",
        description: "Task created successfully",
      });
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      if (!task?.id) throw new Error("No task ID");
      const payload = {
        ...data,
        assigneeId: data.assigneeId || undefined, // Convert empty string to undefined
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
      };
      await apiRequest("PATCH", `/api/tasks/${task.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/stats'] });
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!task?.id) throw new Error("No task ID");
      await apiRequest("POST", `/api/tasks/${task.id}/comments`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', task?.id, 'comments'] });
      setNewComment("");
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TaskFormData) => {
    if (task) {
      updateTaskMutation.mutate(data);
    } else {
      createTaskMutation.mutate(data);
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment.trim());
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}` || 'U';
  };

  const getDisplayName = (firstName?: string, lastName?: string, email?: string) => {
    const name = `${firstName || ''} ${lastName || ''}`.trim();
    return name || email || 'User';
  };

  const canEdit = !task || currentUser?.role === 'admin' || currentUser?.role === 'manager' || 
                 task.assigneeId === currentUser?.id || task.creatorId === currentUser?.id;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="task-modal">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle data-testid="text-modal-title">
              {task ? 'Task Details' : 'Create New Task'}
            </DialogTitle>
            <div className="flex items-center space-x-2">
              {task && canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  data-testid="button-toggle-edit"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-modal">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="task-form">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter task title" {...field} data-testid="input-task-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter task description" 
                        rows={4} 
                        {...field} 
                        data-testid="input-task-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-assignee">
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {getDisplayName(user.firstName ?? undefined, user.lastName ?? undefined, user.email ?? undefined)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-priority">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="no-category">No category</SelectItem>
                          <SelectItem value="backend">Backend</SelectItem>
                          <SelectItem value="frontend">Frontend</SelectItem>
                          <SelectItem value="design">Design</SelectItem>
                          <SelectItem value="devops">DevOps</SelectItem>
                          <SelectItem value="testing">Testing</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-due-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {task && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="todo">Todo</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex items-center justify-end space-x-4 pt-4 border-t border-border">
                <Button type="button" variant="ghost" onClick={onClose} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                  data-testid="button-save-task"
                >
                  {createTaskMutation.isPending || updateTaskMutation.isPending ? 'Saving...' : (task ? 'Save Changes' : 'Create Task')}
                </Button>
              </div>
            </form>
          </Form>
        ) : task && (
          <div className="space-y-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2" data-testid="text-task-title">
                  {task.title}
                </h2>
                {task.description && (
                  <p className="text-muted-foreground" data-testid="text-task-description">
                    {task.description}
                  </p>
                )}
              </div>
              <Badge className={statusColors[task.status]} data-testid="badge-task-status">
                {task.status.replace('_', ' ')}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    <UserIcon className="inline h-4 w-4 mr-1" />
                    Assignee
                  </label>
                  {task.assignee ? (
                    <div className="flex items-center space-x-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={task.assignee.profileImageUrl || ''} />
                        <AvatarFallback className="text-sm">
                          {getInitials(task.assignee.firstName ?? undefined, task.assignee.lastName ?? undefined)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-foreground" data-testid="text-task-assignee">
                        {getDisplayName(task.assignee.firstName ?? undefined, task.assignee.lastName ?? undefined, task.assignee.email ?? undefined)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    <Flag className="inline h-4 w-4 mr-1" />
                    Priority
                  </label>
                  <Badge className={priorityColors[task.priority]} data-testid="badge-task-priority">
                    {task.priority}
                  </Badge>
                </div>

                {task.category && (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      <Tag className="inline h-4 w-4 mr-1" />
                      Category
                    </label>
                    <Badge variant="outline" data-testid="badge-task-category">
                      {task.category}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {task.dueDate && (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      <Calendar className="inline h-4 w-4 mr-1" />
                      Due Date
                    </label>
                    <span className="text-foreground" data-testid="text-task-due-date">
                      {format(new Date(task.dueDate), 'MMMM d, yyyy')}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Created</label>
                  <span className="text-foreground" data-testid="text-task-created">
                    {format(new Date(task.createdAt), 'MMMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>

            {/* Comments section */}
            <div className="border-t border-border pt-6">
              <h4 className="font-semibold text-foreground mb-4">Comments & Updates</h4>
              <div className="space-y-4 mb-4" data-testid="task-comments">
                {comments.map((comment: any) => (
                  <div key={comment.id} className="flex space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-sm">
                        {getInitials(comment.user?.firstName, comment.user?.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-foreground text-sm" data-testid="text-comment-content">
                          {comment.content}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">
                        {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex space-x-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={currentUser?.profileImageUrl || ''} />
                  <AvatarFallback className="text-sm">
                    {getInitials(currentUser?.firstName ?? undefined, currentUser?.lastName ?? undefined)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    data-testid="input-new-comment"
                  />
                  <div className="mt-2 flex justify-end">
                    <Button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || addCommentMutation.isPending}
                      data-testid="button-add-comment"
                    >
                      {addCommentMutation.isPending ? 'Adding...' : 'Add Comment'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
