import { LayoutDashboard, Building2, Users, ListFilter, Mail, Phone, CheckSquare, ShieldAlert, FileText, ShoppingCart, Settings, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

// Navigation items based on user role
const getNavItems = (userRole: string) => {
  const allItems = [
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboard,
      roles: ["admin", "campaign_manager", "data_ops", "qa_analyst", "agent"],
    },
    {
      title: "Accounts",
      url: "/accounts",
      icon: Building2,
      roles: ["admin", "campaign_manager", "data_ops", "agent"],
    },
    {
      title: "Contacts",
      url: "/contacts",
      icon: Users,
      roles: ["admin", "campaign_manager", "data_ops", "agent"],
    },
    {
      title: "Segments & Lists",
      url: "/segments",
      icon: ListFilter,
      roles: ["admin", "campaign_manager", "data_ops"],
    },
    {
      title: "Email Campaigns",
      url: "/campaigns/email",
      icon: Mail,
      roles: ["admin", "campaign_manager"],
    },
    {
      title: "Telemarketing",
      url: "/campaigns/telemarketing",
      icon: Phone,
      roles: ["admin", "campaign_manager", "agent"],
    },
    {
      title: "Leads & QA",
      url: "/leads",
      icon: CheckSquare,
      roles: ["admin", "campaign_manager", "qa_analyst"],
    },
    {
      title: "Suppressions",
      url: "/suppressions",
      icon: ShieldAlert,
      roles: ["admin", "data_ops"],
    },
    {
      title: "Reports",
      url: "/reports",
      icon: FileText,
      roles: ["admin", "campaign_manager", "qa_analyst"],
    },
    {
      title: "Client Orders",
      url: "/orders",
      icon: ShoppingCart,
      roles: ["admin", "client_user"],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      roles: ["admin"],
    },
  ];

  return allItems.filter(item => item.roles.includes(userRole));
};

export function AppSidebar({ userRole = "admin" }: { userRole?: string }) {
  const [location] = useLocation();
  const navItems = getNavItems(userRole);

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-semibold px-4 py-3">
            Pivotal CRM
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <Button 
          variant="ghost" 
          className="w-full justify-start" 
          data-testid="button-logout"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
