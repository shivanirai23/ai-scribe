import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function normalizeBasePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function getConfiguredBasePath(): string {
  if (typeof window === "undefined") return "";

  const nextData = (window as Window & { __NEXT_DATA__?: { basePath?: string } }).__NEXT_DATA__;
  if (nextData?.basePath) return nextData.basePath;

  const publicBasePath = process.env.NEXT_PUBLIC_BASEPATH;
  if (publicBasePath) {
    return normalizeBasePath(publicBasePath);
  }

  return "";
}

function getRuntimeBasePath(): string {
  if (typeof window === "undefined" || getConfiguredBasePath()) return "";

  // Derive from current URL at runtime (works even if build-time env missing).
  // On Hikigai platform the app is mounted at /<slug>/... e.g. /ai-scribe-a060ee0a.
  // The platform may also mount apps at reserved-looking paths like /signup.
  const knownPages = new Set([
    "recording", "login", "signup", "pricing", "help",
    "visit-details", "processing", "api",
  ]);
  const pathSegments = window.location.pathname.split("/").filter(Boolean);
  const [firstSegment, secondSegment] = pathSegments;

  if (
    firstSegment &&
    (window.location.hostname.endsWith(".cloudfront.net") ||
      !knownPages.has(firstSegment) ||
      (secondSegment ? knownPages.has(secondSegment) : false))
  ) {
    return `/${firstSegment}`;
  }

  return "";
}

function getDeployedBasePath(): string {
  return getConfiguredBasePath() || getRuntimeBasePath();
}

export function withBasePath(path: string): string {
  if (!path.startsWith("/")) return path;
  const basePath = getDeployedBasePath();
  return basePath ? basePath + path : path;
}

export function withRouteBasePath(path: string): string {
  if (!path.startsWith("/")) return path;
  const basePath = getRuntimeBasePath();
  return basePath ? basePath + path : path;
}

export function withoutBasePath(path: string): string {
  const basePath = getDeployedBasePath();
  if (!basePath || (path !== basePath && !path.startsWith(`${basePath}/`))) return path;

  const stripped = path.slice(basePath.length);
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(withBasePath(path), init);
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
