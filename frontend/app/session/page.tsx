"use client";

import { useMemo, useState } from "react";
import {
  useAccount,
  useReadContract,
  useReadContracts,
} from "wagmi";
import {
  FOREST_ONCHAIN_ADDRESS,
  FOREST_ONCHAIN_ABI,
} from "@/lib/forestOnchain";
import SessionTimer from "@/components/session/SessionTimer";
import SessionControls from "@/components/session/SessionControls";
import ActiveSessionCard from "@/components/session/ActiveSessionCard";

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

export default function SessionPage() {
  const { address } = useAccount();
  const [breakTargetTimestamp, setBreakTargetTimestamp] = useState<number | null>(null);

  // 1) Get activity types for this user
  const {
    data: activityTypesData,
    isLoading: isLoadingActivities,
  } = useReadContract({
    address: FOREST_ONCHAIN_ADDRESS,
    abi: FOREST_ONCHAIN_ABI,
    functionName: "getUserActivityTypes",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
    },
  });

  const activityTypes = (activityTypesData ?? []) as string[];

  // 2) For each activity type, read: getGoal, getEndTime, getStakedAmount
  const goalContracts = useMemo(() => {
    if (!address || activityTypes.length === 0) return [];

    return activityTypes.flatMap((activityType) => [
      {
        address: FOREST_ONCHAIN_ADDRESS,
        abi: FOREST_ONCHAIN_ABI,
        functionName: "getGoal" as const,
        args: [address, activityType] as const,
      },
      {
        address: FOREST_ONCHAIN_ADDRESS,
        abi: FOREST_ONCHAIN_ABI,
        functionName: "getEndTime" as const,
        args: [address, activityType] as const,
      },
      {
        address: FOREST_ONCHAIN_ADDRESS,
        abi: FOREST_ONCHAIN_ABI,
        functionName: "getStakedAmount" as const,
        args: [address, activityType] as const,
      },
    ]);
  }, [address, activityTypes]);

  const {
    data: goalsData,
    isLoading: isLoadingGoals,
    refetch: refetchGoals,
  } = useReadContracts({
    contracts: goalContracts,
    query: {
      enabled: goalContracts.length > 0,
    },
  });

  // 3) Shape goals into per-activity objects, filter to ongoing (not expired)
  const activeGoals: Goal[] = useMemo(() => {
    if (!goalsData || activityTypes.length === 0) return [];

    const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
    const results: Goal[] = [];

    // 3 calls per activity: getGoal, getEndTime, getStakedAmount
    for (let i = 0; i < activityTypes.length; i++) {
      const baseIndex = i * 3;
      const treesResult = goalsData[baseIndex];
      const endTimeResult = goalsData[baseIndex + 1];
      const stakedAmountResult = goalsData[baseIndex + 2];

      const treesRemaining =
        (treesResult?.result as bigint | undefined) ?? 0n;
      const endTime =
        (endTimeResult?.result as bigint | undefined) ?? 0n;
      const stakedAmount =
        (stakedAmountResult?.result as bigint | undefined) ?? 0n;

      // Ongoing = has remaining trees AND not expired
      if (treesRemaining > 0n && endTime > nowSeconds) {
        results.push({
          activityType: activityTypes[i],
          treesRemaining,
          endTime,
          stakedAmount,
        });
      }
    }

    return results;
  }, [goalsData, activityTypes]);

  // 4) Get current session (if any)
  const {
    data: sessionData,
    refetch: refetchSession,
  } = useReadContract({
    address: FOREST_ONCHAIN_ADDRESS,
    abi: FOREST_ONCHAIN_ABI,
    functionName: "getCurrentUserSession",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
    },
  });

  const currentSession = sessionData as UserSession | undefined;
  const hasActiveSession = Boolean(currentSession?.active);

  // 5) Get breakNeeded status
  const {
    data: breakNeededData,
    refetch: refetchBreakNeeded,
  } = useReadContract({
    address: FOREST_ONCHAIN_ADDRESS,
    abi: FOREST_ONCHAIN_ABI,
    functionName: "getBreakNeeded",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
    },
  });

  const breakNeeded = Boolean(breakNeededData);

  // Session timer target from on-chain endTime
  const sessionEndTimestamp =
    currentSession && currentSession.active
      ? Number(currentSession.endTime)
      : null;

  // Find the goal matching the current session's activity (to show goal info on the card)
  const goalForSession =
    currentSession && currentSession.active
      ? activeGoals.find(
          (g) => g.activityType === currentSession.activityType
        ) || null
      : null;

  const isLoading = isLoadingActivities || isLoadingGoals;

  function handleSessionUpdated() {
    // Called after startFocusSession or takeBreak tx confirmations
    refetchSession();
    refetchBreakNeeded();
    refetchGoals();
  }

  if (!address) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Current Session</h1>
        <p>Please connect your wallet to manage sessions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Current Session</h1>

      {isLoading && (
        <p className="text-sm text-gray-600">Loading your goals...</p>
      )}

      {!isLoading && activeGoals.length === 0 && (
        <p className="text-sm text-gray-600">
          You don&apos;t have any ongoing goals. Create a goal first, then
          start a session from it.
        </p>
      )}

      {/* Show either the session timer or the break timer */}
    <div className="w-full flex justify-center mt-4">
    <div className="w-full max-w-md">
        {breakNeeded ? (
        // Break timer: no status, no activity, no end time
        <SessionTimer
            label="Break Timer"
            targetTimestamp={breakTargetTimestamp}
        />
        ) : (
        // Session timer: show Active + activity + end time
        <SessionTimer
            label="Session Timer"
            targetTimestamp={sessionEndTimestamp}
            statusLabel={currentSession?.active ? "Active" : undefined}
            activityType={currentSession?.activityType ?? null}
            sessionEndTime={sessionEndTimestamp}
        />
        )}
    </div>
    </div>
    
      {/* Card with current session + goal info */}
      <ActiveSessionCard
        currentSession={currentSession ?? null}
        goalForSession={goalForSession}
        breakNeeded={breakNeeded}
      />

      {/* Controls: choose goal, start session, start break, etc. */}
      <SessionControls
        activeGoals={activeGoals}
        hasActiveSession={hasActiveSession}
        breakNeeded={breakNeeded}
        onSessionUpdated={handleSessionUpdated}
        onScheduleBreak={(breakMinutes) => {
          const nowSec = Math.floor(Date.now() / 1000);
          setBreakTargetTimestamp(nowSec + breakMinutes * 60);
        }}
      />
    </div>
  );
}
