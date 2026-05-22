"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Crown, QrCode, X, LogOut, Save, LockKeyhole, Info, Eye, EyeOff } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setShowUserSidebar,
  setShowQRCode,
  endVisit,
} from "@/store/slices/recordingSlice";
import { logout } from "@/store/slices/userSlice";
import { getInitials } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const SPECIALTIES = [
  "Internal Medicine",
  "Family Medicine",
  "Cardiology",
  "Dermatology",
  "Pediatrics",
  "Neurology",
  "Orthopedics",
  "Psychiatry",
  "Radiology",
  "Oncology",
];

function InfoTooltip({ text }: { text: string }) {
  return (
    <div className="relative group inline-flex">
      <Info className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400 cursor-help" />
      <div className="absolute left-0 top-full mt-1 z-50 hidden group-hover:block bg-slate-800 text-white text-xs rounded-md px-2 py-1 w-[225px] text-justify shadow-lg">
        {text}
      </div>
    </div>
  );
}

export function Header() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector((s) => s.user);
  const { visitId, showPremiumBanner } = useAppSelector((s) => s.recording);

  const initials = getInitials(user.firstName || "U", user.lastName || "S");

  return (
    <header className="bg-white border-b border-slate-100 py-3 sm:py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center sticky top-0 z-10 shadow-sm">
      {/* Left: Logo + Name */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-3iYmNCbNrAz3xweW1kCvDFAA44QRiG.png"
          alt="HIKIGAI AIScribe Logo"
          width={36}
          height={36}
          className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0"
          unoptimized
        />
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold bg-clip-text text-transparent bg-brand-gradient truncate">
          HIKIGAI AIScribe
        </h1>
      </div>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 flex-shrink-0">
        {showPremiumBanner && (
          <button
            onClick={() => router.push("/pricing")}
            className="flex text-white hover:bg-orange-500 bg-brand-orange border border-brand-orange rounded-full px-2 sm:px-4 text-xs sm:text-sm h-8 sm:h-9 items-center transition-colors"
          >
            <Crown className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden md:inline">Get Premium</span>
            <span className="hidden sm:inline md:hidden">Premium</span>
          </button>
        )}

        {visitId && (
          <>
            <button
              onClick={() => dispatch(setShowQRCode(true))}
              className="hidden sm:flex text-brand-blue hover:text-white hover:bg-brand-blue border border-brand-blue rounded-full px-3 sm:px-4 text-xs sm:text-sm h-8 sm:h-9 items-center transition-colors"
            >
              <QrCode className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden md:inline">QR Code</span>
            </button>

            <button
              onClick={() => dispatch(endVisit())}
              className="text-red-500 hover:text-white hover:bg-red-500 border border-red-200 rounded-full px-2.5 sm:px-3 md:px-4 text-xs sm:text-sm h-8 sm:h-9 flex items-center transition-colors"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-1 md:mr-2" />
              <span className="hidden sm:inline">End Visit</span>
            </button>
          </>
        )}

        {/* User Avatar */}
        <button
          onClick={() => dispatch(setShowUserSidebar(true))}
          className="rounded-full h-9 w-9 sm:h-10 sm:w-10 p-0 flex items-center justify-center"
        >
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full ring-2 ring-offset-2 ring-brand-blue bg-slate-100 flex items-center justify-center text-xs font-medium uppercase">
            {initials}
          </div>
        </button>
      </div>
    </header>
  );
}

