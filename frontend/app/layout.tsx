import "./globals.css";
// Import your global CSS styles. This file affects the entire app.
// Next.js automatically includes it once at the top level.

import type { Metadata } from "next";
// TypeScript type for defining metadata (title, description, etc.)
// Used by Next.js for SEO, <head> tags, and social previews.

import { Providers } from "../components/Providers";
// Imports your custom Web3 providers wrapper.
// This adds RainbowKit, wagmi, React Query, and wallet support to your whole app.

import Header from "../components/Header";
// Imports your header component (logo + connect wallet button).


// ------------------------------
// App Metadata (Next.js feature)
// ------------------------------
export const metadata: Metadata = {
  title: "Forest Onchain",
  description: "Pomodoro-style on-chain focus and goal-tracking app",
};
// Next.js automatically injects this into the <head>.
// Helps with SEO, browser tab titles, and sharing previews.


// -----------------------------------------
// The root layout wrapper for the entire app
// -----------------------------------------
// This file controls the structure of EVERY page.
// All pages inside `app/` will use this layout.
export default function RootLayout({
  children,  // "children" = the page being rendered (e.g., page.tsx)
}: {
  children: React.ReactNode;
}) {
  return (
    // Root HTML wrapper
    <html lang="en">
      {/* Sets language for accessibility + SEO */}

      <body>
        {/* The Providers component wraps the entire app with: 
            - wagmi provider (web3 state)
            - RainbowKit provider (wallet UI)
            - React Query provider (async state caching)
        */}
        <Providers>

          {/* Header at the top of every page */}
          <Header />

          {/* Main page content area */}
          <main className="max-w-4xl mx-auto p-6">
            {/* "children" renders whatever page you are visiting */}
            {children}
          </main>

        </Providers>
      </body>
    </html>
  );
}
