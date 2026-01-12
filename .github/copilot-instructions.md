## Project-Specific Guidelines

### Build Conflicts
Do not run `npm run build` while the "Next.js Development Server" task is running in VSCode.

### Chart.js Typing
For tooltip callbacks, use `TooltipItem<'bar' | 'pie'>` from `chart.js` instead of `any`.

### Progressive Disclosure
Use the `useExpandableList` hook for expandable tables (see `src/hooks/useExpandableList.ts`).

### Comments
Do not add process comments during refactoring (e.g., "Refactored into...", "Moved to...").