import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Link,
  IconButton,
  Tooltip,
  Chip,
  Divider,
  LinearProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/Info';
import StarIcon from '@mui/icons-material/Star';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useConfig } from '../hooks/useConfig';
import { saveToCache, loadFromCache } from '../utils/cache';
import DataTable from './DataTable';

function GovernanceRepo({ apiService, orgName, isActive }) {
  const config = useConfig();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [forkedRepos, setForkedRepos] = useState([]);
  const [_totalForks, setTotalForks] = useState(0);
  const [unprotectedRepos, setUnprotectedRepos] = useState([]);
  const [noAdminRepos, setNoAdminRepos] = useState([]);
  const [_totalUnprotected, setTotalUnprotected] = useState(0);
  const [_totalNoAdmin, setTotalNoAdmin] = useState(0);
  const [forkProgress, setForkProgress] = useState({ current: 0, total: 0 });
  const [activeProgress, setActiveProgress] = useState({ current: 0, total: 0 });
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchData = useCallback(
    async (skipCache = false) => {
      if (!apiService || !orgName) return;

      // Try to load from cache first
      if (!skipCache) {
        const cachedData = loadFromCache(orgName, 'governance-repo');
        if (cachedData) {
          setForkedRepos(cachedData.forkedRepos || []);
          setTotalForks(cachedData.totalForks || 0);
          setUnprotectedRepos(cachedData.unprotectedRepos || []);
          setNoAdminRepos(cachedData.noAdminRepos || []);
          setTotalUnprotected(cachedData.totalUnprotected || 0);
          setTotalNoAdmin(cachedData.totalNoAdmin || 0);
          setHasLoaded(true);
          return;
        }
      }

      setLoading(true);
      setError(null);
      setForkProgress({ current: 0, total: 0 });
      setActiveProgress({ current: 0, total: 0 });

      try {
        // Get all repositories
        const repos = await apiService.getOrgRepositories(orgName);

        const forks = repos.filter(repo => repo.fork === true && !repo.archived);
        const activeRepos = repos.filter(repo => !repo.archived && !repo.fork);

        setForkProgress({ current: 0, total: forks.length });
        setActiveProgress({ current: 0, total: activeRepos.length });

        // Process forks function
        const processForks = async () => {
          const forksWithDetails = [];

          for (let i = 0; i < forks.length; i++) {
            const repo = forks[i];
            setForkProgress({ current: i + 1, total: forks.length });

            const [fullRepo, languages] = await Promise.all([
              apiService.getRepository(orgName, repo.name),
              apiService.getRepoLanguages(orgName, repo.name),
            ]);

            const topLanguages = Object.entries(languages || {})
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .slice(0, 3)
              .map(([lang]) => lang);

            if (!fullRepo || !fullRepo.source) {
              forksWithDetails.push({
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
                languages: topLanguages,
              });
              continue;
            }

            const source = fullRepo.source;
            const sourceOwner = source.owner.login;

            let commitsBehind = null;
            try {
              const comparison = await apiService.compareBranches(
                orgName,
                repo.name,
                `${sourceOwner}:${source.default_branch}`,
                fullRepo.default_branch,
              );
              if (comparison) {
                commitsBehind = comparison.behind_by;
              }
            } catch (err) {
              console.warn(`Could not compare branches for ${repo.name}:`, err);
            }

            forksWithDetails.push({
              name: repo.name,
              url: repo.html_url,
              visibility: repo.private ? 'private' : 'public',
              description: repo.description || 'No description',
              source: { name: source.full_name, url: source.html_url },
              parent: fullRepo.parent
                ? { name: fullRepo.parent.full_name, url: fullRepo.parent.html_url }
                : null,
              sourceLastUpdated: source.pushed_at,
              forkLastPushed: repo.pushed_at,
              sourceStars: source.stargazers_count,
              sourceWatchers: source.watchers_count,
              commitsBehind: commitsBehind,
              languages: topLanguages,
            });
          }

          forksWithDetails.sort(
            (a, b) => new Date(b.forkLastPushed).getTime() - new Date(a.forkLastPushed).getTime(),
          );
          return forksWithDetails;
        };

        // Process active repos function
        const processActiveRepos = async () => {
          const unprotected = [];
          const noAdmin = [];

          for (let i = 0; i < activeRepos.length; i++) {
            const repo = activeRepos[i];
            setActiveProgress({ current: i + 1, total: activeRepos.length });

            try {
              const [isProtected, teams, directCollaborators] = await Promise.all([
                apiService
                  .isBranchProtected(orgName, repo.name, repo.default_branch)
                  .catch(() => false),
                apiService.getRepoTeams(orgName, repo.name).catch(() => []),
                apiService.getRepoDirectCollaborators(orgName, repo.name).catch(() => []),
              ]);

              if (!isProtected) {
                unprotected.push({
                  name: repo.name,
                  url: repo.html_url,
                  defaultBranch: repo.default_branch,
                  visibility: repo.private ? 'private' : 'public',
                  settingsUrl: `${repo.html_url}/settings/branches`,
                });
              }

              const adminTeams = teams.filter(team => team.permission === 'admin');
              const adminCollaborators = directCollaborators.filter(
                collab => collab.permissions && collab.permissions.admin === true,
              );

              if (adminTeams.length + adminCollaborators.length === 0) {
                noAdmin.push({
                  name: repo.name,
                  url: repo.html_url,
                  collaboratorCount: directCollaborators.length,
                  visibility: repo.private ? 'private' : 'public',
                  settingsUrl: `${repo.html_url}/settings/access`,
                });
              }
            } catch (err) {
              console.error(`Error checking repo ${repo.name}:`, err);
            }
          }

          return { unprotected, noAdmin };
        };

        // Run both in parallel
        const [forksWithDetails, activeResults] = await Promise.all([
          processForks(),
          processActiveRepos(),
        ]);

        // Set fork results
        setTotalForks(forksWithDetails.length);
        setForkedRepos(forksWithDetails);

        // Set active repo results
        const { unprotected, noAdmin } = activeResults;
        setTotalUnprotected(unprotected.length);
        setUnprotectedRepos(unprotected);
        setTotalNoAdmin(noAdmin.length);
        setNoAdminRepos(noAdmin);
        setHasLoaded(true);

        // Save to cache
        saveToCache(
          orgName,
          'governance-repo',
          {
            forkedRepos: forksWithDetails,
            totalForks: forksWithDetails.length,
            unprotectedRepos: unprotected,
            noAdminRepos: noAdmin,
            totalUnprotected: unprotected.length,
            totalNoAdmin: noAdmin.length,
          },
          config.cache.ttlHours,
        );
      } catch (err) {
        setError((err as Error).message);
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
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
  };

  const formatRelativeTime = date => {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const days = Math.floor((new Date().getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
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
          Forks: {forkProgress.current} of {forkProgress.total}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={forkProgress.total > 0 ? (forkProgress.current / forkProgress.total) * 100 : 0}
          sx={{ width: '50%' }}
        />
        <Typography variant="body1">
          Active repos: {activeProgress.current} of {activeProgress.total}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={
            activeProgress.total > 0 ? (activeProgress.current / activeProgress.total) * 100 : 0
          }
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
            Repository Governance
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Identifies governance issues at the repository level, including external forks,
            unprotected branches and repositories lacking explicit admin oversight.
          </Typography>
        </Box>
        <Tooltip title="Reload data">
          <IconButton onClick={() => fetchData(true)}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Forked Repositories */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Forked Repositories
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Repositories forked from external sources
        </Typography>
        <DataTable
          columns={[
            {
              field: 'name',
              headerName: 'Repository Name',
              renderCell: row => (
                <>
                  <Link href={row.url} target="_blank" rel="noopener">
                    {row.name}
                  </Link>
                  {row.description && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      {row.description.length > 80
                        ? row.description.substring(0, 80) + '...'
                        : row.description}
                    </Typography>
                  )}
                </>
              ),
            },
            {
              field: 'source',
              headerName: 'Forked From',
              renderCell: row =>
                row.source ? (
                  <Link href={row.source.url} target="_blank" rel="noopener">
                    {row.source.name}
                  </Link>
                ) : row.parent ? (
                  <Link href={row.parent.url} target="_blank" rel="noopener">
                    {row.parent.name}
                  </Link>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Unknown
                  </Typography>
                ),
            },
            {
              field: 'visibility',
              headerName: 'Visibility',
              renderCell: row => (
                <Chip
                  label={row.visibility}
                  size="small"
                  color={row.visibility === 'public' ? 'warning' : 'default'}
                />
              ),
            },
            {
              field: 'languages',
              headerName: 'Languages',
              renderCell: row =>
                row.languages && row.languages.length > 0 ? (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {row.languages.map(lang => (
                      <Chip key={lang} label={lang} size="small" variant="outlined" />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    -
                  </Typography>
                ),
            },
            {
              field: 'sourceLastUpdated',
              headerName: 'Source Last Updated',
              renderCell: row =>
                row.sourceLastUpdated ? (
                  <Tooltip title={formatDate(row.sourceLastUpdated)}>
                    <Typography variant="body2">
                      {formatRelativeTime(row.sourceLastUpdated)}
                    </Typography>
                  </Tooltip>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    N/A
                  </Typography>
                ),
            },
            {
              field: 'forkLastPushed',
              headerName: 'Fork Last Updated',
              renderCell: row => (
                <Tooltip title={formatDate(row.forkLastPushed)}>
                  <Typography variant="body2">{formatRelativeTime(row.forkLastPushed)}</Typography>
                </Tooltip>
              ),
            },
            {
              field: 'commitsBehind',
              headerName: 'Commits Behind',
              align: 'center',
              renderCell: row =>
                row.commitsBehind !== null ? (
                  <Chip
                    label={row.commitsBehind === 0 ? 'Up to date' : `${row.commitsBehind} commits`}
                    size="small"
                    color={
                      row.commitsBehind === 0
                        ? 'success'
                        : row.commitsBehind > 10
                          ? 'error'
                          : 'warning'
                    }
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    N/A
                  </Typography>
                ),
            },
            {
              field: 'sourceStats',
              headerName: 'Source Stats',
              align: 'center',
              renderCell: row => (
                <Box
                  sx={{ display: 'flex', gap: 1, justifyContent: 'center', alignItems: 'center' }}
                >
                  <Tooltip title="Stars">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <StarIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      <Typography variant="caption">{row.sourceStars}</Typography>
                    </Box>
                  </Tooltip>
                  <Tooltip title="Watchers">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <VisibilityIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      <Typography variant="caption">{row.sourceWatchers}</Typography>
                    </Box>
                  </Tooltip>
                </Box>
              ),
            },
          ]}
          rows={forkedRepos}
          getRowId={row => row.name}
          emptyMessage="No forked repositories found"
        />
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Unprotected Default Branches */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Unprotected Default Branches
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Repositories where the default branch has no protection rules enabled
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
            { field: 'defaultBranch', headerName: 'Default Branch' },
            {
              field: 'visibility',
              headerName: 'Visibility',
              renderCell: row => (
                <Chip
                  label={row.visibility}
                  size="small"
                  color={row.visibility === 'public' ? 'warning' : 'default'}
                />
              ),
            },
          ]}
          rows={unprotectedRepos}
          getRowId={row => row.name}
          emptyMessage="All default branches are protected"
        />
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Feature 5: Repositories with No Admin */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="h6">Repositories with No Admin</Typography>
          <Tooltip title="This shows repos with no explicit admin. Organisation owners always have admin access to all repos, so this metric indicates lack of delegated ownership rather than true lack of access.">
            <InfoIcon color="action" fontSize="small" />
          </Tooltip>
        </Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Repositories where no individual collaborator has explicit admin permissions
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          This shows repos with no explicit admin. Organisation owners always have admin access to
          all repos, so this metric indicates lack of delegated ownership rather than true lack of
          access.
        </Alert>

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
            { field: 'collaboratorCount', headerName: 'Collaborator Count' },
            {
              field: 'visibility',
              headerName: 'Visibility',
              renderCell: row => (
                <Chip
                  label={row.visibility}
                  size="small"
                  color={row.visibility === 'public' ? 'warning' : 'default'}
                />
              ),
            },
          ]}
          rows={noAdminRepos}
          getRowId={row => row.name}
          emptyMessage="All repositories have at least one admin"
        />
      </Box>
    </Box>
  );
}

export default GovernanceRepo;
