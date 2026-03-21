/**
 * Centralized formatting utilities for consistent display across the application.
 */

/**
 * Format a date string for display.
 * @param dateString - ISO date string (YYYY-MM-DD)
 * @param options - Intl.DateTimeFormatOptions for customization
 * @returns Formatted date string
 */
export function formatDate(
  dateString: string,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }
): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', options);
  } catch {
    return dateString;
  }
}

/**
 * Format a date for short display (e.g., "Jan 15").
 */
export function formatShortDate(dateString: string): string {
  return formatDate(dateString, { month: 'short', day: 'numeric' });
}

/**
 * Format a date with full month name.
 */
export function formatLongDate(dateString: string): string {
  return formatDate(dateString, { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Format a number with locale-appropriate separators.
 * @param value - Number to format
 * @param maximumFractionDigits - Maximum decimal places (default: 0)
 * @returns Formatted number string
 */
export function formatNumber(
  value: number,
  maximumFractionDigits: number = 0
): string {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return value.toLocaleString('en-US', { maximumFractionDigits });
}

/**
 * Format a number as a percentage.
 * @param value - Number representing percentage (e.g., 75.5 for 75.5%)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string with % symbol
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a decimal as a percentage (multiply by 100 first).
 * @param value - Decimal value (e.g., 0.755 for 75.5%)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string with % symbol
 */
export function formatDecimalAsPercentage(value: number, decimals: number = 1): string {
  return formatPercentage(value * 100, decimals);
}

/**
 * Format a currency value.
 * @param value - Number to format
 * @param currency - Currency code (default: 'USD')
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number,
  currency: string = 'USD'
): string {
  if (value === null || value === undefined || isNaN(value)) return '$0.00';
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a large number with compact notation (e.g., 1.2K, 3.5M).
 * @param value - Number to format
 * @returns Compact formatted string
 */
export function formatCompactNumber(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return '0';
  if (Math.abs(value) < 1000) return value.toString();
  return value.toLocaleString('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  });
}

/**
 * Format a number with a sign prefix (+ or -).
 * @param value - Number to format
 * @returns String with appropriate sign prefix
 */
export function formatSignedNumber(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return '0';
  const formatted = formatNumber(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

/**
 * Format PRU (Premium Request Units) value.
 * @param value - PRU value
 * @returns Formatted PRU string
 */
export function formatPRU(value: number): string {
  return formatNumber(value, 2);
}

/**
 * Round a number to specified decimal places.
 * @param value - Number to round
 * @param decimals - Number of decimal places (default: 2)
 * @returns Rounded number
 */
export function roundTo(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Truncate a string to a maximum length with ellipsis.
 * @param str - String to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated string with ellipsis if needed
 */
export function truncateString(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str;
  return `${str.substring(0, maxLength - 3)}...`;
}

/**
 * Format a model name for display (capitalize, replace dashes with spaces).
 * @param modelName - Raw model name
 * @returns Formatted display name
 */
export function formatModelDisplayName(modelName: string): string {
  if (!modelName || modelName === 'unknown') return 'Unknown Model';
  return modelName.charAt(0).toUpperCase() + modelName.slice(1).replace(/-/g, ' ');
}

export function generateDateRange(startDay: string, endDay: string): string[] {
  const start = new Date(startDay + 'T00:00:00Z');
  const end = new Date(endDay + 'T00:00:00Z');
  const dates: string[] = [];
  for (const cur = new Date(start); cur <= end; cur.setUTCDate(cur.getUTCDate() + 1)) {
    dates.push(cur.toISOString().split('T')[0]);
  }
  return dates;
}
