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
  Link,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useConfig } from '../hooks/useConfig';
import { loadFromCache, saveToCache } from '../utils/cache';
import DataTable from './DataTable';

function Costs({ apiService, orgName, isActive }) {
  const config = useConfig();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Data state
  const [orgData, setOrgData] = useState(null);
  const [copilotBilling, setCopilotBilling] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [actionsBilling, setActionsBilling] = useState(null);
  const [usageSummary, setUsageSummary] = useState<{
    current: { gross: number; included: number; net: number };
    previous: { gross: number; included: number; net: number };
  } | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<number>(0);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [actionsStorage, setActionsStorage] = useState<{ gross: number; included: number } | null>(
    null,
  );
  const [copilotCost, setCopilotCost] = useState<number>(0);

  const fetchData = useCallback(
    async (skipCache = false) => {
      if (!apiService || !orgName) return;

      // Try to load from cache first
      if (!skipCache) {
        const cachedData = loadFromCache(orgName, 'costs');
        // Validate cache has all expected fields (memberCount/actionsStorage were added later)
        if (cachedData && 'usageSummary' in cachedData && 'memberCount' in cachedData) {
          setOrgData(cachedData.orgData);
          setCopilotBilling(cachedData.copilotBilling);
          setBudgets(cachedData.budgets || []);
          setActionsBilling(cachedData.actionsBilling);
          setUsageSummary(cachedData.usageSummary);
          setPendingInvitations(cachedData.pendingInvitations || 0);
          setMemberCount(cachedData.memberCount || 0);
          setActionsStorage(cachedData.actionsStorage || null);
          setCopilotCost(cachedData.copilotCost || 0);
          setHasLoaded(true);
          return;
        }
      }

      setLoading(true);
      setError(null);

      try {
        // Get current month boundaries for filtering
        const now = new Date();
        const currentMonth = now.getMonth() + 1; // API uses 1-indexed months
        const currentYear = now.getFullYear();

        // Calculate previous month
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

        // Fetch all billing data in parallel
        const [
          org,
          copilot,
          budgetsList,
          currentMonthUsage,
          previousMonthUsage,
          invitations,
          members,
        ] = await Promise.all([
          apiService.getOrganization(orgName),
          apiService.getCopilotBilling(orgName),
          apiService.getBudgets(orgName),
          apiService.getBillingUsageDetails(orgName, { year: currentYear, month: currentMonth }),
          apiService.getBillingUsageDetails(orgName, { year: prevYear, month: prevMonth }),
          apiService.getOrgInvitations(orgName),
          apiService.getOrgMembers(orgName),
        ]);

        const budgetsData = Array.isArray(budgetsList) ? budgetsList : [];
        const invitationsCount = Array.isArray(invitations) ? invitations.length : 0;
        const membersCount = Array.isArray(members) ? members.length : 0;

        setOrgData(org);
        setCopilotBilling(copilot);
        setBudgets(budgetsData);
        setPendingInvitations(invitationsCount);
        setMemberCount(membersCount);

        // Helper to aggregate usage items into totals
        const aggregateUsage = (
          usageData: {
            usageItems?: Array<{
              grossAmount?: number;
              discountAmount?: number;
              netAmount?: number;
            }>;
          } | null,
        ) => {
          if (!usageData || !Array.isArray(usageData.usageItems)) {
            return { gross: 0, included: 0, net: 0 };
          }
          return usageData.usageItems.reduce(
            (acc, item) => ({
              gross: acc.gross + (item.grossAmount || 0),
              included: acc.included + (item.discountAmount || 0),
              net: acc.net + (item.netAmount || 0),
            }),
            { gross: 0, included: 0, net: 0 },
          );
        };

        // Calculate usage summaries for current and previous month
        const currentUsageTotals = aggregateUsage(currentMonthUsage);
        const previousUsageTotals = aggregateUsage(previousMonthUsage);
        const summaryData = {
          current: currentUsageTotals,
          previous: previousUsageTotals,
        };
        setUsageSummary(summaryData);

        // Process billing usage data for Actions and Copilot breakdown
        let actionsData = null;
        let storageData = null;
        let copilotTotalCost = 0;
        if (currentMonthUsage && Array.isArray(currentMonthUsage.usageItems)) {
          // Aggregate Actions minutes and Copilot costs
          let totalMinutes = 0;
          let ubuntuMinutes = 0;
          let macosMinutes = 0;
          let windowsMinutes = 0;
          let storageGross = 0;
          let storageDiscount = 0;

          currentMonthUsage.usageItems.forEach(item => {
            const product = (item.product || '').toLowerCase();
            const sku = (item.sku || '').toLowerCase();

            if (product === 'actions') {
              if (item.unitType === 'Minutes') {
                const qty = item.quantity || 0;
                totalMinutes += qty;
                if (sku.includes('linux')) ubuntuMinutes += qty;
                else if (sku.includes('macos')) macosMinutes += qty;
                else if (sku.includes('windows')) windowsMinutes += qty;
              } else if (sku.includes('storage')) {
                storageGross += item.grossAmount || 0;
                storageDiscount += item.discountAmount || 0;
              }
            } else if (product === 'copilot') {
              copilotTotalCost += item.netAmount || 0;
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

          if (storageGross > 0 || storageDiscount > 0) {
            storageData = { gross: storageGross, included: storageDiscount };
          }
        }

        setActionsBilling(actionsData);
        setActionsStorage(storageData);
        setCopilotCost(copilotTotalCost);
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
            usageSummary: summaryData,
            pendingInvitations: invitationsCount,
            memberCount: membersCount,
            actionsStorage: storageData,
            copilotCost: copilotTotalCost,
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

  // Calculate seat usage - use actual member count, not filled_seats (which includes pending invitations)
  const orgSeats = orgData?.plan
    ? {
        total: orgData.plan.seats || 0,
        used: memberCount,
        unused: Math.max(0, (orgData.plan.seats || 0) - memberCount - pendingInvitations),
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

      {/* OVERVIEW SECTION - Subscription + Metered/Included/Copilot Usage in one row */}
      <Box sx={{ mb: 4 }}>
        <Link
          href={`https://github.com/organizations/${orgName}/settings/billing`}
          target="_blank"
          rel="noopener"
          underline="hover"
          variant="h6"
          sx={{ display: 'block', mb: 1 }}
        >
          Overview
        </Link>
        <Grid container spacing={2}>
          {/* Subscription tile */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Subscription
                </Typography>
                <Typography variant="h4">
                  {formatCurrency(orgSeats ? orgSeats.total * config.billing.pricePerUserMonth : 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  GitHub{' '}
                  {orgData?.plan?.name
                    ? orgData.plan.name.charAt(0).toUpperCase() + orgData.plan.name.slice(1)
                    : '-'}{' '}
                  · per month
                </Typography>
                {orgSeats && orgSeats.total > 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {orgSeats.total} licenses · {formatCurrency(config.billing.pricePerUserMonth)}
                    /user
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          {/* Copilot usage tile */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Copilot
                </Typography>
                <Typography variant="h4">{formatCurrency(copilotCost)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {copilotBilling?.seat_breakdown?.total || 0} billable licenses
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {copilotBilling?.seat_breakdown?.active_this_cycle || 0} active this cycle
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          {/* Current metered usage tile */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Current metered usage
                </Typography>
                <Typography variant="h4">
                  {formatCurrency(usageSummary?.current.gross ?? 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Gross metered usage for{' '}
                  {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                </Typography>
                {usageSummary && usageSummary.previous.gross > 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Previous month: {formatCurrency(usageSummary.previous.gross)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          {/* Current included usage tile */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Current included usage
                </Typography>
                <Typography variant="h4">
                  {formatCurrency(usageSummary?.current.included ?? 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Included usage discounts for{' '}
                  {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                </Typography>
                {usageSummary && usageSummary.previous.included > 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Previous month: {formatCurrency(usageSummary.previous.included)}
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
        <Link
          href={`https://github.com/orgs/${orgName}/people`}
          target="_blank"
          rel="noopener"
          underline="hover"
          variant="h6"
          sx={{ display: 'block', mb: 1 }}
        >
          Seat Usage
        </Link>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Organisation Seats
                </Typography>
                {orgSeats ? (
                  <Grid container spacing={2}>
                    <Grid size={3}>
                      <Typography variant="body2" color="text.secondary">
                        Total
                      </Typography>
                      <Typography variant="h5">{orgSeats.total}</Typography>
                    </Grid>
                    <Grid size={3}>
                      <Typography variant="body2" color="text.secondary">
                        Used
                      </Typography>
                      <Typography variant="h5" color="success.main">
                        {orgSeats.used}
                      </Typography>
                    </Grid>
                    <Grid size={3}>
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
                    <Grid size={3}>
                      <Typography variant="body2" color="text.secondary">
                        Invitations
                      </Typography>
                      <Typography
                        variant="h5"
                        color={pendingInvitations > 0 ? 'info.main' : 'text.primary'}
                      >
                        {pendingInvitations}
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

      {/* ACTIONS SECTION */}
      <Box sx={{ mb: 4 }}>
        <Link
          href={`https://github.com/organizations/${orgName}/settings/billing/usage?query=product:actions`}
          target="_blank"
          rel="noopener"
          underline="hover"
          variant="h6"
          sx={{ display: 'block', mb: 1 }}
        >
          Actions
        </Link>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          GitHub Actions minutes and storage usage
        </Typography>
        {actionsBilling ? (
          <Card>
            <CardContent>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
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
                <Grid size={{ xs: 12, md: 4 }}>
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
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Storage
                  </Typography>
                  {actionsStorage ? (
                    <>
                      <Typography variant="h4">{formatCurrency(actionsStorage.gross)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatCurrency(actionsStorage.included)} included
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No storage usage
                    </Typography>
                  )}
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

      <Divider sx={{ my: 4 }} />

      {/* BUDGETS SECTION */}
      <Box sx={{ mb: 4 }}>
        <Link
          href={`https://github.com/organizations/${orgName}/settings/billing/budgets`}
          target="_blank"
          rel="noopener"
          underline="hover"
          variant="h6"
          sx={{ display: 'block', mb: 1 }}
        >
          Budgets
        </Link>
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
          rows={[...budgets].sort((a, b) => {
            const aName = a.budget_product_sku || '';
            const bName = b.budget_product_sku || '';
            return aName.localeCompare(bName);
          })}
          getRowId={row => row.id || row.product || Math.random().toString()}
          emptyMessage="No budgets configured"
        />
      </Box>
    </Box>
  );
}

export default Costs;
