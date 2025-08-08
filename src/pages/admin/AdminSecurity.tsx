import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@components/admin/AdminLayout';
import { Card } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { ShieldAlertIcon, LockIcon, AlertTriangleIcon, ActivityIcon } from 'lucide-react';
import AuditLogViewer from '@components/admin/AuditLogViewer';

interface SecurityEvent {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high';
  userId?: string;
}

const AdminSecurity: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState({
    failedLogins: 0,
    suspiciousActivities: 0,
    blockedIPs: 0,
    activeThreats: 0
  });

  useEffect(() => {
    // Mock data for now
    setEvents([
      {
        id: '1',
        type: 'failed_login',
        description: 'Multiple failed login attempts',
        timestamp: new Date(),
        severity: 'medium',
        userId: 'user123'
      }
    ]);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Security Monitoring</h1>

        {/* Security Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed Logins (24h)</p>
                <p className="text-xl font-bold">{stats.failedLogins}</p>
              </div>
              <LockIcon className="w-6 h-6 text-red-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Suspicious Activities</p>
                <p className="text-xl font-bold">{stats.suspiciousActivities}</p>
              </div>
              <AlertTriangleIcon className="w-6 h-6 text-yellow-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Blocked IPs</p>
                <p className="text-xl font-bold">{stats.blockedIPs}</p>
              </div>
              <ShieldAlertIcon className="w-6 h-6 text-orange-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Threats</p>
                <p className="text-xl font-bold">{stats.activeThreats}</p>
              </div>
              <ActivityIcon className="w-6 h-6 text-purple-500" />
            </div>
          </Card>
        </div>

        {/* Recent Security Events */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Security Events</h2>
          <div className="space-y-3">
            {events.map(event => (
              <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangleIcon className={`w-5 h-5 ${getSeverityColor(event.severity)}`} />
                  <div>
                    <p className="font-medium">{event.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {event.timestamp.toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline">Investigate</Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Security Actions */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Security Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline">View Blocked IPs</Button>
            <Button variant="outline">Security Rules</Button>
            <Button variant="outline">Export Security Log</Button>
            <Button variant="outline">Configure Alerts</Button>
          </div>
        </Card>

        {/* Audit Log */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Audit Log</h2>
          <AuditLogViewer 
            onLogClick={(log) => {
              console.log('Log clicked:', log);
              // Could open a modal with more details
            }}
          />
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSecurity;