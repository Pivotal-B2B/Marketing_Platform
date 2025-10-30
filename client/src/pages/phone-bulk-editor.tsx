import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Search, Edit, CheckSquare, Square, Phone, Building2, Users, AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PhoneRecord {
  id: string;
  type: 'contact' | 'account';
  name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  tel: string | null;
  company: string;
  accountId: string;
  title?: string;
  department?: string;
  city?: string;
  state?: string;
  country?: string;
  seniorityLevel?: string;
  jobFunction?: string;
  website?: string;
  industry?: string;
  companySize?: string;
  revenue?: string;
  hqCity?: string;
  hqState?: string;
  hqCountry?: string;
  hqAddress?: string;
}

export default function PhoneBulkEditor() {
  const { toast } = useToast();
  const [searchType, setSearchType] = useState<'contacts' | 'accounts' | 'both'>('both');
  const [phonePattern, setPhonePattern] = useState('');
  const [searchResults, setSearchResults] = useState<PhoneRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [findValue, setFindValue] = useState('');
  const [replaceValue, setReplaceValue] = useState('');
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [previewUpdates, setPreviewUpdates] = useState<Array<{ record: PhoneRecord; updates: any }>>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSearch = async () => {
    if (!phonePattern.trim()) {
      toast({
        title: "Search pattern required",
        description: "Please enter a phone pattern to search for",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    try {
      const response = await apiRequest({
        method: 'POST',
        url: '/api/phone-bulk/search',
        data: {
          searchType,
          phonePattern: phonePattern.trim(),
          additionalFilters: null
        }
      });

      setSearchResults(response.results || []);
      setSelectedIds(new Set());
      
      toast({
        title: "Search complete",
        description: `Found ${response.total} record(s) matching "${phonePattern}"`,
      });
    } catch (error: any) {
      toast({
        title: "Search failed",
        description: error.message || "Failed to search phone numbers",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === searchResults.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(searchResults.map(r => r.id)));
    }
  };

  const generatePreview = () => {
    if (!findValue.trim()) {
      toast({
        title: "Find value required",
        description: "Please enter a value to find",
        variant: "destructive"
      });
      return;
    }

    if (selectedIds.size === 0) {
      toast({
        title: "No records selected",
        description: "Please select at least one record to update",
        variant: "destructive"
      });
      return;
    }

    const selectedRecords = searchResults.filter(r => selectedIds.has(r.id));
    const preview: Array<{ record: PhoneRecord; updates: any }> = [];

    for (const record of selectedRecords) {
      const updates: any = {};
      
      if (record.type === 'contact') {
        // Check each phone field - use replaceAll for simple string replacement (handles special chars like +, (, ), etc.)
        if (record.phone && record.phone.includes(findValue)) {
          updates.phone = record.phone.replaceAll(findValue, replaceValue);
        }
        if (record.mobile && record.mobile.includes(findValue)) {
          updates.mobile = record.mobile.replaceAll(findValue, replaceValue);
        }
        if (record.tel && record.tel.includes(findValue)) {
          updates.tel = record.tel.replaceAll(findValue, replaceValue);
        }
      } else if (record.type === 'account') {
        if (record.phone && record.phone.includes(findValue)) {
          updates.phone = record.phone.replaceAll(findValue, replaceValue);
        }
      }

      if (Object.keys(updates).length > 0) {
        preview.push({ record, updates });
      }
    }

    if (preview.length === 0) {
      toast({
        title: "No matches found",
        description: `None of the selected records contain "${findValue}"`,
        variant: "destructive"
      });
      return;
    }

    setPreviewUpdates(preview);
    setShowUpdateDialog(true);
  };

  const applyUpdates = async () => {
    setIsUpdating(true);
    try {
      const updates = previewUpdates.map(({ record, updates }) => ({
        id: record.id,
        type: record.type,
        fieldUpdates: updates
      }));

      const response = await apiRequest({
        method: 'POST',
        url: '/api/phone-bulk/update',
        data: { updates }
      });

      toast({
        title: "Update successful",
        description: `Updated ${response.totalUpdated} record(s): ${response.contactsUpdated} contacts, ${response.accountsUpdated} accounts`,
      });

      setShowUpdateDialog(false);
      setPreviewUpdates([]);
      setSelectedIds(new Set());
      
      // Re-run search to show updated data
      if (phonePattern) {
        handleSearch();
      }
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update phone numbers",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const allSelected = searchResults.length > 0 && selectedIds.size === searchResults.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < searchResults.length;

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Phone Bulk Editor</h1>
          <p className="text-muted-foreground mt-1">
            Search and mass-update phone numbers across contacts and accounts
          </p>
        </div>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Phone Numbers
          </CardTitle>
          <CardDescription>
            Find contacts and accounts by phone pattern (e.g., "440", "+44", "1908")
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="searchType">Search In</Label>
              <Select value={searchType} onValueChange={(v: any) => setSearchType(v)}>
                <SelectTrigger id="searchType" data-testid="select-search-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Both Contacts & Accounts</SelectItem>
                  <SelectItem value="contacts">Contacts Only</SelectItem>
                  <SelectItem value="accounts">Accounts Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="phonePattern">Phone Pattern</Label>
              <div className="flex gap-2">
                <Input
                  id="phonePattern"
                  data-testid="input-phone-pattern"
                  placeholder="e.g., 440, +44, 1908802874"
                  value={phonePattern}
                  onChange={(e) => setPhonePattern(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button 
                  onClick={handleSearch} 
                  disabled={isSearching}
                  data-testid="button-search"
                >
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {searchResults.length > 0 && (
        <>
          {/* Bulk Update Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Bulk Update
              </CardTitle>
              <CardDescription>
                Find and replace phone patterns in selected records
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Selected {selectedIds.size} of {searchResults.length} record(s)
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="findValue">Find</Label>
                  <Input
                    id="findValue"
                    data-testid="input-find-value"
                    placeholder="e.g., 440"
                    value={findValue}
                    onChange={(e) => setFindValue(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="replaceValue">Replace With</Label>
                  <Input
                    id="replaceValue"
                    data-testid="input-replace-value"
                    placeholder="e.g., +44"
                    value={replaceValue}
                    onChange={(e) => setReplaceValue(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="opacity-0">Action</Label>
                  <Button 
                    onClick={generatePreview} 
                    disabled={selectedIds.size === 0}
                    className="w-full"
                    data-testid="button-preview-updates"
                  >
                    Preview Updates
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Search Results ({searchResults.length})
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={toggleSelectAll}
                  data-testid="button-toggle-select-all"
                >
                  {allSelected ? (
                    <>
                      <Square className="h-4 w-4 mr-2" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Select All
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={allSelected}
                            data-indeterminate={someSelected}
                            onCheckedChange={toggleSelectAll}
                            data-testid="checkbox-select-all"
                          />
                        </TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>Tel</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Country</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchResults.map((record) => (
                        <TableRow 
                          key={record.id}
                          className={selectedIds.has(record.id) ? "bg-muted/50" : ""}
                          data-testid={`row-phone-record-${record.id}`}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(record.id)}
                              onCheckedChange={() => toggleSelection(record.id)}
                              data-testid={`checkbox-select-${record.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant={record.type === 'contact' ? 'default' : 'secondary'}>
                              {record.type === 'contact' ? (
                                <Users className="h-3 w-3 mr-1" />
                              ) : (
                                <Building2 className="h-3 w-3 mr-1" />
                              )}
                              {record.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{record.name}</TableCell>
                          <TableCell>{record.company}</TableCell>
                          <TableCell className="font-mono text-sm">{record.phone || '-'}</TableCell>
                          <TableCell className="font-mono text-sm">{record.mobile || '-'}</TableCell>
                          <TableCell className="font-mono text-sm">{record.tel || '-'}</TableCell>
                          <TableCell className="text-sm">{record.email || '-'}</TableCell>
                          <TableCell className="text-sm">{record.title || '-'}</TableCell>
                          <TableCell className="text-sm">{record.city || record.hqCity || '-'}</TableCell>
                          <TableCell className="text-sm">{record.state || record.hqState || '-'}</TableCell>
                          <TableCell className="text-sm">{record.country || record.hqCountry || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* No Results Message */}
      {searchResults.length === 0 && phonePattern && !isSearching && (
        <Card>
          <CardContent className="py-12 text-center">
            <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
            <p className="text-muted-foreground">
              No records found matching "{phonePattern}". Try a different search pattern.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Update Preview Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Bulk Update</DialogTitle>
            <DialogDescription>
              Review the changes before applying. {previewUpdates.length} record(s) will be updated.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {previewUpdates.map(({ record, updates }, index) => (
              <div key={record.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={record.type === 'contact' ? 'default' : 'secondary'}>
                      {record.type}
                    </Badge>
                    <span className="font-semibold">{record.name}</span>
                    <span className="text-muted-foreground text-sm">({record.company})</span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1 text-sm">
                  {Object.entries(updates).map(([field, newValue]) => {
                    const oldValue = record[field as keyof PhoneRecord];
                    return (
                      <div key={field} className="flex items-center gap-2">
                        <span className="font-medium capitalize min-w-[60px]">{field}:</span>
                        <span className="line-through text-muted-foreground font-mono">{oldValue}</span>
                        <span>→</span>
                        <span className="text-green-600 dark:text-green-400 font-mono">{newValue as string}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowUpdateDialog(false)}
              disabled={isUpdating}
              data-testid="button-cancel-update"
            >
              Cancel
            </Button>
            <Button 
              onClick={applyUpdates} 
              disabled={isUpdating}
              data-testid="button-apply-updates"
            >
              {isUpdating ? "Applying..." : `Apply Updates (${previewUpdates.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
