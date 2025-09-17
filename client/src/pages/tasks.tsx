import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Grid3X3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import TaskFilters from "@/components/tasks/task-filters";
import TaskCard from "@/components/tasks/task-card";
import TaskList from "@/components/tasks/task-list";
import TaskModal from "@/components/tasks/task-modal";
import type { TaskWithDetails } from "@shared/schema";

export default function TasksPage() {
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    assigneeId: '',
    search: '',
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['/api/tasks', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.assigneeId) params.append('assigneeId', filters.assigneeId);
      if (filters.search) params.append('search', filters.search);
      
      const response = await fetch(`/api/tasks?${params}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json() as TaskWithDetails[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/tasks/stats'],
    queryFn: async () => {
      const response = await fetch('/api/tasks/stats');
      if (!response.ok) throw new Error('Failed to fetch task stats');
      return response.json();
    },
  });

  const handleTaskClick = (task: TaskWithDetails) => {
    setSelectedTask(task);
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-auto p-6" data-testid="tasks-page">
      {/* Filters and Search */}
      <div className="mb-6 space-y-4 lg:space-y-0 lg:flex lg:items-center lg:justify-between">
        <TaskFilters
          filters={filters}
          onFiltersChange={setFilters}
          assignees={tasks.map(t => t.assignee).filter(Boolean)}
        />
        
        <div className="flex items-center space-x-2">
          <Button
            variant={viewType === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewType('grid')}
            data-testid="button-grid-view"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewType === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewType('list')}
            data-testid="button-list-view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Task Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card rounded-lg border border-border p-6" data-testid="stat-total">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <i className="fas fa-tasks text-primary text-sm"></i>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-lg border border-border p-6" data-testid="stat-in-progress">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
              </div>
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <i className="fas fa-clock text-amber-600 text-sm"></i>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-lg border border-border p-6" data-testid="stat-completed">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.done}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <i className="fas fa-check text-green-600 text-sm"></i>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-lg border border-border p-6" data-testid="stat-overdue">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-destructive">{stats.overdue}</p>
              </div>
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <i className="fas fa-exclamation text-destructive text-sm"></i>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tasks */}
      {viewType === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" data-testid="tasks-grid">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => handleTaskClick(task)}
            />
          ))}
          {tasks.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground mb-4">No tasks found</p>
              <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-first-task">
                <Plus className="h-4 w-4 mr-2" />
                Create your first task
              </Button>
            </div>
          )}
        </div>
      ) : (
        <TaskList tasks={tasks} onTaskClick={handleTaskClick} />
      )}

      {/* Modals */}
      {showCreateModal && (
        <TaskModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          task={null}
        />
      )}
      
      {selectedTask && (
        <TaskModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          task={selectedTask}
        />
      )}
    </main>
  );
}
