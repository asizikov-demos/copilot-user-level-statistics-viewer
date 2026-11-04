'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { Checkbox, FormControl } from '@primer/react';
import { getIDEIcon } from '../icons/IDEIcons';
import { createClientPattern, getClientPatternIndex } from './utils/clientPatterns';

export function useClientPatterns() {
  const [patterned, setPatterned] = useState(false);
  const cache = useRef(new WeakMap<CanvasRenderingContext2D, Map<string, CanvasPattern>>());
  const getFill = useCallback((context: CanvasRenderingContext2D, color: string, clientKey: string) => {
    let patterns = cache.current.get(context);
    if (!patterns) {
      patterns = new Map();
      cache.current.set(context, patterns);
    }
    const key = `${color}:${getClientPatternIndex(clientKey)}`;
    let pattern = patterns.get(key);
    if (!pattern) {
      pattern = createClientPattern(context, color, clientKey);
      patterns.set(key, pattern);
    }
    return pattern;
  }, []);
  return { patterned, setPatterned, getFill };
}

export function ClientPatternControl({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="mb-3 print:hidden">
      <FormControl>
        <Checkbox checked={checked} onChange={event => onChange(event.target.checked)} />
        <FormControl.Label>Show client patterns</FormControl.Label>
        <FormControl.Caption>Patterns supplement colors; names identify each client.</FormControl.Caption>
      </FormControl>
    </div>
  );
}

export function ClientSwatch({ color, clientKey, patterned = false }: {
  color: string;
  clientKey?: string;
  patterned?: boolean;
}) {
  const id = useId();
  const index = clientKey ? getClientPatternIndex(clientKey) : 0;
  return (
    <svg width="20" height="16" viewBox="0 0 20 16" aria-hidden="true" className="shrink-0 rounded-sm">
      <defs>
        <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill={color} />
          {patterned && clientKey && (
            <g stroke="white" strokeWidth="1" opacity="0.8">
              {index === 0 && <path d="M-2 2L2 -2M0 8L8 0M6 10L10 6" />}
              {index === 1 && <path d="M-2 6L2 10M0 0L8 8M6 -2L10 2" />}
              {index === 2 && <path d="M0 4H8" />}
              {index === 3 && <path d="M4 0V8" />}
              {index === 4 && <circle cx="4" cy="4" r="1" fill="white" stroke="none" />}
              {index === 5 && <path d="M0 4H8M4 0V8" />}
            </g>
          )}
        </pattern>
      </defs>
      <rect width="20" height="16" fill={`url(#${id})`} />
    </svg>
  );
}

export function ClientChartLegend({ entries, patterned, hiddenKeys, onToggle }: {
  entries: readonly { clientKey: string; label: string; color: string }[];
  patterned: boolean;
  hiddenKeys: ReadonlySet<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <ul className="flex flex-wrap justify-center gap-2 text-sm" aria-label="Client chart legend">
      {entries.map(entry => {
        const Icon = getIDEIcon(entry.clientKey);
        const visible = !hiddenKeys.has(entry.clientKey);
        return (
          <li key={entry.clientKey}>
            <button type="button" aria-pressed={visible} onClick={() => onToggle(entry.clientKey)}
              className="flex items-center gap-2 rounded-sm p-1 hover:bg-muted focus-visible:outline-2 focus-visible:outline-[var(--focus-outlineColor)]">
              <ClientSwatch color={entry.color} clientKey={entry.clientKey} patterned={patterned} />
              <Icon />
              <span className={visible ? '' : 'line-through text-muted'}>{entry.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
