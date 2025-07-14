/**
 * Audit Log Viewer Component
 * @module components/compliance/AuditLogViewer
 */

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@store/index';
import { 
  AuditLoggingService, 
  AuditLog, 
  AuditQuery,
  AuditAction,
  AuditResource 
} from '@services/compliance/audit-logging.service';
import { format } from 'date-fns';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '@components/common/LoadingSpinner';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';

const AuditLogViewer: React.FC = () => {
  const { user } = useSelector((state: RootState) => state._auth);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AuditQuery>({
    limit: 100
  });
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadLogs();
    }
  }, [user, filters]);

  const loadLogs = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const auditLogs = await AuditLoggingService.query({
        ...filters,
        userId: user.role === 'admin' || user.role === 'super_admin' ? undefined : user.uid
      });
      setLogs(auditLogs);
    } catch (_error) {
      console.error('Failed to load audit logs:', _error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const startDate = filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = filters.endDate || new Date();
      
      const csvData = await AuditLoggingService.exportLogs(startDate, endDate, 'csv');
      
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (_error) {
      console.error('Failed to export audit logs:', _error);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <ShieldCheckIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20';
      default:
        return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20';
    }
  };

  const formatAction = (action: string) => {
    return action.split('.').join(' ').toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Audit Logs</h2>
        <Button onClick={handleExport} variant="outline">
          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <FunnelIcon className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate ? format(filters.startDate, 'yyyy-MM-dd') : ''}
                onChange={(_e) => setFilters({
                  ...filters,
                  startDate: e.target.value ? new Date(e.target.value) : undefined
                })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate ? format(filters.endDate, 'yyyy-MM-dd') : ''}
                onChange={(_e) => setFilters({
                  ...filters,
                  endDate: e.target.value ? new Date(e.target.value) : undefined
                })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Action</label>
              <select
                value={filters.action || ''}
                onChange={(_e) => setFilters({
                  ...filters,
                  action: e.target.value as AuditAction || undefined
                })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">All Actions</option>
                <option value={AuditAction.LOGIN}>Login</option>
                <option value={AuditAction.LOGOUT}>Logout</option>
                <option value={AuditAction.ACCOUNT_CREATE}>Account Create</option>
                <option value={AuditAction.ACCOUNT_UPDATE}>Account Update</option>
                <option value={AuditAction.ACCOUNT_DELETE}>Account Delete</option>
                <option value={AuditAction.DATA_EXPORT}>Data Export</option>
                <option value={AuditAction.SETTINGS_UPDATE}>Settings Update</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Severity</label>
              <select
                value={filters.severity || ''}
                onChange={(_e) => setFilters({
                  ...filters,
                  severity: e.target.value as 'info' | 'warning' | 'critical' || undefined
                })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">All Severities</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No audit logs found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resource
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {logs.map((log) => (
                    <React.Fragment key={log.id}>
                      <tr
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id!)}
                      >
                        <td className="px-4 py-3 text-sm">
                          {format(log.timestamp as Date, 'yyyy-MM-dd HH:mm:ss')}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div>
                            <div className="font-medium">{log.userEmail}</div>
                            <div className="text-xs text-gray-500">{log.userId}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono">
                          {formatAction(log.action)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {log.resource}
                          {log.resourceId && (
                            <div className="text-xs text-gray-500">{log.resourceId}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            log.success
                              ? 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20'
                              : 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20'
                          }`}>
                            {log.success ? 'Success' : 'Failed'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${getSeverityColor(log.severity)}`}>
                            {getSeverityIcon(log.severity)}
                            <span className="ml-1">{log.severity}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {log.ipAddress || 'N/A'}
                        </td>
                      </tr>
                      {expandedLog === log.id && (
                        <tr>
                          <td colSpan={7} className="px-4 py-3 bg-gray-50 dark:bg-gray-800">
                            <div className="space-y-2">
                              <div>
                                <span className="font-medium">Details:</span>
                                <pre className="mt-1 text-xs bg-white dark:bg-gray-900 p-3 rounded overflow-x-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                              {log.errorMessage && (
                                <div>
                                  <span className="font-medium text-red-600">Error:</span>
                                  <p className="mt-1 text-sm">{log.errorMessage}</p>
                                </div>
                              )}
                              <div className="text-xs text-gray-500">
                                <div>Session ID: {log.sessionId || 'N/A'}</div>
                                <div>User Agent: {log.userAgent}</div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogViewer;