import {
	Minus,
	Layers,
	Sparkles,
	Globe,
	Users,
	LineChart,
	GraduationCap,
	Gift,
	ArrowRight,
	Flame,
	Newspaper,
	ArrowLeftRight,
	Coins,
	RotateCw,
	Trash2,
	Hash,
	TrendingUp,
} from "lucide-react"
import type { ActionPrompt } from "../types/chat"

export const PROMPT_SUGGESTIONS = [
	"If anyone in #copytrade buys a token for >$500, buy me $50 of it. Then sell 20% for 10% gain, sell 20% for 25% gain, sell 20% for 50% gain, sell 20% for 75% gain. Set stop loss at -40%. Marketcap between $50k and $500M.",
	"Who are the top traders?",
	"What groups should I trade?",
	"Show 7 day PNL for $AVNT",
	"Buy me $25 worth of $[TOKEN] and then sell 50% for 30% gain and the other 50% for 100% gain. Sell 50% for stop loss of 20% and 50% for stop loss of 40%",
	"Buy me $50 of $VVV if the price dips by 10%.",
]

export const ACTION_PROMPTS: ActionPrompt[] = [
	{
		id: "add-stop-loss",
		name: "Add stop loss",
		icon: <Minus className="h-4 w-4" />,
		prompt: "Add stop loss",
	},
	{
		id: "add-profit-ladders",
		name: "Add profit ladders",
		icon: <Layers className="h-4 w-4" />,
		prompt: "Add profit ladders",
	},
	{
		id: "analyze-my-trades",
		name: "Analyze My Trades",
		icon: <Sparkles className="h-4 w-4" />,
		prompt: "Analyze My Trades",
	},
	{
		id: "analyze-my-groups",
		name: "Analyze My Groups",
		icon: <Sparkles className="h-4 w-4" />,
		prompt: "Analyze My Groups",
	},
	{
		id: "auto-buy-group-1x",
		name: "Auto-buy group 1x trigger",
		icon: <RotateCw className="h-4 w-4" />,
		prompt:
			"If anyone in #copytrade buys a token for >$500, buy me $50 of it. Then sell 20% for 10% gain, sell 20% for 25% gain, sell 20% for 50% gain, sell 20% for 75% gain. Set stop loss at -40%. Marketcap between $50k and $500M.",
	},
	{
		id: "auto-buy-group-2x",
		name: "Auto-buy group 2x trigger",
		icon: <RotateCw className="h-4 w-4" />,
		prompt:
			"If anyone in #copytrade buys a token for >$1000, buy me $100 of it. Then sell 20% for 10% gain, sell 20% for 25% gain, sell 20% for 50% gain, sell 20% for 75% gain. Set stop loss at -40%. Marketcap between $50k and $500M.",
	},
	{
		id: "auto-buy-single-trader",
		name: "Auto-buy single trader",
		icon: <RotateCw className="h-4 w-4" />,
		prompt:
			"If [trader] buys a token, buy me $50 of it. Then sell 20% for 10% gain, sell 20% for 25% gain, sell 20% for 50% gain, sell 20% for 75% gain. Set stop loss at -40%.",
	},
	{
		id: "dust-to-eth",
		name: "Dust to ETH",
		icon: <Trash2 className="h-4 w-4" />,
		prompt: "Convert all dust tokens to ETH",
	},
	{
		id: "discover-top-groups",
		name: "Discover Top Groups",
		icon: <Globe className="h-4 w-4" />,
		prompt: "What groups should I trade?",
	},
	{
		id: "discover-top-traders",
		name: "Discover Top Traders",
		icon: <Globe className="h-4 w-4" />,
		prompt: "Who are the top traders?",
	},
	{
		id: "discover-trending-tokens",
		name: "Discover Trending Tokens",
		icon: <Globe className="h-4 w-4" />,
		prompt: "What are the trending tokens?",
	},
	{
		id: "group-add",
		name: "Group Add",
		icon: <Users className="h-4 w-4" />,
		prompt: "Add me to a trading group",
	},
	{
		id: "group-create",
		name: "Group Create",
		icon: <Users className="h-4 w-4" />,
		prompt: "Create a new trading group",
	},
	{
		id: "my-trades",
		name: "My Trades",
		icon: <LineChart className="h-4 w-4" />,
		prompt: "Show my trades",
	},
	{
		id: "pnl-my-pnl",
		name: "PNL - my PNL",
		icon: <LineChart className="h-4 w-4" />,
		prompt: "Show my PNL",
	},
	{
		id: "pnl-my-gangstr",
		name: "PNL - my Gangstr",
		icon: <LineChart className="h-4 w-4" />,
		prompt: "Show my Gangstr PNL",
	},
	{
		id: "pnl-token",
		name: "PNL - Token",
		icon: <LineChart className="h-4 w-4" />,
		prompt: "Show PNL for token",
	},
	{
		id: "pnl-user",
		name: "PNL - User",
		icon: <LineChart className="h-4 w-4" />,
		prompt: "Show PNL for user",
	},
	{
		id: "preview-dust",
		name: "Preview Dust",
		icon: <Trash2 className="h-4 w-4" />,
		prompt: "Preview dust tokens",
	},
	{
		id: "research-tokens",
		name: "Research Tokens",
		icon: <GraduationCap className="h-4 w-4" />,
		prompt: "Research tokens",
	},
	{
		id: "rewards-amount",
		name: "Rewards > Amount",
		icon: <Gift className="h-4 w-4" />,
		prompt: "Show rewards amount",
	},
	{
		id: "rewards-claim",
		name: "Rewards > Claim",
		icon: <Gift className="h-4 w-4" />,
		prompt: "Claim rewards",
	},
	{
		id: "send-tokens",
		name: "Send Tokens",
		icon: <ArrowRight className="h-4 w-4" />,
		prompt: "Send tokens",
	},
	{
		id: "social-alpha",
		name: "Social Alpha",
		icon: <Hash className="h-4 w-4" />,
		prompt: "Show social alpha",
	},
	{
		id: "social-buzz",
		name: "Social Buzz",
		icon: <Flame className="h-4 w-4" />,
		prompt: "Show social buzz",
	},
	{
		id: "social-news",
		name: "Social News",
		icon: <Newspaper className="h-4 w-4" />,
		prompt: "Show social news",
	},
	{
		id: "social-sentiments",
		name: "Social Sentiments",
		icon: <Newspaper className="h-4 w-4" />,
		prompt: "Show social sentiments",
	},
	{
		id: "swap-tokens",
		name: "Swap Tokens",
		icon: <ArrowLeftRight className="h-4 w-4" />,
		prompt: "Swap tokens",
	},
	{
		id: "swap-with-profits-stop-loss",
		name: "Swap with profits & stop loss",
		icon: <ArrowLeftRight className="h-4 w-4" />,
		prompt:
			"Swap tokens with profit targets and stop loss. Sell 50% for 30% gain and the other 50% for 100% gain. Sell 50% for stop loss of 20% and 50% for stop loss of 40%",
	},
	{
		id: "swap-with-ladders",
		name: "Swap with ladders",
		icon: <Layers className="h-4 w-4" />,
		prompt:
			"Swap tokens with profit ladders. Sell 20% for 10% gain, sell 20% for 25% gain, sell 20% for 50% gain, sell 20% for 75% gain.",
	},
	{
		id: "token-details",
		name: "Token Details",
		icon: <Coins className="h-4 w-4" />,
		prompt: "Show token details",
	},
	{
		id: "limit-buy",
		name: "Limit Buy",
		icon: <TrendingUp className="h-4 w-4" />,
		prompt: "Place a limit buy order",
	},
	{
		id: "limit-sell",
		name: "Limit Sell",
		icon: <TrendingUp className="h-4 w-4" />,
		prompt: "Place a limit sell order",
	},
	{
		id: "learn-auto-trade",
		name: "Learn Auto-Trade",
		icon: <GraduationCap className="h-4 w-4" />,
		prompt: "How does auto-trade work?",
	},
	{
		id: "learn-limit-orders",
		name: "Learn Limit Orders",
		icon: <GraduationCap className="h-4 w-4" />,
		prompt: "How do limit orders work?",
	},
	{
		id: "learn-gangstr",
		name: "Learn Gangstr",
		icon: <GraduationCap className="h-4 w-4" />,
		prompt: "What is Gangstr?",
	},
	{
		id: "learn-stop-loss",
		name: "Learn Stop Loss",
		icon: <GraduationCap className="h-4 w-4" />,
		prompt: "How does stop loss work?",
	},
	{
		id: "my-portfolio",
		name: "My portfolio",
		icon: <LineChart className="h-4 w-4" />,
		prompt: "Show my portfolio",
	},
]

