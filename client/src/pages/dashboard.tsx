import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { StatCard } from "@/components/shared/stat-card";
import { Users, Building2, Mail, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats']
  });
  return (
    <div className="space-y-6">
      <div className="bg-gradient-primary rounded-2xl p-8 text-white shadow-smooth-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold">Welcome Back!</h1>
          <p className="mt-2 text-white/90">
            Overview of your B2B campaigns and performance metrics
          </p>
        </div>
      </div>

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
            <div onClick={() => setLocation('/accounts')} className="cursor-pointer">
              <StatCard
                title="Total Accounts"
                value={stats?.totalAccounts.toLocaleString() || "0"}
                icon={Building2}
              />
            </div>
            <div onClick={() => setLocation('/contacts')} className="cursor-pointer">
              <StatCard
                title="Total Contacts"
                value={stats?.totalContacts.toLocaleString() || "0"}
                icon={Users}
              />
            </div>
            <div onClick={() => setLocation('/campaigns')} className="cursor-pointer">
              <StatCard
                title="Active Campaigns"
                value={stats?.activeCampaigns.toString() || "0"}
                icon={Mail}
                description={`${stats?.activeCampaignsBreakdown.email || 0} email, ${stats?.activeCampaignsBreakdown.telemarketing || 0} telemarketing`}
              />
            </div>
            <div onClick={() => setLocation('/leads')} className="cursor-pointer">
              <StatCard
                title="Leads This Month"
                value={stats?.leadsThisMonth.toLocaleString() || "0"}
                icon={CheckCircle}
              />
            </div>
          </>
        )}
      </div>

      {/* Charts will be added later with real campaign metrics */}
      
      <Card className="border-0 shadow-smooth-lg">
        <CardHeader>
          <CardTitle className="text-xl">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="card-hover cursor-pointer border-0 shadow-smooth bg-gradient-to-br from-blue-500/10 to-blue-600/5">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="h-16 w-16 mx-auto mb-3 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                    <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-lg">Create Account</h3>
                  <p className="text-sm text-muted-foreground mt-1">Add a new company</p>
                </div>
              </CardContent>
            </Card>
            <Card className="card-hover cursor-pointer border-0 shadow-smooth bg-gradient-to-br from-purple-500/10 to-purple-600/5">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="h-16 w-16 mx-auto mb-3 bg-purple-500/20 rounded-2xl flex items-center justify-center">
                    <Mail className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-lg">New Campaign</h3>
                  <p className="text-sm text-muted-foreground mt-1">Launch email or calls</p>
                </div>
              </CardContent>
            </Card>
            <Card className="card-hover cursor-pointer border-0 shadow-smooth bg-gradient-to-br from-green-500/10 to-green-600/5">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="h-16 w-16 mx-auto mb-3 bg-green-500/20 rounded-2xl flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-semibold text-lg">Review Leads</h3>
                  <p className="text-sm text-muted-foreground mt-1">Approve or reject</p>
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
    </div>
  );
}
