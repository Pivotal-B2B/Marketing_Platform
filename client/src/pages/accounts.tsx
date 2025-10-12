import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Download, Building2 } from "lucide-react";
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

export default function AccountsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data
  const accounts = [
    { id: "1", name: "Acme Corporation", domain: "acme.com", industry: "Technology", employees: "1,000-5,000", revenue: "$50M", contacts: 24 },
    { id: "2", name: "TechStart Inc", domain: "techstart.io", industry: "SaaS", employees: "50-200", revenue: "$5M", contacts: 8 },
    { id: "3", name: "Global Enterprises", domain: "globalent.com", industry: "Manufacturing", employees: "10,000+", revenue: "$500M", contacts: 156 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your B2B account database
          </p>
        </div>
        <Button data-testid="button-create-account">
          <Plus className="mr-2 h-4 w-4" />
          Create Account
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, domain, industry..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-accounts"
          />
        </div>
        <Button variant="outline" data-testid="button-filter">
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
        <Button variant="outline" data-testid="button-export">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {accounts.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Name</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Contacts</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id} className="hover-elevate" data-testid={`row-account-${account.id}`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      {account.name}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{account.domain}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{account.industry}</Badge>
                  </TableCell>
                  <TableCell>{account.employees}</TableCell>
                  <TableCell>{account.revenue}</TableCell>
                  <TableCell>{account.contacts}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" data-testid={`button-view-account-${account.id}`}>
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
          icon={Building2}
          title="No accounts found"
          description="Get started by creating your first account or importing from a CSV file."
          actionLabel="Create Account"
          onAction={() => {}}
        />
      )}
    </div>
  );
}
