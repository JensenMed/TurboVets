import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import TasksPage from "@/pages/tasks";
import UsersPage from "@/pages/users";
import OrganizationSetup from "@/components/organization/organization-setup";

export default function Dashboard() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [showOrganizationSetup, setShowOrganizationSetup] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  // Check if user needs organization setup
  useEffect(() => {
    if (user && !user.organizationId) {
      setShowOrganizationSetup(true);
    }
  }, [user]);

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show organization setup if user has no organization
  if (showOrganizationSetup) {
    return <OrganizationSetup onComplete={() => setShowOrganizationSetup(false)} />;
  }

  const getCurrentPage = () => {
    if (location.includes('/users')) return 'users';
    if (location.includes('/settings')) return 'settings';
    if (location.includes('/reports')) return 'reports';
    return 'tasks';
  };

  const renderContent = () => {
    const currentPage = getCurrentPage();
    
    switch (currentPage) {
      case 'users':
        return <UsersPage />;
      case 'settings':
        return (
          <div className="flex-1 overflow-auto p-6">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Settings</h2>
            <p className="text-muted-foreground">Settings page coming soon...</p>
          </div>
        );
      case 'reports':
        return (
          <div className="flex-1 overflow-auto p-6">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Reports</h2>
            <p className="text-muted-foreground">Reports page coming soon...</p>
          </div>
        );
      default:
        return <TasksPage />;
    }
  };

  return (
    <div className="h-screen flex bg-background" data-testid="dashboard-container">
      <Sidebar currentPage={getCurrentPage()} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header currentPage={getCurrentPage()} />
        {renderContent()}
      </div>
    </div>
  );
}
