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
  Grid,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SecurityIcon from '@mui/icons-material/Security';
import StorageIcon from '@mui/icons-material/Storage';
import SpeedIcon from '@mui/icons-material/Speed';
import { getConfig } from '../utils/config';

function FAQ() {
  const config = getConfig();

  // Q1: Setup content
  const SetupContent = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Alert severity="warning">
        <Typography variant="subtitle2" gutterBottom>
          Prerequisites
        </Typography>
        <List dense disablePadding>
          <ListItem>
            <ListItemText primary="This tool requires organisation-level permissions to access all organisation data" />
          </ListItem>
          <ListItem>
            <ListItemText primary="If you are not an organisation owner, contact your GitHub organisation owner to obtain the required access token" />
          </ListItem>
        </List>
      </Alert>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Token Creation Steps
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="1. Navigate to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens" />
          </ListItem>
          <ListItem>
            <ListItemText primary='2. Click "Generate new token"' />
          </ListItem>
          <ListItem>
            <ListItemText primary='3. Token name: "github-org-analyser" (recommended)' />
          </ListItem>
          <ListItem>
            <ListItemText primary="4. Set expiration according to your security policy" />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="5. Resource owner must be set to your organisation (not your personal account)"
              secondary="This scopes the token to access org repos and org-level data"
            />
          </ListItem>
          <ListItem>
            <ListItemText primary='6. Select "All repositories"' />
          </ListItem>
          <ListItem>
            <ListItemText primary="7. Configure permissions (see below)" />
          </ListItem>
        </List>
        <Alert severity="info" sx={{ mt: 1 }}>
          After selecting "All repositories", you will see TWO permission tabs: "Repositories" and
          "Organisations". You must configure permissions in BOTH tabs.
        </Alert>
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" gutterBottom>
              Repository Permissions (Repositories tab)
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Administration" secondary="Read" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Contents" secondary="Read" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Dependabot alerts" secondary="Read" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Metadata" secondary="Read (usually set automatically)" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Pull requests" secondary="Read" />
              </ListItem>
            </List>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" gutterBottom>
              Organisation Permissions (Organisations tab)
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Administration" secondary="Read" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Members"
                  secondary="Read (only appears when Resource owner is an organisation)"
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>
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

      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <StorageIcon color="primary" fontSize="small" />
          <Typography variant="subtitle2">Data Caching</Typography>
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

      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <SpeedIcon color="primary" fontSize="small" />
          <Typography variant="subtitle2">Performance Optimisations</Typography>
        </Box>
        <List dense>
          <ListItem>
            <ListItemText
              primary="Parallel API Calls"
              secondary="Multiple GitHub API requests are executed in parallel where possible to minimise loading times."
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

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
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
              secondary="Forked repositories are excluded from all analysis tabs (Archive, Cleanup, Governance). A separate 'Forked Repos' section lists all forks with their source and visibility."
            />
          </ListItem>
        </List>
      </Paper>

      <Alert severity="info">
        <strong>Note:</strong> This tool analyses your organisation using the GitHub API. Ensure
        your Personal Access Token has the correct permissions. Large organisations may take several
        minutes to analyse due to API rate limits.
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
              The tool uses configurable thresholds and settings. You can modify these values in the{' '}
              <strong>Settings</strong> tab under "Application Settings":
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
