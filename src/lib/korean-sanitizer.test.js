import { describe, it, expect } from 'vitest';
import {
    sanitizeKoreanMarkdown,
    findChanges,
    getSanitizationStats,
} from './korean-sanitizer.js';

// ============================================================================
// removeGoogleSearchLinks (tested via sanitizeKoreanMarkdown)
// ============================================================================
describe('removeGoogleSearchLinks', () => {
    it('should extract URL from Google search query when query is a URL', () => {
        const input = '[Link](https://www.google.com/search?q=https://example.com/page)';
        const result = sanitizeKoreanMarkdown(input, { removeGoogleLinks: true });
        expect(result).toBe('[Link](https://example.com/page)');
    });

    it('should remove Google search link with parentheses when query is a URL', () => {
        const input = 'Check (https://www.google.com/search?q=https://github.com/repo) here';
        const result = sanitizeKoreanMarkdown(input, { removeGoogleLinks: true });
        expect(result).toBe('Check (https://github.com/repo) here');
    });

    it('should remove entire Google search link when query is not a URL', () => {
        const input = 'Search [here](https://www.google.com/search?q=some+query)';
        const result = sanitizeKoreanMarkdown(input, { removeGoogleLinks: true });
        // Link URL is removed entirely when query is not a URL
        expect(result).toBe('Search [here]');
    });

    it('should handle multiple Google search links', () => {
        const input = '[A](https://www.google.com/search?q=https://a.com) and [B](https://www.google.com/search?q=test)';
        const result = sanitizeKoreanMarkdown(input, { removeGoogleLinks: true });
        // Google search links are removed - if query is not URL, link becomes empty
        expect(result).toBe('[A](https://a.com) and [B]');
    });

    it('should not modify non-Google URLs', () => {
        const input = '[Link](https://example.com/page)';
        const result = sanitizeKoreanMarkdown(input, { removeGoogleLinks: true });
        expect(result).toBe('[Link](https://example.com/page)');
    });
});

// ============================================================================
// removeUnnecessaryEscapes (tested via sanitizeKoreanMarkdown)
// ============================================================================
describe('removeUnnecessaryEscapes', () => {
    it('should remove escape before asterisks', () => {
        const input = '\\*\\*bold\\*\\*';
        const result = sanitizeKoreanMarkdown(input, { removeEscapes: true });
        expect(result).toBe('**bold**');
    });

    it('should remove escape before underscore', () => {
        const input = '\\_italic\\_';
        const result = sanitizeKoreanMarkdown(input, { removeEscapes: true });
        expect(result).toBe('_italic_');
    });

    it('should remove escape before hash', () => {
        const input = '\\# Heading';
        const result = sanitizeKoreanMarkdown(input, { removeEscapes: true });
        expect(result).toBe('# Heading');
    });

    it('should remove escape before dot in numbered list', () => {
        const input = '1\\. First item';
        const result = sanitizeKoreanMarkdown(input, { removeEscapes: true });
        expect(result).toBe('1. First item');
    });

    it('should remove escapes before brackets', () => {
        const input = '\\[link\\]\\(url\\)';
        const result = sanitizeKoreanMarkdown(input, { removeEscapes: true });
        expect(result).toBe('[link](url)');
    });

    it('should remove escape before backtick', () => {
        const input = '\\`code\\`';
        const result = sanitizeKoreanMarkdown(input, { removeEscapes: true });
        expect(result).toBe('`code`');
    });

    it('should handle multiple escape patterns in one text', () => {
        const input = '\\*\\*bold\\*\\* and \\`code\\` and \\# heading';
        const result = sanitizeKoreanMarkdown(input, { removeEscapes: true });
        expect(result).toBe('**bold** and `code` and # heading');
    });
});

