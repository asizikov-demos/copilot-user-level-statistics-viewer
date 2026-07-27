import { translateFeature } from '../../../../domain/featureTranslations';
import type { LanguageFeatureImpactData } from '../../../../types/metrics';

interface LanguageFeatureImpactSectionProps {
  languageFeatureImpactData: LanguageFeatureImpactData;
}

export default function LanguageFeatureImpactSection({
  languageFeatureImpactData,
}: LanguageFeatureImpactSectionProps) {
  if (languageFeatureImpactData.rows.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">LOC Impact by Language and Feature</h3>
      <p className="text-sm text-gray-500 mb-4">
        Lines of code impacted (added + deleted) for top 10 languages, broken down by Copilot feature.
      </p>
      <div className="overflow-x-auto border border-gray-200">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Language
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              {languageFeatureImpactData.features.map((feature) => (
                <th
                  key={feature}
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {translateFeature(feature)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {languageFeatureImpactData.rows.map((row, index) => (
              <tr key={row.language} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {row.language}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                  {row.total.toLocaleString()}
                </td>
                {languageFeatureImpactData.features.map((feature) => (
                  <td
                    key={feature}
                    className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right"
                  >
                    {row.features[feature].toLocaleString()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
