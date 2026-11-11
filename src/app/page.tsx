'use client';

import { AppHeader, ViewRouter, StickyHeader, SideNav, ContextPanel, DataInfoBar } from '../components/layout';
import { Link } from '@primer/react';
import { useMetrics } from '../components/MetricsContext';
import { useState } from 'react';
import styles from '../components/layout/AppShell.module.css';

export default function Home() {
  const { hasData } = useMetrics();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={`${styles.shell} ${sidebarCollapsed ? styles.collapsed : ''} min-h-screen bg-muted print:bg-default print:min-h-0`}>
      <StickyHeader />
      {hasData && <SideNav collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(value => !value)} />}
      {hasData && <ContextPanel />}
      {hasData && <DataInfoBar />}
      <div className={`pt-16 print:pt-0 print:ml-0 print:mr-0 ${hasData ? `${styles.content} xl:mr-64` : ''}`}>
        <div className={`px-4 sm:px-6 lg:px-8 pb-6 print:px-0 print:py-0 print:mx-0 ${hasData ? 'py-6 lg:pt-12' : 'py-6'}`}>
          <AppHeader />
          <ViewRouter />
          <footer
            className="mt-12 pb-4 text-center text-xs text-muted print:hidden"
            data-a11y-link-underlines="true"
          >
            &copy;{' '}
            <Link href="https://github.com/asizikov" target="_blank" rel="noopener noreferrer" muted inline>
              Anton Sizikov
            </Link>
            {' '}&mdash; Solutions Engineer @ GitHub
          </footer>
        </div>
      </div>
    </div>
  );
}
