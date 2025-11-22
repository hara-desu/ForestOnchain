// components/admin/ChangeCostPerTreeForm.tsx
"use client";

import { useState, FormEvent } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatEther, parseEther } from "viem";
import {
  FOREST_ONCHAIN_ADDRESS,
  FOREST_ONCHAIN_ABI,
} from "@/lib/forestOnchain";

type ChangeCostPerTreeFormProps = {
  currentCostPerTree: bigint;
};

export default function ChangeCostPerTreeForm({
  currentCostPerTree,
}: ChangeCostPerTreeFormProps) {
  const [newCostEth, setNewCostEth] = useState(
    currentCostPerTree ? formatEther(currentCostPerTree) : "0.00"
  );
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!newCostEth.trim()) {
      setFormError("New cost must not be empty.");
      return;
    }

    let newCostWei: bigint;
    try {
      newCostWei = parseEther(newCostEth);
    } catch {
      setFormError("Invalid ETH amount format.");
      return;
    }

    if (newCostWei <= 0n) {
      setFormError("New cost per tree must be greater than 0.");
      return;
    }

    try {
      await writeContract({
        address: FOREST_ONCHAIN_ADDRESS,
        abi: FOREST_ONCHAIN_ABI,
        functionName: "changeCostPerTree",
        args: [newCostWei],
      });
    } catch (err) {
      console.error(err);
      setFormError("Failed to send transaction.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border rounded-lg p-4 bg-white shadow-sm space-y-3"
    >
      <h2 className="font-semibold text-lg">Set Cost per Tree</h2>

      <p className="text-xs text-gray-600">
        Current:{" "}
        <span className="font-mono">
          {formatEther(currentCostPerTree)} ETH
        </span>
      </p>

      <div className="space-y-1">
        <label className="block text-sm font-medium">
          New cost per tree (ETH)
        </label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={newCostEth}
          onChange={(e) => setNewCostEth(e.target.value)}
          className="w-full border rounded-md px-3 py-2 text-sm"
        />
      </div>

      {formError && (
        <p className="text-sm text-red-600">{formError}</p>
      )}

      {txError && (
        <p className="text-sm text-red-600">{txError.message}</p>
      )}

      {isSuccess && (
        <p className="text-xs text-emerald-700">
          Cost per tree updated successfully.
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="px-4 py-1.5 text-sm rounded-md bg-emerald-600 text-white disabled:opacity-60"
      >
        {isSubmitting ? "Updating..." : "Update Cost"}
      </button>
    </form>
  );
}
