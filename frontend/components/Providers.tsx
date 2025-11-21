"use client";  
// This tells Next.js that this file must run on the client-side.
// Required because wallet connection + providers cannot run on the server.

import "@rainbow-me/rainbowkit/styles.css";
// Imports the default CSS styles for the RainbowKit wallet modal UI.

import {
  RainbowKitProvider,
  getDefaultConfig,
} from "@rainbow-me/rainbowkit";
// RainbowKitProvider: wraps your app and enables wallet connection UI.
// getDefaultConfig: generates a standard wagmi config with WalletConnect support.

import { WagmiProvider, http } from "wagmi";
// WagmiProvider: gives your app access to wagmi hooks for interacting with wallets & contracts.
// http: defines the RPC transport method (using HTTP).

import { mainnet, sepolia } from "wagmi/chains";
// Chain objects for Ethereum Mainnet and Sepolia testnet.
// These define chain IDs, RPC URLs, explorers, etc.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// React Query manages caching + async data state for wagmi hooks.
// QueryClient: creates the client instance.
// QueryClientProvider: makes the client available to the rest of the app.


// -----------------------
// WAGMI + RAINBOWKIT CONFIG
// -----------------------
const anvil = {
  id: 31337, // Hardhat/Anvil standard chain ID
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
  // Name of your app shown in wallet UIs.

  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID!, 
  // WalletConnect Project ID (required).
  // The "!" asserts this env variable must exist (TypeScript non-null assertion).

  chains: [mainnet, sepolia, anvil],
  // List of chains your app supports.

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


// -----------------------
// REACT QUERY CLIENT
// -----------------------
const queryClient = new QueryClient();
// Creates a React Query client instance used to manage asynchronous query caching.


// -----------------------
// PROVIDERS COMPONENT
// -----------------------
export function Providers({ children }: { children: React.ReactNode }) {
  // This component wraps your entire application inside 3 providers:
  // WagmiProvider → QueryClientProvider → RainbowKitProvider

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