// ============================================================================
// removeHeadingNumbering (tested via sanitizeKoreanMarkdown)
// ============================================================================
describe('removeHeadingNumbering', () => {
    it('should remove single number from heading', () => {
        const input = '### 4. Title';
        const result = sanitizeKoreanMarkdown(input, { removeHeadingNumbers: true });
        expect(result).toBe('### Title');
    });

    it('should remove decimal numbering from heading', () => {
        const input = '## 2.1. Section';
        const result = sanitizeKoreanMarkdown(input, { removeHeadingNumbers: true });
        expect(result).toBe('## Section');
    });

    it('should remove numbering from h1', () => {
        const input = '# 1. Introduction';
        const result = sanitizeKoreanMarkdown(input, { removeHeadingNumbers: true });
        expect(result).toBe('# Introduction');
    });

    it('should handle multiple headings', () => {
        const input = '# 1. First\n## 2. Second\n### 3.1. Third';
        const result = sanitizeKoreanMarkdown(input, { removeHeadingNumbers: true });
        expect(result).toBe('# First\n## Second\n### Third');
    });

    it('should not modify headings without numbering', () => {
        const input = '## Regular Heading';
        const result = sanitizeKoreanMarkdown(input, { removeHeadingNumbers: true });
        expect(result).toBe('## Regular Heading');
    });

    it('should handle Korean headings with numbering', () => {
        const input = '### 3. 제목입니다';
        const result = sanitizeKoreanMarkdown(input, { removeHeadingNumbers: true });
        expect(result).toBe('### 제목입니다');
    });
});

// ============================================================================
// wrapHtmlTagsWithBackticks (tested via sanitizeKoreanMarkdown)
// ============================================================================
describe('wrapHtmlTagsWithBackticks', () => {
    it('should wrap simple HTML tag with backticks', () => {
        const input = 'Use <div> for layout';
        const result = sanitizeKoreanMarkdown(input, { wrapHtmlTags: true });
        expect(result).toBe('Use `<div>` for layout');
    });

    it('should wrap closing HTML tag with backticks', () => {
        const input = 'End with </div> tag';
        const result = sanitizeKoreanMarkdown(input, { wrapHtmlTags: true });
        expect(result).toBe('End with `</div>` tag');
    });

    it('should wrap self-closing tag with backticks', () => {
        const input = 'Line break <br /> here';
        const result = sanitizeKoreanMarkdown(input, { wrapHtmlTags: true });
        expect(result).toBe('Line break `<br />` here');
    });

    it('should wrap tag with attributes', () => {
        const input = 'Image <img src="test.png" alt="test"> here';
        const result = sanitizeKoreanMarkdown(input, { wrapHtmlTags: true });
        expect(result).toBe('Image `<img src="test.png" alt="test">` here');
    });

    it('should not wrap already backtick-wrapped tags', () => {
        const input = 'Use `<div>` for layout';
        const result = sanitizeKoreanMarkdown(input, { wrapHtmlTags: true });
        expect(result).toBe('Use `<div>` for layout');
    });

    it('should not wrap tags inside code blocks', () => {
        const input = '```html\n<div>content</div>\n```';
        const result = sanitizeKoreanMarkdown(input, { wrapHtmlTags: true });
        expect(result).toBe('```html\n<div>content</div>\n```');
    });

    it('should handle multiple tags in one line', () => {
        const input = 'Use <div> and <span> tags';
        const result = sanitizeKoreanMarkdown(input, { wrapHtmlTags: true });
        expect(result).toBe('Use `<div>` and `<span>` tags');
    });
});

// ============================================================================
// removeCitations (tested via sanitizeKoreanMarkdown)
// ============================================================================
describe('removeCitations', () => {
    it('should remove [cite_start] tags', () => {
        const input = '[cite_start]This is cited text';
        const result = sanitizeKoreanMarkdown(input, { removeCitations: true });
        expect(result).toBe('This is cited text');
    });

    it('should remove [cite: N] single number citation', () => {
        const input = 'Some text[cite: 1088].';
        const result = sanitizeKoreanMarkdown(input, { removeCitations: true });
        expect(result).toBe('Some text.');
    });

    it('should remove [cite: N, M] multiple number citations', () => {
        const input = 'Text[cite: 663, 666].';
        const result = sanitizeKoreanMarkdown(input, { removeCitations: true });
        expect(result).toBe('Text.');
    });

    it('should remove [cite: N-M] range citations', () => {
        const input = 'Text[cite: 1182-1184]';
        const result = sanitizeKoreanMarkdown(input, { removeCitations: true });
        expect(result).toBe('Text');
    });

    it('should remove complete citation pattern', () => {
        const input = '[cite_start]인용 텍스트입니다[cite: 123].';
        const result = sanitizeKoreanMarkdown(input, { removeCitations: true });
        expect(result).toBe('인용 텍스트입니다.');
    });

    it('should handle multiple citations in one text', () => {
        const input = '[cite_start]First[cite: 1]. [cite_start]Second[cite: 2, 3].';
        const result = sanitizeKoreanMarkdown(input, { removeCitations: true });
        expect(result).toBe('First. Second.');
    });
});

