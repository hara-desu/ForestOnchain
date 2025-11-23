import "./globals.css";

import type { Metadata } from "next";
import { Providers } from "../components/Providers";
import Header from "../components/Header";
import Footer from "@/components/Footer";

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

      <body className="min-h-screen flex flex-col">
        <Providers>
          <Header />

          {/* Main page content area */}
          <main className="flex-1 max-w-4xl mx-auto p-6">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
