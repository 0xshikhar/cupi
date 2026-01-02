

/**
 * Formats agent responses with enhanced markdown structure
 * @param text The raw response text from the agent
 * @returns Formatted text with appropriate markdown elements
 */

/**
 * Main formatting function that determines the type of content and applies appropriate formatting
 * 
 * @param text The raw response text from the agent
 * @returns Properly formatted markdown for rendering in the frontend
 */
export function formatResponseWithMarkdown(text: string): string {
    if (!text || typeof text !== 'string') {
        return '## Agent Response\n\nNo response data available.';
    }

    // Normalize line endings first
    text = text.replace(/\r\n/g, '\n');

    // Check for specific wallet details pattern from the screenshot
    if (text.match(/\*\*Provider\s*:\*\*\s*cdp_smart_wallet_provider/i) ||
        text.match(/Provider\s*:\s*cdp_smart_wallet_provider/i) ||
        text.match(/\*\*Address\s*:\*\*\s*0x[a-fA-F0-9]+/i) ||
        text.match(/Address\s*:\s*0x[a-fA-F0-9]+/i)) {
        // This very specifically looks like the wallet details from the screenshot
        return formatWalletDetails(text);
    }

    // Handle asterisk formatting that might be already present
    text = normalizeExistingMarkdown(text);

    // Check for common patterns and format them appropriately

    // Format wallet details (more general case)
    if (text.toLowerCase().includes('wallet details') ||
        text.includes('Provider:') ||
        text.includes('Address:')) {
        return formatWalletDetails(text);
    }

    // Format transaction information
    if (text.toLowerCase().includes('transaction hash:') ||
        text.toLowerCase().includes('txhash')) {
        return formatTransactionInfo(text);
    }

    // Format portfolio information
    if (text.toLowerCase().includes('portfolio')) {
        return formatPortfolioInfo(text);
    }

    // Default formatting for other responses
    return addDefaultFormatting(text);
}

/**
 * Normalize any existing markdown to prevent conflicts
 */
function normalizeExistingMarkdown(text: string): string {
    // Fix any malformed markdown
    let normalized = text;

    // Fix heading formatting
    normalized = normalized.replace(/^#+\s*(.+)$/gm, (match, content) => {
        const level = match.split(' ')[0].length;
        return `${'#'.repeat(level)} ${content.trim()}`;
    });

    // Fix bold formatting
    normalized = normalized.replace(/\*\*(.+?)\*\*/g, '**$1**');

    // Fix code block formatting
    normalized = normalized.replace(/`(.+?)`/g, '`$1`');

    return normalized;
}

/**
 * Formats wallet details with proper markdown structure
 */
