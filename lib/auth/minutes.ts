import type { AppDispatch } from "@/store";
import { setUser } from "@/store/slices/userSlice";
import { setVisitMinutesCharged } from "@/store/slices/recordingSlice";

export const DEFAULT_SUBSCRIPTION_MINUTES = 2500;
export const MINUTES_LEFT_ATTRIBUTE = "custom:minutes-left";

export function parseMinutesLeft(value: string | undefined | null): number {
  if (value == null || value === "") {
    return DEFAULT_SUBSCRIPTION_MINUTES;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_SUBSCRIPTION_MINUTES;
}

/** Active recording seconds → billable whole minutes (partial minute rounds up). */
export function recordingSecondsToBillableMinutes(seconds: number): number {
  if (seconds <= 0) return 0;
  return Math.ceil(seconds / 60);
}

export async function fetchMinutesLeftFromCognito(): Promise<number> {
  // Remote attribute sync pending identity profile API — use persisted Redux balance.
  const { store } = await import("@/store");
  return store.getState().user.totalMinutesLeft ?? DEFAULT_SUBSCRIPTION_MINUTES;
}

export async function syncMinutesLeft(dispatch: AppDispatch): Promise<void> {
  try {
    const minutesLeft = await fetchMinutesLeftFromCognito();
    dispatch(
      setUser({
        totalMinutesLeft: minutesLeft,
        totalMinutesAllowed: DEFAULT_SUBSCRIPTION_MINUTES,
      })
    );
  } catch {
    // Keep local state.
  }
}

export async function chargeVisitMinutesIfNeeded(
  dispatch: AppDispatch,
  recordingTimeSeconds: number,
  visitMinutesCharged: boolean
): Promise<void> {
  if (visitMinutesCharged) return;

  const minutesToDeduct = recordingSecondsToBillableMinutes(recordingTimeSeconds);
  if (minutesToDeduct === 0) {
    dispatch(setVisitMinutesCharged(true));
    return;
  }

  try {
    // Profile/update platform API pending — deduct from local persisted balance for now.
    const { store } = await import("@/store");
    const currentBalance = store.getState().user.totalMinutesLeft ?? DEFAULT_SUBSCRIPTION_MINUTES;
    const newBalance = Math.max(0, currentBalance - minutesToDeduct);

    dispatch(setUser({ totalMinutesLeft: newBalance }));
    dispatch(setVisitMinutesCharged(true));
  } catch (error) {
    console.error("Failed to deduct visit minutes:", error);
  }
}
