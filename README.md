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
- Model usage and premium request analysis
- CLI adoption trends, sessions, and token usage
- IDE and VS Code extension version analysis
- Statistics by programming language and Copilot feature
- Responsive layout, deployable as a static site to GitHub Pages

## Getting Started

### Prerequisites

- Node.js (^20.19.0 || >=22.12.0)
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

## Data Format

The application expects GitHub Copilot user-level metrics NDJSON files as provided by the GitHub Copilot Metrics Dashboard Export. See [`src/types/metrics.ts`](src/types/metrics.ts) for the full `CopilotMetrics` interface.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
