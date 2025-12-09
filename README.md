# GitHub Copilot Usage Metrics Viewer

A modern web application for visualizing GitHub Copilot usage metrics data. Upload your GitHub Copilot metrics JSON files to view comprehensive analytics about user engagement, feature usage, and adoption patterns across your organization.

![GitHub Copilot Metrics Viewer](https://img.shields.io/badge/Next.js-16.0.8-black?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-blue?logo=tailwindcss&logoColor=white)

## ✨ Features

- **📊 Interactive Dashboard**: Upload GitHub Copilot metrics JSON files and view real-time analytics
- **👥 User Analytics**: Track unique users, chat users, agent users, and completion-only users
- **📈 Detailed Visualizations**: Interactive charts powered by Chart.js showing usage patterns
- **🔍 Individual User Details**: Drill down into specific user metrics and activity patterns
- **🏢 IDE & Feature Breakdown**: View usage statistics by IDE, programming language, and Copilot features
- **📱 Responsive Design**: Modern, mobile-friendly interface built with Tailwind CSS
- **⚡ Fast Performance**: Built with Next.js 16 with Turbopack for optimal performance

## 🚀 Getting Started

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

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Usage

1. **Upload Metrics File**: Click the upload area or drag and drop your GitHub Copilot metrics JSON file
2. **View Overview**: See high-level statistics about user engagement and usage patterns
3. **Explore Users**: Click on "Unique Users" to see detailed user breakdowns
4. **User Details**: Click on individual users to view their specific metrics and activity

## 🛠️ Tech Stack

- **Framework**: [Next.js 16.0.8](https://nextjs.org) with App Router
- **Language**: [TypeScript 5](https://www.typescriptlang.org)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com)
- **Charts**: [Chart.js](https://www.chartjs.org) with [react-chartjs-2](https://react-chartjs-2.js.org)
- **Linting**: [ESLint](https://eslint.org) with Next.js configuration
- **Package Manager**: npm

## 📝 Development Commands

```bash
npm run dev    # Start development server with Turbopack
npm run build  # Build for production
npm run start  # Start production server
npm run lint   # Run ESLint
```

## 📄 Data Format

The application expects GitHub Copilot metrics JSON files with the following structure:

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

## 🤝 Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to report issues and contribute code.


## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org)
- UI components styled with [Tailwind CSS](https://tailwindcss.com)
- Charts powered by [Chart.js](https://www.chartjs.org)
- Icons from [Heroicons](https://heroicons.com)
