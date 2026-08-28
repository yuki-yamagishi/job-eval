import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSalary(min?: number, max?: number): string {
  if (!min && !max) return "応相談";
  if (min && max) return `${min}万〜${max}万円`;
  if (min) return `${min}万円〜`;
  return `〜${max}万円`;
}
