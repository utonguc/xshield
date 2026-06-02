"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ intervalSecs = 60 }: { intervalSecs?: number }) {
  const router = useRouter();
  const [secs, setSecs] = useState(intervalSecs);

  useEffect(() => {
    const id = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) {
          router.refresh();
          return intervalSecs;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [router, intervalSecs]);

  return <span className="refresh-badge">↻ {secs}s</span>;
}
