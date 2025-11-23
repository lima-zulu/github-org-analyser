import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Link,
  IconButton,
  Tooltip,
  Divider,
  LinearProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import { getConfig } from '../utils/config';
import { saveToCache, loadFromCache } from '../utils/cache';
import DataTable from './DataTable';

function CleanupNeeded({ apiService, orgName, isActive }) {
  const config = getConfig();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inactiveRepos, setInactiveRepos] = useState([]);
  const [_totalInactive, setTotalInactive] = useState(0);
  const [staleBranches, setStaleBranches] = useState([]);
  const [oldPRs, setOldPRs] = useState([]);
  const [_totalStaleBranchRepos, setTotalStaleBranchRepos] = useState(0);
  const [_totalOldPRRepos, setTotalOldPRRepos] = useState(0);
  const [_totalOldPRs, setTotalOldPRs] = useState(0);
  const [progress, setProgress] = useState({ current: 0, total: 0, repoName: '' });
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchData = useCallback(
    async (skipCache = false) => {
      if (!apiService || !orgName) return;

      // Try to load from cache first
      if (!skipCache) {
        const cachedData = loadFromCache(orgName, 'cleanup');
        if (cachedData) {
          setInactiveRepos(cachedData.inactiveRepos || []);
          setTotalInactive(cachedData.totalInactive || 0);
          setStaleBranches(cachedData.staleBranches);
          setOldPRs(cachedData.oldPRs);
          setTotalStaleBranchRepos(cachedData.totalStaleBranchRepos);
          setTotalOldPRRepos(cachedData.totalOldPRRepos);
          setTotalOldPRs(cachedData.totalOldPRs);
          setHasLoaded(true);
          return;
        }
      }

      setLoading(true);
      setError(null);
      setProgress({ current: 0, total: 0 });

      try {
        // Get all repositories
        const repos = await apiService.getOrgRepositories(orgName);
        const activeRepos = repos.filter(repo => !repo.archived && !repo.fork);

        // Configuration thresholds
        const inactiveMonths = config.thresholds.inactiveRepoMonths;
        const staleDays = config.thresholds.staleBranchDays;
        const oldPRDays = config.thresholds.oldPRDays;
        const branchWarningThreshold = config.thresholds.branchCountWarning;

        // Calculate cutoff dates
        const inactiveCutoffDate = new Date();
        inactiveCutoffDate.setMonth(inactiveCutoffDate.getMonth() - inactiveMonths);

        const staleBranchCutoffDate = new Date();
        staleBranchCutoffDate.setDate(staleBranchCutoffDate.getDate() - staleDays);

        const prCutoffDate = new Date();
        prCutoffDate.setDate(prCutoffDate.getDate() - oldPRDays);

        // Result arrays
        const reposWithActivity = [];
        const reposWithStaleBranches = [];
        const reposWithOldPRs = [];

        setProgress({ current: 0, total: activeRepos.length, repoName: '' });

        // Single pass: Check all repos for inactive, stale branches, and old PRs
        for (let i = 0; i < activeRepos.length; i++) {
          const repo = activeRepos[i];
          setProgress({ current: i + 1, total: activeRepos.length, repoName: repo.name });

          // Fetch all data for this repo in parallel
          const [lastPR, branches, openPRs] = await Promise.all([
            apiService.getLastPullRequest(orgName, repo.name),
            apiService.getRepoBranches(orgName, repo.name),
            apiService.getOpenPullRequests(orgName, repo.name),
          ]);

          // === Check for inactive repos (archive candidates) ===
          const pushedAt = new Date(repo.pushed_at);
          const lastPRDate = lastPR ? new Date(lastPR.updated_at) : null;
          const lastActivity = lastPRDate && lastPRDate > pushedAt ? lastPRDate : pushedAt;
          const isLastPR = lastPRDate && lastPRDate > pushedAt;
          const daysSinceActivity = Math.floor((new Date() - lastActivity) / (1000 * 60 * 60 * 24));

          if (lastActivity < inactiveCutoffDate) {
            reposWithActivity.push({
              name: repo.name,
              url: repo.html_url,
              lastCommitDate: pushedAt,
              lastPRDate: lastPRDate,
              lastActivity: lastActivity,
              isLastActivityPR: isLastPR,
              daysInactive: daysSinceActivity,
            });
          }

          // === Check for stale branches ===
          const nonDefaultBranches = branches.filter(branch => branch.name !== repo.default_branch);

          if (nonDefaultBranches.length > branchWarningThreshold) {
            // Too many branches - show warning
            reposWithStaleBranches.push({
              repoName: repo.name,
              repoUrl: repo.html_url,
              isWarning: true,
              branchCount: nonDefaultBranches.length,
              staleBranchCount: 0,
            });
          } else {
            // Fetch all branch details in parallel
            const branchDetailsPromises = nonDefaultBranches.map(branch =>
              apiService.getBranchDetails(orgName, repo.name, branch.name),
            );
            const allBranchDetails = await Promise.all(branchDetailsPromises);

            // Check each branch for staleness
            let staleBranchCount = 0;
            const authors = new Set();

            allBranchDetails.forEach(branchDetails => {
              if (branchDetails && branchDetails.commit) {
                const lastCommitDate = new Date(branchDetails.commit.commit.author.date);
                if (lastCommitDate < staleBranchCutoffDate) {
                  staleBranchCount++;
                  // Prefer GitHub login (unique) over git commit author name (can vary)
                  const authorIdentifier =
                    branchDetails.commit.author?.login || branchDetails.commit.commit.author.name;
                  if (authorIdentifier) {
                    authors.add(authorIdentifier);
                  }
                }
              }
            });

            if (staleBranchCount > 0) {
              reposWithStaleBranches.push({
                repoName: repo.name,
                repoUrl: repo.html_url,
                isWarning: false,
                staleBranchCount: staleBranchCount,
                totalBranches: nonDefaultBranches.length,
                authors: Array.from(authors),
              });
            }
          }

          // === Check for old PRs ===
          let oldPRCount = 0;
          const oldestPR = { daysOpen: 0, number: null, url: null };

          for (const pr of openPRs) {
            const createdDate = new Date(pr.created_at);
            const daysOpen = Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24));

            if (createdDate < prCutoffDate) {
              oldPRCount++;
              if (daysOpen > oldestPR.daysOpen) {
                oldestPR.daysOpen = daysOpen;
                oldestPR.number = pr.number;
                oldestPR.url = pr.html_url;
              }
            }
          }

          if (oldPRCount > 0) {
            reposWithOldPRs.push({
              repoName: repo.name,
              repoUrl: repo.html_url,
              oldPRCount: oldPRCount,
              totalPRs: openPRs.length,
              oldestPR: oldestPR,
            });
          }
        }

        // Sort and set inactive repos
        reposWithActivity.sort((a, b) => b.daysInactive - a.daysInactive);
        setTotalInactive(reposWithActivity.length);
        setInactiveRepos(reposWithActivity);

        // Sort and set stale branch repos
        reposWithStaleBranches.sort((a, b) => {
          if (a.isWarning && !b.isWarning) return -1;
          if (!a.isWarning && b.isWarning) return 1;
          if (a.isWarning && b.isWarning) return b.branchCount - a.branchCount;
          return b.staleBranchCount - a.staleBranchCount;
        });
        setTotalStaleBranchRepos(reposWithStaleBranches.length);
        setStaleBranches(reposWithStaleBranches);

        // Sort and set old PRs
        reposWithOldPRs.sort((a, b) => b.oldestPR.daysOpen - a.oldestPR.daysOpen);
        const totalOldPRCount = reposWithOldPRs.reduce((sum, repo) => sum + repo.oldPRCount, 0);
        setTotalOldPRRepos(reposWithOldPRs.length);
        setTotalOldPRs(totalOldPRCount);
        setOldPRs(reposWithOldPRs);

        setHasLoaded(true);

        // Save to cache
        saveToCache(
          orgName,
          'cleanup',
          {
            inactiveRepos: reposWithActivity,
            totalInactive: reposWithActivity.length,
            staleBranches: reposWithStaleBranches,
            oldPRs: reposWithOldPRs,
            totalStaleBranchRepos: reposWithStaleBranches.length,
            totalOldPRRepos: reposWithOldPRs.length,
            totalOldPRs: totalOldPRCount,
          },
          config.cache.ttlHours,
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [apiService, orgName, config],
  );

  useEffect(() => {
    if (isActive && !hasLoaded && apiService && orgName) {
      fetchData();
    }
  }, [isActive, hasLoaded, apiService, orgName, fetchData]);

  const formatDate = date => {
    if (!date) return 'N/A';
    // Handle both Date objects and date strings from cache
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
  };

  if (!apiService || !orgName) {
    return (
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
        <Alert severity="info">Please enter a token and select an organisation to view data.</Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400,
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant="body1">
          Checking repository {progress.current} of {progress.total} (excluding archived & forked):{' '}
          {progress.repoName}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={progress.total > 0 ? (progress.current / progress.total) * 100 : 0}
          sx={{ width: '50%' }}
        />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity="error"
          action={
            <IconButton color="inherit" size="small" onClick={() => fetchData(true)}>
              <RefreshIcon />
            </IconButton>
          }
        >
          Error loading data: {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Cleanup Needed
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Identifies inactive repositories, stale branches, and old open pull requests that may
            need attention or cleanup.
          </Typography>
        </Box>
        <Tooltip title="Reload data">
          <IconButton onClick={() => fetchData(true)}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Archive Candidates */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Archive Candidates
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Repositories with no activity in the past {config.thresholds.inactiveRepoMonths} months
        </Typography>
        <DataTable
          columns={[
            {
              field: 'name',
              headerName: 'Repository Name',
              renderCell: row => (
                <Link href={row.url} target="_blank" rel="noopener">
                  {row.name}
                </Link>
              ),
            },
            {
              field: 'lastCommitDate',
              headerName: 'Last Commit Date',
              renderCell: row => formatDate(row.lastCommitDate),
            },
            {
              field: 'lastPRDate',
              headerName: 'Last PR Date',
              renderCell: row => formatDate(row.lastPRDate),
            },
            {
              field: 'daysInactive',
              headerName: 'Days Inactive',
              renderCell: row => (
                <>
                  <strong>{row.daysInactive}</strong> days
                </>
              ),
            },
          ]}
          rows={inactiveRepos}
          getRowId={row => row.name}
          emptyMessage="No inactive repositories found"
        />
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Stale Branches */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Stale Branches
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Repositories with branches untouched for {config.thresholds.staleBranchDays}+ days
          (excluding default branches)
        </Typography>
        <DataTable
          columns={[
            {
              field: 'repoName',
              headerName: 'Repository',
              renderCell: row => (
                <Link href={row.repoUrl} target="_blank" rel="noopener">
                  {row.repoName}
                </Link>
              ),
            },
            {
              field: 'staleBranchCount',
              headerName: 'Stale Branches',
              renderCell: row => (row.isWarning ? '-' : <strong>{row.staleBranchCount}</strong>),
            },
            {
              field: 'totalBranches',
              headerName: 'Total Branches',
              renderCell: row => (row.isWarning ? '-' : row.totalBranches),
            },
            {
              field: 'authors',
              headerName: 'Authors',
              renderCell: row => {
                if (row.isWarning) {
                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WarningIcon color="warning" fontSize="small" />
                      <Typography variant="body2" color="warning.main">
                        {row.branchCount} branches - too many to analyse
                      </Typography>
                    </Box>
                  );
                }
                if (row.authors.length <= 5) return row.authors.join(', ');
                return (
                  <Tooltip title={row.authors.join(', ')}>
                    <span>{row.authors.length} authors</span>
                  </Tooltip>
                );
              },
            },
          ]}
          rows={staleBranches}
          getRowId={row => row.repoName}
          emptyMessage="No stale branches found"
        />
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Section B: Old Pull Requests */}
      <Box>
        <Typography variant="h6" gutterBottom>
          Old Open Pull Requests
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Repositories with pull requests open for {config.thresholds.oldPRDays}+ days
        </Typography>
        <DataTable
          columns={[
            {
              field: 'repoName',
              headerName: 'Repository',
              renderCell: row => (
                <Link href={row.repoUrl} target="_blank" rel="noopener">
                  {row.repoName}
                </Link>
              ),
            },
            {
              field: 'oldPRCount',
              headerName: 'Old PRs',
              renderCell: row => <strong>{row.oldPRCount}</strong>,
            },
            {
              field: 'totalPRs',
              headerName: 'Total Open PRs',
            },
            {
              field: 'oldestPR',
              headerName: 'Oldest PR',
              renderCell: row =>
                row.oldestPR.number && (
                  <>
                    <Link href={row.oldestPR.url} target="_blank" rel="noopener">
                      #{row.oldestPR.number}
                    </Link>{' '}
                    ({row.oldestPR.daysOpen} days)
                  </>
                ),
            },
          ]}
          rows={oldPRs}
          getRowId={row => row.repoName}
          emptyMessage="No old open pull requests found"
        />
      </Box>
    </Box>
  );
}

export default CleanupNeeded;
