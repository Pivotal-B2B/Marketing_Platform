import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Megaphone,
  CheckCircle,
  BarChart,
  Briefcase,
  Settings,
  LogOut,
  ChevronDown,
  ListFilter,
  Globe,
  Mail,
  Phone,
  Settings2,
  ShieldAlert,
  Upload,
  UserCog,
  Lock,
  Zap,
  Sparkles,
  Share2,
  FileText,
  Cloud,
  Layers, // Added Layers icon for clarity, assuming it might be relevant for "Accounts List"
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

interface NavItem {
  title: string;
  url?: string;
  icon: any;
  roles: string[];
  items?: SubNavItem[];
}

interface SubNavItem {
  title: string;
  url: string;
  roles: string[];
}

// Navigation structure per Phase 22 spec
const getNavStructure = (): NavItem[] => [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    roles: ["admin", "campaign_manager", "data_ops", "qa_analyst", "agent", "client_user"],
  },
  {
    title: "Accounts",
    icon: Building2,
    roles: ["admin", "campaign_manager", "data_ops"],
    items: [
      { title: "All Accounts", url: "/accounts", roles: ["admin", "campaign_manager", "data_ops"] },
      { title: "Segments & Lists", url: "/segments?entity=account", roles: ["admin", "campaign_manager", "data_ops"] },
      { title: "Accounts List (TAL)", url: "/domain-sets", roles: ["admin", "data_ops"] }, // Changed from "Domain Sets"
    ],
  },
  {
    title: "Contacts",
    icon: Users,
    roles: ["admin", "campaign_manager", "data_ops"],
    items: [
      { title: "All Contacts", url: "/contacts", roles: ["admin", "campaign_manager", "data_ops"] },
      { title: "Segments & Lists", url: "/segments?entity=contact", roles: ["admin", "campaign_manager", "data_ops"] },
      { title: "Bulk Import", url: "/imports", roles: ["admin", "data_ops"] },
    ],
  },
  {
    title: "Campaigns",
    icon: Megaphone,
    roles: ["admin", "campaign_manager", "agent"],
    items: [
      { title: "All Campaigns", url: "/campaigns", roles: ["admin", "campaign_manager"] },
      { title: "Email Campaigns", url: "/campaigns/email", roles: ["admin", "campaign_manager"] },
      { title: "Pipeline Dialer", url: "/campaigns/phone", roles: ["admin", "campaign_manager", "agent"] },
      { title: "Campaign Configuration", url: "/campaigns/config", roles: ["admin", "campaign_manager"] },
    ],
  },
  {
    title: "Agent Console",
    url: "/agent-console",
    icon: Phone,
    roles: ["admin", "campaign_manager", "agent"],
  },
  {
    title: "Content Studio",
    icon: Sparkles,
    roles: ["admin", "campaign_manager"],
    items: [
      { title: "Content Library", url: "/content-studio", roles: ["admin", "campaign_manager"] },
      { title: "AI Content Generator", url: "/content-studio/ai-generator", roles: ["admin", "campaign_manager"] },
      { title: "Social Media Publisher", url: "/content-studio/social-publisher", roles: ["admin", "campaign_manager"] },
    ],
  },
  {
    title: "Resources Centre",
    url: "/resources-centre",
    icon: Cloud,
    roles: ["admin", "campaign_manager", "data_ops"],
  },
  {
    title: "Email Infrastructure",
    icon: Settings2,
    roles: ["admin"],
    items: [
      { title: "Sender Profiles", url: "/email-infrastructure/sender-profiles", roles: ["admin"] },
    ],
  },
  {
    title: "QA & Leads Delivery",
    url: "/leads",
    icon: CheckCircle,
    roles: ["admin", "campaign_manager", "qa_analyst"],
  },
  {
    title: "Reports",
    url: "/reports",
    icon: BarChart,
    roles: ["admin", "campaign_manager", "qa_analyst", "client_user"],
  },
  {
    title: "Projects Management",
    url: "/orders",
    icon: Briefcase,
    roles: ["admin", "campaign_manager", "client_user"],
  },
  {
    title: "Organization Settings",
    icon: Settings,
    roles: ["admin"],
    items: [
      { title: "User & Role Management", url: "/settings/users", roles: ["admin"] },
      { title: "Suppression Management", url: "/suppressions", roles: ["admin"] },
      { title: "Compliance Center", url: "/settings/compliance", roles: ["admin"] },
      { title: "Integrations & APIs", url: "/settings/integrations", roles: ["admin"] },
    ],
  },
];

// Filter navigation items based on user role
const filterNavByRole = (navItems: NavItem[], userRole: string): NavItem[] => {
  return navItems
    .filter(item => item.roles.includes(userRole))
    .map(item => ({
      ...item,
      items: item.items?.filter(subItem => subItem.roles.includes(userRole)),
    }));
};

export function AppSidebar({ userRole = "admin" }: { userRole?: string }) {
  const [location] = useLocation();
  const navItems = filterNavByRole(getNavStructure(), userRole);

  const isActive = (url?: string, items?: SubNavItem[]) => {
    if (url) {
      // Handle URLs with query parameters
      const urlWithoutParams = url.split('?')[0];
      const locationWithoutParams = location.split('?')[0];

      // Exact match for simple URLs
      if (location === url) return true;

      // Base path match for URLs with query params
      if (url.includes('?') && locationWithoutParams === urlWithoutParams) {
        return location.includes(url.split('?')[1]);
      }

      return false;
    }
    if (items) {
      return items.some(item => {
        const itemUrlWithoutParams = item.url.split('?')[0];
        const locationWithoutParams = location.split('?')[0];

        if (location === item.url) return true;
        if (item.url.includes('?') && locationWithoutParams === itemUrlWithoutParams) {
          return location.includes(item.url.split('?')[1]);
        }
        return false;
      });
    }
    return false;
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-semibold px-4 py-3">
            Pivotal CRM
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                // Top-level item without dropdown
                if (!item.items || item.items.length === 0) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive(item.url)}
                        data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <a href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                // Collapsible item with nested dropdown
                return (
                  <Collapsible
                    key={item.title}
                    defaultOpen={isActive(undefined, item.items)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          isActive={isActive(undefined, item.items)}
                          data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <item.icon />
                          <span>{item.title}</span>
                          <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={location === subItem.url}
                                data-testid={`nav-sub-${subItem.title.toLowerCase().replace(/\s+/g, '-')}`}
                              >
                                <a href={subItem.url}>
                                  <span>{subItem.title}</span>
                                </a>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
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