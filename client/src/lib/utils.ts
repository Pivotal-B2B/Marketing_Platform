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
  
  // Helper to format number without trailing .0
  const formatNumber = (n: number): string => {
    const rounded = parseFloat(n.toFixed(1));
    return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
  };
  
  // Trillions (cap at $999.9T - no company has higher revenue)
  if (num >= 1_000_000_000_000) {
    const trillions = num / 1_000_000_000_000;
    const rounded = parseFloat(trillions.toFixed(1));
    if (rounded >= 1000) {
      return "$999.9T"; // Cap at maximum displayable value
    }
    return `$${formatNumber(trillions)}T`;
  }
  
  // Billions (check for round-up overflow to trillions)
  if (num >= 1_000_000_000) {
    const billions = num / 1_000_000_000;
    const rounded = parseFloat(billions.toFixed(1));
    if (rounded >= 1000) {
      return `$${formatNumber(rounded / 1000)}T`;
    }
    return `$${formatNumber(billions)}B`;
  }
  
  // Millions (check for round-up overflow to billions)
  if (num >= 1_000_000) {
    const millions = num / 1_000_000;
    const rounded = parseFloat(millions.toFixed(1));
    if (rounded >= 1000) {
      return `$${formatNumber(rounded / 1000)}B`;
    }
    return `$${formatNumber(millions)}M`;
  }
  
  // Thousands (check for round-up overflow to millions)
  if (num >= 1_000) {
    const thousands = num / 1_000;
    const rounded = parseFloat(thousands.toFixed(1));
    if (rounded >= 1000) {
      return `$${formatNumber(rounded / 1000)}M`;
    }
    return `$${formatNumber(thousands)}K`;
  }
  
  return `$${num.toFixed(0)}`;
}
