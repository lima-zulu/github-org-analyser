import defaultConfig from '../config.json';

const STORAGE_KEY = 'github-org-analyser-settings';

/**
 * Deep merge two objects, with source taking precedence
 */
function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Get user settings from localStorage
 */
export function getUserSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Failed to parse user settings from localStorage:', error);
    return {};
  }
}

/**
 * Save user settings to localStorage
 */
export function saveUserSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

/**
 * Get merged config (defaults + user overrides)
 */
export function getConfig() {
  const userSettings = getUserSettings();
  return deepMerge(defaultConfig, userSettings);
}

/**
 * Update a specific config value
 * @param {string} path - Dot-notation path like "thresholds.staleBranchDays"
 * @param {any} value - The new value
 */
export function updateConfigValue(path, value) {
  const settings = getUserSettings();
  const keys = path.split('.');
  let current = settings;

  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }

  current[keys[keys.length - 1]] = value;
  saveUserSettings(settings);
}

/**
 * Reset all settings to defaults
 */
export function resetToDefaults() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get the default config (without user overrides)
 */
export function getDefaultConfig() {
  return defaultConfig;
}
