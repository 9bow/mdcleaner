/**
 * Korean Markdown Sanitizer
 *
 * Fixes spacing issues in Markdown when Korean characters
 * follow immediately after formatting markers like **, *, __, _.
 *
 * Problem: `**텍스트**한글` doesn't render correctly
 * Solution: `**텍스트** 한글` (add space before Korean)
 *
 * Additional features:
 * - Remove Google search links (keep URL if query is URL)
 * - Remove unnecessary escapes (\*\* -> **, 1\. -> 1.)
 * - Remove heading numbering (### 4. Title -> ### Title)
 * - Wrap HTML tags with backticks
 * - Remove citations ([cite_start]...[cite: N])
 */

// Korean character range (Hangul syllables, Jamo, compatibility Jamo)
const KOREAN_PATTERN = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/;

// Pattern to detect if a character is Korean
function isKorean(char) {
    return KOREAN_PATTERN.test(char);
}

/**
 * Remove Google search links
 * If the query is a URL, keep only the URL
 * Otherwise, remove the entire link
 * @param {string} text
 * @returns {string}
 */
function removeGoogleSearchLinks(text) {
    // Pattern to match Google search URLs (both in parentheses and standalone)
    // Matches: (https://www.google.com/search?q=...) or https://www.google.com/search?q=...
    // Capture groups: 1=opening paren (optional), 2=URL, 3=closing paren (optional)
    const googleSearchPattern = /(\()?(https?:\/\/(?:www\.)?google\.com\/search\?[^)\s]*)(\))?/g;

    return text.replace(googleSearchPattern, (match, openParen, url, closeParen) => {
        try {
            const urlObj = new URL(url);
            const query = urlObj.searchParams.get('q');

            if (query) {
                // Check if the query itself is a URL
                if (query.match(/^https?:\/\//)) {
                    // Preserve parentheses if they were present in the original
                    if (openParen && closeParen) {
                        return `(${query})`;
                    }
                    return query;
                }
                // If query is not a URL, remove the entire link
                return '';
            }
            return '';
        } catch (e) {
            // If URL parsing fails, remove the match
            return '';
        }
    });
}

/**
 * Remove unnecessary escape characters in Markdown
 * Examples: \*\* -> **, \* -> *, 1\. -> 1., \# -> #
 * @param {string} text
 * @returns {string}
 */
