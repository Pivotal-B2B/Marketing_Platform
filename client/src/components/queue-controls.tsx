import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Trash2, Replace, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Separator } from "@/components/ui/separator";
import { SidebarFilters } from "@/components/filters/sidebar-filters";
import type { FilterGroup } from "@shared/filter-types";

interface QueueControlsProps {
  campaignId: string;
  agentId?: string;
  onQueueUpdated?: () => void;
  compact?: boolean; // Compact mode for header
  renderDialogs?: boolean; // Only render dialogs in one instance to prevent duplicates
}

interface QueueStats {
  total: number;
  queued: number;
  locked: number;
  in_progress: number;
  released: number;
}

export function QueueControls({ campaignId, agentId, onQueueUpdated, compact = false, renderDialogs = true }: QueueControlsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Use user ID if agentId not provided
  const effectiveAgentId = agentId || user?.id || '';
  
  // Debug: Log component mount
  useEffect(() => {
    console.log('[QUEUE_CONTROLS_MOUNT]', { campaignId, compact, renderDialogs, effectiveAgentId });
    return () => console.log('[QUEUE_CONTROLS_UNMOUNT]', { campaignId, compact, renderDialogs });
  }, []);

  // State for confirmation dialogs
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  
  // Debug: Log dialog state changes
  useEffect(() => {
    if (showReplaceDialog) {
      console.log('[QUEUE_CONTROLS_DIALOG] Replace dialog opened', { campaignId, renderDialogs });
    }
  }, [showReplaceDialog]);


  // State for replace queue options
  const [filterGroup, setFilterGroup] = useState<FilterGroup | undefined>();
  const [maxQueueSize, setMaxQueueSize] = useState<number | ''>(300);

  // Check if user has admin or manager role
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'campaign_manager';

  // Fetch campaign details to get audienceRefs
  const { data: campaign } = useQuery<any>({
    queryKey: ['/api/campaigns', campaignId],
    enabled: !!campaignId,
  });

  // Fetch queue stats
  const { data: stats, isLoading: isLoadingStats } = useQuery<QueueStats>({
    queryKey: ['/api/campaigns', campaignId, 'queues/stats', effectiveAgentId],
    enabled: !!campaignId && !!effectiveAgentId,
  });

  // Reset filter to campaign's latest filter whenever dialog opens
  useEffect(() => {
    if (showReplaceDialog && campaign) {
      if (campaign.audienceRefs?.filterGroup) {
        console.log('[QUEUE_CONTROLS] Resetting filter from campaign:', campaign.audienceRefs.filterGroup);
        setFilterGroup(campaign.audienceRefs.filterGroup);
      } else {
        console.log('[QUEUE_CONTROLS] Campaign has no filter, clearing filter');
        setFilterGroup(undefined);
      }
      setMaxQueueSize(300);
    }
  }, [showReplaceDialog, campaign]);

  // Set Queue (Replace) mutation
  const replaceQueueMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        'POST',
        `/api/campaigns/${campaignId}/queues/set`,
        {
          agent_id: effectiveAgentId,
          filters: filterGroup && filterGroup.conditions && filterGroup.conditions.length > 0 ? filterGroup : undefined,
          per_account_cap: null,
          max_queue_size: maxQueueSize || null,
          keep_in_progress: true,
          allow_sharing: true, // Allow multiple agents to queue the same contacts
        }
      );
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Queue Replaced",
        description: `Released: ${data.released}, Assigned: ${data.assigned}, Skipped: ${data.skipped_due_to_collision}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', campaignId, 'queues/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent-queue', effectiveAgentId] });
      setShowReplaceDialog(false);
      onQueueUpdated?.();
      // Reset form
      setFilterGroup(undefined);
      setMaxQueueSize(300);
    },
    onError: (error: any) => {
      if (error.message === 'not_found') {
        toast({
          title: "Feature Not Available",
          description: "Queue management features are not enabled",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to replace queue",
          variant: "destructive",
        });
      }
    },
  });

  // Clear My Queue mutation
  const clearQueueMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        'POST',
        `/api/campaigns/${campaignId}/queues/clear`,
        {
          agent_id: effectiveAgentId,
        }
      );
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Queue Cleared",
        description: `Released ${data.released} items from your queue`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', campaignId, 'queues/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent-queue', effectiveAgentId] });
      setShowClearDialog(false);
      onQueueUpdated?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to clear queue",
        variant: "destructive",
      });
    },
  });

  // Clear All Queues mutation (admin only)
  const clearAllQueuesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        'POST',
        `/api/campaigns/${campaignId}/queues/clear_all`,
        {}
      );
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "All Queues Cleared",
        description: `Released ${data.released} items from all agent queues`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', campaignId, 'queues/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent-queue'] });
      setShowClearAllDialog(false);
      onQueueUpdated?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to clear all queues",
        variant: "destructive",
      });
    },
  });

  const isPending = replaceQueueMutation.isPending || clearQueueMutation.isPending || clearAllQueuesMutation.isPending;

  // Render dialogs once at the end (shared between compact and full card modes)
  const renderSharedDialogs = () => {
    if (!renderDialogs) return null;

    return (
      <>
        {/* Replace Queue Dialog */}
        <AlertDialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Set Queue (Replace)</AlertDialogTitle>
              <AlertDialogDescription>
                This will clear your current queue and assign new contacts based on the filters below.
                If no filters are applied, all available campaign contacts will be queued.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Filter Contacts (optional)</Label>
                <SidebarFilters
                  entityType="contact"
                  onApplyFilter={(filter) => setFilterGroup(filter)}
                  initialFilter={filterGroup}
                />
              </div>

              {filterGroup && filterGroup.conditions.length > 0 && (
                <div className="border rounded-lg p-3 bg-muted/50">
                  <div className="text-sm font-medium mb-2">Active Filters:</div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      Match <Badge variant="outline">{filterGroup.logic}</Badge> of {filterGroup.conditions.length} condition{filterGroup.conditions.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="maxQueueSize">Max Queue Size</Label>
                <Input
                  id="maxQueueSize"
                  type="number"
                  min="1"
                  placeholder="300 (recommended daily limit)"
                  value={maxQueueSize}
                  onChange={(e) => setMaxQueueSize(e.target.value ? parseInt(e.target.value) : 300)}
                  data-testid="input-max-queue-size"
                />
                <p className="text-xs text-muted-foreground">
                  Default: 300 contacts (typical daily call capacity per agent)
                </p>
              </div>

              <div className="bg-muted p-3 rounded-md flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Contacts already assigned to other agents will be skipped to prevent collisions.
                  Remaining matches can be assigned to other agents. Items in progress are preserved automatically.
                </p>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending} data-testid="button-cancel-replace">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => replaceQueueMutation.mutate()}
                disabled={isPending}
                data-testid="button-confirm-replace"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Replace Queue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Clear My Queue Dialog */}
        <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear My Queue</AlertDialogTitle>
              <AlertDialogDescription>
                This will release all queued and locked items from your queue. Items currently in progress will not be affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending} data-testid="button-cancel-clear">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => clearQueueMutation.mutate()}
                disabled={isPending}
                data-testid="button-confirm-clear"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Clear Queue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Clear All Queues Dialog (Admin Only) */}
        <AlertDialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear All Queues (Admin)</AlertDialogTitle>
              <AlertDialogDescription>
                This will release all queued and locked items from ALL agent queues in this campaign. 
                This action affects all agents and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending} data-testid="button-cancel-clear-all">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => clearAllQueuesMutation.mutate()}
                disabled={isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-clear-all"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Clear All Queues
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  };

  // Compact mode for header
  if (compact) {
    return (
      <>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowReplaceDialog(true)}
            disabled={isPending || !campaignId}
            size="sm"
            variant="outline"
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            data-testid="button-replace-queue"
            title="Set Queue - Replace your current queue with contacts matching filters"
          >
            <Replace className="h-3 w-3 mr-1.5" />
            Set Queue
          </Button>

          <Button
            onClick={() => setShowClearDialog(true)}
            disabled={isPending || !campaignId}
            size="sm"
            variant="outline"
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            data-testid="button-clear-queue"
          >
            <Trash2 className="h-3 w-3 mr-1.5" />
            Clear Queue
          </Button>

          {isAdminOrManager && (
            <Button
              onClick={() => setShowClearAllDialog(true)}
              disabled={isPending || !campaignId}
              size="sm"
              variant="outline"
              className="bg-destructive/80 text-white border-white/20 hover:bg-destructive"
              data-testid="button-clear-all-queues"
            >
              <Trash2 className="h-3 w-3 mr-1.5" />
              Clear All
            </Button>
          )}
          
          {isLoadingStats ? (
            <Loader2 className="h-4 w-4 animate-spin text-white ml-2" data-testid="loader-queue-stats" />
          ) : stats && (
            <Badge variant="secondary" className="bg-white/10 text-white border-white/20 ml-2" data-testid="badge-queued">
              {stats.queued} in queue
            </Badge>
          )}
        </div>
        
        {renderSharedDialogs()}
      </>
    );
  }

  // Full Card mode for sidebar/dedicated section
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Queue Management</CardTitle>
              <CardDescription>Manage your campaign queue</CardDescription>
            </div>
            {isLoadingStats ? (
              <Loader2 className="h-4 w-4 animate-spin" data-testid="loader-queue-stats" />
            ) : stats && (
              <div className="flex gap-2">
                <Badge variant="secondary" data-testid="badge-queued">Queued: {stats.queued}</Badge>
                <Badge variant="secondary" data-testid="badge-in-progress">In Progress: {stats.in_progress}</Badge>
                <Badge variant="outline" data-testid="badge-total">Total: {stats.total}</Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setShowReplaceDialog(true)}
              disabled={isPending || !campaignId}
              variant="default"
              data-testid="button-replace-queue"
              title="Clear your current queue and replace it with contacts matching filters. If no filters, queues all available campaign contacts."
            >
              <Replace className="h-4 w-4 mr-2" />
              Set Queue (Replace)
            </Button>

            <Button
              onClick={() => setShowClearDialog(true)}
              disabled={isPending || !campaignId}
              variant="secondary"
              data-testid="button-clear-queue"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear My Queue
            </Button>

            {isAdminOrManager && (
              <Button
                onClick={() => setShowClearAllDialog(true)}
                disabled={isPending || !campaignId}
                variant="destructive"
                data-testid="button-clear-all-queues"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Queues
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {renderSharedDialogs()}
    </>
  );
}
