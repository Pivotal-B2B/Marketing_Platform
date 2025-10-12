import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, XCircle, Clock, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LeadsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  const leads = [
    {
      id: "1",
      contact: { name: "Sarah Chen", email: "sarah@techcorp.com", title: "VP Engineering" },
      campaign: "Q2 Product Launch",
      qaStatus: "under_review",
      qualified: true,
      hasRecording: true,
      submittedAt: "2024-01-10",
    },
    {
      id: "2",
      contact: { name: "Michael Rodriguez", email: "m.rodriguez@startup.io", title: "CTO" },
      campaign: "Webinar Follow-up",
      qaStatus: "approved",
      qualified: true,
      hasRecording: true,
      submittedAt: "2024-01-09",
    },
    {
      id: "3",
      contact: { name: "Emily Watson", email: "e.watson@enterprise.com", title: "Director of Sales" },
      campaign: "Cold Outreach - Enterprise",
      qaStatus: "new",
      qualified: false,
      hasRecording: false,
      submittedAt: "2024-01-11",
    },
  ];

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
      new: { variant: "secondary", label: "New" },
      under_review: { variant: "default", label: "Under Review" },
      approved: { variant: "outline", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
    };
    const { variant, label } = config[status] || config.new;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const toggleLead = (id: string) => {
    setSelectedLeads(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leads & QA</h1>
          <p className="text-muted-foreground mt-1">
            Review, approve, and manage qualified leads
          </p>
        </div>
        <Button data-testid="button-download-approved">
          <Download className="mr-2 h-4 w-4" />
          Download Approved
        </Button>
      </div>

      <Tabs defaultValue="review" className="w-full">
        <TabsList>
          <TabsTrigger value="review" data-testid="tab-review">
            <Clock className="mr-2 h-4 w-4" />
            Pending Review
          </TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">
            <CheckCircle className="mr-2 h-4 w-4" />
            Approved
          </TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">
            <XCircle className="mr-2 h-4 w-4" />
            Rejected
          </TabsTrigger>
        </TabsList>

        <TabsContent value="review" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search leads..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-leads"
              />
            </div>
            {selectedLeads.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" data-testid="button-bulk-approve">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve ({selectedLeads.length})
                </Button>
                <Button variant="outline" data-testid="button-bulk-reject">
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject ({selectedLeads.length})
                </Button>
              </div>
            )}
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox />
                  </TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Qualified</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads
                  .filter(lead => lead.qaStatus === "new" || lead.qaStatus === "under_review")
                  .map((lead) => (
                    <TableRow key={lead.id} className="hover-elevate" data-testid={`row-lead-${lead.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedLeads.includes(lead.id)}
                          onCheckedChange={() => toggleLead(lead.id)}
                          data-testid={`checkbox-lead-${lead.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {lead.contact.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{lead.contact.name}</div>
                            <div className="text-sm text-muted-foreground">{lead.contact.title}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{lead.campaign}</TableCell>
                      <TableCell>{getStatusBadge(lead.qaStatus)}</TableCell>
                      <TableCell>
                        {lead.qualified ? (
                          <Badge variant="outline" className="bg-chart-2/10 text-chart-2 border-chart-2">
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{lead.submittedAt}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" data-testid={`button-review-lead-${lead.id}`}>
                            Review
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Approved Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {leads.filter(l => l.qaStatus === "approved").length} approved leads ready for delivery
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Rejected Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {leads.filter(l => l.qaStatus === "rejected").length} rejected leads
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
