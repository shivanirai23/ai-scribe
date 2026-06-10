"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MessageCircleMore } from "lucide-react";
import { withoutBasePath } from "@/lib/utils";

const SHOW_ON_ROUTES = ["/", "/recording", "/pricing", "/processing", "/visit-details"];

export function HelpButton() {
  const pathname = usePathname();
  const router = useRouter();

  const shouldShow = useMemo(() => {
    const appPathname = pathname ? withoutBasePath(pathname) : "";
    if (!appPathname || appPathname === "/help") return false;
    return SHOW_ON_ROUTES.some((route) =>
      route === "/" ? appPathname === "/" : appPathname.startsWith(route)
    );
  }, [pathname]);

  if (!shouldShow) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => router.push("/help")}
      className="fixed bottom-6 left-4 z-50 h-12 w-12 rounded-full bg-[#2c8eff] text-white shadow-xl flex items-center justify-center transition hover:brightness-95"
      aria-label="Open help"
    >
      <MessageCircleMore className="h-5 w-5" />
    </button>
  );
}
