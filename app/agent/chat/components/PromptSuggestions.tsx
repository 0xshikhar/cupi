import Image from "next/image"
import { PROMPT_SUGGESTIONS } from "../constants/prompts"

interface PromptSuggestionsProps {
	onPromptClick: (prompt: string) => void
}

export const PromptSuggestions = ({
	onPromptClick,
}: PromptSuggestionsProps) => {
	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
			<div className="flex items-center justify-center mb-4">
				<Image
					src="/logo.png"
					alt="Gangstr"
					width={80}
					height={80}
					className="rounded-full"
				/>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 w-full max-w-5xl px-4">
				{PROMPT_SUGGESTIONS.map((prompt, index) => (
					<button
						key={index}
						onClick={() => onPromptClick(prompt)}
						className="text-left p-3 sm:p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors shadow-sm hover:shadow-md"
						tabIndex={0}
						aria-label={`Use prompt: ${prompt.substring(0, 50)}...`}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault()
								onPromptClick(prompt)
							}
						}}
					>
						<p className="text-xs sm:text-sm text-foreground line-clamp-3">
							{prompt}
						</p>
					</button>
				))}
			</div>
		</div>
	)
}

