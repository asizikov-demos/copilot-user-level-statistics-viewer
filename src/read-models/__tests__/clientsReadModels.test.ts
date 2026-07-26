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
    stats: {
      ...defaults.stats,
      cliUsers: 7,
      reportStartDay: '2026-01-15',
    },
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
  });
}

describe('client read models', () => {
  it('selects the exact clients shape and preserves the IDE stats reference', () => {
    const metrics = makeClientMetrics();

    const model = selectClientsReadModel(metrics);

    expect(model).toEqual({
      ideStats: metrics.ideStats,
      multiIDEUsersCount: 2,
      totalUniqueIDEUsers: 5,
      cliUsers: 7,
      cliSessions: 11,
      cliLocAdded: 30,
      cliLocDeleted: 7,
    });
    expect(model.ideStats).toBe(metrics.ideStats);
    expect(model.ideStats[0]).toBe(metrics.ideStats[0]);
    expect(Object.keys(model)).toEqual([
      'ideStats',
      'multiIDEUsersCount',
      'totalUniqueIDEUsers',
      'cliUsers',
      'cliSessions',
      'cliLocAdded',
      'cliLocDeleted',
    ]);
    expect(model).not.toHaveProperty('stats');
    expect(model).not.toHaveProperty('dailyCliSessionData');
    expect(model).not.toHaveProperty('cliImpactData');
    expect(model).not.toHaveProperty('pluginVersionData');
  });

  it('uses additive totals without filtering or changing signed values', () => {
    const defaults = makeAggregatedMetrics();
    const metrics = makeAggregatedMetrics({
      stats: { ...defaults.stats, cliUsers: -1 },
      multiIDEUsersCount: -2,
      totalUniqueIDEUsers: -3,
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
    });

    expect(selectClientsReadModel(metrics)).toEqual({
      ideStats: metrics.ideStats,
      multiIDEUsersCount: -2,
      totalUniqueIDEUsers: -3,
      cliUsers: -1,
      cliSessions: 3.25,
      cliLocAdded: 5,
      cliLocDeleted: 1,
    });
  });

  it('selects the exact client versions shape and preserves plugin references', () => {
    const metrics = makeClientMetrics();

    const model = selectClientVersionsReadModel(metrics);

    expect(model).toEqual({
      pluginVersionData: metrics.pluginVersionData,
      reportStartDay: '2026-01-15',
    });
    expect(model.pluginVersionData).toBe(metrics.pluginVersionData);
    expect(model.pluginVersionData.jetbrains).toBe(metrics.pluginVersionData.jetbrains);
    expect(model.pluginVersionData.jetbrains[0]).toBe(
      metrics.pluginVersionData.jetbrains[0]
    );
    expect(model.pluginVersionData.jetbrains[0].usernames).toBe(
      metrics.pluginVersionData.jetbrains[0].usernames
    );
    expect(model.pluginVersionData.vscode).toBe(metrics.pluginVersionData.vscode);
    expect(Object.keys(model)).toEqual(['pluginVersionData', 'reportStartDay']);
    expect(model).not.toHaveProperty('stats');
    expect(model).not.toHaveProperty('ideStats');
    expect(model).not.toHaveProperty('userSummaries');
  });

  it('preserves canonical empty data and the empty report date', () => {
    const metrics = makeAggregatedMetrics();

    const clients = selectClientsReadModel(metrics);
    const clientVersions = selectClientVersionsReadModel(metrics);

    expect(clients).toEqual({
      ideStats: [],
      multiIDEUsersCount: 0,
      totalUniqueIDEUsers: 0,
      cliUsers: 0,
      cliSessions: 0,
      cliLocAdded: 0,
      cliLocDeleted: 0,
    });
    expect(clients.ideStats).toBe(metrics.ideStats);
    expect(clientVersions).toEqual({
      pluginVersionData: metrics.pluginVersionData,
      reportStartDay: '',
    });
    expect(clientVersions.pluginVersionData).toBe(metrics.pluginVersionData);
    expect(clientVersions.pluginVersionData.jetbrains).toBe(
      metrics.pluginVersionData.jetbrains
    );
    expect(clientVersions.pluginVersionData.vscode).toBe(
      metrics.pluginVersionData.vscode
    );
  });

  it('passes report dates through verbatim without adding fallback semantics', () => {
    const defaults = makeAggregatedMetrics();
    const metrics = makeAggregatedMetrics({
      stats: {
        ...defaults.stats,
        reportStartDay: 'not-a-report-date',
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
