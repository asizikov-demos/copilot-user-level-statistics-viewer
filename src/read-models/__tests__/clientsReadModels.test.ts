import { describe, expect, it } from 'vitest';
import { makeAggregatedMetrics } from '../../__tests__/factories/aggregatedMetrics';
import type { AggregatedMetrics } from '../../types/aggregatedMetrics';
import {
  selectClientsReadModel,
  selectClientVersionsReadModel,
} from '../clients';

function makeClientMetrics(): AggregatedMetrics {
  const defaults = makeAggregatedMetrics();

  return makeAggregatedMetrics({
    overview: {
      stats: {
        ...defaults.overview.stats,
        cliUsers: 7,
        reportStartDay: '2026-01-15',
      },
    },
    clients: {
      ideStats: [{
        ide: 'vscode',
        uniqueUsers: 4,
        cliOverlapUsers: 1,
        totalEngagements: 12,
        totalGenerations: 8,
        totalAcceptances: 5,
        locAdded: 21,
        locDeleted: 3,
        locSuggestedToAdd: 30,
        locSuggestedToDelete: 4,
      }],
      multiIDEUsersCount: 2,
      totalUniqueIDEUsers: 5,
      pluginVersionData: {
        jetbrains: [{
          version: '1.5.0',
          userCount: 2,
          usernames: ['octocat', 'hubot'],
        }],
        vscode: [{
          version: '1.250.0',
          userCount: 3,
          usernames: ['octocat', 'hubot', 'monalisa'],
        }],
        totalUniqueIntellijUsers: 2,
        totalUniqueVsCodeUsers: 3,
      },
    },
    cli: {
      dailyCliSessionData: [
        {
          date: '2026-01-15',
          sessionCount: 3,
          requestCount: 4,
          promptCount: 5,
          uniqueUsers: 2,
        },
        {
          date: '2026-01-16',
          sessionCount: 8,
          requestCount: 9,
          promptCount: 10,
          uniqueUsers: 3,
        },
      ],
    },
    impact: {
      cliImpactData: [
        {
          date: '2026-01-15',
          locAdded: 13,
          locDeleted: 2,
          netChange: 11,
          userCount: 2,
          totalUniqueUsers: 7,
        },
        {
          date: '2026-01-16',
          locAdded: 17,
          locDeleted: 5,
          netChange: 12,
          userCount: 3,
          totalUniqueUsers: 7,
        },
      ],
    },
  });
}

describe('client read models', () => {
  it('selects client fields and derives CLI session and LOC totals', () => {
    const metrics = makeClientMetrics();

    expect(selectClientsReadModel(metrics)).toEqual({
      telemetryWarnings: metrics.clients.telemetryWarnings,
      ideStats: metrics.clients.ideStats,
      multiIDEUsersCount: 2,
      totalUniqueIDEUsers: 5,
      cliUsers: 7,
      cliSessions: 11,
      cliLocAdded: 30,
      cliLocDeleted: 7,
      dailyIdeUsersData: metrics.clients.dailyIdeUsersData,
      reportStartDay: '2026-01-15',
      reportEndDay: '',
    });
  });

  it('uses additive totals without filtering or changing signed values', () => {
    const defaults = makeAggregatedMetrics();
    const metrics = makeAggregatedMetrics({
      overview: {
        stats: { ...defaults.overview.stats, cliUsers: -1 },
      },
      clients: {
        multiIDEUsersCount: -2,
        totalUniqueIDEUsers: -3,
      },
      cli: {
        dailyCliSessionData: [
          {
            date: 'invalid',
            sessionCount: 4.5,
            requestCount: 0,
            promptCount: 0,
            uniqueUsers: 0,
          },
          {
            date: '',
            sessionCount: -1.25,
            requestCount: 0,
            promptCount: 0,
            uniqueUsers: 0,
          },
        ],
      },
      impact: {
        cliImpactData: [
          {
            date: 'invalid',
            locAdded: 6.5,
            locDeleted: -2,
            netChange: 8.5,
            userCount: 0,
            totalUniqueUsers: 0,
          },
          {
            date: '',
            locAdded: -1.5,
            locDeleted: 3,
            netChange: -4.5,
            userCount: 0,
            totalUniqueUsers: 0,
          },
        ],
      },
    });

    expect(selectClientsReadModel(metrics)).toEqual({
      telemetryWarnings: [],
      ideStats: metrics.clients.ideStats,
      multiIDEUsersCount: -2,
      totalUniqueIDEUsers: -3,
      cliUsers: -1,
      cliSessions: 3.25,
      cliLocAdded: 5,
      cliLocDeleted: 1,
      dailyIdeUsersData: metrics.clients.dailyIdeUsersData,
      reportStartDay: '',
      reportEndDay: '',
    });
  });

  it('selects client version fields with the report start day', () => {
    const metrics = makeClientMetrics();

    expect(selectClientVersionsReadModel(metrics)).toEqual({
      telemetryWarnings: metrics.clients.telemetryWarnings,
      pluginVersionData: metrics.clients.pluginVersionData,
      reportStartDay: '2026-01-15',
    });
  });

  it('derives zero CLI totals from empty aggregates', () => {
    expect(selectClientsReadModel(makeAggregatedMetrics())).toMatchObject({
      cliSessions: 0,
      cliLocAdded: 0,
      cliLocDeleted: 0,
    });
  });

  it('passes report dates through verbatim without adding fallback semantics', () => {
    const defaults = makeAggregatedMetrics();
    const metrics = makeAggregatedMetrics({
      overview: {
        stats: {
          ...defaults.overview.stats,
          reportStartDay: 'not-a-report-date',
        },
      },
    });

    expect(selectClientVersionsReadModel(metrics).reportStartDay).toBe(
      'not-a-report-date'
    );
  });

  it('does not mutate the aggregate input', () => {
    const metrics = makeClientMetrics();
    const before = structuredClone(metrics);

    selectClientsReadModel(metrics);
    selectClientVersionsReadModel(metrics);

    expect(metrics).toEqual(before);
  });
});
