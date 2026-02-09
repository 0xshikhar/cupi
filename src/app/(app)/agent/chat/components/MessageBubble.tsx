import { Bot } from "lucide-react"
import { renderMarkdown } from "../utils/markdown-renderer"
import type { Message } from "../types/chat"

interface MessageBubbleProps {
	message: Message
	hasMounted: boolean
}

export const MessageBubble = ({ message, hasMounted }: MessageBubbleProps) => {
	const isUser = message.sender === "user"
	const time = hasMounted
		? new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
		: ""

	return (
		<div className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-1 duration-200`}>
			{!isUser && (
				<span className="shrink-0 w-7 h-7 rounded-lg bg-primary border border-black/20 flex items-center justify-center">
					<Bot className="h-4 w-4 text-black" />
				</span>
			)}

			<div
				className={`max-w-[82%] px-3.5 py-2.5 text-sm ${
					isUser
						? "bg-black text-white rounded-2xl rounded-br-md"
						: "bg-secondary text-foreground rounded-2xl rounded-bl-md"
				}`}
			>
				{isUser ? (
					<p className="whitespace-pre-wrap break-words">{message.content}</p>
				) : (
					<div className="markdown-content break-words">{renderMarkdown(message.content)}</div>
				)}
				<p className={`text-[10px] mt-1 text-right ${isUser ? "text-white/60" : "text-muted-foreground"}`} suppressHydrationWarning>
					{time}
				</p>
			</div>
		</div>
	)
}
