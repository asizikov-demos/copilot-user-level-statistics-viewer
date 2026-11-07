import { useId, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

type TableCardHeading = 'h2' | 'h3' | 'h4';

export interface TableCardProps {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  headingAs?: TableCardHeading;
  headerActions?: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

export default function TableCard({
  id,
  title,
  description,
  headingAs = 'h3',
  headerActions,
  toolbar,
  footer,
  className,
  children,
}: TableCardProps) {
  const headingId = useId();
  const Heading = headingAs;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn('bg-default rounded-md border border-default', className)}
    >
      <header className="px-6 py-4 border-b border-default space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <Heading id={headingId} className="text-lg font-semibold text-default">
            {title}
          </Heading>
          {headerActions}
        </div>
        {description != null && (
          <div className="space-y-2 text-sm text-muted">{description}</div>
        )}
      </header>
      {toolbar != null && toolbar !== false && (
        <div className="px-6 py-4 border-b border-default space-y-3">{toolbar}</div>
      )}
      <div>{children}</div>
      {footer != null && footer !== false && (
        <footer className="border-t border-default px-6 py-4">{footer}</footer>
      )}
    </section>
  );
}
