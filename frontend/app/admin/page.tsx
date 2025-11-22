"use client";

import { useAccount, useReadContract } from "wagmi";
import {
  FOREST_ONCHAIN_ADDRESS,
  FOREST_ONCHAIN_ABI,
} from "@/lib/forestOnchain";
import ChangeCostPerTreeForm from "@/components/admin/ChangeCostPerTreeForm";
import WithdrawForm from "@/components/admin/WithdrawForm";
import { formatEther } from "viem";

export default function AdminPage() {
  const { address } = useAccount();

  // Read contract owner
  const { data: ownerData } = useReadContract({
    address: FOREST_ONCHAIN_ADDRESS,
    abi: FOREST_ONCHAIN_ABI,
    functionName: "CONTRACT_OWNER", // auto-generated getter for public immutable
  });

  const ownerAddress = ownerData as `0x${string}` | undefined;

  // Read current cost_per_tree for display
  const { data: costPerTreeData } = useReadContract({
    address: FOREST_ONCHAIN_ADDRESS,
    abi: FOREST_ONCHAIN_ABI,
    functionName: "cost_per_tree",
  });

  const costPerTree = (costPerTreeData ?? 0n) as bigint;

  const isOwner =
    address &&
    ownerAddress &&
    address.toLowerCase() === ownerAddress.toLowerCase();

  if (!address) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p>Please connect your wallet to access admin functions.</p>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-red-600">
          You are not the contract owner. Admin actions are restricted.
        </p>
        {ownerAddress && (
          <p className="text-sm text-gray-600">
            Contract owner: <span className="font-mono">{ownerAddress}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Panel</h1>

      <div className="text-sm space-y-1">
        <p>
          Connected as:{" "}
          <span className="font-mono">{address}</span>
        </p>
        {ownerAddress && (
          <p>
            Contract owner:{" "}
            <span className="font-mono">{ownerAddress}</span>
          </p>
        )}
        <p>
          Current cost per tree:{" "}
          <span className="font-mono">
            {formatEther(costPerTree)} ETH
          </span>
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ChangeCostPerTreeForm currentCostPerTree={costPerTree} />
        <WithdrawForm />
      </div>
    </div>
  );
}
