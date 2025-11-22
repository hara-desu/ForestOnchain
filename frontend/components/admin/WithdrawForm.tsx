// components/admin/WithdrawForm.tsx
"use client";

import { useState, FormEvent } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
} from "wagmi";
import { parseEther } from "viem";
import {
  FOREST_ONCHAIN_ADDRESS,
  FOREST_ONCHAIN_ABI,
} from "@/lib/forestOnchain";

export default function WithdrawForm() {
  const [toAddress, setToAddress] = useState("");
  const [amountEth, setAmountEth] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data: balanceData } = useBalance({
    address: FOREST_ONCHAIN_ADDRESS,
  });

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

    if (!toAddress.trim()) {
      setFormError("Recipient address is required.");
      return;
    }

    if (!amountEth.trim()) {
      setFormError("Amount is required.");
      return;
    }

    let amountWei: bigint;
    try {
      amountWei = parseEther(amountEth);
    } catch {
      setFormError("Invalid ETH amount format.");
      return;
    }

    if (amountWei <= 0n) {
      setFormError("Amount must be greater than 0.");
      return;
    }

    try {
      await writeContract({
        address: FOREST_ONCHAIN_ADDRESS,
        abi: FOREST_ONCHAIN_ABI,
        functionName: "withdraw",
        args: [toAddress as `0x${string}`, amountWei],
      });
    } catch (err) {
      console.error(err);
      setFormError("Failed to send withdrawal transaction.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border rounded-lg p-4 bg-white shadow-sm space-y-3"
    >
      <h2 className="font-semibold text-lg">Withdraw Funds</h2>

      <p className="text-xs text-gray-600">
        Contract balance:{" "}
        <span className="font-mono">
          {balanceData
            ? `${balanceData.formatted} ${balanceData.symbol}`
            : "…"}
        </span>
      </p>

      <div className="space-y-1">
        <label className="block text-sm font-medium">
          Recipient address
        </label>
        <input
          type="text"
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value)}
          className="w-full border rounded-md px-3 py-2 text-sm font-mono"
          placeholder="0x..."
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium">
          Amount (ETH)
        </label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={amountEth}
          onChange={(e) => setAmountEth(e.target.value)}
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
          Withdrawal transaction confirmed.
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="px-4 py-1.5 text-sm rounded-md bg-emerald-600 text-white disabled:opacity-60"
      >
        {isSubmitting ? "Withdrawing..." : "Withdraw"}
      </button>
    </form>
  );
}
