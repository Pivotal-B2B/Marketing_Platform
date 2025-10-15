import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, Filter, List, Globe, Eye, Save, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FilterBuilder } from "@/components/filter-builder";
import type { FilterGroup } from "@shared/filter-types";

interface Step1Props {
  data: any;
  onNext: (data: any) => void;
  onBack: () => void;
  campaignType: "email" | "telemarketing";
}

export function Step1AudienceSelection({ data, onNext }: Step1Props) {
  const [audienceSource, setAudienceSource] = useState<"filters" | "segment" | "list" | "domain_set">("filters");
  const [selectedFilters, setSelectedFilters] = useState<any[]>(data.audience?.filters || []);
  const [audienceCount, setAudienceCount] = useState(0);
  const [filterGroup, setFilterGroup] = useState<FilterGroup | undefined>(data.audience?.filterGroup);

  const handleNext = () => {
    onNext({
      audience: {
        source: audienceSource,
        filters: selectedFilters,
        filterGroup: filterGroup,
        count: audienceCount,
      },
    });
  };

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
              {/* Advanced Filter Builder */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <FilterBuilder
                    entityType="contact"
                    onApplyFilter={setFilterGroup}
                    initialFilter={filterGroup}
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
                    {filterGroup && filterGroup.conditions.length > 0 ? '2,847' : '0'} contacts
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
              <CardTitle>Select Existing Segment</CardTitle>
              <CardDescription>Choose a pre-defined dynamic segment for this campaign</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Search Segments</Label>
                <Input placeholder="Search by segment name..." data-testid="input-search-segments" />
              </div>

              {/* Segment List Placeholder */}
              <div className="space-y-2">
                {["Enterprise IT Leads", "Marketing Directors", "Active Prospects"].map((seg) => (
                  <Card key={seg} className="hover-elevate cursor-pointer" data-testid={`segment-card-${seg}`}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{seg}</p>
                        <p className="text-sm text-muted-foreground">1,234 contacts</p>
                      </div>
                      <Badge>Dynamic</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Static List</CardTitle>
              <CardDescription>Choose a static list snapshot for this campaign</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Search Lists</Label>
                <Input placeholder="Search by list name..." data-testid="input-search-lists" />
              </div>

              {/* List Placeholder */}
              <div className="space-y-2">
                {["Q4 Outreach List", "Webinar Attendees", "Trade Show Leads"].map((list) => (
                  <Card key={list} className="hover-elevate cursor-pointer" data-testid={`list-card-${list}`}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{list}</p>
                        <p className="text-sm text-muted-foreground">892 contacts</p>
                      </div>
                      <Badge variant="outline">Static</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="domain_set" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Domain Set</CardTitle>
              <CardDescription>Target accounts from a domain set with matched contacts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Search Domain Sets</Label>
                <Input placeholder="Search by domain set name..." data-testid="input-search-domain-sets" />
              </div>

              {/* Domain Set Placeholder */}
              <div className="space-y-2">
                {["Enterprise Target Accounts", "Healthcare Prospects"].map((ds) => (
                  <Card key={ds} className="hover-elevate cursor-pointer" data-testid={`domain-set-card-${ds}`}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{ds}</p>
                        <p className="text-sm text-muted-foreground">156 accounts, 543 contacts</p>
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

      {/* Next Button */}
      <div className="flex justify-end">
        <Button onClick={handleNext} size="lg" data-testid="button-next-step">
          Continue to Content Setup
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
