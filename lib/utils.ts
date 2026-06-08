import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function getDeployedBasePath(): string {
  if (typeof window !== "undefined") {
    const nextData = (window as Window & { __NEXT_DATA__?: { basePath?: string } }).__NEXT_DATA__;
    if (nextData?.basePath) return nextData.basePath;
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
