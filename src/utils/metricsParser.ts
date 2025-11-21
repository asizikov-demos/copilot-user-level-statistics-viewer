import { CopilotMetrics, MetricsStats, UserSummary } from '../types/metrics';
import { SERVICE_VALUE_RATE, getModelMultiplier, isPremiumModel } from '../domain/modelConfig';

export function parseMetricsFile(fileContent: string): CopilotMetrics[] {
  const lines = fileContent.split('\n').filter(line => line.trim());
  const metrics: CopilotMetrics[] = [];

  for (const line of lines) {
    try {
      const parsedUnknown = JSON.parse(line) as unknown;
      if (typeof parsedUnknown !== 'object' || parsedUnknown === null) {
        console.warn('Skipping non-object JSON line');
        continue;
      }
      const parsedRaw = parsedUnknown as Record<string, unknown>;

      // Validation: reject old schema lines containing deprecated fields
      const hasDeprecatedRoot = 'generated_loc_sum' in parsedRaw || 'accepted_loc_sum' in parsedRaw;
      let hasDeprecatedNested = false;
      const tf = parsedRaw['totals_by_feature'];
      if (Array.isArray(tf)) {
        hasDeprecatedNested = tf.some(item => typeof item === 'object' && item !== null && ('generated_loc_sum' in (item as Record<string, unknown>) || 'accepted_loc_sum' in (item as Record<string, unknown>)));
      }
      if (hasDeprecatedRoot || hasDeprecatedNested) {
        console.warn('Skipping line with deprecated LOC fields (old schema not supported):', line.substring(0, 200));
        continue;
      }

      // Basic presence validation for new required fields
      const requiredRootFields: Array<keyof CopilotMetrics> = [
        'loc_added_sum',
        'loc_deleted_sum',
        'loc_suggested_to_add_sum',
        'loc_suggested_to_delete_sum'
      ];
      const missing = requiredRootFields.filter(f => !(f in parsedRaw));
      if (missing.length > 0) {
        console.warn('Skipping line missing new LOC fields:', missing.join(','));
        continue;
      }

  // We rely on upstream schema conformity; at runtime we only soft-validated key fields
  metrics.push(parsedRaw as unknown as CopilotMetrics);
    } catch (error) {
      console.warn('Failed to parse line:', line, error);
    }
  }

  return metrics;
}

export function filterUnknownLanguages(metrics: CopilotMetrics[]): CopilotMetrics[] {
  return metrics.map(metric => ({
    ...metric,
    totals_by_language_feature: metric.totals_by_language_feature.filter(
      item => item.language.toLowerCase() !== 'unknown' && item.language.trim() !== ''
    ),
    totals_by_language_model: metric.totals_by_language_model.filter(
      item => item.language.toLowerCase() !== 'unknown' && item.language.trim() !== ''
    )
  }));
}

