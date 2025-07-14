/**
 * Audit Log Viewer Component
 * @module components/admin/AuditLogViewer
 */

import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { AuditLogService, AuditLogSearchParams, AuditAction } from '@services/audit-log.service';
import { AuditLog } from '@src/types';

interface AuditLogViewerProps {
  userId?: string;
  actions?: AuditAction[];
  onLogClick?: (log: AuditLog) => void;
}

type SelectChangeEvent<T = string> = {
  target: {
    value: T;
  };
};

const AUDIT_ACTIONS = [
  { value: 'auth.login', label: 'Login' },
  { value: 'auth.logout', label: 'Logout' },
  { value: 'auth.failed_login', label: 'Failed Login' },
  { value: 'account.created', label: 'Account Created' },
  { value: 'account.updated', label: 'Account Updated' },
  { value: 'account.deleted', label: 'Account Deleted' },
  { value: 'backup.created', label: 'Backup Created' },
  { value: 'backup.restored', label: 'Backup Restored' },
  { value: 'subscription.updated', label: 'Subscription Updated' },
  { value: 'security.password_changed', label: 'Password Changed' },
  { value: 'security.2fa_enabled', label: '2FA Enabled' },
  { value: 'security.2fa_disabled', label: '2FA Disabled' },
];

const SEVERITIES = ['info', 'warning', 'critical'];

/**
 * Component for viewing and filtering audit logs
 */
