"use client";

import { formatEther } from "viem";

type Goal = {
  activityType: string;
  treesRemaining: bigint;
  endTime: bigint;
  stakedAmount: bigint;
};

type UserSession = {
  activityType: string;
  startTime: bigint;
  endTime: bigint;
  active: boolean;
  owner: string;
};

type ActiveSessionCardProps = {
  currentSession: UserSession | null;
  goalForSession: Goal | null;
  breakNeeded: boolean;
};

export default function ActiveSessionCard({
  currentSession,
  goalForSession,
  breakNeeded,
}: ActiveSessionCardProps) {
  const sessionActive = Boolean(currentSession?.active);

  const sessionEndDate =
    currentSession && currentSession.endTime > 0n
      ? new Date(Number(currentSession.endTime) * 1000)
      : null;

  const goalEndDate =
    goalForSession && goalForSession.endTime > 0n
      ? new Date(Number(goalForSession.endTime) * 1000)
      : null;

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm space-y-3">
      <h3 className="font-semibold text-lg mb-1">Current Goal</h3>
      {goalForSession ? (
        <div className="space-y-1 text-sm">
          <p>
            Trees remaining:{" "}
            <span className="font-mono">
              {goalForSession.treesRemaining.toString()}
            </span>
          </p>
          <p>
            Stake amount:{" "}
            <span className="font-mono">
              {formatEther(goalForSession.stakedAmount)} ETH
            </span>
          </p>
          {goalEndDate && (
            <p>
              Goal ends by:{" "}
              <span className="font-mono">
                {goalEndDate.toLocaleString()}
              </span>
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-600">
          No matching goal found for the current session&apos;s activity.
        </p>
      )}
    </div>
  );
}
