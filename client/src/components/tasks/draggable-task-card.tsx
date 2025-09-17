import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TaskWithDetails } from "@shared/schema";
import TaskCard from "./task-card";

interface DraggableTaskCardProps {
  task: TaskWithDetails;
  onClick: (task: TaskWithDetails) => void;
}

export default function DraggableTaskCard({ task, onClick }: DraggableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id,
    data: {
      type: "task",
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing transition-all duration-200 ${
        isDragging ? 'rotate-3 scale-105 shadow-lg' : 'hover:scale-[1.02]'
      }`}
      data-testid={`draggable-task-${task.id}`}
    >
      <TaskCard task={task} onClick={() => onClick(task)} />
    </div>
  );
}