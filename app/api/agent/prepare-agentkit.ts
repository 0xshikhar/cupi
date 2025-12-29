import {
  AgentKit,
  cdpApiActionProvider,
  compoundActionProvider,
  defillamaActionProvider,
  erc20ActionProvider,
  pythActionProvider,
  SmartWalletProvider,
  walletActionProvider,
  WalletProvider,
  wethActionProvider,
  // twitterActionProvider,
  // messariActionProvider,
  // farcasterActionProvider,
  // acrossActionProvider, - need api key to work
} from "@coinbase/agentkit";

import { AgentWalletService } from "@/lib/services/agent-wallet-service";
// Detailed error logging for wallet provider initialization
const DEBUG = process.env.NODE_ENV !== "production";
// Import the necessary types
import { Address } from "viem";
import { morphoActionProvider } from "@/lib/customActions/Morpho/morphoActionProvider";
import { moonwellActionProvider } from "@/lib/customActions/moonwell/moonwellActionProvider";
import { enhancedBalanceProvider } from "@/lib/customActions/balanceProvider";
import { comprehensiveBalanceProvider } from "@/lib/customActions/comprehensiveBalanceProvider";
import { customWETHProvider } from "@/lib/customActions/wethProvider";
import { uniswapActionProvider } from "@/lib/customActions/uniswap";
import { privateKeyToAccount } from "viem/accounts";

/**
 * Prepares the AgentKit and WalletProvider for a serverless environment.
 * * Smart Wallet Primary Approach: Uses smart wallet as the primary agent wallet.
 *
 * @param userWalletAddress - The user's wallet address from Privy
 * @returns {Promise<{ agentkit: AgentKit, walletProvider: WalletProvider }>} The initialized AgentKit and WalletProvider.
 * @throws {Error} If required environment variables are missing or initialization fails.
 */
