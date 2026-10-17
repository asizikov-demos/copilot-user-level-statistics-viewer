'use client';

import React from 'react';
import { Button, Heading } from '@primer/react';
import { ArrowLeftIcon } from '@primer/octicons-react';
import { cn } from '../../utils/cn';
import styles from './SectionHeader.module.css';

type Description = string | React.ReactNode;

interface SectionHeaderProps {
  title: string;
  description?: Description;
  onBack?: () => void;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  backButtonLabel?: string;
  backButtonClassName?: string;
}

export default function SectionHeader({
  title,
  description,
  onBack,
  className,
  titleClassName,
  descriptionClassName,
  backButtonLabel = 'Back to Overview',
  backButtonClassName
}: SectionHeaderProps) {
  return (
    <div className={cn(styles.header, className)} data-component="SectionHeader">
      <div>
        <Heading as="h2" variant="medium" className={cn(styles.title, titleClassName)}>
          {title}
        </Heading>
        {description && (typeof description === 'string' ? (
          <p className={cn(styles.description, descriptionClassName)}>{description}</p>
        ) : (
          description
        ))}
      </div>
      {onBack && (
        <Button
          type="button"
          onClick={onBack}
          leadingVisual={ArrowLeftIcon}
          className={backButtonClassName}
        >
          {backButtonLabel}
        </Button>
      )}
    </div>
  );
}
