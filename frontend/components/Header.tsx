"use client";

import Link from "next/link";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract } from "wagmi";
import {
  FOREST_ONCHAIN_ADDRESS,
  FOREST_ONCHAIN_ABI,
} from "@/lib/forestOnchain";


export default function Header() {
  // Connected wallet
  const { address } = useAccount();

  // Read the contract owner (public immutable -> auto-generated getter)
  const { data: ownerData } = useReadContract({
    address: FOREST_ONCHAIN_ADDRESS,
    abi: FOREST_ONCHAIN_ABI,
    functionName: "CONTRACT_OWNER",
  });

  const ownerAddress = ownerData as `0x${string}` | undefined;

  // Check if the connected wallet is the owner (case-insensitive)
  const isOwner =
    address &&
    ownerAddress &&
    address.toLowerCase() === ownerAddress.toLowerCase();

  return (
    <header className="w-full border-b bg-white/70 backdrop-blur-sm">
      
      <div className="max-w-5xl mx-auto flex items-center justify-between p-4">
        
        {/* ------------------------------ */}
        {/* Left side: logo + app title    */}
        {/* ------------------------------ */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-xl font-semibold">
            <span className="text-2xl">🌱</span>
            <span>Forest Onchain</span>
          </Link>
          <Link href="/goals" className="text-sm text-gray-700 hover:underline">
              Goals
          </Link>
            <Link href="/session" className="text-sm text-gray-700 hover:underline">
              Session
            </Link>
          {isOwner && (
            <Link href="/admin" className="text-sm text-gray-700 hover:underline">
              Admin
            </Link>
          )}
        </div>

        {/* ------------------------------ */}
        {/* Right side: Wallet Connect UI */}
        {/* ------------------------------ */}
        <ConnectButton />
      </div>
    </header>
  );
}
