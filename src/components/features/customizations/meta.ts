import { chartColors, type ChartColor } from '../../charts/utils/chartColors';
import { CUSTOMIZATION_TYPES, type CustomizationType } from '../../../types/customizationsOverview';

export const CUSTOMIZATION_META: Record<CustomizationType, { title: string; singular: string; measure: string; color: ChartColor }> = {
  skill: { title: 'Skills', singular: 'Skill', measure: 'invocations', color: chartColors.blue },
  custom_agent: { title: 'Custom agents', singular: 'Custom agent', measure: 'invocations', color: chartColors.purple },
  mcp: { title: 'MCP servers', singular: 'MCP server', measure: 'tool calls', color: chartColors.teal },
  slash_cmd: { title: 'Slash commands', singular: 'Slash command', measure: 'invocations', color: chartColors.amber },
  plugin: { title: 'Plugins', singular: 'Plugin', measure: 'invocations', color: chartColors.rose },
};

export const CUSTOMIZATION_ORDER = CUSTOMIZATION_TYPES;
