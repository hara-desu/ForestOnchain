import "./globals.css";

import type { Metadata } from "next";

import { Providers } from "../components/Providers";

import Header from "../components/Header";

export const metadata: Metadata = {
  title: "Forest Onchain",
  description: "Pomodoro-style on-chain focus and goal-tracking app",
};

export default function RootLayout({
  children,  
}: {
  children: React.ReactNode;
}) {
  return (
    // Root HTML wrapper
    <html lang="en">

      <body>
        <Providers>
          <Header />

          {/* Main page content area */}
          <main className="sm:max-w-xl md:max-w-3xl mx-auto p-3">
            {children}
          </main>

        </Providers>
      </body>
    </html>
  );
}
