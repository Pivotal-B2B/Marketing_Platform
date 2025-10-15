import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, Filter, List, Globe, Eye, Save, ChevronRight, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FilterBuilder } from "@/components/filter-builder";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import type { FilterGroup } from "@shared/filter-types";
import type { Segment, List as ListType, DomainSet } from "@shared/schema";

interface Step1Props {
  data: any;
  onNext: (data: any) => void;
  onBack: () => void;
  campaignType: "email" | "telemarketing";
}

interface AudienceSelection {
  source: "filters" | "segment" | "list" | "domain_set";
  selectedSegments?: string[];
  selectedLists?: string[];
  selectedDomainSets?: string[];
  excludedSegments?: string[];
  excludedLists?: string[];
  filterGroup?: FilterGroup;
  estimatedCount?: number;
}

export function Step1AudienceSelection({ data, onNext, campaignType }: Step1Props) {
  const [audienceSource, setAudienceSource] = useState<"filters" | "segment" | "list" | "domain_set">(
    data.audience?.source || "filters"
  );

  const [selectedSegments, setSelectedSegments] = useState<string[]>(data.audience?.selectedSegments || []);
  const [selectedLists, setSelectedLists] = useState<string[]>(data.audience?.selectedLists || []);
  const [selectedDomainSets, setSelectedDomainSets] = useState<string[]>(data.audience?.selectedDomainSets || []);
  const [excludedSegments, setExcludedSegments] = useState<string[]>(data.audience?.excludedSegments || []);
  const [excludedLists, setExcludedLists] = useState<string[]>(data.audience?.excludedLists || []);
  const [filterGroup, setFilterGroup] = useState<FilterGroup | undefined>(data.audience?.filterGroup);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch segments
  const { data: segments = [] } = useQuery<Segment[]>({
    queryKey: ['/api/segments'],
  });

  // Fetch lists
  const { data: lists = [] } = useQuery<ListType[]>({
    queryKey: ['/api/lists'],
  });

  // Fetch domain sets
  const { data: domainSets = [] } = useQuery<DomainSet[]>({
    queryKey: ['/api/domain-sets'],
  });

  const handleNext = () => {
    const audienceData: AudienceSelection = {
      source: audienceSource,
      selectedSegments,
      selectedLists,
      selectedDomainSets,
      excludedSegments,
      excludedLists,
      filterGroup,
      estimatedCount: calculateEstimatedCount(),
    };

    onNext({
      audience: audienceData,
    });
  };

  const calculateEstimatedCount = () => {
    // Placeholder logic - in production, this would call an API endpoint
    if (audienceSource === "filters" && filterGroup?.conditions.length) {
      return 2847;
    }
    if (audienceSource === "segment" && selectedSegments.length) {
      const totalCount = selectedSegments.reduce((sum, id) => {
        const seg = segments.find(s => s.id === id);
        return sum + (seg?.recordCountCache || 0);
      }, 0);
      return totalCount;
    }
    if (audienceSource === "list" && selectedLists.length) {
      const totalCount = selectedLists.reduce((sum, id) => {
        const list = lists.find(l => l.id === id);
        return sum + (list?.recordIds?.length || 0);
      }, 0);
      return totalCount;
    }
    if (audienceSource === "domain_set" && selectedDomainSets.length) {
      return 543; // Placeholder
    }
    return 0;
  };

  const toggleSegment = (id: string) => {
    setSelectedSegments(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleList = (id: string) => {
    setSelectedLists(prev => 
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    );
  };

  const toggleDomainSet = (id: string) => {
    setSelectedDomainSets(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, d]
    );
  };

  const toggleExcludedSegment = (id: string) => {
    setExcludedSegments(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleExcludedList = (id: string) => {
    setExcludedLists(prev => 
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, l]
    );
  };

  const filteredSegments = segments.filter(seg =>
    searchQuery === "" ||
    seg.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLists = lists.filter(list =>
    searchQuery === "" ||
    list.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDomainSets = domainSets.filter(ds =>
    searchQuery === "" ||
    ds.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Tabs value={audienceSource} onValueChange={(v) => setAudienceSource(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="filters" data-testid="tab-advanced-filters">
            <Filter className="w-4 h-4 mr-2" />
            Advanced Filters
          </TabsTrigger>
          <TabsTrigger value="segment" data-testid="tab-segment">
            <Users className="w-4 h-4 mr-2" />
            Segment
          </TabsTrigger>
          <TabsTrigger value="list" data-testid="tab-list">
            <List className="w-4 h-4 mr-2" />
            Static List
          </TabsTrigger>
          <TabsTrigger value="domain_set" data-testid="tab-domain-set">
            <Globe className="w-4 h-4 mr-2" />
            Domain Set
          </TabsTrigger>
        </TabsList>

        <TabsContent value="filters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Audience Filters</CardTitle>
              <CardDescription>
                Build custom audience using multi-criteria filters across Contact, Account, and Campaign data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <FilterBuilder
                    entityType="contact"
                    onApplyFilter={setFilterGroup}
                    initialFilter={filterGroup}
                    includeRelatedEntities={true}
                  />
                </div>
              </div>

              {filterGroup && filterGroup.conditions.length > 0 && (
                <div className="border rounded-lg p-4 bg-muted/50">
                  <p className="text-sm font-medium mb-2">Active Filters:</p>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Match <Badge variant="outline">{filterGroup.logic}</Badge> of {filterGroup.conditions.length} condition{filterGroup.conditions.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Estimated Audience Size</p>
                  <p className="text-2xl font-bold text-primary">
                    {filterGroup && filterGroup.conditions.length > 0 ? calculateEstimatedCount().toLocaleString() : '0'} contacts
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    data-testid="button-preview-audience"
                    disabled={!filterGroup || filterGroup.conditions.length === 0}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview Sample
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    data-testid="button-save-segment"
                    disabled={!filterGroup || filterGroup.conditions.length === 0}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save as Segment
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Segments</CardTitle>
              <CardDescription>Choose one or more dynamic segments for this campaign</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Search Segments</Label>
                <Input 
                  placeholder="Search by segment name..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-segments" 
                />
              </div>

              {selectedSegments.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Selected Segments ({selectedSegments.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedSegments.map(id => {
                      const seg = segments.find(s => s.id === id);
                      return seg ? (
                        <Badge key={id} variant="default" className="gap-1">
                          {seg.name}
                          <X className="w-3 h-3 cursor-pointer" onClick={() => toggleSegment(id)} />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {filteredSegments.map((seg) => (
                  <Card 
                    key={seg.id} 
                    className={`hover-elevate cursor-pointer transition-all ${selectedSegments.includes(seg.id) ? 'border-primary' : ''}`}
                    data-testid={`segment-card-${seg.id}`}
                    onClick={() => toggleSegment(seg.id)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={selectedSegments.includes(seg.id)}
                          onCheckedChange={() => toggleSegment(seg.id)}
                        />
                        <div>
                          <p className="font-medium">{seg.name}</p>
                          <p className="text-sm text-muted-foreground">{seg.recordCountCache?.toLocaleString() || 0} contacts</p>
                        </div>
                      </div>
                      <Badge>Dynamic</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedSegments.length > 0 && (
                <>
                  <div className="border-t pt-4 mt-4">
                    <Label className="text-sm font-medium mb-2 block">Additional Filters (Optional)</Label>
                    <p className="text-sm text-muted-foreground mb-3">Apply additional filters to refine the selected segments</p>
                    <FilterBuilder
                      entityType="contact"
                      onApplyFilter={setFilterGroup}
                      initialFilter={filterGroup}
                      includeRelatedEntities={true}
                    />
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <Label className="text-sm font-medium mb-2 block">Exclude Segments (Optional)</Label>
                    <p className="text-sm text-muted-foreground mb-3">Remove contacts from these segments</p>
                    {excludedSegments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {excludedSegments.map(id => {
                          const seg = segments.find(s => s.id === id);
                          return seg ? (
                            <Badge key={id} variant="destructive" className="gap-1">
                              {seg.name}
                              <X className="w-3 h-3 cursor-pointer" onClick={() => toggleExcludedSegment(id)} />
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                    <div className="space-y-2">
                      {segments.filter(s => !selectedSegments.includes(s.id)).slice(0, 3).map((seg) => (
                        <Card 
                          key={seg.id} 
                          className={`cursor-pointer transition-all ${excludedSegments.includes(seg.id) ? 'border-destructive' : ''}`}
                          onClick={() => toggleExcludedSegment(seg.id)}
                        >
                          <CardContent className="p-3 flex items-center gap-3">
                            <Checkbox 
                              checked={excludedSegments.includes(seg.id)}
                              onCheckedChange={() => toggleExcludedSegment(seg.id)}
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{seg.name}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Static Lists</CardTitle>
              <CardDescription>Choose one or more static list snapshots for this campaign</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Search Lists</Label>
                <Input 
                  placeholder="Search by list name..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-lists" 
                />
              </div>

              {selectedLists.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Selected Lists ({selectedLists.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedLists.map(id => {
                      const list = lists.find(l => l.id === id);
                      return list ? (
                        <Badge key={id} variant="default" className="gap-1">
                          {list.name}
                          <X className="w-3 h-3 cursor-pointer" onClick={() => toggleList(id)} />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {filteredLists.map((list) => (
                  <Card 
                    key={list.id} 
                    className={`hover-elevate cursor-pointer transition-all ${selectedLists.includes(list.id) ? 'border-primary' : ''}`}
                    data-testid={`list-card-${list.id}`}
                    onClick={() => toggleList(list.id)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={selectedLists.includes(list.id)}
                          onCheckedChange={() => toggleList(list.id)}
                        />
                        <div>
                          <p className="font-medium">{list.name}</p>
                          <p className="text-sm text-muted-foreground">{list.recordIds?.length?.toLocaleString() || 0} contacts</p>
                        </div>
                      </div>
                      <Badge variant="outline">Static</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedLists.length > 0 && (
                <>
                  <div className="border-t pt-4 mt-4">
                    <Label className="text-sm font-medium mb-2 block">Additional Filters (Optional)</Label>
                    <p className="text-sm text-muted-foreground mb-3">Apply additional filters to refine the selected lists</p>
                    <FilterBuilder
                      entityType="contact"
                      onApplyFilter={setFilterGroup}
                      initialFilter={filterGroup}
                      includeRelatedEntities={true}
                    />
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <Label className="text-sm font-medium mb-2 block">Exclude Lists (Optional)</Label>
                    <p className="text-sm text-muted-foreground mb-3">Remove contacts from these lists</p>
                    {excludedLists.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {excludedLists.map(id => {
                          const list = lists.find(l => l.id === id);
                          return list ? (
                            <Badge key={id} variant="destructive" className="gap-1">
                              {list.name}
                              <X className="w-3 h-3 cursor-pointer" onClick={() => toggleExcludedList(id)} />
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                    <div className="space-y-2">
                      {lists.filter(l => !selectedLists.includes(l.id)).slice(0, 3).map((list) => (
                        <Card 
                          key={list.id} 
                          className={`cursor-pointer transition-all ${excludedLists.includes(list.id) ? 'border-destructive' : ''}`}
                          onClick={() => toggleExcludedList(list.id)}
                        >
                          <CardContent className="p-3 flex items-center gap-3">
                            <Checkbox 
                              checked={excludedLists.includes(list.id)}
                              onCheckedChange={() => toggleExcludedList(list.id)}
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{list.name}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="domain_set" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Domain Sets</CardTitle>
              <CardDescription>Target accounts from domain sets with matched contacts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Search Domain Sets</Label>
                <Input 
                  placeholder="Search by domain set name..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-domain-sets" 
                />
              </div>

              {selectedDomainSets.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Selected Domain Sets ({selectedDomainSets.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedDomainSets.map(id => {
                      const ds = domainSets.find(d => d.id === id);
                      return ds ? (
                        <Badge key={id} variant="default" className="gap-1">
                          {ds.name}
                          <X className="w-3 h-3 cursor-pointer" onClick={() => toggleDomainSet(id)} />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {filteredDomainSets.map((ds) => (
                  <Card 
                    key={ds.id} 
                    className={`hover-elevate cursor-pointer transition-all ${selectedDomainSets.includes(ds.id) ? 'border-primary' : ''}`}
                    data-testid={`domain-set-card-${ds.id}`}
                    onClick={() => toggleDomainSet(ds.id)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={selectedDomainSets.includes(ds.id)}
                          onCheckedChange={() => toggleDomainSet(ds.id)}
                        />
                        <div>
                          <p className="font-medium">{ds.name}</p>
                          <p className="text-sm text-muted-foreground">{ds.domains?.length || 0} accounts</p>
                        </div>
                      </div>
                      <Badge>ABM</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Audience Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Audience Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{calculateEstimatedCount().toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Estimated Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-500">
                {audienceSource === "segment" ? selectedSegments.length : 
                 audienceSource === "list" ? selectedLists.length :
                 audienceSource === "domain_set" ? selectedDomainSets.length : 0}
              </div>
              <div className="text-sm text-muted-foreground">Sources Selected</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-500">
                {excludedSegments.length + excludedLists.length}
              </div>
              <div className="text-sm text-muted-foreground">Exclusions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleNext} 
          size="lg" 
          data-testid="button-next-step"
          disabled={
            (audienceSource === "segment" && selectedSegments.length === 0) ||
            (audienceSource === "list" && selectedLists.length === 0) ||
            (audienceSource === "domain_set" && selectedDomainSets.length === 0) ||
            (audienceSource === "filters" && (!filterGroup || filterGroup.conditions.length === 0))
          }
        >
          Continue to Content Setup
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}