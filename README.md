# GitHub Copilot Usage Metrics Viewer

Visualize GitHub Copilot usage metrics from your organization. Upload metrics NDJSON files to analyze user engagement, feature usage, and adoption patterns.

![Next.js](https://img.shields.io/badge/Next.js-16.0.8-black?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-blue?logo=tailwindcss&logoColor=white)

## Features

- Upload and parse GitHub Copilot metrics NDJSON files
- View user breakdowns: unique users, chat users, agent users, completion-only users
- Interactive charts (Chart.js) for usage patterns
- Drill down into individual user activity
- Statistics by IDE, programming language, and Copilot feature
- Responsive layout

## Getting Started

### Prerequisites

- Node.js 20.9.0+ (required by Next.js 16)
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone https://github.com/asizikov-demos/copilot-user-level-statistics-viewer.git
cd user-level-metrics-viewer
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- [Next.js 16](https://nextjs.org) with App Router
- [TypeScript 5](https://www.typescriptlang.org)
- [Tailwind CSS 4](https://tailwindcss.com)
- [Chart.js](https://www.chartjs.org) / [react-chartjs-2](https://react-chartjs-2.js.org)
- [ESLint](https://eslint.org)

## Commands

```bash
npm run dev    # Start development server with Turbopack
npm run build  # Build for production
npm run start  # Start production server
npm run lint   # Run ESLint
```

## Data Format

The application expects GitHub Copilot metrics NDJSON files:

```typescript
interface CopilotMetrics {
  report_start_day: string;
  report_end_day: string;
  day: string;
  enterprise_id: string;
  user_id: number;
  user_login: string;
  user_initiated_interaction_count: number;
  code_generation_activity_count: number;
  code_acceptance_activity_count: number;
  loc_added_sum: number;
  loc_deleted_sum: number;
  loc_suggested_to_add_sum: number;
  loc_suggested_to_delete_sum: number;
  used_agent: boolean;
  used_chat: boolean;
  totals_by_ide: Array<{...}>;
  totals_by_feature: Array<{...}>;
  totals_by_language_feature: Array<{...}>;
  totals_by_language_model: Array<{...}>;
  totals_by_model_feature: Array<{...}>;
}
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
