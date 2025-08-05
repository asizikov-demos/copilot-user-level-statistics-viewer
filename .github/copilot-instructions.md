This workspace contains a Next.js TypeScript single page application.

## Tech Stack
- **Framework**: Next.js 15.4.5 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Linting**: ESLint
- **Package Manager**: npm

## Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Code Quality Guidelines

### TypeScript & ESLint Rules
- **No unused variables**: Remove any declared but unused variables to prevent `@typescript-eslint/no-unused-vars` warnings
- **No explicit `any` types**: Always use proper TypeScript types instead of `any` to prevent `@typescript-eslint/no-explicit-any` errors
  - For Chart.js tooltip callbacks, use `TooltipItem<'bar' | 'pie'>` from `chart.js` instead of `any`
  - Import specific types: `import { TooltipItem } from 'chart.js'`
- **Always run `npm run build` before committing** to catch TypeScript and ESLint issues early
- **Prefer specific imports**: Import only the types and components you need

### Chart.js Integration
- When using Chart.js with TypeScript, always import proper types:
  ```typescript
  import { Chart as ChartJS, TooltipItem } from 'chart.js';
  
  // Use TooltipItem instead of any
  label: function(context: TooltipItem<'bar'>) {
    // tooltip logic
  }
  ```

## UX Design Patterns

### Progressive Disclosure for Data Tables
The application uses a **progressive disclosure pattern** for large data tables to improve initial load performance and user experience:

#### Pattern Implementation:
1. **Default State**: Show only the most relevant items (typically top 1-10 entries)
2. **Expansion Control**: Provide a toggle button when more items are available
3. **State Management**: Use React state to track expansion status
4. **Consistent Styling**: Use standardized button appearance across all tables

#### Code Pattern:
```typescript
// State for expansion control
const [isTableExpanded, setIsTableExpanded] = useState(false);

// Determine items to show
const maxItemsToShow = 10; // or 1 for single-item tables
const itemsToShow = isTableExpanded ? allItems : allItems.slice(0, maxItemsToShow);

// Render with expansion button
{allItems.length > maxItemsToShow && (
  <div className="mt-4 text-center">
    <button
      onClick={() => setIsTableExpanded(!isTableExpanded)}
      className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-400 rounded-md transition-colors"
    >
      {isTableExpanded ? 'Show Less' : `Show All ${allItems.length} Items`}
    </button>
  </div>
)}
```

#### Use Cases in Application:
- **Plugin Versions**: Show latest 1 version, expand to see all
- **Language Statistics**: Show top 10 languages, expand to see all
- **Complete Data Tables**: Show top 10 rows, expand to see all entries

#### Benefits:
- **Performance**: Reduces initial render time for large datasets
- **Usability**: Presents most important information first
- **Scalability**: Handles datasets of any size gracefully
- **Consistency**: Uniform behavior across all data views

