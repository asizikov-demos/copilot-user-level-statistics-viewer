'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { resetChartThemeCache, resolveChartTheme } from './chartTheme';

let isRegistered = false;

/**
 * Applies Primer tokens (font stack, text and grid colors) to Chart.js defaults.
 * Pass `refresh` to re-read tokens after the document theme changes.
 */
export function applyChartTheme({ refresh = false }: { refresh?: boolean } = {}): void {
  if (refresh) resetChartThemeCache();

  const theme = resolveChartTheme();
  ChartJS.defaults.font.family = theme.fontFamily;
  ChartJS.defaults.color = theme.textColor;
  ChartJS.defaults.borderColor = theme.gridColor;
}

/**
 * Registers all Chart.js components once. Safe to call multiple times.
 * Import and call this function in any component that uses Chart.js.
 */
export function registerChartJS(): void {
  if (isRegistered) return;

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
  );
  applyChartTheme();

  isRegistered = true;
}

export { ChartJS };
