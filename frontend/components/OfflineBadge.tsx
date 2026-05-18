"use client";

import { useCallback, useEffect, useState } from "react";
import { WifiOff, AlertCircle } from "lucide-react";

export function OfflineBadge() {
  const [status, setStatus] = useState<"checking" | "offline" | "error">("checking");

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
    check();

    const handler = () => {
      if (document.visibilityState === "visible") {
        check();
      }
    };

    window.addEventListener("visibilitychange", handler);
    window.addEventListener("focus", handler);

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
      <div className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-50/90 px-3 py-1.5 text-xs font-medium text-amber-900 shadow-sm backdrop-blur-sm dark:border-amber-700/40 dark:bg-amber-950/80 dark:text-amber-200">
        <AlertCircle className="size-3.5" strokeWidth={2} />
        Backend no detectado
      </div>
    );
  }

  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-full border border-accent/25 bg-accent/8 px-3 py-1.5 text-xs font-medium text-accent shadow-sm backdrop-blur-sm dark:bg-accent/15">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-50" />
        <span className="relative inline-flex size-2 rounded-full bg-accent" />
      </span>
      <WifiOff className="size-3.5" strokeWidth={2} />
      <span className="tracking-wide">100% Local · Offline</span>
    </div>
  );
}