export function calculateStats(metrics: CopilotMetrics[]): MetricsStats {
  if (metrics.length === 0) {
    return {
      uniqueUsers: 0,
      chatUsers: 0,
      agentUsers: 0,
      completionOnlyUsers: 0,
      reportStartDay: '',
      reportEndDay: '',
      totalRecords: 0,
      topLanguage: { name: 'N/A', engagements: 0 },
      topIde: { name: 'N/A', entries: 0 },
      topModel: { name: 'N/A', engagements: 0 },
    };
  }

  // Get unique users by user_id and their usage patterns
  const userUsageMap = new Map<number, { used_chat: boolean; used_agent: boolean }>();
  
  for (const metric of metrics) {
    const existingUsage = userUsageMap.get(metric.user_id) || { used_chat: false, used_agent: false };
    userUsageMap.set(metric.user_id, {
      used_chat: existingUsage.used_chat || metric.used_chat,
      used_agent: existingUsage.used_agent || metric.used_agent,
    });
  }

  // Count different user types
  let chatUsers = 0;
  let agentUsers = 0;
  let completionOnlyUsers = 0;

  for (const usage of userUsageMap.values()) {
    if (usage.used_chat) chatUsers++;
    if (usage.used_agent) agentUsers++;
    if (!usage.used_chat && !usage.used_agent) completionOnlyUsers++;
  }

  // Calculate top language by total engagements
  const languageEngagements = new Map<string, number>();
  for (const metric of metrics) {
    for (const langFeature of metric.totals_by_language_feature) {
      const current = languageEngagements.get(langFeature.language) || 0;
      languageEngagements.set(
        langFeature.language, 
        current + langFeature.code_generation_activity_count + langFeature.code_acceptance_activity_count
      );
    }
  }
  
  const sortedLanguages = Array.from(languageEngagements.entries())
    .sort((a, b) => b[1] - a[1]);
  
  const topLanguageEntry = sortedLanguages[0];
  const topLanguage = topLanguageEntry 
    ? { name: topLanguageEntry[0], engagements: topLanguageEntry[1] }
    : { name: 'N/A', engagements: 0 };

  // Calculate top IDE by number of unique users
  const ideUsers = new Map<string, Set<number>>();
  for (const metric of metrics) {
    for (const ideTotal of metric.totals_by_ide) {
      if (!ideUsers.has(ideTotal.ide)) {
        ideUsers.set(ideTotal.ide, new Set());
      }
      ideUsers.get(ideTotal.ide)!.add(metric.user_id);
    }
  }
  
  const topIdeEntry = Array.from(ideUsers.entries())
    .map(([ide, userSet]) => [ide, userSet.size] as [string, number])
    .sort((a, b) => b[1] - a[1])[0];
  const topIde = topIdeEntry 
    ? { name: topIdeEntry[0], entries: topIdeEntry[1] }
    : { name: 'N/A', entries: 0 };

  // Calculate top model by total engagements
  const modelEngagements = new Map<string, number>();
  for (const metric of metrics) {
    for (const modelFeature of metric.totals_by_model_feature) {
      const current = modelEngagements.get(modelFeature.model) || 0;
      modelEngagements.set(
        modelFeature.model, 
        current + modelFeature.code_generation_activity_count + modelFeature.code_acceptance_activity_count
      );
    }
  }
  
  const topModelEntry = Array.from(modelEngagements.entries())
    .sort((a, b) => b[1] - a[1])[0];
  const topModel = topModelEntry 
    ? { name: topModelEntry[0], engagements: topModelEntry[1] }
    : { name: 'N/A', engagements: 0 };
  
  // Get report period from first record (assuming all records have the same period)
  const firstRecord = metrics[0];
  
  return {
    uniqueUsers: userUsageMap.size,
    chatUsers,
    agentUsers,
    completionOnlyUsers,
    reportStartDay: firstRecord.report_start_day,
    reportEndDay: firstRecord.report_end_day,
    totalRecords: metrics.length,
    topLanguage,
    topIde,
    topModel,
  };
}