export async function prepareAgentkitAndWalletProvider(
  userWalletAddress: string
): Promise<{
  agentkit: AgentKit;
  walletProvider: WalletProvider;
  smartWalletAddress: Address;
  signerAddress: Address;
}> {
  console.log("[AGENT INIT] Preparing AgentKit and WalletProvider...");
  console.log(`[AGENT INIT] User wallet address: ${userWalletAddress}`);
  console.log(`[AGENT INIT] Node ENV: ${process.env.NODE_ENV}`);
  console.log(`[AGENT INIT] Debug mode: ${DEBUG}`);
  const startTime = Date.now();

  // 1. Verify required environment variables
  if (!process.env.CDP_API_KEY_ID || !process.env.CDP_API_KEY_SECRET) {
    console.error("[AGENT ERROR] Missing CDP API credentials");
    throw new Error(
      "CDP_API_KEY_ID and CDP_API_KEY_SECRET must be set in your environment variables."
    );
  }
  try {
    // 2. Get or create smart wallet for this user (Smart Wallet Primary Approach)
    console.log(
      `[SMART WALLET] Fetching smart wallet for user: ${userWalletAddress}`
    );
    const walletStartTime = Date.now();

    if (!userWalletAddress) {
      throw new Error(
        "User wallet address is required but was empty or undefined"
      );
    }

    const { smartWalletAddress, signerPrivateKey, agentId, isNewWallet } =
      await AgentWalletService.getOrCreateSmartWallet(userWalletAddress);

    if (!signerPrivateKey) {
      throw new Error(
        "Failed to retrieve or create smart wallet: missing signer private key"
      );
    }

    console.log(`[SMART WALLET] Using agent ID: ${agentId}`);
    console.log(
      `[SMART WALLET] Existing smart wallet address: ${
        smartWalletAddress || "None - will create new"
      }`
    );
    console.log(`[SMART WALLET] Is new wallet: ${isNewWallet}`);
    console.log(
      `[SMART WALLET] Wallet setup completed in: ${
        Date.now() - walletStartTime
      }ms`
    );

    // 3. Create signer from smart wallet private key
    try {
      const signerStartTime = Date.now();
      const signer = privateKeyToAccount(signerPrivateKey);
      console.log(
        `[SMART WALLET] Signer created for address: ${signer.address} in ${
          Date.now() - signerStartTime
        }ms`
      );

      const signerAddress = signer.address;

      // 4. Configure and initialize the SmartWalletProvider
      const networkId = process.env.NETWORK_ID || "base-sepolia";
      console.log(`[AGENT NETWORK] Using network: ${networkId}`);

      try {
        const providerStartTime = Date.now();

        // Smart Wallet Primary Approach: Configure SmartWalletProvider as the primary wallet
        console.log(
          `[SMART WALLET] Configuring SmartWalletProvider as primary agent wallet`
        );
        console.log(`[SMART WALLET] Signer address: ${signerAddress}`);
        console.log(
          `[SMART WALLET] Target smart wallet address: ${
            smartWalletAddress || "Will be created"
          }`
        );

        // Configure SmartWalletProvider with our signer and existing smart wallet address (if any)
        const walletProviderConfig = {
          networkId,
          signer, // Our dedicated signer for the smart wallet
          smartWalletAddress: smartWalletAddress || undefined, // Use existing smart wallet if available
          paymasterUrl: undefined,
        };

        if (DEBUG)
          console.log(
            `[SMART WALLET] Wallet provider config:`,
            JSON.stringify(walletProviderConfig, null, 2)
          );

        let walletProvider: WalletProvider;
        let finalSmartWalletAddress: string;

        try {
          console.log(
            `[SMART WALLET] Initializing SmartWalletProvider as primary agent wallet...`
          );
          walletProvider = await SmartWalletProvider.configureWithWallet(
            walletProviderConfig
          );

          if (!walletProvider) {
            throw new Error("SmartWalletProvider is null after configuration");
          }

          finalSmartWalletAddress = walletProvider.getAddress();
          console.log(
            `[SMART WALLET] SmartWalletProvider initialized successfully in ${
              Date.now() - providerStartTime
            }ms`
          );

          // In Smart Wallet Primary approach, the smart wallet IS the agent wallet
          console.log(
            `[SMART WALLET] ✅ Smart wallet address (primary): ${finalSmartWalletAddress}`
          );
          console.log(
            `[SMART WALLET] ✅ Signer address (internal): ${signerAddress}`
          );

          // If this was a new smart wallet or address changed, save it to database
          if (
            !smartWalletAddress ||
            smartWalletAddress !== finalSmartWalletAddress
          ) {
            console.log(
              `[SMART WALLET] Saving smart wallet address to database: ${finalSmartWalletAddress}`
            );
            await AgentWalletService.updateSmartWalletAddress(
              agentId,
              finalSmartWalletAddress as Address
            );
          } else {
            console.log(
              `[SMART WALLET] Using existing smart wallet address: ${finalSmartWalletAddress}`
            );
          }
        } catch (smartWalletError: any) {
          console.error(
            `[AGENT WALLET] Smart wallet initialization failed after ${
              Date.now() - providerStartTime
            }ms:`,
            smartWalletError
          );

          // Handle the "already exists" error gracefully
          if (
            smartWalletError?.apiCode === "already_exists" ||
            smartWalletError?.message?.includes("already exists")
          ) {
            console.log(
              `[AGENT WALLET] Smart wallet already exists, this is expected behavior.`
            );
            console.log(
              `[AGENT WALLET] The existing smart wallet will be used automatically by the SDK.`
            );

            // For "already exists" errors, the SDK should automatically connect to the existing wallet
            // Let's get the address from the error or try a simple configuration
            try {
              console.log(
                `[AGENT WALLET] Attempting to connect to existing smart wallet...`
              );
              // Try to configure again but this time expecting it to work with the existing wallet
              walletProvider = await SmartWalletProvider.configureWithWallet({
                networkId,
                signer,
                smartWalletAddress: smartWalletAddress || undefined, // Use stored address if available
                paymasterUrl: undefined,
              });

              finalSmartWalletAddress = walletProvider.getAddress();
              console.log(
                `[AGENT WALLET] Successfully connected to existing smart wallet: ${finalSmartWalletAddress}`
              );

              // Update our database with the smart wallet address if we don't have it
              if (!smartWalletAddress && finalSmartWalletAddress) {
                console.log(
                  `[AGENT WALLET] Saving smart wallet address to database: ${finalSmartWalletAddress}`
                );
                await AgentWalletService.updateSmartWalletAddress(
                  agentId,
                  finalSmartWalletAddress as Address
                );
              }
            } catch (retryError) {
              console.error(
                "[AGENT WALLET] Failed to connect to existing smart wallet:",
                retryError
              );
              // If we still can't connect, let's just use the basic configuration without smart wallet address
              // This should allow the SDK to handle the existing wallet automatically
              finalSmartWalletAddress = "unknown"; // We'll get it later from the provider
              throw smartWalletError; // Re-throw the original error for now
            }
          } else {
            console.error(
              "[AGENT WALLET] Non-already-exists error:",
              smartWalletError
            );
            throw smartWalletError; // Re-throw if it's not an "already exists" error
          }
        }

        // 5. Initialize AgentKit with action providers
        try {
          const agentKitStartTime = Date.now();
          console.log(
            `[AGENT INIT] Initializing AgentKit with action providers...`
          );

          const agentkit = await AgentKit.from({
            walletProvider,
            actionProviders: [
              wethActionProvider(),
              customWETHProvider(),
              pythActionProvider(),
              walletActionProvider(),
              erc20ActionProvider(),
              uniswapActionProvider(),
              enhancedBalanceProvider(),
              comprehensiveBalanceProvider(),
              cdpApiActionProvider({
                apiKeyId: process.env.CDP_API_KEY_ID,
                apiKeySecret: process.env.CDP_API_KEY_SECRET,
              }),
              morphoActionProvider(),
              compoundActionProvider(),
              defillamaActionProvider(),
              moonwellActionProvider(),
            ],
          });

          if (!agentkit) {
            throw new Error("AgentKit is null after initialization");
          }

          console.log(
            `[AGENT INIT] Action providers initialized successfully in ${
              Date.now() - agentKitStartTime
            }ms`
          );
          console.log(
            `[SMART WALLET] ✅ AgentKit initialized successfully with Smart Wallet Primary approach in ${
              Date.now() - startTime
            }ms total`
          );

          return {
            agentkit,
            walletProvider,
            smartWalletAddress: finalSmartWalletAddress as Address,
            signerAddress: signerAddress as Address,
          };
        } catch (agentKitError) {
          console.error(
            `[AGENT ERROR] Failed to initialize AgentKit with action providers after ${
              Date.now() - startTime
            }ms:`,
            agentKitError
          );
          throw new Error(
            `AgentKit initialization failed: ${
              agentKitError instanceof Error
                ? agentKitError.message
                : "Unknown error"
            }`
          );
        }
      } catch (walletProviderError) {
        console.error(
          `[SMART WALLET] Failed to configure SmartWalletProvider after ${
            Date.now() - startTime
          }ms:`,
          walletProviderError
        );
        throw new Error(
          `SmartWallet configuration failed: ${
            walletProviderError instanceof Error
              ? walletProviderError.message
              : "Unknown error"
          }`
        );
      }
    } catch (signerError) {
      console.error(
        `[SMART WALLET] Failed to create signer from private key after ${
          Date.now() - startTime
        }ms:`,
        signerError
      );
      throw new Error(
        `Smart wallet signer creation failed: ${
          signerError instanceof Error ? signerError.message : "Unknown error"
        }`
      );
    }
  } catch (error) {
    console.error(
      `[SMART WALLET] Smart wallet initialization error after ${
        Date.now() - startTime
      }ms:`,
      error
    );
    throw new Error(
      `Failed to initialize smart wallet: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
