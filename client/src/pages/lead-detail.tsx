import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ArrowLeft, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Briefcase,
  Download, 
  Play,
  Pause,
  CheckCircle, 
  XCircle,
  Sparkles,
  FileText,
  Users,
  TrendingUp
} from "lucide-react";
import { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function LeadDetailPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const { data: lead, isLoading } = useQuery({
    queryKey: ['/api/leads', id],
    enabled: !!id,
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      return await apiRequest('POST', `/api/leads/${id}/approve`, { approvedById: user.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads', id] });
      toast({
        title: "Success",
        description: "Lead approved successfully",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      return await apiRequest('POST', `/api/leads/${id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads', id] });
      setRejectDialogOpen(false);
      setRejectReason("");
      toast({
        title: "Success",
        description: "Lead rejected",
      });
    },
  });

  const transcribeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/leads/${id}/transcribe`, {});
    },
    onSuccess: () => {
      toast({
        title: "Transcription Started",
        description: "Call transcription is being processed. This may take a few minutes.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/leads', id] });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/leads/${id}/analyze`, {});
    },
    onSuccess: () => {
      toast({
        title: "AI Analysis Complete",
        description: "Lead qualification analysis has been completed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/leads', id] });
    },
  });

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDownload = async () => {
    if (lead?.recordingUrl) {
      window.open(lead.recordingUrl, '_blank');
      toast({
        title: "Download Started",
        description: "Call recording download has started.",
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
      new: { variant: "secondary", label: "New" },
      under_review: { variant: "default", label: "Under Review" },
      approved: { variant: "outline", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
      published: { variant: "outline", label: "Published" },
    };
    const { variant, label } = config[status] || config.new;
    return <Badge variant={variant} data-testid={`badge-status-${status}`}>{label}</Badge>;
  };

  const getQualificationBadge = (status: string) => {
    if (status === 'qualified') return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700">Qualified</Badge>;
    if (status === 'not_qualified') return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700">Not Qualified</Badge>;
    return <Badge variant="secondary">Needs Review</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <XCircle className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold">Lead Not Found</h2>
        <p className="text-muted-foreground mt-2">The lead you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/leads')} className="mt-4" data-testid="button-back-to-leads">
          Back to Leads
        </Button>
      </div>
    );
  }

  // Check if user has admin or qa_analyst role (support multi-role system)
  const userRoles = (user as any)?.roles || [user?.role || 'agent'];
  const canApprove = userRoles.includes('admin') || userRoles.includes('qa_analyst');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/leads')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-lead-name">
              {lead.contact?.fullName || lead.contactName || 'Unnamed Lead'}
            </h1>
            <p className="text-muted-foreground">
              Lead #{lead.id.slice(0, 8)} • {getStatusBadge(lead.qaStatus)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canApprove && lead.qaStatus !== 'approved' && lead.qaStatus !== 'published' && (
            <>
              <Button
                variant="destructive"
                onClick={() => setRejectDialogOpen(true)}
                data-testid="button-reject"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                data-testid="button-approve"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Lead
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Information */}
        <Card data-testid="card-contact">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback>
                  {(lead.contact?.firstName?.[0] || '') + (lead.contact?.lastName?.[0] || '')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold" data-testid="text-contact-name">
                  {lead.contact?.fullName || lead.contactName || 'N/A'}
                </p>
                <p className="text-sm text-muted-foreground" data-testid="text-contact-title">
                  {lead.contact?.jobTitle || 'No Title'}
                </p>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span data-testid="text-contact-email">{lead.contact?.email || lead.contactEmail || 'N/A'}</span>
              </div>
              {lead.contact?.directPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span data-testid="text-contact-phone">{lead.contact.directPhone}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card data-testid="card-account">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-semibold text-lg" data-testid="text-account-name">
                {lead.account?.name || 'N/A'}
              </p>
              {lead.account?.domain && (
                <p className="text-sm text-muted-foreground" data-testid="text-account-domain">
                  {lead.account.domain}
                </p>
              )}
            </div>
            <Separator />
            {lead.account?.industryStandardized && (
              <div>
                <p className="text-xs text-muted-foreground">Industry</p>
                <p className="text-sm font-medium" data-testid="text-account-industry">
                  {lead.account.industryStandardized}
                </p>
              </div>
            )}
            {lead.account?.staffCount && (
              <div>
                <p className="text-xs text-muted-foreground">Employee Count</p>
                <p className="text-sm font-medium" data-testid="text-account-employees">
                  {lead.account.staffCount.toLocaleString()}
                </p>
              </div>
            )}
            {lead.account?.annualRevenue && (
              <div>
                <p className="text-xs text-muted-foreground">Annual Revenue</p>
                <p className="text-sm font-medium" data-testid="text-account-revenue">
                  {lead.account.annualRevenue}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaign & Agent Information */}
        <Card data-testid="card-campaign-agent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Campaign & Agent
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Campaign</p>
              <p className="font-semibold" data-testid="text-campaign-name">
                {lead.campaign?.name || 'N/A'}
              </p>
              <Badge variant="secondary" className="mt-1">
                {lead.campaign?.type || 'N/A'}
              </Badge>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground">Assigned Agent</p>
              {lead.agent ? (
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {(lead.agent.firstName?.[0] || '') + (lead.agent.lastName?.[0] || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium" data-testid="text-agent-name">
                      {lead.agent.firstName} {lead.agent.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid="text-agent-email">
                      {lead.agent.email}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not assigned</p>
              )}
            </div>
            {lead.approver && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground">Approved By</p>
                  <p className="text-sm font-medium" data-testid="text-approver-name">
                    {lead.approver.firstName} {lead.approver.lastName}
                  </p>
                  {lead.approvedAt && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(lead.approvedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Call Recording Player */}
      {lead.recordingUrl && (
        <Card data-testid="card-recording">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Call Recording
            </CardTitle>
            <CardDescription>
              Duration: {lead.callDuration ? formatDuration(lead.callDuration) : 'N/A'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={togglePlay}
                data-testid="button-play-pause"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <div className="flex-1">
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="absolute left-0 top-0 h-full bg-primary"
                    style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleDownload}
                data-testid="button-download"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
            <audio
              ref={audioRef}
              src={lead.recordingUrl}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onEnded={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Tabs for Transcript and AI Analysis */}
      <Tabs defaultValue="transcript" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transcript" data-testid="tab-transcript">
            <FileText className="h-4 w-4 mr-2" />
            Transcript
          </TabsTrigger>
          <TabsTrigger value="ai-analysis" data-testid="tab-ai-analysis">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Analysis
          </TabsTrigger>
          <TabsTrigger value="notes" data-testid="tab-notes">
            <Users className="h-4 w-4 mr-2" />
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transcript" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Call Transcript</CardTitle>
                {lead.recordingUrl && !lead.transcript && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => transcribeMutation.mutate()}
                    disabled={transcribeMutation.isPending || lead.transcriptionStatus === 'processing'}
                    data-testid="button-transcribe"
                  >
                    {lead.transcriptionStatus === 'processing' ? 'Processing...' : 'Generate Transcript'}
                  </Button>
                )}
              </div>
              {lead.transcriptionStatus && (
                <CardDescription>Status: {lead.transcriptionStatus}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {lead.transcript ? (
                <div className="prose dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap text-sm" data-testid="text-transcript">
                    {lead.transcript}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No transcript available. {lead.recordingUrl && 'Click "Generate Transcript" to create one.'}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-analysis" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>AI Qualification Analysis</CardTitle>
                {lead.transcript && !lead.aiAnalysis && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => analyzeMutation.mutate()}
                    disabled={analyzeMutation.isPending}
                    data-testid="button-analyze"
                  >
                    Run AI Analysis
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {lead.aiQualificationStatus && (
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Qualification Status</p>
                    <div className="mt-1">
                      {getQualificationBadge(lead.aiQualificationStatus)}
                    </div>
                  </div>
                  {lead.aiScore && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">AI Score</p>
                      <p className="text-3xl font-bold" data-testid="text-ai-score">
                        {Number(lead.aiScore).toFixed(0)}
                        <span className="text-lg text-muted-foreground">/100</span>
                      </p>
                    </div>
                  )}
                </div>
              )}
              {lead.aiAnalysis ? (
                <div className="space-y-3">
                  {typeof lead.aiAnalysis === 'object' && (
                    <>
                      {(lead.aiAnalysis as any).summary && (
                        <div>
                          <p className="text-sm font-semibold mb-1">Summary</p>
                          <p className="text-sm text-muted-foreground">{(lead.aiAnalysis as any).summary}</p>
                        </div>
                      )}
                      {(lead.aiAnalysis as any).keyPoints && Array.isArray((lead.aiAnalysis as any).keyPoints) && (
                        <div>
                          <p className="text-sm font-semibold mb-2">Key Points</p>
                          <ul className="list-disc list-inside space-y-1">
                            {(lead.aiAnalysis as any).keyPoints.map((point: string, index: number) => (
                              <li key={index} className="text-sm text-muted-foreground">{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No AI analysis available. {lead.transcript && 'Click "Run AI Analysis" to generate insights.'}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Lead Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {lead.notes ? (
                <p className="whitespace-pre-wrap text-sm" data-testid="text-notes">
                  {lead.notes}
                </p>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No notes available for this lead.
                </p>
              )}
              {lead.rejectedReason && (
                <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm font-semibold text-destructive mb-1">Rejection Reason</p>
                  <p className="text-sm text-destructive/90" data-testid="text-rejection-reason">
                    {lead.rejectedReason}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Lead</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this lead.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            data-testid="input-reject-reason"
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRejectDialogOpen(false)}
              data-testid="button-cancel-reject"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectMutation.mutate(rejectReason)}
              disabled={!rejectReason || rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              Reject Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
