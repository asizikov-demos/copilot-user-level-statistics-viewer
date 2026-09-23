import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ExecutiveSummaryReadModel } from '../../read-models/overview';
import ExecutiveSummaryView from '../ExecutiveSummaryView';

vi.mock('../charts/ModeImpactChart', () => ({ default: () => null }));
vi.mock('../charts/FeatureAdoptionChart', () => ({ default: () => null }));

const model: ExecutiveSummaryReadModel = {
  reportStartDay: '2026-09-01',
  reportEndDay: '2026-09-20',
  enterpriseId: null,
  joinedImpactData: [],
  agentImpactData: [],
  codeCompletionImpactData: [],
  featureAdoptionData: {
    totalUsers: 0,
    completionUsers: 0,
    completionOnlyUsers: 0,
    chatUsers: 0,
    agentModeUsers: 0,
    askModeUsers: 0,
    inlineModeUsers: 0,
    planModeUsers: 0,
    cliUsers: 0,
    appUsers: 0,
    vscodeAgentUsers: 0,
    codingAgentUsers: 0,
    codeReviewUsers: 0,
    advancedUsers: 0,
  },
};

describe('ExecutiveSummaryView enterprise identity', () => {
  it.each([
    {
      enterpriseName: 'Acme',
      enterpriseId: 'enterprise-123',
      expected: 'Acme (ID: enterprise-123)',
    },
    { enterpriseName: 'Acme', enterpriseId: null, expected: 'Acme' },
    { enterpriseName: null, enterpriseId: 'enterprise-123', expected: 'enterprise-123' },
    { enterpriseName: null, enterpriseId: null, expected: 'N/A' },
  ])('renders $expected', ({ enterpriseName, enterpriseId, expected }) => {
    const markup = renderToStaticMarkup(
      <ExecutiveSummaryView model={{ ...model, enterpriseId }} enterpriseName={enterpriseName} />
    );

    expect(markup).toContain(`Enterprise:</span> <span>${expected}</span>`);
  });
});
