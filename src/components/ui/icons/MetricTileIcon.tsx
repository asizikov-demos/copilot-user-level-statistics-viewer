"use client";

import React from "react";
import {
  AgentIcon,
  AiModelIcon,
  AlertIcon,
  ArrowUpIcon,
  CodeIcon,
  CodeSquareIcon,
  CommentDiscussionIcon,
  CopilotIcon,
  DeviceDesktopIcon,
  FileIcon,
  GraphIcon,
  HomeIcon,
  PeopleIcon,
  PlugIcon,
  PulseIcon,
  StackIcon,
  TagIcon,
  TerminalIcon,
  VersionsIcon,
  ZapIcon,
  type Icon,
} from "@primer/octicons-react";

export type MetricTileIconName =
  | "records"
  | "unique-users"
  | "top-language"
  | "top-ide"
  | "impact"
  | "copilot-adoption"
  | "top-model"
  | "chat-users"
  | "agent-users"
  | "completion-only-users"
  | "cli-users"
  | "plugin-users"
  | "plugin-versions"
  | "plugin-outdated"
  | "vs-users"
  | "vs-versions"
  | "average-users"
  | "multi-ide"
  | "share"
  | "warning"
  | "upgrade"
  | "default";

export interface MetricTileIconProps {
  name: MetricTileIconName;
  className?: string;
}

export const METRIC_TILE_ICONS: Readonly<Record<MetricTileIconName, Icon>> = {
  records: FileIcon,
  "unique-users": PeopleIcon,
  "top-language": CodeIcon,
  "top-ide": DeviceDesktopIcon,
  impact: GraphIcon,
  "copilot-adoption": CopilotIcon,
  "top-model": AiModelIcon,
  "chat-users": CommentDiscussionIcon,
  "agent-users": AgentIcon,
  "completion-only-users": ZapIcon,
  "cli-users": TerminalIcon,
  "plugin-users": PlugIcon,
  "plugin-versions": VersionsIcon,
  "plugin-outdated": AlertIcon,
  "vs-users": CodeSquareIcon,
  "vs-versions": TagIcon,
  "average-users": PulseIcon,
  "multi-ide": StackIcon,
  share: GraphIcon,
  warning: AlertIcon,
  upgrade: ArrowUpIcon,
  default: HomeIcon,
};

export default function MetricTileIcon({ name, className }: MetricTileIconProps) {
  const OcticonComponent = METRIC_TILE_ICONS[name] ?? METRIC_TILE_ICONS.default;

  return <OcticonComponent size={24} className={className} />;
}
