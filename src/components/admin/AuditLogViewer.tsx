/**
 * Audit Log Viewer Component
 * @module components/admin/AuditLogViewer
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  TextField,
  MenuItem,
  Grid,
  Button,
  CircularProgress,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { AuditLogService, AuditLogSearchParams, AuditAction } from '@services/audit-log.service';
import { AuditLog } from '@src/types';
import { DocumentSnapshot } from 'firebase/firestore';

interface AuditLogViewerProps {
  userId?: string; // Optional: filter by specific user
  showStats?: boolean; // Show statistics summary
}

const AUDIT_ACTIONS: { value: AuditAction; label: string; category: string }[] = [
  // Authentication
  { value: 'auth.login', label: 'Login', category: 'Authentication' },
  { value: 'auth.logout', label: 'Logout', category: 'Authentication' },
  { value: 'auth.signup', label: 'Sign Up', category: 'Authentication' },
  { value: 'auth.failed_login', label: 'Failed Login', category: 'Authentication' },
  { value: 'auth.password_reset', label: 'Password Reset', category: 'Authentication' },
  { value: 'auth.password_changed', label: 'Password Changed', category: 'Authentication' },
  { value: 'auth.account_locked', label: 'Account Locked', category: 'Authentication' },
  { value: 'auth.suspicious_activity', label: 'Suspicious Activity', category: 'Authentication' },
  
  // Account Management
  { value: 'account.created', label: 'Account Created', category: 'Account' },
  { value: 'account.updated', label: 'Account Updated', category: 'Account' },
  { value: 'account.deleted', label: 'Account Deleted', category: 'Account' },
  { value: 'account.exported', label: 'Accounts Exported', category: 'Account' },
  { value: 'account.imported', label: 'Accounts Imported', category: 'Account' },
  
  // Security
  { value: 'security.biometric_enabled', label: 'Biometric Enabled', category: 'Security' },
  { value: 'security.biometric_disabled', label: 'Biometric Disabled', category: 'Security' },
  { value: 'security.biometric_auth_success', label: 'Biometric Auth Success', category: 'Security' },
  { value: 'security.biometric_auth_failed', label: 'Biometric Auth Failed', category: 'Security' },
  
  // Admin Actions
  { value: 'admin.user_data_accessed', label: 'User Data Accessed', category: 'Admin' },
  { value: 'admin.subscription_changed', label: 'Subscription Changed', category: 'Admin' },
  { value: 'admin.user_disabled', label: 'User Disabled', category: 'Admin' },
  { value: 'admin.user_enabled', label: 'User Enabled', category: 'Admin' },
];

const SEVERITIES = ['info', 'warning', 'critical'] as const;

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ userId, showStats = true }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [stats, setStats] = useState<any>(null);
  
  // Filters
  const [filters, setFilters] = useState<AuditLogSearchParams>({
    userId,
    actions: [],
    severity: [],
    startDate: undefined,
    endDate: undefined,
    success: undefined,
  });
  
  const [tempFilters, setTempFilters] = useState(filters);

  // Load audit logs
  const loadLogs = useCallback(async (resetPagination = false) => {
    setLoading(true);
    try {
      const searchParams: AuditLogSearchParams = {
        ...filters,
        pageSize,
        lastDoc: resetPagination ? undefined : lastDoc || undefined,
      };
      
      const result = await AuditLogService.searchLogs(searchParams);
      
      if (resetPagination) {
        setLogs(result.logs);
        setPage(0);
      } else {
        setLogs(prev => [...prev, ...result.logs]);
      }
      
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
      
      // Load stats if enabled
      if (showStats && resetPagination) {
        const statsData = await AuditLogService.getStats(
          filters.userId,
          filters.startDate,
          filters.endDate
        );
        setStats(statsData);
      }
    } catch (_error) {
      console.error('Error loading audit logs:', _error);
    } finally {
      setLoading(false);
    }
  }, [filters, pageSize, lastDoc, showStats]);

  useEffect(() => {
    loadLogs(true);
  }, [filters]);

  const handleApplyFilters = () => {
    setFilters(tempFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      userId,
      actions: [],
      severity: [],
      startDate: undefined,
      endDate: undefined,
      success: undefined,
    };
    setTempFilters(clearedFilters);
    setFilters(clearedFilters);
  };

  const handlePageChange = (_: unknown, newPage: number) => {
    setPage(newPage);
    if (newPage > page && hasMore) {
      loadLogs(false);
    }
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPageSize(parseInt(event.target.value, 10));
    setPage(0);
    setLastDoc(null);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon color="error" fontSize="small" />;
      case 'warning':
        return <WarningIcon color="warning" fontSize="small" />;
      default:
        return <InfoIcon color="info" fontSize="small" />;
    }
  };

  const getSeverityColor = (severity: string): 'error' | 'warning' | 'info' => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getActionLabel = (action: string) => {
    const found = AUDIT_ACTIONS.find(a => a.value === action);
    return found ? found.label : action;
  };

  const exportLogs = async () => {
    if (!filters.startDate || !filters.endDate) {
      alert('Please select a date range to export');
      return;
    }
    
    try {
      const csv = await AuditLogService.exportLogs(
        filters.userId || '',
        filters.startDate,
        filters.endDate
      );
      
      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (_error) {
      console.error('Error exporting logs:', _error);
    }
  };

  return (
    <Box>
      {/* Stats Summary */}
      {showStats && stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4">{stats.totalEvents}</Typography>
              <Typography color="textSecondary">Total Events</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="error">{stats.failedAttempts}</Typography>
              <Typography color="textSecondary">Failed Attempts</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">{stats.suspiciousActivities}</Typography>
              <Typography color="textSecondary">Suspicious Activities</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4">{stats.uniqueUsers}</Typography>
              <Typography color="textSecondary">Unique Users</Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Actions</InputLabel>
              <Select
                multiple
                value={tempFilters.actions || []}
                onChange={(_e: SelectChangeEvent<string[]>) => 
                  setTempFilters({ ...tempFilters, actions: e.target.value as AuditAction[] })
                }
                label="Actions"
              >
                {AUDIT_ACTIONS.map(action => (
                  <MenuItem key={action.value} value={action.value}>
                    {action.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Severity</InputLabel>
              <Select
                multiple
                value={tempFilters.severity || []}
                onChange={(_e: SelectChangeEvent<string[]>) => 
                  setTempFilters({ ...tempFilters, severity: e.target.value as unknown })
                }
                label="Severity"
              >
                {SEVERITIES.map(severity => (
                  <MenuItem key={severity} value={severity}>
                    {severity.charAt(0).toUpperCase() + severity.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              type="date"
              label="Start Date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={tempFilters.startDate ? format(tempFilters.startDate, 'yyyy-MM-dd') : ''}
              onChange={(_e) => 
                setTempFilters({ ...tempFilters, startDate: e.target.value ? new Date(e.target.value) : undefined })
              }
            />
          </Grid>
          
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              type="date"
              label="End Date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={tempFilters.endDate ? format(tempFilters.endDate, 'yyyy-MM-dd') : ''}
              onChange={(_e) => 
                setTempFilters({ ...tempFilters, endDate: e.target.value ? new Date(e.target.value) : undefined })
              }
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Box display="flex" gap={1}>
              <Button
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={handleApplyFilters}
                size="small"
                fullWidth
              >
                Apply Filters
              </Button>
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={handleClearFilters}
                size="small"
              >
                Clear
              </Button>
              <IconButton onClick={() => loadLogs(true)} size="small">
                <RefreshIcon />
              </IconButton>
              <IconButton onClick={exportLogs} size="small">
                <DownloadIcon />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Logs Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Resource</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>IP Address</TableCell>
              <TableCell>Device</TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="textSecondary">No audit logs found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Typography variant="body2">
                      {format(log.timestamp, 'yyyy-MM-dd HH:mm:ss')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getSeverityIcon((log as unknown).severity || 'info')}
                      <Typography variant="body2">
                        {getActionLabel(log.action)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                      {log.userId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                      {log.resource}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={(log as unknown).success ? 'Success' : 'Failed'}
                      color={(log as unknown).success ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {log.ipAddress || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {log.deviceId || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => setSelectedLog(log)}>
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={hasMore ? -1 : logs.length}
          rowsPerPage={pageSize}
          page={page}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      </TableContainer>

      {/* Details Dialog */}
      <Dialog
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedLog && (
          <>
            <DialogTitle>
              Audit Log Details
              <Chip
                label={(selectedLog as unknown).severity || 'info'}
                color={getSeverityColor((selectedLog as unknown).severity || 'info')}
                size="small"
                sx={{ ml: 2 }}
              />
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">Timestamp</Typography>
                  <Typography>{format(selectedLog.timestamp, 'PPpp')}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">Action</Typography>
                  <Typography>{getActionLabel(selectedLog.action)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">User ID</Typography>
                  <Typography>{selectedLog.userId}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">Resource</Typography>
                  <Typography>{selectedLog.resource}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">IP Address</Typography>
                  <Typography>{selectedLog.ipAddress || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">Device ID</Typography>
                  <Typography>{selectedLog.deviceId || 'N/A'}</Typography>
                </Grid>
                {(selectedLog as unknown).errorMessage && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">Error Message</Typography>
                    <Typography color="error">{(selectedLog as unknown).errorMessage}</Typography>
                  </Grid>
                )}
                {selectedLog.details && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">Additional Details</Typography>
                    <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(selectedLog.details, null, 2)}
                      </pre>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedLog(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};