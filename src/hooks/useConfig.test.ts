import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useConfig } from './useConfig';

describe('useConfig', () => {
  it('should return the same reference across re-renders', () => {
    const { result, rerender } = renderHook(() => useConfig());

    const firstConfig = result.current;

    // Re-render multiple times
    rerender();
    rerender();
    rerender();

    // Should be the exact same object reference
    expect(result.current).toBe(firstConfig);
  });

  it('should return config with expected structure', () => {
    const { result } = renderHook(() => useConfig());

    expect(result.current).toHaveProperty('thresholds');
    expect(result.current).toHaveProperty('cache');
    expect(result.current.cache).toHaveProperty('ttlHours');
  });
});
