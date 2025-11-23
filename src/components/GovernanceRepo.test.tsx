import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import GovernanceRepo from './GovernanceRepo';

// Mock the config module
vi.mock('../utils/config', () => ({
  getConfig: vi.fn(() => ({
    thresholds: {
      inactiveRepoMonths: 12,
      staleBranchDays: 90,
      oldPRDays: 60,
      branchCountWarning: 50,
    },
    cache: {
      ttlHours: 24,
    },
  })),
}));

// Mock the cache module
vi.mock('../utils/cache', () => ({
  loadFromCache: vi.fn(() => null),
  saveToCache: vi.fn(),
}));

describe('GovernanceRepo', () => {
  let mockApiService: {
    getOrgRepositories: ReturnType<typeof vi.fn>;
    getRepository: ReturnType<typeof vi.fn>;
    getRepoLanguages: ReturnType<typeof vi.fn>;
    compareBranches: ReturnType<typeof vi.fn>;
    isBranchProtected: ReturnType<typeof vi.fn>;
    getRepoTeams: ReturnType<typeof vi.fn>;
    getRepoDirectCollaborators: ReturnType<typeof vi.fn>;
    getDependabotAlerts: ReturnType<typeof vi.fn>;
    isDependabotEnabled: ReturnType<typeof vi.fn>;
  };
  let _renderCount: number;

  beforeEach(() => {
    _renderCount = 0;
    vi.clearAllMocks();

    // Create mock API service
    mockApiService = {
      getOrgRepositories: vi.fn().mockResolvedValue([]),
      getRepository: vi.fn().mockResolvedValue({}),
      getRepoLanguages: vi.fn().mockResolvedValue({}),
      compareBranches: vi.fn().mockResolvedValue(null),
      isBranchProtected: vi.fn().mockResolvedValue(false),
      getRepoTeams: vi.fn().mockResolvedValue([]),
      getRepoDirectCollaborators: vi.fn().mockResolvedValue([]),
      getDependabotAlerts: vi.fn().mockResolvedValue([]),
      isDependabotEnabled: vi.fn().mockResolvedValue(true),
    };
  });

  it('should not cause infinite re-renders when active', async () => {
    // Track render count via getOrgRepositories calls
    // If there's an infinite loop, this would be called many times

    const { rerender: _rerender } = render(
      <GovernanceRepo apiService={mockApiService} orgName="test-org" isActive={true} />,
    );

    // Wait for initial fetch
    await waitFor(
      () => {
        expect(mockApiService.getOrgRepositories).toHaveBeenCalled();
      },
      { timeout: 1000 },
    );

    // Give time for any potential infinite loop to manifest
    await new Promise(resolve => setTimeout(resolve, 500));

    // Should only be called once (not in an infinite loop)
    // Allow for up to 2 calls in case of React strict mode double-render
    expect(mockApiService.getOrgRepositories.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it('should not refetch when props remain the same', async () => {
    const { rerender: _rerender } = render(
      <GovernanceRepo apiService={mockApiService} orgName="test-org" isActive={true} />,
    );

    await waitFor(() => {
      expect(mockApiService.getOrgRepositories).toHaveBeenCalled();
    });

    const callCountAfterMount = mockApiService.getOrgRepositories.mock.calls.length;

    // Simulate a re-render with same props
    _rerender(<GovernanceRepo apiService={mockApiService} orgName="test-org" isActive={true} />);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 200));

    // Should not have made additional calls
    expect(mockApiService.getOrgRepositories.mock.calls.length).toBe(callCountAfterMount);
  });

  it('should show loading message when no apiService', () => {
    render(<GovernanceRepo apiService={null} orgName="test-org" isActive={true} />);

    expect(screen.getByText(/please enter a token/i)).toBeInTheDocument();
  });
});
