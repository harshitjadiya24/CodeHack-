import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
