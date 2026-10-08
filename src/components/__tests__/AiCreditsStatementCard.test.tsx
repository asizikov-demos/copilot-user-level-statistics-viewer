import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AiCreditsStatementCard from '../AiCreditsStatementCard';
import type { AiCreditsStatement } from '../../read-models/aiCreditsStatement';

const statement: AiCreditsStatement = {
  activeUsers: 1248,
  usersInPhase: 1152,
  activeUserDays: 13473,
  avgDaysPerUser: 10.8,
  totalAiCreditsUsed: 421200,
  creditsPerUserDay: 31.3,
  monthlyCredits: [
    { key: '2026-08', shortLabel: 'Aug', aiCreditsUsed: 197800 },
    { key: '2026-09', shortLabel: 'Sep', aiCreditsUsed: 223400 },
  ],
  creditsPerActiveUser: 337.5,
  topDecile: { userCount: 125, creditsShare: 58.2 },
};

describe('AiCreditsStatementCard', () => {
  it('shows monthly credits, estimated spend, and the top 10% concentration when credits exist', () => {
    const html = renderToStaticMarkup(<AiCreditsStatementCard statement={statement} />);

    expect(html).toContain('Aug 197.8K · Sep 223.4K');
    expect(html).toContain('$3.38');
    expect(html).toContain('$4,212.00');
    expect(html).toContain('Top 10% of users');
    expect(html).toContain('58%');
    expect(html).not.toContain('No AI credit consumption was recorded');
  });

  it('shows an empty note instead of the concentration bar without credits', () => {
    const html = renderToStaticMarkup(
      <AiCreditsStatementCard statement={{ ...statement, totalAiCreditsUsed: 0, topDecile: null }} />
    );

    expect(html).toContain('No AI credit consumption was recorded');
    expect(html).not.toContain('Top 10% of users');
  });
});
