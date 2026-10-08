import { describe, expect, it } from 'vitest';
import {
  makeAggregatedMetrics,
  makeUserSummary,
} from '../../__tests__/factories/aggregatedMetrics';
import { makeMetric } from '../../__tests__/factories/metrics';
import type { ClientTelemetryWarning } from '../../domain/calculators/clientTelemetryCalculator';
import {
  accumulateUserDetail,
  computeSingleUserDetailedMetrics,
  createUserDetailAccumulator,
} from '../../domain/calculators/userDetailCalculator';
import { selectClientsReadModel, selectClientVersionsReadModel } from '../clients';
import { selectUserDetailsHeaderReadModel } from '../userDetails';

const warnings: ClientTelemetryWarning[] = [
  {
    ide: 'vscode',
    version: '1.98.0',
    versionKind: 'ide',
    userCount: 3,
    action: 'upgrade',
    recommendation: 'Upgrade VS Code',
  },
  {
    ide: 'jetbrains',
    version: '1.5.0',
    versionKind: 'plugin',
    userCount: 1,
    action: 'verify',
    recommendation: 'Verify plugin telemetry',
  },
];

function makeMetricsWithWarnings() {
  const defaults = makeAggregatedMetrics();
  return makeAggregatedMetrics({
    clients: { ...defaults.clients, telemetryWarnings: warnings },
  });
}

describe('telemetry warnings pass-through', () => {
  it.each([
    { name: 'selectClientsReadModel', select: selectClientsReadModel },
    { name: 'selectClientVersionsReadModel', select: selectClientVersionsReadModel },
  ])('$name exposes aggregate client telemetry warnings unchanged', ({ select }) => {
    expect(select(makeMetricsWithWarnings()).telemetryWarnings).toEqual(warnings);
  });

  it('selectUserDetailsHeaderReadModel exposes user telemetry warnings unchanged', () => {
    const accumulator = createUserDetailAccumulator();
    accumulator.reportStartDay = '2024-01-01';
    accumulator.reportEndDay = '2024-01-02';
    accumulateUserDetail(accumulator, makeMetric({ day: '2024-01-01' }));
    const userDetails = {
      ...computeSingleUserDetailedMetrics(accumulator, makeMetric().user_id)!,
      telemetryWarnings: warnings,
    };
    const userSummary = makeUserSummary();

    const header = selectUserDetailsHeaderReadModel({
      userDetails,
      userSummary,
      interactionRank: { rank: 1, totalUsers: 1 },
      userLogin: userSummary.user_login,
      userId: userSummary.user_id,
    });

    expect(header.telemetryWarnings).toEqual(warnings);
  });
});
