import { type RefObject } from "react"
import { ACTION_PROMPTS } from "../constants/prompts"

interface ActionsPopupProps {
	isOpen: boolean
	popupRef: RefObject<HTMLDivElement>
	onActionClick: (prompt: string) => void
}

export const ActionsPopup = ({ isOpen, popupRef, onActionClick }: ActionsPopupProps) => {
	if (!isOpen) return null

	return (
		<div
			ref={popupRef}
			role="menu"
			className="absolute bottom-full left-0 mb-3 w-64 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#000] p-1.5 z-[60] animate-in fade-in slide-in-from-bottom-2 duration-150"
		>
			{ACTION_PROMPTS.map((action) => (
				<button
					type="button"
					role="menuitem"
					key={action.id}
					onClick={() => onActionClick(action.prompt)}
					className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary rounded-xl transition-colors text-sm font-semibold"
				>
					<span className="shrink-0 text-muted-foreground">{action.icon}</span>
					{action.name}
				</button>
			))}
		</div>
	)
}
