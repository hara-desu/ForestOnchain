"use client";

import { useState, useMemo } from "react";

import {
  useAccount,
  useReadContract,
  useReadContracts,
} from "wagmi";

import {
  FOREST_ONCHAIN_ADDRESS,
  FOREST_ONCHAIN_ABI,
} from "@/lib/forestOnchain";

import GoalForm from "./GoalForm";

import ActiveGoalCard from "./ActiveGoalCard";


// Main component that shows the user's goals and a button to create new ones.
export default function GoalsOverview() {
  const { address } = useAccount();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // =========================================================
  // 1️⃣ Get all activity types for this user from the contract
  // =========================================================
  const {
    data: activityTypesData,      
    refetch: refetchActivityTypes,
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

  // =========================================================
  // 2️⃣ Build a list of multicall contract reads for each activity
  //    - getGoal(user, activityType)   -> trees remaining
  //    - getEndTime(user, activityType)-> goal deadline
  // =========================================================
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
    refetch: refetchGoals,    
    isLoading: isLoadingGoals,
  } = useReadContracts({
    contracts: goalContracts,
    query: {
      enabled: goalContracts.length > 0, 
    },
  });

  // =========================================================
  // 3️⃣ Shape the multicall results into structured goal objects
  //    One entry per activity type:
  //    { activityType, treesRemaining, endTime, stakedAmount }
  // =========================================================
  const activeGoals = useMemo(() => {
    if (!goalsData || activityTypes.length === 0) return [];

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

  if (!address) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Goals</h1>
        <p>Please connect your wallet to manage your goals.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
            key={goal.activityType}           
            activityType={goal.activityType} 
            treesRemaining={goal.treesRemaining}
            endTime={goal.endTime}
            stakedAmount={goal.stakedAmount}
          />
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <GoalForm
              onSuccess={handleGoalCreated}          
              onCancel={() => setIsModalOpen(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
