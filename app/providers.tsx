"use client";

import { Provider } from "react-redux";
import { store, persistor } from "@/store";
import { PersistGate } from "redux-persist/integration/react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setUser, setLoggedIn } from "@/store/slices/userSlice";
import {
  DEFAULT_SUBSCRIPTION_MINUTES,
  MINUTES_LEFT_ATTRIBUTE,
  parseMinutesLeft,
  syncMinutesLeft,
} from "@/lib/auth/minutes";
import {
  decodeIdToken,
  ensureIdentitySession,
  hasValidIdentitySession,
} from "@/lib/auth/session";

function UserSessionSync() {
  const dispatch = useDispatch();
  const isLoggedIn = useSelector((state: { user: { isLoggedIn: boolean } }) => state.user.isLoggedIn);

  useEffect(() => {
    async function syncUser() {
      try {
        const session = await ensureIdentitySession();
        if (session && hasValidIdentitySession(session)) {
          const claims = decodeIdToken(session.idToken);
          const firstName = claims?.given_name ?? claims?.name?.split(" ")[0];
          const lastName =
            claims?.family_name ?? claims?.name?.split(" ").slice(1).join(" ");

          dispatch(
            setUser({
              ...(firstName ? { firstName } : {}),
              ...(lastName ? { lastName } : {}),
              email: claims?.email ?? session.email,
              ...(claims?.role || claims?.["custom:role"] || claims?.["custom:specialty"]
                ? {
                    speciality: (claims.role ||
                      claims["custom:role"] ||
                      claims["custom:specialty"]) as string,
                  }
                : {}),
              ...(claims?.["custom:clinic_name"]
                ? { clinicName: claims["custom:clinic_name"] as string }
                : {}),
              ...(claims?.["custom:phone"] || claims?.phone_number
                ? {
                    phone: (claims["custom:phone"] || claims.phone_number) as string,
                  }
                : {}),
              ...(claims?.[MINUTES_LEFT_ATTRIBUTE]
                ? {
                    totalMinutesLeft: parseMinutesLeft(
                      claims[MINUTES_LEFT_ATTRIBUTE] as string
                    ),
                  }
                : {}),
              totalMinutesAllowed: DEFAULT_SUBSCRIPTION_MINUTES,
            })
          );
          dispatch(setLoggedIn(true));
          void syncMinutesLeft(dispatch);
          return;
        }
      } catch {
        // Not signed in or error.
      }

      if (isLoggedIn) {
        // Keep persisted Redux profile when remote attribute sync is unavailable.
        void syncMinutesLeft(dispatch);
      }
    }
    void syncUser();
  }, [isLoggedIn, dispatch]);
  return null;
}

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <UserSessionSync />
        {children}
      </PersistGate>
    </Provider>
  );
}
