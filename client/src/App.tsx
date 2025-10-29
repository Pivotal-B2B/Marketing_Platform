import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { ProtectedRoute } from "@/components/protected-route";
import { CommandPalette } from "@/components/patterns/command-palette";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import AccountsPage from "@/pages/accounts";
import AccountDetailPage from "@/pages/account-detail";
import ContactsPage from "@/pages/contacts";
import ContactDetailPage from "@/pages/contact-detail";
import SegmentsPage from "@/pages/segments";
import SegmentDetailPage from "@/pages/segment-detail";
import ListDetailPage from "@/pages/list-detail";
import DomainSetsPage from "@/pages/domain-sets";
import AccountsListDetail from "@/pages/accounts-list-detail";
import CampaignsPage from "@/pages/campaigns";
import EmailCampaignsPage from "@/pages/email-campaigns";
import EmailCampaignCreatePage from "@/pages/email-campaign-create";
import TelemarketingCreatePage from "@/pages/telemarketing-create";
import PhoneCampaignsPage from "@/pages/phone-campaigns";
import CampaignConfigPage from "@/pages/campaign-config";
import CampaignSuppressionsPage from "@/pages/campaign-suppressions";
import LeadsPage from "@/pages/leads";
import LeadDetailPage from "@/pages/lead-detail";
import ContentStudioPage from "@/pages/content-studio";
import AIContentGeneratorPage from "@/pages/ai-content-generator";
import SocialMediaPublisherPage from "@/pages/social-media-publisher";
import SuppressionsPage from "@/pages/suppressions";
import OrdersPage from "@/pages/orders";
import ImportsPage from "@/pages/imports";
import ReportsPage from "@/pages/reports";
import CallReportsPage from "@/pages/call-reports";
import CallReportsDetailsPage from "@/pages/call-reports-details";
import EngagementAnalyticsPage from "@/pages/engagement-analytics";
import SettingsPage from "@/pages/settings";
import UserManagementPage from "@/pages/user-management";
import EventsPage from "@/pages/events";
import ResourcesPage from "@/pages/resources";
import NewsPage from "@/pages/news";
import SenderProfilesPage from "@/pages/sender-profiles";
import SipTrunkSettingsPage from "@/pages/sip-trunk-settings";
import AgentConsolePage from "./pages/agent-console";
import ResourcesCentrePage from "@/pages/resources-centre";
import CampaignQueuePage from "@/pages/campaign-queue";
import DvProjectsPage from "@/pages/dv-projects";
import DvProjectNewPage from "@/pages/dv-project-new";
import DvProjectDetailPage from "@/pages/dv-project-detail";
import DvAgentConsolePage from "@/pages/dv-agent-console";
import VerificationCampaignsPage from "@/pages/verification-campaigns";
import VerificationCampaignConfigPage from "@/pages/verification-campaign-config";
import VerificationCampaignStatsPage from "@/pages/verification-campaign-stats";
import VerificationConsolePage from "@/pages/verification-console";
import VerificationUploadPage from "@/pages/verification-upload";
import VerificationSuppressionUploadPage from "@/pages/verification-suppression-upload";
import AdminDataManagementPage from "@/pages/admin-data-management";

