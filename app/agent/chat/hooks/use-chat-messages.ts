import { useState } from "react"
import type { Message, ChatMode } from "../types/chat"

export const useChatMessages = (mode: ChatMode) => {
	const [automationMessages, setAutomationMessages] = useState<Message[]>([])
	const [researchMessages, setResearchMessages] = useState<Message[]>([])

	const messages =
		mode === "automation" ? automationMessages : researchMessages
	const setMessages =
		mode === "automation" ? setAutomationMessages : setResearchMessages

	const addMessage = (message: Message) => {
		setMessages((prev) => [...prev, message])
	}

	return {
		messages,
		setMessages,
		addMessage,
		automationMessages,
		setAutomationMessages,
		researchMessages,
		setResearchMessages,
	}
}

