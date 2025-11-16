import { Box, Typography, Paper, List, ListItem, ListItemIcon, ListItemText, Divider, Alert } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';

function SetupInstructions() {
  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Setup Instructions
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Follow these steps to create a GitHub Personal Access Token for use with this tool.
      </Typography>

      {/* Prerequisites */}
      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Prerequisites
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="This tool requires organization-level permissions to access all organization data" />
          </ListItem>
          <ListItem>
            <ListItemText primary="If you are not an organization owner, contact your GitHub organization owner to obtain the required access token" />
          </ListItem>
        </List>
      </Alert>

      {/* Token Creation Steps */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          1. Token Creation Steps
        </Typography>
        <List>
          <ListItem>
            <ListItemText
              primary="Step 1: Navigate to GitHub Settings"
              secondary="Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Step 2: Generate New Token"
              secondary='Click "Generate new token"'
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Step 3: Name Your Token"
              secondary='Token name: "github-org-analyser" (recommended)'
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Step 4: Set Expiration"
              secondary="Set according to your security policy (max setting is ok)"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Step 5: Set Resource Owner"
              secondary="IMPORTANT: Resource owner must be set to your organization (not your personal account)"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Step 6: Repository Access"
              secondary='Select "All repositories"'
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Step 7: Set Permissions"
              secondary="See permissions sections below - you'll need to configure BOTH the Repositories tab AND the Organizations tab"
            />
          </ListItem>
        </List>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            After selecting "All repositories", you will see TWO permission tabs: "Repositories" and "Organizations".
            You must configure permissions in BOTH tabs.
          </Typography>
        </Alert>
      </Paper>

      {/* Repository Permissions */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          2. Repository Permissions (Repositories Tab)
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Click the "Repositories" tab and set the following permissions:
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Administration"
              secondary="Read"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Contents"
              secondary="Read"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Metadata"
              secondary="Read (usually set automatically)"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Pull requests"
              secondary="Read"
            />
          </ListItem>
        </List>
      </Paper>

      {/* Organization Permissions */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          3. Organization Permissions (Organizations Tab)
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Click the "Organizations" tab and set the following permissions:
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Administration"
              secondary="Read"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Members"
              secondary="Read (only appears when Resource owner is an organization)"
            />
          </ListItem>
        </List>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            Note: The "Members" permission only appears when the Resource owner is set to an organization (not a personal account).
          </Typography>
        </Alert>
      </Paper>

      {/* Security Best Practices */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          4. Security Best Practices
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <LockIcon color="error" />
            </ListItemIcon>
            <ListItemText
              primary="Never share your token with anyone"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <LockIcon color="error" />
            </ListItemIcon>
            <ListItemText
              primary="Create token with minimal permissions"
              secondary="Only what's listed above"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <LockIcon color="error" />
            </ListItemIcon>
            <ListItemText
              primary="Set an expiration date"
              secondary={'Don\'t use "No expiration"'}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <LockIcon color="error" />
            </ListItemIcon>
            <ListItemText
              primary="Token is stored only in browser session memory"
              secondary="Cleared when tab closes"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <LockIcon color="error" />
            </ListItemIcon>
            <ListItemText
              primary='Use "Clear Token" button when done'
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <LockIcon color="error" />
            </ListItemIcon>
            <ListItemText
              primary="Revoke token from GitHub when no longer needed"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <LockIcon color="error" />
            </ListItemIcon>
            <ListItemText
              primary="If token is compromised, revoke immediately"
              secondary="From GitHub settings"
            />
          </ListItem>
        </List>
      </Paper>

      {/* Troubleshooting */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          5. Troubleshooting
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <WarningIcon color="warning" />
            </ListItemIcon>
            <ListItemText
              primary='"Invalid token" error'
              secondary="Check for typos, ensure token hasn't expired"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <WarningIcon color="warning" />
            </ListItemIcon>
            <ListItemText
              primary='"Insufficient permissions" error'
              secondary="Verify you set permissions in BOTH the Repositories tab AND Organizations tab"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <WarningIcon color="warning" />
            </ListItemIcon>
            <ListItemText
              primary='"Resource owner" is your personal account'
              secondary="Change Resource owner to your organization - the Members permission won't appear for personal accounts"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <WarningIcon color="warning" />
            </ListItemIcon>
            <ListItemText
              primary='"Rate limit exceeded" error'
              secondary="GitHub limits API calls to 5,000/hour. Wait and try again."
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <WarningIcon color="warning" />
            </ListItemIcon>
            <ListItemText
              primary='"Organisation not found" error'
              secondary="Ensure you have admin access to the organisation and Resource owner is set correctly"
            />
          </ListItem>
        </List>
      </Paper>

      {/* Token Revocation */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          6. Token Revocation
        </Typography>
        <Typography variant="body2" paragraph>
          When you're done using this tool:
        </Typography>
        <List>
          <ListItem>
            <ListItemText
              primary='1. Click "Clear Token" button in this app'
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="2. Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary='3. Find your "github-org-analyser" token'
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary='4. Click "Delete" or "Revoke"'
            />
          </ListItem>
        </List>
      </Paper>
    </Box>
  );
}

export default SetupInstructions;
