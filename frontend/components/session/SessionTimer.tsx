"use client";

import { useEffect, useState } from "react";

type SessionTimerProps = {
  label: string;
  targetTimestamp: number | null; // seconds since epoch, or null if no timer
  onComplete?: () => void;

  statusLabel?: string;          // e.g. "Active"
  activityType?: string | null;  // e.g. "Study"
  sessionEndTime?: number | null; // session end in seconds (Unix)
};

export default function SessionTimer({
  label,
  targetTimestamp,
  onComplete,
  statusLabel,
  activityType,
  sessionEndTime,
}: SessionTimerProps) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [hasCompleted, setHasCompleted] = useState(false);

  useEffect(() => {
    if (!targetTimestamp) {
      setRemaining(null);
      setHasCompleted(false);
      return;
    }

    const update = () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const diff = targetTimestamp - nowSec;

      if (diff <= 0) {
        setRemaining(0);
        if (!hasCompleted) {
          setHasCompleted(true);
          onComplete?.();
        }
      } else {
        setRemaining(diff);
      }
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetTimestamp, onComplete, hasCompleted]);

  function formatRemaining(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  }

  return (
  <div className="border rounded-lg p-6 bg-white shadow-md text-center">
    {/* Top row: label on left, status pill on right */}
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-semibold text-xl">{label}</h2>
      {statusLabel && (
        <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700">
          {statusLabel}
        </span>
      )}
    </div>

    {/* Big countdown */}
    {targetTimestamp && remaining !== null ? (
      <p className="text-5xl font-mono font-bold my-4">
        {remaining > 0 ? formatRemaining(remaining) : "00:00"}
      </p>
    ) : (
      <p className="text-sm text-gray-500">No active timer.</p>
    )}

    {/* Activity + session end time, shown only when provided */}
    {activityType && (
      <p className="text-sm text-gray-800 mt-3">
        Activity: <span className="font-mono">{activityType}</span>
      </p>
    )}

    {sessionEndTime && (
      <p className="text-xs text-gray-600">
        Session ends at:{" "}
        <span className="font-mono">
          {new Date(sessionEndTime * 1000).toLocaleString()}
        </span>
      </p>
    )}
  </div>
  );

}
