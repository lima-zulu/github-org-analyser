import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
import config from '../config.json';
import { saveToCache, loadFromCache } from '../utils/cache';

function CleanupNeeded({ apiService, orgName, isActive }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [staleBranches, setStaleBranches] = useState([]);
  const [oldPRs, setOldPRs] = useState([]);
  const [totalStaleBranchRepos, setTotalStaleBranchRepos] = useState(0);
  const [totalOldPRRepos, setTotalOldPRRepos] = useState(0);
  const [totalOldPRs, setTotalOldPRs] = useState(0);
  const [progress, setProgress] = useState({ current: 0, total: 0, repoName: '' });
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchData = async (skipCache = false) => {
    if (!apiService || !orgName) return;

    // Try to load from cache first
    if (!skipCache) {
      const cachedData = loadFromCache(orgName, 'cleanup');
      if (cachedData) {
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
      setProgress({ current: 0, total: activeRepos.length });

      const staleDays = config.thresholds.staleBranchDays;
      const oldPRDays = config.thresholds.oldPRDays;
      const branchWarningThreshold = config.displayLimits.branchCountWarningThreshold;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - staleDays);

      const prCutoffDate = new Date();
      prCutoffDate.setDate(prCutoffDate.getDate() - oldPRDays);

      const reposWithStaleBranches = [];
      const reposWithOldPRs = [];

      // Check each repo
      for (let i = 0; i < activeRepos.length; i++) {
        const repo = activeRepos[i];
        setProgress({ current: i + 1, total: activeRepos.length, repoName: repo.name });

        // Fetch branches and PRs in parallel
        const [branches, openPRs] = await Promise.all([
          apiService.getRepoBranches(orgName, repo.name),
          apiService.getOpenPullRequests(orgName, repo.name)
        ]);

        // Exclude the default branch from checks
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
            apiService.getBranchDetails(orgName, repo.name, branch.name)
          );
          const allBranchDetails = await Promise.all(branchDetailsPromises);

          // Check each branch for staleness
          let staleBranchCount = 0;
          const authors = new Set();

          allBranchDetails.forEach((branchDetails) => {
            if (branchDetails && branchDetails.commit) {
              const lastCommitDate = new Date(branchDetails.commit.commit.author.date);
              const daysSinceCommit = Math.floor((new Date() - lastCommitDate) / (1000 * 60 * 60 * 24));

              if (lastCommitDate < cutoffDate) {
                staleBranchCount++;
                if (branchDetails.commit.commit.author.name) {
                  authors.add(branchDetails.commit.commit.author.name);
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

        // Process open PRs (already fetched in parallel above)
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

      // Sort stale branch repos by count (descending)
      reposWithStaleBranches.sort((a, b) => {
        if (a.isWarning && !b.isWarning) return -1;
        if (!a.isWarning && b.isWarning) return 1;
        if (a.isWarning && b.isWarning) return b.branchCount - a.branchCount;
        return b.staleBranchCount - a.staleBranchCount;
      });

      const totalStaleBranchRepos = reposWithStaleBranches.length;
      const staleBranches = reposWithStaleBranches.slice(0, config.displayLimits.maxStaleBranchRepos);

      setTotalStaleBranchRepos(totalStaleBranchRepos);
      setStaleBranches(staleBranches);

      // Sort repos with old PRs by oldest PR days (descending)
      reposWithOldPRs.sort((a, b) => b.oldestPR.daysOpen - a.oldestPR.daysOpen);
      const totalOldPRCount = reposWithOldPRs.reduce((sum, repo) => sum + repo.oldPRCount, 0);
      const totalOldPRRepos = reposWithOldPRs.length;
      const oldPRs = reposWithOldPRs.slice(0, config.displayLimits.maxOldPRRepos);

      setTotalOldPRRepos(totalOldPRRepos);
      setTotalOldPRs(totalOldPRCount);
      setOldPRs(oldPRs);
      setHasLoaded(true);

      // Save to cache
      saveToCache(orgName, 'cleanup', {
        staleBranches,
        oldPRs,
        totalStaleBranchRepos,
        totalOldPRRepos,
        totalOldPRs: totalOldPRCount
      }, config.cache.ttlHours);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isActive && !hasLoaded && apiService && orgName) {
      fetchData();
    }
  }, [isActive, hasLoaded, apiService, orgName]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    // Handle both Date objects and date strings from cache
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
  };

  if (!apiService || !orgName) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Please enter a token and select an organisation to view data.</Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 400, gap: 2 }}>
        <CircularProgress />
        <Typography variant="body1">
          Checking repository {progress.current} of {progress.total} (excluding archived & forked): {progress.repoName}
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
        <Alert severity="error" action={
          <IconButton color="inherit" size="small" onClick={() => fetchData(true)}>
            <RefreshIcon />
          </IconButton>
        }>
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
            Identifies stale branches and old open pull requests that may need attention or cleanup.
            These items can accumulate over time and create technical debt.
          </Typography>
        </Box>
        <Tooltip title="Reload data">
          <IconButton onClick={() => fetchData(true)}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Section A: Stale Branches */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Stale Branches
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Repositories with branches untouched for {config.thresholds.staleBranchDays}+ days (excluding default branches)
        </Typography>
        {totalStaleBranchRepos > 0 && (
          <Typography variant="body2" color={totalStaleBranchRepos > config.displayLimits.maxStaleBranchRepos ? "warning.main" : "text.secondary"} sx={{ mb: 1 }}>
            Showing {staleBranches.length} of {totalStaleBranchRepos} repositories
          </Typography>
        )}

        {staleBranches.length === 0 ? (
          <Alert severity="success">No stale branches found!</Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Repository</TableCell>
                  <TableCell>Stale Branches</TableCell>
                  <TableCell>Total Branches</TableCell>
                  <TableCell>Authors</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {staleBranches.map((item) => (
                  item.isWarning ? (
                    <TableRow key={`${item.repoName}-warning`}>
                      <TableCell>
                        <Link href={item.repoUrl} target="_blank" rel="noopener">
                          {item.repoName}
                        </Link>
                      </TableCell>
                      <TableCell colSpan={3}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <WarningIcon color="warning" />
                          <Typography variant="body2" color="warning.main">
                            {item.branchCount} branches found - too many to analyse efficiently (potential process issue)
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={item.repoName}>
                      <TableCell>
                        <Link href={item.repoUrl} target="_blank" rel="noopener">
                          {item.repoName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <strong>{item.staleBranchCount}</strong>
                      </TableCell>
                      <TableCell>{item.totalBranches}</TableCell>
                      <TableCell>
                        {item.authors.length <= 5 ? (
                          item.authors.join(', ')
                        ) : (
                          <Tooltip title={item.authors.join(', ')}>
                            <span>{item.authors.length} authors</span>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
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
        {totalOldPRRepos > 0 && (
          <Typography variant="body2" color={totalOldPRRepos > config.displayLimits.maxOldPRRepos ? "warning.main" : "text.secondary"} sx={{ mb: 1 }}>
            Showing {oldPRs.length} of {totalOldPRRepos} repositories ({totalOldPRs} total old PRs)
          </Typography>
        )}

        {oldPRs.length === 0 ? (
          <Alert severity="success">No old open pull requests found!</Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Repository</TableCell>
                  <TableCell>Old PRs</TableCell>
                  <TableCell>Total Open PRs</TableCell>
                  <TableCell>Oldest PR</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {oldPRs.map((repo) => (
                  <TableRow key={repo.repoName}>
                    <TableCell>
                      <Link href={repo.repoUrl} target="_blank" rel="noopener">
                        {repo.repoName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <strong>{repo.oldPRCount}</strong>
                    </TableCell>
                    <TableCell>{repo.totalPRs}</TableCell>
                    <TableCell>
                      {repo.oldestPR.number && (
                        <>
                          <Link href={repo.oldestPR.url} target="_blank" rel="noopener">
                            #{repo.oldestPR.number}
                          </Link>
                          {' '}({repo.oldestPR.daysOpen} days)
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
}

export default CleanupNeeded;
