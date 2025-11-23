import { useMemo } from 'react';
import { getConfig } from '../utils/config';

/**
 * Hook that returns memoized config to prevent infinite re-renders.
 * Config is read once on mount and keeps a stable reference.
 */
export function useConfig() {
  return useMemo(() => getConfig(), []);
}
