import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
   return twMerge(clsx(inputs))
}

export function debounce<T extends (...args: any[]) => void>(
   fn: T,
   delay: number
): (...args: Parameters<T>) => void {
   let timeoutId: ReturnType<typeof setTimeout> | null = null;
   
   return function (...args: Parameters<T>) {
      if (timeoutId) {
         clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
         fn(...args);
      }, delay);
   };
}
