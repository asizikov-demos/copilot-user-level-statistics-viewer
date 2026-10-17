'use client';

// FilterPanel component has been simplified - all filters removed
// This component is kept as a placeholder for potential future filters

export default function FilterPanel() {
  return (
    <div className="bg-default rounded-md border border-default p-6 h-fit">
      <h3 className="text-lg font-semibold text-default mb-4">Filters</h3>
      
      <div className="border-t border-default pt-4">
        <p className="text-sm text-muted">
          No filters currently active. All data is displayed.
        </p>
      </div>
    </div>
  );
}
