# GitHub Copilot User Level Metrics Viewer

Project overview: purpose, key design decisions, and data flow.

---

## 1. Purpose

A **client-side single-page analytics dashboard** for exploring **GitHub Copilot user-level metrics**. Designed for engineering leaders and admins who receive Copilot usage exports (NDJSON).

The app runs entirely in the browser — uploaded metrics files are parsed client-side and never sent to a backend.

Key analysis dimensions: **user**, **IDE**, **language**, **feature**, and **model** usage.

---

## 2. Data Format

The input is a GitHub Copilot **User Level Metrics** export in `.ndjson` (newline-delimited JSON) format. Each record is modeled by the `CopilotMetrics` type in `src/types/metrics.ts`.

Key facts about the input format:
- Each record represents one user's activity for one day
- Records contain nested breakdowns: `totals_by_ide`, `totals_by_feature`, `totals_by_language_feature`, `totals_by_language_model`, `totals_by_model_feature`
- Only the **new LOC schema** (`loc_added_sum`, `loc_deleted_sum`, `loc_suggested_*`) is supported — records with the deprecated `generated_loc_sum` / `accepted_loc_sum` fields are skipped

Static plugin version metadata (`public/data/vscode.json`, `public/data/jetbrains.json`) is used for contextual plugin version displays, not as primary input.

---

## 3. Architecture

Next.js App Router SPA, TypeScript, Tailwind CSS. All rendering is client-side.

### 3.1. Key Design Decisions

**Web Worker for parsing and aggregation.** All CPU-intensive work (file parsing, metrics aggregation) runs in a dedicated Web Worker (`src/workers/`). The worker is pre-bundled via esbuild into `public/workers/metricsWorker.js` as a self-contained IIFE — this is required for compatibility with Next.js static export (`output: 'export'`).

**Raw metrics never leave the worker.** The `parseAndAggregate` flow parses files and aggregates them into a compact, grouped `AggregatedMetrics` object entirely within the worker. Only this pre-aggregated result is transferred to the main thread. This significantly reduces memory footprint for large datasets.

**Three React contexts for main-thread state and worker access:**
- `MetricsContext` (`src/components/MetricsContext.tsx`) — stores the `AggregatedMetrics` result, loading/error/warning state, and data actions
- `NavigationContext` (`src/state/NavigationContext.tsx`) — manages current view and selected user
- `MetricsWorkerContext` (`src/state/MetricsWorkerContext.tsx`) — owns the main-thread worker client lifecycle and exposes parse, user-detail, and reset operations

**All view components consume pre-aggregated data.** No component accesses raw `CopilotMetrics[]` directly. The canonical `AggregatedMetrics` worker/UI contract is declared in `src/types/aggregatedMetrics.ts` and groups every aggregate under one owning domain slice. Feature read-model selectors in `src/read-models/` navigate only the slices they need; overview, executive summary, users, user details, Copilot adoption, AI adoption phases, Copilot impact, languages, clients, client versions, model details, CLI adoption, and AI credits retain their narrow runtime projections. Standard route adapters in `src/components/layout/routes/` own the selector and route each non-specialized view to the relevant presentation boundary, so only the selected route computes its projection. The feature-owned `UserDetailsRoute` in `src/components/features/user-details/` owns user selection, on-demand worker requests, stale-result protection, redirects, recovery, and delivery of the user-details view model. The worker retains a compact user-detail accumulator so it can serve those requests without moving raw records onto the main thread.

### 3.2. Code Organization

| Directory | Purpose |
|---|---|
| `src/app/` | Next.js App Router entry points and providers |
| `src/components/` | View components, charts, layout, feature folders, UI primitives |
| `src/components/features/` | Feature-owned view boundaries such as overview, file upload, adoption, AI adoption phases, impact, users, languages, client versions, and user details |
| `src/components/layout/routes/` | Typed standard-route adapters/registry |
| `src/components/charts/` | Shared Chart.js visualizations and chart utilities (via react-chartjs-2) |
| `src/domain/` | Business logic: aggregator, model config, calculators |
| `src/domain/aggregation/` | Concrete metric-family accumulator lifecycle orchestration |
| `src/infra/` | Streaming metrics file parser |
| `src/domain/calculators/` | Individual metric calculators (stats, engagement, model usage, impact, etc.) |
| `src/hooks/` | Reusable React hooks (file upload, sorting, search) |
| `src/workers/` | Framework-free Web Worker entry point, client API, message types |
| `src/state/` | Navigation context and main-thread worker provider |
| `src/read-models/` | Pure feature projections over the aggregate contract |
| `src/types/` | TypeScript type definitions |
| `src/utils/` | Formatting and utility helpers |

### 3.3. Model Configuration

`src/domain/modelConfig.ts` contains a curated catalog of known LLM models. Calculators use model helpers for normalization, known-model alias recognition, and explicit unknown/empty model detection.

### 3.4. Feature Read-Model Boundaries

The successful worker payload is one grouped `AggregatedMetrics` object. Each aggregate field has exactly one owning slice:

