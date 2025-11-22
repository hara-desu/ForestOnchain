"use client";

import Link from "next/link";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Header() {
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
          <Link href="/goals" className="text-sm text-gray-700 hover:text-black">
              Goals
          </Link>
          <Link href="/admin" className="text-sm text-gray-700 hover:underline">
            Admin
          </Link>
        </div>

        {/* ------------------------------ */}
        {/* Right side: Wallet Connect UI */}
        {/* ------------------------------ */}
        <ConnectButton />
      </div>
    </header>
  );
}
