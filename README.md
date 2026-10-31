# GitHub Copilot Usage Metrics Viewer

Visualize GitHub Copilot usage metrics from your organization. Upload metrics NDJSON files to analyze user engagement, feature usage, and adoption patterns.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-blue?logo=tailwindcss&logoColor=white)

## Features

- Upload and parse GitHub Copilot metrics NDJSON files
- Executive summary with key adoption metrics
- User breakdowns: unique users, chat users, agent users, CLI users, completion-only users
- Interactive charts for usage patterns and trends
- Drill down into individual user activity with feature adoption radar charts
- Model usage analysis
- CLI adoption trends, sessions, and token usage
- IDE, CLI, and Copilot App productivity-proxy comparison
- IDE and VS Code extension version analysis
- Statistics by programming language and Copilot feature
- Responsive layout, deployable as a static site to GitHub Pages

## Getting Started

### Prerequisites

- Node.js (^22.22.2 || ^24.15.0 || >=26.0.0)
- npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/asizikov-demos/copilot-user-level-statistics-viewer.git
cd user-level-metrics-viewer
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Commands

```bash
npm run dev       # Start development server with Turbopack
npm run build     # Build for production (static export)
npm run lint      # Run ESLint
npm run test:run  # Run tests
```

### Agentic workflows

The workflows in `.github/workflows/*.md` are compiled with `gh aw` v1.0.1.
After editing them, regenerate the `.lock.yml` files rather than editing generated YAML:

```bash
gh extension upgrade gh-aw --force  # Upgrade even if the local extension is pinned
gh aw version                     # Confirm the compiler version before regenerating
gh aw compile
```

Keep the compiler-generated `agentics-maintenance.yml` alongside the lock files;
it handles expiration of workflow-created issues and pull requests.

The code duplication scan uses the documented [`sonnet` model alias](https://github.github.com/gh-aw/reference/model-tables/)
to resolve an available model from the live Copilot catalog rather than pinning an unavailable model ID.
Model Sync enables [Copilot SDK mode](https://github.github.com/gh-aw/reference/engines/copilot/)
for its proxy-aware `web-fetch` tool. Account policies can still restrict model availability.

## Data Format

The application expects GitHub Copilot user-level metrics NDJSON files as provided by the GitHub Copilot Metrics Dashboard Export. See [`src/types/metrics.ts`](src/types/metrics.ts) for the full `CopilotMetrics` interface.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
