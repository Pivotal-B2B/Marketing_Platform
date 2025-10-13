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
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import AccountsPage from "@/pages/accounts";
import AccountDetailPage from "@/pages/account-detail";
import ContactsPage from "@/pages/contacts";
import ContactDetailPage from "@/pages/contact-detail";
import SegmentsPage from "@/pages/segments";
import DomainSetsPage from "@/pages/domain-sets";
import EmailCampaignsPage from "@/pages/email-campaigns";
import TelemarketingPage from "@/pages/telemarketing";
import CampaignConfigPage from "@/pages/campaign-config";
import LeadsPage from "@/pages/leads";
import SuppressionsPage from "@/pages/suppressions";
import OrdersPage from "@/pages/orders";
import ImportsPage from "@/pages/imports";
import ReportsPage from "@/pages/reports";
import SettingsPage from "@/pages/settings";

function AuthenticatedApp() {
  const { user } = useAuth();
  
  // Custom sidebar width for enterprise CRM
  const style = {
    "--sidebar-width": "16rem",       // 256px for better navigation
    "--sidebar-width-icon": "4rem",   // default icon width
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar userRole={user?.role || 'agent'} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <TopBar userName={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'User'} />
          <main className="flex-1 overflow-auto p-6 bg-background">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/accounts/:id" component={AccountDetailPage} />
              <Route path="/accounts" component={AccountsPage} />
              <Route path="/contacts/:id" component={ContactDetailPage} />
              <Route path="/contacts" component={ContactsPage} />
              <Route path="/segments" component={SegmentsPage} />
              <Route path="/domain-sets" component={DomainSetsPage} />
              <Route path="/campaigns/email" component={EmailCampaignsPage} />
              <Route path="/campaigns/telemarketing" component={TelemarketingPage} />
              <Route path="/campaigns/config" component={CampaignConfigPage} />
              <Route path="/leads" component={LeadsPage} />
              <Route path="/suppressions" component={SuppressionsPage} />
              <Route path="/orders" component={OrdersPage} />
              <Route path="/imports" component={ImportsPage} />
              <Route path="/reports" component={ReportsPage} />
              <Route path="/settings" component={SettingsPage} />
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
