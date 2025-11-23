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
  Avatar,
  Chip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useConfig } from '../hooks/useConfig';
import { saveToCache, loadFromCache } from '../utils/cache';
import DataTable from './DataTable';

function GovernanceOrg({ apiService, orgName, isActive }) {
  const config = useConfig();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [_orgData, setOrgData] = useState(null);
  const [orgAdmins, setOrgAdmins] = useState([]);
  const [installedApps, setInstalledApps] = useState([]);
  const [outsideCollaborators, setOutsideCollaborators] = useState([]);
  const [_totalApps, setTotalApps] = useState(0);
  const [_totalOutsideCollabs, setTotalOutsideCollabs] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchData = useCallback(
    async (skipCache = false) => {
      if (!apiService || !orgName) return;

      // Try to load from cache first
      if (!skipCache) {
        const cachedData = loadFromCache(orgName, 'security-org');
        if (cachedData) {
          setOrgData(cachedData.orgData);
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
        const adminsList = await apiService.getOrgAdmins(orgName);

        // Fetch full details for each admin to get names
        const adminsWithDetails = await Promise.all(
          adminsList.map(async admin => {
            const fullDetails = await apiService.getUser(admin.login);
            return fullDetails || admin;
          }),
        );

        // Get installed apps (Feature 7)
        const apps = await apiService.getOrgInstalledApps(orgName);

        // Fetch full details for each app to get owner information
        const appsWithOwner = await Promise.all(
          apps.map(async app => {
            const appDetails = await apiService.getAppBySlug(app.app_slug);

            // If app details fetch fails (404), it's likely a private internal app
            // Use the installation account as the owner (where it's installed)
            const ownerLogin = appDetails?.owner?.login || app.account?.login || null;
            const ownerType = appDetails?.owner?.type || app.account?.type || null;

            return {
              ...app,
              ownerLogin,
              ownerType,
            };
          }),
        );

        // Get outside collaborators (Feature 8)
        const outsideCollabs = await apiService.getOutsideCollaborators(orgName);

        const totalOutsideCollabs = outsideCollabs.length;
        const outsideCollaborators = outsideCollabs;

        // Sort apps by name
        appsWithOwner.sort((a, b) => (a.app_slug || '').localeCompare(b.app_slug || ''));

        const totalApps = appsWithOwner.length;
        const installedApps = appsWithOwner;

        setTotalOutsideCollabs(totalOutsideCollabs);
        setOutsideCollaborators(outsideCollaborators);
        setTotalApps(totalApps);
        setInstalledApps(installedApps);
        setHasLoaded(true);

        setOrgAdmins(adminsWithDetails);

        // Save to cache
        saveToCache(
          orgName,
          'security-org',
          {
            orgData: org,
            orgAdmins: adminsWithDetails,
            installedApps,
            outsideCollaborators,
            totalApps,
            totalOutsideCollabs,
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
        <Typography variant="body1">Loading organisation data...</Typography>
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
            Organisation Governance
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Organisation-wide governance metrics including org owners, admin users, outside
            collaborators, and installed applications.
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

        <DataTable
          columns={[
            {
              field: 'login',
              headerName: 'User',
              renderCell: row => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar src={row.avatar_url} alt={row.login} sx={{ width: 40, height: 40 }} />
                  <Box>
                    <Link href={row.html_url} target="_blank" rel="noopener">
                      {row.login}
                    </Link>
                    {row.name && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        {row.name}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ),
            },
          ]}
          rows={orgAdmins}
          getRowId={row => row.login}
          emptyMessage="No organisation admins found"
        />
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Outside Collaborators */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Outside Collaborators
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Users with repository access but not organisation members
        </Typography>
        <DataTable
          columns={[
            {
              field: 'login',
              headerName: 'User',
              renderCell: row => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar src={row.avatar_url} alt={row.login} sx={{ width: 40, height: 40 }} />
                  <Link href={row.html_url} target="_blank" rel="noopener">
                    {row.login}
                  </Link>
                </Box>
              ),
            },
          ]}
          rows={outsideCollaborators}
          getRowId={row => row.login}
          emptyMessage="No outside collaborators found"
        />
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Installed GitHub Apps */}
      <Box>
        <Typography variant="h6" gutterBottom>
          Installed GitHub Apps
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          All GitHub Apps installed in the organisation
        </Typography>
        <DataTable
          columns={[
            {
              field: 'app_slug',
              headerName: 'App Name',
              renderCell: row => (
                <Link href={row.html_url} target="_blank" rel="noopener">
                  {row.app_slug || 'Unknown App'}
                </Link>
              ),
            },
            {
              field: 'ownerLogin',
              headerName: 'Owner',
              renderCell: row =>
                row.ownerLogin ? (
                  <Link
                    href={`https://github.com/${row.ownerLogin}`}
                    target="_blank"
                    rel="noopener"
                  >
                    {row.ownerLogin}
                  </Link>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Unknown
                  </Typography>
                ),
            },
            {
              field: 'type',
              headerName: 'Type',
              renderCell: row => {
                const isExternal = row.ownerLogin && row.ownerLogin !== orgName;
                const isInternal = row.ownerLogin && row.ownerLogin === orgName;
                if (isInternal) return <Chip label="Internal" size="small" color="success" />;
                if (isExternal) return <Chip label="External" size="small" color="warning" />;
                return (
                  <Typography variant="body2" color="text.secondary">
                    -
                  </Typography>
                );
              },
            },
            {
              field: 'created_at',
              headerName: 'Installed Date',
              renderCell: row => formatDate(row.created_at),
            },
            {
              field: 'repository_selection',
              headerName: 'Repository Access',
              renderCell: row =>
                row.repository_selection === 'all' ? 'All repositories' : 'Selected repositories',
            },
          ]}
          rows={installedApps}
          getRowId={row => row.id}
          emptyMessage="No GitHub Apps installed"
        />
      </Box>
    </Box>
  );
}

export default GovernanceOrg;
