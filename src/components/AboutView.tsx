"use client";

import React from 'react';
import { Link, LinkButton } from '@primer/react';
import { MarkGithubIcon } from '@primer/octicons-react';
import { ViewPanel } from './ui';

const REPOSITORY_URL = 'https://github.com/asizikov-demos/copilot-user-level-statistics-viewer';

export default function AboutView() {
  return (
    <ViewPanel
      headerProps={{
        title: 'About',
        description: 'Context for how this Copilot metrics reference application is maintained and intended to be used.',
      }}
      contentClassName="space-y-6"
    >
      <section className="rounded-lg border border-default bg-default p-6 shadow-sm">
        <div className="space-y-4 text-sm leading-6 text-muted">
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
            <Link
              href="https://github.blog/?s=metrics"
              target="_blank"
              rel="noopener noreferrer"
              inline
              className="font-medium"
            >
              GitHub Blog posts about metrics
            </Link>{' '}
            to stay current. We strive to update this reference application as new data becomes
            available, but following the blog ensures you receive the latest updates directly from
            GitHub.
          </p>
        </div>
        <div className="mt-6">
          <LinkButton
            href={REPOSITORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            leadingVisual={MarkGithubIcon}
          >
            View source on GitHub
          </LinkButton>
        </div>
      </section>
    </ViewPanel>
  );
}
