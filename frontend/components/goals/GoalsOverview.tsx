"use client";
// This component uses React hooks and wagmi hooks, so it must run on the client.

import { useState, useMemo } from "react";
// useState: for local UI state (modal open/closed).
// useMemo: to memorize computed values (like contract call lists, processed goals).

import {
  useAccount,
  useReadContract,
  useReadContracts,
} from "wagmi";
// useAccount: info about the connected wallet (address).
// useReadContract: single contract read (for activity types).
// useReadContracts: batch/multicall (for goals + end times).

import {
  FOREST_ONCHAIN_ADDRESS,
  FOREST_ONCHAIN_ABI,
} from "@/lib/forestOnchain";
// Shared config with your ForestOnchain contract address + ABI.

import GoalForm from "./GoalForm";
// The form component used inside the modal for creating a new goal.

import ActiveGoalCard from "./ActiveGoalCard";
// Card component that displays each active goal (and now includes Claim Stake behavior).


// Main component that shows the user's goals and a button to create new ones.
export default function GoalsOverview() {
  // Get the currently connected wallet address (or undefined if not connected).
  const { address } = useAccount();

  // Local state to control whether the "Create Goal" modal is open.
  const [isModalOpen, setIsModalOpen] = useState(false);

  // =========================================================
  // 1️⃣ Get all activity types for this user from the contract
  // =========================================================
  const {
    data: activityTypesData,      // Raw result from getUserActivityTypes
    refetch: refetchActivityTypes,// Function to manually trigger a refetch
    isLoading: isLoadingActivities,// Loading flag for this read
  } = useReadContract({
    address: FOREST_ONCHAIN_ADDRESS,
    abi: FOREST_ONCHAIN_ABI,
    functionName: "getUserActivityTypes",   // function(address) -> string[]
    args: address ? [address] : undefined,  // Only pass args if address exists
    query: {
      enabled: Boolean(address),            // Do not run if wallet is not connected
    },
  });

  // Normalize activity types to a string array (default to empty array if undefined).
  const activityTypes = (activityTypesData ?? []) as string[];

  // =========================================================
  // 2️⃣ Build a list of multicall contract reads for each activity
  //    - getGoal(user, activityType)   -> trees remaining
  //    - getEndTime(user, activityType)-> goal deadline
  // =========================================================
  const goalContracts = useMemo(() => {
    // If no address or no activity types, we don’t need to call anything.
    if (!address || activityTypes.length === 0) return [];

    // For each activity type, we create TWO contract read descriptors:
    // [ getGoal, getEndTime ]
    // We then flatten them into a single array.
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
  // Memoized to avoid rebuilding this array on every render unless
  // "address" or "activityTypes" changes.

  // Actually perform the multicall reads for all goals/endTimes.
  const {
    data: goalsData,          // Array of { result, status, ... } for each call
    refetch: refetchGoals,    // Function to refetch this multicall
    isLoading: isLoadingGoals,// Loading flag for this batch read
  } = useReadContracts({
    contracts: goalContracts, // The array we just built
    query: {
      enabled: goalContracts.length > 0, // Only run if there is something to read
    },
  });

  // =========================================================
  // 3️⃣ Shape the multicall results into structured goal objects
  //    One entry per activity type:
  //    { activityType, treesRemaining, endTime, stakedAmount }
  // =========================================================
  const activeGoals = useMemo(() => {
    // If no data or no activity types, return an empty list.
    if (!goalsData || activityTypes.length === 0) return [];

    // We'll accumulate results into this array.
    const results: {
      activityType: string;
      treesRemaining: bigint;
      endTime: bigint;
      stakedAmount: bigint;
    }[] = [];

    // Each activity type has THREE entries in goalsData:
    // index i * 3     -> getGoal result
    // index i * 3 + 1 -> getEndTime result
    // index i * 3 + 2 -> getStakedAmount result
    for (let i = 0; i < activityTypes.length; i++) {
      const baseIndex = i * 3;

      const treesResult = goalsData[baseIndex];
      const endTimeResult = goalsData[baseIndex + 1];
      const stakedAmountResult = goalsData[baseIndex + 2];

      // Extract the actual values from the multicall results.
      const treesRemaining =
        (treesResult?.result as bigint | undefined) ?? 0n;
      const endTime =
        (endTimeResult?.result as bigint | undefined) ?? 0n;
      const stakedAmount =
        (stakedAmountResult?.result as bigint | undefined) ?? 0n;

      // Simple rule for "active": there are still trees left to complete.
      if (treesRemaining > 0n) {
        results.push({
          activityType: activityTypes[i],
          treesRemaining,
          endTime,
          stakedAmount
        });
      }
    }

    return results;
  }, [goalsData, activityTypes]);
  // Again, memoized so we only recompute when goalsData or activityTypes change.

  // Combined loading flag from both activity-type and goals calls.
  const isLoading = isLoadingActivities || isLoadingGoals;

  // =========================================================
  // When a goal is successfully created from the modal:
  //  - Close the modal
  //  - Refetch activity types
  //  - Refetch the goals data
  // =========================================================
  function handleGoalCreated() {
    setIsModalOpen(false);
    refetchActivityTypes();
    refetchGoals();
  }

  // If there's no wallet connected, show a simple message and
  // do not attempt to query goals.
  if (!address) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Goals</h1>
        <p>Please connect your wallet to manage your goals.</p>
      </div>
    );
  }

  // =========================================================
  // If we DO have a connected wallet, render the goals UI:
  //  - Page title + "Create Goal" button
  //  - Loading / empty states
  //  - List of ActiveGoalCard components
  //  - Modal with GoalForm
  // =========================================================
  return (
    <div className="space-y-4">
      {/* Header: title + Create Goal button (opens modal) */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Goals</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm"
        >
          Create Goal
        </button>
      </div>

      {/* Loading state while fetching activity types and/or goals */}
      {isLoading && (
        <p className="text-sm text-gray-600">Loading goals...</p>
      )}

      {/* Empty state: no active goals after loading finishes */}
      {!isLoading && activeGoals.length === 0 && (
        <p className="text-sm text-gray-600">
          You don&apos;t have any active goals yet. Create one to get
          started!
        </p>
      )}

      {/* Grid of active goal cards */}
      <div className="grid gap-4">
        {activeGoals.map((goal) => (
          <ActiveGoalCard
            key={goal.activityType}           // React key for list rendering
            activityType={goal.activityType} // Passed into the card as props
            treesRemaining={goal.treesRemaining}
            endTime={goal.endTime}
            stakedAmount={goal.stakedAmount}
          />
        ))}
      </div>

      {/* Very simple modal implementation: semi-transparent overlay + centered box */}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <GoalForm
              onSuccess={handleGoalCreated}          // Close + refresh on success
              onCancel={() => setIsModalOpen(false)} // Close when Cancel is clicked
            />
          </div>
        </div>
      )}
    </div>
  );
}
