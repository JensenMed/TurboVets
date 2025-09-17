import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Search } from "lucide-react";
import { format } from "date-fns";
import type { UserWithOrganization } from "@shared/schema";

interface UserTableProps {
  users: UserWithOrganization[];
  currentUser: any;
}

const roleColors = {
  admin: "bg-red-100 text-red-800",
  manager: "bg-blue-100 text-blue-800",
  employee: "bg-green-100 text-green-800",
};

export default function UserTable({ users, currentUser }: UserTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest("PATCH", `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}` || 'U';
  };

  const getDisplayName = (firstName?: string, lastName?: string, email?: string) => {
    const name = `${firstName || ''} ${lastName || ''}`.trim();
    return name || email || 'User';
  };

  const filteredUsers = users.filter((user) => {
    const searchTerm = searchQuery.toLowerCase();
    const name = getDisplayName(user.firstName ?? undefined, user.lastName ?? undefined, user.email ?? undefined).toLowerCase();
    const email = user.email?.toLowerCase() || '';
    return name.includes(searchTerm) || email.includes(searchTerm);
  });

  const canManageRoles = currentUser?.role === 'admin';

  return (
    <Card data-testid="user-table">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>All Users</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
              data-testid="input-search-users"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Joined
                </th>
                {canManageRoles && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-accent/50" data-testid={`user-row-${user.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user.profileImageUrl || ''} />
                        <AvatarFallback>
                          {getInitials(user.firstName ?? undefined, user.lastName ?? undefined)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-foreground" data-testid="text-user-name">
                          {getDisplayName(user.firstName ?? undefined, user.lastName ?? undefined, user.email ?? undefined)}
                        </div>
                        <div className="text-sm text-muted-foreground" data-testid="text-user-email">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {canManageRoles && user.id !== currentUser?.id ? (
                      <Select
                        value={user.role}
                        onValueChange={(role) => updateRoleMutation.mutate({ userId: user.id, role })}
                        disabled={updateRoleMutation.isPending}
                      >
                        <SelectTrigger className="w-32" data-testid={`select-role-${user.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={roleColors[user.role]} data-testid="badge-user-role">
                        {user.role}
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={user.isActive ? "default" : "secondary"} data-testid="badge-user-status">
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground" data-testid="text-user-joined">
                    {format(new Date(user.createdAt), 'MMM d, yyyy')}
                  </td>
                  {canManageRoles && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {user.id !== currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive/90"
                          data-testid={`button-remove-user-${user.id}`}
                        >
                          Remove
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={canManageRoles ? 5 : 4} className="px-6 py-12 text-center">
                    <p className="text-muted-foreground">
                      {searchQuery ? 'No users found matching your search' : 'No users found'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
