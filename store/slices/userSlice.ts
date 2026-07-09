import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface UserState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  speciality: string;
  clinicName: string;
  totalMinutesLeft: number;
  totalMinutesAllowed: number;
  isLoggedIn: boolean;
}

const initialState: UserState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  speciality: "",
  clinicName: "",
  totalMinutesLeft: 2500,
  totalMinutesAllowed: 2500,
  isLoggedIn: false,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<Partial<UserState>>) {
      return { ...state, ...action.payload };
    },
    setLoggedIn(state, action: PayloadAction<boolean>) {
      state.isLoggedIn = action.payload;
    },
    updateProfile(
      state,
      action: PayloadAction<{
        firstName?: string;
        lastName?: string;
        speciality?: string;
      }>
    ) {
      return { ...state, ...action.payload };
    },
    logout(state) {
      state.isLoggedIn = false;
    },
    setMinutesLeft(state, action: PayloadAction<number>) {
      state.totalMinutesLeft = action.payload;
    },
  },
});

export const { setUser, setLoggedIn, updateProfile, logout, setMinutesLeft } = userSlice.actions;
export default userSlice.reducer;
