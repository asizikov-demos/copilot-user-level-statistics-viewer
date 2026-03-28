'use client';

import { AppHeader, ViewRouter, StickyHeader, SideNav, DataInfoBar } from '../components/layout';
import { useMetrics } from '../components/MetricsContext';

export default function Home() {
  const { hasData } = useMetrics();

  return (
    <div className="min-h-screen bg-[#f6f8fa] print:bg-white print:min-h-0">
      <StickyHeader />
      {hasData && <SideNav />}
      {hasData && <DataInfoBar />}
      <div className={`pt-16 print:pt-0 print:ml-0 ${hasData ? 'lg:ml-64' : ''}`}>
        <div className={`max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-6 print:max-w-none print:px-0 print:mx-0 ${hasData ? 'py-6 lg:pt-12' : 'py-6'}`}>
          <AppHeader />
          <ViewRouter />
        </div>
      </div>
    </div>
  );
}
