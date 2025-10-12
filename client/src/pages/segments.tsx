import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ListFilter, Users, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function SegmentsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const segments = [
    { id: "1", name: "Enterprise Accounts", type: "dynamic", contacts: 1847, filters: "Revenue > $10M AND Employees > 1000" },
    { id: "2", name: "Tech Decision Makers", type: "dynamic", contacts: 423, filters: "Industry = Technology AND Title contains 'VP, Director'" },
  ];

  const lists = [
    { id: "1", name: "Q1 2024 Trade Show Leads", type: "static", contacts: 256, createdAt: "2024-01-15" },
    { id: "2", name: "Webinar Attendees - March", type: "static", contacts: 189, createdAt: "2024-03-20" },
  ];

  const domainSets = [
    { id: "1", name: "Fortune 500 Domains", domains: 500, matchRate: 94, contacts: 4782 },
    { id: "2", name: "SaaS Target List", domains: 1200, matchRate: 78, contacts: 3421 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Segments & Lists</h1>
          <p className="text-muted-foreground mt-1">
            Build dynamic segments, create static lists, and manage domain sets
          </p>
        </div>
      </div>

      <Tabs defaultValue="segments" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="segments" data-testid="tab-segments">Segments</TabsTrigger>
          <TabsTrigger value="lists" data-testid="tab-lists">Lists</TabsTrigger>
          <TabsTrigger value="domains" data-testid="tab-domains">Domain Sets</TabsTrigger>
        </TabsList>

        <TabsContent value="segments" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search segments..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-segments"
              />
            </div>
            <Button data-testid="button-create-segment">
              <Plus className="mr-2 h-4 w-4" />
              Create Segment
            </Button>
          </div>

          {segments.length > 0 ? (
            <div className="grid gap-4">
              {segments.map((segment) => (
                <Card key={segment.id} className="hover-elevate" data-testid={`card-segment-${segment.id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{segment.name}</CardTitle>
                      <Badge variant="outline">Dynamic</Badge>
                    </div>
                    <CardDescription className="font-mono text-xs">
                      {segment.filters}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span data-testid={`segment-contacts-${segment.id}`}>{segment.contacts.toLocaleString()} contacts</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" data-testid={`button-edit-segment-${segment.id}`}>
                          Edit
                        </Button>
                        <Button size="sm" data-testid={`button-use-segment-${segment.id}`}>
                          Use in Campaign
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ListFilter}
              title="No segments created"
              description="Create dynamic segments with advanced filters to target specific audiences."
              actionLabel="Create Segment"
              onAction={() => {}}
            />
          )}
        </TabsContent>

        <TabsContent value="lists" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search lists..."
                className="pl-10"
                data-testid="input-search-lists"
              />
            </div>
            <Button data-testid="button-create-list">
              <Plus className="mr-2 h-4 w-4" />
              Create List
            </Button>
          </div>

          {lists.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>List Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contacts</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[150px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lists.map((list) => (
                    <TableRow key={list.id} className="hover-elevate" data-testid={`row-list-${list.id}`}>
                      <TableCell className="font-medium">{list.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">Static</Badge>
                      </TableCell>
                      <TableCell>{list.contacts}</TableCell>
                      <TableCell className="text-muted-foreground">{list.createdAt}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" data-testid={`button-view-list-${list.id}`}>
                            View
                          </Button>
                          <Button size="sm" data-testid={`button-use-list-${list.id}`}>
                            Use
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="No lists created"
              description="Create static lists by selecting specific contacts or taking a snapshot of a segment."
              actionLabel="Create List"
              onAction={() => {}}
            />
          )}
        </TabsContent>

        <TabsContent value="domains" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search domain sets..."
                className="pl-10"
                data-testid="input-search-domain-sets"
              />
            </div>
            <Button data-testid="button-upload-domain-set">
              <Upload className="mr-2 h-4 w-4" />
              Upload Domain Set
            </Button>
          </div>

          {domainSets.length > 0 ? (
            <div className="grid gap-4">
              {domainSets.map((domainSet) => (
                <Card key={domainSet.id} className="hover-elevate" data-testid={`card-domain-set-${domainSet.id}`}>
                  <CardHeader>
                    <CardTitle>{domainSet.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="text-2xl font-bold">{domainSet.domains}</div>
                        <div className="text-sm text-muted-foreground">Domains</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-chart-2">{domainSet.matchRate}%</div>
                        <div className="text-sm text-muted-foreground">Match Rate</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{domainSet.contacts.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Contacts</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" data-testid={`button-expand-domain-set-${domainSet.id}`}>
                        Expand to Contacts
                      </Button>
                      <Button size="sm" data-testid={`button-use-domain-set-${domainSet.id}`}>
                        Use in Campaign
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Upload}
              title="No domain sets uploaded"
              description="Upload a CSV or TXT file of company domains to match accounts and expand to contacts."
              actionLabel="Upload Domain Set"
              onAction={() => {}}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
