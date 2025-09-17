import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Bell, Menu } from "lucide-react";
import TaskModal from "@/components/tasks/task-modal";

interface HeaderProps {
  currentPage: string;
}

export default function Header({ currentPage }: HeaderProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const getPageTitle = () => {
    switch (currentPage) {
      case 'users':
        return 'Team Members';
      case 'reports':
        return 'Reports';
      case 'settings':
        return 'Settings';
      default:
        return 'Task Dashboard';
    }
  };

  const showNewTaskButton = currentPage === 'tasks';

  return (
    <>
      <header className="bg-card border-b border-border px-6 py-4" data-testid="header">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
              {getPageTitle()}
            </h2>
          </div>
          
          <div className="flex items-center space-x-3">
            {showNewTaskButton && (
              <Button
                onClick={() => setShowCreateModal(true)}
                data-testid="button-new-task"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            )}
            <Button variant="ghost" size="sm" className="relative" data-testid="button-notifications">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></span>
            </Button>
          </div>
        </div>
      </header>

      {showCreateModal && (
        <TaskModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          task={null}
        />
      )}
    </>
  );
}
