export const USER_ROLE_VALUES = [
  'admin',
  'campaign_manager',
  'data_ops',
  'quality_analyst',
  'agent',
  'content_creator',
  'client_user',
] as const;

export type UserRole = (typeof USER_ROLE_VALUES)[number];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  campaign_manager: 'Campaign Manager',
  data_ops: 'Data Operations',
  quality_analyst: 'Quality Analyst',
  agent: 'Agent',
  content_creator: 'Content Creator',
  client_user: 'Client Portal User',
};
