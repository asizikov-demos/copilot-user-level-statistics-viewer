import { describe, expect, it } from 'vitest';
import type { CopilotMetrics } from '../../../types/metrics';
import { makeMetric } from '../../../__tests__/factories/metrics';
import { aggregateMetrics } from '../../metricsAggregator';
import { parseMetricsFile } from '../../metricsParser';
import { computeSingleUserDetailedMetrics } from '../userDetailCalculator';
import {
  accumulateClientTelemetry,
  computeClientTelemetryWarnings,
  createClientTelemetryAccumulator,
} from '../clientTelemetryCalculator';
import { selectClientsReadModel, selectClientVersionsReadModel } from '../../../read-models/clients';
import {
  selectUserDetailsHeaderReadModel,
  selectUserDetailsRouteReadModel,
  selectUserDetailsViewModel,
} from '../../../read-models/userDetails';

function ideTotal(ide: string, ideVersion?: string, pluginVersion?: string): CopilotMetrics['totals_by_ide'][number] {
  return {
    ide,
    user_initiated_interaction_count: 0,
    code_generation_activity_count: 0,
    code_acceptance_activity_count: 0,
    loc_added_sum: 0,
    loc_deleted_sum: 0,
    loc_suggested_to_add_sum: 0,
    loc_suggested_to_delete_sum: 0,
    last_known_ide_version: ideVersion ? {
      ide_version: ideVersion,
      sampled_at: '2026-10-07T00:00:00Z',
    } : undefined,
    last_known_plugin_version: pluginVersion ? {
      plugin: 'copilot-chat',
      plugin_version: pluginVersion,
      sampled_at: '2026-10-07T00:00:00Z',
    } : undefined,
  };
}

function warnings(...entries: CopilotMetrics['totals_by_ide']) {
  const accumulator = createClientTelemetryAccumulator();
  entries.forEach(entry => accumulateClientTelemetry(accumulator, 1, entry));
  return computeClientTelemetryWarnings(accumulator);
}