```text
AggregatedMetrics
├── overview  stats, engagementData, chatUsersData, chatRequestsData
├── users     userSummaries
├── adoption  featureAdoptionData, agentModeHeatmapData, adoption series
├── impact    agent, completion, edit, inline, ask, CLI, and joined impact
├── languages language stats, feature impact, generation and LOC series
├── clients   IDE stats/counts and plugin versions
├── models    daily model usage and model breakdown
├── cli       session, token, and adoption series
└── ai        adoption phases, usage distribution, and credits
```

Pure selectors under `src/read-models/` project stable nested references from those slices into unchanged UI contracts without copying, sorting, filtering, or mutation. Selectors may contain only existing deterministic, feature-specific scalar or date derivations, such as client CLI totals, the model-details auto total, CLI model chart dates, and the AI credits user total. Executive summary composes across `overview`, `impact`, and `adoption`; user-details routing preserves the complete grouped aggregate object as its dataset identity.

Established boundaries cover:
- overview and executive summary
- users and on-demand user details
- Copilot adoption
- AI adoption phases
- Copilot impact
- languages
- clients and client versions
- model details and CLI adoption
- AI credits

Phase 4 feature read-model boundaries, Phase 6 feature-oriented component organization, Phase 7 thin view routing, Phase 8 grouped aggregate contract migration, and Phase 10 boundary enforcement/cleanup are complete. The typed standard-route registry delegates all non-user-details routes, while the user-details feature owns the complete specialized lifecycle. `ViewRouter` retains only metrics-wide gates and top-level route selection. Phase 9 input-validation work was removed from scope because metrics inputs are validated upstream before they reach this viewer.

### 3.5. Enforced Dependency Direction

Phase 10 adds targeted ESLint import restrictions that make the current layering difficult to regress without introducing a new architecture framework:

```text
app/providers
  -> state contexts + UI contexts
state + hooks + layout routes
  -> worker client, navigation, metrics context, read models
read-models
  -> grouped aggregate contract and pure domain helpers
components/views
  -> read models, shared UI, charts, contract types
components/ui + components/charts
  -> shared types/utilities only; no layout routes or feature modules
workers
  -> infra parser, domain aggregation, worker message contracts
domain
  -> contracts, calculators, and pure domain helpers only
```

The automated boundaries are intentionally focused:
- UI components, layout routes, and read models cannot import `src/domain/metricsAggregator.ts` or `src/domain/aggregation/**`
- production `src/domain/**` and `src/workers/**` modules cannot import React, Next.js, component, or state-context modules
- shared UI primitives and shared charts cannot import feature modules or layout route modules

Tests may import lower-level helpers to build fixtures and characterize behavior, but production code must follow the directions above.

---

## 4. Data Flow

```mermaid
flowchart LR
  A[User uploads .ndjson file] --> B[useFileUpload hook]
  B --> C[state/MetricsWorkerContext-owned client]
  C -->|postMessage: parseAndAggregate| W[Web Worker: parse + aggregate]
  W -->|parseAndAggregateResult: grouped slices| D[MetricsContext stores AggregatedMetrics + warnings]
  D --> VR[ViewRouter resolves current route]
  VR --> SR[Selected standard route adapter]
  VR --> UR[Feature-owned UserDetailsRoute]
  SR --> RM[Feature read-model selector]
  RM --> E[Feature view]
  UR -->|computeUserDetails| C
  UR --> UDV[UserDetails feature view]
  E --> F[Chart components]
```

### 4.1. Upload and Parsing

1. `useFileUpload` validates file extensions and requests parsing through the typed worker client exposed by `MetricsWorkerProvider`
2. The worker streams each file through `src/infra/metricsFileParser.ts` using the `File.stream()` API, parses lines via `parseMetricsLine`, and applies string interning (`StringPool`) for memory efficiency
3. Records using deprecated LOC fields or missing required fields are skipped; broader input validation is intentionally external to the app
4. The worker runs `aggregateMetrics()` on the parsed data, retains the compact user-detail accumulator for on-demand requests, and returns the grouped `AggregatedMetrics` result, enterprise name, record count, and any per-file parse errors (surfaced as a non-fatal warning in the UI when partial failures occur). The request protocol and lifecycle are unchanged; raw records remain off the main thread.
5. `MetricsWorkerProvider` in `src/state/` is the application-level lifecycle owner. Its client creates the browser Worker lazily, correlates requests and progress responses, cancels pending work on reusable resets, and permanently disposes the Worker when the provider unmounts.

### 4.2. Aggregation

`metricsAggregator.ts` retains the single explicit pass over raw records and coordinates concrete metric-family lifecycles in `src/domain/aggregation/` with calculators in `src/domain/calculators/`. Core stats, user summaries, user detail, language, model, client, CLI, engagement/adoption, impact, and AI orchestration each own accumulator creation, per-record consumption, and narrow finalization. The core-stats lifecycle owns first-record report metadata, filtered-record counting, and per-user usage signals while exposing its stats accumulator explicitly to the language, model, and client families for their dimension-specific contributions. The user-detail lifecycle returns the same compact calculator accumulator retained by the worker for on-demand requests.

