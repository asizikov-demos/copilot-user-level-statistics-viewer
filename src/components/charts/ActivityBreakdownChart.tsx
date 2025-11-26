'use client';

import { useState, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { ChartData, ChartOptions } from 'chart.js';
import { registerChartJS } from '../../utils/chartSetup';
import { translateFeature } from '../../utils/featureTranslations';
import ChartContainer from '../ui/ChartContainer';

registerChartJS();

interface BaseAggregate {
  feature: string;
  code_generation_activity_count: number;
  code_acceptance_activity_count: number;
  loc_added_sum: number;
  loc_deleted_sum: number;
  loc_suggested_to_add_sum: number;
  loc_suggested_to_delete_sum: number;
}

interface ColumnConfig<T> {
  header: string;
  accessor: (item: T) => number;
}

interface ActivityBreakdownChartConfig<T extends BaseAggregate> {
  title: string;
  chartSubtitle: string;
  detailsLabel: string;
  unknownLabel: string;
  totalLabel: string;
  groupKey: keyof T;
  countAccessor: (item: T) => number;
  columns: ColumnConfig<T>[];
}

interface ActivityBreakdownChartProps<T extends BaseAggregate> {
  aggregates: T[];
  barChartData: ChartData<'bar'>;
  barChartOptions: ChartOptions<'bar'>;
  config: ActivityBreakdownChartConfig<T>;
}

export default function ActivityBreakdownChart<T extends BaseAggregate>({
  aggregates,
  barChartData,
  barChartOptions,
  config
}: ActivityBreakdownChartProps<T>) {
  const [isExpanded, setIsExpanded] = useState(false);

  const groupedAndSorted = useMemo(() => {
    const grouped = aggregates.reduce<Record<string, T[]>>((acc, item) => {
      const key = String(item[config.groupKey]);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      if (a === 'unknown' || a === '') return 1;
      if (b === 'unknown' || b === '') return -1;
      const totalA = grouped[a].reduce((sum, i) => sum + config.countAccessor(i), 0);
      const totalB = grouped[b].reduce((sum, i) => sum + config.countAccessor(i), 0);
      return totalB - totalA;
    });

    return { grouped, sortedKeys };
  }, [aggregates, config]);

  const hasBarChart = barChartData.datasets && barChartData.datasets.length > 0;

  const footer = (
    <div className="border-t border-gray-200 pt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <span className="text-sm font-medium text-gray-700">
          {config.detailsLabel}
        </span>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-4 overflow-x-auto">
          <div className="space-y-6">
            {groupedAndSorted.sortedKeys.map(key => {
              const items = groupedAndSorted.grouped[key];
              const total = items.reduce((sum, i) => sum + config.countAccessor(i), 0);
              return (
                <div key={key} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-800 mb-3 capitalize">
                    {key === 'unknown' || key === '' ? config.unknownLabel : key}
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      ({total.toLocaleString()} {config.totalLabel})
                    </span>
                  </h4>
                  <table className="w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                        {config.columns.map((col, idx) => (
                          <th key={idx} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {col.header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                            {translateFeature(item.feature)}
                          </td>
                          {config.columns.map((col, colIdx) => (
                            <td key={colIdx} className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              {col.accessor(item).toLocaleString()}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <ChartContainer title={config.title} footer={footer}>
      {hasBarChart && (
        <div className="mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-800 mb-4 text-center">{config.chartSubtitle}</h4>
            <div className="h-64">
              <Bar data={barChartData} options={barChartOptions} />
            </div>
          </div>
        </div>
      )}
    </ChartContainer>
  );
}
