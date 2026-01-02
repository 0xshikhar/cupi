"use client";

import { useState, useEffect } from "react";
import { usePrivyWallet } from "@/lib/hooks/usePrivyWallet";

type WalletStatus = {
  userWalletAddress: string | null;
  agentWalletAddress: string | null;
  created?: boolean;
  hasAgentWallet?: boolean;
  message?: string;
  error?: string;
};

export default function AgentWalletTestPage() {
  const { walletAddress } = usePrivyWallet();
  const [status, setStatus] = useState<WalletStatus>({
    userWalletAddress: null,
    agentWalletAddress: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [testWalletAddress, setTestWalletAddress] = useState("");
  const [testResults, setTestResults] = useState<WalletStatus[]>([]);

  // Check if the user has an agent wallet when their wallet address changes
  useEffect(() => {
    if (walletAddress) {
      checkAgentWallet(walletAddress);
    }
  }, [walletAddress]);

  // Check if a wallet address has an agent wallet
  const checkAgentWallet = async (address: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/agent-wallet?userWalletAddress=${address}`
      );
      const data = await response.json();
      setStatus({
        userWalletAddress: data.userWalletAddress,
        agentWalletAddress: data.agentWalletAddress || null,
        hasAgentWallet: data.hasAgentWallet,
        error: data.error,
      });
    } catch (error) {
      setStatus({
        userWalletAddress: address,
        agentWalletAddress: null,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create an agent wallet for a wallet address
  const createAgentWallet = async (address: string) => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/agent-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userWalletAddress: address }),
      });
      const data = await response.json();
      setStatus({
        userWalletAddress: data.userWalletAddress,
        agentWalletAddress: data.agentWalletAddress,
        created: data.created,
        message: data.message,
        error: data.error,
      });
    } catch (error) {
      setStatus({
        userWalletAddress: address,
        agentWalletAddress: null,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Run multiple tests with different addresses to check for duplicates
  const runDuplicateTest = async () => {
    setIsLoading(true);
    setTestResults([]);

    const testAddress =
      testWalletAddress || "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
    const results: WalletStatus[] = [];

    // Test 1: First check
    try {
      const response1 = await fetch(
        `/api/agent-wallet?userWalletAddress=${testAddress}`
      );
      const data1 = await response1.json();
      results.push({
        userWalletAddress: data1.userWalletAddress,
        agentWalletAddress: data1.agentWalletAddress || null,
        hasAgentWallet: data1.hasAgentWallet,
        message: "Initial check",
      });
    } catch (error) {
      console.error("Initial check failed:", error);
      results.push({
        userWalletAddress: testAddress,
        agentWalletAddress: null,
        error: "Initial check failed",
      });
    }

    // Test 2: Create (or get) agent wallet
    try {
      const response2 = await fetch("/api/agent-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userWalletAddress: testAddress }),
      });
      const data2 = await response2.json();
      results.push({
        userWalletAddress: data2.userWalletAddress,
        agentWalletAddress: data2.agentWalletAddress,
        created: data2.created,
        message: "First create attempt",
      });
    } catch (error) {
      console.error("First create attempt failed:", error);
      results.push({
        userWalletAddress: testAddress,
        agentWalletAddress: null,
        error: "First create attempt failed",
      });
    }

    // Test 3: Try creating again (should return existing)
    try {
      const response3 = await fetch("/api/agent-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userWalletAddress: testAddress }),
      });
      const data3 = await response3.json();
      results.push({
        userWalletAddress: data3.userWalletAddress,
        agentWalletAddress: data3.agentWalletAddress,
        created: data3.created,
        message: "Second create attempt",
      });
    } catch (error) {
      console.error("Second create attempt failed:", error);
      results.push({
        userWalletAddress: testAddress,
        agentWalletAddress: null,
        error: "Second create attempt failed",
      });
    }

    // Test 4: Final check
    try {
      const response4 = await fetch(
        `/api/agent-wallet?userWalletAddress=${testAddress}`
      );
      const data4 = await response4.json();
      results.push({
        userWalletAddress: data4.userWalletAddress,
        agentWalletAddress: data4.agentWalletAddress,
        hasAgentWallet: data4.hasAgentWallet,
        message: "Final check",
      });
    } catch (error) {
      console.error("Final check failed:", error);
      results.push({
        userWalletAddress: testAddress,
        agentWalletAddress: null,
        error: "Final check failed",
      });
    }

    setTestResults(results);
    setIsLoading(false);
  };

  // Reset all agent wallets (for testing only)
  const resetAllWallets = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/agent-wallet", {
        method: "DELETE",
      });
      const data = await response.json();
      alert(data.message || "Reset completed");

      // Re-check current wallet status
      if (walletAddress) {
        checkAgentWallet(walletAddress);
      }

      setTestResults([]);
    } catch (error) {
      alert(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Agent Wallet Test Page</h1>

      <div className="bg-gray-800 p-6 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">Your Connected Wallet</h2>

        {walletAddress ? (
          <div className="mb-4">
            <p className="text-green-400 mb-2">Connected: {walletAddress}</p>

            <div className="flex space-x-2 mb-4">
              <button
                onClick={() => checkAgentWallet(walletAddress)}
                className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition"
                disabled={isLoading}
              >
                Check Agent Wallet
              </button>

              <button
                onClick={() => createAgentWallet(walletAddress)}
                className="bg-[rgb(210,113,254)] text-black px-4 py-2 rounded hover:brightness-110 transition"
                disabled={isLoading}
              >
                Create/Get Agent Wallet
              </button>
            </div>

            {status.userWalletAddress === walletAddress && (
              <div className="bg-gray-700 p-4 rounded">
                <h3 className="font-semibold mb-2">Status</h3>
                {status.error ? (
                  <p className="text-red-400">{status.error}</p>
                ) : (
                  <>
                    <p>
                      Has Agent Wallet:{" "}
                      <span
                        className={
                          status.hasAgentWallet
                            ? "text-green-400"
                            : "text-yellow-400"
                        }
                      >
                        {String(status.hasAgentWallet)}
                      </span>
                    </p>
                    {status.agentWalletAddress && (
                      <p>
                        Agent Wallet:{" "}
                        <span className="text-green-400">
                          {status.agentWalletAddress}
                        </span>
                      </p>
                    )}
                    {status.created !== undefined && (
                      <p>
                        Newly Created:{" "}
                        <span
                          className={
                            status.created ? "text-green-400" : "text-blue-400"
                          }
                        >
                          {String(status.created)}
                        </span>
                      </p>
                    )}
                    {status.message && <p>Message: {status.message}</p>}
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-yellow-400">
            No wallet connected. Please connect a wallet using Privy.
          </p>
        )}
      </div>

      <div className="bg-gray-800 p-6 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">
          Duplicate Prevention Test
        </h2>
        <p className="mb-4 text-gray-300">
          This test checks if the system correctly prevents duplicate agent
          wallets for the same user wallet.
        </p>

        <div className="flex space-x-2 mb-6">
          <input
            type="text"
            placeholder="Enter wallet address (or use default)"
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2"
            value={testWalletAddress}
            onChange={(e) => setTestWalletAddress(e.target.value)}
          />
          <button
            onClick={runDuplicateTest}
            className="bg-green-600 px-4 py-2 rounded hover:bg-green-700 transition"
            disabled={isLoading}
          >
            Run Test
          </button>
        </div>

        {testResults.length > 0 && (
          <div className="bg-gray-700 p-4 rounded">
            <h3 className="font-semibold mb-2">Test Results</h3>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="border-b border-gray-600 pb-3">
                  <p className="font-medium">{result.message}</p>
                  {result.error ? (
                    <p className="text-red-400">{result.error}</p>
                  ) : (
                    <>
                      <p>
                        User Wallet:{" "}
                        <span className="text-blue-400">
                          {result.userWalletAddress}
                        </span>
                      </p>
                      <p>
                        Agent Wallet:{" "}
                        <span className="text-green-400">
                          {result.agentWalletAddress || "None"}
                        </span>
                      </p>
                      {result.created !== undefined && (
                        <p>
                          Created:{" "}
                          <span
                            className={
                              result.created
                                ? "text-green-400"
                                : "text-blue-400"
                            }
                          >
                            {String(result.created)}
                          </span>
                        </p>
                      )}
                      {result.hasAgentWallet !== undefined && (
                        <p>
                          Has Agent Wallet:{" "}
                          <span
                            className={
                              result.hasAgentWallet
                                ? "text-green-400"
                                : "text-yellow-400"
                            }
                          >
                            {String(result.hasAgentWallet)}
                          </span>
                        </p>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Admin Operations</h2>
        <p className="mb-4 text-yellow-300">
          Warning: These operations are for testing purposes only!
        </p>
        <button
          onClick={resetAllWallets}
          className="bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition"
          disabled={isLoading}
        >
          Reset All Agent Wallets
        </button>
        <p className="mt-2 text-xs text-gray-400">
          This will delete all agent wallet mappings from the database.
        </p>
      </div>
    </div>
  );
}
