import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Download, Upload, Users } from "lucide-react";
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
import { EmptyState } from "@/components/shared/empty-state";

export default function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data
  const contacts = [
    { id: "1", name: "John Smith", email: "john.smith@acme.com", title: "VP of Sales", account: "Acme Corporation", phone: "+1 555-0123", status: "valid" },
    { id: "2", name: "Sarah Johnson", email: "sarah.j@techstart.io", title: "Marketing Director", account: "TechStart Inc", phone: "+1 555-0456", status: "valid" },
    { id: "3", name: "Michael Chen", email: "m.chen@globalent.com", title: "CTO", account: "Global Enterprises", phone: "+1 555-0789", status: "risky" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your contact database with advanced filtering
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-import-contacts">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button data-testid="button-create-contact">
            <Plus className="mr-2 h-4 w-4" />
            Create Contact
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, email, title, company..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-contacts"
          />
        </div>
        <Button variant="outline" data-testid="button-filter">
          <Filter className="mr-2 h-4 w-4" />
          Advanced Filters
        </Button>
        <Button variant="outline" data-testid="button-export">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {contacts.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.id} className="hover-elevate" data-testid={`row-contact-${contact.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {contact.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{contact.name}</div>
                        <div className="text-sm text-muted-foreground font-mono">{contact.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{contact.title}</TableCell>
                  <TableCell>{contact.account}</TableCell>
                  <TableCell className="font-mono text-sm">{contact.phone}</TableCell>
                  <TableCell>
                    <Badge variant={contact.status === "valid" ? "default" : "secondary"}>
                      {contact.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" data-testid={`button-view-contact-${contact.id}`}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="No contacts found"
          description="Start building your contact database by adding contacts individually or importing them in bulk."
          actionLabel="Create Contact"
          onAction={() => {}}
        />
      )}
    </div>
  );
}
