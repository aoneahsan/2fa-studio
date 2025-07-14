/**
 * Admin support ticket system service
 * @module services/admin-support
 */

import { FirestoreService } from './firestore.service';

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'technical' | 'billing' | 'account' | 'feature_request' | 'bug_report';
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  responses: TicketResponse[];
}

export interface TicketResponse {
  id: string;
  ticketId: string;
  authorId: string;
  authorType: 'user' | 'admin';
  message: string;
  attachments?: string[];
  createdAt: Date;
}

export class AdminSupportService {
  
  static async getTickets(filters?: {
    status?: string;
    priority?: string;
    assignedTo?: string;
  }): Promise<SupportTicket[]> {
    const queryFilters: unknown[] = [];
    
    if (filters?.status) {
      queryFilters.push({ field: 'status', operator: '==', value: filters.status });
    }
    
    const result = await FirestoreService.getCollection('support_tickets', queryFilters);
    return result.success ? result.data as SupportTicket[] : [];
  }

  static async createTicket(ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'responses'>): Promise<string> {
    const newTicket = {
      ...ticket,
      createdAt: new Date(),
      updatedAt: new Date(),
      responses: [],
    };
    
    const result = await FirestoreService.addDocument('support_tickets', newTicket);
    return result.id;
  }

  static async respondToTicket(
    ticketId: string,
    authorId: string,
    authorType: 'user' | 'admin',
    message: string
  ): Promise<void> {
    const response: TicketResponse = {
      id: `response_${Date.now()}`,
      ticketId,
      authorId,
      authorType,
      message,
      createdAt: new Date(),
    };

    const ticket = await FirestoreService.getDocument('support_tickets', ticketId);
    if (ticket.success && ticket.data) {
      const responses = [...(ticket.data.responses || []), response];
      await FirestoreService.updateDocument('support_tickets', ticketId, {
        responses,
        updatedAt: new Date(),
        status: authorType === 'admin' ? 'in_progress' : (ticket as any).data.status,
      });
    }
  }

  static async updateTicketStatus(
    ticketId: string,
    status: SupportTicket['status'],
    adminId: string
  ): Promise<void> {
    const updateData: unknown = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'resolved' || status === 'closed') {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = adminId;
    }

    await FirestoreService.updateDocument('support_tickets', ticketId, updateData);
  }
}