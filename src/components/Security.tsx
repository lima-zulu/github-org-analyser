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
import { useConfig } from '../hooks/useConfig';
import { saveToCache, loadFromCache } from '../utils/cache';
import DataTable from './DataTable';

function Security({ apiService, orgName, isActive }) {
  const config = useConfig();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [hasLoaded, setHasLoaded] = useState(false);
  const [reposWithAlerts, setReposWithAlerts] = useState([]);
  const [dependabotDisabledRepos, setDependabotDisabledRepos] = useState([]);

  const fetchData = useCallback(
    async (skipCache = false) => {
      if (!apiService || !orgName) return;

      // Try to load from cache first
      if (!skipCache) {
        const cachedData = loadFromCache(orgName, 'security');
        if (cachedData) {
          setReposWithAlerts(cachedData.reposWithAlerts || []);
          setDependabotDisabledRepos(cachedData.dependabotDisabledRepos || []);
          setHasLoaded(true);
          return;
        }
      }

      setLoading(true);
      setError(null);
      setProgress({ current: 0, total: 0 });

      try {
        // Get all repositories (non-archived, non-forked)
        const repos = await apiService.getOrgRepositories(orgName);
        const activeRepos = repos.filter(repo => !repo.archived && !repo.fork);

        setProgress({ current: 0, total: activeRepos.length });

        const withAlerts = [];
        const dependabotDisabled = [];

        for (let i = 0; i < activeRepos.length; i++) {
          const repo = activeRepos[i];
          setProgress({ current: i + 1, total: activeRepos.length });

          try {
            const isDependabotEnabled = await apiService
              .isDependabotEnabled(orgName, repo.name)
              .catch(() => true);

            if (!isDependabotEnabled) {
              dependabotDisabled.push({
                name: repo.name,
                url: repo.html_url,
                settingsUrl: `${repo.html_url}/security_analysis`,
                visibility: repo.private ? 'private' : 'public',
              });
              continue; // Skip fetching alerts if Dependabot is disabled
            }

            const dependabotAlerts = await apiService
              .getDependabotAlerts(orgName, repo.name, 'open')
              .catch(() => []);

            if (dependabotAlerts.length > 0) {
              const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
              dependabotAlerts.forEach(alert => {
                const severity =
                  alert.security_advisory?.severity ||
                  alert.security_vulnerability?.severity ||
                  'low';
                if (severity in severityCounts) {
                  severityCounts[severity]++;
                }
              });

              withAlerts.push({
                name: repo.name,
                url: repo.html_url,
                alertsUrl: `${repo.html_url}/security/dependabot`,
                visibility: repo.private ? 'private' : 'public',
                totalAlerts: dependabotAlerts.length,
                critical: severityCounts.critical,
                high: severityCounts.high,
                medium: severityCounts.medium,
                low: severityCounts.low,
              });
            }
          } catch (err) {
            console.error(`Error checking repo ${repo.name}:`, err);
          }
        }

        withAlerts.sort((a, b) => {
          if (b.critical !== a.critical) return b.critical - a.critical;
          if (b.high !== a.high) return b.high - a.high;
          if (b.medium !== a.medium) return b.medium - a.medium;
          return b.totalAlerts - a.totalAlerts;
        });

        setReposWithAlerts(withAlerts);
        setDependabotDisabledRepos(dependabotDisabled);
        setHasLoaded(true);

        // Save to cache
        saveToCache(
          orgName,
          'security',
          {
            reposWithAlerts: withAlerts,
            dependabotDisabledRepos: dependabotDisabled,
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
          Checking repositories: {progress.current} of {progress.total}
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
            Security
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Identifies security vulnerabilities and misconfigurations across repositories.
          </Typography>
        </Box>
        <Tooltip title="Reload data">
          <IconButton onClick={() => fetchData(true)}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Dependabot Alerts */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Dependabot Alerts
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Repositories with open security vulnerabilities detected by Dependabot
        </Typography>
        <DataTable
          columns={[
            {
              field: 'name',
              headerName: 'Repository Name',
              renderCell: row => (
                <Link href={row.alertsUrl} target="_blank" rel="noopener">
                  {row.name}
                </Link>
              ),
            },
            {
              field: 'totalAlerts',
              headerName: 'Total',
              align: 'center',
              renderCell: row => <Chip label={row.totalAlerts} size="small" color="default" />,
            },
            {
              field: 'critical',
              headerName: 'Critical',
              align: 'center',
              renderCell: row =>
                row.critical > 0 ? (
                  <Chip label={row.critical} size="small" color="error" />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    -
                  </Typography>
                ),
            },
            {
              field: 'high',
              headerName: 'High',
              align: 'center',
              renderCell: row =>
                row.high > 0 ? (
                  <Chip label={row.high} size="small" color="warning" />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    -
                  </Typography>
                ),
            },
            {
              field: 'medium',
              headerName: 'Medium',
              align: 'center',
              renderCell: row =>
                row.medium > 0 ? (
                  <Chip
                    label={row.medium}
                    size="small"
                    sx={{ bgcolor: 'info.main', color: 'white' }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    -
                  </Typography>
                ),
            },
            {
              field: 'low',
              headerName: 'Low',
              align: 'center',
              renderCell: row =>
                row.low > 0 ? (
                  <Chip label={row.low} size="small" variant="outlined" />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    -
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
          ]}
          rows={reposWithAlerts}
          getRowId={row => row.name}
          emptyMessage="No open Dependabot alerts found"
        />
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Dependabot Disabled */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Dependabot Disabled
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Repositories where Dependabot vulnerability alerts are not enabled
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
              field: 'settings',
              headerName: 'Settings',
              renderCell: row => (
                <Link href={row.settingsUrl} target="_blank" rel="noopener">
                  Enable Dependabot
                </Link>
              ),
            },
          ]}
          rows={dependabotDisabledRepos}
          getRowId={row => row.name}
          emptyMessage="All repositories have Dependabot enabled"
        />
      </Box>
    </Box>
  );
}

export default Security;
