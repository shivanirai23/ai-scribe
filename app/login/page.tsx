"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAppDispatch } from "@/store/hooks";
import { setUser, setLoggedIn } from "@/store/slices/userSlice";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { configureCognitoAuth } from "@/lib/auth/cognito";
import {
  confirmResetPassword,
  confirmSignIn,
  fetchAuthSession,
  fetchUserAttributes,
  resetPassword,
  signIn,
} from "aws-amplify/auth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  useEffect(() => {
    let isMounted = true;

    const redirectAuthenticatedUser = async () => {
      try {
        configureCognitoAuth();
        const session = await fetchAuthSession();
        if (!isMounted) {
          return;
        }

        if (session.tokens?.accessToken || session.tokens?.idToken) {
          router.replace("/recording");
        }
      } catch {
        // No active session; allow access to login.
      }
    };

    void redirectAuthenticatedUser();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const [email, setEmail] = useState(() => searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password dialog
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn({
        username: email,
        password,
      });

      if (result.nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED") {
        setError("A new password is required. Please use the 'Forgot password' option to reset your password.");
        setIsLoading(false);
        return;
      } else if (result.nextStep.signInStep !== "DONE") {
        setError("Additional authentication is required. Please try again or reset your password.");
        setIsLoading(false);
        return;
      }

      const attributes = await fetchUserAttributes();

      const firstName = attributes.given_name ?? attributes.name?.split(" ")[0] ?? "";
      const lastName = attributes.family_name ?? attributes.name?.split(" ").slice(1).join(" ") ?? "";

      dispatch(
        setUser({
          firstName,
          lastName,
          email: attributes.email ?? email,
          phone: attributes.phone_number ?? "",
          speciality: attributes["custom:specialty"] ?? "",
          clinicName: attributes["custom:clinic_name"] ?? "",
        })
      );
      dispatch(setLoggedIn(true));
      router.push("/recording");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sign in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMsg(null);

    if (!forgotEmail) {
      setForgotMsg({ type: "error", text: "Please enter your email address." });
      return;
    }

    setForgotLoading(true);
    try {
      const result = await resetPassword({ username: forgotEmail });

      if (result.nextStep.resetPasswordStep === "CONFIRM_RESET_PASSWORD_WITH_CODE") {
        setForgotMsg({
          type: "success",
          text: "A confirmation code was sent to your email. Use the prompts to finish the reset.",
        });

        const confirmationCode = window.prompt(
          "Enter the password reset confirmation code sent to your email."
        );
        if (!confirmationCode) {
          return;
        }

        const newPassword = window.prompt("Enter your new password.");
        if (!newPassword) {
          return;
        }

        await confirmResetPassword({
          username: forgotEmail,
          confirmationCode,
          newPassword,
        });

        setForgotMsg({ type: "success", text: "Your password has been updated. You can sign in now." });
        setForgotOpen(false);
      }
    } catch (error) {
      setForgotMsg({
        type: "error",
        text: error instanceof Error ? error.message : "Password reset failed. Please try again.",
      });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 overflow-hidden relative">
      {/* Radial gradient background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(140,198,63,0.1),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(229,100,159,0.1),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(41,171,226,0.1),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(247,148,29,0.1),transparent_40%)]" />
      </div>

      <div className="w-full max-w-md animate-fade-in-up">
        {/* Header */}
        <div className="text-center mb-8">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-3iYmNCbNrAz3xweW1kCvDFAA44QRiG.png"
            alt="HIKIGAI AIScribe Logo"
            width={80}
            height={80}
            className="mx-auto"
            unoptimized
            priority
          />
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-brand-gradient mt-4">
            Welcome
          </h1>
          <p className="text-slate-600 mt-2">Sign in to HIKIGAI AIScribe</p>
        </div>

        {/* Form card */}
        <div className="bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
          {/* Error banner */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 rounded-xl border border-slate-200 w-full text-sm placeholder:text-slate-400 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotOpen(true);
                    setForgotMsg(null);
                    setForgotEmail("");
                  }}
                  className="text-sm text-[#0066b3] hover:text-[#b83280] transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 rounded-xl border border-slate-200 w-full text-sm placeholder:text-slate-400 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* CTA button */}
            <div className="pt-2">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-brand-gradient rounded-xl blur opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="relative w-full h-12 bg-white text-slate-800 hover:text-white hover:bg-brand-blue rounded-xl text-base font-medium transition-all duration-300 border-none flex items-center justify-center"
                >
                  {isLoading && (
                    <div className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  )}
                  Sign In
                </button>
              </div>
            </div>
          </form>

          <div className="mt-8 text-center">
            <span className="text-slate-600">Don&apos;t have an account? </span>
            <a
              href="/signup"
              className="text-brand-pink hover:text-brand-orange transition-colors font-medium"
            >
              Create one
            </a>
          </div>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent
          className="w-11/12 sm:w-full max-w-[425px] p-6"
          hiddenTitle="Forgot password"
          hiddenDescription="Send a password reset link to the entered email address"
        >
          <h2 className="text-slate-700 text-lg font-medium mb-1">Forgot Password</h2>
          <p className="text-slate-500 text-sm mb-4">
            Enter your email address below and we&apos;ll send you a link to reset your password.
          </p>
          <form onSubmit={handleForgotPassword}>
            <div className="space-y-4 pb-6">
              <label className="text-sm text-slate-700 block">Email</label>
              <input
                type="email"
                placeholder="name@example.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full h-10 rounded-md border border-slate-200 px-3 mt-2 text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
              />
              {forgotMsg && (
                <div
                  className={`text-sm p-2 rounded-md ${
                    forgotMsg.type === "success"
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {forgotMsg.text}
                </div>
              )}
            </div>
            <div className="flex gap-4 justify-end">
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={forgotLoading}
                className="bg-brand-blue hover:bg-brand-pink text-white rounded-md px-4 py-2 text-sm transition-colors flex items-center"
              >
                {forgotLoading && (
                  <div className="mr-2 h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Send Reset Link
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
