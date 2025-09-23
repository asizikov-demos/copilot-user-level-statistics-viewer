"use client";

import React from 'react';
import CodingAgentImpactChart from './CodingAgentImpactChart';
import CodeCompletionImpactChart from './CodeCompletionImpactChart';

interface CopilotImpactViewProps {
  agentImpactData: any[]; // using existing loose typing pattern in charts
  codeCompletionImpactData: any[];
  onBack: () => void;
}

export default function CopilotImpactView({ agentImpactData, codeCompletionImpactData, onBack }: CopilotImpactViewProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Copilot Impact Analysis</h2>
          <p className="text-gray-600 text-sm mt-1 max-w-2xl">
            Analyze the impact and productivity gains from Copilot features, including code completion and agent mode contributions to your codebase.
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md transition-colors"
        >
          ← Back to Overview
        </button>
      </div>

      <div className="mb-10">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Coding Agent Impact</h3>
        <CodingAgentImpactChart data={agentImpactData || []} />
      </div>

      <div className="mb-10">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Code Completion Impact</h3>
        <CodeCompletionImpactChart data={codeCompletionImpactData || []} />
      </div>
    </div>
  );
}
