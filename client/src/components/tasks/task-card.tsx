import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Clock, Flag, Tag } from "lucide-react";
import { format } from "date-fns";
import type { TaskWithDetails } from "@shared/schema";

interface TaskCardProps {
  task: TaskWithDetails;
  onClick: () => void;
}

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

const categoryColors = {
  backend: "bg-blue-100 text-blue-800",
  frontend: "bg-green-100 text-green-800",
  design: "bg-pink-100 text-pink-800",
  devops: "bg-orange-100 text-orange-800",
  testing: "bg-purple-100 text-purple-800",
};

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}` || 'U';
  };

  const getDisplayName = (firstName?: string, lastName?: string, email?: string) => {
    const name = `${firstName || ''} ${lastName || ''}`.trim();
    return name || email || 'Unassigned';
  };

  return (
    <Card
      className="task-card cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
      onClick={onClick}
      data-testid={`task-card-${task.id}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-semibold text-foreground text-lg leading-6 line-clamp-2" data-testid="text-task-title">
            {task.title}
          </h3>
          <div className="flex items-center space-x-2 ml-2">
            <Badge className={statusColors[task.status]} data-testid="badge-task-status">
              {task.status.replace('_', ' ')}
            </Badge>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {task.description && (
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2" data-testid="text-task-description">
            {task.description}
          </p>
        )}
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-3">
            {task.assignee && (
              <div className="flex items-center space-x-1">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={task.assignee.profileImageUrl || ''} />
                  <AvatarFallback className="text-xs">
                    {getInitials(task.assignee.firstName ?? undefined, task.assignee.lastName ?? undefined)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground" data-testid="text-task-assignee">
                  {getDisplayName(task.assignee.firstName ?? undefined, task.assignee.lastName ?? undefined, task.assignee.email ?? undefined)}
                </span>
              </div>
            )}
          </div>
          {task.dueDate && (
            <div className="flex items-center space-x-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span data-testid="text-task-due-date">
                Due: {format(new Date(task.dueDate), 'MMM d')}
              </span>
            </div>
          )}
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {task.category && (
              <Badge variant="outline" className={categoryColors[task.category as keyof typeof categoryColors] || "bg-gray-100 text-gray-800"}>
                <Tag className="h-3 w-3 mr-1" />
                {task.category}
              </Badge>
            )}
            <Badge variant="outline" className={priorityColors[task.priority]}>
              <Flag className="h-3 w-3 mr-1" />
              {task.priority}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
