'use client';

import React from 'react';
import type { VoidCallback } from '../../types/events';

type Description = string | React.ReactNode;

interface SectionHeaderProps {
  title: string;
  description?: Description;
  onBack: VoidCallback;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  backButtonLabel?: string;
  backButtonClassName?: string;
}

function mergeClassNames(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export default function SectionHeader({
  title,
  description,
  onBack,
  className,
  titleClassName,
  descriptionClassName,
  backButtonLabel = '← Back to Overview',
  backButtonClassName
}: SectionHeaderProps) {
  const containerClassName = mergeClassNames('flex items-center justify-between', className);
  const headingClassName = mergeClassNames('text-xl font-semibold text-gray-900', titleClassName);
  const paragraphClassName = mergeClassNames('text-gray-600 text-sm mt-1 max-w-2xl', descriptionClassName);
  const buttonClassName = mergeClassNames(
    'px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md transition-colors',
    backButtonClassName
  );

  return (
    <div className={containerClassName}>
      <div>
        <h2 className={headingClassName}>{title}</h2>
        {description && (typeof description === 'string' ? (
          <p className={paragraphClassName}>{description}</p>
        ) : (
          description
        ))}
      </div>
      <button onClick={onBack} className={buttonClassName}>
        {backButtonLabel}
      </button>
    </div>
  );
}
