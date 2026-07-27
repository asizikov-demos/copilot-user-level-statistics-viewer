import type { DailyLanguageChartData } from '../../../../types/metrics';
import LanguageDailyChart from '../charts/LanguageDailyChart';

interface LanguageDailyChartsSectionProps {
  sectionId: string;
  dailyLanguageGenerationsData: DailyLanguageChartData;
  dailyLanguageLocData: DailyLanguageChartData;
}

export default function LanguageDailyChartsSection({
  sectionId,
  dailyLanguageGenerationsData,
  dailyLanguageLocData,
}: LanguageDailyChartsSectionProps) {
  return (
    <div id={sectionId} className="space-y-6 mt-6 pt-6 border-t border-gray-200 scroll-mt-28">
      <LanguageDailyChart chartData={dailyLanguageGenerationsData} variant="generations" />
      <LanguageDailyChart chartData={dailyLanguageLocData} variant="loc" />
    </div>
  );
}
