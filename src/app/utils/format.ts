/**
 * Format a number as Malaysian Ringgit with thousand separator and 2 decimal places.
 * Returns only the numeric part — prepend "RM " at the call site.
 * e.g. formatRM(1200)   → "1,200.00"
 *      formatRM(49.5)   → "49.50"
 *      formatRM(0)      → "0.00"
 */
export function formatRM(value: number): string {
  return value.toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a plain integer/count with thousand separators (no decimals).
 * e.g. formatNum(12345) → "12,345"
 */
export function formatNum(value: number): string {
  return value.toLocaleString('en-MY', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