const AuditLogViewer: React.FC<AuditLogViewerProps> = ({
  userId,
  actions: filterActions,
  onLogClick,
}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  
  const [filters, setFilters] = useState<AuditLogSearchParams>({
    actions: filterActions,
    severity: undefined,
    userId,
    startDate: undefined,
    endDate: undefined,
    // searchQuery not used in AuditLogSearchParams
  });

  const [tempFilters, setTempFilters] = useState(filters);

  /**
   * Load audit logs with current filters
   */
  const loadLogs = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const params: AuditLogSearchParams = {
        ...filters,
        // limit handled internally
        lastDoc: reset ? undefined : lastDoc,
      };

      const result = await AuditLogService.searchLogs(params);
      
      if (reset) {
        setLogs(result.logs);
        setPage(0);
      } else {
        setLogs(prev => [...prev, ...result.logs]);
      }
      
      setTotal(result.logs.length);
      if (result.logs.length > 0) {
        setLastDoc(result.lastDoc);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, rowsPerPage, lastDoc]);

  useEffect(() => {
    loadLogs(true);
  }, [filters.actions, filters.severity, filters.userId]);

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
    if (newPage > page && logs.length < total) {
      loadLogs(false);
    }
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
    loadLogs(true);
  };

  const handleFilterChange = (field: keyof AuditLogSearchParams) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent
  ) => {
    setTempFilters({
      ...tempFilters,
      [field]: event.target.value,
    });
  };

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    loadLogs(true);
  };

  const handleClearFilters = () => {
    const clearedFilters: AuditLogSearchParams = {
      actions: filterActions,
      userId,
    };
    setTempFilters(clearedFilters);
    setFilters(clearedFilters);
  };

  const handleRefresh = () => {
    loadLogs(true);
  };

  const getSeverityColor = (severity: string) => {
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
    const found = AUDIT_ACTIONS.find((a: any) => a.value === action);
    return found ? found.label : action;
  };

  const exportLogs = async () => {
    if (!filters.startDate || !filters.endDate) {
      alert('Please select a date range to export');
      return;
    }

    try {
      const csv = await AuditLogService.exportLogs(filters);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting logs:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Actions Filter */}
          <div>
            <label className="block text-sm font-medium mb-1">Actions</label>
            <select
              multiple
              value={tempFilters.actions || []}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, option => option.value);
                setTempFilters({ ...tempFilters, actions: values as AuditAction[] });
              }}
              className="w-full border border-gray-300 rounded-md p-2"
            >
              {AUDIT_ACTIONS.map((action: any) => (
                <option key={action.value} value={action.value}>
                  {action.label}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-sm font-medium mb-1">Severity</label>
            <select
              multiple
              value={tempFilters.severity || []}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, option => option.value);
                setTempFilters({ ...tempFilters, severity: values as any });
              }}
              className="w-full border border-gray-300 rounded-md p-2"
            >
              {SEVERITIES.map((severity: any) => (
                <option key={severity} value={severity}>
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="datetime-local"
              value={tempFilters.startDate?.toISOString().slice(0, 16) || ''}
              onChange={(e) => 
                setTempFilters({ ...tempFilters, startDate: e.target.value ? new Date(e.target.value) : undefined })
              }
              className="w-full border border-gray-300 rounded-md p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="datetime-local"
              value={tempFilters.endDate?.toISOString().slice(0, 16) || ''}
              onChange={(e) => 
                setTempFilters({ ...tempFilters, endDate: e.target.value ? new Date(e.target.value) : undefined })
              }
              className="w-full border border-gray-300 rounded-md p-2"
            />
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              value={''}  // searchQuery not used
              onChange={(e) => {}} // searchQuery not used
              placeholder="Search logs..."
              className="w-full border border-gray-300 rounded-md p-2"
            />
          </div>
        </div>

        {/* Filter Actions */}
        <div className="flex gap-2 mt-4">
          <button onClick={handleApplyFilters} className="btn btn-primary">
            Apply Filters
          </button>
          <button onClick={handleClearFilters} className="btn btn-outline">
            Clear Filters
          </button>
          <button onClick={handleRefresh} className="btn btn-outline">
            Refresh
          </button>
          <button onClick={exportLogs} className="btn btn-outline">
            Export CSV
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left">Timestamp</th>
                    <th className="px-4 py-2 text-left">Action</th>
                    <th className="px-4 py-2 text-left">User</th>
                    <th className="px-4 py-2 text-left">Resource</th>
                    <th className="px-4 py-2 text-left">Severity</th>
                    <th className="px-4 py-2 text-left">Success</th>
                    <th className="px-4 py-2 text-left">IP Address</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: any) => (
                    <tr key={log.id} className="border-t dark:border-gray-600">
                      <td className="px-4 py-2">
                        {format(log.timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss')}
                      </td>
                      <td className="px-4 py-2">{getActionLabel(log.action)}</td>
                      <td className="px-4 py-2">{log.userId || 'System'}</td>
                      <td className="px-4 py-2">{log.resource || '-'}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs bg-${getSeverityColor(log.severity)}-100 text-${getSeverityColor(log.severity)}-800`}>
                          {log.severity}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {log.success ? '✓' : '✗'}
                      </td>
                      <td className="px-4 py-2">{log.ipAddress || '-'}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => {
                            setSelectedLog(log);
                            onLogClick?.(log);
                          }}
                          className="text-primary hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center px-4 py-2 border-t dark:border-gray-600">
              <div>
                Showing {page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, total)} of {total}
              </div>
              <div className="flex gap-2">
                <select
                  value={rowsPerPage}
                  onChange={(e) => handleRowsPerPageChange(e as any)}
                  className="border border-gray-300 rounded-md px-2 py-1"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <button
                  onClick={() => handlePageChange(null, page - 1)}
                  disabled={page === 0}
                  className="btn btn-sm"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(null, page + 1)}
                  disabled={logs.length >= total}
                  className="btn btn-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Log Details Dialog */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Log Details</h2>
            <div className="space-y-2">
              <div><strong>ID:</strong> {selectedLog.id}</div>
              <div><strong>Timestamp:</strong> {format((selectedLog as any).timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss')}</div>
              <div><strong>Action:</strong> {getActionLabel((selectedLog as any).action)}</div>
              <div><strong>User ID:</strong> {(selectedLog as any).userId || 'System'}</div>
              <div><strong>Resource:</strong> {(selectedLog as any).resource || '-'}</div>
              <div><strong>Severity:</strong> {(selectedLog as any).severity}</div>
              <div><strong>Success:</strong> {(selectedLog as any).success ? 'Yes' : 'No'}</div>
              <div><strong>IP Address:</strong> {(selectedLog as any).ipAddress || '-'}</div>
              <div><strong>User Agent:</strong> {(selectedLog as any).userAgent || '-'}</div>
              {(selectedLog as any).errorMessage && (
                <div><strong>Error:</strong> {(selectedLog as any).errorMessage}</div>
              )}
              {(selectedLog as any).details && (
                <div>
                  <strong>Details:</strong>
                  <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded">
                    {JSON.stringify((selectedLog as any).details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedLog(null)}
              className="mt-4 btn btn-primary"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogViewer;