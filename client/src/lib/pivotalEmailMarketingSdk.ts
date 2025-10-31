import type {
  OperationId,
  OperationRequestMap,
  OperationResponseMap,
} from '@shared/pivotal-email-marketing';

export type OperationExecutor = <K extends OperationId>(
  operationId: K,
  payload: OperationRequestMap[K],
) => Promise<OperationResponseMap[K]>;

export interface PivotalEmailMarketingSdk {
  campaign: {
    create: (payload: OperationRequestMap['campaign.create']) => Promise<OperationResponseMap['campaign.create']>;
    update: (payload: OperationRequestMap['campaign.update']) => Promise<OperationResponseMap['campaign.update']>;
    schedule: (
      payload: OperationRequestMap['campaign.schedule'],
    ) => Promise<OperationResponseMap['campaign.schedule']>;
    cancel: (
      payload: OperationRequestMap['campaign.cancel'],
    ) => Promise<OperationResponseMap['campaign.cancel']>;
    get: (payload: OperationRequestMap['campaign.get']) => Promise<OperationResponseMap['campaign.get']>;
    list: (payload: OperationRequestMap['campaign.list']) => Promise<OperationResponseMap['campaign.list']>;
    metrics: (
      payload: OperationRequestMap['campaign.metrics.get'],
    ) => Promise<OperationResponseMap['campaign.metrics.get']>;
    attachTemplate: (
      payload: OperationRequestMap['campaign.attachTemplate'],
    ) => Promise<OperationResponseMap['campaign.attachTemplate']>;
    attachLandingPage: (
      payload: OperationRequestMap['campaign.attachLandingPage'],
    ) => Promise<OperationResponseMap['campaign.attachLandingPage']>;
    shareWithClient: (
      payload: OperationRequestMap['campaign.shareWithClient'],
    ) => Promise<OperationResponseMap['campaign.shareWithClient']>;
  };
  template: {
    create: (payload: OperationRequestMap['template.create']) => Promise<OperationResponseMap['template.create']>;
    list: (payload: OperationRequestMap['template.list']) => Promise<OperationResponseMap['template.list']>;
    get: (payload: OperationRequestMap['template.get']) => Promise<OperationResponseMap['template.get']>;
    approve: (payload: OperationRequestMap['template.approve']) => Promise<OperationResponseMap['template.approve']>;
    archive: (payload: OperationRequestMap['template.archive']) => Promise<OperationResponseMap['template.archive']>;
  };
  aiTemplate: {
    generateForAccounts: (
      payload: OperationRequestMap['aiTemplate.generateForAccounts'],
    ) => Promise<OperationResponseMap['aiTemplate.generateForAccounts']>;
    get: (payload: OperationRequestMap['aiTemplate.get']) => Promise<OperationResponseMap['aiTemplate.get']>;
    approve: (payload: OperationRequestMap['aiTemplate.approve']) => Promise<OperationResponseMap['aiTemplate.approve']>;
    feedback: (payload: OperationRequestMap['aiTemplate.feedback']) => Promise<OperationResponseMap['aiTemplate.feedback']>;
  };
  landingPage: {
    register: (
      payload: OperationRequestMap['landingPage.register'],
    ) => Promise<OperationResponseMap['landingPage.register']>;
    list: (payload: OperationRequestMap['landingPage.list']) => Promise<OperationResponseMap['landingPage.list']>;
  };
  prefillToken: {
    issue: (
      payload: OperationRequestMap['prefillToken.issue'],
    ) => Promise<OperationResponseMap['prefillToken.issue']>;
    resolve: (
      payload: OperationRequestMap['prefillToken.resolve'],
    ) => Promise<OperationResponseMap['prefillToken.resolve']>;
  };
  tracking: {
    recordOpen: (
      payload: OperationRequestMap['tracking.recordOpen'],
    ) => Promise<OperationResponseMap['tracking.recordOpen']>;
    recordClick: (
      payload: OperationRequestMap['tracking.recordClick'],
    ) => Promise<OperationResponseMap['tracking.recordClick']>;
    recordHumanBeacon: (
      payload: OperationRequestMap['tracking.recordHumanBeacon'],
    ) => Promise<OperationResponseMap['tracking.recordHumanBeacon']>;
  };
  conversion: {
    recordInternal: (
      payload: OperationRequestMap['conversion.recordInternal'],
    ) => Promise<OperationResponseMap['conversion.recordInternal']>;
    ingestExternal: (
      payload: OperationRequestMap['conversion.ingestExternal'],
    ) => Promise<OperationResponseMap['conversion.ingestExternal']>;
  };
  qaTask: {
    createForLead: (
      payload: OperationRequestMap['qaTask.createForLead'],
    ) => Promise<OperationResponseMap['qaTask.createForLead']>;
    updateStatus: (
      payload: OperationRequestMap['qaTask.updateStatus'],
    ) => Promise<OperationResponseMap['qaTask.updateStatus']>;
  };
  lead: {
    assignToProjectOwner: (
      payload: OperationRequestMap['lead.assignToProjectOwner'],
    ) => Promise<OperationResponseMap['lead.assignToProjectOwner']>;
    listByCampaign: (
      payload: OperationRequestMap['lead.listByCampaign'],
    ) => Promise<OperationResponseMap['lead.listByCampaign']>;
    listByProject: (
      payload: OperationRequestMap['lead.listByProject'],
    ) => Promise<OperationResponseMap['lead.listByProject']>;
  };
  clientAccess: {
    grant: (
      payload: OperationRequestMap['clientAccess.grant'],
    ) => Promise<OperationResponseMap['clientAccess.grant']>;
    revoke: (
      payload: OperationRequestMap['clientAccess.revoke'],
    ) => Promise<OperationResponseMap['clientAccess.revoke']>;
  };
  clientDashboard: {
    get: (
      payload: OperationRequestMap['clientDashboard.get'],
    ) => Promise<OperationResponseMap['clientDashboard.get']>;
  };
}

