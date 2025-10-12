import { useQuery } from "@tanstack/react-query";
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
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats']
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your B2B campaigns and performance metrics
        </p>
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
            <StatCard
              title="Total Accounts"
              value={stats?.totalAccounts.toLocaleString() || "0"}
              icon={Building2}
            />
            <StatCard
              title="Total Contacts"
              value={stats?.totalContacts.toLocaleString() || "0"}
              icon={Users}
            />
            <StatCard
              title="Active Campaigns"
              value={stats?.activeCampaigns.toString() || "0"}
              icon={Mail}
              description={`${stats?.activeCampaignsBreakdown.email || 0} email, ${stats?.activeCampaignsBreakdown.telemarketing || 0} telemarketing`}
            />
            <StatCard
              title="Leads This Month"
              value={stats?.leadsThisMonth.toLocaleString() || "0"}
              icon={CheckCircle}
            />
          </>
        )}
      </div>

      {/* Charts will be added later with real campaign metrics */}
      
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="hover-elevate cursor-pointer">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Building2 className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-semibold">Create Account</h3>
                  <p className="text-sm text-muted-foreground mt-1">Add a new company</p>
                </div>
              </CardContent>
            </Card>
            <Card className="hover-elevate cursor-pointer">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Mail className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-semibold">New Campaign</h3>
                  <p className="text-sm text-muted-foreground mt-1">Launch email or calls</p>
                </div>
              </CardContent>
            </Card>
            <Card className="hover-elevate cursor-pointer">
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-semibold">Review Leads</h3>
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
