import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import type { TaskWithDetails } from "@shared/schema";

interface TaskListProps {
  tasks: TaskWithDetails[];
  onTaskClick: (task: TaskWithDetails) => void;
}

const statusColors = {
  todo: "bg-gray-100 text-gray-800",
  in_progress: "bg-amber-100 text-amber-800",
  done: "bg-green-100 text-green-800",
};

export default function TaskList({ tasks, onTaskClick }: TaskListProps) {
  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}` || 'U';
  };

  const getDisplayName = (firstName?: string, lastName?: string, email?: string) => {
    const name = `${firstName || ''} ${lastName || ''}`.trim();
    return name || email || 'Unassigned';
  };

  return (
    <Card data-testid="task-list">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Tasks Overview</CardTitle>
          <Button variant="ghost" size="sm">
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="px-6 py-4 hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => onTaskClick(task)}
              data-testid={`task-row-${task.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Checkbox />
                  <div>
                    <h4 className="font-medium text-foreground" data-testid="text-task-title">
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1" data-testid="text-task-description">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge className={statusColors[task.status]} data-testid="badge-task-status">
                    {task.status.replace('_', ' ')}
                  </Badge>
                  {task.assignee && (
                    <div className="flex items-center space-x-1">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={task.assignee.profileImageUrl || ''} />
                        <AvatarFallback className="text-xs">
                          {getInitials(task.assignee.firstName ?? undefined, task.assignee.lastName ?? undefined)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground" data-testid="text-task-assignee">
                        {getDisplayName(task.assignee.firstName ?? undefined, task.assignee.lastName ?? undefined, task.assignee.email ?? undefined)}
                      </span>
                    </div>
                  )}
                  {task.dueDate && (
                    <span className="text-sm text-muted-foreground" data-testid="text-task-due-date">
                      {format(new Date(task.dueDate), 'MMM d')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-muted-foreground">No tasks found</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