export function formatWalletDetails(text: string): string {
    // Create a header
    let formatted = '## Wallet Details\n\n';

    // Check for the specific pattern seen in the screenshot
    if (text.includes('**Provider:**') || text.includes('**Address:**') ||
        text.includes('cdp_smart_wallet_provider') || text.includes('0xb2b3') ||
        text.includes('base-sepolia')) {

        // Try to detect the specific wallet details format from the screenshot
        if (text.includes('**') && text.includes('Here are the wallet details')) {
            // Already well-formatted, just ensure consistent spacing
            return cleanupExistingFormatting(text);
        }

        // Process the raw wallet details similar to the screenshot pattern
        if (text.match(/Provider:\s*cdp_smart_wallet_provider/i) ||
            text.match(/Address:\s*0x[a-fA-F0-9]+/i)) {

            // This appears to be the specific pattern from the screenshot
            return formatScreenshotWalletDetails(text);
        }

        // Extract provider, address, network, etc. with regex
        const providerMatch = text.match(/\*\*Provider:\*\*\s*([^\n]+)/i) || text.match(/Provider:\s*([^\n]+)/i);
        const addressMatch = text.match(/\*\*Address:\*\*\s*([^\n]+)/i) || text.match(/Address:\s*([^\n]+)/i);
        const networkMatch = text.match(/\*\*Network:\*\*\s*([^\n]+)/i) || text.match(/Network:\s*([^\n]+)/i);
        const protocolMatch = text.match(/\*\*Protocol Family:\*\*\s*([^\n]+)/i) ||
            text.match(/Protocol Family:\s*([^\n]+)/i) ||
            text.match(/\*\*Protocol\s*Family:\*\*\s*([^\n]+)/i);
        const networkIdMatch = text.match(/\*\*Network ID:\*\*\s*([^\n]+)/i) ||
            text.match(/Network ID:\s*([^\n]+)/i) ||
            text.match(/\*\*Network\s*ID:\*\*\s*([^\n]+)/i);
        const chainIdMatch = text.match(/\*\*Chain ID:\*\*\s*([^\n]+)/i) ||
            text.match(/Chain ID:\s*([^\n]+)/i) ||
            text.match(/\*\*Chain\s*ID:\*\*\s*([^\n]+)/i);
        const balanceMatch = text.match(/\*\*Native Balance:\*\*\s*([^\n]+)/i) ||
            text.match(/Native Balance:\s*([^\n]+)/i) ||
            text.match(/\*\*Native\s*Balance:\*\*\s*([^\n]+)/i);

        // Add each field with proper formatting if found
        if (providerMatch && providerMatch[1]) {
            formatted += `**Provider:** ${providerMatch[1].trim()}\n\n`;
        }

        if (addressMatch && addressMatch[1]) {
            // Format address as code block for better visibility
            formatted += `**Address:** \`${addressMatch[1].trim()}\`\n\n`;
        }

        if (networkMatch && networkMatch[1]) {
            formatted += `**Network:** ${networkMatch[1].trim()}\n\n`;
        }

        if (protocolMatch && protocolMatch[1]) {
            formatted += `**Protocol Family:** ${protocolMatch[1].trim()}\n\n`;
        }

        if (networkIdMatch && networkIdMatch[1]) {
            formatted += `**Network ID:** ${networkIdMatch[1].trim()}\n\n`;
        }

        if (chainIdMatch && chainIdMatch[1]) {
            formatted += `**Chain ID:** ${chainIdMatch[1].trim()}\n\n`;
        }

        if (balanceMatch && balanceMatch[1]) {
            formatted += `**Native Balance:** ${balanceMatch[1].trim()}\n\n`;
        }

        return formatted;
    }

    /**
     * Special formatter for the exact wallet details format seen in the screenshot
     */
    function formatScreenshotWalletDetails(text: string): string {
        let result = '## Wallet Details\n\n';

        // Extract the common wallet detail pattern with stars and double-stars
        const lines = text.split('\n');
        let detailsFound = false;

        for (const line of lines) {
            if (line.includes('wallet details')) {
                // This is the heading line
                result += '### Here are the wallet details:\n\n';
                detailsFound = true;
                continue;
            }

            if (!detailsFound && !line.includes('**') && !line.includes('Provider:')) {
                continue; // Skip lines before details section
            }

            // Handle the specific format with stars from the screenshot
            const cleanLine = line.trim();
            if (!cleanLine) continue;

            // Extract details with the specific pattern from screenshot (** and **)
            const detailMatch = cleanLine.match(/\*\*([^*]+)\*\*\s*([^\n]+)/i) ||
                cleanLine.match(/[*-]+\s*([^:]+):\s*([^\n]+)/i);

            if (detailMatch) {
                const key = detailMatch[1].trim().replace(/^[*-]+|[*-]+$/g, '');
                const value = detailMatch[2].trim();

                // Format address with code block, others as regular text
                if (key.toLowerCase().includes('address')) {
                    result += `**${key}:** \`${value}\`\n\n`;
                } else {
                    result += `**${key}:** ${value}\n\n`;
                }

                detailsFound = true;
            }
            // Special case for common patterns in the screenshot
            else if (cleanLine.includes(':')) {
                const parts = cleanLine.split(':');
                if (parts.length >= 2) {
                    const key = parts[0].trim().replace(/^[*-]+|[*-]+$/g, '');
                    const value = parts[1].trim();

                    if (key.toLowerCase().includes('address')) {
                        result += `**${key}:** \`${value}\`\n\n`;
                    } else {
                        result += `**${key}:** ${value}\n\n`;
                    }

                    detailsFound = true;
                }
            }
        }

        return result;
    }

    /**
     * Cleanup existing well-formatted wallet details
     */
    function cleanupExistingFormatting(text: string): string {
        let result = '## Wallet Details\n\n';
        const lines = text.split('\n');

        for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine) continue;

            if (cleanLine.includes('wallet details')) {
                result += '### Here are the wallet details:\n\n';
            }
            else if (cleanLine.includes('**') && cleanLine.includes(':**')) {
                // Already formatted with bold - ensure consistent spacing
                result += `${cleanLine}\n\n`;
            }
            else if (cleanLine.includes(':')) {
                const parts = cleanLine.split(':');
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const value = parts[1].trim();
                    result += `**${key}:** ${value}\n\n`;
                } else {
                    result += `${cleanLine}\n\n`;
                }
            }
            else {
                result += `${cleanLine}\n\n`;
            }
        }

        return result;
    }

    // General case - Split by lines and format each detail
    const lines = text.split('\n');

    for (const line of lines) {
        // Skip empty lines
        if (!line.trim()) continue;

        // Special handling for wallet details lines
        if (line.includes('**') && line.includes(':**')) {
            // Already formatted, keep as is
            formatted += `${line.trim()}\n\n`;
        } else if (line.includes(':')) {
            const [key, value] = line.split(':', 2);
            // Clean any existing formatting and apply consistent formatting
            const cleanKey = key.trim().replace(/^\*+|\*+$|^\s*\*\*|\*\*\s*$/g, '');
            formatted += `**${cleanKey}:** ${value.trim()}\n\n`;
        } else if (line.includes('wallet details')) {
            // This is likely a heading or introduction
            formatted += `### ${line.trim()}\n\n`;
        } else {
            formatted += `${line.trim()}\n\n`;
        }
    }

    return formatted;
}

