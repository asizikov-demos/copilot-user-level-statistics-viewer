"use client";

import React, { useState, useMemo, useRef } from 'react';
import ModeImpactChart from './charts/ModeImpactChart';
import FeatureAdoptionChart from './charts/FeatureAdoptionChart';
import ModelsUsageChart from './charts/ModelsUsageChart';
import { ViewPanel } from './ui';
import type { CopilotMetrics } from '../types/metrics';
import type { FeatureAdoptionData, AgentImpactData, CodeCompletionImpactData, ModeImpactData } from '../domain/calculators/metricCalculators';
import { isPremiumModel } from '../domain/modelConfig';
import type { VoidCallback } from '../types/events';

interface CustomerEmailViewProps {
  metrics: CopilotMetrics[];
  featureAdoptionData: FeatureAdoptionData | null;
  joinedImpactData: ModeImpactData[];
  agentImpactData: AgentImpactData[];
  codeCompletionImpactData: CodeCompletionImpactData[];
  askModeImpactData: ModeImpactData[];
  onBack: VoidCallback;
}

export default function CustomerEmailView({
  metrics,
  featureAdoptionData,
  joinedImpactData,
  agentImpactData,
  codeCompletionImpactData,
  askModeImpactData,
  onBack
}: CustomerEmailViewProps) {
  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [enterpriseSlug, setEnterpriseSlug] = useState('');
  const [isCopilotStandalone, setIsCopilotStandalone] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'success' | 'error'>('idle');

// Escapes user text for safe HTML output
function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
  // Refs for chart containers
  const combinedImpactChartRef = useRef<HTMLDivElement>(null);
  const agentModeChartRef = useRef<HTMLDivElement>(null);
  const codeCompletionChartRef = useRef<HTMLDivElement>(null);
  const askModeChartRef = useRef<HTMLDivElement>(null);
  const featureAdoptionChartRef = useRef<HTMLDivElement>(null);
  const premiumModelsChartRef = useRef<HTMLDivElement>(null);

  // Calculate top model, skipping "unknown" if needed
  const { displayModelName, isTopModelPremium } = useMemo(() => {
    // Collect all model engagements from metrics
    const modelEngagements = new Map<string, number>();
    
    for (const metric of metrics) {
      for (const modelFeature of metric.totals_by_model_feature) {
        const model = modelFeature.model.toLowerCase();
        const current = modelEngagements.get(model) || 0;
        modelEngagements.set(
          model,
          current + modelFeature.code_generation_activity_count + modelFeature.code_acceptance_activity_count
        );
      }
    }

    // Sort models by engagement
    const sortedModels = Array.from(modelEngagements.entries())
      .sort((a, b) => b[1] - a[1]);

    // Find first model that's not "unknown"
    let selectedModel = sortedModels[0];
    if (selectedModel && selectedModel[0].toLowerCase() === 'unknown' && sortedModels.length > 1) {
      selectedModel = sortedModels[1];
    }

    const modelName = selectedModel ? selectedModel[0] : 'N/A';
    const isPremium = modelName !== 'N/A' ? isPremiumModel(modelName) : false;

    return {
      displayModelName: modelName,
      isTopModelPremium: isPremium
    };
  }, [metrics]);

  // Calculate total lines added for Agent Mode vs Code Completion
  const totalAgentLinesAdded = agentImpactData.reduce((sum, entry) => sum + entry.locAdded, 0);
  const totalCodeCompletionLinesAdded = codeCompletionImpactData.reduce((sum, entry) => sum + entry.locAdded, 0);
  const isAgentModeHealthy = totalAgentLinesAdded > totalCodeCompletionLinesAdded;

  // Calculate Agent Mode adoption percentage
  const agentModeAdoptionPercentage = useMemo(() => {
    if (!featureAdoptionData || featureAdoptionData.totalUsers === 0) {
      return 0;
    }
    return Math.round((featureAdoptionData.agentModeUsers / featureAdoptionData.totalUsers) * 100);
  }, [featureAdoptionData]);

  // Function to capture chart as base64 image
  const captureChartAsImage = (chartRef: React.RefObject<HTMLDivElement | null>): string | null => {
    if (!chartRef.current) return null;
    
    const canvas = chartRef.current.querySelector('canvas');
    if (!canvas) return null;
    
    try {
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error capturing chart:', error);
      return null;
    }
  };

  // Function to copy email with embedded images
  const copyEmailWithImages = async () => {
    setCopyStatus('copying');
    
    try {
      // Capture all charts as images
      const combinedImpactImage = captureChartAsImage(combinedImpactChartRef);
      const agentModeImage = captureChartAsImage(agentModeChartRef);
      const codeCompletionImage = captureChartAsImage(codeCompletionChartRef);
      const askModeImage = captureChartAsImage(askModeChartRef);
      const featureAdoptionImage = captureChartAsImage(featureAdoptionChartRef);
      const premiumModelsImage = captureChartAsImage(premiumModelsChartRef);

      // Build HTML email content
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; }
    p { margin: 12px 0; }
    a { color: #4F46E5; text-decoration: underline; }
    ul { margin: 12px 0; padding-left: 24px; }
    li { margin: 8px 0; }
    strong { font-weight: 600; }
    img { max-width: 100%; height: auto; margin: 20px 0; display: block; }
    .chart-title { font-weight: 600; margin: 24px 0 8px 0; font-size: 16px; }
  </style>
</head>
<body>

<p>Hi ${escapeHtml(contactName) || '[Contact Name]'},</p>

<p>I hope you're doing well. It's been a while since we last spoke.</p>

<p>I wanted to give you a few updates on GitHub Copilot.</p>

<p>We started Copilot Insights Dashboard and User-Level Statistics API Public Preview. You can find it at:<br>
<a href="https://github.com/enterprises/${enterpriseSlug || '[ENTERPRISE SLUG]'}/insights/copilot?period=28d&interval=1d">https://github.com/enterprises/${enterpriseSlug || '[ENTERPRISE SLUG]'}/insights/copilot?period=28d&interval=1d</a></p>

<p>You can find the documentation here:<br>
<a href="https://docs.github.com/en/enterprise-cloud@latest/copilot/concepts/copilot-metrics">https://docs.github.com/en/enterprise-cloud@latest/copilot/concepts/copilot-metrics</a></p>

<p>There you'll find valuable information about Copilot Adoption at ${companyName || '[Company Name]'}.</p>

<p>While the native dashboard is still under development and currently shows aggregate statistics, the user-level data (API or file export) provides useful insights. This is IDE-only data that doesn't take into account usage from other surfaces, such as Code Review, Copilot Coding Agent, and Chat in github.com.</p>

<p>I analyzed the export to show you what's possible.</p>

${isTopModelPremium ? `
<p>The top used model in your enterprise is <strong>${displayModelName}</strong>. This indicates a good utilization of included pre-payed Premium Model Requests.</p>
` : `
<p>The top used model in your enterprise is <strong>${displayModelName}</strong>. This is an unusual finding as an absolute majority of my customers have Premium Models enabled and actively used. ${companyName || '[Company Name]'} is entitled to them (incl. in the cost of the service) and they do perform better (both in terms of benchmarks, as well as anecdotally from words of my customers). There shall be no impact (financial or governance wise) on increasing Premium Models adoption and the benefits are substantial.</p>

<p>There are several ways to unlock power of Premium Models:</p>

<ul>
${!isCopilotStandalone ? `
  <li><a href="https://www.youtube.com/watch?v=HDEGFNAUkX8">Copilot Code Reviews</a>. You can find docs <a href="https://docs.github.com/en/copilot/how-tos/use-copilot-agents/request-a-code-review/use-code-review?tool=webui">here</a>.</li>
  <li><a href="https://docs.github.com/en/enterprise-cloud@latest/copilot/concepts/agents/coding-agent/about-coding-agent">Copilot Coding Agent</a>.</li>
` : ''}
  <li>More Complex tasks for Copilot Agent Mode</li>
  <li>Better quality answers in Copilot Chat Ask mode</li>
</ul>

<p>I'm happy to discuss them with you and help you gaining more value from the product.</p>
`}

<p>From the overall Copilot Impact point of view, things look pretty good.</p>

${combinedImpactImage ? `
<p class="chart-title">Combined Copilot Impact</p>
<img src="${combinedImpactImage}" alt="Combined Copilot Impact Chart" />
` : ''}

<p>${isAgentModeHealthy ? 'There is a healthy balance between autocomplete and Agent Mode.' : `Agent Mode seems to be underutilized in ${companyName || '[Company Name]'}.`}</p>

${agentModeImage ? `
<p class="chart-title">Copilot Agent Mode Impact</p>
<img src="${agentModeImage}" alt="Agent Mode Impact Chart" />
` : ''}

${codeCompletionImage ? `
<p class="chart-title">Code Completion Impact</p>
<img src="${codeCompletionImage}" alt="Code Completion Impact Chart" />
` : ''}

${askModeImage ? `
<p class="chart-title">Copilot Ask Mode Impact</p>
<img src="${askModeImage}" alt="Ask Mode Impact Chart" />
` : ''}

<p>Lines of Code (LoC) is not the best way to measure productivity impact, of course, but it's a good indicator of adoption level and the level of user engagement.</p>

<p>Feature adoption funnel as of today:</p>

${featureAdoptionImage ? `
<img src="${featureAdoptionImage}" alt="Feature Adoption Funnel Chart" />
` : ''}

${agentModeAdoptionPercentage < 30 ? `
<p>Agent Mode, the most advanced feature, has a rather low adoption rate. Currently used by ~${agentModeAdoptionPercentage}% of users. I suggest exploring why this might be happening. Your engineers might be facing technical issues, or they may simply be unaware of this capability and could benefit from some training.<br><br>Please let us know if you'd like help addressing this.</p>
` : agentModeAdoptionPercentage < 55 ? `
<p>Agent Mode, the most advanced feature, has a fair amount of users with some room for growth where it makes sense. It's currently used by ~${agentModeAdoptionPercentage}% of users.</p>
` : `
<p>Agent Mode, the most advanced feature, has great adoption levels. It's currently used by ~${agentModeAdoptionPercentage}% of users. I'm happy to see such numbers!</p>
`}

${premiumModelsImage ? `
<p class="chart-title">Premium Models Usage</p>
<img src="${premiumModelsImage}" alt="Premium Models Usage Chart" />
` : ''}

<p>I know this is quite a bit of information, and I apologize for the lengthy email. I hope you find it useful and insightful. Please feel free to reach out if you have any questions or if you'd like to discuss any of this together.</p>

<p>Kind regards,</p>

</body>
</html>
      `.trim();

      // Copy to clipboard with HTML format
      const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
      // Use DOMParser or a temporary DOM element to safely extract plain text
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      const plainText = tempDiv.textContent || tempDiv.innerText || "";
      const textBlob = new Blob([plainText], { type: 'text/plain' });
      
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        })
      ]);

      setCopyStatus('success');
      setTimeout(() => setCopyStatus('idle'), 3000);
    } catch (error) {
      console.error('Error copying email:', error);
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 3000);
    }
  };

  return (
    <ViewPanel
      headerProps={{
        title: 'Executive Summary Email',
        description: 'Curated summary of key Copilot impact, adoption, and premium model usage metrics suitable for sharing in a customer-facing update.',
        onBack,
      }}
      contentClassName="space-y-6"
    >
        {/* Input Fields Section */}
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-2">
                Contact Name
              </label>
              <input
                type="text"
                id="contactName"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Enter contact name"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              <input
                type="text"
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="enterpriseSlug" className="block text-sm font-medium text-gray-700 mb-2">
                Enterprise Slug
              </label>
              <input
                type="text"
                id="enterpriseSlug"
                value={enterpriseSlug}
                onChange={(e) => setEnterpriseSlug(e.target.value)}
                placeholder="Enter enterprise slug"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <input
              type="checkbox"
              id="isCopilotStandalone"
              checked={isCopilotStandalone}
              onChange={(e) => setIsCopilotStandalone(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="isCopilotStandalone" className="ml-2 block text-sm font-medium text-gray-700">
              Is Copilot Standalone
            </label>
          </div>
        </div>

      {/* Email Body Section */}
      <div className="mt-6 pt-6 border-t border-gray-200 flex justify-center">
        <div className="w-full" style={{ maxWidth: '900px' }}>
          <div className="mb-6 pb-4 border-b-2 border-gray-200 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Email Body</h3>
              <p className="text-sm text-gray-600 mt-1">Content ready to share with your customer</p>
            </div>
            <button
              onClick={copyEmailWithImages}
              disabled={copyStatus === 'copying'}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                copyStatus === 'success'
                  ? 'bg-green-600 text-white'
                  : copyStatus === 'error'
                  ? 'bg-red-600 text-white'
                  : copyStatus === 'copying'
                  ? 'bg-gray-400 text-white cursor-wait'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {copyStatus === 'copying' && '⏳ Copying...'}
              {copyStatus === 'success' && '✓ Copied!'}
              {copyStatus === 'error' && '✗ Failed'}
              {copyStatus === 'idle' && '📋 Copy Email with Charts'}
            </button>
          </div>

          {/* Email Text Content */}
          <div className="mb-8 prose prose-sm max-w-none text-gray-700 space-y-4">
          <p>Hi {contactName || '[Contact Name]'},</p>
          
          <p>I hope you&apos;re doing well. It&apos;s been a while since we last spoke.</p>
          
          <p>I wanted to give you a few updates on GitHub Copilot.</p>
          
          <p>
            We started Copilot Insights Dashboard and User-Level Statistics API Public Preview.
            You can find it at:
            <br />
            <a 
              href={`https://github.com/enterprises/${enterpriseSlug || 'ENTERPRISE'}/insights/copilot?period=28d&interval=1d`}
              className="text-indigo-600 hover:text-indigo-800 underline break-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://github.com/enterprises/{enterpriseSlug || '[ENTERPRISE SLUG]'}/insights/copilot?period=28d&interval=1d
            </a>
          </p>
          
          <p>
            You can find the documentation here:
            <br />
            <a 
              href="https://docs.github.com/en/enterprise-cloud@latest/copilot/concepts/copilot-metrics"
              className="text-indigo-600 hover:text-indigo-800 underline break-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://docs.github.com/en/enterprise-cloud@latest/copilot/concepts/copilot-metrics
            </a>
          </p>
          
          <p>
            There you&apos;ll find valuable information about Copilot Adoption at {companyName || '[Company Name]'}.
          </p>
          
          <p>
            While the native dashboard is still under development and currently shows aggregate statistics, 
            the user-level data (API or file export) provides useful insights. This is IDE-only data that 
            doesn&apos;t take into account usage from other surfaces, such as Code Review, Copilot Coding Agent, 
            and Chat in github.com.
          </p>
          
          <p>I analyzed the export to show you what&apos;s possible.</p>
          
          {isTopModelPremium ? (
            <p>
              The top used model in your enterprise is <strong>{displayModelName}</strong>. 
              This indicates a good utilization of included pre-payed Premium Model Requests.
            </p>
          ) : (
            <>
              <p>
                The top used model in your enterprise is <strong>{displayModelName}</strong>. 
                This is an unusual finding as an absolute majority of my customers have Premium Models enabled and actively used. 
                {companyName || '[Company Name]'} is entitled to them (incl. in the cost of the service) and they do perform better 
                (both in terms of benchmarks, as well as anecdotally from words of my customers). There shall be no impact 
                (financial or governance wise) on increasing Premium Models adoption and the benefits are substantial.
              </p>
              
              <p>There are several ways to unlock power of Premium Models:</p>
              
              <ul className="list-disc pl-6 space-y-2">
                {!isCopilotStandalone && (
                  <>
                    <li>
                      <a 
                        href="https://www.youtube.com/watch?v=HDEGFNAUkX8"
                        className="text-indigo-600 hover:text-indigo-800 underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Copilot Code Reviews
                      </a>
                      . You can find docs{' '}
                      <a 
                        href="https://docs.github.com/en/copilot/how-tos/use-copilot-agents/request-a-code-review/use-code-review?tool=webui"
                        className="text-indigo-600 hover:text-indigo-800 underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        here
                      </a>
                      .
                    </li>
                    <li>
                      <a 
                        href="https://docs.github.com/en/enterprise-cloud@latest/copilot/concepts/agents/coding-agent/about-coding-agent"
                        className="text-indigo-600 hover:text-indigo-800 underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Copilot Coding Agent
                      </a>
                      .
                    </li>
                  </>
                )}
                <li>More Complex tasks for Copilot Agent Mode</li>
                <li>Better quality answers in Copilot Chat Ask mode</li>
              </ul>
              <p>I&apos;m happy to discuss them with you and help you gaining more value from the product.</p>
            </>
          )}
          
          <p>
            From the overall Copilot Impact point of view, things look pretty good.</p>
        </div>

        {/* Charts Section */}
        <div className="space-y-8">
          <div ref={combinedImpactChartRef}>
            <ModeImpactChart
              data={joinedImpactData || []}
              title="Combined Copilot Impact"
              description="Aggregate impact across Code Completion, Agent Mode, Edit Mode, and Inline Mode activities."
              emptyStateMessage="No combined impact data available."
            />
          </div>
          
          <div className="prose prose-sm max-w-none text-gray-700">
            <p>
              {isAgentModeHealthy ? (
                <>There is a healthy balance between autocomplete and Agent Mode.</>
              ) : (
                <>Agent Mode seems to be underutilized in {companyName || '[Company Name]'}.</>
              )}
            </p>
          </div>

          <div ref={agentModeChartRef}>
            <ModeImpactChart
              data={agentImpactData || []}
              title="Copilot Agent Mode Impact"
              description="Daily lines of code added and deleted through Copilot Agent Mode sessions."
              emptyStateMessage="No agent mode impact data available."
            />
          </div>

          <div ref={askModeChartRef}>
            <ModeImpactChart
              data={askModeImpactData || []}
              title="Copilot Ask Mode Impact"
              description="Daily lines of code added and deleted through Copilot Chat Ask Mode sessions."
              emptyStateMessage="No Ask Mode impact data available."
            />
          </div>

          <div ref={codeCompletionChartRef}>
            <ModeImpactChart
              data={codeCompletionImpactData || []}
              title="Code Completion Impact"
              description="Daily lines of code added and deleted when developers accept Copilot code completions."
              emptyStateMessage="No code completion impact data available."
            />
          </div>
          
          <div className="prose prose-sm max-w-none text-gray-700">
            <p>
              Lines of Code (LoC) is not the best way to measure productivity impact, of course, but it&apos;s a good indicator of adoption level and the level of user engagement.
            </p>
          </div>

          <p>Feature adoption funnel as of today:</p>
          <div ref={featureAdoptionChartRef}>
            <FeatureAdoptionChart data={featureAdoptionData as FeatureAdoptionData} />
          </div>
          
          <div className="prose prose-sm max-w-none text-gray-700">
            {agentModeAdoptionPercentage < 30 ? (
              <p>
                Agent Mode, the most advanced feature, has a rather low adoption rate. 
                Currently used by ~{agentModeAdoptionPercentage}% of users. 
                I suggest exploring why this might be happening. Your engineers might be facing technical issues, 
                or they may simply be unaware of this capability and could benefit from some training.
                <br /><br />
                Please let us know if you&apos;d like help addressing this.
              </p>
            ) : agentModeAdoptionPercentage < 55 ? (
              <p>
                Agent Mode, the most advanced feature, has a fair amount of users with some room for growth where it makes sense. 
                It&apos;s currently used by ~{agentModeAdoptionPercentage}% of users.
              </p>
            ) : (
              <p>
                Agent Mode, the most advanced feature, has great adoption levels. 
                It&apos;s currently used by ~{agentModeAdoptionPercentage}% of users. I&apos;m happy to see such numbers!
              </p>
            )}
          </div>
          
          <div ref={premiumModelsChartRef}>
            <ModelsUsageChart metrics={metrics} variant="premium" />
          </div>

          {/* Email Closing */}
          <div className="mt-8 prose prose-sm max-w-none text-gray-700 space-y-4">
            <p>
              I know this is quite a bit of information, and I apologize for the lengthy email. 
              I hope you find it useful and insightful. Please feel free to reach out if you have any questions 
              or if you&apos;d like to discuss any of this together.
            </p>
            <p>Kind regards,</p>
          </div>
        </div>
        </div>
      </div>
    </ViewPanel>
  );
}
