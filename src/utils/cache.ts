/**
 * Cache utility for storing and retrieving data from localStorage
 * with automatic expiration handling
 */

const CACHE_PREFIX = 'github-org-analyser';

/**
 * Generate a cache key for a specific org and data type
 */
function getCacheKey(orgName, dataType) {
  return `${CACHE_PREFIX}-${orgName}-${dataType}`;
}

/**
 * Save data to localStorage with expiration
 * @param {string} orgName - Organization name
 * @param {string} dataType - Type of data (e.g., 'archive', 'cleanup')
 * @param {any} data - Data to cache
 * @param {number} ttlHours - Time to live in hours
 */
export function saveToCache(orgName, dataType, data, ttlHours) {
  try {
    const key = getCacheKey(orgName, dataType);
    const now = Date.now();
    const cacheObject = {
      data: data,
      timestamp: now,
      expiresAt: now + ttlHours * 60 * 60 * 1000,
    };
    localStorage.setItem(key, JSON.stringify(cacheObject));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, cache not saved');
      // Try to clear old caches to make room
      clearExpiredCaches();
    } else {
      console.error('Error saving to cache:', e);
    }
  }
}

/**
 * Load data from localStorage if not expired
 * @param {string} orgName - Organization name
 * @param {string} dataType - Type of data
 * @returns {any|null} Cached data or null if expired/missing
 */
export function loadFromCache(orgName, dataType) {
  try {
    const key = getCacheKey(orgName, dataType);
    const cached = localStorage.getItem(key);

    if (!cached) {
      return null;
    }

    const cacheObject = JSON.parse(cached);
    const now = Date.now();

    // Check if expired
    if (now > cacheObject.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }

    return cacheObject.data;
  } catch (e) {
    console.error('Error loading from cache:', e);
    return null;
  }
}

/**
 * Clear cache for a specific org and data type
 */
export function clearCache(orgName, dataType) {
  try {
    const key = getCacheKey(orgName, dataType);
    localStorage.removeItem(key);
  } catch (e) {
    console.error('Error clearing cache:', e);
  }
}

/**
 * Clear all expired caches
 */
export function clearExpiredCaches() {
  try {
    const now = Date.now();
    const keysToRemove = [];

    // Find all cache keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          const cacheObject = JSON.parse(cached);

          if (now > cacheObject.expiresAt) {
            keysToRemove.push(key);
          }
        } catch (error) {
          console.warn(`Invalid cache entry ${key}, marking for removal:`, error);
          keysToRemove.push(key);
        }
      }
    }

    // Remove expired caches
    keysToRemove.forEach(key => localStorage.removeItem(key));

    if (keysToRemove.length > 0) {
      console.log(`Cleared ${keysToRemove.length} expired cache entries`);
    }
  } catch (e) {
    console.error('Error clearing expired caches:', e);
  }
}

/**
 * Clear all caches for a specific organization
 */
export function clearOrgCaches(orgName) {
  try {
    const keysToRemove = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${CACHE_PREFIX}-${orgName}-`)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));

    if (keysToRemove.length > 0) {
      console.log(`Cleared ${keysToRemove.length} cache entries for ${orgName}`);
    }
  } catch (e) {
    console.error('Error clearing org caches:', e);
  }
}
