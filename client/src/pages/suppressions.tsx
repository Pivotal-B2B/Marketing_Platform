import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, ShieldAlert, Mail, Phone, Upload } from "lucide-react";
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
import { EmptyState } from "@/components/shared/empty-state";

export default function SuppressionsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const emailSuppressions = [
    { id: "1", email: "unsubscribe@example.com", reason: "Unsubscribe request", source: "Email link", date: "2024-01-10" },
    { id: "2", email: "bounce@company.com", reason: "Hard bounce", source: "ESP", date: "2024-01-09" },
    { id: "3", email: "complaint@domain.com", reason: "Spam complaint", source: "ESP", date: "2024-01-08" },
  ];

  const phoneSuppressions = [
    { id: "1", phone: "+1 555-0100", reason: "DNC request", source: "Agent", date: "2024-01-11" },
    { id: "2", phone: "+1 555-0200", reason: "Do not call", source: "Automated", date: "2024-01-10" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Suppressions</h1>
          <p className="text-muted-foreground mt-1">
            Manage DNC lists and email unsubscribes for compliance
          </p>
        </div>
      </div>

      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="email" data-testid="tab-email-suppressions">
            <Mail className="mr-2 h-4 w-4" />
            Email Unsubscribes
          </TabsTrigger>
          <TabsTrigger value="phone" data-testid="tab-phone-suppressions">
            <Phone className="mr-2 h-4 w-4" />
            DNC (Phone)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search email suppressions..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-email-suppressions"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" data-testid="button-import-email-suppressions">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button data-testid="button-add-email-suppression">
                <Plus className="mr-2 h-4 w-4" />
                Add Email
              </Button>
            </div>
          </div>

          {emailSuppressions.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailSuppressions.map((suppression) => (
                    <TableRow key={suppression.id} data-testid={`row-email-suppression-${suppression.id}`}>
                      <TableCell className="font-mono">{suppression.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{suppression.reason}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{suppression.source}</TableCell>
                      <TableCell className="text-muted-foreground">{suppression.date}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" data-testid={`button-remove-email-${suppression.id}`}>
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={Mail}
              title="No email suppressions"
              description="Email addresses added to the suppression list will be automatically excluded from campaigns."
              actionLabel="Add Email"
              onAction={() => {}}
            />
          )}
        </TabsContent>

        <TabsContent value="phone" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search DNC list..."
                className="pl-10"
                data-testid="input-search-phone-suppressions"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" data-testid="button-import-phone-suppressions">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button data-testid="button-add-phone-suppression">
                <Plus className="mr-2 h-4 w-4" />
                Add Phone
              </Button>
            </div>
          </div>

          {phoneSuppressions.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {phoneSuppressions.map((suppression) => (
                    <TableRow key={suppression.id} data-testid={`row-phone-suppression-${suppression.id}`}>
                      <TableCell className="font-mono">{suppression.phone}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{suppression.reason}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{suppression.source}</TableCell>
                      <TableCell className="text-muted-foreground">{suppression.date}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" data-testid={`button-remove-phone-${suppression.id}`}>
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={Phone}
              title="No DNC entries"
              description="Phone numbers added to the DNC list will be automatically excluded from telemarketing campaigns."
              actionLabel="Add Phone"
              onAction={() => {}}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