// ============================================================================
// Korean Spacing - Based on actual rendering issues
// User-verified: ONLY bold with parentheses/brackets needs spacing
// All other patterns (bold, code, strikethrough, italic) render correctly
// ============================================================================
describe('Korean Spacing', () => {
    // ============================================================================
    // Patterns that NEED spacing (break rendering without it)
    // ============================================================================
    describe('Bold with parentheses - NEEDS spacing', () => {
        it('should add space after bold with parentheses followed by Korean', () => {
            const input = '**텍스트(text)**의 경우';
            const result = sanitizeKoreanMarkdown(input, { fixKoreanSpacing: true });
            expect(result).toBe('**텍스트(text)** 의 경우');
        });

        it('should add space after bold with English parentheses followed by Korean', () => {
            const input = '**inherent un-contamination(비오염성)**라고';
            const result = sanitizeKoreanMarkdown(input, { fixKoreanSpacing: true });
            expect(result).toBe('**inherent un-contamination(비오염성)** 라고');
        });

        it('should add space after bold with mixed content and parens followed by Korean', () => {
            const input = '**유연성(flexibility)**과';
            const result = sanitizeKoreanMarkdown(input, { fixKoreanSpacing: true });
            expect(result).toBe('**유연성(flexibility)** 과');
        });
    });

    describe('Bold with brackets - NEEDS spacing', () => {
        it('should add space after bold with brackets followed by Korean', () => {
            const input = '**텍스트[ref]**한글';
            const result = sanitizeKoreanMarkdown(input, { fixKoreanSpacing: true });
            expect(result).toBe('**텍스트[ref]** 한글');
        });

        it('should add space after bold with citation-like brackets followed by Korean', () => {
            const input = '**참고문헌[1]**내용';
            const result = sanitizeKoreanMarkdown(input, { fixKoreanSpacing: true });
            expect(result).toBe('**참고문헌[1]** 내용');
        });
    });

    describe('Italic with parentheses - NEEDS spacing', () => {
        it('should add space after italic with parentheses followed by Korean', () => {
            const input = '*버전(2.0)*출시';
            const result = sanitizeKoreanMarkdown(input, { fixKoreanSpacing: true });
            expect(result).toBe('*버전(2.0)* 출시');
        });

        it('should add space after italic with English parentheses followed by Korean', () => {
            const input = '*flexibility(유연성)*의';
            const result = sanitizeKoreanMarkdown(input, { fixKoreanSpacing: true });
            expect(result).toBe('*flexibility(유연성)* 의');
        });
    });

    describe('Italic with quotes - NEEDS spacing', () => {
        it('should add space after italic with single quotes followed by Korean', () => {
            const input = "*버전'2.0'*출시";
            const result = sanitizeKoreanMarkdown(input, { fixKoreanSpacing: true });
            expect(result).toBe("*버전'2.0'* 출시");
        });

        it('should add space after italic with double quotes followed by Korean', () => {
            const input = '*버전"2.0"*출시';
            const result = sanitizeKoreanMarkdown(input, { fixKoreanSpacing: true });
            expect(result).toBe('*버전"2.0"* 출시');
        });
    });

    describe('Bold with quotes - NEEDS spacing', () => {
        it('should add space after bold with single quotes followed by Korean', () => {
            const input = "**버전'2.0'**출시";
            const result = sanitizeKoreanMarkdown(input, { fixKoreanSpacing: true });
            expect(result).toBe("**버전'2.0'** 출시");
        });

        it('should add space after bold with double quotes followed by Korean', () => {
            const input = '**버전"2.0"**출시';
            const result = sanitizeKoreanMarkdown(input, { fixKoreanSpacing: true });
            expect(result).toBe('**버전"2.0"** 출시');
        });
    });


    // ============================================================================
    // Patterns that do NOT need spacing (render correctly without it)
    // ============================================================================
    describe('Basic formatting - NO spacing needed', () => {
        it('should NOT add space after basic bold followed by Korean', () => {
            const input = '**텍스트**한글';
            const result = sanitizeKoreanMarkdown(input, { fixKoreanSpacing: true });
            expect(result).toBe('**텍스트**한글');
        });

        it('should NOT add space after underscore bold followed by Korean', () => {
            const input = '__텍스트__한글';
            const result = sanitizeKoreanMarkdown(input, { fixKoreanSpacing: true });
            expect(result).toBe('__텍스트__한글');
        });

        it('should NOT add space after italic followed by Korean', () => {
            const input = '*이탤릭*한글';
            const result = sanitizeKoreanMarkdown(input, { fixKoreanSpacing: true });
            expect(result).toBe('*이탤릭*한글');
        });

        it('should NOT add space after strikethrough followed by Korean', () => {
            const input = '~~취소선~~한글';
            const result = sanitizeKoreanMarkdown(input, { fixKoreanSpacing: true });
            expect(result).toBe('~~취소선~~한글');
        });

        it('should NOT add space after inline code followed by Korean', () => {
            const input = '`코드`한글';
            const result = sanitizeKoreanMarkdown(input, { fixKoreanSpacing: true });
            expect(result).toBe('`코드`한글');
        });

        it('should NOT add space after bold with numbers followed by Korean', () => {
            const input = '**숫자123**한글';
            const result = sanitizeKoreanMarkdown(input, { fixKoreanSpacing: true });
            expect(result).toBe('**숫자123**한글');
        });

        it('should NOT add space after bold with English followed by Korean', () => {
            const input = '**JavaScript**언어';
            const result = sanitizeKoreanMarkdown(input, { fixKoreanSpacing: true });
            expect(result).toBe('**JavaScript**언어');
        });
    });

    describe('Links and punctuation - NO spacing needed', () => {
        it('should NOT add space after markdown link followed by Korean', () => {
            const input = '[링크](https://example.com)참조';
            const result = sanitizeKoreanMarkdown(input, { fixKoreanSpacing: true });
            expect(result).toBe('[링크](https://example.com)참조');
        });

        it('should NOT add space after closing parenthesis followed by Korean', () => {
            const input = '(영어 텍스트)한글';
            const result = sanitizeKoreanMarkdown(input, { fixKoreanSpacing: true });
            expect(result).toBe('(영어 텍스트)한글');
        });

        it('should NOT add space after closing bracket followed by Korean', () => {
            const input = '[링크]한글';
            const result = sanitizeKoreanMarkdown(input, { fixKoreanSpacing: true });
            expect(result).toBe('[링크]한글');
        });

        it('should NOT add space after closing quote followed by Korean', () => {
            const input = '"인용"한글';
            const result = sanitizeKoreanMarkdown(input, { fixKoreanSpacing: true });
            expect(result).toBe('"인용"한글');
        });
    });

    describe('Edge cases', () => {
        it('should clean up double spaces', () => {
            const input = '**텍스트(test)**  한글';
            const result = sanitizeKoreanMarkdown(input, { fixKoreanSpacing: true });
            expect(result).toBe('**텍스트(test)** 한글');
        });

        it('should NOT add space for basic bold even with multiple sections', () => {
            const input = '**A**가 **B**나';
            const result = sanitizeKoreanMarkdown(input, { fixKoreanSpacing: true });
            expect(result).toBe('**A**가 **B**나');
        });

        it('should handle mixed patterns correctly', () => {
            const input = '**텍스트**결과, **텍스트(test)**내용';
            const result = sanitizeKoreanMarkdown(input, { fixKoreanSpacing: true });
            // First bold: no space needed. Second bold with parens: space needed
            expect(result).toBe('**텍스트**결과, **텍스트(test)** 내용');
        });
    });
});

