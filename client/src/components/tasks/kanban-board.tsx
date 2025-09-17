import { useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { TaskWithDetails } from "@shared/schema";
import KanbanColumn from "./kanban-column";
import TaskCard from "./task-card";

interface KanbanBoardProps {
  tasks: TaskWithDetails[];
  onTaskClick: (task: TaskWithDetails) => void;
}

const COLUMNS = [
  { id: 'todo', title: 'To Do', status: 'todo' },
  { id: 'in_progress', title: 'In Progress', status: 'in_progress' },
  { id: 'done', title: 'Done', status: 'done' },
] as const;

export default function KanbanBoard({ tasks, onTaskClick }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<TaskWithDetails | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const reorderMutation = useMutation({
    mutationFn: async ({ taskId, position, status }: { taskId: string; position: string; status?: string }) => {
      const response = await fetch(`/api/tasks/${taskId}/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position, status }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to reorder task' }));
        throw new Error(errorData.message || 'Failed to reorder task');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reorder task",
        variant: "destructive",
      });
    },
  });

  const generatePosition = (columnTasks: TaskWithDetails[], overIndex: number): string => {
    const sortedTasks = columnTasks
      .filter(task => task.position)
      .sort((a, b) => a.position.localeCompare(b.position));
    
    if (overIndex <= 0) {
      // Insert at beginning
      const firstPos = sortedTasks[0]?.position || 'b0000';
      const firstNum = parseInt(firstPos.slice(1)) || 1000;
      const newNum = Math.max(firstNum - 1000, 0);
      return 'a' + String(newNum).padStart(4, '0');
    } else if (overIndex >= sortedTasks.length) {
      // Insert at end
      const lastPos = sortedTasks[sortedTasks.length - 1]?.position || 'a0000';
      const lastNum = parseInt(lastPos.slice(1)) || 0;
      const newNum = lastNum + 1000;
      return 'a' + String(newNum).padStart(4, '0');
    } else {
      // Insert between two positions
      const beforePos = sortedTasks[overIndex - 1]?.position || 'a0000';
      const afterPos = sortedTasks[overIndex]?.position || 'a2000';
      const beforeNum = parseInt(beforePos.slice(1)) || 0;
      const afterNum = parseInt(afterPos.slice(1)) || 2000;
      const newNum = Math.floor((beforeNum + afterNum) / 2);
      return 'a' + String(newNum).padStart(4, '0');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;

    // Determine target status and position
    let newStatus: string;
    let overIndex: number;
    
    const overId = over.id as string;
    if (overId.endsWith('-column')) {
      // Dropping on column - add to end
      newStatus = overId.replace('-column', '');
      const columnTasks = tasks.filter(t => t.status === newStatus && t.id !== activeTask.id);
      overIndex = columnTasks.length;
    } else {
      // Dropping on a task - find the task and its position
      const overTask = tasks.find(t => t.id === overId);
      if (!overTask) return;
      
      newStatus = overTask.status;
      const columnTasks = tasks
        .filter(t => t.status === newStatus && t.id !== activeTask.id)
        .sort((a, b) => (a.position || 'a0000').localeCompare(b.position || 'a0000'));
      overIndex = columnTasks.findIndex(t => t.id === overId);
      if (overIndex === -1) overIndex = columnTasks.length;
    }

    // Get tasks in the target column (excluding the active task)
    const columnTasks = tasks
      .filter(t => t.status === newStatus && t.id !== activeTask.id)
      .sort((a, b) => (a.position || 'a0000').localeCompare(b.position || 'a0000'));
    
    const newPosition = generatePosition(columnTasks, overIndex);

    // Only update if position or status changed
    if ((activeTask.position || 'a0000') !== newPosition || activeTask.status !== newStatus) {
      reorderMutation.mutate({
        taskId: activeTask.id,
        position: newPosition,
        status: newStatus !== activeTask.status ? newStatus : undefined,
      });
    }
  };

  // Group tasks by status and sort by position
  const tasksByStatus = COLUMNS.reduce((acc, column) => {
    acc[column.status] = tasks
      .filter(task => task.status === column.status)
      .sort((a, b) => (a.position || 'a0000').localeCompare(b.position || 'a0000'));
    return acc;
  }, {} as Record<string, TaskWithDetails[]>);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-testid="kanban-board">
        {COLUMNS.map((column) => (
          <SortableContext
            key={column.id}
            id={column.id}
            items={tasksByStatus[column.status]?.map(task => task.id) || []}
            strategy={verticalListSortingStrategy}
          >
            <KanbanColumn
              title={column.title}
              status={column.status}
              tasks={tasksByStatus[column.status] || []}
              onTaskClick={onTaskClick}
            />
          </SortableContext>
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <TaskCard
            task={activeTask}
            onClick={() => {}}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}