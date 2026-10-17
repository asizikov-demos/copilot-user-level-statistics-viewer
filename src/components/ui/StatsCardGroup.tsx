"use client";

import React from "react";
import { Heading } from "@primer/react";
import StatsGrid, { type StatsGridColumns } from "./StatsGrid";
import { cn } from '../../utils/cn';
import styles from "./StatsCardGroup.module.css";

export interface StatsCardGroupProps<T> {
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  items: readonly T[];
  columns?: StatsGridColumns;
  gapClassName?: string;
  className?: string;
  headerClassName?: string;
  getKey?: (item: T, index: number) => React.Key;
  headingTag?: "h2" | "h3" | "h4";
  renderItem: (item: T, index: number) => React.ReactNode;
}

export default function StatsCardGroup<T>({
  title,
  description,
  actions,
  items,
  columns,
  gapClassName = "gap-6",
  className,
  headerClassName,
  getKey,
  headingTag = "h3",
  renderItem,
}: StatsCardGroupProps<T>) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className={cn(styles.group, className)}>
      {(title || description || actions) && (
        <div className={cn(styles.header, headerClassName)}>
          <div className={styles.headerText}>
            {title && (
              <Heading as={headingTag} variant="small" className={styles.title}>
                {title}
              </Heading>
            )}
            {description && (
              typeof description === "string" ? (
                <p className={styles.description}>{description}</p>
              ) : (
                description
              )
            )}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}

      <StatsGrid columns={columns} gapClassName={gapClassName}>
        {items.map((item, index) => (
          <React.Fragment key={getKey ? getKey(item, index) : index}>
            {renderItem(item, index)}
          </React.Fragment>
        ))}
      </StatsGrid>
    </section>
  );
}
