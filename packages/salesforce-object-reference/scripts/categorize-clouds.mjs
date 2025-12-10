#!/usr/bin/env node
/**
 * Categorize objects into Sales Cloud and Service Cloud
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Read core-salesforce.json
const coreData = JSON.parse(
  readFileSync(join(rootDir, 'doc/core-salesforce.json'), 'utf-8')
);

// Sales Cloud specific objects
const salesCloudObjects = [
  // Core Sales Objects
  'Lead', 'LeadStatus', 'LeadCleanInfo', 'LeadDailyMetric', 'LeadMonthlyMetric',
  'LeadOwnerSharingRule', 'LeadTag',
  
  // Opportunity Objects
  'Opportunity', 'OpportunityStage', 'OpportunityLineItem', 'OpportunityContactRole',
  'OpportunityCompetitor', 'OpportunityInsight', 'OpportunityLineItemSchedule',
  'OpportunityOwnerSharingRule', 'OpportunityPartner', 'OpportunitySplit',
  'OpportunitySplitType', 'OpportunityTeamMember', 'OpportunityTag',
  'OpportunityContactRoleSuggestionInsight', 'OpportunityRelatedDeleteLog',
  'OpportunityLineItemSplit', 'OpptyLineItemSplitType',
  
  // Quote Objects
  'Quote', 'QuoteDocument', 'QuoteLineItem', 'QuoteLineGroup', 
  'QuoteLineItemRecipient', 'QuoteLinePriceAdjustment', 'QuoteLineRelationship',
  'QuoteAction', 'QuoteAdjustmentGroup', 'QuoteRecipientGroup',
  'QuoteRecipientGroupMember', 'QuoteItemTaxItem', 'QuoteLineWorkSource',
  
  // Product & Pricing
  'Product2', 'Product2DataTranslation', 'Pricebook2', 'PricebookEntry',
  'PricebookEntryAdjustment', 'ProductAttribute', 'ProductAttributeSet',
  'ProductAttributeSetItem', 'ProductAttributeSetProduct',
  
  // Campaign Objects
  'Campaign', 'CampaignMember', 'CampaignMemberStatus', 'CampaignInfluence',
  'CampaignInfluenceModel', 'CampaignOwnerSharingRule', 'CampaignTag',
  
  // Forecasting
  'ForecastingAdjustment', 'ForecastingCustomCategory', 'ForecastingCustomData',
  'ForecastingDisplayedFamily', 'ForecastingFact', 'ForecastingFilter',
  'ForecastingFilterCondition', 'ForecastingGroup', 'ForecastingGroupItem',
  'ForecastingItem', 'ForecastingOwnerAdjustment', 'ForecastingQuota',
  'ForecastingSourceDefinition', 'ForecastingSrcRecJudgment', 'ForecastingSubmission',
  'ForecastingSubmissionItem', 'ForecastingType', 'ForecastingTypeSource',
  'ForecastingUserPreference', 'FrcstCustmCatgRampRateSrc', 'FrcstCustmzAdjustment',
  'FrcstCustmzOwnerAdjustment', 'ForecastingColumnDefinitionLocalization',
  
  // Contract
  'Contract', 'ContractContactRole', 'ContractLineItem', 'ContractLineOutcome',
  'ContractLineOutcomeData', 'ContractStatus', 'ContractTag',
  
  // Partner Objects
  'Partner', 'PartnerRole', 'PartnerFundAllocation', 'PartnerFundClaim',
  'PartnerFundRequest', 'PartnerMarketingBudget', 'PartnerNetworkConnection',
  'PartnerNetworkRecordConnection', 'PartnerNetworkSyncLog',
  
  // Sales Performance & Analytics
  'SalesAIScoreCycle', 'SalesAIScoreModelFactor', 'SalesChannel',
  'ScoreIntelligence', 'Scorecard', 'ScorecardAssociation', 'ScorecardMetric',
  
  // Account Plan
  'AccountPlan', 'AccountPlanObjMeasCalcCond', 'AccountPlanObjMeasCalcDef',
  'AccountPlanObjMeasCalcDefLocalization', 'AccountPlanObjMeasRela',
  'AccountPlanObjective', 'AccountPlanObjectiveMeasure',
  
  // Territory Management
  'Territory', 'Territory2', 'Territory2Model', 'Territory2Type',
  'Territory2AlignmentLog', 'Territory2ObjSharingConfig', 'Territory2ObjectExclusion',
  'TerritoryAdminAssignment', 'TerritoryMgmtObjectConfig',
  'AccountTerritoryAssignmentRule', 'AccountTerritoryAssignmentRuleItem',
  'AccountTerritorySharingRule', 'AccountUserTerritory2View',
  'ObjectTerritory2AssignmentRule', 'ObjectTerritory2AssignmentRuleItem',
  'ObjectTerritory2Association', 'ObjectUserTerritory2View',
  'RuleTerritory2Association', 'UserTerritory', 'UserTerritory2Association',
  'UserTerritory2AssocLog',
  
  // Sales Cadence
  'ActionCadence', 'ActionCadenceRule', 'ActionCadenceRuleCondition',
  'ActionCadenceStep', 'ActionCadenceStepTracker', 'ActionCadenceStepVariant',
  'ActionCadenceTracker', 'ActionCdncStpMonthlyMetric',
  
  // Sales Work Queue
  'SalesWorkQueueSettings',
  
  // Account Teams (primarily sales)
  'AccountTeamMember',
  
  // Email & List Email (Sales engagement)
  'ListEmail', 'ListEmailIndividualRecipient', 'ListEmailMonthlyMetric',
  'ListEmailRecipientSource',
  
  // Sales engagement
  'EmailInsight', 'EmailInsightAction', 'ContactSuggestionInsight',
  
  // Channel Program (Partner sales)
  'ChannelProgram', 'ChannelProgramLevel', 'ChannelProgramMember',
];

// Service Cloud specific objects  
const serviceCloudObjects = [
  // Case Management
  'Case', 'CaseArticle', 'CaseComment', 'CaseContactRole', 'CaseHistory2',
  'CaseMilestone', 'CaseOwnerSharingRule', 'CaseParticipant', 'CaseRelatedIssue',
  'CaseSolution', 'CaseStatus', 'CaseSubjectParticle', 'CaseTag',
  'CaseTeamMember', 'CaseTeamRole', 'CaseTeamTemplate', 'CaseTeamTemplateMember',
  'CaseTeamTemplateRecord',
  
  // Knowledge Base
  'Knowledge__ka', 'Knowledge__kav', 'KnowledgeArticle', 'KnowledgeArticleVersion',
  'KnowledgeArticleViewStat', 'KnowledgeArticleVoteStat', 'KnowledgeableUser',
  'KnowledgeArticleEventLog', 'KnowledgeArticleFeedback',
  'Knowledge__DataCategorySelection',
  
  // Service Contract & Entitlement
  'ServiceContract', 'ServiceContractOwnerSharingRule', 'Entitlement',
  'EntitlementContact', 'EntitlementTemplate', 'MilestoneType', 'EntityMilestone',
  
  // Omni-Channel
  'AgentWork', 'AgentWorkSkill', 'PendingServiceRouting',
  'PendingServiceRoutingInteractionInfo', 'QueueRoutingConfig',
  'ServiceChannel', 'ServiceChannelFieldPriority', 'ServiceChannelStatus',
  'ServiceChannelStatusField', 'ServicePresenceStatus', 'PresenceUserConfig',
  'PresenceUserConfigProfile', 'PresenceUserConfigUser', 'PresenceDeclineReason',
  'PresenceConfigDeclineReason', 'UserServicePresence',
  
  // Live Chat
  'LiveChatTranscript', 'LiveChatTranscriptSkill', 'LiveChatVisitor',
  'LiveChatButton', 'LiveChatButtonDeployment', 'LiveChatButtonSkill',
  'LiveChatDeployment', 'LiveChatUserConfig', 'LiveChatUserConfigProfile',
  'LiveChatUserConfigUser', 'LiveChatBlockingRule', 'LiveChatSensitiveDataRule',
  'LiveChatObjectAccessConfig', 'LiveChatObjectAccessDefinition',
  'LiveAgentSession',
  
  // Messaging
  'MessagingSession', 'MessagingSessionMetrics', 'MessagingEndUser',
  'MessagingChannel', 'MessagingChannelSkill', 'MessagingChannelUsage',
  'MessagingConfiguration', 'MessagingDeliveryError', 'MessagingLink',
  'MessagingTemplate', 'MsgChannelLanguageKeyword', 'MsgChannelUsageExternalOrg',
  'MobileSettingsAssignment',
  
  // Voice & Call Center
  'VoiceCall', 'VoiceCallRecording', 'VoiceCallQualityFeedback', 'VoiceCallMetrics',
  'VoiceMailContent', 'VoiceMailGreeting', 'VoiceMailMessage', 'VoiceCoaching',
  'VoiceLocalPresenceNumber', 'VoiceUserLine', 'VoiceUserPreferences',
  'VoiceVendorInfo', 'VoiceVendorLine', 'VoiceOrgSetting', 'VoiceCallList',
  'VoiceCallListItem', 'CallCenter', 'CallCenterRoutingMap', 'CallCoachingMediaProvider',
  'CallCtrAgentFavTrfrDest', 'VendorCallCenterStatusMap',
  
  // Conversation / Unified Communications
  'Conversation', 'ConversationEntry', 'ConversationParticipant',
  'ConversationChannelDefinition', 'ConversationContextEntry', 'ConversationVendorInfo',
  'ConversationApiLog', 'ConvAnalysisSummary', 'ConvAnalysisTopic',
  'ConvAnalysisTopicEntry', 'ConvIntelligenceSignalRule', 'ConvIntelligenceSignalSubRule',
  'ConvMessageSendRequest',
  
  // Contact Center
  'ContactCenterChannel',
  
  // Macros & Quick Text
  'Macro', 'MacroInstruction', 'MacroUsage', 'QuickText', 'QuickTextUsage',
  
  // Service Reports & Console
  'ServiceReport', 'ServiceReportLayout',
  
  // Embedded Service
  'EmbeddedServiceDetail', 'EmbeddedServiceLabel',
  
  // SOS Video
  'SOSDeployment', 'SOSSession', 'SOSSessionActivity',
  
  // Email-to-Case & Web-to-Case
  'EmailMessage', 'EmailMessageRelation', 'EmailMessageMigration',
  'EmailRoutingAddress', 'EmailServicesAddress', 'EmailServicesFunction',
  
  // Social Customer Service
  'SocialPost', 'SocialPersona',
  
  // Incident Management
  'Incident', 'IncidentRelatedItem',
  
  // Problem Management
  'Problem', 'ProblemIncident', 'ProblemRelatedItem',
  
  // Change Management
  'ChangeRequest', 'ChangeRequestRelatedIssue', 'ChangeRequestRelatedItem',
  
  // Service Catalog
  'SvcCatalogCategory', 'SvcCatalogCategoryItem', 'SvcCatalogFilterCriteria',
  'SvcCatalogItemDef', 'SvcCatalogReqRelatedItem', 'SvcCatalogRequest',
  
  // Call Disposition
  'CallDisposition', 'CallDispositionCategory', 'CallTemplate',
  
  // Business Hours & Holidays
  'BusinessHours', 'Holiday', 'OperatingHours', 'OperatingHoursHoliday',
  
  // Omni-Channel Skills
  'Skill', 'SkillRequirement', 'SkillUser', 'ProfileSkill',
  'ProfileSkillEndorsement', 'ProfileSkillUser',
  
  // Omni-Supervisor
  'OmniSupervisorConfig', 'OmniSupervisorConfigAction', 'OmniSupervisorConfigGroup',
  'OmniSupervisorConfigProfile', 'OmniSupervisorConfigQueue', 'OmniSupervisorConfigSkill',
  'OmniSupervisorConfigTab', 'OmniSupervisorConfigUser',
  
  // Channel Object Linking (Service Cloud feature)
  'ChannelObjectLinkingRule',
  
  // Service Setup
  'ServiceSetupProvisioning',
  
  // SLA Process
  'SlaProcess',
  
  // External Knowledge
  'ExtKnowledgeConnector',
];

// Filter objects from core-salesforce that match our categories
const salesObjects = coreData.objects.filter(obj => 
  salesCloudObjects.includes(obj)
);

const serviceObjects = coreData.objects.filter(obj =>
  serviceCloudObjects.includes(obj)
);

// Create Sales Cloud JSON
const salesCloudData = {
  cloud: 'Sales Cloud',
  description: 'Objects for sales operations including leads, opportunities, quotes, forecasts, and sales performance management.',
  objectCount: salesObjects.length,
  objects: salesObjects.sort()
};

// Create Service Cloud JSON
const serviceCloudData = {
  cloud: 'Service Cloud',
  description: 'Objects for customer service and support including cases, knowledge articles, service contracts, and omnichannel routing.',
  objectCount: serviceObjects.length,
  objects: serviceObjects.sort()
};

// Write files
writeFileSync(
  join(rootDir, 'doc/sales-cloud.json'),
  JSON.stringify(salesCloudData, null, 2) + '\n'
);

writeFileSync(
  join(rootDir, 'doc/service-cloud.json'),
  JSON.stringify(serviceCloudData, null, 2) + '\n'
);

console.log(`✅ Sales Cloud: ${salesObjects.length} objects`);
console.log(`✅ Service Cloud: ${serviceObjects.length} objects`);
console.log('\nSample Sales Cloud objects:');
console.log(salesObjects.slice(0, 10).join(', '));
console.log('\nSample Service Cloud objects:');
console.log(serviceObjects.slice(0, 10).join(', '));

