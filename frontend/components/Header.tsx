"use client";
// This tells Next.js that this component must run in the browser.
// Wallet UI (RainbowKit) cannot run on the server, so "use client" is required.

import Link from "next/link";
// Next.js <Link> component for client-side navigation between pages.

import { ConnectButton } from "@rainbow-me/rainbowkit";
// The RainbowKit wallet connection button.
// Handles opening the modal, selecting wallets, network switching, etc.

export default function Header() {
  return (
    // The <header> section spans full width and has styling.
    <header className="w-full border-b bg-white/70 backdrop-blur-sm">
      
      {/* Container for left + right items with padding */}
      <div className="max-w-5xl mx-auto flex items-center justify-between p-4">
        
        {/* ------------------------------ */}
        {/* Left side: logo + app title    */}
        {/* ------------------------------ */}
        {/* Clicking this takes you back to the home page "/" */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-xl font-semibold">
            
            {/* Seed emoji logo */}
            <span className="text-2xl">🌱</span>

            {/* Name of the app */}
            <span>Forest Onchain</span>
          </Link>
          <Link href="/goals" className="text-sm text-gray-700 hover:text-black">
              Goals
          </Link>
        </div>

        {/* ------------------------------ */}
        {/* Right side: Wallet Connect UI */}
        {/* ------------------------------ */}
        {/* Displays a "Connect Wallet" button or the connected address */}
        <ConnectButton />
      </div>
    </header>
  );
}
