"use client";

import React from 'react';
import Link from 'next/link';
import { useMetricsData } from '../../components/MetricsContext';
import CodingAgentImpactChart from '../../components/CodingAgentImpactChart';
import CodeCompletionImpactChart from '../../components/CodeCompletionImpactChart';

export default function CopilotImpactPage() {
  const { filteredData } = useMetricsData();

  const agentImpactData = filteredData?.agentImpactData || [];
  const codeCompletionImpactData = filteredData?.codeCompletionImpactData || [];

  const hasData = agentImpactData.length > 0 || codeCompletionImpactData.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Copilot Impact Analysis</h1>
            <p className="text-gray-600 max-w-2xl text-sm">
              Analyze the impact and productivity gains from Copilot features, including code completion and agent mode contributions to your codebase.
            </p>
          </div>
          <Link href="/" className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors">
            ← Back to Overview
          </Link>
        </div>

        {!hasData && (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No Metrics Loaded</h2>
            <p className="text-gray-600 text-sm mb-4">Please upload a metrics JSON file on the overview page to view Copilot impact insights.</p>
            <Link href="/" className="inline-block px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors">Go to Overview</Link>
          </div>
        )}

        {hasData && (
          <>
            <div className="mb-10 bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Coding Agent Impact</h2>
              <CodingAgentImpactChart data={agentImpactData} />
            </div>

            <div className="mb-10 bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Code Completion Impact</h2>
              <CodeCompletionImpactChart data={codeCompletionImpactData} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
