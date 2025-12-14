/**
 * Settings Module
 * Manages application settings with localStorage persistence
 */

const STORAGE_KEY = 'mdsanitizer_settings';

// Default settings
const defaultSettings = {
    theme: 'dark',
    autoSanitize: true,
    options: {
        removeGoogleLinks: true,
        removeEscapes: true,
        removeHeadingNumbers: true,
        wrapHtmlTags: true,
        fixKoreanSpacing: true,
        removeCitations: true
    },
    preview: {
        enabled: true,
        refreshMode: 'instant', // 'instant' | 'manual'
        position: 'auto'        // 'auto' | 'bottom' | 'right'
    }
};

/**
 * Load settings from localStorage
 * @returns {Object} Settings object
 */
export function loadSettings() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Merge with defaults to ensure all keys exist
            return {
                ...defaultSettings,
                ...parsed,
                options: {
                    ...defaultSettings.options,
                    ...parsed.options
                },
                preview: {
                    ...defaultSettings.preview,
                    ...parsed.preview
                }
            };
        }
    } catch (e) {
        console.warn('Failed to load settings:', e);
    }
    return { ...defaultSettings };
}

/**
 * Save settings to localStorage
 * @param {Object} settings - Settings object to save
 */
export function saveSettings(settings) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
        console.warn('Failed to save settings:', e);
    }
}

/**
 * Get default settings
 * @returns {Object} Default settings object
 */
export function getDefaultSettings() {
    return { ...defaultSettings };
}

/**
 * Apply theme to document
 * @param {string} theme - 'light' or 'dark'
 */
export function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

export default {
    loadSettings,
    saveSettings,
    getDefaultSettings,
    applyTheme
};
