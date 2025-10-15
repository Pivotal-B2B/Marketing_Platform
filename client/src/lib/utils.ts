import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRevenue(revenue: string | number | null | undefined): string | null {
  if (revenue === null || revenue === undefined) return null;
  
  const num = typeof revenue === 'string' ? parseFloat(revenue) : revenue;
  if (isNaN(num)) return typeof revenue === 'string' ? revenue : null;
  
  // Handle zero
  if (num === 0) return "$0";
  
  // Billions
  if (num >= 1_000_000_000) {
    const billions = num / 1_000_000_000;
    const rounded = parseFloat(billions.toFixed(1));
    return `$${rounded}B`;
  }
  
  // Millions (check for round-up overflow to billions)
  if (num >= 1_000_000) {
    const millions = num / 1_000_000;
    const rounded = parseFloat(millions.toFixed(1));
    if (rounded >= 1000) {
      return `$${(rounded / 1000).toFixed(1)}B`;
    }
    return `$${rounded}M`;
  }
  
  // Thousands (check for round-up overflow to millions)
  if (num >= 1_000) {
    const thousands = num / 1_000;
    const rounded = parseFloat(thousands.toFixed(1));
    if (rounded >= 1000) {
      return `$${(rounded / 1000).toFixed(1)}M`;
    }
    return `$${rounded}K`;
  }
  
  return `$${num.toFixed(0)}`;
}
