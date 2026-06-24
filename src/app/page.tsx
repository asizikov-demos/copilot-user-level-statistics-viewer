'use client';

import { AppHeader, ViewRouter, StickyHeader, SideNav, ContextPanel, DataInfoBar } from '../components/layout';
import { useMetrics } from '../components/MetricsContext';

export default function Home() {
  const { hasData } = useMetrics();

  return (
    <div className="min-h-screen bg-[#f6f8fa] print:bg-white print:min-h-0">
      <StickyHeader />
      {hasData && <SideNav />}
      {hasData && <ContextPanel />}
      {hasData && <DataInfoBar />}
      <div className={`pt-16 print:pt-0 print:ml-0 ${hasData ? 'lg:ml-64 xl:mr-64' : ''}`}>
        <div className={`px-4 sm:px-6 lg:px-8 pb-6 print:px-0 print:mx-0 ${hasData ? 'py-6 lg:pt-12' : 'py-6'}`}>
          <AppHeader />
          <ViewRouter />
          <footer className="mt-12 pb-4 text-center text-xs text-gray-400 print:hidden">
            &copy;{' '}
            <a
              href="https://github.com/asizikov"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-600 underline underline-offset-2 transition-colors"
            >
              Anton Sizikov
            </a>
            {' '}&mdash; Solutions Engineer @ GitHub
          </footer>
        </div>
      </div>
    </div>
  );
}
