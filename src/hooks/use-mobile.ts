import { useSyncExternalStore } from "react";

const MOBILE_QUERY = "(max-width: 768px)";

function subscribe(callback: () => void) {
  const media = window.matchMedia(MOBILE_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getServerSnapshot() {
  // Assume desktop on server to avoid hydration mismatch
  return false;
}

export function useMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
