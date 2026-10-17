import type { ComponentType } from 'react';
import styles from './TopEntriesList.module.css';

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
    return <span className={styles.empty}>No data</span>;
  }

  return (
    <div className={styles.list} data-component="TopEntriesList">
      {entries.map((entry) => {
        const Icon = getIcon?.(entry.name);
        const uniqueUsersLabel = `${entry.uniqueUsers.toLocaleString()} user${entry.uniqueUsers === 1 ? '' : 's'}`;

        return (
          <div key={entry.name} className={styles.entry}>
            <div className={styles.label}>
              {Icon ? (
                <div className={styles.icon} aria-hidden="true">
                  <Icon />
                </div>
              ) : null}
              <span className={styles.name} title={entry.name}>
                {formatName(entry.name)}
              </span>
            </div>
            <span className={styles.count} title={uniqueUsersLabel}>
              {entry.total.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
