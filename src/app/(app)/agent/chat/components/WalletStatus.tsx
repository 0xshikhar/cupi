import Link from "next/link"
import { ArrowLeft, Bot, Settings2 } from "lucide-react"

interface WalletStatusProps {
	walletAddress: string | null
	agentWalletStatus: "loading" | "ready" | "error" | null
	agentWalletAddress: string | null
}

const mask = (address: string) => (address.length < 10 ? address : `${address.slice(0, 6)}…${address.slice(-4)}`)

/** Chat header: identity + live status of the agent's scoped wallet. */
export const WalletStatus = ({ agentWalletStatus, agentWalletAddress }: WalletStatusProps) => {
	const status =
		agentWalletStatus === "ready" && agentWalletAddress
			? { dot: "bg-emerald-500", text: `Agent wallet ${mask(agentWalletAddress)}` }
			: agentWalletStatus === "error"
				? { dot: "bg-red-500", text: "Agent wallet unavailable" }
				: { dot: "bg-amber-400 animate-pulse", text: "Setting up agent wallet…" }

	return (
		<header className="shrink-0 flex items-center gap-3 px-3 py-2.5 border-b border-border bg-white/90 backdrop-blur-md">
			<Link href="/agent" className="p-2 -ml-1 rounded-full hover:bg-secondary transition-colors" aria-label="Back to assistant overview">
				<ArrowLeft size={18} />
			</Link>
			<span className="w-9 h-9 shrink-0 rounded-xl bg-primary border-2 border-black flex items-center justify-center">
				<Bot className="h-5 w-5 text-black" />
			</span>
			<div className="flex-1 min-w-0">
				<p className="flex items-center gap-1.5 font-bold text-sm leading-tight">
					cUPI Assistant
					<span className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded bg-black text-white">Beta</span>
				</p>
				<p className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate" aria-live="polite">
					<span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dot}`} />
					{status.text}
				</p>
			</div>
			<Link href="/agent" className="p-2 rounded-full hover:bg-secondary transition-colors" aria-label="Spend limits and settings">
				<Settings2 size={18} />
			</Link>
		</header>
	)
}
