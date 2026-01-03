// import { z } from "zod";
// import { encodeFunctionData, parseUnits, formatUnits, getAddress } from "viem";
// import {
//   ActionProvider,
//   EvmWalletProvider,
//   CreateAction,
//   Network,
// } from "@coinbase/agentkit";
// import { SwapSchema, QuoteSchema } from "./schemas";
// import {
//   UNISWAP_ADDRESSES,
//   UNISWAP_QUOTER_ABI,
//   UNISWAP_ROUTER_ABI,
//   ERC20_ABI,
// } from "./constants";

// /**
//  * Uniswap V3 Action Provider for Base network
//  * Enables token swaps and quotes on Uniswap V3 DEX
//  */
// export class UniswapActionProvider extends ActionProvider<EvmWalletProvider> {
//   /**
//    * Constructor for the UniswapActionProvider.
//    */
//   constructor() {
//     super("uniswap", []);
//   }

//   /**
//    * Get a quote for a token swap on Uniswap V3.
//    *
//    * @param walletProvider - The wallet provider to use for contract calls.
//    * @param args - The input arguments for getting a quote.
//    * @returns A message containing the quote details.
//    */
//   @CreateAction({
//     name: "get_quote",
//     description: `
//     Get a quote for swapping tokens on Uniswap V3. This will show you how many tokens you would receive
//     for a given input amount without executing the swap.
    
//     Supports all ERC20 tokens available on Uniswap V3 pools on Base network.
//     `,
//     schema: QuoteSchema,
//   })
//   async getQuote(
//     walletProvider: EvmWalletProvider,
//     args: z.infer<typeof QuoteSchema>,
//   ): Promise<string> {
//     try {
//       const network = walletProvider.getNetwork();
//       const addresses = UNISWAP_ADDRESSES[network.networkId!];

//       if (!addresses) {
//         return `Error: Uniswap not supported on network ${network.networkId}`;
//       }

//       const [tokenInDecimals, tokenOutDecimals, tokenInSymbol, tokenOutSymbol] = await Promise.all([
//         walletProvider.readContract({
//           address: getAddress(args.tokenIn),
//           abi: ERC20_ABI,
//           functionName: "decimals",
//           args: [],
//         }),
//         walletProvider.readContract({
//           address: getAddress(args.tokenOut),
//           abi: ERC20_ABI,
//           functionName: "decimals",
//           args: [],
//         }),
//         walletProvider.readContract({
//           address: getAddress(args.tokenIn),
//           abi: ERC20_ABI,
//           functionName: "symbol",
//           args: [],
//         }),
//         walletProvider.readContract({
//           address: getAddress(args.tokenOut),
//           abi: ERC20_ABI,
//           functionName: "symbol",
//       ]);

//       const amountIn = parseUnits(args.amount, tokenInDecimals as number);

//       // Ensure router has allowance to spend tokenIn
//       const allowance = (await walletProvider.readContract({
//         address: getAddress(args.tokenIn),
//         abi: ERC20_ABI,
//         functionName: "allowance",
//         args: [walletAddress, getAddress(addresses.SwapRouter02)],
//       })) as bigint;

//       if (allowance < amountIn) {
//         const approveHash = await walletProvider.sendTransaction({
//           to: getAddress(args.tokenIn),
//           data: encodeFunctionData({
//             abi: ERC20_ABI,
//             functionName: "approve",
//             args: [getAddress(addresses.SwapRouter02), amountIn],
//           }),
//         });
//         await walletProvider.waitForTransactionReceipt(approveHash);
//       }

//       const feeTiers = [args.fee, 500, 3000, 10000].filter((v, i, a) => a.indexOf(v) === i);
//       let quotedAmountOut: bigint | null = null;
//       let usedFee: number | null = null;
//       for (const fee of feeTiers) {
//         try {
//           const qr = await walletProvider.readContract({
//             address: getAddress(addresses.Quoter),
// {{ ... }}
//     args: z.infer<typeof SwapSchema>,
//   ): Promise<string> {
//     try {
//       const network = walletProvider.getNetwork();
//       const addresses = UNISWAP_ADDRESSES[network.networkId!];
//       if (!addresses) {
//         return `Error: Uniswap not supported on network ${network.networkId}`;
//       }

//       const walletAddress = await walletProvider.getAddress();

//       const [tokenInDecimals, tokenOutDecimals, tokenInSymbol, tokenOutSymbol] = await Promise.all([
//         walletProvider.readContract({
//           address: getAddress(args.tokenIn),
//           abi: ERC20_ABI,
// {{ ... }}
//               },
//             ],
//           });
//           const out = (qr as any)[0] as bigint;
//           if (out && out > 0n) {
//             quotedAmountOut = out;
//             usedFee = fee;
//             break;
//           }
//         } catch {
//           // try next fee tier
//         }
//       }

//       if (!quotedAmountOut || !usedFee) {
//         return "Error: No available Uniswap V3 pool found for the provided token pair on this network. Verify token addresses and try a different fee tier (500/3000/10000).";
//       }

//       const slippageBps = Math.floor(args.slippageTolerance * 100); // Convert % to basis points
//       const minAmountOut = (quotedAmountOut * BigInt(10000 - slippageBps)) / BigInt(10000);

//       const swapHash = await walletProvider.sendTransaction({
//         to: getAddress(addresses.SwapRouter02),
//         data: encodeFunctionData({
//           abi: UNISWAP_ROUTER_ABI,
//           functionName: "exactInputSingle",
//           args: [
//             {
//               tokenIn: getAddress(args.tokenIn),
//               tokenOut: getAddress(args.tokenOut),
//               fee: usedFee,
//               recipient: walletAddress,
//               amountIn,
//               amountOutMinimum: minAmountOut,
//               sqrtPriceLimitX96: 0,
//             },
//           ],
//         }),
//         value: 0n,
//       });

//       await walletProvider.waitForTransactionReceipt(swapHash);

//       const quotedAmountOutFormatted = formatUnits(quotedAmountOut, tokenOutDecimals as number);
//       const minAmountOutFormatted = formatUnits(minAmountOut, tokenOutDecimals as number);

//       return `Successfully swapped ${args.amount} ${tokenInSymbol} for ~${quotedAmountOutFormatted} ${tokenOutSymbol}\n` +
//         `Minimum received: ${minAmountOutFormatted} ${tokenOutSymbol} (${args.slippageTolerance}% slippage)\n` +
//         `Transaction hash: ${swapHash}`;
//     } catch (error) {
//       return `Error executing swap: ${error}`;
//     }
//   }
//    * Checks if the Uniswap action provider supports the given network.
//    *
//    * @param network - The network to check.
//    * @returns True if the network is Base mainnet or sepolia, false otherwise.
//    */
//   supportsNetwork = (network: Network) =>
//     network.networkId === "base-mainnet" || network.networkId === "base-sepolia";
// }

// export const uniswapActionProvider = () => new UniswapActionProvider(); 