export function UserProfileSidebar() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector((s) => s.user);
  const showSidebar = useAppSelector((s) => s.recording.showUserSidebar);

  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [specialty, setSpecialty] = useState(user.speciality);
  const [firstNameError, setFirstNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");

  // Change password dialog
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwError, setPwError] = useState("");

  const initials = getInitials(user.firstName || "U", user.lastName || "S");

  const handleSave = () => {
    let hasError = false;
    if (!firstName || firstName.length < 2) {
      setFirstNameError("Min 2 characters");
      hasError = true;
    }
    if (!lastName || lastName.length < 2) {
      setLastNameError("Min 2 characters");
      hasError = true;
    }
    if (hasError) return;
    // Would dispatch updateProfile in real use
    dispatch(setShowUserSidebar(false));
  };

  const handleChangePassword = () => {
    setPwError("");
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPwError("All fields are required");
      return;
    }
    if (
      newPassword.length < 8 ||
      !/[a-z]/.test(newPassword) ||
      !/[A-Z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[^a-zA-Z0-9]/.test(newPassword)
    ) {
      setPwError("Password must be 8+ chars with lowercase, uppercase, number, and special character");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match");
      return;
    }
    setChangePasswordOpen(false);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleLogout = () => {
    dispatch(logout());
    dispatch(endVisit());
    router.push("/login");
  };

  if (!showSidebar) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={() => dispatch(setShowUserSidebar(false))}
      />
      {/* Sidebar panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[320px] md:w-[400px] border-l border-slate-100 bg-white flex flex-col z-50 shadow-xl">
        {/* Gradient header */}
        <div className="bg-gradient-to-r from-brand-pink to-brand-orange p-4 sm:p-6 text-white">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full ring-4 ring-white/30 bg-white flex items-center justify-center text-black text-lg sm:text-2xl font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base sm:text-xl truncate">
                Dr. {user.firstName} {user.lastName}
              </h3>
              <p className="text-white/80 text-sm truncate">{user.speciality}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className="space-y-3 flex flex-col gap-2">
            {/* First Name */}
            <div className="space-y-2 relative">
              <label className="text-xs sm:text-sm font-medium text-slate-700">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); setFirstNameError(""); }}
                className={`w-full p-2 sm:p-3 border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue focus:border-brand-blue ${firstNameError ? "border-red-500" : "border-slate-200"}`}
              />
              {firstNameError && <p className="text-red-500 text-xs">{firstNameError}</p>}
            </div>

            {/* Last Name */}
            <div className="space-y-2 relative">
              <label className="text-xs sm:text-sm font-medium text-slate-700">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); setLastNameError(""); }}
                className={`w-full p-2 sm:p-3 border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue focus:border-brand-blue ${lastNameError ? "border-red-500" : "border-slate-200"}`}
              />
              {lastNameError && <p className="text-red-500 text-xs">{lastNameError}</p>}
            </div>

            {/* Specialty */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-slate-700">Specialty</label>
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger className="!h-10 sm:!h-12 text-xs sm:text-sm">
                  <SelectValue placeholder="Select specialty" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Email (disabled) */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full p-2 sm:p-3 border border-slate-200 rounded-xl text-xs sm:text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
              />
            </div>

            {/* Save Changes */}
            <button
              onClick={handleSave}
              className="w-full !mt-3 bg-brand-blue hover:bg-brand-pink text-white rounded-xl h-10 sm:h-11 text-sm sm:text-base flex items-center justify-center transition-colors"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </button>

            {/* Change Password */}
            <button
              onClick={() => setChangePasswordOpen(true)}
              className="w-full flex items-center justify-center space-x-2 rounded-xl h-10 sm:h-11 border border-slate-200 bg-transparent hover:bg-slate-100 text-black !mt-3 text-sm sm:text-base transition-colors"
            >
              <LockKeyhole className="h-4 w-4 mr-2" />
              Change Password
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-100">
          <div className="text-xs text-slate-400 mb-3 text-center">
            Minutes left - {user.totalMinutesLeft}
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 rounded-xl h-10 sm:h-11 border border-slate-200 text-sm sm:text-base hover:bg-slate-50 transition-colors"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent
          className="w-11/12 sm:w-full max-w-[425px] p-6"
          hiddenTitle="Change password"
          hiddenDescription="Form to update account password"
        >
          <h2 className="text-slate-700 text-lg font-medium mb-4">Change Password</h2>
          {pwError && (
            <div className="bg-red-100 rounded-md p-2 border border-red-200 mb-2">
              <p className="text-xs text-black">{pwError}</p>
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label className="text-xs sm:text-sm text-slate-700 block mb-1">Old Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full h-9 sm:h-10 rounded-md border border-slate-200 px-3 text-xs sm:text-sm focus:outline-none focus:border-brand-blue"
              />
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-slate-700 flex items-center gap-2 mb-1">
                New Password
                <InfoTooltip text="Password must be at least 8 characters and include lowercase, uppercase, number, and special character" />
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-9 sm:h-10 rounded-md border border-slate-200 px-3 text-xs sm:text-sm focus:outline-none focus:border-brand-blue"
              />
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-slate-700 block mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-9 sm:h-10 rounded-md border border-slate-200 px-3 pr-10 text-xs sm:text-sm focus:outline-none focus:border-brand-blue"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-6 flex-col sm:flex-row justify-end">
            <button
              onClick={() => setChangePasswordOpen(false)}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm sm:text-base hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleChangePassword}
              className="bg-brand-blue hover:bg-brand-pink text-white rounded-md px-4 py-2 text-sm sm:text-base transition-colors"
            >
              Confirm
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
