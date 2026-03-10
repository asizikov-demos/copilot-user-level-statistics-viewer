'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadarController,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

let isRegistered = false;

/**
 * Registers all Chart.js components once. Safe to call multiple times.
 * Import and call this function in any component that uses Chart.js.
 */
export function registerChartJS(): void {
  if (isRegistered) return;

  ChartJS.register(
    CategoryScale,
    LinearScale,
    RadialLinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    RadarController,
    Title,
    Tooltip,
    Legend,
    Filler
  );

  isRegistered = true;
}

export { ChartJS };
