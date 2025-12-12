// src/domain/content/copyHelpers.ts
// Helpers to standardize consumer-friendly wording

/**
 * Format a decimal as a percentage string
 * @param n - Decimal value (e.g., 0.132)
 * @param decimals - Number of decimal places (default 1)
 * @returns Formatted percentage string (e.g., "13.2%")
 */
export function formatPct(n: number, decimals: number = 1): string {
  if (n === undefined || n === null || isNaN(n)) return "—";
  return `${(n * 100).toFixed(decimals)}%`;
}

/**
 * Format a number as currency
 * @param n - Number value
 * @param compact - Use compact notation for large numbers (default false)
 * @returns Formatted currency string (e.g., "$1,234" or "$1.2M")
 */
export function formatCurrency(n: number, compact: boolean = false): string {
  if (n === undefined || n === null || isNaN(n)) return "—";
  
  if (compact && Math.abs(n) >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(1)}M`;
  }
  if (compact && Math.abs(n) >= 1_000) {
    return `$${(n / 1_000).toFixed(0)}K`;
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Convert string to sentence case (first letter uppercase, rest lowercase)
 * Handles ALL CAPS and preserves acronyms if they're short (2-4 chars)
 * @param s - Input string
 * @returns Sentence-cased string
 */
export function sentenceCase(s: string): string {
  if (!s) return "";
  
  // Split into words and process each
  return s
    .split(' ')
    .map((word, index) => {
      // Preserve short acronyms (2-4 uppercase letters)
      if (/^[A-Z]{2,4}$/.test(word)) {
        return word;
      }
      // First word: capitalize first letter, lowercase rest
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      // Other words: lowercase unless it looks like an acronym
      return word.toLowerCase();
    })
    .join(' ');
}

/**
 * Format a ratio for display (e.g., Sharpe ratio)
 * @param n - Ratio value
 * @param decimals - Number of decimal places (default 2)
 * @returns Formatted ratio string
 */
export function formatRatio(n: number, decimals: number = 2): string {
  if (n === undefined || n === null || isNaN(n)) return "—";
  return n.toFixed(decimals);
}

/**
 * Pluralize a word based on count
 * @param count - Number of items
 * @param singular - Singular form
 * @param plural - Plural form (optional, defaults to singular + "s")
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

/**
 * Generate a friendly descriptor for a percentage value
 * @param pct - Percentage as decimal (e.g., 0.35 for 35%)
 * @returns Friendly descriptor
 */
export function pctDescriptor(pct: number): string {
  if (pct >= 0.5) return "more than half";
  if (pct >= 0.4) return "nearly half";
  if (pct >= 0.25) return "about a quarter";
  if (pct >= 0.15) return "a significant portion";
  if (pct >= 0.1) return "about 10%";
  return "a small portion";
}
