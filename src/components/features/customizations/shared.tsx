'use client';

export const formatNumber = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 });
export const formatPercent = (value: number) => `${value.toFixed(value >= 10 || value === 0 ? 0 : 1)}%`;

/** Inline SVG sparkline; stroke color comes from the CSS `color` of the wrapper. */
export function Sparkline({ values, width = 96, height = 24, color }: { values: number[]; width?: number; height?: number; color: string }) {
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(height - 2 - (v / max) * (height - 4)).toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} role="img" aria-label="Daily trend" className="shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

export function ShareBar({ fraction, color }: { fraction: number; color: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bgColor-muted)]" aria-hidden="true">
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(1, fraction)) * 100}%`, background: color }} />
    </div>
  );
}

export function Card({ title, description, children, className }: { title?: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-solid border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-4 ${className ?? ''}`}>
      {title && <h3 className="m-0 text-base font-semibold text-default">{title}</h3>}
      {description && <p className="mb-3 mt-1 text-xs text-muted">{description}</p>}
      {children}
    </section>
  );
}
