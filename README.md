# GitHub Copilot Usage Metrics Viewer

A modern web application for visualizing GitHub Copilot usage metrics data. Upload your GitHub Copilot metrics JSON files to view comprehensive analytics about user engagement, feature usage, and adoption patterns across your organization.

![GitHub Copilot Metrics Viewer](https://img.shields.io/badge/Next.js-15.4.5-black?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-blue?logo=tailwindcss&logoColor=white)

## ✨ Features

- **📊 Interactive Dashboard**: Upload GitHub Copilot metrics JSON files and view real-time analytics
- **👥 User Analytics**: Track unique users, chat users, agent users, and completion-only users
- **📈 Detailed Visualizations**: Interactive charts powered by Chart.js showing usage patterns
- **🔍 Individual User Details**: Drill down into specific user metrics and activity patterns
- **🏢 IDE & Feature Breakdown**: View usage statistics by IDE, programming language, and Copilot features
- **📱 Responsive Design**: Modern, mobile-friendly interface built with Tailwind CSS
- **⚡ Fast Performance**: Built with Next.js 15 with Turbopack for optimal performance

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
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

- **Framework**: [Next.js 15.4.5](https://nextjs.org) with App Router
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
  user_login: string;
  user_id: number;
  user_initiated_interaction_count: number;
  code_generation_activity_count: number;
  code_acceptance_activity_count: number;
  generated_loc_sum: number;
  accepted_loc_sum: number;
  used_agent: boolean;
  used_chat: boolean;
  totals_by_ide: Array<{...}>;
  totals_by_feature: Array<{...}>;
  // ... additional metrics
}
```

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Reporting Issues

If you find a bug or have a feature request:

1. Check if the issue already exists in our [Issues](https://github.com/asizikov-demos/copilot-user-level-statistics-viewer/issues)
2. If not, create a new issue with:
   - Clear description of the problem or feature request
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Screenshots if applicable

### Contributing Code

1. **Fork the repository** to your GitHub account
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/copilot-user-level-statistics-viewer.git
   ```
3. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes** following our code quality guidelines:
   - No unused variables (`@typescript-eslint/no-unused-vars`)
   - No explicit `any` types (`@typescript-eslint/no-explicit-any`)
   - Use proper TypeScript types
   - Run `npm run build` before committing
5. **Commit your changes**:
   ```bash
   git commit -m "feat: add your feature description"
   ```
6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Create a Pull Request** from your fork to the main repository

### Code Quality

- Follow the existing code style and patterns
- Add TypeScript types for all new code
- Test your changes locally with `npm run build`
- Update documentation if needed

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org)
- UI components styled with [Tailwind CSS](https://tailwindcss.com)
- Charts powered by [Chart.js](https://www.chartjs.org)
- Icons from [Heroicons](https://heroicons.com)
