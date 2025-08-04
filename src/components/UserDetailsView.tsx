import { CopilotMetrics } from '../types/metrics';
import { translateFeature } from '../utils/featureTranslations';

interface UserDetailsViewProps {
  userMetrics: CopilotMetrics[];
  userLogin: string;
  userId: number;
  onBack: () => void;
}

export default function UserDetailsView({ userMetrics, userLogin, userId, onBack }: UserDetailsViewProps) {
  // Calculate aggregated stats for this user
  const totalInteractions = userMetrics.reduce((sum, metric) => sum + metric.user_initiated_interaction_count, 0);
  const totalGeneration = userMetrics.reduce((sum, metric) => sum + metric.code_generation_activity_count, 0);
  const totalAcceptance = userMetrics.reduce((sum, metric) => sum + metric.code_acceptance_activity_count, 0);
  const totalGeneratedLoc = userMetrics.reduce((sum, metric) => sum + metric.generated_loc_sum, 0);
  const totalAcceptedLoc = userMetrics.reduce((sum, metric) => sum + metric.accepted_loc_sum, 0);
  const daysActive = userMetrics.length;
  const usedAgent = userMetrics.some(metric => metric.used_agent);
  const usedChat = userMetrics.some(metric => metric.used_chat);

  // Get latest plugin version info
  const latestPluginInfo = userMetrics
    .flatMap(metric => metric.totals_by_ide)
    .filter(ide => ide.last_known_plugin_version)
    .sort((a, b) => new Date(b.last_known_plugin_version!.sampled_at).getTime() - new Date(a.last_known_plugin_version!.sampled_at).getTime())[0];

  // Aggregate totals by feature
  const featureAggregates = userMetrics
    .flatMap(metric => metric.totals_by_feature)
    .reduce((acc, feature) => {
      const existing = acc.find(f => f.feature === feature.feature);
      if (existing) {
        existing.user_initiated_interaction_count += feature.user_initiated_interaction_count;
        existing.code_generation_activity_count += feature.code_generation_activity_count;
        existing.code_acceptance_activity_count += feature.code_acceptance_activity_count;
        existing.generated_loc_sum += feature.generated_loc_sum;
        existing.accepted_loc_sum += feature.accepted_loc_sum;
      } else {
        acc.push({ ...feature });
      }
      return acc;
    }, [] as typeof userMetrics[0]['totals_by_feature']);

  // Aggregate totals by IDE
  const ideAggregates = userMetrics
    .flatMap(metric => metric.totals_by_ide)
    .reduce((acc, ide) => {
      const existing = acc.find(i => i.ide === ide.ide);
      if (existing) {
        existing.user_initiated_interaction_count += ide.user_initiated_interaction_count;
        existing.code_generation_activity_count += ide.code_generation_activity_count;
        existing.code_acceptance_activity_count += ide.code_acceptance_activity_count;
        existing.generated_loc_sum += ide.generated_loc_sum;
        existing.accepted_loc_sum += ide.accepted_loc_sum;
      } else {
        acc.push({ ...ide });
      }
      return acc;
    }, [] as typeof userMetrics[0]['totals_by_ide']);

  // Aggregate totals by language and feature
  const languageFeatureAggregates = userMetrics
    .flatMap(metric => metric.totals_by_language_feature)
    .reduce((acc, item) => {
      const key = `${item.language}-${item.feature}`;
      const existing = acc.find(i => `${i.language}-${i.feature}` === key);
      if (existing) {
        existing.code_generation_activity_count += item.code_generation_activity_count;
        existing.code_acceptance_activity_count += item.code_acceptance_activity_count;
        existing.generated_loc_sum += item.generated_loc_sum;
        existing.accepted_loc_sum += item.accepted_loc_sum;
      } else {
        acc.push({ ...item });
      }
      return acc;
    }, [] as typeof userMetrics[0]['totals_by_language_feature']);

  // Aggregate totals by model and feature
  const modelFeatureAggregates = userMetrics
    .flatMap(metric => metric.totals_by_model_feature)
    .reduce((acc, item) => {
      const key = `${item.model}-${item.feature}`;
      const existing = acc.find(i => `${i.model}-${i.feature}` === key);
      if (existing) {
        existing.user_initiated_interaction_count += item.user_initiated_interaction_count;
        existing.code_generation_activity_count += item.code_generation_activity_count;
        existing.code_acceptance_activity_count += item.code_acceptance_activity_count;
        existing.generated_loc_sum += item.generated_loc_sum;
        existing.accepted_loc_sum += item.accepted_loc_sum;
      } else {
        acc.push({ ...item });
      }
      return acc;
    }, [] as typeof userMetrics[0]['totals_by_model_feature']);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{userLogin}</h2>
            <p className="text-gray-600">User ID: {userId}</p>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md transition-colors"
          >
            ← Back to Users
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{totalInteractions.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Total Interactions</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">{totalGeneration.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Code Generation</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-purple-600">{totalAcceptance.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Code Acceptance</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-orange-600">{totalGeneratedLoc.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Generated LOC</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-teal-600">{totalAcceptedLoc.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Accepted LOC</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-indigo-600">{daysActive}</div>
          <div className="text-sm text-gray-600">Days Active</div>
        </div>
      </div>

      {/* Features Used */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Features Used</h3>
        <div className="flex flex-wrap gap-2">
          {usedChat && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              Chat
            </span>
          )}
          {usedAgent && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              Agent
            </span>
          )}
          {!usedChat && !usedAgent && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
              Completion Only
            </span>
          )}
        </div>
      </div>

      {/* Latest Plugin Version */}
      {latestPluginInfo?.last_known_plugin_version && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Latest Plugin Version</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Plugin</div>
              <div className="font-medium">{latestPluginInfo.last_known_plugin_version.plugin}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Version</div>
              <div className="font-medium">{latestPluginInfo.last_known_plugin_version.plugin_version}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Last Seen</div>
              <div className="font-medium">{new Date(latestPluginInfo.last_known_plugin_version.sampled_at).toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* Totals by IDE */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity by IDE</h3>
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IDE</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interactions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acceptance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated LOC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accepted LOC</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ideAggregates.map((ide) => (
                <tr key={ide.ide}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ide.ide}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ide.user_initiated_interaction_count.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ide.code_generation_activity_count.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ide.code_acceptance_activity_count.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ide.generated_loc_sum.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ide.accepted_loc_sum.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals by Feature */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity by Feature</h3>
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interactions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acceptance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated LOC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accepted LOC</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {featureAggregates.map((feature) => (
                <tr key={feature.feature}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{translateFeature(feature.feature)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feature.user_initiated_interaction_count.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feature.code_generation_activity_count.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feature.code_acceptance_activity_count.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feature.generated_loc_sum.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feature.accepted_loc_sum.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals by Language and Feature */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity by Language and Feature</h3>
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Language</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acceptance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated LOC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accepted LOC</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {languageFeatureAggregates.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.language}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{translateFeature(item.feature)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.code_generation_activity_count.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.code_acceptance_activity_count.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.generated_loc_sum.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.accepted_loc_sum.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals by Model and Feature */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity by Model and Feature</h3>
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interactions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acceptance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated LOC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accepted LOC</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {modelFeatureAggregates.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.model}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{translateFeature(item.feature)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.user_initiated_interaction_count.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.code_generation_activity_count.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.code_acceptance_activity_count.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.generated_loc_sum.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.accepted_loc_sum.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
