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
  Divider,
  LinearProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/Info';
import config from '../config.json';
import { saveToCache, loadFromCache } from '../utils/cache';

function SecurityGovernanceRepo({ apiService, orgName, isActive }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unprotectedRepos, setUnprotectedRepos] = useState([]);
  const [noAdminRepos, setNoAdminRepos] = useState([]);
  const [totalUnprotected, setTotalUnprotected] = useState(0);
  const [totalNoAdmin, setTotalNoAdmin] = useState(0);
  const [progress, setProgress] = useState({ current: 0, total: 0, repoName: '' });
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchData = async (skipCache = false) => {
    if (!apiService || !orgName) return;

    // Try to load from cache first
    if (!skipCache) {
      const cachedData = loadFromCache(orgName, 'security-repo');
      if (cachedData) {
        setUnprotectedRepos(cachedData.unprotectedRepos);
        setNoAdminRepos(cachedData.noAdminRepos);
        setTotalUnprotected(cachedData.totalUnprotected);
        setTotalNoAdmin(cachedData.totalNoAdmin);
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
      const activeRepos = repos.filter(repo => !repo.archived && !repo.fork);
      setProgress({ current: 0, total: activeRepos.length, repoName: '' });

      const unprotected = [];
      const noAdmin = [];

      // Check each repo
      for (let i = 0; i < activeRepos.length; i++) {
        const repo = activeRepos[i];
        setProgress({ current: i + 1, total: activeRepos.length, repoName: repo.name });

        try {
          // Fetch all data in parallel for this repo
          const [isProtected, teams, directCollaborators] = await Promise.all([
            apiService.isBranchProtected(orgName, repo.name, repo.default_branch).catch(() => false),
            apiService.getRepoTeams(orgName, repo.name).catch(() => []),
            apiService.getRepoDirectCollaborators(orgName, repo.name).catch(() => [])
          ]);

          // Check branch protection
          if (!isProtected) {
            unprotected.push({
              name: repo.name,
              url: repo.html_url,
              defaultBranch: repo.default_branch,
              visibility: repo.private ? 'private' : 'public',
              settingsUrl: `${repo.html_url}/settings/branches`,
            });
          }

          // Check for delegated admin access
          const adminTeams = teams.filter(team => team.permission === 'admin');
          const adminCollaborators = directCollaborators.filter(collab =>
            collab.permissions && collab.permissions.admin === true
          );

          const totalExplicitAdmins = adminTeams.length + adminCollaborators.length;

          console.log(`Repo: ${repo.name}, Admin teams: ${adminTeams.length}, Direct admin collaborators: ${adminCollaborators.length}, Total explicit admins: ${totalExplicitAdmins}`);

          if (totalExplicitAdmins === 0) {
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
          // Continue with next repo
        }
      }

      const totalUnprotected = unprotected.length;
      const unprotectedRepos = unprotected.slice(0, config.displayLimits.maxUnprotectedRepos);
      const totalNoAdmin = noAdmin.length;
      const noAdminRepos = noAdmin.slice(0, config.displayLimits.maxNoAdminRepos);

      setTotalUnprotected(totalUnprotected);
      setUnprotectedRepos(unprotectedRepos);
      setTotalNoAdmin(totalNoAdmin);
      setNoAdminRepos(noAdminRepos);

      console.log(`Found ${noAdmin.length} repos with no admin`);
      setHasLoaded(true);

      // Save to cache
      saveToCache(orgName, 'security-repo', {
        unprotectedRepos,
        noAdminRepos,
        totalUnprotected,
        totalNoAdmin
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
            Security & Governance (Repository Level)
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Identifies security and governance issues at the repository level, including unprotected branches
            and repositories lacking explicit admin oversight.
          </Typography>
        </Box>
        <Tooltip title="Reload data">
          <IconButton onClick={() => fetchData(true)}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Feature 4: Unprotected Default Branches */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Unprotected Default Branches
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Repositories where the default branch has no protection rules enabled
        </Typography>
        {totalUnprotected > 0 && (
          <Typography variant="body2" color={totalUnprotected > config.displayLimits.maxUnprotectedRepos ? "warning.main" : "text.secondary"} sx={{ mb: 1 }}>
            Showing {unprotectedRepos.length} of {totalUnprotected} unprotected repositories
          </Typography>
        )}

        {unprotectedRepos.length === 0 ? (
          <Alert severity="success">All default branches are protected!</Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Repository Name</TableCell>
                  <TableCell>Default Branch</TableCell>
                  <TableCell>Visibility</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {unprotectedRepos.map((repo) => (
                  <TableRow key={repo.name}>
                    <TableCell>
                      <Link href={repo.url} target="_blank" rel="noopener">
                        {repo.name}
                      </Link>
                    </TableCell>
                    <TableCell>{repo.defaultBranch}</TableCell>
                    <TableCell>
                      <Chip
                        label={repo.visibility}
                        size="small"
                        color={repo.visibility === 'public' ? 'warning' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Feature 5: Repositories with No Admin */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="h6">
            Repositories with No Admin
          </Typography>
          <Tooltip title="This shows repos with no explicit admin. Organisation owners always have admin access to all repos, so this metric indicates lack of delegated ownership rather than true lack of access.">
            <InfoIcon color="action" fontSize="small" />
          </Tooltip>
        </Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Repositories where no individual collaborator has explicit admin permissions
        </Typography>
        {totalNoAdmin > 0 && (
          <Typography variant="body2" color={totalNoAdmin > config.displayLimits.maxNoAdminRepos ? "warning.main" : "text.secondary"} sx={{ mb: 1 }}>
            Showing {noAdminRepos.length} of {totalNoAdmin} repositories
          </Typography>
        )}

        <Alert severity="info" sx={{ mb: 2 }}>
          This shows repos with no explicit admin. Organisation owners always have admin access to all repos,
          so this metric indicates lack of delegated ownership rather than true lack of access.
        </Alert>

        {noAdminRepos.length === 0 ? (
          <Alert severity="success">All repositories have at least one admin!</Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Repository Name</TableCell>
                  <TableCell>Collaborator Count</TableCell>
                  <TableCell>Visibility</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {noAdminRepos.map((repo) => (
                  <TableRow key={repo.name}>
                    <TableCell>
                      <Link href={repo.url} target="_blank" rel="noopener">
                        {repo.name}
                      </Link>
                    </TableCell>
                    <TableCell>{repo.collaboratorCount}</TableCell>
                    <TableCell>
                      <Chip
                        label={repo.visibility}
                        size="small"
                        color={repo.visibility === 'public' ? 'warning' : 'default'}
                      />
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

export default SecurityGovernanceRepo;
