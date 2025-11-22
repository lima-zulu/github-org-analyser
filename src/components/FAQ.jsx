import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import WarningIcon from '@mui/icons-material/Warning';
import SecurityIcon from '@mui/icons-material/Security';
import StorageIcon from '@mui/icons-material/Storage';
import SpeedIcon from '@mui/icons-material/Speed';
import config from '../config.json';

function FAQ() {
  // Q1: Setup content
  const SetupContent = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Alert severity="warning">
        <Typography variant="subtitle2" gutterBottom>Prerequisites</Typography>
        <List dense disablePadding>
          <ListItem><ListItemText primary="This tool requires organisation-level permissions to access all organisation data" /></ListItem>
          <ListItem><ListItemText primary="If you are not an organisation owner, contact your GitHub organisation owner to obtain the required access token" /></ListItem>
        </List>
      </Alert>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Token Creation Steps</Typography>
        <List dense>
          <ListItem><ListItemText primary="1. Navigate to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens" /></ListItem>
          <ListItem><ListItemText primary='2. Click "Generate new token"' /></ListItem>
          <ListItem><ListItemText primary='3. Token name: "github-org-analyser" (recommended)' /></ListItem>
          <ListItem><ListItemText primary="4. Set expiration according to your security policy" /></ListItem>
          <ListItem><ListItemText primary="5. IMPORTANT: Resource owner must be set to your organisation (not your personal account)" /></ListItem>
          <ListItem><ListItemText primary='6. Select "All repositories"' /></ListItem>
          <ListItem><ListItemText primary="7. Configure permissions in BOTH tabs (see below)" /></ListItem>
        </List>
        <Alert severity="info" sx={{ mt: 1 }}>
          After selecting "All repositories", you will see TWO permission tabs: "Repositories" and "Organisations". You must configure permissions in BOTH tabs.
        </Alert>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Repository Permissions (Repositories tab)</Typography>
        <List dense>
          <ListItem><ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon><ListItemText primary="Administration" secondary="Read" /></ListItem>
          <ListItem><ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon><ListItemText primary="Contents" secondary="Read" /></ListItem>
          <ListItem><ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon><ListItemText primary="Dependabot alerts" secondary="Read" /></ListItem>
          <ListItem><ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon><ListItemText primary="Metadata" secondary="Read (usually set automatically)" /></ListItem>
          <ListItem><ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon><ListItemText primary="Pull requests" secondary="Read" /></ListItem>
        </List>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Organisation Permissions (Organisations tab)</Typography>
        <List dense>
          <ListItem><ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon><ListItemText primary="Administration" secondary="Read" /></ListItem>
          <ListItem><ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon><ListItemText primary="Members" secondary="Read (only appears when Resource owner is an organisation)" /></ListItem>
        </List>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Security Best Practices</Typography>
        <List dense>
          <ListItem><ListItemIcon><LockIcon color="error" fontSize="small" /></ListItemIcon><ListItemText primary="Never share your token with anyone" /></ListItem>
          <ListItem><ListItemIcon><LockIcon color="error" fontSize="small" /></ListItemIcon><ListItemText primary="Create token with minimal permissions" secondary="Only what's listed above" /></ListItem>
          <ListItem><ListItemIcon><LockIcon color="error" fontSize="small" /></ListItemIcon><ListItemText primary="Set an expiration date" secondary={"Don't use \"No expiration\""} /></ListItem>
          <ListItem><ListItemIcon><LockIcon color="error" fontSize="small" /></ListItemIcon><ListItemText primary="Token is stored only in browser session memory" secondary="Cleared when tab closes" /></ListItem>
          <ListItem><ListItemIcon><LockIcon color="error" fontSize="small" /></ListItemIcon><ListItemText primary='Use "Clear Token" button when done' /></ListItem>
          <ListItem><ListItemIcon><LockIcon color="error" fontSize="small" /></ListItemIcon><ListItemText primary="Revoke token from GitHub when no longer needed" /></ListItem>
          <ListItem><ListItemIcon><LockIcon color="error" fontSize="small" /></ListItemIcon><ListItemText primary="If token is compromised, revoke immediately" secondary="From GitHub settings" /></ListItem>
        </List>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Troubleshooting</Typography>
        <List dense>
          <ListItem><ListItemIcon><WarningIcon color="warning" fontSize="small" /></ListItemIcon><ListItemText primary='"Invalid token" error' secondary="Check for typos, ensure token hasn't expired" /></ListItem>
          <ListItem><ListItemIcon><WarningIcon color="warning" fontSize="small" /></ListItemIcon><ListItemText primary='"Insufficient permissions" error' secondary="Verify you set permissions in BOTH the Repositories tab AND Organisations tab" /></ListItem>
          <ListItem><ListItemIcon><WarningIcon color="warning" fontSize="small" /></ListItemIcon><ListItemText primary='"Resource owner" is your personal account' secondary="Change Resource owner to your organisation - the Members permission won't appear for personal accounts" /></ListItem>
          <ListItem><ListItemIcon><WarningIcon color="warning" fontSize="small" /></ListItemIcon><ListItemText primary='"Rate limit exceeded" error' secondary="GitHub limits API calls to 5,000/hour. Wait and try again." /></ListItem>
          <ListItem><ListItemIcon><WarningIcon color="warning" fontSize="small" /></ListItemIcon><ListItemText primary='"Organisation not found" error' secondary="Ensure you have admin access to the organisation and Resource owner is set correctly" /></ListItem>
        </List>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Token Revocation</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>When you're done using this tool:</Typography>
        <List dense>
          <ListItem><ListItemText primary='1. Click "Clear Token" button in this app' /></ListItem>
          <ListItem><ListItemText primary="2. Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens" /></ListItem>
          <ListItem><ListItemText primary='3. Find your "github-org-analyser" token' /></ListItem>
          <ListItem><ListItemText primary='4. Click "Delete" or "Revoke"' /></ListItem>
        </List>
      </Paper>
    </Box>
  );

  // Q2: Info content
  const InfoContent = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <SecurityIcon color="primary" fontSize="small" />
          <Typography variant="subtitle2">Security & Privacy</Typography>
        </Box>
        <List dense>
          <ListItem><ListItemText primary="Organisation Owner Required" secondary="Your Personal Access Token must be issued by an organisation owner/admin. This is necessary to access organisation-level data like members, teams, outside collaborators, and repository settings." /></ListItem>
          <ListItem><ListItemText primary="Session Storage Only" secondary="Your Personal Access Token is stored in session storage (not local storage) and automatically cleared when you close the browser tab. You'll need to re-enter it on each visit for security." /></ListItem>
          <ListItem><ListItemText primary="Client-Side Only" secondary="All API calls are made directly from your browser to GitHub. Your token never touches any backend server." /></ListItem>
        </List>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <StorageIcon color="primary" fontSize="small" />
          <Typography variant="subtitle2">Data Caching</Typography>
        </Box>
        <List dense>
          <ListItem><ListItemText primary="Local Storage Cache" secondary="Fetched organisation data is cached in local storage for 24 hours to speed up subsequent visits. Use the refresh button to force-fetch fresh data." /></ListItem>
          <ListItem><ListItemText primary="Per-Organisation Cache" secondary="Each organisation's data is cached separately, so switching between organisations won't cause conflicts." /></ListItem>
          <ListItem><ListItemText primary="Automatic Expiry" secondary="Cached data automatically expires after 24 hours, ensuring you see reasonably up-to-date information." /></ListItem>
        </List>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <SpeedIcon color="primary" fontSize="small" />
          <Typography variant="subtitle2">Performance Optimisations</Typography>
        </Box>
        <List dense>
          <ListItem><ListItemText primary="Parallel API Calls" secondary="Multiple GitHub API requests are executed in parallel where possible to minimise loading times." /></ListItem>
          <ListItem><ListItemText primary="Lazy Loading" secondary="Data is only fetched when you first visit each tab, not on page load. Once loaded, tab data is kept in memory for instant switching." /></ListItem>
          <ListItem><ListItemText primary="Smart Thresholds" secondary="Repositories with excessive branches (50+) are flagged without detailed analysis to avoid overwhelming the API." /></ListItem>
        </List>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Repository Exclusions</Typography>
        <List dense>
          <ListItem><ListItemText primary="Archived Repositories" secondary="Archived repositories are excluded from all analysis tabs. They are considered intentionally inactive and don't require governance review." /></ListItem>
          <ListItem><ListItemText primary="Forked Repositories" secondary="Forked repositories are excluded from all analysis tabs (Archive, Cleanup, Governance). A separate 'Forked Repos' section lists all forks with their source and visibility." /></ListItem>
        </List>
      </Paper>

      <Alert severity="info">
        <strong>Note:</strong> This tool analyses your organisation using the GitHub API. Ensure your Personal Access Token has the correct permissions. Large organisations may take several minutes to analyse due to API rate limits.
      </Alert>
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Frequently Asked Questions
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Common questions about using the GitHub Organisation Analyser.
      </Typography>

      <Box sx={{ mt: 3 }}>
        {/* Q1: How do I set up the tool? */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight="medium">
              How do I set up the tool?
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <SetupContent />
          </AccordionDetails>
        </Accordion>

        {/* Q2: How does this tool work? */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight="medium">
              How does this tool work?
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <InfoContent />
          </AccordionDetails>
        </Accordion>

        {/* Q3: What are the configuration options? */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight="medium">
              What are the configuration options?
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>
              The tool uses a configuration file to control various thresholds and settings. You can modify these values in <code>src/config.json</code>:
            </Typography>
            <Box
              component="pre"
              sx={{
                p: 2,
                bgcolor: 'action.hover',
                borderRadius: 1,
                overflow: 'auto',
                fontSize: '0.85rem',
              }}
            >
              {JSON.stringify(config, null, 2)}
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Box>
  );
}

export default FAQ;
