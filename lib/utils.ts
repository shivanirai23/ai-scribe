import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function getDeployedBasePath(): string {
  if (typeof window === "undefined") return "";

  // Primary: Next.js injects basePath into __NEXT_DATA__ when configured in next.config
  const nextData = (window as Window & { __NEXT_DATA__?: { basePath?: string } }).__NEXT_DATA__;
  if (nextData?.basePath) return nextData.basePath;

  // Fallback: derive from current URL at runtime (works even if build-time env missing).
  // On Hikigai platform the app is mounted at /<slug>/... e.g. /ai-scribe-a060ee0a.
  // The first path segment is the basepath when it doesn't match a known app page.
  const knownPages = new Set([
    "recording", "login", "signup", "pricing", "help",
    "visit-details", "processing", "api",
  ]);
  const firstSegment = window.location.pathname.split("/").filter(Boolean)[0];
  if (firstSegment && !knownPages.has(firstSegment)) {
    return `/${firstSegment}`;
  }

  return "";
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(getDeployedBasePath() + path, init);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
