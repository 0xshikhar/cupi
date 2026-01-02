import { useState, useRef, useEffect, useCallback } from "react"
import type { Message } from "../types/chat"

export const useChatScroll = (
	messages: Message[],
	activeMode: "research" | "automation"
) => {
	const [showScrollToBottom, setShowScrollToBottom] = useState(false)
	const chatContainerRef = useRef<HTMLDivElement>(null)
	const messagesEndRef = useRef<HTMLDivElement>(null)

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
	}, [])

	const handleScroll = useCallback(() => {
		if (!chatContainerRef.current) return

		const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
		const isNotAtBottom = scrollHeight - scrollTop - clientHeight > 100
		setShowScrollToBottom(isNotAtBottom)
	}, [])

	useEffect(() => {
		scrollToBottom()

		const chatContainer = chatContainerRef.current
		if (chatContainer) {
			chatContainer.addEventListener("scroll", handleScroll)
			return () => {
				chatContainer.removeEventListener("scroll", handleScroll)
			}
		}
	}, [messages, activeMode, scrollToBottom, handleScroll])

	return {
		showScrollToBottom,
		chatContainerRef,
		messagesEndRef,
		scrollToBottom,
	}
}

