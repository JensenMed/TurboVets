import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/20">
      <div className="max-w-md w-full mx-4">
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-foreground mb-2">TurboVets</h1>
              <p className="text-muted-foreground">Task Management System</p>
            </div>
            
            <form className="space-y-6" data-testid="login-form">
              <div>
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Enter your email"
                  className="mt-2"
                  data-testid="input-email"
                  disabled
                />
              </div>
              
              <div>
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <Input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  className="mt-2"
                  data-testid="input-password"
                  disabled
                />
              </div>
              
              <Button
                type="button"
                onClick={handleLogin}
                className="w-full"
                data-testid="button-signin"
              >
                Sign In
              </Button>
            </form>
            
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-card text-muted-foreground">Or continue with</span>
                </div>
              </div>
              
              <Button
                type="button"
                onClick={handleLogin}
                variant="secondary"
                className="mt-4 w-full"
                data-testid="button-sso-auth"
              >
                <i className="fas fa-code mr-2"></i>
                Continue with SSO
              </Button>
            </div>
            
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <button
                onClick={handleLogin}
                className="text-primary hover:text-primary/90 font-medium"
                data-testid="link-signup"
              >
                Sign up
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
