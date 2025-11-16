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
  Chip,
  LinearProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import StarIcon from '@mui/icons-material/Star';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { saveToCache, loadFromCache } from '../utils/cache';
import config from '../config.json';

function ForkedRepos({ apiService, orgName, isActive }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [forkedRepos, setForkedRepos] = useState([]);
  const [totalForks, setTotalForks] = useState(0);
  const [progress, setProgress] = useState({ current: 0, total: 0, repoName: '' });
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchData = async (skipCache = false) => {
    if (!apiService || !orgName) return;

    // Try to load from cache first
    if (!skipCache) {
      const cachedData = loadFromCache(orgName, 'forked-repos');
      if (cachedData) {
        setForkedRepos(cachedData.forkedRepos);
        setTotalForks(cachedData.totalForks);
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

      // Filter for forked repos only
      const forks = repos.filter(repo => repo.fork === true);
      setProgress({ current: 0, total: forks.length, repoName: '' });

      // Fetch full details for each fork to get source info
      const forksWithDetailsPromises = forks.map(async (repo, index) => {
        setProgress({ current: index + 1, total: forks.length, repoName: repo.name });

        // Fetch full repo details to get source with stats
        const fullRepo = await apiService.getRepository(orgName, repo.name);

        if (!fullRepo || !fullRepo.source) {
          // If no source info, return basic data
          return {
            name: repo.name,
            url: repo.html_url,
            visibility: repo.private ? 'private' : 'public',
            description: repo.description || 'No description',
            source: null,
            parent: null,
            sourceLastUpdated: null,
            forkLastPushed: repo.pushed_at,
            sourceStars: 0,
            sourceWatchers: 0,
            commitsBehind: null,
            language: repo.language,
          };
        }

        // Get source repo details
        const source = fullRepo.source;
        const sourceOwner = source.owner.login;
        const sourceRepo = source.name;

        // Compare branches to get commits behind
        let commitsBehind = null;
        try {
          const comparison = await apiService.compareBranches(
            orgName,
            repo.name,
            `${sourceOwner}:${source.default_branch}`,
            fullRepo.default_branch
          );
          if (comparison) {
            commitsBehind = comparison.behind_by;
          }
        } catch (err) {
          // If comparison fails, leave as null
          console.warn(`Could not compare branches for ${repo.name}:`, err);
        }

        return {
          name: repo.name,
          url: repo.html_url,
          visibility: repo.private ? 'private' : 'public',
          description: repo.description || 'No description',
          source: {
            name: source.full_name,
            url: source.html_url
          },
          parent: fullRepo.parent ? {
            name: fullRepo.parent.full_name,
            url: fullRepo.parent.html_url
          } : null,
          sourceLastUpdated: source.pushed_at,
          forkLastPushed: repo.pushed_at,
          sourceStars: source.stargazers_count,
          sourceWatchers: source.watchers_count,
          commitsBehind: commitsBehind,
          language: repo.language,
        };
      });

      const forksWithDetails = await Promise.all(forksWithDetailsPromises);

      // Sort by fork last pushed (most recent first)
      forksWithDetails.sort((a, b) => new Date(b.forkLastPushed) - new Date(a.forkLastPushed));

      const totalForks = forksWithDetails.length;
      const displayedForks = forksWithDetails.slice(0, config.displayLimits.maxInactiveRepos);

      setTotalForks(totalForks);
      setForkedRepos(displayedForks);
      setHasLoaded(true);

      // Save to cache
      saveToCache(orgName, 'forked-repos', {
        forkedRepos: displayedForks,
        totalForks
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
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
  };

  const formatRelativeTime = (date) => {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const days = Math.floor((new Date() - dateObj) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
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
          Processing repository {progress.current} of {progress.total}: {progress.repoName}
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
            Forked Repositories
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Repositories forked from external sources. These repos are excluded from other analysis tabs.
          </Typography>
          {totalForks > 0 && (
            <Typography variant="body2" color={totalForks > config.displayLimits.maxInactiveRepos ? "warning.main" : "text.secondary"}>
              Showing {forkedRepos.length} of {totalForks} forked repositories
            </Typography>
          )}
        </Box>
        <Tooltip title="Reload data">
          <IconButton onClick={() => fetchData(true)}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {forkedRepos.length === 0 ? (
        <Alert severity="success">No forked repositories found!</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Repository Name</TableCell>
                <TableCell>Forked From</TableCell>
                <TableCell>Visibility</TableCell>
                <TableCell>Language</TableCell>
                <TableCell>Source Last Updated</TableCell>
                <TableCell>Fork Last Updated</TableCell>
                <TableCell align="center">Commits Behind</TableCell>
                <TableCell align="center">Source Stats</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {forkedRepos.map((repo) => (
                <TableRow key={repo.name}>
                  <TableCell>
                    <Link href={repo.url} target="_blank" rel="noopener">
                      {repo.name}
                    </Link>
                    {repo.description && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        {repo.description.length > 80 ? repo.description.substring(0, 80) + '...' : repo.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {repo.source ? (
                      <Link href={repo.source.url} target="_blank" rel="noopener">
                        {repo.source.name}
                      </Link>
                    ) : repo.parent ? (
                      <Link href={repo.parent.url} target="_blank" rel="noopener">
                        {repo.parent.name}
                      </Link>
                    ) : (
                      <Typography variant="body2" color="text.secondary">Unknown</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={repo.visibility}
                      size="small"
                      color={repo.visibility === 'public' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    {repo.language ? (
                      <Chip label={repo.language} size="small" variant="outlined" />
                    ) : (
                      <Typography variant="body2" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {repo.sourceLastUpdated ? (
                      <Tooltip title={formatDate(repo.sourceLastUpdated)}>
                        <Typography variant="body2">
                          {formatRelativeTime(repo.sourceLastUpdated)}
                        </Typography>
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" color="text.secondary">N/A</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={formatDate(repo.forkLastPushed)}>
                      <Typography variant="body2">
                        {formatRelativeTime(repo.forkLastPushed)}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    {repo.commitsBehind !== null ? (
                      <Chip
                        label={repo.commitsBehind === 0 ? 'Up to date' : `${repo.commitsBehind} commits`}
                        size="small"
                        color={repo.commitsBehind === 0 ? 'success' : repo.commitsBehind > 10 ? 'error' : 'warning'}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">N/A</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', alignItems: 'center' }}>
                      <Tooltip title="Stars">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <StarIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                          <Typography variant="caption">{repo.sourceStars}</Typography>
                        </Box>
                      </Tooltip>
                      <Tooltip title="Watchers">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <VisibilityIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                          <Typography variant="caption">{repo.sourceWatchers}</Typography>
                        </Box>
                      </Tooltip>
                    </Box>
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

export default ForkedRepos;
