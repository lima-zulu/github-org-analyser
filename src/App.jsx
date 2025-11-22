import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  Tooltip,
  Paper,
  Avatar,
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import CloseIcon from '@mui/icons-material/Close';
import { getTheme } from './theme';
import GitHubApiService from './services/githubApi';
import CleanupNeeded from './components/CleanupNeeded';
import GovernanceRepo from './components/GovernanceRepo';
import GovernanceOrg from './components/GovernanceOrg';
import Costs from './components/Costs';
import FAQ from './components/FAQ';

const TOKEN_STORAGE_KEY = 'github_token';
const THEME_STORAGE_KEY = 'theme_mode';

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === null) {
      // First time user - set dark mode as default
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      return true;
    }
    return saved === 'dark';
  });

  const [token, setToken] = useState(() => {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY) || '';
  });

  const [tokenInput, setTokenInput] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [apiService, setApiService] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [validating, setValidating] = useState(false);

  const theme = useMemo(() => getTheme(darkMode ? 'dark' : 'light'), [darkMode]);

  // Load token from sessionStorage on mount
  useEffect(() => {
    const savedToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (savedToken) {
      setToken(savedToken);
      setTokenInput(savedToken);
      initializeApiService(savedToken);
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem(THEME_STORAGE_KEY, newMode ? 'dark' : 'light');
  };

  // Initialize API service and load organizations
  const initializeApiService = async (tokenValue) => {
    const service = new GitHubApiService(tokenValue);
    setApiService(service);

    try {
      const orgs = await service.getUserOrganizations();
      setOrganizations(orgs);

      if (orgs.length === 1) {
        setSelectedOrg(orgs[0].login);
      }
    } catch (error) {
      showSnackbar('Failed to load organizations: ' + error.message, 'error');
    }
  };

  // Validate token
  const handleValidateToken = async () => {
    if (!tokenInput.trim()) {
      showSnackbar('Please enter a token', 'warning');
      return;
    }

    setValidating(true);
    const service = new GitHubApiService(tokenInput);

    try {
      const result = await service.validateToken();

      if (result.valid) {
        setToken(tokenInput);
        sessionStorage.setItem(TOKEN_STORAGE_KEY, tokenInput);
        showSnackbar(`Token validated! Logged in as ${result.user.login}`, 'success');
        initializeApiService(tokenInput);
      } else {
        showSnackbar('Invalid token: ' + result.error, 'error');
      }
    } catch (error) {
      showSnackbar('Token validation failed: ' + error.message, 'error');
    } finally {
      setValidating(false);
    }
  };

  // Clear token
  const handleClearToken = () => {
    setToken('');
    setTokenInput('');
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    setApiService(null);
    setOrganizations([]);
    setSelectedOrg('');
    showSnackbar('Token cleared', 'info');
  };

  // Show snackbar
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle Enter key in token input
  const handleTokenKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleValidateToken();
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* App Bar */}
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              GitHub Organisation Analyser
            </Typography>
            <Tooltip title={darkMode ? 'Light mode' : 'Dark mode'}>
              <IconButton color="inherit" onClick={toggleDarkMode}>
                {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
            {token && (
              <Tooltip title="Clear token">
                <IconButton color="inherit" onClick={handleClearToken}>
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            )}
          </Toolbar>
        </AppBar>

        {/* Token and Org Selection */}
        <Paper elevation={2} sx={{ p: 2, m: 2, maxWidth: 1400, mx: 'auto' }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              label="GitHub Personal Access Token"
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyPress={handleTokenKeyPress}
              disabled={!!token}
              sx={{ flexGrow: 1, minWidth: 300 }}
              size="small"
              placeholder="ghp_..."
            />

            {!token && (
              <Button
                variant="contained"
                onClick={handleValidateToken}
                disabled={validating || !tokenInput.trim()}
              >
                {validating ? 'Validating...' : 'Validate Token'}
              </Button>
            )}

            {token && organizations.length > 0 && (
              <>
                <FormControl sx={{ minWidth: 200 }} size="small">
                  <InputLabel>Organisation</InputLabel>
                  <Select
                    value={selectedOrg}
                    onChange={(e) => setSelectedOrg(e.target.value)}
                    label="Organisation"
                  >
                    {organizations.map((org) => (
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
                    sx={{ width: 32, height: 32 }}
                  />
                )}
              </>
            )}
          </Box>

          {!token && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Enter your GitHub Personal Access Token to get started. See the FAQ tab for help creating a token.
            </Alert>
          )}

          {token && organizations.length === 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              No organizations found. Make sure your token has the correct permissions.
            </Alert>
          )}
        </Paper>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', maxWidth: 1400, mx: 'auto' }}>
          <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
            <Tab label="Cleanup" />
            <Tab label="Governance (Repo)" />
            <Tab label="Governance (Org)" />
            <Tab label="Costs" />
            <Tab label="FAQ" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <Box sx={{ display: activeTab === 0 ? 'block' : 'none' }}>
            <CleanupNeeded apiService={apiService} orgName={selectedOrg} isActive={activeTab === 0} />
          </Box>
          <Box sx={{ display: activeTab === 1 ? 'block' : 'none' }}>
            <GovernanceRepo apiService={apiService} orgName={selectedOrg} isActive={activeTab === 1} />
          </Box>
          <Box sx={{ display: activeTab === 2 ? 'block' : 'none' }}>
            <GovernanceOrg apiService={apiService} orgName={selectedOrg} isActive={activeTab === 2} />
          </Box>
          <Box sx={{ display: activeTab === 3 ? 'block' : 'none' }}>
            <Costs apiService={apiService} orgName={selectedOrg} isActive={activeTab === 3} />
          </Box>
          <Box sx={{ display: activeTab === 4 ? 'block' : 'none' }}>
            <FAQ />
          </Box>
        </Box>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

export default App;
