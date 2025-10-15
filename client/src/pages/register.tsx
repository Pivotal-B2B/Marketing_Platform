import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password, firstName, lastName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      toast({
        title: "Success!",
        description: "Account created successfully. You can now login.",
      });
      
      // Redirect to login
      setTimeout(() => setLocation("/login"), 1500);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Could not create account",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Premium gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-teal-accent/5 to-background"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-accent/10 rounded-full blur-3xl"></div>
      
      <Card className="w-full max-w-md relative shadow-smooth-lg border-0 animate-fade-in">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-smooth relative">
              <div className="absolute inset-0 bg-white/20 rounded-2xl blur-sm"></div>
              <Building2 className="h-8 w-8 text-white relative z-10" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            Create Admin Account
          </CardTitle>
          <CardDescription className="text-base">
            Register your first admin user for Pivotal CRM
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Admin"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  data-testid="input-firstname"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="User"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  data-testid="input-lastname"
                  className="h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                data-testid="input-username"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@crm.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-email"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-password"
                className="h-11"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 text-base font-semibold shadow-smooth" 
              data-testid="button-register" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Admin Account'
              )}
            </Button>
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => setLocation("/login")}
                data-testid="link-login"
              >
                Already have an account? Sign in
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
