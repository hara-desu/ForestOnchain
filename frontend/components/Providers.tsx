"use client";  

import "@rainbow-me/rainbowkit/styles.css";

import {
  RainbowKitProvider,
  getDefaultConfig,
} from "@rainbow-me/rainbowkit";

import { WagmiProvider, http } from "wagmi";

import { mainnet, sepolia } from "wagmi/chains";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// -----------------------
// WAGMI + RAINBOWKIT CONFIG
// -----------------------
const anvil = {
  id: 31337, 
  name: "Anvil",
  network: "anvil",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"],
    },
    public: {
      http: ["http://127.0.0.1:8545"],
    },
  },
};

const config = getDefaultConfig({
  appName: "Forest Onchain", 

  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID!, 
  // WalletConnect Project ID (required).

  chains: [mainnet, sepolia, anvil],

  ssr: true,
  // Enables server-side rendering compatibility.
  // Required in Next.js 13+ App Router.

  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [anvil.id]: http(),
  },
  // Defines RPC transport for each chain.
  // http() uses public RPCs unless overridden.
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {

  return (
    <WagmiProvider config={config}>
      {/* Makes wagmi hooks (useAccount, useContractRead, etc.) available app-wide. */}

      <QueryClientProvider client={queryClient}>
        {/* Enables React Query caching for wagmi data requests. */}

        <RainbowKitProvider>
          {/* Enables RainbowKit's Connect Wallet modal + theme. */}
          
          {children}
          {/* Your app’s content goes here. */}
        </RainbowKitProvider>

      </QueryClientProvider>

    </WagmiProvider>
  );
}
