"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { shouldRecordVisit } from "@/lib/visitCounter";

const LAST_VISIT_KEY = "vsn-last-counted-visit";
const VISIT_COUNT_KEY = "vsn-visit-count";
const MEANINGFUL_VISIT_DELAY_MS = 1_500;

function readLastVisit() {
  const stored = window.localStorage.getItem(LAST_VISIT_KEY);
  if (stored === null) return null;

  const timestamp = Number(stored);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function readVisitCount() {
  const count = Number(window.localStorage.getItem(VISIT_COUNT_KEY));
  return Number.isSafeInteger(count) && count >= 0 ? count : 0;
}

export function VisitCounter() {
  const [count, setCount] = useState<number | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let timeoutId: number | undefined;
    let started = false;

    function loadVisitCount() {
      if (started || document.visibilityState !== "visible") return;
      started = true;

      try {
        const now = Date.now();
        let nextCount = readVisitCount();

        if (shouldRecordVisit(readLastVisit(), now)) {
          nextCount += 1;
          window.localStorage.setItem(VISIT_COUNT_KEY, String(nextCount));
          window.localStorage.setItem(LAST_VISIT_KEY, String(now));
        }

        setCount(nextCount);
      } catch {
        setUnavailable(true);
      }
    }

    function scheduleVisit() {
      if (document.visibilityState !== "visible" || started) return;
      timeoutId = window.setTimeout(loadVisitCount, MEANINGFUL_VISIT_DELAY_MS);
    }

    scheduleVisit();
    document.addEventListener("visibilitychange", scheduleVisit);

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", scheduleVisit);
    };
  }, []);

  return (
    <span
      className="visit-counter"
      title="Stored only in this browser and counted at most once every 24 hours"
      aria-live="polite"
    >
      <Eye size={14} aria-hidden="true" />
      {count === null
        ? unavailable
          ? "Visits unavailable"
          : "Loading visits…"
        : `${count.toLocaleString("en-IN")} ${count === 1 ? "visit" : "visits"} from you`}
    </span>
  );
}
