import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import AccountsPage from "@/pages/accounts";
import ContactsPage from "@/pages/contacts";
import SegmentsPage from "@/pages/segments";
import EmailCampaignsPage from "@/pages/email-campaigns";
import TelemarketingPage from "@/pages/telemarketing";
import LeadsPage from "@/pages/leads";
import SuppressionsPage from "@/pages/suppressions";
import OrdersPage from "@/pages/orders";
import ReportsPage from "@/pages/reports";
import SettingsPage from "@/pages/settings";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/" component={Dashboard} />
      <Route path="/accounts" component={AccountsPage} />
      <Route path="/contacts" component={ContactsPage} />
      <Route path="/segments" component={SegmentsPage} />
      <Route path="/campaigns/email" component={EmailCampaignsPage} />
      <Route path="/campaigns/telemarketing" component={TelemarketingPage} />
      <Route path="/leads" component={LeadsPage} />
      <Route path="/suppressions" component={SuppressionsPage} />
      <Route path="/orders" component={OrdersPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Custom sidebar width for enterprise CRM
  const style = {
    "--sidebar-width": "16rem",       // 256px for better navigation
    "--sidebar-width-icon": "4rem",   // default icon width
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar userRole="admin" />
              <div className="flex flex-col flex-1 overflow-hidden">
                <TopBar userName="Admin User" />
                <main className="flex-1 overflow-auto p-6 bg-background">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
