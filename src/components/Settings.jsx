import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Avatar,
  Divider,
  Alert,
  Grid,
  InputAdornment,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { getConfig, updateConfigValue, resetToDefaults, getDefaultConfig } from '../utils/config';

function Settings({
  token,
  tokenInput,
  setTokenInput,
  onValidateToken,
  onClearToken,
  validating,
  organizations,
  selectedOrg,
  setSelectedOrg,
  darkMode,
  onToggleDarkMode,
}) {
  const [config, setConfig] = useState(getConfig());
  const [hasChanges, setHasChanges] = useState(false);

  // Check if current config differs from defaults
  useEffect(() => {
    const defaults = getDefaultConfig();
    const current = getConfig();
    const isDifferent = JSON.stringify(defaults) !== JSON.stringify(current);
    setHasChanges(isDifferent);
  }, [config]);

  const handleConfigChange = (path, value) => {
    // Parse numeric values
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue)) {
      updateConfigValue(path, numericValue);
      setConfig(getConfig());
    }
  };

  const handleReset = () => {
    resetToDefaults();
    setConfig(getConfig());
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Configure your GitHub access and application settings.
      </Typography>

      {/* GitHub PAT Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          GitHub Access Token
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Enter your GitHub Personal Access Token to access organisation data.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="GitHub Personal Access Token"
            type="password"
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
            disabled={!!token}
            fullWidth
            placeholder="github_pat_..."
          />

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="contained"
              onClick={onValidateToken}
              disabled={!!token || validating || !tokenInput.trim()}
            >
              {validating ? 'Validating...' : 'Validate Token'}
            </Button>
            <Button variant="outlined" color="error" onClick={onClearToken} disabled={!token}>
              Clear Token
            </Button>
          </Box>

          {token && <Alert severity="success">Token validated and active</Alert>}
        </Box>
      </Paper>

      {/* Organisation Selector Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Organisation
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Select the GitHub organisation to analyse.
        </Typography>

        {token && organizations.length > 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControl sx={{ minWidth: 300 }}>
              <InputLabel>Organisation</InputLabel>
              <Select
                value={selectedOrg}
                onChange={e => setSelectedOrg(e.target.value)}
                label="Organisation"
              >
                {organizations.map(org => (
                  <MenuItem key={org.login} value={org.login}>
                    {org.login}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedOrg && organizations.find(org => org.login === selectedOrg) && (
              <Avatar
                src={organizations.find(org => org.login === selectedOrg).avatar_url}
                alt={selectedOrg}
                sx={{ width: 40, height: 40 }}
              />
            )}
          </Box>
        ) : token ? (
          <Alert severity="warning">
            No organisations found. Make sure your token has the correct permissions.
          </Alert>
        ) : (
          <Alert severity="info">Enter and validate a token to see available organisations.</Alert>
        )}
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* Application Settings Section */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Application Settings</Typography>
          <Button variant="outlined" size="small" onClick={handleReset} disabled={!hasChanges}>
            Reset to Defaults
          </Button>
        </Box>

        {/* Thresholds */}
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          Thresholds
        </Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Inactive Repository"
              type="number"
              value={config.thresholds.inactiveRepoMonths}
              onChange={e => handleConfigChange('thresholds.inactiveRepoMonths', e.target.value)}
              fullWidth
              size="small"
              slotProps={{
                input: {
                  endAdornment: <InputAdornment position="end">months</InputAdornment>,
                },
              }}
              helperText="Repos with no activity for this period are flagged"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Stale Branch"
              type="number"
              value={config.thresholds.staleBranchDays}
              onChange={e => handleConfigChange('thresholds.staleBranchDays', e.target.value)}
              fullWidth
              size="small"
              slotProps={{
                input: {
                  endAdornment: <InputAdornment position="end">days</InputAdornment>,
                },
              }}
              helperText="Branches unchanged for this period are stale"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Old Pull Request"
              type="number"
              value={config.thresholds.oldPRDays}
              onChange={e => handleConfigChange('thresholds.oldPRDays', e.target.value)}
              fullWidth
              size="small"
              slotProps={{
                input: {
                  endAdornment: <InputAdornment position="end">days</InputAdornment>,
                },
              }}
              helperText="Open PRs older than this are flagged"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Branch Count Warning"
              type="number"
              value={config.thresholds.branchCountWarning}
              onChange={e => handleConfigChange('thresholds.branchCountWarning', e.target.value)}
              fullWidth
              size="small"
              slotProps={{
                input: {
                  endAdornment: <InputAdornment position="end">branches</InputAdornment>,
                },
              }}
              helperText="Skip detailed analysis for repos with more branches"
            />
          </Grid>
        </Grid>

        {/* Billing */}
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          Billing
        </Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Price Per User"
              type="number"
              value={config.billing.pricePerUserMonth}
              onChange={e => handleConfigChange('billing.pricePerUserMonth', e.target.value)}
              fullWidth
              size="small"
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  endAdornment: <InputAdornment position="end">/month</InputAdornment>,
                },
              }}
              helperText="Cost per organisation seat"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Included Actions Minutes"
              type="number"
              value={config.billing.includedActionsMinutes}
              onChange={e => handleConfigChange('billing.includedActionsMinutes', e.target.value)}
              fullWidth
              size="small"
              slotProps={{
                input: {
                  endAdornment: <InputAdornment position="end">minutes</InputAdornment>,
                },
              }}
              helperText="Free Actions minutes in your plan"
            />
          </Grid>
        </Grid>

        {/* Cache */}
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          Cache
        </Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Cache Duration"
              type="number"
              value={config.cache.ttlHours}
              onChange={e => handleConfigChange('cache.ttlHours', e.target.value)}
              fullWidth
              size="small"
              slotProps={{
                input: {
                  endAdornment: <InputAdornment position="end">hours</InputAdornment>,
                },
              }}
              helperText="How long to cache API responses"
            />
          </Grid>
        </Grid>

        {/* Appearance */}
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          Appearance
        </Typography>
        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={<Switch checked={darkMode} onChange={onToggleDarkMode} />}
            label="Dark Mode"
          />
        </Box>

        <Alert severity="info" sx={{ mt: 3 }}>
          Settings are saved automatically and persist across sessions.
        </Alert>
      </Paper>
    </Box>
  );
}

export default Settings;
