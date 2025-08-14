import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@components/admin/AdminLayout';
import { Card } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { AdminSupportService } from '@services/admin-support.service';
import { MessageSquareIcon, ClockIcon, CheckCircleIcon, AlertCircleIcon } from 'lucide-react';

interface Ticket {
  id: string;
  userId: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  lastUpdated: Date;
}

const AdminSupport: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadTickets();
  }, [filter]);

  const loadTickets = async () => {
    try {
      const data = await AdminSupportService.getTickets({ status: filter });
      setTickets(data);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircleIcon className="w-4 h-4 text-red-500" />;
      case 'in_progress': return <ClockIcon className="w-4 h-4 text-yellow-500" />;
      case 'resolved': return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      default: return <MessageSquareIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Support Tickets</h1>
          <div className="flex gap-2">
            <Input type="search" placeholder="Search tickets..." className="w-64" />
            <Button>New Ticket</Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {['all', 'open', 'in_progress', 'resolved', 'closed'].map(status => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(status)}
            >
              {status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>

        {/* Tickets List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-0">
              <div className="divide-y">
                {tickets.map(ticket => (
                  <div
                    key={ticket.id}
                    className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(ticket.status)}
                          <h3 className="font-medium">{ticket.subject}</h3>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>#{ticket.id}</span>
                          <span>•</span>
                          <span>{ticket.userId}</span>
                          <span>•</span>
                          <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Ticket Details */}
          <div>
            {selectedTicket ? (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Ticket Details</h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Subject</p>
                    <p className="font-medium">{selectedTicket.subject}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedTicket.status)}
                      <span className="capitalize">{selectedTicket.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Priority</p>
                    <span className={`px-2 py-1 text-xs rounded ${getPriorityColor(selectedTicket.priority)}`}>
                      {selectedTicket.priority}
                    </span>
                  </div>
                  <div className="pt-4 space-y-2">
                    <Button className="w-full" size="sm">Reply to Ticket</Button>
                    <Button className="w-full" size="sm" variant="outline">Change Status</Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-6">
                <p className="text-center text-muted-foreground">Select a ticket to view details</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSupport;