/*
 * Pivotal Email Marketing specification v1.3
 * Path-agnostic DTOs, operation contracts, and event bindings.
 */

export type ISODateString = string;

export type CampaignObjective = 'webinar' | 'download' | 'appointment' | 'custom';
export type CampaignType = 'account_based' | 'blast' | 'triggered';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'paused' | 'done' | 'canceled';
export type AIGenerationStatus = 'none' | 'generated' | 'approved' | 'rejected';
export type QAStatus = 'pending' | 'verified' | 'blocked';
export type LeadAssignmentStatus = 'n/a' | 'queued' | 'assigned';

export interface CampaignMetadata {
  pacingPolicy?: Record<string, unknown>;
  utmPolicy?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Campaign {
  id: string;
  tenantId: string;
  clientId: string;
  projectId: string;
  name: string;
  objective: CampaignObjective;
  type: CampaignType;
  status: CampaignStatus;
  scheduleAt: ISODateString | null;
  aiGenerationStatus: AIGenerationStatus;
  qaStatus: QAStatus;
  leadAssignmentStatus: LeadAssignmentStatus;
  metadata: CampaignMetadata;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type TemplateSource = 'manual' | 'ai' | 'hybrid';

export interface Template {
  id: string;
  tenantId: string;
  clientId: string;
  name: string;
  source: TemplateSource;
  aiModelVersion?: string | null;
  html: string;
  text: string;
  preheader: string;
  variables: string[];
  dataFeatures: string[];
  confidenceScore?: number | null;
  approvedBy?: string | null;
  approvedAt?: ISODateString | null;
  version: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface AiTemplateGenerationRequest {
  projectId: string;
  campaignId: string;
  accounts: string[];
  persona: 'cxo' | 'vp' | 'manager';
  tone: 'consultative' | 'authoritative' | 'friendly';
  goal: CampaignObjective;
  variantCount: number;
  brief: string;
}

export interface AiTemplateVariant {
  variantId: string;
  subject: string;
  bodyHtml: string;
  cta: string;
  confidence: number;
  explanations: string[];
}

export interface AiTemplateGenerationResponse {
  campaignId: string;
  accountId: string;
  variants: AiTemplateVariant[];
}

export type LandingPageType = 'internal' | 'external';
export type LandingPageGoal = CampaignObjective;
export type PrefillMode = 'token' | 'query' | 'auto';
export type LandingPageProfile =
  | 'calendly'
  | 'zoom'
  | 'eventbrite'
  | 'typeform'
  | 'custom';

export interface LandingPage {
  id: string;
  tenantId: string;
  clientId: string;
  type: LandingPageType;
  goal: LandingPageGoal;
  baseUrlOrSlug: string;
  prefillMode: PrefillMode;
  profile: LandingPageProfile;
  utmPolicy: Record<string, unknown>;
  active: boolean;
}

export interface PrefillTokenIssueRequest {
  contactId: string;
  campaignId: string;
  landingPageId: string;
  goal: LandingPageGoal;
  ttlSeconds?: number;
}

export interface PrefillTokenIssueResponse {
  token: string;
  expiresAt: ISODateString;
}

export interface PrefillTokenResolveResponse {
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    company: string;
    title: string;
    phone: string;
  };
  account: {
    name: string;
    industry: string;
    size: string;
  };
  context: {
    campaignId: string;
    sendId: string;
    goal: LandingPageGoal;
  };
  lock: string[];
}

export interface ConversionSubmission {
  pft: string;
  fields: Record<string, unknown>;
  goal: LandingPageGoal;
}

export interface CampaignMetrics {
  delivered: number;
  humanOpens: number;
  humanClicks: number;
  ctrHuman: number;
  unsubRate: number;
  bounceRate: number;
  verifiedLeads: number;
  qaVerified: number;
  botFiltered: boolean;
  timeSeries: Array<{
    t: string;
    opens: number;
    humanOpens: number;
  }>;
}

export interface EmailEventBotFlags {
  isBot: boolean;
  botScore: number;
  botReason: 'fingerprint' | 'heuristic' | 'override';
  isMPP: boolean;
  proxyProvider: string | null;
}

export interface EmailDeliveredEvent {
  sendId: string;
  campaignId: string;
  occurredAt: ISODateString;
}

export interface EmailOpenEvent extends EmailEventBotFlags {
  sendId: string;
  occurredAt: ISODateString;
}

export interface EmailClickEvent extends EmailEventBotFlags {
  sendId: string;
  linkId: string;
  occurredAt: ISODateString;
}

export interface FormViewedEvent {
  sendId: string;
  landingPageId: string;
  occurredAt: ISODateString;
}

export interface FormSubmittedEvent {
  sendId: string;
  landingPageId: string;
  goal: LandingPageGoal;
  occurredAt: ISODateString;
}

export interface EmailConversionEvent {
  sendId: string;
  campaignId: string;
  goal: LandingPageGoal;
  value: number;
  occurredAt: ISODateString;
}

export interface QATaskCreatedEvent {
  leadId: string;
  campaignId: string;
  projectId: string;
  clientId: string;
}

export interface LeadAssignedEvent {
  leadId: string;
  ownerId: string;
  projectId: string;
}

export interface AiTemplateGeneratedEvent {
  campaignId: string;
  accountId: string;
  variantIds: string[];
}

export interface AiTemplateApprovedEvent {
  templateId: string;
  approvedBy: string;
  approvedAt: ISODateString;
}

export type PivotalEmailEventMap = {
  'email.delivered': EmailDeliveredEvent;
  'email.open': EmailOpenEvent;
  'email.click': EmailClickEvent;
  'form.viewed': FormViewedEvent;
  'form.submitted': FormSubmittedEvent;
  'email.conversion': EmailConversionEvent;
  'qa.task.created': QATaskCreatedEvent;
  'lead.assigned': LeadAssignedEvent;
  'ai.template.generated': AiTemplateGeneratedEvent;
  'ai.template.approved': AiTemplateApprovedEvent;
};

export type ClientAccessRole =
  | 'admin'
  | 'projectLead'
  | 'marketer'
  | 'qaAnalyst'
  | 'leadManager'
  | 'clientViewer'
  | 'clientApprover'
  | 'clientAdmin';

export interface ClientAccessGrantRequest {
  tenantId: string;
  clientId: string;
  userId: string;
  role: ClientAccessRole;
  projectIds?: string[];
}

export interface ClientAccessRevokeRequest {
  tenantId: string;
  clientId: string;
  userId: string;
}

export interface ClientDashboardGetRequest {
  tenantId: string;
  clientId: string;
  campaignId?: string;
  includeBots?: boolean;
}

export interface ClientDashboardGetResponse {
  campaigns: Campaign[];
  metrics: Record<string, CampaignMetrics>;
}

export interface QATask {
  id: string;
  leadId: string;
  campaignId: string;
  projectId: string;
  clientId: string;
  status: 'pending' | 'in_review' | 'verified' | 'blocked';
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface LeadAssignment {
  leadId: string;
  ownerId: string;
  projectId: string;
  assignedAt: ISODateString;
}

export interface LeadRecord {
  id: string;
  tenantId: string;
  clientId: string;
  campaignId: string;
  projectId: string;
  status: 'new' | 'in_progress' | 'qualified' | 'disqualified' | 'converted';
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CampaignShareWithClientRequest {
  campaignId: string;
  clientId: string;
  expiresAt?: ISODateString;
}

export interface CampaignAttachTemplateRequest {
  campaignId: string;
  templateId: string;
}

export interface CampaignAttachLandingPageRequest {
  campaignId: string;
  landingPageId: string;
  prefillTokenMode: PrefillMode;
}

export interface CampaignScheduleRequest {
  campaignId: string;
  scheduleAt: ISODateString;
}

export interface CampaignCancelRequest {
  campaignId: string;
  reason?: string;
}

export interface CampaignGetRequest {
  campaignId: string;
}

export interface CampaignListRequest {
  tenantId: string;
  clientId?: string;
  projectId?: string;
  statuses?: CampaignStatus[];
}

export interface CampaignMetricsGetRequest {
  campaignId: string;
  excludeBots?: boolean;
  rollup?: boolean;
}

export interface TemplateCreateRequest extends Omit<Template, 'id' | 'createdAt' | 'updatedAt'> {}

export interface TemplateApproveRequest {
  templateId: string;
  approvedBy: string;
}

export interface TemplateArchiveRequest {
  templateId: string;
  archivedBy: string;
}

export interface TemplateGetRequest {
  templateId: string;
}

export interface TemplateListRequest {
  tenantId: string;
  clientId?: string;
  source?: TemplateSource[];
}

export interface AiTemplateGetRequest {
  campaignId: string;
  accountId: string;
}

export interface AiTemplateApproveRequest {
  campaignId: string;
  accountId: string;
  variantId: string;
  approvedBy: string;
}

export interface AiTemplateFeedbackRequest {
  campaignId: string;
  accountId: string;
  variantId: string;
  feedback: string;
  rating?: number;
}

export interface LandingPageRegisterRequest extends Omit<LandingPage, 'id'> {}

export interface LandingPageListRequest {
  tenantId: string;
  clientId?: string;
  activeOnly?: boolean;
}

export interface TrackingRecordOpenRequest extends EmailOpenEvent {}
export interface TrackingRecordClickRequest extends EmailClickEvent {}
export interface TrackingRecordHumanBeaconRequest {
  sendId: string;
  occurredAt: ISODateString;
}

export interface ConversionRecordInternalRequest extends ConversionSubmission {}

export interface ConversionIngestExternalRequest {
  signature: string;
  payload: Record<string, unknown>;
}

export interface QATaskCreateForLeadRequest {
  leadId: string;
  campaignId: string;
  projectId: string;
  clientId: string;
}

export interface QATaskUpdateStatusRequest {
  qaTaskId: string;
  status: QATask['status'];
  updatedBy: string;
}

export interface LeadAssignToProjectOwnerRequest {
  leadId: string;
  projectId: string;
  ownerId: string;
}

export interface LeadListByCampaignRequest {
  campaignId: string;
}

export interface LeadListByProjectRequest {
  projectId: string;
}

export type OperationRequestMap = {
  'campaign.create': Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'aiGenerationStatus' | 'qaStatus' | 'leadAssignmentStatus'> & {
    id?: string;
  };
  'campaign.update': Partial<Omit<Campaign, 'id' | 'tenantId' | 'clientId' | 'projectId' | 'createdAt' | 'updatedAt'>> & {
    campaignId: string;
  };
  'campaign.schedule': CampaignScheduleRequest;
  'campaign.cancel': CampaignCancelRequest;
  'campaign.get': CampaignGetRequest;
  'campaign.list': CampaignListRequest;
  'campaign.metrics.get': CampaignMetricsGetRequest;
  'campaign.attachTemplate': CampaignAttachTemplateRequest;
  'campaign.attachLandingPage': CampaignAttachLandingPageRequest;
  'campaign.shareWithClient': CampaignShareWithClientRequest;
  'template.create': TemplateCreateRequest;
  'template.list': TemplateListRequest;
  'template.get': TemplateGetRequest;
  'template.approve': TemplateApproveRequest;
  'template.archive': TemplateArchiveRequest;
  'aiTemplate.generateForAccounts': AiTemplateGenerationRequest;
  'aiTemplate.get': AiTemplateGetRequest;
  'aiTemplate.approve': AiTemplateApproveRequest;
  'aiTemplate.feedback': AiTemplateFeedbackRequest;
  'landingPage.register': LandingPageRegisterRequest;
  'landingPage.list': LandingPageListRequest;
  'prefillToken.issue': PrefillTokenIssueRequest;
  'prefillToken.resolve': { token: string };
  'tracking.recordOpen': TrackingRecordOpenRequest;
  'tracking.recordClick': TrackingRecordClickRequest;
  'tracking.recordHumanBeacon': TrackingRecordHumanBeaconRequest;
  'conversion.recordInternal': ConversionRecordInternalRequest;
  'conversion.ingestExternal': ConversionIngestExternalRequest;
  'qaTask.createForLead': QATaskCreateForLeadRequest;
  'qaTask.updateStatus': QATaskUpdateStatusRequest;
  'lead.assignToProjectOwner': LeadAssignToProjectOwnerRequest;
  'lead.listByCampaign': LeadListByCampaignRequest;
  'lead.listByProject': LeadListByProjectRequest;
  'clientAccess.grant': ClientAccessGrantRequest;
  'clientAccess.revoke': ClientAccessRevokeRequest;
  'clientDashboard.get': ClientDashboardGetRequest;
};

export type OperationResponseMap = {
  'campaign.create': { campaign: Campaign };
  'campaign.update': { campaign: Campaign };
  'campaign.schedule': { campaign: Campaign };
  'campaign.cancel': { campaign: Campaign };
  'campaign.get': { campaign: Campaign };
  'campaign.list': { campaigns: Campaign[] };
  'campaign.metrics.get': { metrics: CampaignMetrics };
  'campaign.attachTemplate': { campaignId: string; templateId: string };
  'campaign.attachLandingPage': { campaignId: string; landingPageId: string; prefillTokenMode: PrefillMode };
  'campaign.shareWithClient': { campaignId: string; clientId: string; shareLink: string; expiresAt?: ISODateString };
  'template.create': { template: Template };
  'template.list': { templates: Template[] };
  'template.get': { template: Template };
  'template.approve': { template: Template };
  'template.archive': { templateId: string; archived: boolean };
  'aiTemplate.generateForAccounts': { jobs: AiTemplateGenerationResponse[] };
  'aiTemplate.get': { variants: AiTemplateVariant[] };
  'aiTemplate.approve': { campaignId: string; accountId: string; variantId: string };
  'aiTemplate.feedback': { campaignId: string; accountId: string; variantId: string; receivedAt: ISODateString };
  'landingPage.register': { landingPage: LandingPage };
  'landingPage.list': { landingPages: LandingPage[] };
  'prefillToken.issue': PrefillTokenIssueResponse;
  'prefillToken.resolve': PrefillTokenResolveResponse;
  'tracking.recordOpen': { accepted: boolean };
  'tracking.recordClick': { accepted: boolean };
  'tracking.recordHumanBeacon': { accepted: boolean };
  'conversion.recordInternal': { conversionId: string; leadId: string };
  'conversion.ingestExternal': { accepted: boolean };
  'qaTask.createForLead': { qaTask: QATask };
  'qaTask.updateStatus': { qaTask: QATask };
  'lead.assignToProjectOwner': { assignment: LeadAssignment };
  'lead.listByCampaign': { leads: LeadRecord[] };
  'lead.listByProject': { leads: LeadRecord[] };
  'clientAccess.grant': { granted: boolean };
  'clientAccess.revoke': { revoked: boolean };
  'clientDashboard.get': ClientDashboardGetResponse;
};

export type OperationId = keyof OperationRequestMap;

export type FeatureFlag =
  | 'ai_templates'
  | 'client_portal'
  | 'bot_filtering'
  | 'prefill_token'
  | 'approvals';

export const pivotalFeatureFlags: FeatureFlag[] = [
  'ai_templates',
  'client_portal',
  'bot_filtering',
  'prefill_token',
  'approvals',
];

export interface EmailTemplateLintIssue {
  type: 'error' | 'warning';
  message: string;
  line?: number;
  column?: number;
}

export interface EmailTemplateLintResult {
  valid: boolean;
  issues: EmailTemplateLintIssue[];
}

export const BULLETPROOF_HEADER_MARKER = 'data-pivotal-bulletproof-header';
