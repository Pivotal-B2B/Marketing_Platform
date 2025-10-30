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

  // State for confirmation dialogs
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);


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

  // Reset state whenever dialog opens
  useEffect(() => {
    if (showReplaceDialog) {
      setFilterGroup(undefined);
      setMaxQueueSize(300);
    }
  }, [showReplaceDialog]);

  // Set Queue (Replace) mutation
  const replaceQueueMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        'POST',
        `/api/campaigns/${campaignId}/queues/set`,
        {
          agent_id: effectiveAgentId,
          filters: filterGroup || undefined,
          per_account_cap: null,
          max_queue_size: maxQueueSize || null,
          keep_in_progress: true,
          allow_sharing: true,
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
          <AlertDialogContent className="max-w-5xl w-[95vw] max-h-[90vh] flex flex-col p-0">
            <AlertDialogHeader className="px-6 pt-6 pb-4 border-b">
              <AlertDialogTitle className="text-lg font-semibold">Set Queue Filters</AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground">
                Configure filters to queue specific contacts for calling. Use AND/OR logic to combine multiple criteria.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Filter Builder (takes 2/3 width on large screens) */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Filter Criteria</h3>
                    {filterGroup?.conditions && filterGroup.conditions.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {filterGroup.conditions.length} {filterGroup.conditions.length === 1 ? 'filter' : 'filters'}
                      </Badge>
                    )}
                  </div>
                  
                  <SidebarFilters
                    entityType="contact"
                    onApplyFilter={(filter) => setFilterGroup(filter || undefined)}
                    initialFilter={filterGroup}
                    embedded={true}
                  />
                </div>

                {/* Right Column: Settings & Summary */}
                <div className="space-y-6">
                  {/* Queue Settings */}
                  <div className="space-y-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Queue Settings</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="maxQueueSize" className="text-sm font-medium">Max Queue Size</Label>
                      <Input
                        id="maxQueueSize"
                        type="number"
                        min="1"
                        placeholder="300"
                        value={maxQueueSize}
                        onChange={(e) => setMaxQueueSize(e.target.value ? parseInt(e.target.value) : 300)}
                        data-testid="input-max-queue-size"
                        className="h-9"
                      />
                      <p className="text-xs text-muted-foreground">Maximum contacts to queue (leave empty for no limit)</p>
                    </div>
                  </div>

                  {/* Info Panel */}
                  <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="space-y-2 text-xs text-blue-900 dark:text-blue-100">
                        <p className="font-medium">How it works:</p>
                        <ul className="space-y-1 list-disc list-inside text-blue-800 dark:text-blue-200">
                          <li>Add filters to narrow down contacts</li>
                          <li>Apply filters to see result count</li>
                          <li>Click "Set Queue" to replace your current queue</li>
                          <li>Only contacts with valid phone numbers will be queued</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <AlertDialogFooter className="px-6 py-4 border-t bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between w-full">
                <div className="text-sm text-muted-foreground">
                  {filterGroup?.conditions && filterGroup.conditions.length > 0 ? (
                    <span>Filters configured and ready to apply</span>
                  ) : (
                    <span>No filters configured - will queue all campaign contacts</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <AlertDialogCancel disabled={isPending} data-testid="button-cancel-replace" className="h-9">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => replaceQueueMutation.mutate()}
                    disabled={isPending}
                    data-testid="button-confirm-replace"
                    className="h-9"
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Set Queue
                  </AlertDialogAction>
                </div>
              </div>
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
