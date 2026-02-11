# GitHub Copilot User Level Metrics Viewer

This document explains the purpose, data format, architecture, and end-to-end data flow of the **GitHub Copilot User Level Metrics Viewer** project.

---

## 1. Purpose

The application is a **single-page analytics dashboard** for exploring **GitHub Copilot user-level metrics**. It is designed for:

- Engineering leaders and admins who receive Copilot **user-level usage exports (JSON / NDJSON)**
- Quickly understanding **adoption**, **engagement**, and **impact** of Copilot in their organization
- Exploring data by **user**, **IDE**, **language**, **feature**, and **model**
- Analyzing **Premium Request Unit (PRU)** consumption and estimated **service value**

The app runs completely in the browser: users upload a metrics file, which is parsed client-side and never sent to a backend.

---

## 2. Data Format and Structure

The core input to the application is a GitHub Copilot **User Level Metrics** export in newline-delimited JSON (`.ndjson`) or plain JSON array form. Each line/record is modeled by the `CopilotMetrics` type in `src/types/metrics.ts`.

### 2.1. Core Record Shape

```ts
export interface CopilotMetrics {
	report_start_day: string;        // Overall report period (for the whole export)
	report_end_day: string;
	day: string;                     // Metrics date for this record (YYYY-MM-DD)
	enterprise_id: string;           // Enterprise identifier
	user_id: number;                 // Numeric user id
	user_login: string;              // GitHub username (may be suffixed with enterprise slug)

	user_initiated_interaction_count: number;
	code_generation_activity_count: number;
	code_acceptance_activity_count: number;

	// LOC metrics (per record, across all features)
	loc_added_sum: number;
	loc_deleted_sum: number;
	loc_suggested_to_add_sum: number;
	loc_suggested_to_delete_sum: number;

	totals_by_ide: Array<{
		ide: string;
		user_initiated_interaction_count: number;
		code_generation_activity_count: number;
		code_acceptance_activity_count: number;
		loc_added_sum: number;
		loc_deleted_sum: number;
		loc_suggested_to_add_sum: number;
		loc_suggested_to_delete_sum: number;
		last_known_plugin_version?: {
			sampled_at: string;
			plugin: string;
			plugin_version: string;
		};
	}>;

	totals_by_feature: Array<{
		feature: string; // e.g. "code_completion", "chat_panel_agent_mode", "chat_inline", "code_review"
		user_initiated_interaction_count: number;
		code_generation_activity_count: number;
		code_acceptance_activity_count: number;
		loc_added_sum: number;
		loc_deleted_sum: number;
		loc_suggested_to_add_sum: number;
		loc_suggested_to_delete_sum: number;
	}>;

	totals_by_language_feature: Array<{
		language: string; // Programming language name or "unknown"
		feature: string;
		code_generation_activity_count: number;
		code_acceptance_activity_count: number;
		loc_added_sum: number;
		loc_deleted_sum: number;
		loc_suggested_to_add_sum: number;
		loc_suggested_to_delete_sum: number;
	}>;

	totals_by_language_model: Array<{
		language: string;
		model: string; // LLM model name (e.g. "gpt-4.1", "claude-3.5-sonnet")
		code_generation_activity_count: number;
		code_acceptance_activity_count: number;
		loc_added_sum: number;
		loc_deleted_sum: number;
		loc_suggested_to_add_sum: number;
		loc_suggested_to_delete_sum: number;
	}>;

	totals_by_model_feature: Array<{
		model: string;  // LLM model name, lowercased by downstream processing
		feature: string;
		user_initiated_interaction_count: number;
		code_generation_activity_count: number;
		code_acceptance_activity_count: number;
		loc_added_sum: number;
		loc_deleted_sum: number;
		loc_suggested_to_add_sum: number;
		loc_suggested_to_delete_sum: number;
	}>;

	used_agent: boolean; // Whether user has used Copilot agent features in the report period
	used_chat: boolean;  // Whether user has used chat features in the report period
}
```

Only the **new LOC schema** (`loc_added_sum`, `loc_deleted_sum`, `loc_suggested_*`) is supported. Lines/records with the older `generated_loc_sum` or `accepted_loc_sum` fields are ignored by the parser.

### 2.2. Example Static Data

The repository includes example plugin version metadata used by some UI elements:

- `public/data/vscode.json` – latest Copilot for VS Code plugin versions
- `public/data/jetbrains.json` – latest Copilot for JetBrains plugin versions

These are not the primary metrics input; instead, they are used for contextual plugin version displays.

### 2.3. Derived Structures

Several derived data structures are computed from raw `CopilotMetrics`:

