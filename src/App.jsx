import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Alert,
  Snackbar,
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import HomeIcon from '@mui/icons-material/Home';
import ArchiveIcon from '@mui/icons-material/Archive';
import GitHubIcon from '@mui/icons-material/GitHub';
import BusinessIcon from '@mui/icons-material/Business';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import InfoIcon from '@mui/icons-material/Info';
import SettingsIcon from '@mui/icons-material/Settings';
import { getTheme } from './theme';
import GitHubApiService from './services/githubApi';
import CleanupNeeded from './components/CleanupNeeded';
import GovernanceRepo from './components/GovernanceRepo';
import GovernanceOrg from './components/GovernanceOrg';
import Costs from './components/Costs';
import FAQ from './components/FAQ';
import Settings from './components/Settings';
import Home from './components/Home';
import { getConfig } from './utils/config';

const TOKEN_STORAGE_KEY = 'github_token';
const THEME_STORAGE_KEY = 'theme_mode';

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === null) {
      // First time user - use config default
      const config = getConfig();
      const defaultDark = config.appearance?.defaultDarkMode ?? true;
      localStorage.setItem(THEME_STORAGE_KEY, defaultDark ? 'dark' : 'light');
      return defaultDark;
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', maxWidth: 1400, mx: 'auto' }}>
          <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
            <Tab icon={<HomeIcon />} aria-label="Home" />
            <Tab icon={<ArchiveIcon />} aria-label="Cleanup" />
            <Tab icon={<GitHubIcon />} aria-label="Repos" />
            <Tab icon={<BusinessIcon />} aria-label="Org" />
            <Tab icon={<AttachMoneyIcon />} aria-label="Costs" />
            <Tab icon={<InfoIcon />} aria-label="FAQ" />
            <Tab icon={<SettingsIcon />} aria-label="Settings" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <Box sx={{ display: activeTab === 0 ? 'block' : 'none' }}>
            <Home apiService={apiService} orgName={selectedOrg} isActive={activeTab === 0} />
          </Box>
          <Box sx={{ display: activeTab === 1 ? 'block' : 'none' }}>
            <CleanupNeeded apiService={apiService} orgName={selectedOrg} isActive={activeTab === 1} />
          </Box>
          <Box sx={{ display: activeTab === 2 ? 'block' : 'none' }}>
            <GovernanceRepo apiService={apiService} orgName={selectedOrg} isActive={activeTab === 2} />
          </Box>
          <Box sx={{ display: activeTab === 3 ? 'block' : 'none' }}>
            <GovernanceOrg apiService={apiService} orgName={selectedOrg} isActive={activeTab === 3} />
          </Box>
          <Box sx={{ display: activeTab === 4 ? 'block' : 'none' }}>
            <Costs apiService={apiService} orgName={selectedOrg} isActive={activeTab === 4} />
          </Box>
          <Box sx={{ display: activeTab === 5 ? 'block' : 'none' }}>
            <FAQ />
          </Box>
          <Box sx={{ display: activeTab === 6 ? 'block' : 'none' }}>
            <Settings
              token={token}
              tokenInput={tokenInput}
              setTokenInput={setTokenInput}
              onValidateToken={handleValidateToken}
              onClearToken={handleClearToken}
              validating={validating}
              organizations={organizations}
              selectedOrg={selectedOrg}
              setSelectedOrg={setSelectedOrg}
              darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
            />
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
