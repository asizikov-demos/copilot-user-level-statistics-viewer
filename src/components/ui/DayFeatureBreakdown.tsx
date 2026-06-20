'use client';

import React, { useId, useState } from 'react';
import type { UserDayData } from '../../types/metrics';
import { translateFeature } from '../../domain/featureTranslations';

type FeatureRow = UserDayData['totals_by_feature'][number];
type LanguageFeatureRow = UserDayData['totals_by_language_feature'][number];
type ModelFeatureRow = UserDayData['totals_by_model_feature'][number];

interface DayFeatureBreakdownProps {
  totalsByFeature: FeatureRow[];
  totalsByLanguageFeature: LanguageFeatureRow[];
  totalsByModelFeature: ModelFeatureRow[];
}

interface BreakdownItem {
  name: string;
  generation: number;
  acceptance: number;
  locAdded: number;
  locDeleted: number;
}

function fmt(value: number): string {
  return value.toLocaleString();
}

function MetricChip({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap text-xs">
      <span className="text-gray-500">{label}</span>
      <span className={`font-semibold ${valueClassName ?? 'text-gray-900'}`}>{value}</span>
    </span>
  );
}

function BreakdownList({ title, items }: { title: string; items: BreakdownItem[] }) {
  return (
    <div>
      <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{title}</h5>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">No data</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.name} className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-gray-900 truncate">{item.name}</span>
              <span className="flex items-center gap-3 whitespace-nowrap text-xs text-gray-600">
                <span>Gen {fmt(item.generation)}</span>
                <span>Acc {fmt(item.acceptance)}</span>
                <span>
                  <span className="text-green-600">+{fmt(item.locAdded)}</span>
                  {' / '}
                  <span className="text-red-600">-{fmt(item.locDeleted)}</span>
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FeatureCard({
  feature,
  languages,
  models,
}: {
  feature: FeatureRow;
  languages: BreakdownItem[];
  models: BreakdownItem[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentId = useId();

  return (
    <div className="border border-[#d1d9e0] rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex items-center justify-between w-full gap-4 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        <span className="flex items-center gap-2 min-w-0">
          <svg
            className={`w-4 h-4 flex-shrink-0 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-semibold text-gray-900 truncate">{translateFeature(feature.feature)}</span>
        </span>
        <span className="flex items-center gap-4">
          <MetricChip label="Interactions" value={fmt(feature.user_initiated_interaction_count)} />
          <MetricChip label="Gen" value={fmt(feature.code_generation_activity_count)} />
          <MetricChip label="Acc" value={fmt(feature.code_acceptance_activity_count)} />
          <MetricChip label="LOC" value={`+${fmt(feature.loc_added_sum)} / -${fmt(feature.loc_deleted_sum)}`} />
        </span>
      </button>

      {isExpanded && (
        <div id={contentId} className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4 py-4 bg-white">
          <BreakdownList title="Languages" items={languages} />
          <BreakdownList title="Models" items={models} />
        </div>
      )}
    </div>
  );
}

export default function DayFeatureBreakdown({
  totalsByFeature,
  totalsByLanguageFeature,
  totalsByModelFeature,
}: DayFeatureBreakdownProps) {
  const features = [...totalsByFeature].sort(
    (a, b) =>
      b.user_initiated_interaction_count - a.user_initiated_interaction_count ||
      b.code_generation_activity_count - a.code_generation_activity_count
  );

  const languagesFor = (feature: string): BreakdownItem[] =>
    totalsByLanguageFeature
      .filter((row) => row.feature === feature)
      .map((row) => ({
        name: row.language || 'Unknown',
        generation: row.code_generation_activity_count,
        acceptance: row.code_acceptance_activity_count,
        locAdded: row.loc_added_sum,
        locDeleted: row.loc_deleted_sum,
      }))
      .sort((a, b) => b.generation - a.generation || b.acceptance - a.acceptance);

  const modelsFor = (feature: string): BreakdownItem[] =>
    totalsByModelFeature
      .filter((row) => row.feature === feature)
      .map((row) => ({
        name: row.model || 'Unknown',
        generation: row.code_generation_activity_count,
        acceptance: row.code_acceptance_activity_count,
        locAdded: row.loc_added_sum,
        locDeleted: row.loc_deleted_sum,
      }))
      .sort((a, b) => b.generation - a.generation || b.acceptance - a.acceptance);

  if (features.length === 0) {
    return <p className="text-sm text-gray-400">No feature activity recorded</p>;
  }

  return (
    <div className="space-y-3">
      {features.map((feature) => (
        <FeatureCard
          key={feature.feature}
          feature={feature}
          languages={languagesFor(feature.feature)}
          models={modelsFor(feature.feature)}
        />
      ))}
    </div>
  );
}
