import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import JetBrainsVersionsSection from '../sections/JetBrainsVersionsSection';
import VsCodeVersionsSection from '../sections/VsCodeVersionsSection';

describe('Client Versions feature sections', () => {
  it('renders the JetBrains empty state without release metadata tables', () => {
    const markup = renderToStaticMarkup(
      <JetBrainsVersionsSection
        sectionId="client-versions-jetbrains"
        pluginVersionAnalysis={[]}
        totalUniqueIntellijUsers={0}
        jetbrainsUpdates={[]}
        isLoading={false}
        error={null}
      />
    );

    expect(markup).toContain('No IntelliJ Plugin Data Available');
    expect(markup).not.toContain('Outdated Plugins');
    expect(markup).not.toContain('JetBrains &mdash; Latest 20 Plugin Versions');
  });

  it('identifies JetBrains versions outside the latest stable release window', () => {
    const latestUpdates = Array.from({ length: 20 }, (_, index) => ({
      version: `2.${index}.0`,
      releaseDate: `2026-02-${String(index + 1).padStart(2, '0')}`,
    }));

    const markup = renderToStaticMarkup(
      <JetBrainsVersionsSection
        sectionId="client-versions-jetbrains"
        pluginVersionAnalysis={[
          {
            version: '1.0.0',
            userCount: 2,
            usernames: ['octocat', 'hubot'],
          },
        ]}
        totalUniqueIntellijUsers={2}
        jetbrainsUpdates={[
          ...latestUpdates,
          { version: '2.99.0-nightly', releaseDate: '2026-02-28' },
        ]}
        isLoading={false}
        error={null}
      />
    );

    expect(markup).toContain('1.0.0');
    expect(markup).toContain('2 users are using outdated plugins');
    expect(markup).not.toContain('2.99.0-nightly');
  });

  it('classifies VS Code versions against the stable train at report start', () => {
    const markup = renderToStaticMarkup(
      <VsCodeVersionsSection
        sectionId="client-versions-vscode"
        versionAnalysis={[
          {
            version: '0.37.0',
            userCount: 1,
            usernames: ['octocat'],
          },
          {
            version: '0.38.0',
            userCount: 1,
            usernames: ['hubot'],
          },
        ]}
        totalUniqueVsCodeUsers={2}
        stableReleases={[
          { version: '0.38.0', releaseDate: '2026-03-04' },
          { version: '0.37.0', releaseDate: '2026-02-20' },
        ]}
        isLoading={false}
        error={null}
        currentStableMinor={38}
        currentPreviewMinor={39}
        updatedAt="2026-03-05"
        reportStartDay="2026-03-05"
      />
    );

    expect(markup).toContain('Stable release train at report start');
    expect(markup).toContain('0.38');
    expect(markup).toContain('0.37.0');
    expect(markup).toContain('1 user is using outdated extensions');
  });

  it('shows the VS Code historical metadata gap without outdated classification', () => {
    const markup = renderToStaticMarkup(
      <VsCodeVersionsSection
        sectionId="client-versions-vscode"
        versionAnalysis={[
          {
            version: '0.20.0',
            userCount: 1,
            usernames: ['octocat'],
          },
        ]}
        totalUniqueVsCodeUsers={1}
        stableReleases={[
          { version: '0.38.0', releaseDate: '2026-03-04' },
        ]}
        isLoading={false}
        error={null}
        currentStableMinor={38}
        currentPreviewMinor={39}
        updatedAt={null}
        reportStartDay="2026-01-01"
      />
    );

    expect(markup).toContain('predates the bundled VS Code stable release history');
    expect(markup).toContain('Historical release metadata unavailable for this report range');
    expect(markup).toContain('Unable to classify versions');
  });
});
