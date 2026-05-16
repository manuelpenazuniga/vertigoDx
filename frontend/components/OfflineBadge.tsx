"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBadge() {
  const [status, setStatus] = useState<"checking" | "offline" | "error">("checking");

  useEffect(() => {
    fetch("http://localhost:8000/healthcheck")
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((data) => {
        if (data.offline === true) {
          setStatus("offline");
        } else {
          setStatus("error");
        }
      })
      .catch(() => {
        setStatus("error");
      });
  }, []);

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
