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
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import config from '../config.json';
import { saveToCache, loadFromCache } from '../utils/cache';

function SecurityGovernanceOrg({ apiService, orgName, isActive }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orgData, setOrgData] = useState(null);
  const [unusedSeats, setUnusedSeats] = useState(null);
  const [orgAdmins, setOrgAdmins] = useState([]);
  const [installedApps, setInstalledApps] = useState([]);
  const [outsideCollaborators, setOutsideCollaborators] = useState([]);
  const [totalApps, setTotalApps] = useState(0);
  const [totalOutsideCollabs, setTotalOutsideCollabs] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchData = async (skipCache = false) => {
    if (!apiService || !orgName) return;

    // Try to load from cache first
    if (!skipCache) {
      const cachedData = loadFromCache(orgName, 'security-org');
      if (cachedData) {
        setOrgData(cachedData.orgData);
        setUnusedSeats(cachedData.unusedSeats);
        setOrgAdmins(cachedData.orgAdmins);
        setInstalledApps(cachedData.installedApps);
        setOutsideCollaborators(cachedData.outsideCollaborators);
        setTotalApps(cachedData.totalApps);
        setTotalOutsideCollabs(cachedData.totalOutsideCollabs);
        setHasLoaded(true);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // Get organization details
      const org = await apiService.getOrganization(orgName);
      setOrgData(org);

      // Get org admins (Feature 9)
      const admins = await apiService.getOrgAdmins(orgName);

      // Get installed apps (Feature 7)
      const apps = await apiService.getOrgInstalledApps(orgName);

      // Get outside collaborators (Feature 8)
      const outsideCollabs = await apiService.getOutsideCollaborators(orgName);

      // Get repos for each outside collaborator
      const repos = await apiService.getOrgRepositories(orgName);
      const collabsWithRepos = [];

      for (const collab of outsideCollabs) {
        // Count repos this collaborator has access to
        let repoList = [];
        for (const repo of repos) {
          const collaborators = await apiService.getRepoCollaborators(orgName, repo.name);
          const hasAccess = collaborators.some(c => c.login === collab.login);
          if (hasAccess) {
            repoList.push(repo.name);
          }
        }

        collabsWithRepos.push({
          login: collab.login,
          url: collab.html_url,
          repoCount: repoList.length,
          repos: repoList,
        });
      }

      const totalOutsideCollabs = collabsWithRepos.length;
      const outsideCollaborators = collabsWithRepos.slice(0, config.displayLimits.maxOutsideCollaborators);
      const totalApps = apps.length;
      const installedApps = apps.slice(0, config.displayLimits.maxInstalledApps);
      const unusedSeats = org.plan ? {
        total: org.plan.seats || 0,
        filled: org.plan.filled_seats || 0,
        unused: (org.plan.seats || 0) - (org.plan.filled_seats || 0)
      } : null;

      setTotalOutsideCollabs(totalOutsideCollabs);
      setOutsideCollaborators(outsideCollaborators);
      setTotalApps(totalApps);
      setInstalledApps(installedApps);
      setUnusedSeats(unusedSeats);
      setHasLoaded(true);

      // Save to cache
      saveToCache(orgName, 'security-org', {
        orgData: org,
        unusedSeats,
        orgAdmins: admins,
        installedApps,
        outsideCollaborators,
        totalApps,
        totalOutsideCollabs
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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading organisation data...
        </Typography>
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
            Security & Governance (Organisation Level)
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Organisation-wide security and governance metrics including admin users, installed applications,
            outside collaborators, and seat usage.
          </Typography>
        </Box>
        <Tooltip title="Reload data">
          <IconButton onClick={() => fetchData(true)}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Feature 9: Organisation Owners/Admins */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Organisation Owners/Admins
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Users with organisation-level admin privileges
        </Typography>

        {orgAdmins.length === 0 ? (
          <Alert severity="warning">No organisation admins found</Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orgAdmins.map((admin) => (
                  <TableRow key={admin.login}>
                    <TableCell>
                      <Link href={admin.html_url} target="_blank" rel="noopener">
                        {admin.login}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Feature 7: Installed GitHub Apps */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Installed GitHub Apps
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          All GitHub Apps installed in the organisation
        </Typography>
        {totalApps > config.displayLimits.maxInstalledApps && (
          <Typography variant="body2" color="warning.main" sx={{ mb: 1 }}>
            Showing {config.displayLimits.maxInstalledApps} of {totalApps} installed apps
          </Typography>
        )}

        {installedApps.length === 0 ? (
          <Alert severity="info">No GitHub Apps installed</Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>App Name</TableCell>
                  <TableCell>Installed Date</TableCell>
                  <TableCell>Repository Access</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {installedApps.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <Link href={app.html_url} target="_blank" rel="noopener">
                        {app.app_slug || 'Unknown App'}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDate(app.created_at)}</TableCell>
                    <TableCell>
                      {app.repository_selection === 'all'
                        ? 'All repositories'
                        : `${app.repositories?.length || 0} selected repositories`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Feature 8: Outside Collaborators */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Outside Collaborators
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Users with repository access but not organisation members
        </Typography>
        {totalOutsideCollabs > config.displayLimits.maxOutsideCollaborators && (
          <Typography variant="body2" color="warning.main" sx={{ mb: 1 }}>
            Showing {config.displayLimits.maxOutsideCollaborators} of {totalOutsideCollabs} outside collaborators
          </Typography>
        )}

        {outsideCollaborators.length === 0 ? (
          <Alert severity="success">No outside collaborators found</Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Repository Count</TableCell>
                  <TableCell>Repositories</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {outsideCollaborators.map((collab) => (
                  <TableRow key={collab.login}>
                    <TableCell>
                      <Link href={collab.url} target="_blank" rel="noopener">
                        {collab.login}
                      </Link>
                    </TableCell>
                    <TableCell>{collab.repoCount}</TableCell>
                    <TableCell>
                      <Tooltip title={collab.repos.join(', ')}>
                        <span>{collab.repoCount} repos</span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Feature 6: Unused Seats */}
      <Box>
        <Typography variant="h6" gutterBottom>
          Unused Seats
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Organisation seat usage
        </Typography>

        {unusedSeats ? (
          <Card>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Total Seats
                  </Typography>
                  <Typography variant="h4">
                    {unusedSeats.total}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Filled Seats
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {unusedSeats.filled}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Unused Seats
                  </Typography>
                  <Typography variant="h4" color={unusedSeats.unused > 0 ? 'warning.main' : 'text.primary'}>
                    {unusedSeats.unused}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ) : (
          <Alert severity="info">Seat information not available</Alert>
        )}
      </Box>
    </Box>
  );
}

export default SecurityGovernanceOrg;
