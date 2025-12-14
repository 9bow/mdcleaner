/**
 * Editor Module
 * Handles the markdown editor functionality including
 * paste handling and sanitization
 */

import { htmlToMarkdown, hasHtmlContent, getHtmlFromClipboard } from './lib/richtext-converter.js';
import { sanitizeKoreanMarkdown, getSanitizationStats } from './lib/korean-sanitizer.js';
import { loadSettings, saveSettings, applyTheme } from './lib/settings.js';

// DOM Elements
const editor = document.getElementById('editor');
const sanitizeBtn = document.getElementById('sanitize-btn');
const clearBtn = document.getElementById('clear-btn');
const charCount = document.getElementById('char-count');
const pasteIndicator = document.getElementById('paste-indicator');

// Settings DOM Elements
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const themeLightBtn = document.getElementById('theme-light');
const themeDarkBtn = document.getElementById('theme-dark');

// Settings Option Elements
const optAutoSanitize = document.getElementById('opt-auto-sanitize');
const optRemoveGoogleLinks = document.getElementById('opt-remove-google-links');
const optRemoveEscapes = document.getElementById('opt-remove-escapes');
const optRemoveHeadingNumbers = document.getElementById('opt-remove-heading-numbers');
const optWrapHtmlTags = document.getElementById('opt-wrap-html-tags');
const optFixKoreanSpacing = document.getElementById('opt-fix-korean-spacing');
const optRemoveCitations = document.getElementById('opt-remove-citations');

// Preview DOM Elements
const previewSection = document.getElementById('preview-section');
const previewContent = document.getElementById('preview-content');
const refreshPreviewBtn = document.getElementById('refresh-preview-btn');
const optPreviewEnabled = document.getElementById('opt-preview-enabled');
const previewRefreshModeControl = document.getElementById('preview-refresh-mode');
const previewPositionControl = document.getElementById('preview-position');

// State
let lastPasteWasRichText = false;
let settings = loadSettings();
let previewDebounceTimer = null;

/**
 * Initialize the editor
 */
function init() {
    if (!editor) {
        console.error('Editor element not found');
        return;
    }

    // Apply saved settings
    applySettings();

    // Event listeners - Editor
    editor.addEventListener('paste', handlePaste);
    editor.addEventListener('input', handleInput);
    sanitizeBtn.addEventListener('click', handleSanitize);
    clearBtn.addEventListener('click', handleClear);

    // Event listeners - Settings
    settingsBtn.addEventListener('click', toggleSettingsPanel);
    document.addEventListener('click', handleOutsideClick);

    // Theme buttons
    themeLightBtn.addEventListener('click', () => setTheme('light'));
    themeDarkBtn.addEventListener('click', () => setTheme('dark'));

    // Settings options
    optAutoSanitize.addEventListener('change', handleOptionChange);
    optRemoveGoogleLinks.addEventListener('change', handleOptionChange);
    optRemoveEscapes.addEventListener('change', handleOptionChange);
    optRemoveHeadingNumbers.addEventListener('change', handleOptionChange);
    optWrapHtmlTags.addEventListener('change', handleOptionChange);
    optFixKoreanSpacing.addEventListener('change', handleOptionChange);
    optRemoveCitations.addEventListener('change', handleOptionChange);

    // Preview event listeners
    optPreviewEnabled.addEventListener('change', handlePreviewEnabledChange);
    refreshPreviewBtn.addEventListener('click', updatePreview);
    setupSegmentControl(previewRefreshModeControl, (value) => {
        settings.preview.refreshMode = value;
        applyPreviewRefreshMode();
        saveSettings(settings);
    });
    setupSegmentControl(previewPositionControl, (value) => {
        settings.preview.position = value;
        applyPreviewPosition();
        saveSettings(settings);
    });

    // Initial state
    updateCharCount();
    updatePreview();
}

/**
 * Apply settings to UI
 */
