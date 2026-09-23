import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { UserDayData } from '../../../../../types/metrics';
import { makeMetric } from '../../../../../__tests__/factories/metrics';
import ClientActivityChart from '../ClientActivityChart';

const activity = {
  user_initiated_interaction_count: 0,
  code_generation_activity_count: 0,
  code_acceptance_activity_count: 0,
  loc_added_sum: 0,
  loc_deleted_sum: 0,
  loc_suggested_to_add_sum: 0,
  loc_suggested_to_delete_sum: 0,
};

describe('ClientActivityChart', () => {
  it.each([false, true])('sorts clients by displayed interactions with CLI present: %s', (includeCli) => {
    const ideAggregates = [
      { ...activity, ide: 'copilot_app' },
      { ...activity, ide: 'intellij', user_initiated_interaction_count: 20 },
      {
        ...activity,
        ide: 'vscode',
        user_initiated_interaction_count: 10,
        assumed_user_initiated_interaction_count: 40,
      },
    ];
    const originalAggregates = structuredClone(ideAggregates);
    const day: UserDayData = {
      ...makeMetric(),
      used_copilot_app: true,
      used_copilot_coding_agent: false,
      used_copilot_code_review_active: false,
      used_copilot_code_review_passive: false,
      totals_by_ide: ideAggregates,
      totals_by_feature: includeCli
        ? [{ ...activity, feature: 'copilot_cli', user_initiated_interaction_count: 30 }]
        : [],
    };
    const markup = renderToStaticMarkup(
      <ClientActivityChart
        ideAggregates={ideAggregates}
        days={[day]}
        reportStartDay={day.day}
        reportEndDay={day.day}
      />,
    );
    const table = markup.match(/<table\b[\s\S]*?<\/table>/)?.[0] ?? '';
    const names = [...table.matchAll(/<span>([^<]+)<\/span>/g)].map(match => match[1]);

    expect(table).toContain('>Client</th>');
    expect(table).not.toContain('>IDE</th>');
    expect(names).toEqual(includeCli
      ? ['VS Code', 'Copilot CLI', 'JetBrains', 'Copilot App']
      : ['VS Code', 'JetBrains', 'Copilot App']);
    expect(ideAggregates).toEqual(originalAggregates);
  });
});
