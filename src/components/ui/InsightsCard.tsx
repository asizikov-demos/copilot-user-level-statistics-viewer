import React from 'react';
import { Heading } from '@primer/react';
import { LightBulbIcon } from '@primer/octicons-react';
import { cn } from '../../utils/cn';
import { resolveAccentRole, type AccentColor } from './colorSchemes';
import roleStyles from './semanticRoles.module.css';
import styles from './InsightsCard.module.css';

type InsightsCardVariant = Extract<AccentColor, 'green' | 'blue' | 'red' | 'orange' | 'purple'>;

interface InsightsCardProps {
  title: string;
  /** Legacy accent name mapped to a Primer semantic role (green → success, blue → accent, …). */
  variant?: InsightsCardVariant;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export default function InsightsCard({ title, variant = 'blue', children, className, icon }: InsightsCardProps) {
  return (
    <div
      className={cn(roleStyles.role, styles.card, className)}
      data-component="InsightsCard"
      data-role={resolveAccentRole(variant)}
    >
      <div className={styles.header}>
        <span className={styles.icon} aria-hidden="true">
          {icon || <LightBulbIcon size={16} />}
        </span>
        <Heading as="h4" variant="small" className={styles.title}>{title}</Heading>
      </div>
      <div className={styles.body}>
        {children}
      </div>
    </div>
  );
}