- `MetricsStats` – aggregate stats for the current filtered dataset (unique users, chat/agent/completion users, top language/IDE/model, total records, date range)
- `UserSummary` – per-user aggregates (interactions, LOC activity, days active, feature usage flags)
- Multiple per-day time series:
	- `DailyEngagementData` – active users and engagement percentage per day
	- `DailyChatUsersData` / `DailyChatRequestsData` – chat usage by mode and day
	- `DailyModelUsageData` & `DailyPRUAnalysisData` – PRU usage, PRU/standard breakdowns, and model details
	- `AgentModeHeatmapData` – agent-mode intensity and service value
	- `ModeImpactData` variants – LOC impact per mode (agent, completion, edit, inline, joined)
	- `LanguageStats` – aggregates by language
	- `ModelFeatureDistributionData` – interactions and PRUs by model and feature category

All of these are defined in `src/utils/metricsParser.ts` and `src/types/metrics.ts`.

---

## 3. Architecture

The project is a **Next.js 16 App Router** single-page application written in **TypeScript** with **Tailwind CSS** for styling. All rendering is client-side once the page is loaded.

### 3.1. High-Level Structure

```text
src/
	app/
		layout.tsx        // Root layout and page shell
		page.tsx          // Main SPA entry point (slim, delegates to components)
		providers.tsx     // Wraps app with context providers

	components/
		MetricsContext.tsx           // React context for filtered metrics data
		FilterPanel.tsx              // Date range and language filters
		UniqueUsersView.tsx          // User list and drill-down entry
		UserDetailsView.tsx          // Per-user deep dive
		LanguagesView.tsx            // Language breakdown table and charts
		IDEView.tsx                  // IDE breakdown
		CopilotAdoptionView.tsx      // Feature adoption summary
		CopilotImpactView.tsx        // LOC impact analysis by mode
		PRUUsageAnalysisView.tsx     // PRU + model usage analysis
		ModelDetailsView.tsx         // Per-model details

		layout/                      // Layout components
			AppHeader.tsx
			MainLayout.tsx
			ViewRouter.tsx           // Maps ViewMode to appropriate component
			index.ts

		features/                    // Feature-based organization
			file-upload/
				FileUploadArea.tsx
				PrivacyNotice.tsx
				HowToGetData.tsx
				index.ts
			overview/
				OverviewDashboard.tsx
				index.ts

		charts/                      // Chart.js-based visualizations
			EngagementChart.tsx
			ChatUsersChart.tsx
			ChatRequestsChart.tsx
			PRUModelUsageChart.tsx
			PRUCostAnalysisChart.tsx
			AgentModeHeatmapChart.tsx
			ModeImpactChart.tsx
			ModelFeatureDistributionChart.tsx
			...

		ui/                          // Reusable UI primitives
			MetricTile.tsx
			SectionHeader.tsx
			InsightsCard.tsx
			DashboardStatsCard.tsx
			ExpandableTableSection.tsx
			ActivityCalendar.tsx
			DayDetailsModal.tsx
			ChartContainer.tsx       // Unified chart wrapper
			DataTable/               // Compound component for sortable tables

	domain/
		modelConfig.ts               // Model catalog, PRU multipliers, premium flags
		calculators/                 // Split calculation logic
			statsCalculator.ts
			engagementCalculator.ts
			chatCalculator.ts
			languageCalculator.ts
			modelUsageCalculator.ts
			featureAdoptionCalculator.ts
			impactCalculator.ts
			index.ts

	hooks/
		useUsernameTrieSearch.ts     // Efficient username searching
		useMetricsProcessing.ts      // Metrics filtering and aggregation
		useFileUpload.ts             // File upload handling
		usePluginVersions.ts         // Plugin version fetching
		useSortableTable.ts          // Table sorting logic
		useExpandableList.ts         // Expandable list state

	state/                           // Centralized state management
		NavigationContext.tsx        // View navigation state

	types/
		metrics.ts                   // Core metrics TypeScript types
		navigation.ts                // View mode and navigation types
		filters.ts                   // Filter types
		events.ts                    // Strict event handler types
		branded.ts                   // Branded types for IDs
		index.ts                     // Barrel export

	utils/
		formatters.ts                // Number and date formatting utilities
		basePath.ts                  // Base path helper
```

### 3.2. Context and State Management

State is managed on the client using React hooks and multiple context providers:

- **`src/components/MetricsContext.tsx`** defines `MetricsProvider` with one hook:
	- `useRawMetrics` – access to raw metrics, enterprise name, and loading/error state
- **`src/state/NavigationContext.tsx`** manages view navigation:
	- Current view mode (`ViewMode`)
	- Selected user and model state
	- Navigation actions (`navigateTo`, `selectUser`, `selectModel`, etc.)

The main `page.tsx` is now slim and delegates to:
- `ViewRouter` – handles view switching based on `currentView`
- `OverviewDashboard` – renders the main dashboard
- `FileUploadArea` – handles file upload UI

