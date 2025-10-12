import { StatCard } from "@/components/shared/stat-card";
import { Users, Building2, Mail, Phone, CheckCircle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";

const campaignData = [
  { name: 'Jan', email: 4000, calls: 2400 },
  { name: 'Feb', email: 3000, calls: 1398 },
  { name: 'Mar', email: 2000, calls: 9800 },
  { name: 'Apr', email: 2780, calls: 3908 },
  { name: 'May', email: 1890, calls: 4800 },
  { name: 'Jun', email: 2390, calls: 3800 },
];

const leadsData = [
  { name: 'Week 1', approved: 45, pending: 12 },
  { name: 'Week 2', approved: 52, pending: 18 },
  { name: 'Week 3', approved: 61, pending: 15 },
  { name: 'Week 4', approved: 48, pending: 22 },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your B2B campaigns and performance metrics
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Accounts"
          value="2,847"
          icon={Building2}
          trend={{ value: 12.5, isPositive: true }}
        />
        <StatCard
          title="Total Contacts"
          value="18,234"
          icon={Users}
          trend={{ value: 8.2, isPositive: true }}
        />
        <StatCard
          title="Active Campaigns"
          value="24"
          icon={Mail}
          description="12 email, 12 telemarketing"
        />
        <StatCard
          title="Leads This Month"
          value="487"
          icon={CheckCircle}
          trend={{ value: 15.3, isPositive: true }}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={campaignData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.375rem'
                  }}
                />
                <Bar dataKey="email" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="calls" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={leadsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.375rem'
                  }}
                />
                <Line type="monotone" dataKey="approved" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                <Line type="monotone" dataKey="pending" stroke="hsl(var(--chart-3))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { user: "Sarah Johnson", action: "approved 12 leads", time: "2 minutes ago" },
              { user: "Mike Chen", action: "launched Email Campaign #247", time: "1 hour ago" },
              { user: "Emily Davis", action: "imported 5,000 contacts", time: "3 hours ago" },
              { user: "Alex Martinez", action: "created new segment 'Enterprise Q2'", time: "5 hours ago" },
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-4 text-sm">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <div className="flex-1">
                  <span className="font-medium">{activity.user}</span>
                  <span className="text-muted-foreground"> {activity.action}</span>
                </div>
                <span className="text-muted-foreground text-xs">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