export function createPivotalEmailMarketingSdk(executor: OperationExecutor): PivotalEmailMarketingSdk {
  return {
    campaign: {
      create: (payload) => executor('campaign.create', payload),
      update: (payload) => executor('campaign.update', payload),
      schedule: (payload) => executor('campaign.schedule', payload),
      cancel: (payload) => executor('campaign.cancel', payload),
      get: (payload) => executor('campaign.get', payload),
      list: (payload) => executor('campaign.list', payload),
      metrics: (payload) => executor('campaign.metrics.get', payload),
      attachTemplate: (payload) => executor('campaign.attachTemplate', payload),
      attachLandingPage: (payload) => executor('campaign.attachLandingPage', payload),
      shareWithClient: (payload) => executor('campaign.shareWithClient', payload),
    },
    template: {
      create: (payload) => executor('template.create', payload),
      list: (payload) => executor('template.list', payload),
      get: (payload) => executor('template.get', payload),
      approve: (payload) => executor('template.approve', payload),
      archive: (payload) => executor('template.archive', payload),
    },
    aiTemplate: {
      generateForAccounts: (payload) => executor('aiTemplate.generateForAccounts', payload),
      get: (payload) => executor('aiTemplate.get', payload),
      approve: (payload) => executor('aiTemplate.approve', payload),
      feedback: (payload) => executor('aiTemplate.feedback', payload),
    },
    landingPage: {
      register: (payload) => executor('landingPage.register', payload),
      list: (payload) => executor('landingPage.list', payload),
    },
    prefillToken: {
      issue: (payload) => executor('prefillToken.issue', payload),
      resolve: (payload) => executor('prefillToken.resolve', payload),
    },
    tracking: {
      recordOpen: (payload) => executor('tracking.recordOpen', payload),
      recordClick: (payload) => executor('tracking.recordClick', payload),
      recordHumanBeacon: (payload) => executor('tracking.recordHumanBeacon', payload),
    },
    conversion: {
      recordInternal: (payload) => executor('conversion.recordInternal', payload),
      ingestExternal: (payload) => executor('conversion.ingestExternal', payload),
    },
    qaTask: {
      createForLead: (payload) => executor('qaTask.createForLead', payload),
      updateStatus: (payload) => executor('qaTask.updateStatus', payload),
    },
    lead: {
      assignToProjectOwner: (payload) => executor('lead.assignToProjectOwner', payload),
      listByCampaign: (payload) => executor('lead.listByCampaign', payload),
      listByProject: (payload) => executor('lead.listByProject', payload),
    },
    clientAccess: {
      grant: (payload) => executor('clientAccess.grant', payload),
      revoke: (payload) => executor('clientAccess.revoke', payload),
    },
    clientDashboard: {
      get: (payload) => executor('clientDashboard.get', payload),
    },
  };
}
