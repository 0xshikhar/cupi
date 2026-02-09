import { ArrowLeftRight, ArrowUpRight, Droplets, PiggyBank, ShieldCheck, Wallet } from "lucide-react"
import type { ActionPrompt } from "../types/chat"

/**
 * Starter prompts map 1:1 to tools the agent actually has (balance provider, faucet,
 * transfers, WETH wrap, Uniswap swap, Morpho deposit) and stay inside the spend guardrail.
 */
export const PROMPT_SUGGESTIONS: { title: string; prompt: string; icon: ActionPrompt["icon"]; tint: string }[] = [
	{
		title: "What's my balance?",
		prompt: "Show my wallet balance",
		icon: <Wallet className="h-4 w-4" />,
		tint: "bg-emerald-100 text-emerald-800",
	},
	{
		title: "Get testnet gas",
		prompt: "Request testnet ETH from the faucet",
		icon: <Droplets className="h-4 w-4" />,
		tint: "bg-sky-100 text-sky-800",
	},
	{
		title: "Send a payment",
		prompt: "Send 1 USDC to ",
		icon: <ArrowUpRight className="h-4 w-4" />,
		tint: "bg-zinc-100 text-zinc-800",
	},
	{
		title: "Wrap ETH",
		prompt: "Wrap 0.001 ETH to WETH",
		icon: <ArrowLeftRight className="h-4 w-4" />,
		tint: "bg-violet-100 text-violet-800",
	},
	{
		title: "Earn on idle cash",
		prompt: "Deposit 0.001 WETH to Morpho",
		icon: <PiggyBank className="h-4 w-4" />,
		tint: "bg-amber-100 text-amber-800",
	},
	{
		title: "How safe is this?",
		prompt: "Explain my daily spend limit and which contracts you are allowed to use",
		icon: <ShieldCheck className="h-4 w-4" />,
		tint: "bg-rose-100 text-rose-800",
	},
]

export const ACTION_PROMPTS: ActionPrompt[] = PROMPT_SUGGESTIONS.map((s) => ({
	id: s.title.toLowerCase().replace(/[^a-z]+/g, "-"),
	name: s.title,
	icon: s.icon,
	prompt: s.prompt,
}))
