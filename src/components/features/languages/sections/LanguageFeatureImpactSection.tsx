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
    <div className="mt-6 pt-6 border-t border-default">
      <h3 className="text-lg font-semibold text-default mb-2">LOC Impact by Language and Feature</h3>
      <p className="text-sm text-muted mb-4">
        Lines of code impacted (added + deleted) for top 10 languages, broken down by Copilot feature.
      </p>
      <div className="overflow-x-auto border border-default">
        <table className="w-full divide-y divide-default">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                Language
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                Total
              </th>
              {languageFeatureImpactData.features.map((feature) => (
                <th
                  key={feature}
                  className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider"
                >
                  {translateFeature(feature)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-default divide-y divide-default">
            {languageFeatureImpactData.rows.map((row, index) => (
              <tr key={row.language} className={index % 2 === 0 ? 'bg-default' : 'bg-muted'}>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-default">
                  {row.language}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-default text-right font-medium">
                  {row.total.toLocaleString()}
                </td>
                {languageFeatureImpactData.features.map((feature) => (
                  <td
                    key={feature}
                    className="px-4 py-3 whitespace-nowrap text-sm text-default text-right"
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