function removeUnnecessaryEscapes(text) {
    // Remove escapes before markdown special characters
    // Common escape patterns: \*, \_, \`, \#, \., \!, \[, \], \(, \), \-, \+, \{, \}, \|, \\, \~
    const escapePatterns = [
        // Bold/Italic: \*\* -> **, \* -> *
        { pattern: /\\(\*)/g, replacement: '$1' },
        // Underscore: \_ -> _
        { pattern: /\\(_)/g, replacement: '$1' },
        // Backtick: \` -> `
        { pattern: /\\(`)/g, replacement: '$1' },
        // Hash (heading): \# -> #
        { pattern: /\\(#)/g, replacement: '$1' },
        // Dot (ordered list): 1\. -> 1.
        { pattern: /\\(\.)/g, replacement: '$1' },
        // Exclamation (image): \! -> !
        { pattern: /\\(!)/g, replacement: '$1' },
        // Brackets: \[ -> [, \] -> ]
        { pattern: /\\(\[)/g, replacement: '$1' },
        { pattern: /\\(\])/g, replacement: '$1' },
        // Parentheses: \( -> (, \) -> )
        { pattern: /\\(\()/g, replacement: '$1' },
        { pattern: /\\(\))/g, replacement: '$1' },
        // Dash: \- -> -
        { pattern: /\\(-)/g, replacement: '$1' },
        // Plus: \+ -> +
        { pattern: /\\(\+)/g, replacement: '$1' },
        // Curly braces: \{ -> {, \} -> }
        { pattern: /\\(\{)/g, replacement: '$1' },
        { pattern: /\\(\})/g, replacement: '$1' },
        // Pipe: \| -> |
        { pattern: /\\(\|)/g, replacement: '$1' },
        // Tilde: \~ -> ~
        { pattern: /\\(~)/g, replacement: '$1' },
        // Greater/Less than: \> -> >, \< -> <
        { pattern: /\\(>)/g, replacement: '$1' },
        { pattern: /\\(<)/g, replacement: '$1' },
    ];

    let result = text;
    for (const { pattern, replacement } of escapePatterns) {
        result = result.replace(pattern, replacement);
    }

    return result;
}

/**
 * Remove numbering from headings
 * Example: ### 4. Title -> ### Title
 * @param {string} text
 * @returns {string}
 */
function removeHeadingNumbering(text) {
    // Match headings with numbering pattern
    // Pattern: # (or ##, ###, etc.) followed by number and dot
    // Examples:
    //   ### 4. Title -> ### Title
    //   ## 2.1. Section -> ## Section
    //   # 1. Introduction -> # Introduction
    const headingPattern = /^(#{1,6})\s+[\d.]+\s+/gm;

    return text.replace(headingPattern, '$1 ');
}

/**
 * Wrap HTML tags with backticks if not already wrapped
 * Example: <div> -> `<div>`
 * @param {string} text
 * @returns {string}
 */
function wrapHtmlTagsWithBackticks(text) {
    // Match HTML-like tags that are not already wrapped with backticks
    // Negative lookbehind for backtick, match <tag> or </tag> or <tag />, negative lookahead for backtick
    // Also avoid matching already code-fenced content

    // Process line by line to avoid modifying code blocks
    const lines = text.split('\n');
    let inCodeBlock = false;

    const processedLines = lines.map(line => {
        // Check if entering or leaving a code block
        if (line.trim().startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            return line;
        }

        // Skip processing if inside code block
        if (inCodeBlock) {
            return line;
        }

        // Match HTML tags not wrapped with backticks
        // Pattern matches: <tagname>, </tagname>, <tagname />, <tagname attr="value">
        // But not if preceded or followed by backtick
        return line.replace(
            /(?<!`)(<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s+[^>]*)?\s*\/?>)(?!`)/g,
            '`$1`'
        );
    });

    return processedLines.join('\n');
}

/**
 * Remove citations from text
 * Pattern: [cite_start]...[cite: N] or [cite_start]...[cite: N, M, ...] or [cite: N-M]
 * Examples:
 *   [cite_start]Text[cite: 1088]. -> Text.
 *   [cite_start]Text[cite: 663, 666]. -> Text.
 *   [cite_start]Text[cite: 1182-1184] -> Text
 * @param {string} text
 * @returns {string}
 */
function removeCitations(text) {
    // Remove [cite_start] tags
    let result = text.replace(/\[cite_start\]/g, '');

    // Remove [cite: N] or [cite: N, M, ...] or [cite: N-M] patterns
    // This handles single numbers, comma-separated lists, and hyphen ranges
    result = result.replace(/\[cite:\s*[\d,\s\-]+\]/g, '');

    return result;
}

// Only patterns that ACTUALLY break markdown rendering when Korean follows
// Verified by user testing:
// - **텍스트**한글 - OK (no spacing needed)
// - **텍스트(test)**한글 - BROKEN (spacing needed)
// - *버전(2.0)*출시 - BROKEN (spacing needed)
// - *버전'2.0'*출시 - BROKEN (spacing needed)
// - `코드`한글 - OK (no spacing needed)
// - ~~취소선~~한글 - OK (no spacing needed)
// Bold/italic with parentheses/brackets/quotes followed by Korean breaks rendering
const KOREAN_SPACING_PATTERNS = [
    // Bold with parentheses ending: **text(내용)**한글
    {
        pattern: /(\*\*[^*]*\([^)]*\)\*\*)([\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F])/g,
        replacement: '$1 $2',
        name: 'bold-with-parens'
    },
    // Bold with brackets ending: **text[내용]**한글
    {
        pattern: /(\*\*[^*]*\[[^\]]*\]\*\*)([\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F])/g,
        replacement: '$1 $2',
        name: 'bold-with-brackets'
    },
    // Italic with parentheses ending: *text(내용)*한글
    {
        pattern: /(?<!\*)(\*[^*]*\([^)]*\)\*)(?!\*)([\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F])/g,
        replacement: '$1 $2',
        name: 'italic-with-parens'
    },
    // Italic with brackets ending: *text[내용]*한글
    {
        pattern: /(?<!\*)(\*[^*]*\[[^\]]*\]\*)(?!\*)([\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F])/g,
        replacement: '$1 $2',
        name: 'italic-with-brackets'
    },
    // Italic with quotes ending: *text'내용'*한글 or *text"내용"*한글
    {
        pattern: /(?<!\*)(\*[^*]*['"][^'"]*['"]\*)(?!\*)([\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F])/g,
        replacement: '$1 $2',
        name: 'italic-with-quotes'
    },
    // Bold with quotes ending: **text'내용'**한글 or **text"내용"**한글
    {
        pattern: /(\*\*[^*]*['"][^'"]*['"]\*\*)([\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F])/g,
        replacement: '$1 $2',
        name: 'bold-with-quotes'
    }
];

/**
 * Sanitize markdown text for Korean spacing issues and other cleanup
 * @param {string} markdown - Markdown text to sanitize
 * @param {Object} options - Options for selective sanitization
 * @returns {string} Sanitized markdown text
 */
export function sanitizeKoreanMarkdown(markdown, options = {}) {
    if (!markdown || typeof markdown !== 'string') {
        return '';
    }

    // Merge with default options
    const opts = {
        removeGoogleLinks: true,
        removeEscapes: true,
        removeHeadingNumbers: true,
        wrapHtmlTags: true,
        fixKoreanSpacing: true,
        removeCitations: true,
        ...options
    };

    let result = markdown;

    // Step 1: Remove Google search links (extract URL if query is URL)
    if (opts.removeGoogleLinks) {
        result = removeGoogleSearchLinks(result);
    }

    // Step 2: Remove unnecessary escape characters
    if (opts.removeEscapes) {
        result = removeUnnecessaryEscapes(result);
    }

    // Step 3: Remove numbering from headings
    if (opts.removeHeadingNumbers) {
        result = removeHeadingNumbering(result);
    }

    // Step 4: Wrap HTML tags with backticks
    if (opts.wrapHtmlTags) {
        result = wrapHtmlTagsWithBackticks(result);
    }

    // Step 5: Remove citations
    if (opts.removeCitations) {
        result = removeCitations(result);
    }

    // Step 6: Apply Korean spacing patterns (only for patterns that break rendering)
    if (opts.fixKoreanSpacing) {
        for (const { pattern, replacement } of KOREAN_SPACING_PATTERNS) {
            result = result.replace(pattern, replacement);
        }
    }

    // Step 8: Clean up any double spaces that might have been created
    result = result.replace(/  +/g, ' ');

    return result;
}

/**
 * Find all positions where Korean spacing fixes were applied
 * Useful for highlighting changes in the UI
 * @param {string} original - Original markdown
 * @param {string} sanitized - Sanitized markdown
 * @returns {Array<{position: number, original: string, fixed: string}>}
 */
export function findChanges(original, sanitized) {
    const changes = [];

    if (!original || !sanitized) {
        return changes;
    }

    let origIndex = 0;
    let sanIndex = 0;

    while (origIndex < original.length && sanIndex < sanitized.length) {
        if (original[origIndex] === sanitized[sanIndex]) {
            origIndex++;
            sanIndex++;
        } else if (sanitized[sanIndex] === ' ' && isKorean(sanitized[sanIndex + 1])) {
            // Found an inserted space before Korean character
            changes.push({
                position: sanIndex,
                original: original.substring(Math.max(0, origIndex - 5), origIndex + 5),
                fixed: sanitized.substring(Math.max(0, sanIndex - 5), sanIndex + 6)
            });
            sanIndex++; // Skip the inserted space
        } else {
            // Different characters, move both pointers
            origIndex++;
            sanIndex++;
        }
    }

    return changes;
}

/**
 * Get statistics about the sanitization
 * @param {string} original - Original markdown
 * @param {string} sanitized - Sanitized markdown
 * @returns {{changesCount: number, addedSpaces: number, hasChanges: boolean}}
 */
export function getSanitizationStats(original, sanitized) {
    if (!original || !sanitized) {
        return { changesCount: 0, addedSpaces: 0, hasChanges: false };
    }

    const origSpaces = (original.match(/ /g) || []).length;
    const sanSpaces = (sanitized.match(/ /g) || []).length;
    const addedSpaces = sanSpaces - origSpaces;

    // Check if any changes were made (text differs)
    const hasChanges = original !== sanitized;

    // Count the character length difference as a rough measure of changes
    const lengthDiff = Math.abs(sanitized.length - original.length);

    return {
        changesCount: lengthDiff > 0 ? lengthDiff : (hasChanges ? 1 : 0),
        addedSpaces: Math.max(0, addedSpaces),
        hasChanges: hasChanges
    };
}

export default {
    sanitizeKoreanMarkdown,
    findChanges,
    getSanitizationStats,
};
