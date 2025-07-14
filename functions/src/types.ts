import {Request as ExpressRequest} from "express";

export interface AuthData {
  uid: string;
  token?: {
    email?: string;
    [key: string]: unknown;
  };
}

export interface UpdateSubscriptionData {
  userId: string;
  planId: string;
  paymentMethodId?: string;
}

export interface RecordUsageData {
  action: string;
  metadata?: Record<string, any>;
}

export interface SendAdminNotificationData {
  recipients: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface GetUserDetailsData {
  userId: string;
}

export interface UpdateUserSubscriptionData {
  userId: string;
  plan: string;
  validUntil: number;
  features: string[];
}

export interface GetGlobalStatsData {
  [key: string]: unknown;
}

export interface GetUserAnalyticsData {
  userId: string;
  startDate?: string;
  endDate?: string;
}

export interface RecordSecurityEventData {
  eventType: string;
  metadata?: Record<string, any>;
}

export interface VerifyDeviceData {
  deviceId: string;
  metadata?: Record<string, any>;
}

export interface CreateBackupData {
  encryptedData: string;
  metadata?: Record<string, any>;
}

export interface RestoreBackupData {
  backupId: string;
}

export interface ScheduleBackupData {
  schedule: string;
  autoBackup: boolean;
}

export interface CreateUserData {
  email: string;
  displayName?: string;
}

export interface UpdateUserData {
  userId: string;
  updates: {
    disabled?: boolean;
    displayName?: string;
    email?: string;
    customClaims?: Record<string, any>;
  };
}

export interface DeleteUserData {
  userId: string;
}

export interface ListUsersData {
  pageToken?: string;
  maxResults?: number;
}

export interface GetAnalyticsData {
  startDate: string;
  endDate: string;
  metrics?: string[];
}

export interface CreateSupportTicketData {
  userId: string;
  subject: string;
  message: string;
  priority?: string;
}

export interface UpdateTicketData {
  ticketId: string;
  updates: {
    status?: string;
    response?: string;
    assignedTo?: string;
  };
}

export interface CustomRequest extends ExpressRequest {
  rawBody?: Buffer;
}

export type StripeEventTypes = 
  | "checkout.session.completed"
  | "customer.subscription.updated"
  | "customer.subscription.deleted"
  | "payment_intent.succeeded"
  | "payment_intent.payment_failed";

export interface StripeWebhookEvent {
  type: StripeEventTypes;
  data: any;
  id: string;
}

export interface FirebaseAuthRequest<T = any> {
  auth?: AuthData;
  data: T;
  rawRequest: unknown;
}