'use client';

// FilterPanel component has been simplified - all filters removed
// This component is kept as a placeholder for potential future filters

export default function FilterPanel() {
  return (
    <div className="bg-white rounded-md border border-[#d1d9e0] p-6 h-fit">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
      
      <div className="border-t border-gray-200 pt-4">
        <p className="text-sm text-gray-500">
          No filters currently active. All data is displayed.
        </p>
      </div>
    </div>
  );
}
