import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserTable from "@/components/users/user-table";
import InviteModal from "@/components/users/invite-modal";
import { useAuth } from "@/hooks/useAuth";
import type { UserWithOrganization } from "@shared/schema";

export default function UsersPage() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { user: currentUser } = useAuth();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json() as UserWithOrganization[];
    },
  });

  const canManageUsers = currentUser?.role === 'admin';

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-auto p-6" data-testid="users-page">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Team Members</h2>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
        {canManageUsers && (
          <Button
            onClick={() => setShowInviteModal(true)}
            data-testid="button-invite-user"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        )}
      </div>

      <UserTable users={users} currentUser={currentUser} />

      {showInviteModal && (
        <InviteModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </main>
  );
}
