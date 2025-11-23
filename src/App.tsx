import { useState, useEffect, useMemo, useCallback, SyntheticEvent } from 'react';
import { Box, Tabs, Tab, Alert, Snackbar, AlertColor, Tooltip } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import HomeIcon from '@mui/icons-material/Home';
import ArchiveIcon from '@mui/icons-material/Archive';
import SecurityIcon from '@mui/icons-material/Security';
import GitHubIcon from '@mui/icons-material/GitHub';
import BusinessIcon from '@mui/icons-material/Business';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import InfoIcon from '@mui/icons-material/Info';
import SettingsIcon from '@mui/icons-material/Settings';
import { getTheme } from './theme';
import GitHubApiService from './services/githubApi';
import CleanupNeeded from './components/CleanupNeeded';
import Security from './components/Security';
import GovernanceRepo from './components/GovernanceRepo';
import GovernanceOrg from './components/GovernanceOrg';
import Costs from './components/Costs';
import FAQ from './components/FAQ';
import Settings from './components/Settings';
import Home from './components/Home';
import { getConfig } from './utils/config';
import type { GitHubOrganization } from './types';

const TOKEN_STORAGE_KEY = 'github_token';
const THEME_STORAGE_KEY = 'theme_mode';

interface SnackbarState {
  open: boolean;
  message: string;
  severity: AlertColor;
}

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === null) {
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
  const [organizations, setOrganizations] = useState<GitHubOrganization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [apiService, setApiService] = useState<GitHubApiService | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info',
  });
  const [validating, setValidating] = useState(false);

  const theme = useMemo(() => getTheme(darkMode ? 'dark' : 'light'), [darkMode]);

  const showSnackbar = useCallback((message: string, severity: AlertColor = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const initializeApiService = useCallback(
    async (tokenValue: string) => {
      const service = new GitHubApiService(tokenValue);
      setApiService(service);

      try {
        const orgs = await service.getUserOrganizations();
        setOrganizations(orgs);

        if (orgs.length === 1) {
          setSelectedOrg(orgs[0].login);
        }
      } catch (error) {
        const err = error as Error;
        showSnackbar('Failed to load organizations: ' + err.message, 'error');
      }
    },
    [showSnackbar],
  );

  useEffect(() => {
    const savedToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (savedToken) {
      setToken(savedToken);
      setTokenInput(savedToken);
      initializeApiService(savedToken);
    }
  }, [initializeApiService]);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem(THEME_STORAGE_KEY, newMode ? 'dark' : 'light');
  };

  const handleValidateToken = async () => {
    if (!tokenInput.trim()) {
      showSnackbar('Please enter a token', 'warning');
      return;
    }

    setValidating(true);
    const service = new GitHubApiService(tokenInput);

    try {
      const result = await service.validateToken();

      if (result.valid && result.user) {
        setToken(tokenInput);
        sessionStorage.setItem(TOKEN_STORAGE_KEY, tokenInput);
        showSnackbar(`Token validated! Logged in as ${result.user.login}`, 'success');
        initializeApiService(tokenInput);
      } else {
        showSnackbar('Invalid token: ' + result.error, 'error');
      }
    } catch (error) {
      const err = error as Error;
      showSnackbar('Token validation failed: ' + err.message, 'error');
    } finally {
      setValidating(false);
    }
  };

  const handleClearToken = () => {
    setToken('');
    setTokenInput('');
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    setApiService(null);
    setOrganizations([]);
    setSelectedOrg('');
    showSnackbar('Token cleared', 'info');
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleTabChange = (_event: SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', maxWidth: 1400, mx: 'auto' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tooltip title="Home">
              <Tab icon={<HomeIcon />} aria-label="Home" />
            </Tooltip>
            <Tooltip title="Cleanup">
              <Tab icon={<ArchiveIcon />} aria-label="Cleanup" />
            </Tooltip>
            <Tooltip title="Security">
              <Tab icon={<SecurityIcon />} aria-label="Security" />
            </Tooltip>
            <Tooltip title="Repository Governance">
              <Tab icon={<GitHubIcon />} aria-label="Repository Governance" />
            </Tooltip>
            <Tooltip title="Organisation Governance">
              <Tab icon={<BusinessIcon />} aria-label="Organisation Governance" />
            </Tooltip>
            <Tooltip title="Costs">
              <Tab icon={<AttachMoneyIcon />} aria-label="Costs" />
            </Tooltip>
            <Tooltip title="FAQ">
              <Tab icon={<InfoIcon />} aria-label="FAQ" />
            </Tooltip>
            <Tooltip title="Settings">
              <Tab icon={<SettingsIcon />} aria-label="Settings" />
            </Tooltip>
          </Tabs>
        </Box>

        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <Box sx={{ display: activeTab === 0 ? 'block' : 'none' }}>
            <Home apiService={apiService} orgName={selectedOrg} isActive={activeTab === 0} />
          </Box>
          <Box sx={{ display: activeTab === 1 ? 'block' : 'none' }}>
            <CleanupNeeded
              apiService={apiService}
              orgName={selectedOrg}
              isActive={activeTab === 1}
            />
          </Box>
          <Box sx={{ display: activeTab === 2 ? 'block' : 'none' }}>
            <Security apiService={apiService} orgName={selectedOrg} isActive={activeTab === 2} />
          </Box>
          <Box sx={{ display: activeTab === 3 ? 'block' : 'none' }}>
            <GovernanceRepo
              apiService={apiService}
              orgName={selectedOrg}
              isActive={activeTab === 3}
            />
          </Box>
          <Box sx={{ display: activeTab === 4 ? 'block' : 'none' }}>
            <GovernanceOrg
              apiService={apiService}
              orgName={selectedOrg}
              isActive={activeTab === 4}
            />
          </Box>
          <Box sx={{ display: activeTab === 5 ? 'block' : 'none' }}>
            <Costs apiService={apiService} orgName={selectedOrg} isActive={activeTab === 5} />
          </Box>
          <Box sx={{ display: activeTab === 6 ? 'block' : 'none' }}>
            <FAQ />
          </Box>
          <Box sx={{ display: activeTab === 7 ? 'block' : 'none' }}>
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
