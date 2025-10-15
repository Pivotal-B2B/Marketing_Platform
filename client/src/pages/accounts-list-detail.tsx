import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface DomainSet {
  id: string;
  name: string;
  description?: string;
  totalUploaded: number;
  matchedAccounts: number;
  matchedContacts: number;
  status: 'processing' | 'completed' | 'error';
}

interface DomainSetItem {
  id: string;
  domain: string;
  normalizedDomain: string;
  accountId?: string;
  accountName?: string | null;
  matchType?: 'exact' | 'fuzzy' | 'none';
  matchConfidence?: string;
  matchedContactsCount: number;
}

interface Account {
  id: string;
  name: string;
  domain?: string;
  industryStandardized?: string;
  employeesSizeRange?: string;
  annualRevenue?: string;
}

interface Contact {
  id: string;
  fullName: string;
  email: string;
  directPhone?: string;
  jobTitle?: string;
  accountId?: string;
}

export default function AccountsListDetail() {
  const { id } = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();
  const queryParams = new URLSearchParams(location.split('?')[1] || '');
  const viewFilter = queryParams.get('view');

  const { data: accountsList, isLoading: listLoading } = useQuery<DomainSet>({
    queryKey: [`/api/domain-sets/${id}`],
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery<DomainSetItem[]>({
    queryKey: [`/api/domain-sets/${id}/items`],
    enabled: !!id,
  });

  const { data: accounts = [], isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: [`/api/domain-sets/${id}/accounts`],
    enabled: !!id && viewFilter !== 'contacts',
  });

  const { data: contacts = [], isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: [`/api/domain-sets/${id}/contacts`],
    enabled: !!id && viewFilter !== 'accounts',
  });

  const getMatchTypeBadge = (matchType?: string) => {
    if (!matchType) return <Badge variant="outline">pending</Badge>;
    const variants = {
      exact: 'default',
      fuzzy: 'secondary',
      none: 'outline',
    } as const;
    return <Badge variant={variants[matchType as keyof typeof variants]}>{matchType}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      processing: 'secondary',
      completed: 'default',
      error: 'destructive',
    } as const;
    return variants[status as keyof typeof variants] || 'outline';
  };

  const handleCardClick = (accountId: string, matchType: string | undefined) => {
    if (viewFilter === 'contacts') {
      // If viewing contacts, go to contact detail
      setLocation(`/contacts/${accountId}`);
    } else {
      // Otherwise go to account detail
      setLocation(`/accounts/${accountId}`);
    }
  };

  const handleNumberClick = (filterType: 'accounts' | 'contacts') => {
    setLocation(`/domain-sets/${id}?view=${filterType}`);
  };

  if (listLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!accountsList) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Accounts list not found</p>
        <Button variant="outline" onClick={() => setLocation('/domain-sets')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Accounts Lists
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="border-b p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation('/domain-sets')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{accountsList.name}</h1>
              <p className="text-muted-foreground mt-1">
                {viewFilter === 'accounts' && "Showing matched accounts only"}
                {viewFilter === 'contacts' && "Showing matched contacts only"}
                {!viewFilter && (accountsList.description || "Domain matching results")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {viewFilter && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLocation(`/domain-sets/${id}`)}
              >
                Clear Filter
              </Button>
            )}
            <Badge variant={getStatusBadge(accountsList.status)}>{accountsList.status}</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Uploaded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accountsList.totalUploaded}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Matched Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 cursor-pointer" onClick={() => handleNumberClick('accounts')}>
              {accountsList.matchedAccounts}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Matched Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 cursor-pointer" onClick={() => handleNumberClick('contacts')}>
              {accountsList.matchedContacts}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unknown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{accountsList.matchedAccounts ? accountsList.totalUploaded - accountsList.matchedAccounts : accountsList.totalUploaded}</div>
          </CardContent>
        </Card>
      </div>

      {(viewFilter === 'accounts' || !viewFilter) && (
        <Card>
          <CardHeader>
            <CardTitle>Matched Accounts</CardTitle>
            <CardDescription>Accounts that were successfully matched from this list</CardDescription>
          </CardHeader>
          <CardContent>
            {accountsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : accounts.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Employees</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((account) => (
                      <TableRow 
                        key={account.id} 
                        className="hover-elevate cursor-pointer"
                        onClick={() => handleCardClick(account.id, 'exact')} // Assuming 'exact' match for accounts here
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            {account.name}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{account.domain || "-"}</TableCell>
                        <TableCell>
                          {account.industryStandardized ? (
                            <Badge variant="outline">{account.industryStandardized}</Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell>{account.employeesSizeRange || "-"}</TableCell>
                        <TableCell>{account.annualRevenue || "-"}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCardClick(account.id, 'exact');
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-8 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No matched accounts found</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(viewFilter === 'contacts' || !viewFilter) && (
        <Card>
          <CardHeader>
            <CardTitle>Matched Contacts</CardTitle>
            <CardDescription>Contacts that were successfully matched from this list</CardDescription>
          </CardHeader>
          <CardContent>
            {contactsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : contacts.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Job Title</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => (
                      <TableRow 
                        key={contact.id} 
                        className="hover-elevate cursor-pointer"
                        onClick={() => handleCardClick(contact.id, 'exact')}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                            {contact.fullName}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{contact.email || "-"}</TableCell>
                        <TableCell>{contact.directPhone || "-"}</TableCell>
                        <TableCell>{contact.jobTitle || "-"}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCardClick(contact.id, 'exact');
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-8 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No matched contacts found</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}


      {items.length > 0 && (!viewFilter || viewFilter === 'accounts') && ( // Only show if not filtering for contacts only
        <Card>
          <CardHeader>
            <CardTitle>Match Details</CardTitle>
            <CardDescription>Detailed matching results for each entry</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Normalized</TableHead>
                    <TableHead>Match Type</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Contacts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">
                        {item.domain || '-'}
                        {item.accountName && (
                          <span className="ml-2 font-sans text-sm text-muted-foreground">
                            {item.accountName}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {item.normalizedDomain || '-'}
                      </TableCell>
                      <TableCell>{getMatchTypeBadge(item.matchType)}</TableCell>
                      <TableCell>
                        {item.matchConfidence ? `${(parseFloat(item.matchConfidence) * 100).toFixed(0)}%` : '-'}
                      </TableCell>
                      <TableCell>{item.matchedContactsCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}