export function calculateUserSummaries(metrics: CopilotMetrics[]): UserSummary[] {
  const userMap = new Map<number, UserSummary>();

  for (const metric of metrics) {
    if (!userMap.has(metric.user_id)) {
      userMap.set(metric.user_id, {
        user_login: metric.user_login,
        user_id: metric.user_id,
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
    }

    const userSummary = userMap.get(metric.user_id)!;
    
    // Aggregate the totals
    userSummary.total_user_initiated_interactions += metric.user_initiated_interaction_count;
    userSummary.total_code_generation_activities += metric.code_generation_activity_count;
    userSummary.total_code_acceptance_activities += metric.code_acceptance_activity_count;
    userSummary.total_loc_added += metric.loc_added_sum;
    userSummary.total_loc_deleted += metric.loc_deleted_sum;
    userSummary.total_loc_suggested_to_add += metric.loc_suggested_to_add_sum;
    userSummary.total_loc_suggested_to_delete += metric.loc_suggested_to_delete_sum;
    userSummary.days_active += 1;
    userSummary.used_agent = userSummary.used_agent || metric.used_agent;
    userSummary.used_chat = userSummary.used_chat || metric.used_chat;
  }

  // Convert to array and sort by total activity
  return Array.from(userMap.values()).sort((a, b) => 
    b.total_user_initiated_interactions - a.total_user_initiated_interactions
  );
}

export interface DailyEngagementData {
  date: string;
  activeUsers: number;
  totalUsers: number;
  engagementPercentage: number;
}

export function calculateDailyEngagement(metrics: CopilotMetrics[]): DailyEngagementData[] {
  if (metrics.length === 0) return [];

  // Get all unique users
  const allUsers = new Set(metrics.map(m => m.user_id));
  const totalUsers = allUsers.size;

  // Group metrics by day - if there's an entry for a user, they're engaged
  const dailyMetrics = new Map<string, Set<number>>();
  
  for (const metric of metrics) {
    const date = metric.day;
    if (!dailyMetrics.has(date)) {
      dailyMetrics.set(date, new Set());
    }
    
    // If there's a metrics entry for this user on this day, they're engaged
    dailyMetrics.get(date)!.add(metric.user_id);
  }

  // Convert to array and calculate engagement percentages
  const engagementData: DailyEngagementData[] = Array.from(dailyMetrics.entries())
    .map(([date, activeUsersSet]) => {
      const activeUsers = activeUsersSet.size;
      const engagementPercentage = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
      
      return {
        date,
        activeUsers,
        totalUsers,
        engagementPercentage: Math.round(engagementPercentage * 100) / 100 // Round to 2 decimal places
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return engagementData;
}

export interface LanguageStats {
  language: string;
  totalGenerations: number;
  totalAcceptances: number;
  totalEngagements: number;
  uniqueUsers: number;
  locAdded: number;
  locDeleted: number;
  locSuggestedToAdd: number;
  locSuggestedToDelete: number;
}

export interface DailyChatUsersData {
  date: string;
  askModeUsers: number;
  agentModeUsers: number;
  editModeUsers: number;
  inlineModeUsers: number;
}

export function calculateDailyChatUsers(metrics: CopilotMetrics[]): DailyChatUsersData[] {
  if (metrics.length === 0) return [];

  // Group metrics by day and track users by chat mode
  const dailyMetrics = new Map<string, {
    askModeUsers: Set<number>;
    agentModeUsers: Set<number>;
    editModeUsers: Set<number>;
    inlineModeUsers: Set<number>;
  }>();
  
  for (const metric of metrics) {
    const date = metric.day;
    if (!dailyMetrics.has(date)) {
      dailyMetrics.set(date, {
        askModeUsers: new Set(),
        agentModeUsers: new Set(),
        editModeUsers: new Set(),
        inlineModeUsers: new Set()
      });
    }
    
    const dayData = dailyMetrics.get(date)!;
    
    // Check features for this user on this day
    for (const feature of metric.totals_by_feature) {
      if (feature.user_initiated_interaction_count > 0) {
        switch (feature.feature) {
          case 'chat_panel_ask_mode':
            dayData.askModeUsers.add(metric.user_id);
            break;
          case 'chat_panel_agent_mode':
            dayData.agentModeUsers.add(metric.user_id);
            break;
          case 'chat_panel_edit_mode':
            dayData.editModeUsers.add(metric.user_id);
            break;
          case 'chat_inline':
            dayData.inlineModeUsers.add(metric.user_id);
            break;
        }
      }
    }
  }

  // Convert to array and sort by date
  const chatUsersData: DailyChatUsersData[] = Array.from(dailyMetrics.entries())
    .map(([date, data]) => ({
      date,
      askModeUsers: data.askModeUsers.size,
      agentModeUsers: data.agentModeUsers.size,
      editModeUsers: data.editModeUsers.size,
      inlineModeUsers: data.inlineModeUsers.size
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return chatUsersData;
}

export interface DailyChatRequestsData {
  date: string;
  askModeRequests: number;
  agentModeRequests: number;
  editModeRequests: number;
  inlineModeRequests: number;
}

export function calculateDailyChatRequests(metrics: CopilotMetrics[]): DailyChatRequestsData[] {
  if (metrics.length === 0) return [];

  // Group metrics by day and sum requests by chat mode
  const dailyMetrics = new Map<string, {
    askModeRequests: number;
    agentModeRequests: number;
    editModeRequests: number;
    inlineModeRequests: number;
  }>();
  
  for (const metric of metrics) {
    const date = metric.day;
    if (!dailyMetrics.has(date)) {
      dailyMetrics.set(date, {
        askModeRequests: 0,
        agentModeRequests: 0,
        editModeRequests: 0,
        inlineModeRequests: 0
      });
    }
    
    const dayData = dailyMetrics.get(date)!;
    
    // Sum user initiated interactions for each chat mode
    for (const feature of metric.totals_by_feature) {
      switch (feature.feature) {
        case 'chat_panel_ask_mode':
          dayData.askModeRequests += feature.user_initiated_interaction_count;
          break;
        case 'chat_panel_agent_mode':
          dayData.agentModeRequests += feature.user_initiated_interaction_count;
          break;
        case 'chat_panel_edit_mode':
          dayData.editModeRequests += feature.user_initiated_interaction_count;
          break;
        case 'chat_inline':
          dayData.inlineModeRequests += feature.user_initiated_interaction_count;
          break;
      }
    }
  }

  // Convert to array and sort by date
  const chatRequestsData: DailyChatRequestsData[] = Array.from(dailyMetrics.entries())
    .map(([date, data]) => ({
      date,
      askModeRequests: data.askModeRequests,
      agentModeRequests: data.agentModeRequests,
      editModeRequests: data.editModeRequests,
      inlineModeRequests: data.inlineModeRequests
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return chatRequestsData;
}

export function calculateLanguageStats(metrics: CopilotMetrics[]): LanguageStats[] {
  const languageMap = new Map<string, {
    totalGenerations: number;
    totalAcceptances: number;
    locAdded: number;
    locDeleted: number;
    locSuggestedToAdd: number;
    locSuggestedToDelete: number;
    users: Set<number>;
  }>();

  for (const metric of metrics) {
    for (const langFeature of metric.totals_by_language_feature) {
      const language = langFeature.language;
      
      if (!languageMap.has(language)) {
        languageMap.set(language, {
          totalGenerations: 0,
          totalAcceptances: 0,
          locAdded: 0,
          locDeleted: 0,
          locSuggestedToAdd: 0,
          locSuggestedToDelete: 0,
          users: new Set()
        });
      }

      const langStats = languageMap.get(language)!;
      langStats.totalGenerations += langFeature.code_generation_activity_count;
      langStats.totalAcceptances += langFeature.code_acceptance_activity_count;
      langStats.locAdded += langFeature.loc_added_sum;
      langStats.locDeleted += langFeature.loc_deleted_sum;
      langStats.locSuggestedToAdd += langFeature.loc_suggested_to_add_sum;
      langStats.locSuggestedToDelete += langFeature.loc_suggested_to_delete_sum;
      langStats.users.add(metric.user_id);
    }
  }

  return Array.from(languageMap.entries())
    .map(([language, stats]) => ({
      language,
      totalGenerations: stats.totalGenerations,
      totalAcceptances: stats.totalAcceptances,
      totalEngagements: stats.totalGenerations + stats.totalAcceptances,
      uniqueUsers: stats.users.size,
      locAdded: stats.locAdded,
      locDeleted: stats.locDeleted,
      locSuggestedToAdd: stats.locSuggestedToAdd,
      locSuggestedToDelete: stats.locSuggestedToDelete
    }))
    .sort((a, b) => b.totalEngagements - a.totalEngagements);
}

export interface DailyModelUsageData {
  date: string;
  pruModels: number;
  standardModels: number;
  unknownModels: number;
  totalPRUs: number;
  serviceValue: number; // Value of premium services consumed (PRUs × SERVICE_VALUE_RATE)
}

export function calculateDailyModelUsage(metrics: CopilotMetrics[]): DailyModelUsageData[] {
  const dailyMetrics = new Map<string, {
    pruModels: number;
    standardModels: number;
    unknownModels: number;
    totalPRUs: number;
  }>();
  
  for (const metric of metrics) {
    const date = metric.day;
    if (!dailyMetrics.has(date)) {
      dailyMetrics.set(date, {
        pruModels: 0,
        standardModels: 0,
        unknownModels: 0,
        totalPRUs: 0
      });
    }
    
    const dayData = dailyMetrics.get(date)!;
    
    for (const modelFeature of metric.totals_by_model_feature) {
      const model = modelFeature.model.toLowerCase();
      const interactions = modelFeature.user_initiated_interaction_count;
      const multiplier = getModelMultiplier(model);
      const prus = interactions * multiplier;
      
      dayData.totalPRUs += prus;
      
      if (model === 'unknown' || model === '') {
        dayData.unknownModels += interactions;
      } else if (multiplier === 0) {
        dayData.standardModels += interactions;
      } else {
        dayData.pruModels += interactions;
      }
    }
  }

  return Array.from(dailyMetrics.entries())
    .map(([date, data]) => ({
      date,
      pruModels: data.pruModels,
      standardModels: data.standardModels,
      unknownModels: data.unknownModels,
      totalPRUs: Math.round(data.totalPRUs * 100) / 100,
  serviceValue: Math.round(data.totalPRUs * SERVICE_VALUE_RATE * 100) / 100
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export interface FeatureAdoptionData {
  totalUsers: number;
  completionUsers: number;
  chatUsers: number;
  agentModeUsers: number;
  askModeUsers: number;
  editModeUsers: number;
  inlineModeUsers: number;
  codeReviewUsers: number;
}

export function calculateFeatureAdoption(metrics: CopilotMetrics[]): FeatureAdoptionData {
  const userFeatures = new Map<number, Set<string>>();
  
  for (const metric of metrics) {
    if (!userFeatures.has(metric.user_id)) {
      userFeatures.set(metric.user_id, new Set());
    }
    
    const features = userFeatures.get(metric.user_id)!;
    
    for (const feature of metric.totals_by_feature) {
      if (feature.user_initiated_interaction_count > 0 || 
          feature.code_generation_activity_count > 0) {
        features.add(feature.feature);
      }
    }
  }
  
  let completionUsers = 0;
  let chatUsers = 0;
  let agentModeUsers = 0;
  let askModeUsers = 0;
  let editModeUsers = 0;
  let inlineModeUsers = 0;
  let codeReviewUsers = 0;
  
  for (const features of userFeatures.values()) {
    if (features.has('code_completion')) completionUsers++;
    if (features.has('chat_panel_unknown_mode') || 
        features.has('chat_panel_ask_mode') || 
        features.has('chat_panel_agent_mode') ||
        features.has('chat_panel_edit_mode')) chatUsers++;
    if (features.has('chat_panel_agent_mode')) agentModeUsers++;
    if (features.has('chat_panel_ask_mode')) askModeUsers++;
    if (features.has('chat_panel_edit_mode')) editModeUsers++;
    if (features.has('chat_inline')) inlineModeUsers++;
    if (features.has('code_review')) codeReviewUsers++;
  }
  
  return {
    totalUsers: userFeatures.size,
    completionUsers,
    chatUsers,
    agentModeUsers,
    askModeUsers,
    editModeUsers,
    inlineModeUsers,
    codeReviewUsers
  };
}

export interface DailyPRUAnalysisData {
  date: string;
  pruRequests: number;
  standardRequests: number;
  pruPercentage: number;
  totalPRUs: number;
  serviceValue: number; // Value of premium services consumed
  topModel: string;
  topModelPRUs: number;
  topModelIsPremium: boolean; // Explicit premium flag for the top model
  // Expanded model details for the day (new field; legacy single topModel fields retained for compatibility)
  models: Array<{
    name: string;           // canonical model name (lowercased)
    requests: number;       // total user initiated interactions for this model that day
    prus: number;           // total PRUs consumed (requests * multiplier)
    isPremium: boolean;     // whether model is premium (from isPremiumModel)
    multiplier: number;     // multiplier used for PRU calculation
  }>;
}

export function calculateDailyPRUAnalysis(metrics: CopilotMetrics[]): DailyPRUAnalysisData[] {
  const dailyMetrics = new Map<string, {
    pruRequests: number;
    standardRequests: number;
    totalPRUs: number;
    modelStats: Map<string, { requests: number; prus: number; multiplier: number; isPremium: boolean }>;
  }>();
  
  for (const metric of metrics) {
    const date = metric.day;
    if (!dailyMetrics.has(date)) {
      dailyMetrics.set(date, { 
        pruRequests: 0, 
        standardRequests: 0, 
        totalPRUs: 0,
        modelStats: new Map()
      });
    }

    const dayData = dailyMetrics.get(date)!;

    for (const modelFeature of metric.totals_by_model_feature) {
      const model = modelFeature.model.toLowerCase();
      const count = modelFeature.user_initiated_interaction_count;
      const multiplier = getModelMultiplier(model);
      const prus = count * multiplier;
      const premium = isPremiumModel(model);

      dayData.totalPRUs += prus;

      const existing = dayData.modelStats.get(model);
      if (existing) {
        existing.requests += count;
        existing.prus += prus;
      } else {
        dayData.modelStats.set(model, { requests: count, prus, multiplier, isPremium: premium });
      }

      if (multiplier === 0) {
        dayData.standardRequests += count;
      } else {
        dayData.pruRequests += count;
      }
    }
  }
  
  return Array.from(dailyMetrics.entries())
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
        // Sort models by PRUs (desc), then by requests (desc) for deterministic ordering
        .sort((a, b) => (b.prus - a.prus) || (b.requests - a.requests));
      const topModelEntry = modelsArray[0];
      const topModelName = topModelEntry ? topModelEntry.name : 'unknown';
      return {
        date,
        pruRequests: data.pruRequests,
        standardRequests: data.standardRequests,
        pruPercentage: total > 0 ? Math.round((data.pruRequests / total) * 100 * 100) / 100 : 0,
        totalPRUs: Math.round(data.totalPRUs * 100) / 100,
        serviceValue: Math.round(data.totalPRUs * SERVICE_VALUE_RATE * 100) / 100,
        topModel: topModelName,
        topModelPRUs: topModelEntry ? topModelEntry.prus : 0,
        topModelIsPremium: topModelEntry ? topModelEntry.isPremium : false,
        models: modelsArray
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export interface AgentModeHeatmapData {
  date: string;
  agentModeRequests: number;
  uniqueUsers: number;
  intensity: number; // 0-5 scale for heatmap coloring
  serviceValue: number; // Value of premium agent mode services
}

export function calculateAgentModeHeatmap(metrics: CopilotMetrics[]): AgentModeHeatmapData[] {
  const dailyMetrics = new Map<string, {
    requests: number;
    users: Set<number>;
    totalPRUs: number;
  }>();
  
  for (const metric of metrics) {
    const date = metric.day;
    if (!dailyMetrics.has(date)) {
      dailyMetrics.set(date, { requests: 0, users: new Set(), totalPRUs: 0 });
    }
    
    const dayData = dailyMetrics.get(date)!;
    
    // Check for agent mode usage
    for (const feature of metric.totals_by_feature) {
      if (feature.feature === 'chat_panel_agent_mode' && 
          feature.user_initiated_interaction_count > 0) {
        dayData.requests += feature.user_initiated_interaction_count;
        dayData.users.add(metric.user_id);
      }
    }
    
    // Calculate PRUs from agent mode interactions with specific models
    for (const modelFeature of metric.totals_by_model_feature) {
      if (modelFeature.feature === 'chat_panel_agent_mode') {
        const multiplier = getModelMultiplier(modelFeature.model);
        dayData.totalPRUs += modelFeature.user_initiated_interaction_count * multiplier;
      }
    }
  }
  
  const allRequests = Array.from(dailyMetrics.values()).map(d => d.requests);
  const maxRequests = Math.max(...allRequests, 1);
  
  return Array.from(dailyMetrics.entries())
    .map(([date, data]) => ({
      date,
      agentModeRequests: data.requests,
      uniqueUsers: data.users.size,
      intensity: Math.ceil((data.requests / maxRequests) * 5),
      serviceValue: Math.round(data.totalPRUs * SERVICE_VALUE_RATE * 100) / 100
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export interface ModelFeatureDistributionData {
  model: string;
  modelDisplayName: string;
  multiplier: number;
  features: {
    agentMode: number;
    askMode: number;
    editMode: number;
    inlineMode: number;
    codeCompletion: number;
    codeReview: number;
    other: number;
  };
  totalInteractions: number;
  totalPRUs: number;
  serviceValue: number; // Value of premium services consumed
}

export function calculateModelFeatureDistribution(metrics: CopilotMetrics[]): ModelFeatureDistributionData[] {
  const modelMap = new Map<string, {
    features: Map<string, number>;
    totalInteractions: number;
  }>();
  
  for (const metric of metrics) {
    for (const modelFeature of metric.totals_by_model_feature) {
      const model = modelFeature.model.toLowerCase();
      
      if (!modelMap.has(model)) {
        modelMap.set(model, {
          features: new Map(),
          totalInteractions: 0
        });
      }
      
      const modelData = modelMap.get(model)!;
      const currentFeatureCount = modelData.features.get(modelFeature.feature) || 0;
      modelData.features.set(modelFeature.feature, currentFeatureCount + modelFeature.user_initiated_interaction_count);
      modelData.totalInteractions += modelFeature.user_initiated_interaction_count;
    }
  }
  
  return Array.from(modelMap.entries())
    .map(([model, data]) => {
      const multiplier = getModelMultiplier(model);
      const totalPRUs = data.totalInteractions * multiplier;
      
      // Map features to standardized categories
      const features = {
        agentMode: data.features.get('chat_panel_agent_mode') || 0,
        askMode: data.features.get('chat_panel_ask_mode') || 0,
        editMode: data.features.get('chat_panel_edit_mode') || 0,
        inlineMode: data.features.get('chat_inline') || 0,
        codeCompletion: data.features.get('code_completion') || 0,
        codeReview: data.features.get('code_review') || 0,        
        other: 0
      };
      
      // Calculate "other" features
      const knownFeatureTotal = Object.values(features).reduce((sum, count) => sum + count, 0);
      features.other = Math.max(0, data.totalInteractions - knownFeatureTotal);
      
      // Create display name
      const modelDisplayName = model === 'unknown' ? 'Unknown Model' : 
        model.charAt(0).toUpperCase() + model.slice(1).replace(/-/g, ' ');
      
      return {
        model,
        modelDisplayName,
        multiplier,
        features,
        totalInteractions: data.totalInteractions,
        totalPRUs: Math.round(totalPRUs * 100) / 100,
        serviceValue: Math.round(totalPRUs * SERVICE_VALUE_RATE * 100) / 100
      };
    })
    .filter(item => item.totalInteractions > 0)
    .sort((a, b) => b.totalPRUs - a.totalPRUs);
}

export interface AgentImpactData {
  date: string;
  locAdded: number;
  locDeleted: number;
  netChange: number;
  userCount: number;
  totalUniqueUsers?: number; 
}

export function calculateAgentImpactData(metrics: CopilotMetrics[]): AgentImpactData[] {
  // Group by date and aggregate agent-related features data
  const dailyData = new Map<string, {
    locAdded: number;
    locDeleted: number;
    userCount: Set<number>;
  }>();
  
  // Track all unique users across all dates
  const allUniqueUsers = new Set<number>();

  metrics.forEach(metric => {
    // Look for both agent_edit and chat_panel_agent_mode features
    const agentEditFeature = metric.totals_by_feature.find(f => f.feature === 'agent_edit');
    const agentModeFeature = metric.totals_by_feature.find(f => f.feature === 'chat_panel_agent_mode');
    
    // Calculate total LOC changes from both features
    let totalLocAdded = 0;
    let totalLocDeleted = 0;
    let hasAgentActivity = false;
    
    if (agentEditFeature && (agentEditFeature.loc_added_sum > 0 || agentEditFeature.loc_deleted_sum > 0)) {
      totalLocAdded += agentEditFeature.loc_added_sum;
      totalLocDeleted += agentEditFeature.loc_deleted_sum;
      hasAgentActivity = true;
    }
    
    if (agentModeFeature && (agentModeFeature.loc_added_sum > 0 || agentModeFeature.loc_deleted_sum > 0)) {
      totalLocAdded += agentModeFeature.loc_added_sum;
      totalLocDeleted += agentModeFeature.loc_deleted_sum;
      hasAgentActivity = true;
    }
    
    if (hasAgentActivity) {
      const date = metric.day;
      
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          locAdded: 0,
          locDeleted: 0,
          userCount: new Set<number>()
        });
      }
      
      const dayData = dailyData.get(date)!;
      dayData.locAdded += totalLocAdded;
      dayData.locDeleted += totalLocDeleted;
      dayData.userCount.add(metric.user_id);
      allUniqueUsers.add(metric.user_id);
    }
  });

  // Convert to array and sort by date
  const result = Array.from(dailyData.entries())
    .map(([date, data]) => ({
      date,
      locAdded: data.locAdded,
      locDeleted: data.locDeleted,
      netChange: data.locAdded - data.locDeleted,
      userCount: data.userCount.size,
      totalUniqueUsers: allUniqueUsers.size
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
  return result;
}

export interface CodeCompletionImpactData {
  date: string;
  locAdded: number;
  locDeleted: number;
  netChange: number;
  userCount: number;
  totalUniqueUsers?: number;
}

export function calculateCodeCompletionImpactData(metrics: CopilotMetrics[]): CodeCompletionImpactData[] {
  // Group by date and aggregate code completion data
  const dailyData = new Map<string, {
    locAdded: number;
    locDeleted: number;
    userCount: Set<number>;
  }>();
  
  // Track all unique users across all dates
  const allUniqueUsers = new Set<number>();

  metrics.forEach(metric => {
    // Look for code_completion feature
    const codeCompletionFeature = metric.totals_by_feature.find(f => f.feature === 'code_completion');
    
    if (codeCompletionFeature && (codeCompletionFeature.loc_added_sum > 0 || codeCompletionFeature.loc_deleted_sum > 0)) {
      const date = metric.day;
      
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          locAdded: 0,
          locDeleted: 0,
          userCount: new Set<number>()
        });
      }
      
      const dayData = dailyData.get(date)!;
      dayData.locAdded += codeCompletionFeature.loc_added_sum;
      dayData.locDeleted += codeCompletionFeature.loc_deleted_sum;
      dayData.userCount.add(metric.user_id);
      allUniqueUsers.add(metric.user_id);
    }
  });

  // Convert to array and sort by date
  const result = Array.from(dailyData.entries())
    .map(([date, data]) => ({
      date,
      locAdded: data.locAdded,
      locDeleted: data.locDeleted,
      netChange: data.locAdded - data.locDeleted,
      userCount: data.userCount.size,
      totalUniqueUsers: allUniqueUsers.size
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
  return result;
}

export interface ModeImpactData {
  date: string;
  locAdded: number;
  locDeleted: number;
  netChange: number;
  userCount: number;
  totalUniqueUsers?: number;
}

function calculateFeatureImpactData(metrics: CopilotMetrics[], featureNames: string[]): ModeImpactData[] {
  if (metrics.length === 0 || featureNames.length === 0) {
    return [];
  }

  const dailyData = new Map<string, {
    locAdded: number;
    locDeleted: number;
    userIds: Set<number>;
  }>();

  const allDates = Array.from(new Set(metrics.map(metric => metric.day)));
  for (const date of allDates) {
    if (!dailyData.has(date)) {
      dailyData.set(date, {
        locAdded: 0,
        locDeleted: 0,
        userIds: new Set<number>(),
      });
    }
  }

  const allUniqueUsers = new Set<number>();

  for (const metric of metrics) {
    let totalLocAdded = 0;
    let totalLocDeleted = 0;
    let hasActivity = false;

    for (const feature of metric.totals_by_feature) {
      if (!featureNames.includes(feature.feature)) continue;

      const locAdded = feature.loc_added_sum || 0;
      const locDeleted = feature.loc_deleted_sum || 0;

      totalLocAdded += locAdded;
      totalLocDeleted += locDeleted;

      if (locAdded !== 0 || locDeleted !== 0) {
        hasActivity = true;
      }
    }

    const date = metric.day;
    const dayData = dailyData.get(date);
    if (!dayData) {
      continue;
    }

    if (hasActivity) {
      dayData.locAdded += totalLocAdded;
      dayData.locDeleted += totalLocDeleted;
      dayData.userIds.add(metric.user_id);
      allUniqueUsers.add(metric.user_id);
    }
  }

  return Array.from(dailyData.entries())
    .map(([date, data]) => ({
      date,
      locAdded: data.locAdded,
      locDeleted: data.locDeleted,
      netChange: data.locAdded - data.locDeleted,
      userCount: data.userIds.size,
      totalUniqueUsers: allUniqueUsers.size
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function calculateEditModeImpactData(metrics: CopilotMetrics[]): ModeImpactData[] {
  return calculateFeatureImpactData(metrics, ['chat_panel_edit_mode']);
}

export function calculateInlineModeImpactData(metrics: CopilotMetrics[]): ModeImpactData[] {
  return calculateFeatureImpactData(metrics, ['chat_inline']);
}

export function calculateAskModeImpactData(metrics: CopilotMetrics[]): ModeImpactData[] {
  return calculateFeatureImpactData(metrics, ['chat_panel_ask_mode']);
}

export function calculateJoinedImpactData(metrics: CopilotMetrics[]): ModeImpactData[] {
  return calculateFeatureImpactData(metrics, [
    'code_completion',
    'chat_panel_ask_mode',
    'chat_panel_edit_mode',
    'chat_inline',
    'chat_panel_agent_mode',
    'agent_edit'
  ]);
}
