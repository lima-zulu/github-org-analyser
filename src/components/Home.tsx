import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Avatar,
  Chip,
  Link,
  IconButton,
  Tooltip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LanguageIcon from '@mui/icons-material/Language';
import XIcon from '@mui/icons-material/X';
import GitHubIcon from '@mui/icons-material/GitHub';
import { getConfig } from '../utils/config';
import { saveToCache, loadFromCache } from '../utils/cache';

function Home({ apiService, orgName, isActive }) {
  const config = getConfig();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [orgData, setOrgData] = useState(null);
  const [memberCount, setMemberCount] = useState(0);
  const [repoBreakdown, setRepoBreakdown] = useState({
    publicActive: 0,
    publicArchived: 0,
    privateActive: 0,
    privateArchived: 0,
    forkedActive: 0,
    forkedArchived: 0,
    total: 0,
  });
  const [topLanguages, setTopLanguages] = useState([]);
  const [topTopics, setTopTopics] = useState([]);

  const fetchData = useCallback(
    async (skipCache = false) => {
      if (!apiService || !orgName) return;

      // Try to load from cache first
      if (!skipCache) {
        const cachedData = loadFromCache(orgName, 'home');
        if (cachedData && 'repoBreakdown' in cachedData) {
          setOrgData(cachedData.orgData);
          setMemberCount(cachedData.memberCount);
          setRepoBreakdown(cachedData.repoBreakdown);
          setTopLanguages(cachedData.topLanguages);
          setTopTopics(cachedData.topTopics);
          setHasLoaded(true);
          return;
        }
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch org details and repos in parallel
        const [org, repos, members] = await Promise.all([
          apiService.getOrganization(orgName),
          apiService.getOrgRepositories(orgName),
          apiService.getOrgMembers(orgName),
        ]);

        setOrgData(org);
        setMemberCount(members.length);

        // Calculate repo breakdown
        const breakdown = {
          publicActive: 0,
          publicArchived: 0,
          privateActive: 0,
          privateArchived: 0,
          forkedActive: 0,
          forkedArchived: 0,
          total: repos.length,
        };

        repos.forEach(repo => {
          if (repo.fork) {
            // Forked repos (always public)
            if (repo.archived) {
              breakdown.forkedArchived++;
            } else {
              breakdown.forkedActive++;
            }
          } else if (repo.private) {
            // Private repos
            if (repo.archived) {
              breakdown.privateArchived++;
            } else {
              breakdown.privateActive++;
            }
          } else {
            // Public repos (non-forked)
            if (repo.archived) {
              breakdown.publicArchived++;
            } else {
              breakdown.publicActive++;
            }
          }
        });

        setRepoBreakdown(breakdown);

        // Calculate top languages from active non-forked repos
        const languageCounts = {};
        repos.forEach(repo => {
          if (repo.language && !repo.archived && !repo.fork) {
            languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
          }
        });
        const sortedLanguages = Object.entries(languageCounts)
          .sort((a, b) => (b[1] as number) - (a[1] as number))
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }));
        setTopLanguages(sortedLanguages);

        // Calculate top topics from repos
        const topicCounts = {};
        repos.forEach(repo => {
          if (repo.topics && repo.topics.length > 0) {
            repo.topics.forEach(topic => {
              topicCounts[topic] = (topicCounts[topic] || 0) + 1;
            });
          }
        });
        const sortedTopics = Object.entries(topicCounts)
          .sort((a, b) => (b[1] as number) - (a[1] as number))
          .slice(0, 10)
          .map(([name, count]) => ({ name, count }));
        setTopTopics(sortedTopics);

        setHasLoaded(true);

        // Save to cache
        saveToCache(
          orgName,
          'home',
          {
            orgData: org,
            memberCount: members.length,
            repoBreakdown: breakdown,
            topLanguages: sortedLanguages,
            topTopics: sortedTopics,
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
        <Typography variant="body1">Loading organisation overview...</Typography>
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

  if (!orgData) {
    return null;
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Organisation Overview</Typography>
        <Tooltip title="Reload data">
          <IconButton onClick={() => fetchData(true)}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Organisation Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
          <Avatar
            src={orgData.avatar_url}
            alt={orgData.name || orgData.login}
            sx={{ width: 80, height: 80 }}
          />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" gutterBottom>
              {orgData.name || orgData.login}
            </Typography>
            {orgData.description && (
              <Typography variant="body1" color="text.secondary" paragraph>
                {orgData.description}
              </Typography>
            )}

            {/* Social Links & Stats */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Link
                href={`https://github.com/orgs/${orgName}/people`}
                target="_blank"
                rel="noopener"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                <PeopleIcon fontSize="small" />
                {memberCount} members
              </Link>
              <Link
                href={`https://github.com/orgs/${orgName}/followers`}
                target="_blank"
                rel="noopener"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                <PersonAddIcon fontSize="small" />
                {orgData.followers} followers
              </Link>
              <Link
                href={orgData.html_url}
                target="_blank"
                rel="noopener"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                <GitHubIcon fontSize="small" />
                {orgData.login}
              </Link>
              {orgData.blog && (
                <Link
                  href={orgData.blog.startsWith('http') ? orgData.blog : `https://${orgData.blog}`}
                  target="_blank"
                  rel="noopener"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  <LanguageIcon fontSize="small" />
                  Website
                </Link>
              )}
              {orgData.twitter_username && (
                <Link
                  href={`https://x.com/${orgData.twitter_username}`}
                  target="_blank"
                  rel="noopener"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  <XIcon fontSize="small" />@{orgData.twitter_username}
                </Link>
              )}
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Repositories & Languages/Topics */}
      <Grid container spacing={3}>
        {/* Repositories Card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Link
                href={`https://github.com/orgs/${orgName}/repositories`}
                target="_blank"
                rel="noopener"
                underline="hover"
                variant="h6"
              >
                Repositories
              </Link>
              <Typography variant="h6">{repoBreakdown.total}</Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell></TableCell>
                    <TableCell align="right">Active</TableCell>
                    <TableCell align="right">Archived</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell component="th" scope="row">
                      <Link
                        href={`https://github.com/orgs/${orgName}/repositories?q=visibility%3Aprivate`}
                        target="_blank"
                        rel="noopener"
                        underline="hover"
                      >
                        Private
                      </Link>
                    </TableCell>
                    <TableCell align="right">{repoBreakdown.privateActive}</TableCell>
                    <TableCell align="right">{repoBreakdown.privateArchived}</TableCell>
                    <TableCell align="right">
                      <strong>{repoBreakdown.privateActive + repoBreakdown.privateArchived}</strong>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">
                      <Link
                        href={`https://github.com/orgs/${orgName}/repositories?q=fork%3Atrue`}
                        target="_blank"
                        rel="noopener"
                        underline="hover"
                      >
                        Forked
                      </Link>
                    </TableCell>
                    <TableCell align="right">{repoBreakdown.forkedActive}</TableCell>
                    <TableCell align="right">{repoBreakdown.forkedArchived}</TableCell>
                    <TableCell align="right">
                      <strong>{repoBreakdown.forkedActive + repoBreakdown.forkedArchived}</strong>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row">
                      <Link
                        href={`https://github.com/orgs/${orgName}/repositories?q=visibility%3Apublic+fork%3Afalse`}
                        target="_blank"
                        rel="noopener"
                        underline="hover"
                      >
                        Public (not forked)
                      </Link>
                    </TableCell>
                    <TableCell align="right">{repoBreakdown.publicActive}</TableCell>
                    <TableCell align="right">{repoBreakdown.publicArchived}</TableCell>
                    <TableCell align="right">
                      <strong>{repoBreakdown.publicActive + repoBreakdown.publicArchived}</strong>
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ '& td, & th': { borderBottom: 0 } }}>
                    <TableCell component="th" scope="row">
                      <strong>Total</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>
                        {repoBreakdown.publicActive +
                          repoBreakdown.privateActive +
                          repoBreakdown.forkedActive}
                      </strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>
                        {repoBreakdown.publicArchived +
                          repoBreakdown.privateArchived +
                          repoBreakdown.forkedArchived}
                      </strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>{repoBreakdown.total}</strong>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Languages & Topics Card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Top Languages
            </Typography>
            {topLanguages.length > 0 ? (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
                {topLanguages.map(lang => (
                  <Chip
                    key={lang.name}
                    label={`${lang.name} (${lang.count})`}
                    variant="outlined"
                    size="small"
                    component="a"
                    href={`https://github.com/orgs/${orgName}/repositories?q=lang%3A%22${lang.name.replace(/ /g, '+')}%22&type=all`}
                    target="_blank"
                    rel="noopener"
                    clickable
                    color="primary"
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                No language data available
              </Typography>
            )}

            <Typography variant="h6" sx={{ mb: 2 }}>
              Most Used Topics
            </Typography>
            {topTopics.length > 0 ? (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {topTopics.map(topic => (
                  <Chip
                    key={topic.name}
                    label={`${topic.name} (${topic.count})`}
                    variant="outlined"
                    size="small"
                    component="a"
                    href={`https://github.com/search?q=topic%3A${topic.name.replace(/ /g, '-')}+org%3A${orgName}+fork%3Atrue&type=repositories`}
                    target="_blank"
                    rel="noopener"
                    clickable
                    color="primary"
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No topics defined in repositories
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Home;