function applySettings() {
    // Apply theme
    applyTheme(settings.theme);
    updateThemeButtons(settings.theme);

    // Apply options to checkboxes
    optAutoSanitize.checked = settings.autoSanitize;
    optRemoveGoogleLinks.checked = settings.options.removeGoogleLinks;
    optRemoveEscapes.checked = settings.options.removeEscapes;
    optRemoveHeadingNumbers.checked = settings.options.removeHeadingNumbers;
    optWrapHtmlTags.checked = settings.options.wrapHtmlTags;
    optFixKoreanSpacing.checked = settings.options.fixKoreanSpacing;
    optRemoveCitations.checked = settings.options.removeCitations;

    // Apply preview settings
    optPreviewEnabled.checked = settings.preview.enabled;
    applyPreviewEnabled();
    applyPreviewRefreshMode();
    applyPreviewPosition();
    updateSegmentControl(previewRefreshModeControl, settings.preview.refreshMode);
    updateSegmentControl(previewPositionControl, settings.preview.position);
}

/**
 * Update theme button states
 * @param {string} theme
 */
function updateThemeButtons(theme) {
    themeLightBtn.classList.toggle('active', theme === 'light');
    themeDarkBtn.classList.toggle('active', theme === 'dark');
}

/**
 * Set theme
 * @param {string} theme
 */
function setTheme(theme) {
    settings.theme = theme;
    applyTheme(theme);
    updateThemeButtons(theme);
    saveSettings(settings);
}

/**
 * Toggle settings panel visibility
 */
function toggleSettingsPanel() {
    settingsPanel.classList.toggle('active');
}

/**
 * Handle click outside settings panel
 * @param {MouseEvent} event
 */
function handleOutsideClick(event) {
    if (!settingsPanel.contains(event.target) && !settingsBtn.contains(event.target)) {
        settingsPanel.classList.remove('active');
    }
}

/**
 * Handle option checkbox change
 */
function handleOptionChange() {
    // Update settings from UI
    settings.autoSanitize = optAutoSanitize.checked;
    settings.options.removeGoogleLinks = optRemoveGoogleLinks.checked;
    settings.options.removeEscapes = optRemoveEscapes.checked;
    settings.options.removeHeadingNumbers = optRemoveHeadingNumbers.checked;
    settings.options.wrapHtmlTags = optWrapHtmlTags.checked;
    settings.options.fixKoreanSpacing = optFixKoreanSpacing.checked;
    settings.options.removeCitations = optRemoveCitations.checked;

    // Save to localStorage
    saveSettings(settings);
}

/**
 * Get current sanitize options from settings
 * @returns {Object}
 */
function getSanitizeOptions() {
    return {
        removeGoogleLinks: settings.options.removeGoogleLinks,
        removeEscapes: settings.options.removeEscapes,
        removeHeadingNumbers: settings.options.removeHeadingNumbers,
        wrapHtmlTags: settings.options.wrapHtmlTags,
        fixKoreanSpacing: settings.options.fixKoreanSpacing,
        removeCitations: settings.options.removeCitations
    };
}

/**
 * Handle paste event
 * @param {ClipboardEvent} event
 */
