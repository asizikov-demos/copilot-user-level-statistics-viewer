import type { ComponentType } from 'react';

export interface TopEntriesListEntry {
  name: string;
  total: number;
  uniqueUsers: number;
}

interface TopEntriesListProps<Entry extends TopEntriesListEntry> {
  entries: Entry[];
  formatName?: (name: string) => string;
  getIcon?: (name: string) => ComponentType | null;
}

export default function TopEntriesList<Entry extends TopEntriesListEntry>({
  entries,
  formatName = (name) => name,
  getIcon,
}: TopEntriesListProps<Entry>) {
  if (entries.length === 0) {
    return <span className="text-sm text-gray-400">No data</span>;
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => {
        const Icon = getIcon?.(entry.name);

        return (
          <div key={entry.name} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              {Icon ? (
                <div className="flex-shrink-0">
                  <Icon />
                </div>
              ) : null}
              <span className="truncate text-gray-900" title={entry.name}>
                {formatName(entry.name)}
              </span>
            </div>
            <span className="whitespace-nowrap text-xs text-gray-500" title={`${entry.uniqueUsers.toLocaleString()} users`}>
              {entry.total.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