/**
 * Formats transaction information with proper markdown structure
 */
export function formatTransactionInfo(text: string): string {
    // Extract transaction hash if present
    const txHashRegex = /transaction hash: (0x[a-fA-F0-9]{64})/i;
    const txHashMatch = text.match(txHashRegex);

    let formatted = '## Transaction Information\n\n';

    if (txHashMatch && txHashMatch[1]) {
        formatted += `**Transaction Hash:** \`${txHashMatch[1]}\`\n\n`;

        // Replace the transaction hash in the original text to avoid duplication
        text = text.replace(txHashRegex, '');
    }

    // Format the rest of the text
    formatted += addDefaultFormatting(text);

    return formatted;
}

/**
 * Formats portfolio information with proper markdown structure
 */
export function formatPortfolioInfo(text: string): string {
    let formatted = '## Portfolio Analysis\n\n';

    // Split by lines to identify sections
    const lines = text.split('\n');
    let currentSection = '';

    for (const line of lines) {
        // Skip empty lines
        if (!line.trim()) continue;

        // Check for potential section headers
        if (line.trim().endsWith(':') && !line.includes('**')) {
            currentSection = `### ${line.trim()}\n\n`;
            formatted += currentSection;
        } else if (line.includes(':')) {
            const [key, value] = line.split(':', 2);
            formatted += `**${key.trim().replace(/^\*+|\*+$/g, '')}:** ${value.trim()}\n\n`;
        } else {
            formatted += `${line.trim()}\n\n`;
        }
    }

    return formatted;
}

/**
 * Adds default markdown formatting to text
 */
/**
 * Adds default markdown formatting to text that doesn't match specific patterns
 */
export function addDefaultFormatting(text: string): string {
    // Start with clean text
    let formatted = text.trim();

    // Handle single newlines that should be respected
    formatted = formatted.replace(/([^\n])\n([^\n])/g, '$1\n\n$2');

    // Add basic paragraph formatting
    formatted = formatted
        .split('\n\n')
        .map(paragraph => paragraph.trim())
        .filter(paragraph => paragraph.length > 0)
        .join('\n\n');

    // Format lists if they exist
    formatted = formatted.replace(/^\s*-\s(.+)$/gm, '* $1');

    // Look for potential headers and format them
    formatted = formatted.replace(/^([A-Za-z0-9 ]+):$/gm, '### $1');

    // Format key-value pairs as bold keys
    formatted = formatted.replace(/^([A-Za-z0-9 ]+):\s*(.+)$/gm, '**$1:** $2');

    // Ensure proper spacing around headers
    formatted = formatted.replace(/(#+\s+[^\n]+)\n(?!\n)/g, '$1\n\n');

    // Ensure proper spacing after bold text
    formatted = formatted.replace(/\*\*([^*:]+)\*\*:([^\n])/g, '**$1:** $2');

    // Ensure code blocks are formatted correctly
    formatted = formatted.replace(/`([^`]+)`/g, '`$1`');

    // If no headers were found, add a generic one
    if (!formatted.includes('#')) {
        const title = getAppropriateTitle(text);
        formatted = `## ${title}\n\n${formatted}`;
    }

    return formatted;
}

/**
 * Determine an appropriate title based on content
 */
function getAppropriateTitle(text: string): string {
    if (text.toLowerCase().includes('error')) return 'Error Information';
    if (text.toLowerCase().includes('success')) return 'Success';
    if (text.toLowerCase().includes('warning')) return 'Warning';
    if (text.toLowerCase().includes('help')) return 'Help Information';
    if (text.toLowerCase().includes('tip')) return 'Tip';
    return 'Agent Response';
}

/**
 * Validates if a string is a valid Ethereum address.
 * @param address The string to validate.
 * @returns True if the address is a valid Ethereum address, false otherwise.
 */
export function isValidEthereumAddress(address: string): boolean {
    if (!address || typeof address !== 'string') {
        return false;
    }
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}
