import type { Message } from "../types/chat"

interface ChatApiRequest {
	userWalletAddress: string
	chain_id: string
	agent_id: string
	session_id: string
	messageHistory: Array<{ role: "user" | "assistant"; content: string }>
}

interface ChatApiResponse {
	agent_response?: string
	error?: string
}

export const validateWallet = (
	walletAddress: string | null,
	agentWalletStatus: "loading" | "ready" | "error"
): void => {
	if (!walletAddress) {
		throw new Error("Please connect your wallet to continue")
	}

	if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
		throw new Error(
			"Invalid wallet address format. Please reconnect your wallet."
		)
	}

	if (agentWalletStatus === "loading") {
		throw new Error(
			"Agent wallet is still being set up. Please wait a moment and try again."
		)
	}

	if (agentWalletStatus === "error") {
		throw new Error(
			"Agent wallet setup failed. Please refresh the page and try again."
		)
	}

	if (agentWalletStatus !== "ready") {
		throw new Error(
			"Agent wallet not ready. Please wait for setup to complete."
		)
	}
}

const formatApiError = (status: number, errorData: { error?: string }): Error => {
	const errorMsg = errorData.error || "Unknown error"

	if (status === 503) {
		if (errorMsg.includes("wallet") || errorMsg.includes("initialization")) {
			return new Error(
				`Wallet initialization error: ${errorMsg}. Please refresh the page and try again.`
			)
		}
		if (errorMsg.includes("cdp") || errorMsg.includes("coinbase")) {
			return new Error(
				`Coinbase Developer Platform error: ${errorMsg}. Please try again later.`
			)
		}
		if (errorMsg.includes("network") || errorMsg.includes("rpc")) {
			return new Error(
				`Network connection error: ${errorMsg}. Please check your connection and try again.`
			)
		}
		return new Error(
			`Service temporarily unavailable: ${errorMsg}. Please try again in a moment.`
		)
	}

	if (status === 400) {
		if (errorMsg.includes("wallet address")) {
			return new Error(
				`Wallet connection error: ${errorMsg}. Please reconnect your wallet.`
			)
		}
		return new Error(
			`Invalid request: ${errorMsg}. Please check your input and try again.`
		)
	}

	if (status === 401) {
		return new Error(
			`Authentication error: ${errorMsg}. Please reconnect your wallet.`
		)
	}

	return new Error(`API error (${status}): ${errorMsg}`)
}

export const sendChatMessage = async (
	request: ChatApiRequest
): Promise<ChatApiResponse> => {
	console.log("[CHAT] Making API request with wallet:", request.userWalletAddress)

	const response = await fetch("/api/chat-with-agent", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(request),
	})

	console.log("[CHAT] API response status:", response.status)

	if (!response.ok) {
		let errorData: { error?: string } = {}
		try {
			errorData = await response.json()
		} catch (parseError) {
			console.error("[CHAT] Failed to parse error response:", parseError)
			errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
		}
		console.error("[CHAT] API error response:", errorData)
		throw formatApiError(response.status, errorData)
	}

	let data: ChatApiResponse
	try {
		data = await response.json()
	} catch (parseError) {
		console.error("[CHAT] Failed to parse success response:", parseError)
		throw new Error("Invalid response format from server")
	}

	console.log("[CHAT] API response data:", data)
	return data
}

export const formatErrorMessage = (error: unknown): string => {
	const errorMsg = error instanceof Error ? error.message : "Unknown error"

	if (errorMsg.includes("Wallet initialization error")) {
		return `## Wallet Connection Issue

⚠️ Your wallet connection needs to be refreshed.

**What happened:** ${errorMsg}

**Solution:** Please refresh the page, ensure your wallet is connected, and try again.`
	}

	if (
		errorMsg.includes("Wallet connection error") ||
		errorMsg.includes("Invalid wallet address")
	) {
		return `## Wallet Connection Required

⚠️ Your wallet needs to be properly connected.

**What happened:** ${errorMsg}

**Solution:** Please connect your wallet using the "Connect Wallet" button in the top right corner.`
	}

	if (errorMsg.includes("Coinbase Developer Platform error")) {
		return `## Service Temporarily Unavailable

⚠️ The Coinbase Developer Platform is experiencing issues.

**What happened:** ${errorMsg}

**Solution:** Please try again in a few minutes.`
	}

	if (errorMsg.includes("Network connection error")) {
		return `## Network Connection Issue

⚠️ There's a problem with your network connection.

**What happened:** ${errorMsg}

**Solution:** Please check your internet connection and try again.`
	}

	if (errorMsg.includes("Authentication error")) {
		return `## Authentication Failed

⚠️ Your wallet authentication has expired.

**What happened:** ${errorMsg}

**Solution:** Please reconnect your wallet and try again.`
	}

	return `## Error

Sorry, there was an error communicating with the agent.

**Details:** ${errorMsg}

**Solution:** Please try refreshing the page and try again.`
}

let messageIdCounter = 0

export const createMessage = (
	content: string,
	sender: "user" | "agent",
	agentType?: string
): Message => {
	messageIdCounter++
	return {
		id: `${Date.now()}-${messageIdCounter}-${Math.random().toString(36).substring(2, 9)}`,
		content,
		sender,
		timestamp: new Date(),
		agentType,
	}
}

