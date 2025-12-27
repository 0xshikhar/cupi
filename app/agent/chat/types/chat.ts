import type { ReactNode } from "react"

export type Message = {
	id: string
	content: string
	sender: "user" | "agent"
	timestamp: Date
	agentType?: string
}

export type ChatMode = "research" | "automation"

export type AgentId = "optimizer" | "risk" | "yield" | "research"

export type AgentOption = {
	id: AgentId
	name: string
	description: string
	icon: ReactNode
	greeting: string
}

export type ActionPrompt = {
	id: string
	name: string
	icon: ReactNode
	prompt: string
}

