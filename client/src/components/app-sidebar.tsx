import {
  LayoutDashboard,
  Building2,
  Users,
  Megaphone,
  CheckCircle,
  BarChart3,
  Briefcase,
  LogOut,
  ChevronDown,
  Headphones,
  Activity,
  Database,
  Phone,
  Mail, // Added Mail icon
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
  SidebarSeparator,
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

interface NavSection {
  label: string;
  items: NavItem[];
  roles: string[];
}

// Organized navigation structure with sections
const getNavSections = (): NavSection[] => [
  // Core CRM Section
  {
    label: "CRM",
    roles: ["admin", "campaign_manager", "data_ops", "quality_analyst", "agent", "client_user"],
    items: [
      // Dashboard is visible to all authenticated users
      {
        title: "Dashboard",
        url: "/",
        icon: LayoutDashboard,
        roles: ["admin", "campaign_manager", "data_ops", "quality_analyst", "agent", "client_user", "content_creator"],
      },
      {
        title: "Accounts",
        icon: Building2,
        roles: ["admin", "campaign_manager", "data_ops"],
        items: [
          { title: "All Accounts", url: "/accounts", roles: ["admin", "campaign_manager", "data_ops"] },
          { title: "Segments & Lists", url: "/segments?entity=account", roles: ["admin", "campaign_manager", "data_ops"] },
          { title: "Accounts List (TAL)", url: "/domain-sets", roles: ["admin", "data_ops"] },
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
          { title: "Phone Bulk Editor", url: "/phone-bulk-editor", roles: ["admin", "data_ops"] },
        ],
      },
    ],
  },

  // Campaigns & Outreach Section
  {
    label: "Campaigns & Outreach",
    roles: ["admin", "campaign_manager", "agent"],
    items: [
      {
        title: "Campaigns",
        icon: Megaphone,
        roles: ["admin", "campaign_manager"],
        items: [
          { title: "All Campaigns", url: "/campaigns", roles: ["admin", "campaign_manager"] },
          { title: "Email Campaigns", url: "/campaigns/email", roles: ["admin", "campaign_manager"] },
          { title: "Pipeline Dialer", url: "/campaigns/telemarketing", roles: ["admin", "campaign_manager"] },
          { title: "Campaign Configuration", url: "/campaigns/config", roles: ["admin", "campaign_manager"] },
        ],
      },
      {
        title: "Agent Console",
        url: "/agent-console",
        icon: Headphones,
        roles: ["admin", "campaign_manager", "agent"],
      },
      {
        title: "QA & Leads",
        url: "/leads",
        icon: CheckCircle,
        roles: ["admin", "campaign_manager", "quality_analyst"],
      },
    ],
  },

  // Analytics & Reporting Section
  {
    label: "Analytics & Reporting",
    roles: ["admin", "campaign_manager", "quality_analyst", "client_user"],
    items: [
      {
        title: "Reports",
        icon: BarChart3, // Changed from BarChart to BarChart3
        roles: ["admin", "campaign_manager", "agent"],
        items: [
          { title: "Overview", url: "/reports", roles: ["admin", "campaign_manager"] },
          { title: "Call Reports", url: "/call-reports", roles: ["admin", "campaign_manager", "agent"] },
        ],
      },
      {
        title: "Projects Management",
        url: "/orders",
        icon: Briefcase,
        roles: ["admin", "campaign_manager", "client_user"],
      },
      // Added Engagement Analytics
      {
        title: "Engagement Analytics",
        url: "/engagement-analytics",
        icon: Activity, // Added Activity icon
        roles: ["admin", "campaign_manager", "quality_analyst", "client_user"],
      },
    ],
  },

  // Data Verification Section
  {
    label: "Data Verification",
    roles: ["admin", "data_ops", "quality_analyst"],
    items: [
      {
        title: "Verification Campaigns",
        url: "/verification/campaigns",
        icon: Database,
        roles: ["admin", "data_ops", "quality_analyst"],
      },
      {
        title: "Email Validation Test",
        url: "/email-validation-test",
        icon: Mail,
        roles: ["admin", "data_ops", "quality_analyst"],
      },
    ],
  },
];

// Filter sections and items based on user roles
const filterSectionsByRoles = (sections: NavSection[], userRoles: string[]): NavSection[] => {
  // If user has admin role, show everything
  if (userRoles.includes('admin')) {
    return sections;
  }

  return sections
    .filter(section => section.roles.some(role => userRoles.includes(role)))
    .map(section => ({
      ...section,
      items: section.items
        .filter(item => item.roles.some(role => userRoles.includes(role)))
        .map(item => ({
          ...item,
          items: item.items?.filter(subItem => subItem.roles.some(role => userRoles.includes(role))),
        })),
    }))
    .filter(section => section.items.length > 0);
};

export function AppSidebar({ userRoles = ["admin"] }: { userRoles?: string[] }) {
  const [location] = useLocation();
  const filteredSections = filterSectionsByRoles(getNavSections(), userRoles);

  const isActive = (url?: string, items?: SubNavItem[]) => {
    if (url) {
      const urlWithoutParams = url.split('?')[0];
      const locationWithoutParams = location.split('?')[0];

      if (location === url) return true;

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
          <SidebarGroupLabel className="text-lg font-semibold px-4 py-3 mb-2">
            Pivotal CRM
          </SidebarGroupLabel>
        </SidebarGroup>

        {filteredSections.map((section, sectionIndex) => (
          <div key={section.label}>
            {sectionIndex > 0 && <SidebarSeparator className="my-2" />}
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70 px-4 py-2">
                {section.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => {
                    if (!item.items || item.items.length === 0) {
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive(item.url)}
                            data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            <a href={item.url}>
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </a>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    }

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
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                              <ChevronDown className="ml-auto h-3 w-3 transition-transform group-data-[state=open]/collapsible:rotate-180" />
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
          </div>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
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