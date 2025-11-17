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
  LinearProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import config from '../config.json';
import { saveToCache, loadFromCache } from '../utils/cache';

function ArchiveCandidates({ apiService, orgName, isActive }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inactiveRepos, setInactiveRepos] = useState([]);
  const [totalInactive, setTotalInactive] = useState(0);
  const [progress, setProgress] = useState({ current: 0, total: 0, repoName: '' });
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchData = async (skipCache = false) => {
    if (!apiService || !orgName) return;

    // Try to load from cache first
    if (!skipCache) {
      const cachedData = loadFromCache(orgName, 'archive');
      if (cachedData) {
        setInactiveRepos(cachedData.inactiveRepos);
        setTotalInactive(cachedData.totalInactive);
        setHasLoaded(true);
        return;
      }
    }

    setLoading(true);
    setError(null);
    setProgress({ current: 0, total: 0, repoName: '' });

    try {
      // Get all repositories
      const repos = await apiService.getOrgRepositories(orgName);

      // Filter out archived and forked repos
      const activeRepos = repos.filter(repo => !repo.archived && !repo.fork);
      setProgress({ current: 0, total: activeRepos.length, repoName: '' });

      const inactiveMonths = config.thresholds.inactiveRepoMonths;
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - inactiveMonths);

      const reposWithActivity = [];

      // Check each repo for activity
      for (let i = 0; i < activeRepos.length; i++) {
        const repo = activeRepos[i];
        setProgress({ current: i + 1, total: activeRepos.length, repoName: repo.name });

        const pushedAt = new Date(repo.pushed_at);

        // Get last PR
        const lastPR = await apiService.getLastPullRequest(orgName, repo.name);
        const lastPRDate = lastPR ? new Date(lastPR.updated_at) : null;

        // Use the most recent date
        const lastActivity = lastPRDate && lastPRDate > pushedAt ? lastPRDate : pushedAt;
        const isLastPR = lastPRDate && lastPRDate > pushedAt;

        const daysSinceActivity = Math.floor((new Date() - lastActivity) / (1000 * 60 * 60 * 24));

        if (lastActivity < cutoffDate) {
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
      }

      // Sort by days inactive (descending - most inactive first)
      reposWithActivity.sort((a, b) => b.daysInactive - a.daysInactive);

      const totalInactive = reposWithActivity.length;
      const inactiveRepos = reposWithActivity.slice(0, config.displayLimits.maxInactiveRepos);

      setTotalInactive(totalInactive);
      setInactiveRepos(inactiveRepos);
      setHasLoaded(true);

      // Save to cache
      saveToCache(orgName, 'archive', {
        inactiveRepos,
        totalInactive
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
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Archive Candidates
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Identifies repositories that have had no commits or pull requests in the past {config.thresholds.inactiveRepoMonths} months.
            These repositories may be candidates for archiving to reduce clutter and maintenance overhead.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Showing repositories with no activity in the past {config.thresholds.inactiveRepoMonths} months (archived and forked repositories excluded)
          </Typography>
          {totalInactive > 0 && (
            <Typography variant="body2" color={totalInactive > config.displayLimits.maxInactiveRepos ? "warning.main" : "text.secondary"} sx={{ mt: 1 }}>
              Showing {inactiveRepos.length} of {totalInactive} inactive repositories (oldest first)
            </Typography>
          )}
        </Box>
        <Tooltip title="Reload data">
          <IconButton onClick={() => fetchData(true)}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {inactiveRepos.length === 0 ? (
        <Alert severity="success">No inactive repositories found!</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Repository Name</TableCell>
                <TableCell>Last Commit Date</TableCell>
                <TableCell>Last PR Date</TableCell>
                <TableCell>Days Inactive</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inactiveRepos.map((repo) => (
                <TableRow key={repo.name}>
                  <TableCell>
                    <Link href={repo.url} target="_blank" rel="noopener">
                      {repo.name}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDate(repo.lastCommitDate)}</TableCell>
                  <TableCell>{formatDate(repo.lastPRDate)}</TableCell>
                  <TableCell>
                    <strong>{repo.daysInactive}</strong> days
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export default ArchiveCandidates;
