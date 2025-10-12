import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ShoppingCart, Download, BarChart3, Link as LinkIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const orders = [
    {
      id: "1",
      orderNumber: "ORD-2024-001",
      type: "email",
      status: "in_progress",
      leadGoal: 100,
      approved: 68,
      linkedCampaigns: 2,
      createdAt: "2024-01-05",
    },
    {
      id: "2",
      orderNumber: "ORD-2024-002",
      type: "combo",
      status: "submitted",
      leadGoal: 250,
      approved: 0,
      linkedCampaigns: 0,
      createdAt: "2024-01-08",
    },
    {
      id: "3",
      orderNumber: "ORD-2024-003",
      type: "call",
      status: "completed",
      leadGoal: 50,
      approved: 52,
      linkedCampaigns: 1,
      createdAt: "2023-12-20",
    },
  ];

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
      draft: { variant: "secondary", label: "Draft" },
      submitted: { variant: "default", label: "Submitted" },
      in_progress: { variant: "outline", label: "In Progress" },
      completed: { variant: "outline", label: "Completed" },
    };
    const { variant, label } = config[status] || config.draft;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, { label: string }> = {
      email: { label: "Email" },
      call: { label: "Telemarketing" },
      combo: { label: "Email + Calls" },
    };
    const { label } = config[type] || config.email;
    return <Badge variant="secondary">{label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaign Orders</h1>
          <p className="text-muted-foreground mt-1">
            Manage your campaign orders and track lead delivery
          </p>
        </div>
        <Button data-testid="button-create-order">
          <Plus className="mr-2 h-4 w-4" />
          New Order
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search orders..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-orders"
          />
        </div>
      </div>

      {orders.length > 0 ? (
        <div className="grid gap-4">
          {orders.map((order) => (
            <Card key={order.id} className="hover-elevate" data-testid={`card-order-${order.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle>{order.orderNumber}</CardTitle>
                      {getStatusBadge(order.status)}
                      {getTypeBadge(order.type)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Created {order.createdAt} • {order.linkedCampaigns} campaigns linked
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {order.status === "in_progress" && (
                      <Button variant="outline" size="sm" data-testid={`button-link-campaigns-${order.id}`}>
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Link Campaigns
                      </Button>
                    )}
                    <Button variant="outline" size="sm" data-testid={`button-view-reports-${order.id}`}>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Reports
                    </Button>
                    {order.approved > 0 && (
                      <Button size="sm" data-testid={`button-download-leads-${order.id}`}>
                        <Download className="mr-2 h-4 w-4" />
                        Download Leads
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Lead Progress</span>
                      <span className="font-medium">
                        {order.approved} / {order.leadGoal} approved
                      </span>
                    </div>
                    <Progress value={(order.approved / order.leadGoal) * 100} />
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                    <div>
                      <div className="text-2xl font-bold" data-testid={`order-goal-${order.id}`}>
                        {order.leadGoal}
                      </div>
                      <div className="text-xs text-muted-foreground">Lead Goal</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-chart-2" data-testid={`order-approved-${order.id}`}>
                        {order.approved}
                      </div>
                      <div className="text-xs text-muted-foreground">Approved</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-chart-1" data-testid={`order-campaigns-${order.id}`}>
                        {order.linkedCampaigns}
                      </div>
                      <div className="text-xs text-muted-foreground">Linked Campaigns</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ShoppingCart}
          title="No orders yet"
          description="Create your first campaign order to start generating qualified leads for your business."
          actionLabel="New Order"
          onAction={() => {}}
        />
      )}
    </div>
  );
}
