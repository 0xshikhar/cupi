import Image from "next/image"
import { Wallet, RefreshCw } from "lucide-react"

interface WalletStatusProps {
	walletAddress: string | null
	agentWalletStatus: "loading" | "ready" | "error" | null
	agentWalletAddress: string | null
}

/**
 * Masks a wallet address by showing first 6 and last 4 characters.
 * Returns the original address if it's too short to mask safely.
 */
const maskWalletAddress = (address: string): string => {
	if (!address || address.length < 10) {
		return address
	}
	return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
}

export const WalletStatus = ({
	walletAddress,
	agentWalletStatus,
	agentWalletAddress,
}: WalletStatusProps) => {
	if (!walletAddress) return null

	return (
		<div className="p-2 bg-secondary border-b border-border">
			<div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
				<div className="flex items-center gap-2">
					<Wallet className="h-3 w-3 text-green-500" />
					<span>User wallet: {maskWalletAddress(walletAddress)}</span>
				</div>

				<div className="flex items-center gap-2">
					{agentWalletStatus === "loading" && (
						<>
							<RefreshCw className="h-3 w-3 text-blue-500 animate-spin" />
							<span className="text-primary">
								Setting up agent wallet...
							</span>
						</>
					)}
					{agentWalletStatus === "ready" && agentWalletAddress && (
						<>
							<Image
								src="/logo.png"
								alt="Agent"
								width={12}
								height={12}
							/>
							<span className="text-green-600">
								Agent wallet: {maskWalletAddress(agentWalletAddress)}
							</span>
						</>
					)}
					{agentWalletStatus === "error" && (
						<>
							<div className="h-3 w-3 rounded-full bg-red-500" />
							<span className="text-red-600">
								Agent wallet setup failed
							</span>
						</>
					)}
				</div>
			</div>
		</div>
	)
}

