import { ArrowDown } from "lucide-react"

interface ScrollToBottomButtonProps {
	show: boolean
	onClick: () => void
}

export const ScrollToBottomButton = ({ show, onClick }: ScrollToBottomButtonProps) => {
	if (!show) return null

	return (
		<button
			type="button"
			onClick={onClick}
			className="absolute left-1/2 -translate-x-1/2 bottom-3 bg-black text-white p-2 rounded-full shadow-lg z-10 hover:bg-zinc-800 transition-colors"
			aria-label="Scroll to latest message"
		>
			<ArrowDown size={16} />
		</button>
	)
}
