import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckSquare,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  currentPage: string;
}

export default function Sidebar({ currentPage }: SidebarProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}` || 'U';
  };

  const getDisplayName = (firstName?: string, lastName?: string) => {
    return `${firstName || ''} ${lastName || ''}`.trim() || 'User';
  };

  const navItems = [
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, path: '/' },
    { id: 'users', label: 'Team Members', icon: Users, path: '/users' },
    { id: 'reports', label: 'Reports', icon: BarChart3, path: '/reports' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  ];

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between h-16 px-6 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">TurboVets</h1>
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden"
          onClick={() => setIsOpen(false)}
          data-testid="button-close-sidebar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <nav className="mt-6">
        <div className="px-6 mb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.profileImageUrl || ''} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {getInitials(user?.firstName ?? undefined, user?.lastName ?? undefined)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground" data-testid="text-user-name">
                {getDisplayName(user?.firstName ?? undefined, user?.lastName ?? undefined)}
              </p>
              <p className="text-xs text-muted-foreground capitalize" data-testid="text-user-role">
                {user?.role}
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => {
                  setLocation(item.path);
                  setIsOpen(false);
                }}
                data-testid={`nav-${item.id}`}
              >
                <Icon className="h-4 w-4 mr-3" />
                {item.label}
              </Button>
            );
          })}
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-3" />
            Sign Out
          </Button>
        </div>
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={`sidebar fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        data-testid="sidebar"
      >
        {sidebarContent}
      </div>

      {/* Mobile toggle button */}
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsOpen(true)}
        data-testid="button-open-sidebar"
      >
        <Menu className="h-4 w-4" />
      </Button>
    </>
  );
}
