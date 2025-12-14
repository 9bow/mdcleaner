/**
 * RichText Converter
 * Converts HTML (rich text) to Markdown using Turndown.js
 * Inspired by Discourse's paste handling approach
 */

// Initialize Turndown service with optimal settings
function createTurndownService() {
    const turndownService = new TurndownService({
        headingStyle: 'atx',
        hr: '---',
        bulletListMarker: '-',
        codeBlockStyle: 'fenced',
        fence: '```',
        emDelimiter: '*',
        strongDelimiter: '**',
        linkStyle: 'inlined',
        preformattedCode: true,
    });

    // Use GFM plugin for tables, strikethrough, etc.
    if (typeof turndownPluginGfm !== 'undefined') {
        turndownService.use(turndownPluginGfm.gfm);
    }

    // Custom rule for Gemini citation start markers
    // These appear as elements like [cite_start] in the source
    turndownService.addRule('geminiCiteStart', {
        filter: function (node) {
            // Match elements that contain [cite_start] or have cite-start class
            return (
                node.textContent === '[cite_start]' ||
                (node.getAttribute && node.getAttribute('class') &&
                    node.getAttribute('class').includes('cite-start'))
            );
        },
        replacement: function () {
            return '[cite_start]';
        }
    });

    // Custom rule for Gemini citation end markers [cite: N] or [cite: N, M]
    turndownService.addRule('geminiCiteEnd', {
        filter: function (node) {
            // Match elements that contain [cite: ...] pattern
            const text = node.textContent || '';
            return /^\[cite:\s*[\d,\s\-]+\]$/.test(text.trim());
        },
        replacement: function (content, node) {
            const text = node.textContent || '';
            return text.trim();
        }
    });

    // Custom rule for superscript (often used for citations)
    // Convert superscript numbers to [cite: N] format for Gemini
    turndownService.addRule('superscriptCitation', {
        filter: 'sup',
        replacement: function (content, node) {
            // Check if content is a number (citation reference)
            const trimmed = content.trim();
            if (/^\d+$/.test(trimmed)) {
                // This is likely a citation number, preserve as text
                // Don't convert to [cite: N] here as we want to match Discourse behavior
                return trimmed;
            }
            return content;
        }
    });

    // Custom rule for preserving line breaks
    turndownService.addRule('lineBreak', {
        filter: 'br',
        replacement: function () {
            return '\n';
        }
    });

    // Custom rule for better paragraph handling
    turndownService.addRule('paragraph', {
        filter: 'p',
        replacement: function (content) {
            return '\n\n' + content + '\n\n';
        }
    });

    // Custom rule for Google Docs specific spans
    turndownService.addRule('googleDocsSpan', {
        filter: function (node) {
            return (
                node.nodeName === 'SPAN' &&
                node.getAttribute('style') &&
                !node.querySelector('*')
            );
        },
        replacement: function (content, node) {
            const style = node.getAttribute('style') || '';

            // Check for bold
            if (style.includes('font-weight:700') || style.includes('font-weight: 700') ||
                style.includes('font-weight:bold') || style.includes('font-weight: bold')) {
                return '**' + content.trim() + '**';
            }

            // Check for italic
            if (style.includes('font-style:italic') || style.includes('font-style: italic')) {
                return '*' + content.trim() + '*';
            }

            return content;
        }
    });

    // Override strong rule to fix spacing issues
    turndownService.addRule('strongFixed', {
        filter: ['strong', 'b'],
        replacement: function (content, node, options) {
            if (!content.trim()) return '';
            // Trim content to avoid ** text** issues
            return options.strongDelimiter + content.trim() + options.strongDelimiter;
        }
    });

    // Override emphasis rule to fix spacing issues
    turndownService.addRule('emphasisFixed', {
        filter: ['em', 'i'],
        replacement: function (content, node, options) {
            if (!content.trim()) return '';
            // Trim content to avoid * text* issues
            return options.emDelimiter + content.trim() + options.emDelimiter;
        }
    });

    // Custom rule for underline (convert to emphasis in Markdown)
    turndownService.addRule('underline', {
        filter: ['u', 'ins'],
        replacement: function (content) {
            return '_' + content.trim() + '_';
        }
    });

    // Custom rule for strikethrough
    turndownService.addRule('strikethrough', {
        filter: ['del', 's', 'strike'],
        replacement: function (content) {
            return '~~' + content.trim() + '~~';
        }
    });

    // Remove empty elements
    turndownService.addRule('removeEmpty', {
        filter: function (node) {
            return (
                node.nodeName !== 'BR' &&
                node.nodeName !== 'IMG' &&
                node.nodeName !== 'HR' &&
                !node.textContent.trim() &&
                !node.querySelector('img, br, hr')
            );
        },
        replacement: function () {
            return '';
        }
    });

    return turndownService;
}

