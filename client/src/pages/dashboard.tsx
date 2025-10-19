import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { StatCard } from "@/components/shared/stat-card";
import { Users, Building2, Mail, CheckCircle, Phone, Clock, TrendingUp, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardStats {
  totalAccounts: number;
  totalContacts: number;
  activeCampaigns: number;
  activeCampaignsBreakdown: {
    email: number;
    telemarketing: number;
  };
  leadsThisMonth: number;
}

interface AgentStats {
  callsToday: number;
  callsThisMonth: number;
  totalCalls: number;
  avgDuration: number;
  qualified: number;
  leadsApproved: number;
  leadsPending: number;
  activeCampaigns: number;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isAgent = user?.role === 'agent';
  
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    enabled: !isAgent,
  });

  const { data: agentStats, isLoading: agentLoading } = useQuery<AgentStats>({
    queryKey: ['/api/dashboard/agent-stats'],
    enabled: isAgent,
  });
  // Format duration helper
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-primary rounded-2xl p-8 text-white shadow-smooth-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold">Welcome Back{user?.firstName ? `, ${user.firstName}` : ''}!</h1>
          <p className="mt-2 text-white/90">
            {isAgent ? 'Your performance metrics and activity' : 'Overview of your B2B campaigns and performance metrics'}
          </p>
        </div>
      </div>

      {/* Agent Dashboard */}
      {isAgent && (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {agentLoading ? (
              <>
                <Card><CardContent className="pt-6"><Skeleton className="h-20" /></CardContent></Card>
                <Card><CardContent className="pt-6"><Skeleton className="h-20" /></CardContent></Card>
                <Card><CardContent className="pt-6"><Skeleton className="h-20" /></CardContent></Card>
                <Card><CardContent className="pt-6"><Skeleton className="h-20" /></CardContent></Card>
              </>
            ) : (
              <>
                <StatCard
                  title="Calls Today"
                  value={agentStats?.callsToday.toLocaleString() || "0"}
                  icon={Phone}
                  delay={0}
                  data-testid="stat-card-calls-today"
                />
                <StatCard
                  title="Calls This Month"
                  value={agentStats?.callsThisMonth.toLocaleString() || "0"}
                  icon={TrendingUp}
                  delay={100}
                  data-testid="stat-card-calls-month"
                />
                <StatCard
                  title="Qualified Leads"
                  value={agentStats?.qualified.toLocaleString() || "0"}
                  icon={Award}
                  delay={200}
                  data-testid="stat-card-qualified"
                />
                <StatCard
                  title="Avg Call Duration"
                  value={formatDuration(agentStats?.avgDuration || 0)}
                  icon={Clock}
                  delay={300}
                  data-testid="stat-card-avg-duration"
                />
              </>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-0 shadow-smooth-lg">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Approved Leads
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-chart-2" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-approved-leads">
                  {agentStats?.leadsApproved || 0}
                </div>
                <p className="text-xs text-muted-foreground">QA approved</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-smooth-lg">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Review
                </CardTitle>
                <Clock className="h-4 w-4 text-chart-3" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-pending-leads">
                  {agentStats?.leadsPending || 0}
                </div>
                <p className="text-xs text-muted-foreground">Awaiting QA</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-smooth-lg">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Campaigns
                </CardTitle>
                <Mail className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-active-campaigns">
                  {agentStats?.activeCampaigns || 0}
                </div>
                <p className="text-xs text-muted-foreground">Assigned to you</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-smooth-lg">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button 
                onClick={() => setLocation('/agent-console')}
                className="flex-1"
                data-testid="button-agent-console"
              >
                <Phone className="mr-2 h-4 w-4" />
                Agent Console
              </Button>
              <Button 
                onClick={() => setLocation('/call-reports')}
                variant="outline"
                className="flex-1"
                data-testid="button-my-reports"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                View My Reports
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* Admin/Manager Dashboard */}
      {!isAgent && (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              <>
                <Card><CardContent className="pt-6"><Skeleton className="h-20" /></CardContent></Card>
                <Card><CardContent className="pt-6"><Skeleton className="h-20" /></CardContent></Card>
                <Card><CardContent className="pt-6"><Skeleton className="h-20" /></CardContent></Card>
                <Card><CardContent className="pt-6"><Skeleton className="h-20" /></CardContent></Card>
              </>
            ) : (
              <>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setLocation('/accounts')}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setLocation('/accounts')}
                  className="cursor-pointer group"
                  data-testid="stat-card-link-accounts"
                >
                  <StatCard
                    title="Total Accounts"
                    value={stats?.totalAccounts.toLocaleString() || "0"}
                    icon={Building2}
                    delay={0}
                  />
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setLocation('/contacts')}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setLocation('/contacts')}
                  className="cursor-pointer group"
                  data-testid="stat-card-link-contacts"
                >
                  <StatCard
                    title="Total Contacts"
                    value={stats?.totalContacts.toLocaleString() || "0"}
                    icon={Users}
                    delay={100}
                  />
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setLocation('/campaigns')}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setLocation('/campaigns')}
                  className="cursor-pointer group"
                  data-testid="stat-card-link-campaigns"
                >
                  <StatCard
                    title="Active Campaigns"
                    value={stats?.activeCampaigns.toString() || "0"}
                    icon={Mail}
                    description={`${stats?.activeCampaignsBreakdown.email || 0} email, ${stats?.activeCampaignsBreakdown.telemarketing || 0} telemarketing`}
                    delay={200}
                  />
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setLocation('/leads')}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setLocation('/leads')}
                  className="cursor-pointer group"
                  data-testid="stat-card-link-leads"
                >
                  <StatCard
                    title="Leads This Month"
                    value={stats?.leadsThisMonth.toLocaleString() || "0"}
                    icon={CheckCircle}
                    delay={300}
                  />
                </div>
              </>
            )}
          </div>

          {/* Charts will be added later with real campaign metrics */}

          <Card className="border-0 shadow-smooth-lg animate-fade-in" style={{ animationDelay: '400ms' }}>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                Quick Actions
                <span className="text-xs font-normal text-muted-foreground">Get started fast</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <Card
                  role="button"
                  tabIndex={0}
                  className="card-hover cursor-pointer border-0 shadow-smooth bg-gradient-to-br from-blue-500/10 to-blue-600/5 group"
                  onClick={() => setLocation('/accounts')}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setLocation('/accounts')}
                  data-testid="quick-action-create-account"
                >
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="h-16 w-16 mx-auto mb-3 bg-blue-500/20 rounded-2xl flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                        <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                      </div>
                      <h3 className="font-semibold text-lg">Create Account</h3>
                      <p className="text-sm text-muted-foreground mt-1">Add a new company</p>
                    </div>
                  </CardContent>
                </Card>
                <Card
                  role="button"
                  tabIndex={0}
                  className="card-hover cursor-pointer border-0 shadow-smooth bg-gradient-to-br from-purple-500/10 to-purple-600/5 group"
                  onClick={() => setLocation('/campaigns')}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setLocation('/campaigns')}
                  data-testid="quick-action-new-campaign"
                >
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="h-16 w-16 mx-auto mb-3 bg-purple-500/20 rounded-2xl flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                        <Mail className="h-8 w-8 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
                      </div>
                      <h3 className="font-semibold text-lg">New Campaign</h3>
                      <p className="text-sm text-muted-foreground mt-1">Launch email or calls</p>
                    </div>
                  </CardContent>
                </Card>
                <Card
                  role="button"
                  tabIndex={0}
                  className="card-hover cursor-pointer border-0 shadow-smooth bg-gradient-to-br from-teal-500/10 to-teal-600/5 group"
                  onClick={() => setLocation('/call-reports')}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setLocation('/call-reports')}
                  data-testid="quick-action-call-reports"
                >
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="h-16 w-16 mx-auto mb-3 bg-teal-500/20 rounded-2xl flex items-center justify-center group-hover:bg-teal-500/30 transition-colors">
                        <CheckCircle className="h-8 w-8 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform" />
                      </div>
                      <h3 className="font-semibold text-lg">Call Reports</h3>
                      <p className="text-sm text-muted-foreground mt-1">View performance</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Activity feed will appear here</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}