The `useMetricsProcessing` hook computes aggregated data whenever raw metrics change, and the result is used directly by `ViewRouter`.

### 3.3. Computation Layer

Computation is organized into focused modules:

**Parsing** (`src/utils/metricsParser.ts`):
- `parseMetricsFile` – parses JSON/NDJSON, filters out deprecated-schema records, validates required fields

**Calculators** (`src/domain/calculators/`):
- `statsCalculator.ts` – basic stats (users, records, top items)
- `engagementCalculator.ts` – daily engagement data
- `chatCalculator.ts` – chat users and requests
- `languageCalculator.ts` – language statistics
- `modelUsageCalculator.ts` – model usage and PRU data
- `featureAdoptionCalculator.ts` – feature adoption funnel
- `impactCalculator.ts` – LOC impact by feature

**Aggregator** (`src/domain/metricsAggregator.ts`):
- `aggregateMetrics` – orchestrates all calculators to produce `AggregatedMetrics`

**Metric Calculators** (`src/domain/calculators/`):
- Additional calculation functions including `calculateStats`, `calculateUserSummaries`, `calculateDailyEngagement`, `calculateDailyChatUsers`, `calculateDailyChatRequests`, `calculateLanguageStats`
- PRU and model-related analytics: `calculateDailyModelUsage`, `calculateFeatureAdoption`, `calculateDailyPRUAnalysis`, `calculateAgentModeHeatmap`, `calculateModelFeatureDistribution`
- LOC impact time series: `calculateAgentImpactData`, `calculateCodeCompletionImpactData`, `calculateEditModeImpactData`, `calculateInlineModeImpactData`, `calculateJoinedImpactData`

### 3.4. Domain Model Configuration

`src/domain/modelConfig.ts` contains a curated list of known LLM models, annotated with:

- `multiplier` – PRU multiplier for the model
- `isPremium` – whether usage is billed as premium

Utility functions exported from this module:

- `getModelMultiplier(modelName: string): number` – resolves a multiplier via exact or partial match, with a configurable fallback for `unknown` models.
- `isPremiumModel(modelName: string): boolean` – resolves whether a model should be treated as premium.

This domain configuration is used by the parser to compute PRUs and service value and by PRU-related visualizations.

---

## 4. Data Flow

This section describes the life cycle of data from file upload to visualization.

### 4.1. End-to-End Flow Overview

```mermaid
flowchart LR
  A[User uploads JSON or NDJSON metrics file] --> B[useFileUpload hook]

  B --> C[parseMetricsFile in metricsParser.ts]

  C --> D[Store rawMetrics in MetricsContext]

  D --> E[useMetricsProcessing hook computes aggregated data]

  E --> F[ViewRouter renders appropriate view]

  F --> G[Chart components using Chart.js]

  subgraph Contexts
    NC[NavigationContext] --> F
  end
```

### 4.2. Upload and Parsing

1. The `useFileUpload` hook (in `src/hooks/useFileUpload.ts`) handles file upload when a user selects a file.
2. `handleFileUpload`:
	 - Validates file extension (`.json` or `.ndjson`).
	 - Reads the file content as text.
	 - Invokes `parseMetricsFile(fileContent)` from `metricsParser.ts`.

3. `parseMetricsFile`:
	 - Splits content into lines, ignoring blanks.
	 - Parses each line as JSON.
	 - Skips any record that:
		 - Uses deprecated LOC fields (`generated_loc_sum`, `accepted_loc_sum`) at the root or nested level.
		 - Is missing any of the new required LOC fields.
	 - Casts remaining records to `CopilotMetrics[]` and returns them.

4. `handleFileUpload` then:
	 - Derives an `enterpriseName` from `user_login` suffix or `enterprise_id`.
	 - Stores `rawMetrics` in `MetricsContext`.

### 4.3. Aggregation

Once `rawMetrics` exist, the `useMetricsProcessing` hook computes aggregated data via `aggregateMetrics(rawMetrics)`:

- `computeStats` – summary stats (unique users, top language/IDE/model, date range).
- `computeUserSummaries` – user-level totals and activity flags.
- `computeEngagementData`, `computeChatUsersData`, `computeChatRequestsData` – time series for engagement and chat usage.
- `computeLanguageStats` – aggregates per language.
- `computeDailyModelUsageData` – PRU vs standard vs unknown by day.
- `computeFeatureAdoptionData` – user-level adoption across completion/chat modes.
- `computeDailyPRUAnalysisData` – PRU requests, PRU percentage, total PRUs, service value, and per-model breakdown per day.
- `computeAgentModeHeatmapData` – agent mode requests, unique users, intensity (0–5), and service value.
- `computeModelFeatureDistributionData` – model-level interactions by feature category, PRUs and service value.
- `computeAgentImpactData`, `computeCodeCompletionImpactData`, `computeEditModeImpactData`, `computeInlineModeImpactData`, `computeJoinedImpactData` – mode-specific LOC impact series.

