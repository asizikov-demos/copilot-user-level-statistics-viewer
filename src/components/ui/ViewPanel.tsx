"use client";

import React from "react";
import SectionHeader from "./SectionHeader";

const BASE_CLASS = "bg-white rounded-lg shadow-sm border border-gray-200 p-6";

export type ViewPanelSectionHeaderProps = React.ComponentProps<typeof SectionHeader>;

export interface ViewPanelProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Optional wrapper around the content region. Set to `null` to avoid additional spacing.
   */
  contentClassName?: string;
  /** Provide SectionHeader props to render the standard header automatically. */
  headerProps?: ViewPanelSectionHeaderProps;
  /**
   * Custom header node. When provided, `headerProps` are ignored.
   */
  header?: React.ReactNode;
  /**
   * Additional node rendered immediately after the header block and before `children`.
   */
  afterHeader?: React.ReactNode;
  /**
   * Replace default container classes entirely.
   */
  containerClassName?: string;
}

function mergeClassNames(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export default function ViewPanel({
  children,
  className,
  contentClassName,
  headerProps,
  header,
  afterHeader,
  containerClassName,
}: ViewPanelProps) {
  const hasHeader = Boolean(header || headerProps);
  const resolvedContainerClass = containerClassName ?? BASE_CLASS;
  const resolvedClassName = mergeClassNames(resolvedContainerClass, className);
  const resolvedContentClassName = mergeClassNames(hasHeader ? "mt-6" : undefined, contentClassName);

  return (
    <div className={resolvedClassName}>
      {header ?? (headerProps ? <SectionHeader {...headerProps} /> : null)}
      {afterHeader}
      <div className={resolvedContentClassName}>{children}</div>
    </div>
  );
}
