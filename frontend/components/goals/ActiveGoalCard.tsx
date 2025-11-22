"use client";

import { useState } from "react";
import { formatEther } from "viem";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  FOREST_ONCHAIN_ADDRESS,
  FOREST_ONCHAIN_ABI,
} from "@/lib/forestOnchain";

type ActiveGoalCardProps = {
  activityType: string;
  treesRemaining: bigint;
  endTime: bigint;
  stakedAmount: bigint;
};

export default function ActiveGoalCard({
  activityType,
  treesRemaining,
  endTime,
  stakedAmount
}: ActiveGoalCardProps) {
  // Convert on-chain seconds → JS Date (ms). If no endTime, endDate is null.
  const endDate =
    endTime && endTime > 0n ? new Date(Number(endTime) * 1000) : null;

  // Compute whether the goal is expired (on-chain-style comparison using seconds).
  const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
  const isExpired = endTime > 0n && endTime < nowSeconds;

  // Track local error state for claim button UI.
  const [claimError, setClaimError] = useState<string | null>(null);

  // Set up write hook for calling claimStake.
  const {
    writeContract,
    data: txHash,
    isPending: isClaimPending,
    error: txError,
  } = useWriteContract();

  // Track confirmation status of the claim transaction.
  const {
    isLoading: isConfirming,
    isSuccess: isClaimConfirmed,
  } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: Boolean(txHash) },
  });

  // Combined loading state while claim tx is in-flight.
  const isClaiming = isClaimPending || isConfirming;

  // Only allow claiming if goal is not expired and all trees are completed.
  const canClaim = !isExpired && treesRemaining === 0n;

  // Handler to call claimStake(activityType) on the contract.
  async function handleClaim() {
    setClaimError(null);

    if (!canClaim) {
      setClaimError(
        "You can only claim when all trees are completed and the goal is not expired."
      );
      return;
    }

    try {
      await writeContract({
        address: FOREST_ONCHAIN_ADDRESS,
        abi: FOREST_ONCHAIN_ABI,
        functionName: "claimStake",
        args: [activityType],
      });
    } catch (err) {
      console.error(err);
      setClaimError("Failed to send claim transaction.");
    }
  }

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm flex flex-col gap-2">
      {/* Header row: activity name + status badge */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg">{activityType}</h3>

        {isExpired ? (
          <span className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-700">
            Expired
          </span>
        ) : (
          <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
            Active Goal
          </span>
        )}
      </div>

      {/* Trees remaining */}
      <p className="text-sm">
        Trees remaining:{" "}
        <span className="font-mono">{treesRemaining.toString()}</span>
      </p>

      {/* Staked amount */}
      <p className="text-sm">
        Staked Amount:{" "}
        <span className="font-mono">{formatEther(stakedAmount).toString()}</span>
      </p>

      {/* End time, if present */}
      {endDate && (
        <p className="text-sm">
          Ends by:{" "}
          <span className="font-mono">
            {endDate.toLocaleString()}
          </span>
        </p>
      )}

      {/* Claim stake button + status */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={handleClaim}
          disabled={!canClaim || isClaiming}
          className="px-3 py-1.5 text-sm rounded-md bg-emerald-600 text-white disabled:opacity-60"
        >
          {isClaiming
            ? "Claiming..."
            : isClaimConfirmed
            ? "Claimed ✅"
            : "Claim Stake"}
        </button>

        {/* Small hint when claim is not available */}
        {!canClaim && !isClaiming && !isClaimConfirmed && (
          <span className="text-xs text-gray-500">
            Complete all trees before the deadline to claim.
          </span>
        )}
      </div>

      {/* Error messages from local validation or wagmi */}
      {(claimError || txError) && (
        <p className="text-xs text-red-600">
          {claimError ?? txError?.message}
        </p>
      )}
    </div>
  );
}