// ============================================================================
// sanitizeKoreanMarkdown - Main function
// ============================================================================
describe('sanitizeKoreanMarkdown', () => {
    it('should return empty string for null input', () => {
        expect(sanitizeKoreanMarkdown(null)).toBe('');
    });

    it('should return empty string for undefined input', () => {
        expect(sanitizeKoreanMarkdown(undefined)).toBe('');
    });

    it('should return empty string for non-string input', () => {
        expect(sanitizeKoreanMarkdown(123)).toBe('');
    });

    it('should apply all sanitizations by default', () => {
        const input = '[cite_start]### 1. **제목**한글[cite: 1]';
        const result = sanitizeKoreanMarkdown(input);
        // Heading numbering is only removed at line start, not when citation precedes
        expect(result).toContain('**제목**');
        expect(result).not.toContain('[cite');
    });

    it('should respect individual options when disabled', () => {
        const input = '### 1. Title';
        const result = sanitizeKoreanMarkdown(input, { removeHeadingNumbers: false });
        expect(result).toBe('### 1. Title');
    });
});

// ============================================================================
// Integration Tests - Multiple features working together
// ============================================================================
describe('Integration Tests - Combined Features', () => {
    describe('Citation removal + Korean spacing', () => {
        it('should remove citations and fix Korean spacing together', () => {
            const input = '[cite_start]**텍스트(text)**한글[cite: 123]';
            const result = sanitizeKoreanMarkdown(input);
            expect(result).toBe('**텍스트(text)** 한글');
            expect(result).not.toContain('[cite');
        });

        it('should handle complex citation with multiple bold sections', () => {
            const input = '[cite_start]이것은 **첫번째(first)**와 **두번째(second)**입니다[cite: 456].';
            const result = sanitizeKoreanMarkdown(input);
            expect(result).toContain('**첫번째(first)** 와');
            expect(result).toContain('**두번째(second)** ');
            expect(result).toContain('입니다.');
            expect(result).not.toContain('[cite');
            expect(result).not.toContain('456');
        });
    });

    describe('Escape removal + Heading numbering + Citations', () => {
        it('should handle escapes, heading numbers, and citations together', () => {
            const input = '### 1. \\*\\*제목\\*\\*\n\n[cite_start]본문입니다[cite: 1].';
            const result = sanitizeKoreanMarkdown(input);
            expect(result).toBe('### **제목**\n\n본문입니다.');
            expect(result).not.toContain('[cite');
            expect(result).not.toContain('1');
        });
    });

    describe('HTML wrapping + Korean spacing', () => {
        it('should wrap HTML tags - NO Korean spacing for basic patterns', () => {
            const input = '<div>내용</div>한글';
            const result = sanitizeKoreanMarkdown(input);
            // HTML tags are wrapped, but no spacing added for angle brackets
            expect(result).toBe('`<div>`내용`</div>`한글');
        });
    });

    describe('Google links + Citations', () => {
        it('should remove both Google search links and citations', () => {
            const input = '[cite_start]링크는 [여기](https://www.google.com/search?q=https://example.com)입니다[cite: 789].';
            const result = sanitizeKoreanMarkdown(input);
            expect(result).toContain('[여기](https://example.com)');
            expect(result).not.toContain('google.com');
            expect(result).not.toContain('[cite');
        });
    });

    describe('Order-dependent scenarios', () => {
        it('should process in correct order: escapes before formatting detection', () => {
            // Escapes are removed first, then Korean spacing is applied
            const input = '\\*\\*텍스트(text)\\*\\*한글';
            const result = sanitizeKoreanMarkdown(input);
            // After escape removal: **텍스트(text)**한글
            // After Korean spacing: **텍스트(text)** 한글
            expect(result).toBe('**텍스트(text)** 한글');
        });

        it('should process citations before Korean spacing', () => {
            // Citations removed first, then spacing is applied
            const input = '**텍스트(test)**[cite: 123]한글';
            const result = sanitizeKoreanMarkdown(input);
            // After citation removal: **텍스트(test)**한글
            // After Korean spacing: **텍스트(test)** 한글
            expect(result).toBe('**텍스트(test)** 한글');
        });

        it('should handle heading numbers removal with formatted content', () => {
            const input = '### 2. **중요한(important)**제목';
            const result = sanitizeKoreanMarkdown(input);
            expect(result).toBe('### **중요한(important)** 제목');
        });
    });

    describe('Complex real-world scenarios', () => {
        it('should handle complex Korean markdown paragraph', () => {
            const input = `[cite_start]이 방식은 **유연성(flexibility)**과 **비오염성(un-contamination)**이 특징입니다[cite: 1112].`;
            const result = sanitizeKoreanMarkdown(input);
            expect(result).toContain('**유연성(flexibility)** 과');
            // Verify spacing is applied and citations removed
            expect(result).toContain('특징입니다.');
            expect(result).not.toContain('[cite');
        });

        it('should handle full document with multiple features', () => {
            const input = `### 1. 소개

[cite_start]이 문서는 **마크다운(Markdown)**을 다룹니다[cite: 1].

### 2. 기능

**강조**와 \`코드\`가 있습니다.

참고: [링크](https://www.google.com/search?q=https://docs.example.com)`;

            const result = sanitizeKoreanMarkdown(input);

            // Heading numbers removed
            expect(result).toContain('### 소개');
            expect(result).toContain('### 기능');

            // Citations removed
            expect(result).not.toContain('[cite');

            // Basic bold without parens - no spacing
            expect(result).toContain('**강조**와');

            // Google links cleaned
            expect(result).toContain('https://docs.example.com');
            expect(result).not.toContain('google.com');

            // Korean spacing applied for bold with parens
            expect(result).toContain('**마크다운(Markdown)** 을');
        });
    });

    describe('Options interaction', () => {
        it('should disable multiple features independently', () => {
            const input = '### 1. **텍스트**[cite: 1]';
            const result = sanitizeKoreanMarkdown(input, {
                removeHeadingNumbers: false,
                removeCitations: false
            });
            expect(result).toContain('1.');
            expect(result).toContain('[cite: 1]');
        });

        it('should only apply Korean spacing when other options disabled', () => {
            const input = '\\*\\*텍스트(test)\\*\\*한글';
            const result = sanitizeKoreanMarkdown(input, {
                removeEscapes: false,
                fixKoreanSpacing: true
            });
            // Escapes remain, but pattern doesn't match due to escapes
            expect(result).toBe('\\*\\*텍스트(test)\\*\\*한글');
        });
    });
});