The resulting `AggregatedMetrics` object is consumed directly by `ViewRouter` and individual view components.

### 4.4. Views and Navigation

Navigation is managed by `NavigationContext` which maintains `currentView` state (`ViewMode`). The `ViewRouter` component (`src/components/layout/ViewRouter.tsx`) maps `currentView` to the appropriate component:

- `overview` – default dashboard, with:
	- File upload prompt (when no data yet)
	- Metric tiles (total records, unique users, top language/IDE/model, navigation tiles for Impact/PRU/Adoption)
	- Time series charts (Engagement, Chat Users, Chat Requests)

- `users` – `UniqueUsersView` listing all users (`UserSummary`) and allowing click-through.
- `userDetails` – `UserDetailsView` for a selected user (passed `CopilotMetrics[]` for that user).
- `languages` – `LanguagesView` showing language statistics and charts.
- `ides` – `IDEView` focusing on IDE-level usage.
- `copilotImpact` – `CopilotImpactView`, which renders multiple `ModeImpactChart` instances using the various LOC impact series.
- `pruUsage` – `PRUUsageAnalysisView`, which combines:
	- `PRUModelUsageChart` (from `DailyModelUsageData`)
	- `PRUCostAnalysisChart` (from `DailyPRUAnalysisData`)
	- `ModelFeatureDistributionChart` (from `ModelFeatureDistributionData`)
- `copilotAdoption` – `CopilotAdoptionView` synthesizing feature adoption data and agent-mode heatmap.
- `modelDetails` – `ModelDetailsView` for a selected `topModel`.

Navigation between these views is driven by buttons and tiles in the overview UI and side panel.

### 4.5. Chart Rendering

All charts live under `src/components/charts/` and use **Chart.js** wrapped by **react-chartjs-2**. Many charts use the `ChartContainer` component for consistent styling. Typical inputs are the derived data arrays from `metricCalculators.ts` (e.g., `DailyEngagementData[]`, `DailyPRUAnalysisData[]`, etc.). Each chart component is responsible for:

- Mapping domain data into Chart.js datasets and labels
- Configuring axes and tooltips
- Providing friendly titles, legends, and empty-state messaging

---

## 5. Mermaid Architecture Overview

```mermaid
flowchart TB
	subgraph NextJSAppRouter
		direction TB
		L[layout.tsx] --> P[providers.tsx with all Contexts]
		P --> H[page.tsx slim entry point]
		H --> VR[ViewRouter]
	end

	subgraph StateAndContext
		MC[MetricsContext rawMetrics]
		NC[NavigationContext currentView]
	end

	subgraph ComputationLayer
		MP[metricsParser.ts parse]
		MA[metricsAggregator.ts aggregate]
		CALC[domain/calculators/ split logic]
		MConf[modelConfig.ts model config]
	end

	subgraph HooksLayer
		UFU[useFileUpload]
		UMP[useMetricsProcessing]
		UPV[usePluginVersions]
		UST[useSortableTable]
	end

	subgraph ViewsAndComponents
		OV[OverviewDashboard]
		UV[UniqueUsersView]
		UD[UserDetailsView]
		LV[LanguagesView]
		IV[IDEView]
		CI[CopilotImpactView]
		PR[PRUUsageAnalysisView]
		CA[CopilotAdoptionView]
		MD[ModelDetailsView]
	end

	VR --> OV
	VR --> UV
	VR --> LV
	VR --> IV
	VR --> CI
	VR --> PR
	VR --> CA
	VR --> MD

	UFU --> MP
	UMP --> MA
	MA --> CALC
	CALC --> MConf

	MC --> VR
	NC --> VR
```

---

## 6. Summary

- The app is a **client-side Next.js dashboard** for **GitHub Copilot User Level Metrics**.
- Data is provided as newline-delimited JSON or JSON array exports from GitHub; only the **new LOC schema** is supported.
- All heavy lifting (parsing, aggregation, PRU calculations, LOC impact analysis) happens in **`metricsParser.ts`**, **`metricsAggregator.ts`**, **`domain/calculators/`**, and **`modelConfig.ts`**.
- State is managed through React contexts: **`MetricsContext`** for data and **`NavigationContext`** for view routing.
- Reusable hooks (`useFileUpload`, `useMetricsProcessing`, `usePluginVersions`, `useSortableTable`, `useExpandableList`) encapsulate common logic.
- The UI is organized into multiple views that share the same filtered dataset, providing different perspectives on the same underlying metrics.
- Type safety is enhanced through strict event handler types (`events.ts`), discriminated unions for view props (`navigation.ts`), and branded types for IDs (`branded.ts`).

Use this document as the entry point when onboarding to the codebase or when extending analytics and visualizations.

