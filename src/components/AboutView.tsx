"use client";

import React from 'react';
import { ViewPanel } from './ui';

export default function AboutView() {
  return (
    <ViewPanel
      headerProps={{
        title: 'About',
        description: 'Context for how this Copilot metrics reference application is maintained and intended to be used.',
      }}
      contentClassName="space-y-6"
    >
      <section className="rounded-lg border border-[#d1d9e0] bg-white p-6 shadow-sm">
        <div className="space-y-4 text-sm leading-6 text-gray-700">
          <p>
            This application is maintained by a GitHub Solutions Engineer from EMEA as a reference
            point for the data and insights that can be derived from GitHub Copilot Metrics.
          </p>
          <p>
            It relies on static NDJSON file exports and is designed to serve as a foundation rather
            than a day-to-day adoption monitoring platform.
          </p>
          <p>
            Organizations are encouraged to fork and extend this repository in-house. It can be
            adapted to include integration with the Copilot Metrics API, persistent data storage,
            and enrichment using other GitHub APIs or identity providers.
          </p>
          <p>
            Because GitHub Copilot Metrics are under active development, new features and data
            points are introduced frequently. Keep an eye on{' '}
            <a
              href="https://github.blog/?s=metrics"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800"
            >
              GitHub Blog posts about metrics
            </a>{' '}
            to stay current. We strive to update this reference application as new data becomes
            available, but following the blog ensures you receive the latest updates directly from
            GitHub.
          </p>
        </div>
      </section>
    </ViewPanel>
  );
}
