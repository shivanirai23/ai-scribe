"use client";

import { Provider } from "react-redux";
import { store, persistor } from "@/store";
import { PersistGate } from "redux-persist/integration/react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setUser, setLoggedIn } from "@/store/slices/userSlice";
import { configureCognitoAuth } from "@/lib/auth/cognito";
import { fetchUserAttributes } from "aws-amplify/auth";

if (typeof window !== "undefined") {
  configureCognitoAuth();
}

function UserSessionSync() {
  const dispatch = useDispatch();
  const isLoggedIn = useSelector((state: any) => state.user.isLoggedIn);

  useEffect(() => {
    async function syncUser() {
      if (!isLoggedIn) {
        try {
          configureCognitoAuth();
          const attributes = await fetchUserAttributes();
          if (attributes && attributes.email) {
            const firstName = attributes.given_name ?? attributes.name?.split(" ")[0] ?? "";
            const lastName = attributes.family_name ?? attributes.name?.split(" ").slice(1).join(" ") ?? "";
            dispatch(setUser({
              firstName,
              lastName,
              email: attributes.email,
              phone: attributes.phone_number ?? "",
              speciality: attributes["custom:specialty"] ?? "",
              clinicName: attributes["custom:clinic_name"] ?? "",
            }));
            dispatch(setLoggedIn(true));
          }
        } catch (e) {
          // Not signed in or error, do nothing
        }
      }
    }
    syncUser();
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
