import Image from "next/image"
import { User } from "lucide-react"
import { renderMarkdown } from "../utils/markdown-renderer"
import type { Message } from "../types/chat"

interface MessageBubbleProps {
	message: Message
	hasMounted: boolean
}

export const MessageBubble = ({ message, hasMounted }: MessageBubbleProps) => {
	const isUser = message.sender === "user"

	return (
		<div
			className={`flex items-start mb-3 sm:mb-4 ${
				isUser ? "justify-end" : "justify-start"
			}`}
		>
			{!isUser && (
				<div className="flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center mr-2 sm:mr-3 bg-secondary border border-border shadow-lg">
					<Image src="/logo.png" alt="Agent" width={16} height={16} />
				</div>
			)}

			<div
				className={`rounded-xl p-3 sm:p-4 max-w-[80%] sm:max-w-[70%] shadow-lg backdrop-blur-sm ${
					isUser
						? "bg-primary/10 border border-primary/30 text-foreground ml-auto order-1"
						: "bg-accent/10 border border-accent/30 text-foreground"
				}`}
			>
				{isUser ? (
					<p className="text-xs sm:text-sm whitespace-pre-wrap">
						{message.content}
					</p>
				) : (
					<div className="text-xs sm:text-sm markdown-content">
						{renderMarkdown(message.content)}
					</div>
				)}
				<p
					className="text-[10px] sm:text-xs text-muted-foreground mt-1"
					suppressHydrationWarning
				>
					{hasMounted
						? new Date(message.timestamp).toLocaleTimeString([], {
								hour: "2-digit",
								minute: "2-digit",
							})
						: ""}
				</p>
			</div>

			{isUser && (
				<div className="flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center ml-2 sm:ml-3 order-2 bg-[rgba(210,113,254,0.15)] border border-[rgba(210,113,254,0.3)]">
					<User className="h-3 w-3 sm:h-4 sm:w-4 text-foreground" />
				</div>
			)}
		</div>
	)
}

