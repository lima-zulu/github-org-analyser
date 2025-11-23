import { describe, it, expect, beforeEach } from 'vitest';
import { getConfig, getDefaultConfig, resetToDefaults } from './config';

describe('config', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    resetToDefaults();
  });

  it('should return default config when no overrides exist', () => {
    const config = getConfig();
    const defaults = getDefaultConfig();

    expect(config).toEqual(defaults);
  });

  it('should have expected default values', () => {
    const config = getConfig();

    expect(config.thresholds.inactiveRepoMonths).toBe(12);
    expect(config.thresholds.staleBranchDays).toBe(90);
    expect(config.thresholds.oldPRDays).toBe(60);
    expect(config.cache.ttlHours).toBe(24);
  });
});