/**
 * Convert HTML to Markdown
 * @param {string} html - HTML string to convert
 * @returns {string} Markdown string
 */
export function htmlToMarkdown(html) {
    if (!html || typeof html !== 'string') {
        return '';
    }

    const turndownService = createTurndownService();

    // Clean up the HTML before conversion
    let cleanedHtml = html
        // Remove most common Word/Google Docs artifacts
        .replace(/<o:p[^>]*>.*?<\/o:p>/gi, '')
        .replace(/<!--\[if[^\]]*\]>.*?<!\[endif\]-->/gi, '')
        .replace(/<!--.*?-->/g, '')
        .replace(/<\/?xml[^>]*>/gi, '')
        .replace(/<\/?o:[^>]*>/gi, '')
        .replace(/<\/?v:[^>]*>/gi, '')
        .replace(/<\/?w:[^>]*>/gi, '')
        // Clean up excessive whitespace in tags
        .replace(/\s+>/g, '>')
        .replace(/<\s+/g, '<');

    try {
        const markdown = turndownService.turndown(cleanedHtml);

        // Post-process: clean up excessive newlines
        return markdown
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    } catch (error) {
        console.error('Error converting HTML to Markdown:', error);
        return html; // Return original if conversion fails
    }
}

/**
 * Check if clipboard contains HTML content
 * @param {ClipboardEvent} event - Paste event
 * @returns {boolean}
 */
export function hasHtmlContent(event) {
    const clipboardData = event.clipboardData || window.clipboardData;

    if (!clipboardData) {
        return false;
    }

    const types = clipboardData.types || [];
    return types.includes('text/html');
}

/**
 * Get plain text content from clipboard
 * @param {ClipboardEvent} event - Paste event
 * @returns {string|null}
 */
export function getPlainTextFromClipboard(event) {
    const clipboardData = event.clipboardData || window.clipboardData;

    if (!clipboardData) {
        return null;
    }

    return clipboardData.getData('text/plain') || null;
}

/**
 * Check if content appears to be from Gemini (has citation markers)
 * @param {string} text - Text to check
 * @returns {boolean}
 */
function isGeminiContent(text) {
    if (!text) return false;
    // Gemini content has [cite_start] and [cite: N] markers
    return text.includes('[cite_start]') || /\[cite:\s*\d+/.test(text);
}

/**
 * Get HTML content from clipboard
 * @param {ClipboardEvent} event - Paste event
 * @returns {string|null}
 */
export function getHtmlFromClipboard(event) {
    const clipboardData = event.clipboardData || window.clipboardData;

    if (!clipboardData) {
        return null;
    }

    // First, check plain text for Gemini content
    // Gemini's copy button puts [cite_start]...[cite: N] in plain text
    // and we should preserve this format like Discourse does
    const plainText = clipboardData.getData('text/plain');
    if (plainText && isGeminiContent(plainText)) {
        // Return null to let the default paste behavior use plain text
        // This preserves citation markers exactly like Discourse
        return null;
    }

    const html = clipboardData.getData('text/html');

    // Only return HTML if it appears to have actual formatting
    if (html && containsFormatting(html)) {
        return html;
    }

    return null;
}

/**
 * Check if HTML contains meaningful formatting
 * (not just plain text wrapped in HTML)
 * @param {string} html
 * @returns {boolean}
 */
function containsFormatting(html) {
    // Check for common formatting tags
    const formattingPatterns = [
        /<(strong|b|em|i|u|s|del|strike|h[1-6]|li|ol|ul|table|th|td|blockquote|pre|code|a\s)[^>]*>/i,
        /style\s*=\s*["'][^"']*font-weight\s*:\s*(bold|700)/i,
        /style\s*=\s*["'][^"']*font-style\s*:\s*italic/i,
        /style\s*=\s*["'][^"']*text-decoration/i,
    ];

    return formattingPatterns.some(pattern => pattern.test(html));
}

export default {
    htmlToMarkdown,
    hasHtmlContent,
    getHtmlFromClipboard,
    getPlainTextFromClipboard,
};