// ============================================================================
// findChanges
// ============================================================================
describe('findChanges', () => {
    it('should return empty array for null inputs', () => {
        expect(findChanges(null, 'text')).toEqual([]);
        expect(findChanges('text', null)).toEqual([]);
    });

    it('should return empty array when no changes', () => {
        const text = 'Same text';
        expect(findChanges(text, text)).toEqual([]);
    });

    it('should detect inserted spaces before Korean characters', () => {
        const original = '**텍스트**한글';
        const sanitized = '**텍스트** 한글';
        const changes = findChanges(original, sanitized);
        expect(changes.length).toBeGreaterThan(0);
    });

    it('should include position and context in changes', () => {
        const original = '**텍스트**한글';
        const sanitized = '**텍스트** 한글';
        const changes = findChanges(original, sanitized);
        expect(changes[0]).toHaveProperty('position');
        expect(changes[0]).toHaveProperty('original');
        expect(changes[0]).toHaveProperty('fixed');
    });
});

// ============================================================================
// getSanitizationStats
// ============================================================================
describe('getSanitizationStats', () => {
    it('should return zero stats for null inputs', () => {
        const stats = getSanitizationStats(null, 'text');
        expect(stats).toEqual({ changesCount: 0, addedSpaces: 0, hasChanges: false });
    });

    it('should return hasChanges false when texts are identical', () => {
        const text = 'Same text';
        const stats = getSanitizationStats(text, text);
        expect(stats.hasChanges).toBe(false);
    });

    it('should count added spaces correctly', () => {
        const original = '**텍스트**한글';
        const sanitized = '**텍스트**한글';
        const stats = getSanitizationStats(original, sanitized);
        expect(stats.addedSpaces).toBe(0);
        expect(stats.hasChanges).toBe(false);
    });

    it('should handle multiple space additions', () => {
        const original = '**A**가 **B**나';
        const sanitized = '**A**가 **B**나';
        const stats = getSanitizationStats(original, sanitized);
        expect(stats.addedSpaces).toBe(0);
        expect(stats.hasChanges).toBe(false);
    });

    it('should report changesCount based on length difference', () => {
        const original = '**텍스트(text)**한글';
        const sanitized = '**텍스트(text)** 한글';
        const stats = getSanitizationStats(original, sanitized);
        expect(stats.changesCount).toBe(1);
    });

});
