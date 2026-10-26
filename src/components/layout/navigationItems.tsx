import {
  CodeIcon,
  CopilotIcon,
  CpuIcon,
  CreditCardIcon,
  DeviceDesktopIcon,
  FileIcon,
  GraphIcon,
  HomeIcon,
  InfoIcon,
  MilestoneIcon,
  PackageIcon,
  PeopleIcon,
  StackIcon,
  TerminalIcon,
  VersionsIcon,
} from '@primer/octicons-react';
import type { Icon } from '@primer/octicons-react';
import { VIEW_MODES } from '../../types/navigation';
import type { ViewMode } from '../../types/navigation';

export interface NavItem {
  label: string;
  view: ViewMode;
  activeViews?: ViewMode[];
  icon: Icon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', view: VIEW_MODES.OVERVIEW, icon: HomeIcon },
  {
    label: 'Users',
    view: VIEW_MODES.USERS,
    activeViews: [VIEW_MODES.USERS, VIEW_MODES.USER_DETAILS],
    icon: PeopleIcon,
  },
  { label: 'Clients', view: VIEW_MODES.CLIENT_ANALYSIS, icon: DeviceDesktopIcon },
  { label: 'CLI Adoption', view: VIEW_MODES.CLI_ADOPTION, icon: TerminalIcon },
  { label: 'Customizations', view: VIEW_MODES.CUSTOMIZATIONS, icon: PackageIcon },
  { label: 'Surface', view: VIEW_MODES.SURFACE_PRODUCTIVITY, icon: StackIcon },
  { label: 'Copilot Impact', view: VIEW_MODES.COPILOT_IMPACT, icon: GraphIcon },
  { label: 'Copilot Adoption', view: VIEW_MODES.COPILOT_ADOPTION, icon: CopilotIcon },
  { label: 'AI Adoption Phases', view: VIEW_MODES.AI_ADOPTION_PHASES, icon: MilestoneIcon },
  { label: 'Model Usage', view: VIEW_MODES.MODEL_DETAILS, icon: CpuIcon },
  { label: 'Languages', view: VIEW_MODES.LANGUAGES, icon: CodeIcon },
  { label: 'Client Versions', view: VIEW_MODES.CLIENT_VERSIONS, icon: VersionsIcon },
  { label: 'AI Credits', view: VIEW_MODES.AI_CREDITS, icon: CreditCardIcon },
  { label: 'Executive Summary', view: VIEW_MODES.EXECUTIVE_SUMMARY, icon: FileIcon },
  { label: 'About', view: VIEW_MODES.ABOUT, icon: InfoIcon },
];

export function isNavItemActive({ view, activeViews }: NavItem, currentView: ViewMode): boolean {
  return (activeViews ?? [view]).includes(currentView);
}

export function getActiveNavItem(currentView: ViewMode): NavItem | undefined {
  return NAV_ITEMS.find(item => isNavItemActive(item, currentView));
}
