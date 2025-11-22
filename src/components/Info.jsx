import {
  Box,
  Typography,
  Paper,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import StorageIcon from '@mui/icons-material/Storage';
import SpeedIcon from '@mui/icons-material/Speed';
import SettingsIcon from '@mui/icons-material/Settings';

function Info() {
  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        About This Tool
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        GitHub Organisation Analyser helps you identify maintenance, security, and governance issues across your GitHub organisation.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 3 }}>
        {/* Security */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <SecurityIcon color="primary" />
            <Typography variant="h6">Security & Privacy</Typography>
          </Box>
          <List dense>
            <ListItem>
              <ListItemText
                primary="Organisation Owner Required"
                secondary="Your Personal Access Token must be issued by an organisation owner/admin. This is necessary to access organisation-level data like members, teams, outside collaborators, and repository settings."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Session Storage Only"
                secondary="Your Personal Access Token is stored in session storage (not local storage) and automatically cleared when you close the browser tab. You'll need to re-enter it on each visit for security."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Client-Side Only"
                secondary="All API calls are made directly from your browser to GitHub. Your token never touches any backend server."
              />
            </ListItem>
          </List>
        </Paper>

        {/* Data Caching */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <StorageIcon color="primary" />
            <Typography variant="h6">Data Caching</Typography>
          </Box>
          <List dense>
            <ListItem>
              <ListItemText
                primary="Local Storage Cache"
                secondary="Fetched organisation data is cached in local storage for 24 hours to speed up subsequent visits. Use the refresh button to force-fetch fresh data."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Per-Organisation Cache"
                secondary="Each organisation's data is cached separately, so switching between organisations won't cause conflicts."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Automatic Expiry"
                secondary="Cached data automatically expires after 24 hours, ensuring you see reasonably up-to-date information."
              />
            </ListItem>
          </List>
        </Paper>

        {/* Performance */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <SpeedIcon color="primary" />
            <Typography variant="h6">Performance Optimizations</Typography>
          </Box>
          <List dense>
            <ListItem>
              <ListItemText
                primary="Parallel API Calls"
                secondary="Multiple GitHub API requests are executed in parallel where possible to minimize loading times."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Lazy Loading"
                secondary="Data is only fetched when you first visit each tab, not on page load. Once loaded, tab data is kept in memory for instant switching."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Smart Thresholds"
                secondary="Repositories with excessive branches (50+) are flagged without detailed analysis to avoid overwhelming the API."
              />
            </ListItem>
          </List>
        </Paper>

        {/* Configuration */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <SettingsIcon color="primary" />
            <Typography variant="h6">Configuration</Typography>
          </Box>
          <List dense>
            <ListItem>
              <ListItemText
                primary="Customizable Thresholds"
                secondary="All thresholds (inactive months, stale days, etc.) and display limits are configurable in src/config.json. Modify these values to suit your organisation's needs."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Current Settings"
                secondary="Inactive: 12 months • Stale branches: 90 days • Old PRs: 60 days • Display limits: 20-30 items per section"
              />
            </ListItem>
          </List>
        </Paper>

        {/* Exclusions */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Repository Exclusions
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText
                primary="Archived Repositories"
                secondary="Archived repositories are excluded from all analysis tabs. They are considered intentionally inactive and don't require governance review."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Forked Repositories"
                secondary="Forked repositories are excluded from all analysis tabs (Archive, Cleanup, Governance). A separate 'Forked Repos' tab lists all forks with their source and visibility."
              />
            </ListItem>
          </List>
        </Paper>

        {/* Notes */}
        <Alert severity="info">
          <Typography variant="body2">
            <strong>Note:</strong> This tool analyzes your organisation using the GitHub API. Ensure your Personal Access Token has the correct permissions (see Setup tab).
            Large organisations may take several minutes to analyze due to API rate limits.
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
}

export default Info;
