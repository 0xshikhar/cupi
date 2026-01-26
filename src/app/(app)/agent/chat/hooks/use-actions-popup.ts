import { useState, useRef, useEffect } from "react"

export const useActionsPopup = () => {
	const [showActionsPopup, setShowActionsPopup] = useState(false)
	const actionsPopupRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				actionsPopupRef.current &&
				!actionsPopupRef.current.contains(event.target as Node)
			) {
				setShowActionsPopup(false)
			}
		}

		if (showActionsPopup) {
			document.addEventListener("mousedown", handleClickOutside)
			return () => {
				document.removeEventListener("mousedown", handleClickOutside)
			}
		}
	}, [showActionsPopup])

	return {
		showActionsPopup,
		setShowActionsPopup,
		actionsPopupRef,
	}
}

