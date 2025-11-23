import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Grid,
  Divider,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { getConfig } from '../utils/config';
import { loadFromCache, saveToCache } from '../utils/cache';
import DataTable from './DataTable';

function Costs({ apiService, orgName, isActive }) {
  const config = getConfig();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Data state
  const [orgData, setOrgData] = useState(null);
  const [copilotBilling, setCopilotBilling] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [actionsBilling, setActionsBilling] = useState(null);

  const fetchData = useCallback(
    async (skipCache = false) => {
      if (!apiService || !orgName) return;

      // Try to load from cache first
      if (!skipCache) {
        const cachedData = loadFromCache(orgName, 'costs');
        // Validate cache has all expected fields (actionsBilling was added later)
        if (cachedData && 'actionsBilling' in cachedData) {
          setOrgData(cachedData.orgData);
          setCopilotBilling(cachedData.copilotBilling);
          setBudgets(cachedData.budgets || []);
          setActionsBilling(cachedData.actionsBilling);
          setHasLoaded(true);
          return;
        }
      }

      setLoading(true);
      setError(null);

      try {
        // Get current month boundaries for filtering
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Fetch all billing data in parallel
        const [org, copilot, budgetsList, billingUsageData] = await Promise.all([
          apiService.getOrganization(orgName),
          apiService.getCopilotBilling(orgName),
          apiService.getBudgets(orgName),
          apiService.getBillingUsageDetails(orgName),
        ]);

        const budgetsData = Array.isArray(budgetsList) ? budgetsList : [];

        setOrgData(org);
        setCopilotBilling(copilot);
        setBudgets(budgetsData);

        // Process billing usage data
        let actionsData = null;
        if (billingUsageData && Array.isArray(billingUsageData.usageItems)) {
          // Filter to current month and aggregate by product
          const currentMonthItems = billingUsageData.usageItems.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
          });

          // Aggregate Actions minutes
          let totalMinutes = 0;
          let ubuntuMinutes = 0;
          let macosMinutes = 0;
          let windowsMinutes = 0;

          currentMonthItems.forEach(item => {
            const product = (item.product || '').toLowerCase();
            const sku = (item.sku || '').toLowerCase();

            if (product === 'actions' && item.unitType === 'Minutes') {
              const qty = item.quantity || 0;
              totalMinutes += qty;
              if (sku.includes('linux')) ubuntuMinutes += qty;
              else if (sku.includes('macos')) macosMinutes += qty;
              else if (sku.includes('windows')) windowsMinutes += qty;
            }
          });

          actionsData = {
            minutes: Math.round(totalMinutes),
            included: config.billing.includedActionsMinutes,
            paid: Math.max(0, Math.round(totalMinutes) - config.billing.includedActionsMinutes),
            breakdown: {
              ubuntu: Math.round(ubuntuMinutes),
              macos: Math.round(macosMinutes),
              windows: Math.round(windowsMinutes),
            },
          };
        }

        setActionsBilling(actionsData);
        setHasLoaded(true);

        // Save to cache
        saveToCache(
          orgName,
          'costs',
          {
            orgData: org,
            copilotBilling: copilot,
            budgets: budgetsData,
            actionsBilling: actionsData,
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

  const formatCurrency = amount => {
    if (amount === null || amount === undefined) return '-';
    return `$${parseFloat(amount).toFixed(2)}`;
  };

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
        <Typography variant="body1">Loading costs data...</Typography>
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

  // Calculate seat usage
  const orgSeats = orgData?.plan
    ? {
        total: orgData.plan.seats || 0,
        filled: orgData.plan.filled_seats || 0,
        unused: (orgData.plan.seats || 0) - (orgData.plan.filled_seats || 0),
      }
    : null;

  const copilotSeats = copilotBilling
    ? {
        total: copilotBilling.seat_breakdown?.total || 0,
        active: copilotBilling.seat_breakdown?.active_this_cycle || 0,
        inactive: copilotBilling.seat_breakdown?.inactive_this_cycle || 0,
      }
    : null;

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Costs
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Organisation billing, usage metrics, and cost tracking.
          </Typography>
        </Box>
        <Tooltip title="Reload data">
          <IconButton onClick={() => fetchData(true)}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* SUBSCRIPTION SECTION */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Subscription
        </Typography>
        <Card sx={{ maxWidth: 400 }}>
          <CardContent>
            <Typography variant="h6">
              GitHub{' '}
              {orgData?.plan?.name
                ? orgData.plan.name.charAt(0).toUpperCase() + orgData.plan.name.slice(1)
                : '-'}
            </Typography>
            {orgSeats && orgSeats.total > 0 && (
              <>
                <Typography variant="h4">
                  {formatCurrency(orgSeats.total * config.billing.pricePerUserMonth)}{' '}
                  <Typography component="span" variant="body2" color="text.secondary">
                    per month
                  </Typography>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {orgSeats.total} licenses · {formatCurrency(config.billing.pricePerUserMonth)} per
                  user/month
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* SEAT USAGE SECTION */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Seat Usage
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Organisation Seats
                </Typography>
                {orgSeats ? (
                  <Grid container spacing={2}>
                    <Grid size={4}>
                      <Typography variant="body2" color="text.secondary">
                        Total
                      </Typography>
                      <Typography variant="h5">{orgSeats.total}</Typography>
                    </Grid>
                    <Grid size={4}>
                      <Typography variant="body2" color="text.secondary">
                        Used
                      </Typography>
                      <Typography variant="h5" color="success.main">
                        {orgSeats.filled}
                      </Typography>
                    </Grid>
                    <Grid size={4}>
                      <Typography variant="body2" color="text.secondary">
                        Unused
                      </Typography>
                      <Typography
                        variant="h5"
                        color={orgSeats.unused > 0 ? 'warning.main' : 'text.primary'}
                      >
                        {orgSeats.unused}
                      </Typography>
                    </Grid>
                  </Grid>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Not available
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Copilot Seats
                </Typography>
                {copilotSeats ? (
                  <Grid container spacing={2}>
                    <Grid size={4}>
                      <Typography variant="body2" color="text.secondary">
                        Total
                      </Typography>
                      <Typography variant="h5">{copilotSeats.total}</Typography>
                    </Grid>
                    <Grid size={4}>
                      <Typography variant="body2" color="text.secondary">
                        Active
                      </Typography>
                      <Typography variant="h5" color="success.main">
                        {copilotSeats.active}
                      </Typography>
                    </Grid>
                    <Grid size={4}>
                      <Typography variant="body2" color="text.secondary">
                        Inactive
                      </Typography>
                      <Typography
                        variant="h5"
                        color={copilotSeats.inactive > 0 ? 'warning.main' : 'text.primary'}
                      >
                        {copilotSeats.inactive}
                      </Typography>
                    </Grid>
                  </Grid>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Not available
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* BUDGETS SECTION */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Budgets
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Cost budgets and spending limits by product
        </Typography>
        <DataTable
          columns={[
            {
              field: 'product',
              headerName: 'Product',
              renderCell: row => {
                const sku = row.budget_product_sku || '';
                // Format product names nicely
                const productNames = {
                  actions: 'Actions',
                  packages: 'Packages',
                  codespaces: 'Codespaces',
                  git_lfs: 'Git LFS',
                  shared_storage: 'Shared Storage',
                };
                return (
                  productNames[sku] || sku.charAt(0).toUpperCase() + sku.slice(1).replace(/_/g, ' ')
                );
              },
            },
            {
              field: 'amount_spent',
              headerName: 'Spent',
              renderCell: row => formatCurrency(row.amount_spent ?? 0),
            },
            {
              field: 'budget_amount',
              headerName: 'Budget',
              renderCell: row => formatCurrency(row.budget_amount ?? 0),
            },
          ]}
          rows={budgets}
          getRowId={row => row.id || row.product || Math.random().toString()}
          emptyMessage="No budgets configured"
        />
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* ACTIONS SECTION */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Actions
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          GitHub Actions minutes usage
        </Typography>
        {actionsBilling ? (
          <Card>
            <CardContent>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Minutes
                  </Typography>
                  <Typography variant="h4">
                    {actionsBilling.minutes?.toLocaleString() || 0}{' '}
                    <Typography component="span" variant="body1" color="text.secondary">
                      min used
                    </Typography>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    / {actionsBilling.included?.toLocaleString() || 0} min included
                  </Typography>
                  {actionsBilling.paid > 0 && (
                    <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                      {actionsBilling.paid.toLocaleString()} paid minutes used
                    </Typography>
                  )}
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    By Runner OS
                  </Typography>
                  <Box>
                    <Typography variant="body2">
                      Ubuntu: {actionsBilling.breakdown?.ubuntu?.toLocaleString() || 0} mins
                    </Typography>
                    <Typography variant="body2">
                      macOS: {actionsBilling.breakdown?.macos?.toLocaleString() || 0} mins
                    </Typography>
                    <Typography variant="body2">
                      Windows: {actionsBilling.breakdown?.windows?.toLocaleString() || 0} mins
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Actions usage data not available
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
}

export default Costs;
