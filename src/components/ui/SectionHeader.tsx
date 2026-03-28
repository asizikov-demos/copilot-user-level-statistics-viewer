'use client';

import React from 'react';
import { cn } from '../../utils/cn';

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
  backButtonLabel = '← Back to Overview',
  backButtonClassName
}: SectionHeaderProps) {
  const containerClassName = cn('flex items-center justify-between', className);
  const headingClassName = cn('text-xl font-semibold text-gray-900', titleClassName);
  const paragraphClassName = cn('text-gray-600 text-sm mt-1 max-w-2xl', descriptionClassName);
  const buttonClassName = cn(
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
      {onBack && (
        <button type="button" onClick={onBack} className={buttonClassName}>
          {backButtonLabel}
        </button>
      )}
    </div>
  );
}
