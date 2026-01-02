import React from "react"

/**
 * Render plain text with explicit line breaks preserved.
 */
export const renderTextWithLineBreaks = (
	text: string
): React.ReactNode[] => {
	const parts = text.split(/\n/)
	const nodes: React.ReactNode[] = []
	parts.forEach((part, idx) => {
		nodes.push(<span key={`ln-${idx}`}>{part}</span>)
		if (idx < parts.length - 1) nodes.push(<br key={`br-${idx}`} />)
	})
	return nodes
}

/**
 * Process inline code blocks
 */
const processCodeBlocks = (text: string): React.ReactNode[] => {
	const parts = []
	let lastIndex = 0
	let key = 0

	const codeRegex = /`([^`]*)`/g
	let codeMatch

	while ((codeMatch = codeRegex.exec(text)) !== null) {
		if (codeMatch.index > lastIndex) {
			parts.push(
				<span key={key++}>
					{renderTextWithLineBreaks(
						text.substring(lastIndex, codeMatch.index)
					)}
				</span>
			)
		}

		parts.push(
			<code
				key={key++}
				className="bg-muted rounded px-1 py-0.5 text-xs"
			>
				{codeMatch[1]}
			</code>
		)

		lastIndex = codeMatch.index + codeMatch[0].length
	}

	if (lastIndex < text.length) {
		parts.push(
			<span key={key++}>
				{renderTextWithLineBreaks(text.substring(lastIndex))}
			</span>
		)
	}

	return parts.length > 0 ? parts : [<span key={0}>{text}</span>]
}

/**
 * Process inline markdown elements like bold and code
 */
const processInlineMarkdown = (text: string): React.ReactNode[] => {
	const parts = []
	let lastIndex = 0
	let key = 0

	const boldRegex = /\*\*([^*]*)\*\*/g
	let boldMatch

	while ((boldMatch = boldRegex.exec(text)) !== null) {
		if (boldMatch.index > lastIndex) {
			parts.push(
				<span key={key++}>
					{processCodeBlocks(text.substring(lastIndex, boldMatch.index))}
				</span>
			)
		}

		parts.push(
			<strong key={key++} className="font-semibold">
				{processCodeBlocks(boldMatch[1])}
			</strong>
		)

		lastIndex = boldMatch.index + boldMatch[0].length
	}

	if (lastIndex < text.length) {
		parts.push(
			<span key={key++}>{processCodeBlocks(text.substring(lastIndex))}</span>
		)
	}

	return parts.length > 0 ? parts : [<span key={0}>{text}</span>]
}

/**
 * Custom renderer for markdown-like content in agent messages
 * - Supports headings (##, ###)
 * - Supports bullet/numbered/lettered lists (-, *, •, 1., A.)
 * - Preserves single line breaks inside paragraphs
 */
export const renderMarkdown = (text: string): React.ReactNode => {
	if (!text) return <p>No content</p>

	const paragraphs = text.split(/\n\n+/)

	return (
		<>
			{paragraphs.map((paragraph, i) => {
				if (paragraph.startsWith("## ")) {
					const content = paragraph.replace(/^## /, "")
					return (
						<h2 key={i} className="text-lg font-normal my-2">
							{content}
						</h2>
					)
				}

				if (paragraph.startsWith("### ")) {
					const content = paragraph.replace(/^### /, "")
					return (
						<h3 key={i} className="text-md font-normal my-2">
							{content}
						</h3>
					)
				}

				const lines = paragraph.split(/\n/)
				const bulletRegex = /^(?:[-*]|•|\d+\.|[A-Z]\.)\s+/
				const bulletLines = lines.filter((l) => bulletRegex.test(l.trim()))
				if (bulletLines.length >= 2) {
					const preface: string[] = []
					const items: string[] = []
					lines.forEach((l) => {
						const t = l.trim()
						if (bulletRegex.test(t)) {
							items.push(t.replace(bulletRegex, ""))
						} else if (t.length) {
							preface.push(t)
						}
					})

					return (
						<div key={i}>
							{preface.length > 0 && (
								<p className="my-2">
									{processInlineMarkdown(preface.join("\n"))}
								</p>
							)}
							<ul className="list-disc pl-5 my-2">
								{items.map((item, j) => (
									<li key={`${i}-${j}`} className="my-1">
										{processInlineMarkdown(item)}
									</li>
								))}
							</ul>
						</div>
					)
				}

				return (
					<p key={i} className="my-2">
						{processInlineMarkdown(paragraph)}
					</p>
				)
			})}
		</>
	)
}