describe('client telemetry warnings', () => {
  it.each([
    ['vscode', '1.138.9'],
    ['vscode', '1.99.0'],
    ['vscode', '1.9.0'],
    ['visualstudio', '18.11.999'],
    [' visual_studio ', '17.14.13'],
  ])('recommends an upgrade for %s IDE %s below the fixed baseline', (ide, version) => {
    expect(warnings(ideTotal(ide, version))).toEqual([
      expect.objectContaining({ version, versionKind: 'ide', action: 'upgrade', userCount: 1 }),
    ]);
  });

  it.each([
    ['vscode', '1.139.0'],
    ['vscode', '1.139.1'],
    ['vscode', '1.140.0'],
    ['vscode', '2.0.0'],
    ['visualstudio', '18.12'],
    ['visualstudio', '18.12.0'],
    ['visualstudio', '18.13.0'],
    ['visualstudio', '19.0.0'],
  ])('does not flag %s IDE %s at or above the fixed baseline', (ide, version) => {
    expect(warnings(ideTotal(ide, version, '0.1.0'))).toEqual([]);
  });

  it('does not compare plugin versions to IDE fixed baselines', () => {
    expect(warnings(ideTotal('vscode', undefined, '1.200.0'))).toEqual([
      expect.objectContaining({ version: '1.200.0', versionKind: 'plugin', action: 'verify' }),
    ]);
    expect(warnings(ideTotal('vscode', '1.138.0', '1.200.0'))[0].action).toBe('upgrade');
  });

  it.each(['1.139.0-insider', 'unknown', '1', '1.139.0.1'])(
    'requires verification rather than claiming a fixed or faulty IDE for %s',
    version => {
      expect(warnings(ideTotal('vscode', version))[0]).toMatchObject({ action: 'verify', version });
    },
  );

  it.each(['intellij', 'jetbrains', 'eclipse', 'xcode'])(
    'records %s plugin observations without inventing a fixed plugin version',
    ide => {
      expect(warnings(ideTotal(ide, '2026.3', '9.99.0-nightly'))).toEqual([
        expect.objectContaining({
          version: '9.99.0-nightly',
          versionKind: 'plugin',
          action: 'verify',
          recommendation: expect.stringContaining('version not yet announced'),
        }),
      ]);
    },
  );

  it.each([
    'pycharm', 'webstorm', 'rider', 'datagrip', 'android_studio', 'goland',
    'phpstorm', 'rubymine', 'clion', 'rustrover', 'aqua',
  ])('applies the JetBrains policy to %s while preserving the IDE identity', ide => {
    expect(warnings(ideTotal(ide, '2026.3', '9.99.0'))).toEqual([
      expect.objectContaining({
        ide,
        version: '9.99.0',
        versionKind: 'plugin',
        action: 'verify',
        recommendation: expect.stringContaining('fixed JetBrains Copilot plugin'),
      }),
    ]);
  });

  it('does not flag missing versions, CLI, Copilot App, or unrelated IDEs', () => {
    expect(warnings(
      ideTotal('vscode'),
      ideTotal('intellij'),
      ideTotal('copilot_cli', '0.1.0'),
      ideTotal('copilot_app', '0.1.0'),
      ideTotal('zed', '0.1.0'),
    )).toEqual([]);
  });

  it('deduplicates users by ID across records and aliases, not by username', () => {
    const accumulator = createClientTelemetryAccumulator();
    accumulateClientTelemetry(accumulator, 1, ideTotal('visualstudio', '18.11.0'));
    accumulateClientTelemetry(accumulator, 1, ideTotal('visual_studio', '18.11.0'));
    accumulateClientTelemetry(accumulator, 2, ideTotal('visualstudio', '18.11.0'));
    expect(computeClientTelemetryWarnings(accumulator)).toEqual([
      expect.objectContaining({ ide: 'visualstudio', version: '18.11.0', userCount: 2 }),
    ]);
  });

  it('projects worker-computed notices through all read models, preserving historical risk and zero-activity observations', () => {
    const raw = [
      makeMetric({ user_id: 1, totals_by_ide: [ideTotal('vscode', '1.138.0')] }),
      makeMetric({ user_id: 1, totals_by_ide: [ideTotal('vscode', '1.138.0')] }),
      makeMetric({ user_id: 1, totals_by_ide: [ideTotal('vscode', '1.139.0')] }),
      makeMetric({ user_id: 2, totals_by_ide: [ideTotal('vscode', '1.138.0')] }),
      makeMetric({ user_id: 3, totals_by_ide: [ideTotal('vscode', '1.139.0')] }),
    ];
    const before = structuredClone(raw);
    const { aggregated, userDetailAccumulator } = aggregateMetrics(
      parseMetricsFile(raw.map(record => JSON.stringify(record)).join('\n')),
    );
    const globalWarnings = aggregated.clients.telemetryWarnings;
    expect(globalWarnings).toEqual([
      expect.objectContaining({ ide: 'vscode', version: '1.138.0', userCount: 2 }),
    ]);
    expect(selectClientsReadModel(aggregated).telemetryWarnings).toBe(globalWarnings);
    expect(selectClientVersionsReadModel(aggregated).telemetryWarnings).toBe(globalWarnings);

    const details = computeSingleUserDetailedMetrics(userDetailAccumulator, 1)!;
    expect(details.telemetryWarnings).toEqual([
      expect.objectContaining({ ide: 'vscode', version: '1.138.0', userCount: 1 }),
    ]);
    expect(details.days[0].totals_by_ide[0].last_known_ide_version).toEqual(
      raw[0].totals_by_ide[0].last_known_ide_version,
    );
    expect(computeSingleUserDetailedMetrics(userDetailAccumulator, 3)!.telemetryWarnings).toEqual([]);
    const route = selectUserDetailsRouteReadModel(aggregated, { id: 1, login: 'user1' });
    if (route.status !== 'resolved') throw new Error('Expected resolved profile');
    expect(selectUserDetailsHeaderReadModel(
      selectUserDetailsViewModel(route, details),
    ).telemetryWarnings).toBe(details.telemetryWarnings);
    expect(raw).toEqual(before);
  });
});
