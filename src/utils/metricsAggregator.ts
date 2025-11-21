import { CopilotMetrics, MetricsStats, UserSummary } from '../types/metrics';
import { DateRangeFilter } from '../components/FilterPanel';
import { getFilteredDateRange } from './dateFilters';
import { SERVICE_VALUE_RATE, getModelMultiplier, isPremiumModel } from '../domain/modelConfig';
import { 
  DailyEngagementData, 
  DailyChatUsersData, 
  DailyChatRequestsData, 
  LanguageStats, 
  DailyModelUsageData, 
  FeatureAdoptionData, 
  DailyPRUAnalysisData, 
  AgentModeHeatmapData, 
  ModelFeatureDistributionData, 
  AgentImpactData, 
  CodeCompletionImpactData, 
  ModeImpactData 
} from './metricCalculators';

export interface AggregatedMetrics {
  metrics: CopilotMetrics[];
  stats: MetricsStats;
  userSummaries: UserSummary[];
  engagementData: DailyEngagementData[];
  chatUsersData: DailyChatUsersData[];
  chatRequestsData: DailyChatRequestsData[];
  languageStats: LanguageStats[];
  modelUsageData: DailyModelUsageData[];
  featureAdoptionData: FeatureAdoptionData;
  pruAnalysisData: DailyPRUAnalysisData[];
  agentModeHeatmapData: AgentModeHeatmapData[];
  modelFeatureDistributionData: ModelFeatureDistributionData[];
  agentImpactData: AgentImpactData[];
  codeCompletionImpactData: CodeCompletionImpactData[];
  editModeImpactData: ModeImpactData[];
  inlineModeImpactData: ModeImpactData[];
  askModeImpactData: ModeImpactData[];
  joinedImpactData: ModeImpactData[];
}