function handlePaste(event) {
    // Check for HTML content
    if (hasHtmlContent(event)) {
        const html = getHtmlFromClipboard(event);

        if (html) {
            // Prevent default paste behavior
            event.preventDefault();

            // Convert HTML to Markdown
            let markdown = htmlToMarkdown(html);

            // Apply sanitization based on settings
            if (settings.autoSanitize) {
                markdown = sanitizeKoreanMarkdown(markdown, getSanitizeOptions());
            }

            // Insert at cursor position
            insertTextAtCursor(markdown);

            // Show indicator
            showPasteIndicator();
            lastPasteWasRichText = true;

            // Update character count
            updateCharCount();

            return;
        }
    }

    // Handle plain text paste with auto-sanitize
    // This handles cases like Gemini content where getHtmlFromClipboard returns null
    // to preserve citation markers, but we still want to apply sanitization
    if (settings.autoSanitize) {
        const clipboardData = event.clipboardData || window.clipboardData;
        if (clipboardData) {
            const plainText = clipboardData.getData('text/plain');
            if (plainText) {
                // Prevent default paste behavior
                event.preventDefault();

                // Apply sanitization to plain text
                const sanitizedText = sanitizeKoreanMarkdown(plainText, getSanitizeOptions());

                // Insert at cursor position
                insertTextAtCursor(sanitizedText);

                // Update character count
                updateCharCount();

                // Update preview
                debouncedUpdatePreview();

                return;
            }
        }
    }

    // If no HTML or plain text, let default behavior handle it
    lastPasteWasRichText = false;

    // Update character count after paste completes
    setTimeout(updateCharCount, 0);
}

/**
 * Insert text at the current cursor position
 * @param {string} text
 */
function insertTextAtCursor(text) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const before = editor.value.substring(0, start);
    const after = editor.value.substring(end);

    editor.value = before + text + after;

    // Set cursor position after inserted text
    const newPosition = start + text.length;
    editor.selectionStart = newPosition;
    editor.selectionEnd = newPosition;

    // Trigger input event for any listeners
    editor.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Handle input event
 */
function handleInput() {
    updateCharCount();

    // Hide paste indicator on new input (unless it was just shown)
    if (!lastPasteWasRichText) {
        hidePasteIndicator();
    }
    lastPasteWasRichText = false;

    // Update preview in instant mode
    debouncedUpdatePreview();
}

/**
 * Handle sanitize button click
 */
function handleSanitize() {
    const originalText = editor.value;

    if (!originalText.trim()) {
        showNotification('텍스트를 입력해주세요', 'warning');
        return;
    }

    // Apply Korean markdown sanitization with current options
    const sanitizedText = sanitizeKoreanMarkdown(originalText, getSanitizeOptions());

    // Get stats
    const stats = getSanitizationStats(originalText, sanitizedText);

    if (stats.hasChanges) {
        // Update editor with sanitized text
        editor.value = sanitizedText;
        updateCharCount();

        // Show success feedback with appropriate message
        if (stats.addedSpaces > 0) {
            showNotification(`${stats.addedSpaces}개의 띄어쓰기 추가 및 정리 완료!`, 'success');
        } else {
            showNotification('마크다운 정리가 완료되었습니다!', 'success');
        }

        // Add visual feedback to button
        animateSanitizeButton();
    } else {
        showNotification('수정이 필요한 부분이 없습니다', 'info');
    }
}

/**
 * Handle clear button click
 */
function handleClear() {
    if (editor.value.trim()) {
        editor.value = '';
        updateCharCount();
        hidePasteIndicator();
        showNotification('초기화되었습니다', 'info');
    }
}

/**
 * Update character count display
 */
function updateCharCount() {
    const count = editor.value.length;
    charCount.textContent = `${count.toLocaleString()}자`;
}

/**
 * Show paste indicator
 */
function showPasteIndicator() {
    pasteIndicator.classList.remove('hidden');

    // Auto-hide after 3 seconds
    setTimeout(hidePasteIndicator, 3000);
}

/**
 * Hide paste indicator
 */
function hidePasteIndicator() {
    pasteIndicator.classList.add('hidden');
}

/**
 * Animate the sanitize button on success
 */
function animateSanitizeButton() {
    sanitizeBtn.style.transform = 'scale(1.05)';
    setTimeout(() => {
        sanitizeBtn.style.transform = '';
    }, 200);
}