function AuthenticatedApp() {
  const { user } = useAuth();

  // Custom sidebar width for enterprise CRM
  const style = {
    "--sidebar-width": "12rem",       // 192px compact sidebar
    "--sidebar-width-icon": "4rem",   // default icon width
  };

  // Get user roles array (support both legacy single role and new multi-role system)
  const userRoles = (user as any)?.roles || [user?.role || 'agent'];
  
  // Debug log to help troubleshoot role issues
  console.log('=== AUTH DEBUG ===');
  console.log('Current user:', user);
  console.log('Current user roles:', userRoles);
  console.log('User roles type:', typeof userRoles, Array.isArray(userRoles));
  console.log('User role from legacy:', user?.role);
  console.log('User roles from new system:', (user as any)?.roles);
  console.log('==================');

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <CommandPalette />
      <div className="flex h-screen w-full">
        <AppSidebar userRoles={userRoles} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <TopBar 
            userName={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'User'} 
            userRoles={userRoles}
          />
          <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 bg-background">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/accounts/:id" component={AccountDetailPage} />
              <Route path="/accounts" component={AccountsPage} />
              <Route path="/contacts/:id" component={ContactDetailPage} />
              <Route path="/contacts" component={ContactsPage} />
              <Route path="/segments/lists/:id" component={ListDetailPage} />
              <Route path="/segments/:id" component={SegmentDetailPage} />
              <Route path="/segments" component={SegmentsPage} />
              <Route path="/domain-sets" component={DomainSetsPage} />
              <Route path="/domain-sets/:id" component={AccountsListDetail} />
              <Route path="/campaigns" component={CampaignsPage} />
              <Route path="/campaigns/email/create" component={EmailCampaignCreatePage} />
              <Route path="/campaigns/email" component={EmailCampaignsPage} />
              <Route path="/campaigns/telemarketing/create" component={TelemarketingCreatePage} />
              <Route path="/campaigns/telemarketing" component={PhoneCampaignsPage} />
              <Route path="/campaigns/:id/suppressions" component={CampaignSuppressionsPage} />
              <Route path="/campaigns/:id/queue" component={CampaignQueuePage} />
              <Route path="/campaigns/config" component={CampaignConfigPage} />
              <Route path="/leads/:id" component={LeadDetailPage} />
              <Route path="/leads" component={LeadsPage} />
              <Route path="/suppressions" component={SuppressionsPage} />
              <Route path="/content-studio/ai-generator" component={AIContentGeneratorPage} />
              <Route path="/content-studio/social-publisher" component={SocialMediaPublisherPage} />
              <Route path="/content-studio" component={ContentStudioPage} />
              <Route path="/events" component={EventsPage} />
              <Route path="/resources" component={ResourcesPage} />
              <Route path="/news" component={NewsPage} />
              <Route path="/resources-centre" component={ResourcesCentrePage} />
              <Route path="/agent-console" component={AgentConsolePage} />
              <Route path="/email-infrastructure/sender-profiles" component={SenderProfilesPage} />
              <Route path="/telephony/sip-trunks" component={SipTrunkSettingsPage} />
              <Route path="/orders" component={OrdersPage} />
              <Route path="/imports" component={ImportsPage} />
              <Route path="/reports" component={ReportsPage} />
        <Route path="/call-reports" component={CallReportsPage} />
        <Route path="/call-reports/details" component={CallReportsDetailsPage} />
          <Route path="/engagement-analytics" component={EngagementAnalyticsPage} />
              <Route path="/settings/users" component={UserManagementPage} />
              <Route path="/settings/data-management" component={AdminDataManagementPage} />
              <Route path="/settings/compliance" component={SettingsPage} />
              <Route path="/settings/integrations" component={SettingsPage} />
              <Route path="/settings" component={SettingsPage} />
              <Route path="/dv/console/:projectId" component={DvAgentConsolePage} />
              <Route path="/dv/projects/new" component={DvProjectNewPage} />
              <Route path="/dv/projects/:id" component={DvProjectDetailPage} />
              <Route path="/dv/projects" component={DvProjectsPage} />
              <Route path="/verification/:campaignId/stats" component={VerificationCampaignStatsPage} />
              <Route path="/verification/:campaignId/console" component={VerificationConsolePage} />
              <Route path="/verification/:campaignId/upload" component={VerificationUploadPage} />
              <Route path="/verification/:campaignId/suppression-upload" component={VerificationSuppressionUploadPage} />
              <Route path="/verification/suppression-upload" component={VerificationSuppressionUploadPage} />
              <Route path="/verification/campaigns/:id" component={VerificationCampaignConfigPage} />
              <Route path="/verification/campaigns" component={VerificationCampaignsPage} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route>
        <ProtectedRoute>
          <AuthenticatedApp />
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;