export function aggregateMetrics(
  metrics: CopilotMetrics[], 
  options: {
    removeUnknownLanguages?: boolean;
    dateFilter?: DateRangeFilter;
    reportEndDay?: string;
  } = {}
): AggregatedMetrics {
  const filteredMetrics: CopilotMetrics[] = [];
  
  // Date Filter Setup
  let startDate: Date | null = null;
  let endDate: Date | null = null;
  if (options.dateFilter && options.dateFilter !== 'all' && options.reportEndDay) {
    const { startDay, endDay } = getFilteredDateRange(options.dateFilter, '', options.reportEndDay);
    startDate = new Date(startDay);
    endDate = new Date(endDay);
  }

  // 1. Initialize Accumulators
  
  // Stats & User Summaries
  const userMap = new Map<number, UserSummary>();
  const userActiveDays = new Map<number, Set<string>>();
  const userUsageMap = new Map<number, { used_chat: boolean; used_agent: boolean }>();
  const languageEngagements = new Map<string, number>();
  const ideUsers = new Map<string, Set<number>>();
  const modelEngagements = new Map<string, number>();

  // Daily Data
  const dailyEngagement = new Map<string, Set<number>>();
  
  const dailyChatUsers = new Map<string, {
    askModeUsers: Set<number>;
    agentModeUsers: Set<number>;
    editModeUsers: Set<number>;
    inlineModeUsers: Set<number>;
  }>();

  const dailyChatRequests = new Map<string, {
    askModeRequests: number;
    agentModeRequests: number;
    editModeRequests: number;
    inlineModeRequests: number;
  }>();

  const dailyModelUsage = new Map<string, {
    pruModels: number;
    standardModels: number;
    unknownModels: number;
    totalPRUs: number;
  }>();

  const dailyPRU = new Map<string, {
    pruRequests: number;
    standardRequests: number;
    totalPRUs: number;
    modelStats: Map<string, { requests: number; prus: number; multiplier: number; isPremium: boolean }>;
  }>();

  const dailyAgentHeatmap = new Map<string, {
    requests: number;
    users: Set<number>;
    totalPRUs: number;
  }>();

  // Impact Data
  const dailyAgentImpact = new Map<string, { locAdded: number; locDeleted: number; userCount: Set<number>; }>();
  const dailyCodeCompletionImpact = new Map<string, { locAdded: number; locDeleted: number; userCount: Set<number>; }>();
  const dailyEditModeImpact = new Map<string, { locAdded: number; locDeleted: number; userIds: Set<number>; }>();
  const dailyInlineModeImpact = new Map<string, { locAdded: number; locDeleted: number; userIds: Set<number>; }>();
  const dailyAskModeImpact = new Map<string, { locAdded: number; locDeleted: number; userIds: Set<number>; }>();
  const dailyJoinedImpact = new Map<string, { locAdded: number; locDeleted: number; userIds: Set<number>; }>();
  
  const allUniqueUsersSet = new Set<number>();

  // Language Stats
  const languageStatsMap = new Map<string, {
    totalGenerations: number;
    totalAcceptances: number;
    locAdded: number;
    locDeleted: number;
    locSuggestedToAdd: number;
    locSuggestedToDelete: number;
    users: Set<number>;
  }>();

  // Feature Adoption
  const userFeatures = new Map<number, Set<string>>();

  // Model Feature Distribution
  const modelFeatureDist = new Map<string, {
    features: Map<string, number>;
    totalInteractions: number;
  }>();

  // 2. Single Pass Loop
  for (const metric of metrics) {
    // Date Filtering
    if (startDate && endDate) {
      const metricDate = new Date(metric.day);
      if (metricDate < startDate || metricDate > endDate) continue;
    }

    filteredMetrics.push(metric);

    const date = metric.day;
    const userId = metric.user_id;
    allUniqueUsersSet.add(userId);

    // --- User Summary & Stats (User Usage) ---
    if (!userMap.has(userId)) {
      userMap.set(userId, {
        user_login: metric.user_login,
        user_id: userId,
        total_user_initiated_interactions: 0,
        total_code_generation_activities: 0,
        total_code_acceptance_activities: 0,
        total_loc_added: 0,
        total_loc_deleted: 0,
        total_loc_suggested_to_add: 0,
        total_loc_suggested_to_delete: 0,
        days_active: 0,
        used_agent: false,
        used_chat: false,
      });
      userActiveDays.set(userId, new Set());
    }
    const userSummary = userMap.get(userId)!;
    userSummary.total_user_initiated_interactions += metric.user_initiated_interaction_count;
    userSummary.total_code_generation_activities += metric.code_generation_activity_count;
    userSummary.total_code_acceptance_activities += metric.code_acceptance_activity_count;
    userSummary.total_loc_added += metric.loc_added_sum;
    userSummary.total_loc_deleted += metric.loc_deleted_sum;
    userSummary.total_loc_suggested_to_add += metric.loc_suggested_to_add_sum;
    userSummary.total_loc_suggested_to_delete += metric.loc_suggested_to_delete_sum;
    userActiveDays.get(userId)!.add(date);
    userSummary.used_agent = userSummary.used_agent || metric.used_agent;
    userSummary.used_chat = userSummary.used_chat || metric.used_chat;

    // Stats: User Usage Map
    const existingUsage = userUsageMap.get(userId) || { used_chat: false, used_agent: false };
    userUsageMap.set(userId, {
      used_chat: existingUsage.used_chat || metric.used_chat,
      used_agent: existingUsage.used_agent || metric.used_agent,
    });

    // --- Daily Engagement ---
    if (!dailyEngagement.has(date)) dailyEngagement.set(date, new Set());
    dailyEngagement.get(date)!.add(userId);

    // --- Totals by IDE (Stats) ---
    for (const ideTotal of metric.totals_by_ide) {
      if (!ideUsers.has(ideTotal.ide)) ideUsers.set(ideTotal.ide, new Set());
      ideUsers.get(ideTotal.ide)!.add(userId);
    }

    // --- Totals by Language Feature (Stats & Language Stats) ---
    for (const langFeature of metric.totals_by_language_feature) {
      if (options.removeUnknownLanguages && (langFeature.language.toLowerCase() === 'unknown' || langFeature.language.trim() === '')) {
        continue;
      }
      const language = langFeature.language;

      // Stats: Language Engagements
      const currentLangEng = languageEngagements.get(language) || 0;
      languageEngagements.set(language, currentLangEng + langFeature.code_generation_activity_count + langFeature.code_acceptance_activity_count);

      // Language Stats
      if (!languageStatsMap.has(language)) {
        languageStatsMap.set(language, {
          totalGenerations: 0, totalAcceptances: 0, locAdded: 0, locDeleted: 0, locSuggestedToAdd: 0, locSuggestedToDelete: 0, users: new Set()
        });
      }
      const ls = languageStatsMap.get(language)!;
      ls.totalGenerations += langFeature.code_generation_activity_count;
      ls.totalAcceptances += langFeature.code_acceptance_activity_count;
      ls.locAdded += langFeature.loc_added_sum;
      ls.locDeleted += langFeature.loc_deleted_sum;
      ls.locSuggestedToAdd += langFeature.loc_suggested_to_add_sum;
      ls.locSuggestedToDelete += langFeature.loc_suggested_to_delete_sum;
      ls.users.add(userId);
    }

    // --- Totals by Model Feature (Stats, Daily Model Usage, Daily PRU, Model Feature Dist, Agent Heatmap) ---
    for (const modelFeature of metric.totals_by_model_feature) {
      const model = modelFeature.model;
      const modelLower = model.toLowerCase();
      const interactions = modelFeature.user_initiated_interaction_count;
      const multiplier = getModelMultiplier(modelLower);
      const prus = interactions * multiplier;
      const isPremium = isPremiumModel(modelLower);

      // Stats: Model Engagements
      const currentModelEng = modelEngagements.get(model) || 0;
      modelEngagements.set(model, currentModelEng + modelFeature.code_generation_activity_count + modelFeature.code_acceptance_activity_count);

      // Daily Model Usage
      if (!dailyModelUsage.has(date)) dailyModelUsage.set(date, { pruModels: 0, standardModels: 0, unknownModels: 0, totalPRUs: 0 });
      const dmu = dailyModelUsage.get(date)!;
      dmu.totalPRUs += prus;
      if (modelLower === 'unknown' || modelLower === '') dmu.unknownModels += interactions;
      else if (multiplier === 0) dmu.standardModels += interactions;
      else dmu.pruModels += interactions;

      // Daily PRU Analysis
      if (!dailyPRU.has(date)) dailyPRU.set(date, { pruRequests: 0, standardRequests: 0, totalPRUs: 0, modelStats: new Map() });
      const dpru = dailyPRU.get(date)!;
      dpru.totalPRUs += prus;
      if (multiplier === 0) dpru.standardRequests += interactions;
      else dpru.pruRequests += interactions;
      
      const existingModelStat = dpru.modelStats.get(modelLower);
      if (existingModelStat) {
        existingModelStat.requests += interactions;
        existingModelStat.prus += prus;
      } else {
        dpru.modelStats.set(modelLower, { requests: interactions, prus, multiplier, isPremium });
      }

      // Agent Mode Heatmap (PRUs part)
      if (modelFeature.feature === 'chat_panel_agent_mode') {
        if (!dailyAgentHeatmap.has(date)) dailyAgentHeatmap.set(date, { requests: 0, users: new Set(), totalPRUs: 0 });
        dailyAgentHeatmap.get(date)!.totalPRUs += prus;
      }

      // Model Feature Distribution
      if (!modelFeatureDist.has(modelLower)) modelFeatureDist.set(modelLower, { features: new Map(), totalInteractions: 0 });
      const mfd = modelFeatureDist.get(modelLower)!;
      mfd.totalInteractions += interactions;
      mfd.features.set(modelFeature.feature, (mfd.features.get(modelFeature.feature) || 0) + interactions);
    }

    // --- Totals by Feature (Chat Users, Chat Requests, Feature Adoption, Agent Heatmap, Impacts) ---
    
    // Feature Adoption Setup
    if (!userFeatures.has(userId)) userFeatures.set(userId, new Set());
    const uFeatures = userFeatures.get(userId)!;

    // Daily Chat Users & Requests Setup
    if (!dailyChatUsers.has(date)) dailyChatUsers.set(date, { askModeUsers: new Set(), agentModeUsers: new Set(), editModeUsers: new Set(), inlineModeUsers: new Set() });
    const dcu = dailyChatUsers.get(date)!;
    
    if (!dailyChatRequests.has(date)) dailyChatRequests.set(date, { askModeRequests: 0, agentModeRequests: 0, editModeRequests: 0, inlineModeRequests: 0 });
    const dcr = dailyChatRequests.get(date)!;

    // Impact Data Setup
    if (!dailyAgentImpact.has(date)) dailyAgentImpact.set(date, { locAdded: 0, locDeleted: 0, userCount: new Set() });
    if (!dailyCodeCompletionImpact.has(date)) dailyCodeCompletionImpact.set(date, { locAdded: 0, locDeleted: 0, userCount: new Set() });
    if (!dailyEditModeImpact.has(date)) dailyEditModeImpact.set(date, { locAdded: 0, locDeleted: 0, userIds: new Set() });
    if (!dailyInlineModeImpact.has(date)) dailyInlineModeImpact.set(date, { locAdded: 0, locDeleted: 0, userIds: new Set() });
    if (!dailyAskModeImpact.has(date)) dailyAskModeImpact.set(date, { locAdded: 0, locDeleted: 0, userIds: new Set() });
    if (!dailyJoinedImpact.has(date)) dailyJoinedImpact.set(date, { locAdded: 0, locDeleted: 0, userIds: new Set() });

    // Agent Impact Helper
    let agentLocAdded = 0;
    let agentLocDeleted = 0;
    let hasAgentActivity = false;

    // Joined Impact Helper
    let joinedLocAdded = 0;
    let joinedLocDeleted = 0;
    let hasJoinedActivity = false;
    const joinedFeatures = ['code_completion', 'chat_panel_ask_mode', 'chat_panel_edit_mode', 'chat_inline', 'chat_panel_agent_mode', 'agent_edit'];

    for (const feature of metric.totals_by_feature) {
      // Feature Adoption
      if (feature.user_initiated_interaction_count > 0 || feature.code_generation_activity_count > 0) {
        uFeatures.add(feature.feature);
      }

      // Chat Users & Requests
      if (feature.user_initiated_interaction_count > 0) {
        switch (feature.feature) {
          case 'chat_panel_ask_mode':
            dcu.askModeUsers.add(userId);
            dcr.askModeRequests += feature.user_initiated_interaction_count;
            break;
          case 'chat_panel_agent_mode':
            dcu.agentModeUsers.add(userId);
            dcr.agentModeRequests += feature.user_initiated_interaction_count;
            break;
          case 'chat_panel_edit_mode':
            dcu.editModeUsers.add(userId);
            dcr.editModeRequests += feature.user_initiated_interaction_count;
            break;
          case 'chat_inline':
            dcu.inlineModeUsers.add(userId);
            dcr.inlineModeRequests += feature.user_initiated_interaction_count;
            break;
        }
      }

      // Agent Heatmap (Requests part)
      if (feature.feature === 'chat_panel_agent_mode' && feature.user_initiated_interaction_count > 0) {
        if (!dailyAgentHeatmap.has(date)) dailyAgentHeatmap.set(date, { requests: 0, users: new Set(), totalPRUs: 0 });
        const dah = dailyAgentHeatmap.get(date)!;
        dah.requests += feature.user_initiated_interaction_count;
        dah.users.add(userId);
      }

      // Impact Data
      const locAdded = feature.loc_added_sum || 0;
      const locDeleted = feature.loc_deleted_sum || 0;
      const hasLoc = locAdded > 0 || locDeleted > 0;

      // Agent Impact
      if (feature.feature === 'agent_edit' || feature.feature === 'chat_panel_agent_mode') {
        if (hasLoc) {
          agentLocAdded += locAdded;
          agentLocDeleted += locDeleted;
          hasAgentActivity = true;
        }
      }

      // Code Completion Impact
      if (feature.feature === 'code_completion' && hasLoc) {
        const d = dailyCodeCompletionImpact.get(date)!;
        d.locAdded += locAdded;
        d.locDeleted += locDeleted;
        d.userCount.add(userId);
      }

      // Edit Mode Impact
      if (feature.feature === 'chat_panel_edit_mode' && hasLoc) {
        const d = dailyEditModeImpact.get(date)!;
        d.locAdded += locAdded;
        d.locDeleted += locDeleted;
        d.userIds.add(userId);
      }

      // Inline Mode Impact
      if (feature.feature === 'chat_inline' && hasLoc) {
        const d = dailyInlineModeImpact.get(date)!;
        d.locAdded += locAdded;
        d.locDeleted += locDeleted;
        d.userIds.add(userId);
      }

      // Ask Mode Impact
      if (feature.feature === 'chat_panel_ask_mode' && hasLoc) {
        const d = dailyAskModeImpact.get(date)!;
        d.locAdded += locAdded;
        d.locDeleted += locDeleted;
        d.userIds.add(userId);
      }

      // Joined Impact
      if (joinedFeatures.includes(feature.feature) && hasLoc) {
        joinedLocAdded += locAdded;
        joinedLocDeleted += locDeleted;
        hasJoinedActivity = true;
      }
    }

    if (hasAgentActivity) {
      const d = dailyAgentImpact.get(date)!;
      d.locAdded += agentLocAdded;
      d.locDeleted += agentLocDeleted;
      d.userCount.add(userId);
    }

    if (hasJoinedActivity) {
      const d = dailyJoinedImpact.get(date)!;
      d.locAdded += joinedLocAdded;
      d.locDeleted += joinedLocDeleted;
      d.userIds.add(userId);
    }
  }

  // 3. Post-Processing & Formatting

  // Stats
  let chatUsersCount = 0;
  let agentUsersCount = 0;
  let completionOnlyUsersCount = 0;
  for (const usage of userUsageMap.values()) {
    if (usage.used_chat) chatUsersCount++;
    if (usage.used_agent) agentUsersCount++;
    if (!usage.used_chat && !usage.used_agent) completionOnlyUsersCount++;
  }

  const topLanguageEntry = Array.from(languageEngagements.entries()).sort((a, b) => b[1] - a[1])[0];
  const topLanguage = topLanguageEntry ? { name: topLanguageEntry[0], engagements: topLanguageEntry[1] } : { name: 'N/A', engagements: 0 };

  const topIdeEntry = Array.from(ideUsers.entries()).map(([ide, userSet]) => [ide, userSet.size] as [string, number]).sort((a, b) => b[1] - a[1])[0];
  const topIde = topIdeEntry ? { name: topIdeEntry[0], entries: topIdeEntry[1] } : { name: 'N/A', entries: 0 };

  const topModelEntry = Array.from(modelEngagements.entries()).sort((a, b) => b[1] - a[1])[0];
  const topModel = topModelEntry ? { name: topModelEntry[0], engagements: topModelEntry[1] } : { name: 'N/A', engagements: 0 };

  const firstRecord = filteredMetrics[0];
  const stats: MetricsStats = {
    uniqueUsers: userUsageMap.size,
    chatUsers: chatUsersCount,
    agentUsers: agentUsersCount,
    completionOnlyUsers: completionOnlyUsersCount,
    reportStartDay: firstRecord?.report_start_day || '',
    reportEndDay: firstRecord?.report_end_day || '',
    totalRecords: filteredMetrics.length,
    topLanguage,
    topIde,
    topModel,
  };

  // User Summaries
  const userSummaries = Array.from(userMap.values()).map(user => ({
    ...user,
    days_active: userActiveDays.get(user.user_id)?.size || 0
  })).sort((a, b) => b.total_user_initiated_interactions - a.total_user_initiated_interactions);

  // Daily Engagement
  const engagementData = Array.from(dailyEngagement.entries())
    .map(([date, activeUsersSet]) => ({
      date,
      activeUsers: activeUsersSet.size,
      totalUsers: allUniqueUsersSet.size,
      engagementPercentage: allUniqueUsersSet.size > 0 ? Math.round((activeUsersSet.size / allUniqueUsersSet.size) * 100 * 100) / 100 : 0
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Daily Chat Users
  const chatUsersData = Array.from(dailyChatUsers.entries())
    .map(([date, data]) => ({
      date,
      askModeUsers: data.askModeUsers.size,
      agentModeUsers: data.agentModeUsers.size,
      editModeUsers: data.editModeUsers.size,
      inlineModeUsers: data.inlineModeUsers.size
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Daily Chat Requests
  const chatRequestsData = Array.from(dailyChatRequests.entries())
    .map(([date, data]) => ({
      date,
      ...data
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Language Stats
  const languageStats = Array.from(languageStatsMap.entries())
    .map(([language, s]) => ({
      language,
      totalGenerations: s.totalGenerations,
      totalAcceptances: s.totalAcceptances,
      totalEngagements: s.totalGenerations + s.totalAcceptances,
      uniqueUsers: s.users.size,
      locAdded: s.locAdded,
      locDeleted: s.locDeleted,
      locSuggestedToAdd: s.locSuggestedToAdd,
      locSuggestedToDelete: s.locSuggestedToDelete
    }))
    .sort((a, b) => b.totalEngagements - a.totalEngagements);

  // Daily Model Usage
  const modelUsageData = Array.from(dailyModelUsage.entries())
    .map(([date, data]) => ({
      date,
      pruModels: data.pruModels,
      standardModels: data.standardModels,
      unknownModels: data.unknownModels,
      totalPRUs: Math.round(data.totalPRUs * 100) / 100,
      serviceValue: Math.round(data.totalPRUs * SERVICE_VALUE_RATE * 100) / 100
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Feature Adoption
  let completionUsers = 0, chatUsers = 0, agentModeUsers = 0, askModeUsers = 0, editModeUsers = 0, inlineModeUsers = 0, codeReviewUsers = 0;
  for (const features of userFeatures.values()) {
    if (features.has('code_completion')) completionUsers++;
    if (features.has('chat_panel_unknown_mode') || features.has('chat_panel_ask_mode') || features.has('chat_panel_agent_mode') || features.has('chat_panel_edit_mode')) chatUsers++;
    if (features.has('chat_panel_agent_mode')) agentModeUsers++;
    if (features.has('chat_panel_ask_mode')) askModeUsers++;
    if (features.has('chat_panel_edit_mode')) editModeUsers++;
    if (features.has('chat_inline')) inlineModeUsers++;
    if (features.has('code_review')) codeReviewUsers++;
  }
  const featureAdoptionData = {
    totalUsers: userFeatures.size,
    completionUsers, chatUsers, agentModeUsers, askModeUsers, editModeUsers, inlineModeUsers, codeReviewUsers
  };

  // Daily PRU Analysis
  const pruAnalysisData = Array.from(dailyPRU.entries())
    .map(([date, data]) => {
      const total = data.pruRequests + data.standardRequests;
      const modelsArray = Array.from(data.modelStats.entries())
        .map(([name, stats]) => ({
          name,
          requests: stats.requests,
          prus: Math.round(stats.prus * 100) / 100,
          isPremium: stats.isPremium,
          multiplier: stats.multiplier
        }))
        .sort((a, b) => (b.prus - a.prus) || (b.requests - a.requests));
      const topModelEntry = modelsArray[0];
      return {
        date,
        pruRequests: data.pruRequests,
        standardRequests: data.standardRequests,
        pruPercentage: total > 0 ? Math.round((data.pruRequests / total) * 100 * 100) / 100 : 0,
        totalPRUs: Math.round(data.totalPRUs * 100) / 100,
        serviceValue: Math.round(data.totalPRUs * SERVICE_VALUE_RATE * 100) / 100,
        topModel: topModelEntry ? topModelEntry.name : 'unknown',
        topModelPRUs: topModelEntry ? topModelEntry.prus : 0,
        topModelIsPremium: topModelEntry ? topModelEntry.isPremium : false,
        models: modelsArray
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Agent Mode Heatmap
  const allRequests = Array.from(dailyAgentHeatmap.values()).map(d => d.requests);
  const maxRequests = Math.max(...allRequests, 1);
  const agentModeHeatmapData = Array.from(dailyAgentHeatmap.entries())
    .map(([date, data]) => ({
      date,
      agentModeRequests: data.requests,
      uniqueUsers: data.users.size,
      intensity: Math.ceil((data.requests / maxRequests) * 5),
      serviceValue: Math.round(data.totalPRUs * SERVICE_VALUE_RATE * 100) / 100
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Model Feature Distribution
  const modelFeatureDistributionData = Array.from(modelFeatureDist.entries())
    .map(([model, data]) => {
      const multiplier = getModelMultiplier(model);
      const totalPRUs = data.totalInteractions * multiplier;
      const features = {
        agentMode: data.features.get('chat_panel_agent_mode') || 0,
        askMode: data.features.get('chat_panel_ask_mode') || 0,
        editMode: data.features.get('chat_panel_edit_mode') || 0,
        inlineMode: data.features.get('chat_inline') || 0,
        codeCompletion: data.features.get('code_completion') || 0,
        codeReview: data.features.get('code_review') || 0,
        other: 0
      };
      const knownFeatureTotal = Object.values(features).reduce((sum, count) => sum + count, 0);
      features.other = Math.max(0, data.totalInteractions - knownFeatureTotal);
      const modelDisplayName = model === 'unknown' ? 'Unknown Model' : model.charAt(0).toUpperCase() + model.slice(1).replace(/-/g, ' ');
      return {
        model, modelDisplayName, multiplier, features,
        totalInteractions: data.totalInteractions,
        totalPRUs: Math.round(totalPRUs * 100) / 100,
        serviceValue: Math.round(totalPRUs * SERVICE_VALUE_RATE * 100) / 100
      };
    })
    .filter(item => item.totalInteractions > 0)
    .sort((a, b) => b.totalPRUs - a.totalPRUs);

  // Impact Data Helper
  const formatImpact = (map: Map<string, { locAdded: number; locDeleted: number; userCount?: Set<number>; userIds?: Set<number> }>) => 
    Array.from(map.entries())
      .map(([date, data]) => ({
        date,
        locAdded: data.locAdded,
        locDeleted: data.locDeleted,
        netChange: data.locAdded - data.locDeleted,
        userCount: (data.userCount || data.userIds)!.size,
        totalUniqueUsers: allUniqueUsersSet.size
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    metrics: filteredMetrics,
    stats,
    userSummaries,
    engagementData,
    chatUsersData,
    chatRequestsData,
    languageStats,
    modelUsageData,
    featureAdoptionData,
    pruAnalysisData,
    agentModeHeatmapData,
    modelFeatureDistributionData,
    agentImpactData: formatImpact(dailyAgentImpact),
    codeCompletionImpactData: formatImpact(dailyCodeCompletionImpact),
    editModeImpactData: formatImpact(dailyEditModeImpact),
    inlineModeImpactData: formatImpact(dailyInlineModeImpact),
    askModeImpactData: formatImpact(dailyAskModeImpact),
    joinedImpactData: formatImpact(dailyJoinedImpact)
  };
}
