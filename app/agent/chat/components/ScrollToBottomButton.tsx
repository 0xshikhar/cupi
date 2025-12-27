import { ArrowDown } from "lucide-react"

interface ScrollToBottomButtonProps {
	show: boolean
	onClick: () => void
}

export const ScrollToBottomButton = ({
	show,
	onClick,
}: ScrollToBottomButtonProps) => {
	if (!show) return null

	return (
		<button
			type="button"
			onClick={onClick}
			className="absolute right-4 bottom-20 bg-[rgb(210,113,254)] text-black p-2 rounded-full shadow-lg animate-bounce z-40"
			aria-label="Scroll to bottom"
		>
			<ArrowDown size={16} />
		</button>
	)
}

