"use client";

import { useCallback, useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBadge() {
  const [status, setStatus] = useState<"checking" | "offline" | "error">("checking");

  // Extract healthcheck into a stable callback so the interval and listeners
  // always reference the same function identity (avoids stale-closure issues).
  const check = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:8000/healthcheck");
      if (!res.ok) throw new Error("not ok");
      const data = await res.json();
      setStatus(data.offline === true ? "offline" : "error");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    // 1. Check once on mount.
    check();

    // 2. Re-check when the tab regains visibility or window regains focus,
    //    but only when the tab is actually visible to avoid redundant calls.
    const handler = () => {
      if (document.visibilityState === "visible") {
        check();
      }
    };

    window.addEventListener("visibilitychange", handler);
    window.addEventListener("focus", handler);

    // 3. Poll every 30s while status is "error" so the badge flips back
    //    automatically once the backend recovers — without a page refresh.
    //    We read status inside the interval via a ref trick isn't needed here
    //    because the interval is re-created whenever status changes (the effect
    //    re-runs when status is updated, and the cleanup tears down the old
    //    interval before starting a new one).
    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (status === "error") {
      intervalId = setInterval(check, 30_000);
    }

    return () => {
      window.removeEventListener("visibilitychange", handler);
      window.removeEventListener("focus", handler);
      if (intervalId !== undefined) {
        clearInterval(intervalId);
      }
    };
  }, [check, status]);

  if (status === "checking") return null;

  if (status === "error") {
    return (
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-amber-100 text-amber-800 shadow-sm border border-amber-200">
        Backend no detectado
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-secondary text-secondary-foreground shadow-sm border">
      <WifiOff className="w-4 h-4" />
      100% Local · Offline
    </div>
  );
}
