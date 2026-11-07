import { describe, expect, it } from 'vitest';
import { makeAggregatedMetrics } from '../../__tests__/factories/aggregatedMetrics';
import type { ClientTelemetryWarning } from '../../domain/calculators/clientTelemetryCalculator';
import { selectClientsReadModel, selectClientVersionsReadModel } from '../clients';

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

});
