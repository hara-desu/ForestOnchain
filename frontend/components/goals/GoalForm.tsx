"use client";
// This component uses React hooks and wallet state, so it must run on the client.

import { useState, FormEvent, useEffect } from "react";
// useState: local component state (inputs, flags, errors).
// FormEvent: type for the form submit event.

import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
// useAccount: info about the connected wallet (address, isConnected).
// useReadContract: read-only calls to your contract.
// useWriteContract: for sending transactions to your contract.
// useWaitForTransactionReceipt: to track transaction confirmation.

import { formatEther } from "viem";
// formatEther: converts wei (bigint) into ETH as a readable string/number.

import {
  FOREST_ONCHAIN_ADDRESS,
  FOREST_ONCHAIN_ABI,
} from "@/lib/forestOnchain";
// Your contract address + ABI, imported from a shared helper.

type GoalFormProps = {
  // Optional callback when goal creation succeeds (used to close modal, refresh data).
  onSuccess?: () => void;
  // Optional callback when user clicks Cancel.
  onCancel?: () => void;
};

// Helper to convert low-level errors into nicer messages
function getFriendlyErrorMessage(error: unknown): string {
  if (!error) return "Transaction failed for an unknown reason.";

  // wagmi / viem error objects often have 'shortMessage' and 'details'
  if (typeof error === "object" && "shortMessage" in error) {
    const e = error as { shortMessage?: string; message?: string; details?: string };
    const details = e.details ?? "";

    // Try to detect your custom errors by name and show a clearer message
    if (details.includes("GoalAlreadyExists")) {
      return "You already have an active goal with this activity type.";
    }
    if (details.includes("IncorrectStakeSent")) {
      return "The stake amount sent does not match the required stake.";
    }
    if (details.includes("GoalDurationShouldBeMoreThan60Minutes")) {
      return "Goal duration must be at least 60 minutes total.";
    }

    // Fallback to shortMessage or message
    return e.shortMessage || e.message || "Transaction failed.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export default function GoalForm({ onSuccess, onCancel }: GoalFormProps) {
  // Current connected wallet address (or undefined if not connected).
  const { address } = useAccount();

  // Local form state: activity type, goal duration in DAYS, and number of trees.
  const [activityType, setActivityType] = useState("Study");
  const [durationDays, setDurationDays] = useState("1"); // default: 1 day
  const [numTrees, setNumTrees] = useState("1");

  // Flags and errors for UX.
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ---------------------------
  // 1) Read cost_per_tree (global config)
  // ---------------------------
  const { data: costPerTreeData } = useReadContract({
    address: FOREST_ONCHAIN_ADDRESS,        // Contract address
    abi: FOREST_ONCHAIN_ABI,                // Contract ABI
    functionName: "cost_per_tree",          // Public uint in your contract
    query: {
      enabled: Boolean(address),            // Only run if wallet is connected
    },
  });

  // Normalize the read value into a bigint, defaulting to 0n if undefined.
  const costPerTree = (costPerTreeData ?? 0n) as bigint;

  // ---------------------------
  // 2) Set up write + tx tracking
  // ---------------------------
  const {
    writeContract,         // Function to actually send transactions.
    data: txHash,          // Hash of the submitted transaction, once sent.
    isPending: isTxPending,// True while the transaction is being sent.
    error: txError,        // Any client-side or RPC error from write.
  } = useWriteContract();

  const {
    isLoading: isConfirming,  // True while waiting for the tx to be mined.
    isSuccess: isConfirmed,   // True once the transaction is confirmed.
  } = useWaitForTransactionReceipt({
    hash: txHash,             // Track this hash.
    query: { enabled: Boolean(txHash) }, // Only run if we actually have a tx hash.
  });

  // ---------------------------
  // 3) Compute stake (ETH amount)
  // ---------------------------

  // Convert numTrees from string → number for some checks.
  const numTreesInt = Number(numTrees || "0");

  // totalStakeWei = cost_per_tree * numTrees
  const totalStakeWei =
    numTreesInt > 0 ? costPerTree * BigInt(numTreesInt) : 0n;

  // Convert wei → ETH number for display.
  const totalStakeEth = Number(formatEther(totalStakeWei || 0n));

  // Combined flag: any submitting/confirming state.
  const isSubmitting = isTxPending || isConfirming;

  // ---------------------------
  // 4) Form submit handler
  // ---------------------------
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();      // Prevent default <form> page reload behavior.
    setFormError(null);     // Clear any previous error.

    // Must have a connected wallet.
    if (!address) {
      setFormError("Please connect your wallet first.");
      return;
    }

    // Activity type is required.
    if (!activityType.trim()) {
      setFormError("Activity type is required.");
      return;
    }

    // Enforce the 32-character limit (to mirror bytes32-ish length).
    if (activityType.length > 32) {
      setFormError("Activity type must be 32 characters or fewer.");
      return;
    }

    // Parse goal duration (in DAYS, from the input string).
    const duration = Number(durationDays);
    if (Number.isNaN(duration) || duration <= 0) {
      setFormError("Duration must be a positive number of days.");
      return;
    }

    // Number of trees must be >= 1 (matches contract requirement).
    if (numTreesInt <= 0) {
      setFormError("Number of trees must be at least 1.");
      return;
    }

    // Make sure we have a valid cost_per_tree from contract.
    if (costPerTree === 0n) {
      setFormError("Cost per tree cannot be 0.");
      return;
    }

    // Flip this so that when the tx confirms we can trigger onSuccess.
    setHasSubmitted(true);

    try {
      // ---------------------------
      // Convert days → seconds
      // ---------------------------
      // Your contract expects duration in SECONDS.
      // 1 day = 24 hours * 60 minutes * 60 seconds = 86400 seconds.
      const durationSeconds = BigInt(duration) * 24n * 60n * 60n;

      // Call startGoal(activityType, durationSeconds, numTrees) with stake as msg.value.
      await writeContract({
        address: FOREST_ONCHAIN_ADDRESS,
        abi: FOREST_ONCHAIN_ABI,
        functionName: "startGoal",
        args: [activityType, durationSeconds, BigInt(numTreesInt)],
        value: totalStakeWei,    // ETH value sent with the transaction (stake)
      });
    } catch (err) {
      console.error(err);
      setFormError(getFriendlyErrorMessage(err));
      setHasSubmitted(false);   // Allow resubmission if something went wrong.
    }
  }

  // ---------------------------
  // 5) When tx is confirmed, call onSuccess (to close modal + refresh)
  //    ⚠️ This must be done in useEffect, not directly in render.
  // ---------------------------
  useEffect(() => {
    if (isConfirmed && hasSubmitted && onSuccess) {
      onSuccess();
    }
  }, [isConfirmed, hasSubmitted, onSuccess]);
  
  // If txError exists and we don't already have a formError from the catch,
  // derive a readable message from txError as a backup.
  const derivedTxError =
    !formError && txError ? getFriendlyErrorMessage(txError) : null;

  // ---------------------------
  // 6) JSX: the actual form UI
  // ---------------------------
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <h2 className="text-xl font-semibold mb-2">Create a new goal</h2>

      {/* Activity type input */}
      <div className="space-y-1">
        <label className="block text-sm font-medium">
          Activity Type (max 32 characters)
        </label>
        <input
          type="text"
          value={activityType}
          // Keep state trimmed to max 32 characters.
          onChange={(e) => setActivityType(e.target.value.slice(0, 32))}
          maxLength={32}
          className="w-full border rounded-md px-3 py-2 text-sm"
          placeholder="e.g. Solidity, Writing, Study"
        />
        <p className="text-xs text-gray-500">
          {activityType.length}/32 characters
        </p>
      </div>

      {/* Duration input in DAYS */}
      <div className="space-y-1">
        <label className="block text-sm font-medium">
          Goal Duration (days)
        </label>
        <input
          type="number"
          min={1} // At least 1 day (UI constraint; contract only requires > 60 minutes total)
          value={durationDays}
          onChange={(e) => setDurationDays(e.target.value)}
          className="w-full border rounded-md px-3 py-2 text-sm"
        />
        <p className="text-xs text-gray-500">
          Duration is stored on-chain in seconds. 1 day = 86,400 seconds.
        </p>
      </div>

      {/* Number of trees input */}
      <div className="space-y-1">
        <label className="block text-sm font-medium">
          Number of Trees (sessions)
        </label>
        <input
          type="number"
          min={1}
          value={numTrees}
          onChange={(e) => setNumTrees(e.target.value)}
          className="w-full border rounded-md px-3 py-2 text-sm"
        />
      </div>

      {/* Cost & total stake preview */}
      <div className="text-sm">
        <p>
          Cost per tree:{" "}
          <span className="font-mono">
            {formatEther(costPerTree || 0n)} ETH
          </span>
        </p>
        <p>
          Total stake:{" "}
          <span className="font-mono">
            {Number.isFinite(totalStakeEth) ? totalStakeEth : 0} ETH
          </span>
        </p>
      </div>

      {/* Form-level error (validation or tx error we set manually) */}
      {formError && (
        <p className="text-sm text-red-600">
          {formError}
        </p>
      )}

      {/* Backup error from txError if we didn't already set formError */}
      {derivedTxError && (
        <p className="text-sm text-red-600">
          {derivedTxError}
        </p>
      )}

      {/* Buttons row: Cancel / Submit */}
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm border rounded-md"
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-1.5 text-sm rounded-md bg-emerald-600 text-white disabled:opacity-60"
        >
          {isSubmitting ? "Submitting..." : "Create Goal"}
        </button>
      </div>
    </form>
  );
}
