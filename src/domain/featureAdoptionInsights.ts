import { FeatureAdoptionData } from './calculators/featureAdoptionCalculator';

export const PLANNING_MODE_DOCS_URL = 'https://code.visualstudio.com/docs/copilot/agents/planning';
export const CLI_DOCS_URL = 'https://docs.github.com/en/enterprise-cloud@latest/copilot/how-tos/copilot-cli/administer-copilot-cli-for-your-enterprise';

export interface FeatureAdoptionInsight {
  title: string;
  variant: 'green' | 'blue' | 'red' | 'orange' | 'purple';
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export function computeFeatureAdoptionInsights(data: FeatureAdoptionData): FeatureAdoptionInsight[] {
  const insights: FeatureAdoptionInsight[] = [];

  const totalUsers = data?.totalUsers ?? 0;
  if (totalUsers <= 0) return insights;

  const agentShare = (data.agentModeUsers / totalUsers) * 100;
  const planShare = (data.planModeUsers / totalUsers) * 100;
  const cliShare = (data.cliUsers / totalUsers) * 100;

  if (agentShare >= 5 && planShare < agentShare * 0.3) {
    insights.push({
      title: 'Promote Planning Mode',
      variant: 'blue',
      message: `Agent Mode adoption is ${agentShare.toFixed(1)}% but Planning Mode is only ${planShare.toFixed(1)}%. Encourage developers to start with Planning Mode to break work into actionable steps.`,
      ctaLabel: 'Planning Mode guide →',
      ctaHref: PLANNING_MODE_DOCS_URL,
    });
  }

  if (cliShare < 5) {
    insights.push({
      title: 'Low CLI Adoption',
      variant: 'orange',
      message: `Only ${cliShare.toFixed(1)}% of Copilot users have tried the CLI. Promote CLI in onboarding or internal channels to increase adoption.`,
      ctaLabel: 'Admin setup guide →',
      ctaHref: CLI_DOCS_URL,
    });
  }

  return insights;
}
