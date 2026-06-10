"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { useAppDispatch } from "@/store/hooks";
import { setUser } from "@/store/slices/userSlice";
import { apiFetch } from "@/lib/utils";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const sessionId = searchParams.get("session_id");

  const [verifying, setVerifying] = useState(Boolean(sessionId));
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    const verifySession = async () => {
      try {
        const res = await apiFetch("/api/stripe/verify-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        const data = await res.json();
        if (res.ok && data.upgraded) {
          setVerified(true);
          setVerifying(false);
          dispatch(setUser({ totalMinutesAllowed: 999999, totalMinutesLeft: 999999 }));
          return;
        }
      } catch {
        // fall through to polling
      }

      let attempts = 0;
      const maxAttempts = 5;

      const poll = async () => {
        try {
          const res = await apiFetch("/api/stripe/subscription-status");
          const data = await res.json();
          if (res.ok && data.upgraded) {
            setVerified(true);
            setVerifying(false);
            dispatch(setUser({ totalMinutesAllowed: 999999, totalMinutesLeft: 999999 }));
            return;
          }
        } catch {
          // ignore polling errors
        }

        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 2000);
        } else {
          setVerifying(false);
        }
      };

      poll();
    };

    void verifySession();
  }, [dispatch, sessionId]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-slate-100 py-4 px-6 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-3iYmNCbNrAz3xweW1kCvDFAA44QRiG.png"
            alt="HIKIGAI AIScribe Logo"
            width={36}
            height={36}
            className="mr-3"
            priority
          />
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-brand-gradient cursor-default">
            HIKIGAI AIScribe
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-24">
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          {verifying ? (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-green-600" />
              <h2 className="text-2xl font-bold">Verifying your payment...</h2>
              <p className="text-muted-foreground">Please wait while we confirm your upgrade.</p>
            </div>
          ) : verified ? (
            <div className="space-y-6">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold">Welcome to CarePilot!</h2>
              <p className="text-muted-foreground">
                Your upgrade is complete. You now have access to unlimited consultations, EHR
                integration, AI-powered clinical support, and more.
              </p>
              <div className="flex flex-col gap-3 pt-4">
                <button
                  className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl h-10"
                  onClick={() => router.push("/")}
                >
                  Launch CarePilot
                </button>
                <button
                  className="w-full rounded-xl h-10 border border-slate-200"
                  onClick={() => router.push("/pricing")}
                >
                  <span className="inline-flex items-center justify-center">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Pricing
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Something went wrong</h2>
              <p className="text-muted-foreground">
                We couldn&apos;t verify your payment. Please contact support if you were charged.
              </p>
              <button
                className="rounded-xl h-10 border border-slate-200 px-4"
                onClick={() => router.push("/pricing")}
              >
                <span className="inline-flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Pricing
                </span>
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-600" />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
