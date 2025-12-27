import { type RefObject } from "react"
import { ACTION_PROMPTS } from "../constants/prompts"

interface ActionsPopupProps {
	isOpen: boolean
	popupRef: RefObject<HTMLDivElement>
	onActionClick: (prompt: string) => void
}

export const ActionsPopup = ({
	isOpen,
	popupRef,
	onActionClick,
}: ActionsPopupProps) => {
	if (!isOpen) return null

	return (
		<div
			ref={popupRef}
			className="absolute bottom-full left-0 mb-2 w-[280px] sm:w-[320px] max-h-[60vh] overflow-y-auto bg-background border border-border rounded-lg shadow-xl z-[60]"
		>
			<div className="p-2">
				{ACTION_PROMPTS.map((action) => (
					<button
						type="button"
						key={action.id}
						onClick={() => onActionClick(action.prompt)}
						className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted rounded-md transition-colors text-sm"
						tabIndex={0}
						aria-label={action.name}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault()
								onActionClick(action.prompt)
							}
						}}
					>
						<div className="flex-shrink-0 text-muted-foreground">
							{action.icon}
						</div>
						<span className="text-foreground">{action.name}</span>
					</button>
				))}
			</div>
		</div>
	)
}

