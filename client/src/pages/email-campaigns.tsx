import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Mail, Play, BarChart3, Loader2, Shield } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  type Campaign, 
  type InsertCampaign,
  type Segment,
  type List,
  insertCampaignSchema 
} from "@shared/schema";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function EmailCampaignsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: campaigns, isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns'],
  });

  const { data: segments = [] } = useQuery<Segment[]>({
    queryKey: ['/api/segments'],
  });

  const { data: lists = [] } = useQuery<List[]>({
    queryKey: ['/api/lists'],
  });

  const campaignFormSchema = insertCampaignSchema.extend({
    selectedSegments: z.array(z.string()).optional(),
    selectedLists: z.array(z.string()).optional(),
  });

  const createForm = useForm({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      type: "email" as const,
      name: "",
      status: "draft" as const,
      emailSubject: "",
      emailHtmlContent: "",
      brandId: "",
      selectedSegments: [] as string[],
      selectedLists: [] as string[],
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      // Build audienceRefs from selected segments and lists
      const { selectedSegments = [], selectedLists = [], ...campaignData } = data;
      const payload = {
        ...campaignData,
        audienceRefs: {
          segments: selectedSegments,
          lists: selectedLists,
        },
      };
      return await apiRequest('POST', '/api/campaigns', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'], refetchType: 'active' });
      setCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Success",
        description: "Campaign created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign",
        variant: "destructive",
      });
    },
  });

  const launchMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('POST', `/api/campaigns/${id}/launch`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'], refetchType: 'active' });
      toast({
        title: "Success",
        description: "Campaign launched successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to launch campaign",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      active: "default",
      draft: "secondary",
      completed: "outline",
      paused: "outline",
    };
    return <Badge variant={variants[status] || "outline"} data-testid={`badge-status-${status}`}>{status}</Badge>;
  };

  const filteredCampaigns = campaigns?.filter(campaign =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-email-campaigns">Email Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Create, manage, and track your email marketing campaigns
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-email-campaign">
          <Plus className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search campaigns..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-campaigns"
          />
        </div>
      </div>

      {campaignsLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : filteredCampaigns.length > 0 ? (
        <div className="grid gap-4">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} className="hover-elevate" data-testid={`card-campaign-${campaign.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle data-testid={`text-campaign-name-${campaign.id}`}>{campaign.name}</CardTitle>
                      {getStatusBadge(campaign.status)}
                    </div>
                    {campaign.emailSubject && (
                      <p className="text-sm text-muted-foreground" data-testid={`text-campaign-subject-${campaign.id}`}>
                        Subject: {campaign.emailSubject}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {campaign.status === "draft" && (
                      <Button 
                        size="sm" 
                        onClick={() => launchMutation.mutate(campaign.id)}
                        disabled={launchMutation.isPending}
                        data-testid={`button-launch-campaign-${campaign.id}`}
                      >
                        {launchMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="mr-2 h-4 w-4" />
                        )}
                        Launch
                      </Button>
                    )}
                    <Link href={`/campaigns/${campaign.id}/suppressions`}>
                      <Button variant="outline" size="sm" data-testid={`button-manage-suppressions-${campaign.id}`}>
                        <Shield className="mr-2 h-4 w-4" />
                        Suppressions
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" data-testid={`button-view-stats-${campaign.id}`}>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Stats
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Type: {campaign.type} | Created: {new Date(campaign.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Mail}
          title="No email campaigns yet"
          description="Create your first email campaign to start engaging your audience."
          actionLabel="Create Campaign"
          onAction={() => setCreateDialogOpen(true)}
        />
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]" data-testid="dialog-create-campaign">
          <DialogHeader>
            <DialogTitle>Create Email Campaign</DialogTitle>
            <DialogDescription>
              Set up a new email campaign to engage your audience
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Q1 Product Launch" 
                        {...field} 
                        data-testid="input-campaign-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="emailSubject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Subject</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Introducing our latest features" 
                        {...field} 
                        value={field.value || ""}
                        data-testid="input-email-subject"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="emailHtmlContent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Content</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter email HTML content..." 
                        {...field}
                        value={field.value || ""}
                        rows={4}
                        data-testid="input-email-content"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="selectedSegments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Segments (Optional)</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          const current = field.value || [];
                          if (!current.includes(value)) {
                            field.onChange([...current, value]);
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-segments">
                            <SelectValue placeholder="Add segments..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {segments.map((segment) => (
                            <SelectItem key={segment.id} value={segment.id}>
                              {segment.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {field.value && field.value.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {field.value.map((id: string) => {
                            const segment = segments.find(s => s.id === id);
                            return segment ? (
                              <Badge key={id} variant="secondary" className="text-xs">
                                {segment.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="selectedLists"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lists (Optional)</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          const current = field.value || [];
                          if (!current.includes(value)) {
                            field.onChange([...current, value]);
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-lists">
                            <SelectValue placeholder="Add lists..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {lists.map((list) => (
                            <SelectItem key={list.id} value={list.id}>
                              {list.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {field.value && field.value.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {field.value.map((id: string) => {
                            const list = lists.find(l => l.id === id);
                            return list ? (
                              <Badge key={id} variant="secondary" className="text-xs">
                                {list.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setCreateDialogOpen(false)}
                  data-testid="button-cancel-campaign"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                  data-testid="button-submit-campaign"
                >
                  {createMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Campaign
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