/**
 * Show notification toast
 * @param {string} message
 * @param {'success' | 'warning' | 'info'} type
 */
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
    <span class="notification-icon">${getNotificationIcon(type)}</span>
    <span class="notification-message">${message}</span>
  `;

    // Add styles
    Object.assign(notification.style, {
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%) translateY(20px)',
        padding: '0.875rem 1.25rem',
        background: getNotificationBackground(type),
        color: 'white',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.95rem',
        fontWeight: '500',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
        zIndex: '1000',
        opacity: '0',
        transition: 'all 0.3s ease',
    });

    document.body.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(-50%) translateY(0)';
    });

    // Auto-remove after 2.5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => notification.remove(), 300);
    }, 2500);
}

/**
 * Get notification icon based on type
 * @param {'success' | 'warning' | 'info'} type
 */
function getNotificationIcon(type) {
    const icons = {
        success: '✅',
        warning: '⚠️',
        info: 'ℹ️',
    };
    return icons[type] || icons.info;
}

/**
 * Get notification background color based on type
 * @param {'success' | 'warning' | 'info'} type
 */
function getNotificationBackground(type) {
    const backgrounds = {
        success: 'linear-gradient(135deg, #10b981, #059669)',
        warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
        info: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    };
    return backgrounds[type] || backgrounds.info;
}

/* ===================================
   Preview Panel Functions
   =================================== */

/**
 * Update the preview panel with rendered markdown
 */
function updatePreview() {
    if (!settings.preview.enabled) {
        return;
    }

    const markdown = editor.value;

    if (!markdown.trim()) {
        previewContent.innerHTML = '<p class="preview-placeholder">Markdown을 입력하면 미리보기가 표시됩니다...</p>';
        return;
    }

    try {
        // Use marked.js to render markdown to HTML
        previewContent.innerHTML = marked.parse(markdown);
    } catch (e) {
        console.error('Failed to render preview:', e);
        previewContent.innerHTML = '<p class="preview-placeholder">미리보기를 렌더링할 수 없습니다.</p>';
    }
}

/**
 * Debounced preview update for instant mode
 */
function debouncedUpdatePreview() {
    if (settings.preview.refreshMode !== 'instant') {
        return;
    }

    if (previewDebounceTimer) {
        clearTimeout(previewDebounceTimer);
    }

    previewDebounceTimer = setTimeout(updatePreview, 150);
}

/**
 * Handle preview enabled toggle change
 */
function handlePreviewEnabledChange() {
    settings.preview.enabled = optPreviewEnabled.checked;
    applyPreviewEnabled();
    saveSettings(settings);

    if (settings.preview.enabled) {
        updatePreview();
    }
}

/**
 * Apply preview enabled state to UI
 */
function applyPreviewEnabled() {
    if (settings.preview.enabled) {
        previewSection.classList.remove('hidden');
    } else {
        previewSection.classList.add('hidden');
    }
}

/**
 * Apply preview refresh mode to UI
 */
function applyPreviewRefreshMode() {
    previewSection.setAttribute('data-refresh-mode', settings.preview.refreshMode);
}

/**
 * Apply preview position to body
 */
function applyPreviewPosition() {
    if (settings.preview.position === 'auto') {
        document.body.removeAttribute('data-preview-position');
    } else {
        document.body.setAttribute('data-preview-position', settings.preview.position);
    }
}

/**
 * Setup segment control click handlers
 * @param {HTMLElement} container - Segment control container
 * @param {Function} onChange - Callback with selected value
 */
function setupSegmentControl(container, onChange) {
    if (!container) return;

    container.querySelectorAll('.segment-option').forEach(option => {
        option.addEventListener('click', () => {
            // Update active state
            container.querySelectorAll('.segment-option').forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');

            // Call callback with value
            onChange(option.dataset.value);
        });
    });
}

/**
 * Update segment control to reflect current value
 * @param {HTMLElement} container - Segment control container
 * @param {string} value - Value to select
 */
function updateSegmentControl(container, value) {
    if (!container) return;

    container.querySelectorAll('.segment-option').forEach(option => {
        option.classList.toggle('active', option.dataset.value === value);
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

