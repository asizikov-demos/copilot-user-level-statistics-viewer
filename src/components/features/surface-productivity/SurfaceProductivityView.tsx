'use client';

import type { SurfaceProductivityReadModel } from '../../../read-models/surfaceProductivity';
import { ViewPanel } from '../../ui';
import DisclosureSection from '../../ui/DisclosureSection';
import CohortContextTable from './CohortContextTable';
import SurfaceComparisonTable from './SurfaceComparisonTable';
import SurfaceProductivityTrendChart from './SurfaceProductivityTrendChart';

interface SurfaceProductivityViewProps {
  model: SurfaceProductivityReadModel;
}

export default function SurfaceProductivityView({
  model,
}: SurfaceProductivityViewProps) {
  return (
    <ViewPanel
      headerProps={{
        title: 'Productivity by Copilot Surface',
        description:
          'Compare how active work and LOC impact are distributed across IDE, CLI, and Copilot App activity.',
      }}
      afterHeader={
        <div
          className="mt-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950"
          role="note"
        >
          <span className="font-semibold">Activity proxy, not causation.</span>{' '}
          Active days and LOC impact describe where Copilot-assisted work was
          observed. They do not measure code quality, engineering velocity, or
          individual developer performance.
        </div>
      }
      contentClassName="space-y-8"
    >
      <SurfaceComparisonTable summaries={model.surfaceSummaries} />

      <section id="surface-productivity-trend" className="scroll-mt-28">
        <SurfaceProductivityTrendChart model={model} />
      </section>

      <CohortContextTable cohorts={model.cohortSummaries} />

      <section
        id="surface-productivity-method"
        className="scroll-mt-28 rounded-md border border-[#d1d9e0] bg-white p-6"
      >
        <DisclosureSection
          label="How to read this view"
          containerClassName=""
          buttonClassName="flex w-full items-center justify-between rounded-md bg-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-100"
          contentClassName="mt-4 space-y-3 text-sm text-gray-600"
        >
          <p>
            <span className="font-medium text-gray-900">IDE activity</span> is
            detected from IDE-attributed interactions or LOC. CLI and Copilot
            App activity use their client totals, usage flags, and
            feature-attributed activity.
          </p>
          <p>
            <span className="font-medium text-gray-900">Active user-days</span>{' '}
            count one person once per day within each surface. A person using
            multiple surfaces on the same day contributes to each relevant
            surface.
          </p>
          <p>
            <span className="font-medium text-gray-900">Net LOC impact</span> is
            lines added minus lines deleted. IDE LOC comes from IDE-attributed
            totals; CLI and Copilot App LOC come from their feature-attributed
            totals.
          </p>
          <p>
            Surface comparisons are observational. Differences may reflect
            user role, task type, adoption maturity, or self-selection rather
            than an effect caused by the surface itself.
          </p>
        </DisclosureSection>
      </section>
    </ViewPanel>
  );
}
