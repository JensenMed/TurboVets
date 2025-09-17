import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface OrganizationSetupProps {
  onComplete: () => void;
}

export default function OrganizationSetup({ onComplete }: OrganizationSetupProps) {
  const [organizationName, setOrganizationName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createOrganizationMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/organizations", { name });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Organization created",
        description: "Your organization has been set up successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onComplete();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating organization",
        description: error.message || "Failed to create organization",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationName.trim()) {
      toast({
        title: "Organization name required",
        description: "Please enter a name for your organization",
        variant: "destructive",
      });
      return;
    }
    createOrganizationMutation.mutate(organizationName.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/20">
      <div className="max-w-md w-full mx-4">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome to TurboVets!</CardTitle>
            <p className="text-muted-foreground">
              Let's set up your organization to get started
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="organizationName">Organization Name</Label>
                <Input
                  id="organizationName"
                  type="text"
                  placeholder="Enter your organization name"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  disabled={createOrganizationMutation.isPending}
                  data-testid="input-organization-name"
                  className="mt-2"
                />
              </div>
              
              <Button
                type="submit"
                className="w-full"
                disabled={createOrganizationMutation.isPending}
                data-testid="button-create-organization"
              >
                {createOrganizationMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Organization...
                  </>
                ) : (
                  "Create Organization"
                )}
              </Button>
            </form>
            
            <div className="mt-4 text-center text-sm text-muted-foreground">
              <p>You'll be set as the administrator of this organization.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}