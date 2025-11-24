'use client';

import { MainLayout, AppHeader, ViewRouter } from '../components/layout';

export default function Home() {
  return (
    <MainLayout>
      <AppHeader />
      <ViewRouter />
    </MainLayout>
  );
}
