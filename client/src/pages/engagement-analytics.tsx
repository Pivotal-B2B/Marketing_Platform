
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart3, Download, Mail, Phone, UserCheck, TrendingUp, 
  Activity, CheckCircle, XCircle, Clock, Target, DollarSign,
  CalendarIcon, Users, MessageSquare, FileText, Calendar as CalendarDays
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function EngagementAnalyticsPage() {
  const [dateRange, setDateRange] = useState({ from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), to: new Date() });
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");

  // Fetch campaigns for filter
  const { data: campaigns = [] } = useQuery({
    queryKey: ['/api/campaigns'],
  });

  // Fetch comprehensive analytics (you'll need to create this endpoint)
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['/api/analytics/engagement', dateRange, selectedCampaign],
    queryFn: async () => {
      // This will need to be implemented on the backend
      const params = new URLSearchParams({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        campaign: selectedCampaign,
      });
      const response = await fetch(`/api/analytics/engagement?${params}`);
      return response.json();
    },
  });

  const overviewStats = [
    { label: "Total Campaigns", value: campaigns.length, icon: BarChart3, color: "text-blue-500" },
    { label: "Email Sends", value: analytics?.email?.total || 0, icon: Mail, color: "text-green-500" },
    { label: "Calls Made", value: analytics?.calls?.total || 0, icon: Phone, color: "text-purple-500" },
    { label: "Qualified Leads", value: analytics?.leads?.qualified || 0, icon: UserCheck, color: "text-orange-500" },
  ];

  const engagementTrend = analytics?.timeline || [];
  const channelBreakdown = analytics?.channelBreakdown || [];
  const dispositionData = analytics?.dispositions || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Comprehensive Engagement Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            A-Z view of all activity across campaigns, channels, and outcomes
          </p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from && dateRange.to ? (
                      <>
                        {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
                      </>
                    ) : (
                      "Select date range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range: any) => range && setDateRange(range)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Campaign</label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {campaigns.map((campaign: any) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {overviewStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value.toLocaleString()}</p>
                </div>
                <stat.icon className={cn("h-8 w-8", stat.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="calls">Calls</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Engagement Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Engagement Timeline</CardTitle>
                <CardDescription>Activity across all channels over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={engagementTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }} />
                    <Legend />
                    <Line type="monotone" dataKey="emails" stroke={COLORS[0]} strokeWidth={2} name="Emails" />
                    <Line type="monotone" dataKey="calls" stroke={COLORS[1]} strokeWidth={2} name="Calls" />
                    <Line type="monotone" dataKey="leads" stroke={COLORS[2]} strokeWidth={2} name="Leads" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Channel Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Channel Performance</CardTitle>
                <CardDescription>Distribution across channels</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={channelBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="hsl(var(--chart-1))"
                      dataKey="value"
                    >
                      {channelBreakdown.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Disposition Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Call Dispositions</CardTitle>
              <CardDescription>Outcome distribution for all calls</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dispositionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="disposition" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="count" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Mail className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                  <p className="text-2xl font-bold">{analytics?.email?.sent || 0}</p>
                  <p className="text-sm text-muted-foreground">Sent</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                  <p className="text-2xl font-bold">{analytics?.email?.delivered || 0}</p>
                  <p className="text-sm text-muted-foreground">Delivered ({((analytics?.email?.delivered / analytics?.email?.sent) * 100 || 0).toFixed(1)}%)</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <MessageSquare className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                  <p className="text-2xl font-bold">{analytics?.email?.opened || 0}</p>
                  <p className="text-sm text-muted-foreground">Opened ({((analytics?.email?.opened / analytics?.email?.delivered) * 100 || 0).toFixed(1)}%)</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <TrendingUp className="h-8 w-8 mx-auto text-orange-500 mb-2" />
                  <p className="text-2xl font-bold">{analytics?.email?.clicked || 0}</p>
                  <p className="text-sm text-muted-foreground">Clicked ({((analytics?.email?.clicked / analytics?.email?.opened) * 100 || 0).toFixed(1)}%)</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calls" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Phone className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                  <p className="text-2xl font-bold">{analytics?.calls?.attempted || 0}</p>
                  <p className="text-sm text-muted-foreground">Attempted</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                  <p className="text-2xl font-bold">{analytics?.calls?.connected || 0}</p>
                  <p className="text-sm text-muted-foreground">Connected ({((analytics?.calls?.connected / analytics?.calls?.attempted) * 100 || 0).toFixed(1)}%)</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Clock className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                  <p className="text-2xl font-bold">{analytics?.calls?.avgDuration || 0}s</p>
                  <p className="text-sm text-muted-foreground">Avg Duration</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <UserCheck className="h-8 w-8 mx-auto text-orange-500 mb-2" />
                  <p className="text-2xl font-bold">{analytics?.calls?.qualified || 0}</p>
                  <p className="text-sm text-muted-foreground">Qualified ({((analytics?.calls?.qualified / analytics?.calls?.connected) * 100 || 0).toFixed(1)}%)</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leads" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <FileText className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                  <p className="text-2xl font-bold">{analytics?.leads?.total || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Leads</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                  <p className="text-2xl font-bold">{analytics?.leads?.approved || 0}</p>
                  <p className="text-sm text-muted-foreground">Approved ({((analytics?.leads?.approved / analytics?.leads?.total) * 100 || 0).toFixed(1)}%)</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Clock className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                  <p className="text-2xl font-bold">{analytics?.leads?.pending || 0}</p>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <XCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
                  <p className="text-2xl font-bold">{analytics?.leads?.rejected || 0}</p>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance Summary</CardTitle>
              <CardDescription>Goals vs Actuals across all campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaigns.filter((c: any) => c.targetQualifiedLeads).map((campaign: any) => (
                  <div key={campaign.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{campaign.name}</h4>
                      <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                        {campaign.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Target Leads</p>
                        <p className="font-medium flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          {campaign.targetQualifiedLeads}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Actual Leads</p>
                        <p className="font-medium">
                          {analytics?.campaignLeads?.[campaign.id] || 0}
                        </p>
                      </div>
                      {campaign.costPerLead && (
                        <div>
                          <p className="text-muted-foreground">Cost Per Lead</p>
                          <p className="font-medium flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {parseFloat(campaign.costPerLead).toFixed(2)}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground">Timeline</p>
                        <p className="font-medium text-xs">
                          {campaign.startDate && format(new Date(campaign.startDate), 'MMM dd')} - 
                          {campaign.endDate && format(new Date(campaign.endDate), 'MMM dd')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
