import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';

/** Merge Tailwind classes safely, resolving conflicts */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as USD currency: $1,850.00 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Format an ISO date string as "DD MMM YYYY", e.g. "01 Sep 2024" */
export function formatDate(isoString: string): string {
  return format(parseISO(isoString), 'dd MMM yyyy');
}

/** Format lead time as "21 days" */
export function formatLeadTime(days: number): string {
  return `${days} day${days === 1 ? '' : 's'}`;
}
