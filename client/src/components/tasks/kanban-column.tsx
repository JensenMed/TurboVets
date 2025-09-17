import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { TaskWithDetails } from "@shared/schema";
import DraggableTaskCard from "./draggable-task-card";

interface KanbanColumnProps {
  title: string;
  status: string;
  tasks: TaskWithDetails[];
  onTaskClick: (task: TaskWithDetails) => void;
}

export default function KanbanColumn({ title, status, tasks, onTaskClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${status}-column`,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo':
        return 'border-l-blue-500';
      case 'in_progress':
        return 'border-l-yellow-500';
      case 'done':
        return 'border-l-green-500';
      default:
        return 'border-l-gray-500';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'todo':
        return 'bg-blue-50 dark:bg-blue-950';
      case 'in_progress':
        return 'bg-yellow-50 dark:bg-yellow-950';
      case 'done':
        return 'bg-green-50 dark:bg-green-950';
      default:
        return 'bg-gray-50 dark:bg-gray-950';
    }
  };

  return (
    <div 
      className={`bg-card rounded-lg border-2 border-l-4 ${getStatusColor(status)} p-4 min-h-[500px] transition-all duration-200 ${
        isOver ? `${getStatusBgColor(status)} border-dashed` : ''
      }`} 
      data-testid={`column-${status}`}
    >
      <div className="mb-4">
        <h3 className="font-semibold text-foreground text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
      </div>
      
      <div ref={setNodeRef} className="space-y-3 min-h-[400px]">
        <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <DraggableTaskCard
              key={task.id}
              task={task}
              onClick={onTaskClick}
            />
          ))}
        </SortableContext>
        
        {tasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No tasks in {title.toLowerCase()}</p>
            <p className="text-xs mt-2 opacity-70">Drop tasks here</p>
          </div>
        )}
      </div>
    </div>
  );
}