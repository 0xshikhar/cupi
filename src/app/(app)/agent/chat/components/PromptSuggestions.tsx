import { Bot } from "lucide-react"
import { PROMPT_SUGGESTIONS } from "../constants/prompts"

interface PromptSuggestionsProps {
	onPromptClick: (prompt: string) => void
}

export const PromptSuggestions = ({ onPromptClick }: PromptSuggestionsProps) => {
	return (
		<div className="flex flex-col items-center text-center pt-6 pb-2 space-y-6">
			<div className="w-16 h-16 rounded-2xl bg-primary border-2 border-black shadow-[3px_3px_0_0_#000] flex items-center justify-center">
				<Bot className="h-8 w-8 text-black" />
			</div>
			<div className="space-y-1.5 max-w-xs">
				<h2 className="text-xl font-black tracking-tight">Hi! I&apos;m your cUPI assistant.</h2>
				<p className="text-sm text-muted-foreground">
					I can check balances, move funds and run approved actions — never more than your daily limit.
				</p>
			</div>
			<div className="grid grid-cols-2 gap-2.5 w-full">
				{PROMPT_SUGGESTIONS.map(({ title, prompt, icon, tint }) => (
					<button
						key={title}
						type="button"
						onClick={() => onPromptClick(prompt)}
						className="text-left p-3 rounded-2xl border-2 border-black bg-white shadow-[2px_2px_0_0_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
					>
						<span className={`w-8 h-8 rounded-lg ${tint} flex items-center justify-center mb-2`}>{icon}</span>
						<span className="block text-sm font-bold leading-tight">{title}</span>
						<span className="block text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{prompt}</span>
					</button>
				))}
			</div>
		</div>
	)
}
