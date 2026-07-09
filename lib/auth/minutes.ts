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
  const { fetchUserAttributes } = await import("aws-amplify/auth");
  const attributes = await fetchUserAttributes();
  return parseMinutesLeft(attributes[MINUTES_LEFT_ATTRIBUTE]);
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
    // Not signed in or fetch failed — keep local state.
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
    const { fetchUserAttributes, updateUserAttributes } = await import("aws-amplify/auth");
    const attributes = await fetchUserAttributes();
    const currentBalance = parseMinutesLeft(attributes[MINUTES_LEFT_ATTRIBUTE]);
    const newBalance = Math.max(0, currentBalance - minutesToDeduct);

    await updateUserAttributes({
      userAttributes: {
        [MINUTES_LEFT_ATTRIBUTE]: String(newBalance),
      },
    });

    dispatch(setUser({ totalMinutesLeft: newBalance }));
    dispatch(setVisitMinutesCharged(true));
  } catch (error) {
    console.error("Failed to deduct visit minutes:", error);
  }
}
