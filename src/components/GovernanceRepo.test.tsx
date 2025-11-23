import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GovernanceRepo from './GovernanceRepo';

// Mock the useConfig hook
vi.mock('../hooks/useConfig', () => ({
  useConfig: vi.fn(() => ({
    thresholds: {
      inactiveRepoMonths: 12,
      staleBranchDays: 90,
      oldPRDays: 60,
      branchCountWarning: 50,
    },
    cache: { ttlHours: 24 },
  })),
}));

// Mock the cache module
vi.mock('../utils/cache', () => ({
  loadFromCache: vi.fn(() => null),
  saveToCache: vi.fn(),
}));

describe('GovernanceRepo', () => {
  it('should show loading message when no apiService', () => {
    render(<GovernanceRepo apiService={null} orgName="test-org" isActive={true} />);

    expect(screen.getByText(/please enter a token/i)).toBeInTheDocument();
  });
});
