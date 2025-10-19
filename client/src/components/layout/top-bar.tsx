import { Bell, HelpCircle, LogOut, Settings, Mail, Phone, Zap, UserCog, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";

export function TopBar({ userName = "Admin User", userRoles = ["admin"] }: { userName?: string; userRoles?: string[] }) {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase();
  
  const isAdmin = userRoles.includes('admin');

  const handleLogout = () => {
    logout();
    setLocation('/login');
  };

  return (
    <header className="flex items-center justify-between gap-4 border-b bg-background px-4 py-3">
      <div className="flex items-center gap-4">
        <SidebarTrigger data-testid="button-sidebar-toggle" />
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        <Button variant="ghost" size="icon" data-testid="button-help">
          <HelpCircle className="h-5 w-5" />
        </Button>

        <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
          <Bell className="h-5 w-5" />
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            3
          </Badge>
        </Button>

        {/* Settings Menu - Admin Only */}
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-settings">
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Settings & Administration</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Infrastructure Section */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger data-testid="menu-infrastructure">
                  <Zap className="mr-2 h-4 w-4" />
                  Infrastructure
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setLocation('/email-infrastructure/sender-profiles')} data-testid="menu-sender-profiles">
                    <Mail className="mr-2 h-4 w-4" />
                    Email Infrastructure
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation('/telephony/sip-trunks')} data-testid="menu-sip-trunks">
                    <Phone className="mr-2 h-4 w-4" />
                    Telephony
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation('/settings/integrations')} data-testid="menu-integrations">
                    <Zap className="mr-2 h-4 w-4" />
                    Integrations & APIs
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Organization Section */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger data-testid="menu-organization">
                  <Settings className="mr-2 h-4 w-4" />
                  Organization
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setLocation('/settings/users')} data-testid="menu-users">
                    <UserCog className="mr-2 h-4 w-4" />
                    User & Role Management
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation('/suppressions')} data-testid="menu-suppressions">
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Suppression Management
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation('/settings/compliance')} data-testid="menu-compliance">
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Compliance Center
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* User Profile Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-testid="button-profile">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem data-testid="menu-profile">Profile</DropdownMenuItem>
            <DropdownMenuItem data-testid="menu-my-settings">My Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} data-testid="menu-logout">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}