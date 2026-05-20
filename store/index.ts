import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slices/userSlice";
import recordingReducer from "./slices/recordingSlice";

export const store = configureStore({
  reducer: {
    user: userReducer,
    recording: recordingReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
