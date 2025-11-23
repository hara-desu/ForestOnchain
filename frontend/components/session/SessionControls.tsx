"use client";

import { useState, FormEvent } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  FOREST_ONCHAIN_ADDRESS,
  FOREST_ONCHAIN_ABI,
} from "@/lib/forestOnchain";

type Goal = {
  activityType: string;
  treesRemaining: bigint;
  endTime: bigint;
  stakedAmount: bigint;
};

type SessionControlsProps = {
  activeGoals: Goal[];
  hasActiveSession: boolean;
  breakNeeded: boolean;
  onSessionUpdated?: () => void;
  onScheduleBreak?: (breakMinutes: number) => void;
};

export default function SessionControls({
  activeGoals,
  hasActiveSession,
  breakNeeded,
  onSessionUpdated,
  onScheduleBreak,
}: SessionControlsProps) {
  const [selectedActivity, setSelectedActivity] = useState<string>(
    activeGoals[0]?.activityType ?? ""
  );
  const [sessionMinutes, setSessionMinutes] = useState("25"); // must be 20–60
  const [breakMinutes, setBreakMinutes] = useState("5");
  const [formError, setFormError] = useState<string | null>(null);

  const {
    writeContract,
    data: txHash,
    isPending,
    error: txError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({
      hash: txHash,
      query: { enabled: Boolean(txHash) },
    });

  const isSubmitting = isPending || isConfirming;

  async function handleStartSession(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!selectedActivity) {
      setFormError("Please select an activity/goal.");
      return;
    }

    if (hasActiveSession) {
      setFormError("You already have an active session.");
      return;
    }

    if (breakNeeded) {
      setFormError(
        "A break is required before starting a new session. Take a break first."
      );
      return;
    }

    const minutes = Number(sessionMinutes);
    if (
      Number.isNaN(minutes) ||
      minutes < 20 ||
      minutes > 60
    ) {
      setFormError(
        "Session length must be between 20 and 60 minutes."
      );
      return;
    }

    const durationSeconds = BigInt(minutes) * 60n;

    try {
      await writeContract({
        address: FOREST_ONCHAIN_ADDRESS,
        abi: FOREST_ONCHAIN_ABI,
        functionName: "startFocusSession",
        args: [selectedActivity, durationSeconds],
      });
    } catch (err) {
      console.error(err);
      setFormError("Failed to send start session transaction.");
    }
  }

  async function handleTakeBreakOnChain() {
    setFormError(null);

    try {
      await writeContract({
        address: FOREST_ONCHAIN_ADDRESS,
        abi: FOREST_ONCHAIN_ABI,
        functionName: "takeBreak",
        args: [],
      });
    } catch (err) {
      console.error(err);
      setFormError("Failed to send takeBreak transaction.");
    }
  }

  // When any tx confirms, let parent refetch
  if (isSuccess && onSessionUpdated) {
    onSessionUpdated();
  }

  function handleScheduleBreak(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const minutes = Number(breakMinutes);
    if (Number.isNaN(minutes) || minutes <= 0) {
      setFormError("Break length must be a positive number.");
      return;
    }

    onScheduleBreak?.(minutes);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* LEFT: session controls */}
      <div className="border rounded-lg p-4 bg-white shadow-sm space-y-4">
        <h2 className="font-semibold text-lg">Session Controls</h2>

        {/* Choose activity / goal */}
        <form onSubmit={handleStartSession} className="space-y-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium">
              Choose goal / activity
            </label>
            <select
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              {activeGoals.map((goal) => (
                <option
                  key={goal.activityType}
                  value={goal.activityType}
                >
                  {goal.activityType} ({goal.treesRemaining.toString()}{" "}
                  trees left)
                </option>
              ))}
            </select>
          </div>

          {/* Session length input */}
          <div className="space-y-1">
            <label className="block text-sm font-medium">
              Session length (minutes)
            </label>
            <input
              type="number"
              min={20}
              max={60}
              value={sessionMinutes}
              onChange={(e) => setSessionMinutes(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-500">
              Contract enforces 20–60 minutes.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || activeGoals.length === 0}
            className="px-4 py-1.5 text-sm rounded-md bg-emerald-600 text-white disabled:opacity-60"
          >
            {isSubmitting ? "Starting..." : "Start Session"}
          </button>
        </form>
      </div>

      {/* RIGHT: break controls */}
      <div className="border rounded-lg p-4 bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Break Controls</h2>
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
            {breakNeeded ? "Break required" : "No break required"}
          </span>
        </div>

        <form onSubmit={handleScheduleBreak} className="space-y-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium">
              Break length (minutes)
            </label>
            <input
              type="number"
              min={1}
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-1.5 text-sm rounded-md border"
            >
              Start Break
            </button>

            <button
              type="button"
              onClick={handleTakeBreakOnChain}
              disabled={isSubmitting || !breakNeeded}
              className="px-4 py-1.5 text-sm rounded-md bg-emerald-600 text-white disabled:opacity-60"
            >
              End break
            </button>
          </div>
        </form>
      </div>

      {/* Shared error message at the bottom of the grid */}
      {(formError || txError) && (
        <p className="text-sm text-red-600 md:col-span-2">
          {formError ?? txError?.message}
        </p>
      )}
    </div>
  );

}