The coordinator resolves the Copilot Cloud Agent compatibility signal exactly once per raw record and passes that boolean to core stats, user summaries, user detail, and engagement/adoption. CLI usage is accumulated once by the CLI family, including zero-filled dates. Its narrow, read-only daily-session dependency is consumed by engagement/adoption finalization so engagement, chat, and adoption retain CLI users and sessions without duplicating accumulation or exposing token internals. Model aggregation retains ownership of agent heatmap state through an explicit feature-signal entry point while the engagement/adoption and impact families independently consume the feature fields required by their calculators.

Phase 5 modular aggregation orchestration and Phase 8 grouped contract assembly are complete. The top-level coordinator deliberately retains only accumulator wiring, one raw-record loop, shared-signal resolution, narrow cross-family dependencies, finalization, and grouped assembly. Concrete family results map directly into `overview`, `users`, `adoption`, `impact`, `languages`, `clients`, `models`, `cli`, and `ai` without recomputation, compatibility aliases, or duplicate ownership. The worker still returns the compact user-detail accumulator separately for retained on-demand use.

### 4.3. Views

`ViewRouter` (`src/components/layout/ViewRouter.tsx`) is the thin top-level coordinator for metrics-wide upload, fatal-error, and loading gates. It selects either the typed standard-route outlet or the feature-owned `UserDetailsRoute`. Each standard adapter invokes its feature selector lazily and renders the relevant presentation boundary with a narrow shared route context. `CopilotAdoptionView` presentation, adoption-only charts, visible sections, and focused tests are co-located under `src/components/features/adoption/`; shared adoption chart utilities remain in `src/components/charts/utils/` because CLI adoption and model details also consume them. `AiAdoptionPhaseView` presentation, table column metadata, phase definitions, visible sections, and focused tests are co-located under `src/components/features/ai-adoption-phases/`. `CopilotImpactView` presentation, impact mode metadata, visible sections, and focused tests are co-located under `src/components/features/impact/`; `ModeImpactChart` remains shared because executive summary and user details also render it. `UsersView` presentation, visible summary/table sections, feature constants, and focused tests are co-located under `src/components/features/users/`. `LanguagesView` presentation, feature-only daily chart, visible sections, and focused tests are co-located under `src/components/features/languages/`. `ClientVersionsView` presentation and its JetBrains/VS Code version sections are co-located under `src/components/features/client-versions/`. `UserDetailsRoute` consumes metrics, navigation, and worker contexts directly and owns selection/summary resolution, request invalidation and retry, effect-only redirects, stale-result rejection, cleanup, recoverable errors, and final `UserDetailsView` model delivery. User-details presentation, feature-only charts, day-details helpers, and route-focused tests are co-located under `src/components/features/user-details/`; pure read-model selectors remain in `src/read-models/` as the shared application projection layer. This completes Phase 6 feature organization while preserving Phase 7 routing and Phase 10 dependency enforcement.

Charts use **Chart.js** via **react-chartjs-2**, wrapped in a `ChartContainer` component for consistent styling.

---

## 5. Architecture Diagram

```mermaid
flowchart TB
	subgraph NextJSAppRouter
		direction TB
		L[layout.tsx] --> P[providers.tsx]
		P --> H[page.tsx]
		H --> VR[ViewRouter]
		P --> MWP[MetricsWorkerProvider]
	end

	subgraph State
		MC[MetricsContext]
		NC[NavigationContext]
		MWP[MetricsWorkerProvider]
	end

	subgraph WebWorker[Web Worker]
		MFP[infra/metricsFileParser.ts]
		MA[metricsAggregator.ts]
		AGG[aggregation/]
		CALC[calculators/]
		MConf[modelConfig.ts]
		GAM[Grouped AggregatedMetrics slices]
	end

	subgraph WorkerBridge
		WC[metricsWorkerClient.ts]
		WT[metricsWorker.ts]
	end

	subgraph Boundaries[ESLint boundaries]
		BR1[UI/read-models cannot import aggregation implementation]
		BR2[domain/workers stay framework-free]
		BR3[shared UI/charts avoid layout and feature routes]
	end

	VR --> SR[Standard route outlet + registry]
	SR --> Views[View Components + Charts]
	SR --> RM[read-models/]
	VR --> UD[UserDetailsRoute]
	UD --> UDV[UserDetailsView]
	UD --> RM

	MWP --> WC
	UFU[useFileUpload] --> MWP
	UD -->|user detail requests| MWP
	WC -->|postMessage| WT
	WT --> MFP
	WT --> MA
	MA --> AGG
	MA --> GAM
	AGG --> CALC
	CALC --> MConf
	GAM -->|parseAndAggregateResult| WC
	WC --> MC

	MC --> VR
	NC --> VR
	BR1 -.enforces.-> SR
	BR1 -.enforces.-> RM
	BR2 -.enforces.-> WT
	BR2 -.enforces.-> MA
	BR3 -.enforces.-> Views
```
