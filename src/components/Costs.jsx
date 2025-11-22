import { useState, useEffect } from 'react';
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
  LinearProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import config from '../config.json';
import { saveToCache, loadFromCache } from '../utils/cache';
import DataTable from './DataTable';

function Costs({ apiService, orgName, isActive }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Data state
  const [orgData, setOrgData] = useState(null);
  const [copilotBilling, setCopilotBilling] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [actionsBilling, setActionsBilling] = useState(null);
  const [packagesBilling, setPackagesBilling] = useState(null);
  const [sharedStorage, setSharedStorage] = useState(null);
  const [advancedSecurity, setAdvancedSecurity] = useState(null);
  const [billingUsage, setBillingUsage] = useState(null);
  const [previousBillingUsage, setPreviousBillingUsage] = useState(null);

  const fetchData = async (skipCache = false) => {
    if (!apiService || !orgName) return;

    // Try to load from cache first
    if (!skipCache) {
      const cachedData = loadFromCache(orgName, 'costs');
      if (cachedData) {
        setOrgData(cachedData.orgData);
        setCopilotBilling(cachedData.copilotBilling);
        setBudgets(cachedData.budgets || []);
        setActionsBilling(cachedData.actionsBilling);
        setPackagesBilling(cachedData.packagesBilling);
        setSharedStorage(cachedData.sharedStorage);
        setAdvancedSecurity(cachedData.advancedSecurity);
        setBillingUsage(cachedData.billingUsage);
        setPreviousBillingUsage(cachedData.previousBillingUsage);
        setHasLoaded(true);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // Get current and previous month for billing usage
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      // Fetch all billing data in parallel
      const [
        org,
        copilot,
        budgetsList,
        actions,
        packages,
        shared,
        ghas,
        currentUsage,
        prevUsage
      ] = await Promise.all([
        apiService.getOrganization(orgName),
        apiService.getCopilotBilling(orgName),
        apiService.getBudgets(orgName),
        apiService.getActionsBilling(orgName),
        apiService.getPackagesBilling(orgName),
        apiService.getSharedStorageBilling(orgName),
        apiService.getAdvancedSecurityCommitters(orgName),
        apiService.getBillingUsage(orgName, { year: currentYear, month: currentMonth }),
        apiService.getBillingUsage(orgName, { year: prevYear, month: prevMonth })
      ]);

      setOrgData(org);
      setCopilotBilling(copilot);
      setBudgets(Array.isArray(budgetsList) ? budgetsList : []);
      setActionsBilling(actions);
      setPackagesBilling(packages);
      setSharedStorage(shared);
      setAdvancedSecurity(ghas);
      setBillingUsage(currentUsage);
      setPreviousBillingUsage(prevUsage);
      setHasLoaded(true);

      // Save to cache
      saveToCache(orgName, 'costs', {
        orgData: org,
        copilotBilling: copilot,
        budgets: Array.isArray(budgetsList) ? budgetsList : [],
        actionsBilling: actions,
        packagesBilling: packages,
        sharedStorage: shared,
        advancedSecurity: ghas,
        billingUsage: currentUsage,
        previousBillingUsage: prevUsage
      }, config.cache.ttlHours);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isActive && !hasLoaded && apiService && orgName) {
      fetchData();
    }
  }, [isActive, hasLoaded, apiService, orgName]);

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '-';
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const formatStorage = (gb) => {
    if (gb === null || gb === undefined) return '-';
    if (gb < 1) return `${(gb * 1024).toFixed(0)} MB`;
    return `${parseFloat(gb).toFixed(2)} GB`;
  };

  const getMonthName = (monthOffset = 0) => {
    const date = new Date();
    date.setMonth(date.getMonth() - monthOffset);
    return date.toLocaleString('default', { month: 'short' });
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
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 400, gap: 2 }}>
        <CircularProgress />
        <Typography variant="body1">
          Loading costs data...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={
          <IconButton color="inherit" size="small" onClick={() => fetchData(true)}>
            <RefreshIcon />
          </IconButton>
        }>
          Error loading data: {error}
        </Alert>
      </Box>
    );
  }

  // Calculate seat usage
  const orgSeats = orgData?.plan ? {
    total: orgData.plan.seats || 0,
    filled: orgData.plan.filled_seats || 0,
    unused: (orgData.plan.seats || 0) - (orgData.plan.filled_seats || 0)
  } : null;

  const copilotSeats = copilotBilling ? {
    total: copilotBilling.seat_breakdown?.total || 0,
    active: copilotBilling.seat_breakdown?.active_this_cycle || 0,
    inactive: copilotBilling.seat_breakdown?.inactive_this_cycle || 0
  } : null;

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

      {/* OVERVIEW SECTION */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Overview
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Metered Usage
                </Typography>
                <Typography variant="h4">
                  {formatCurrency(billingUsage?.total_metered_usage_amount)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {getMonthName(0)}
                </Typography>
                {previousBillingUsage && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {formatCurrency(previousBillingUsage?.total_metered_usage_amount)} {getMonthName(1)}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Included Usage
                </Typography>
                <Typography variant="h4">
                  {formatCurrency(billingUsage?.total_included_usage_amount)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {getMonthName(0)}
                </Typography>
                {previousBillingUsage && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {formatCurrency(previousBillingUsage?.total_included_usage_amount)} {getMonthName(1)}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Subscription
                </Typography>
                <Typography variant="h4">
                  {orgData?.plan?.name || '-'}
                </Typography>
                {orgSeats && (
                  <Typography variant="body2" color="text.secondary">
                    {orgSeats.total} licenses
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* SEAT USAGE SECTION */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Seat Usage
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Organisation Seats
                </Typography>
                {orgSeats ? (
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">Total</Typography>
                      <Typography variant="h5">{orgSeats.total}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">Used</Typography>
                      <Typography variant="h5" color="success.main">{orgSeats.filled}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">Unused</Typography>
                      <Typography variant="h5" color={orgSeats.unused > 0 ? 'warning.main' : 'text.primary'}>
                        {orgSeats.unused}
                      </Typography>
                    </Grid>
                  </Grid>
                ) : (
                  <Typography variant="body2" color="text.secondary">Not available</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Copilot Seats
                </Typography>
                {copilotSeats ? (
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">Total</Typography>
                      <Typography variant="h5">{copilotSeats.total}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">Active</Typography>
                      <Typography variant="h5" color="success.main">{copilotSeats.active}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">Inactive</Typography>
                      <Typography variant="h5" color={copilotSeats.inactive > 0 ? 'warning.main' : 'text.primary'}>
                        {copilotSeats.inactive}
                      </Typography>
                    </Grid>
                  </Grid>
                ) : (
                  <Typography variant="body2" color="text.secondary">Not available</Typography>
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
              renderCell: (row) => {
                // Handle different API response formats
                const skus = row.budget_product_skus || row.product_skus || [];
                const product = row.product || row.name || (Array.isArray(skus) ? skus.join(', ') : skus);
                return product ? product.charAt(0).toUpperCase() + product.slice(1) : '-';
              }
            },
            {
              field: 'amount_spent',
              headerName: 'Spent',
              renderCell: (row) => formatCurrency(row.amount_spent ?? row.current_spend ?? 0)
            },
            {
              field: 'budget_amount',
              headerName: 'Budget',
              renderCell: (row) => formatCurrency(row.budget_amount ?? row.amount_limit ?? row.limit ?? 0)
            },
          ]}
          rows={budgets}
          getRowId={(row) => row.id || row.product || Math.random().toString()}
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
          GitHub Actions minutes and storage usage
        </Typography>
        {actionsBilling ? (
          <Card>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Minutes</Typography>
                  <Typography variant="h5">
                    {actionsBilling.total_minutes_used?.toLocaleString() || 0} / {actionsBilling.included_minutes?.toLocaleString() || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">included</Typography>
                  {actionsBilling.total_paid_minutes_used > 0 && (
                    <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                      + {actionsBilling.total_paid_minutes_used?.toLocaleString()} paid minutes
                    </Typography>
                  )}
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min((actionsBilling.total_minutes_used / actionsBilling.included_minutes) * 100, 100)}
                      sx={{ height: 8, borderRadius: 1 }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>By Runner OS</Typography>
                  {actionsBilling.minutes_used_breakdown && (
                    <Box>
                      <Typography variant="body2">
                        Ubuntu: {actionsBilling.minutes_used_breakdown.UBUNTU?.toLocaleString() || 0} mins
                      </Typography>
                      <Typography variant="body2">
                        macOS: {actionsBilling.minutes_used_breakdown.MACOS?.toLocaleString() || 0} mins
                      </Typography>
                      <Typography variant="body2">
                        Windows: {actionsBilling.minutes_used_breakdown.WINDOWS?.toLocaleString() || 0} mins
                      </Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ) : (
          <Alert severity="info">Actions billing data not available</Alert>
        )}
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* STORAGE SECTION */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Storage
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Storage usage across GitHub products
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>Actions & Packages</Typography>
                {sharedStorage ? (
                  <>
                    <Typography variant="h5">
                      {formatStorage(sharedStorage.estimated_storage_for_month)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      of {formatStorage(sharedStorage.days_left_in_billing_cycle ? sharedStorage.estimated_storage_for_month : 2)} included
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">Not available</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>Packages</Typography>
                {packagesBilling ? (
                  <>
                    <Typography variant="h5">
                      {formatStorage(packagesBilling.total_gigabytes_bandwidth_used)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      bandwidth used
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {formatStorage(packagesBilling.total_paid_gigabytes_bandwidth_used)} paid
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">Not available</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>Git LFS</Typography>
                <Typography variant="body2" color="text.secondary">
                  Included in storage metrics
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* CODESPACES SECTION */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Codespaces
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Codespaces compute and storage usage
        </Typography>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Codespaces usage is included in the metered usage overview.
              Check budgets for spending limits.
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* ADVANCED SECURITY SECTION */}
      <Box>
        <Typography variant="h6" gutterBottom>
          Advanced Security
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          GitHub Advanced Security active committers
        </Typography>
        {advancedSecurity ? (
          <Card>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Active Committers</Typography>
                  <Typography variant="h5">{advancedSecurity.total_advanced_security_committers || 0}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Purchased</Typography>
                  <Typography variant="h5">{advancedSecurity.purchased_advanced_security_committers || 0}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Maximum Needed</Typography>
                  <Typography variant="h5">{advancedSecurity.maximum_advanced_security_committers || 0}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Repositories</Typography>
                  <Typography variant="h5">{advancedSecurity.total_count || 0}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Advanced Security data not available
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
}

export default Costs;
