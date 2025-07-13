/**
 * Admin user management service
 * @module services/admin-user-management
 */

import { User } from '@src/types';
import { UserSubscription, SubscriptionTier } from '@src/types/subscription';
import { FirestoreService } from './firestore.service';
import { LicenseManagementService } from './license-management.service';

export interface AdminUser extends User {
  subscription?: UserSubscription;
  lastLoginAt?: Date;
  accountsCount: number;
  backupsCount: number;
  storageUsed: number;
  violations: number;
  riskScore: number;
  status: 'active' | 'suspended' | 'banned' | 'pending_verification';
}

export interface UserAction {
  id: string;
  userId: string;
  adminId: string;
  action: 'suspend' | 'ban' | 'unsuspend' | 'delete' | 'upgrade' | 'downgrade' | 'reset_password' | 'send_notification';
  reason: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface BulkAction {
  action: 'suspend' | 'ban' | 'send_notification' | 'export_data' | 'delete';
  userIds: string[];
  reason: string;
  scheduledFor?: Date;
}

export interface UserFilter {
  tier?: SubscriptionTier;
  status?: 'active' | 'suspended' | 'banned' | 'pending_verification';
  registeredAfter?: Date;
  registeredBefore?: Date;
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
  country?: string;
  riskScore?: { min: number; max: number };
  violations?: { min: number; max: number };
  searchQuery?: string;
}

export class AdminUserManagementService {
  
  /**
   * Get paginated list of users with admin details
   */
  static async getUsers(
    page: number = 1,
    limit: number = 50,
    filter?: UserFilter,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{
    users: AdminUser[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const filters: any[] = [];
      
      // Apply filters
      if (filter?.tier) {
        // We'll need to join with subscriptions, for now skip this filter
      }
      
      if (filter?.status) {
        filters.push({ field: 'status', operator: '==', value: filter.status });
      }
      
      if (filter?.registeredAfter) {
        filters.push({ field: 'createdAt', operator: '>', value: filter.registeredAfter });
      }
      
      if (filter?.registeredBefore) {
        filters.push({ field: 'createdAt', operator: '<', value: filter.registeredBefore });
      }

      const result = await FirestoreService.getCollection(
        'users',
        filters,
        { limit, offset: (page - 1) * limit }
      );

      if (!result.success) {
        throw new Error('Failed to fetch users');
      }

      // Enhance users with admin-specific data
      const enhancedUsers = await Promise.all(
        result.data.map(user => this.enhanceUserWithAdminData(user as User))
      );

      // Apply client-side filters that couldn't be done at database level
      let filteredUsers = enhancedUsers;
      
      if (filter?.tier) {
        filteredUsers = filteredUsers.filter(user => 
          user.subscription?.tier === filter.tier
        );
      }
      
      if (filter?.riskScore) {
        filteredUsers = filteredUsers.filter(user =>
          user.riskScore >= filter.riskScore!.min && 
          user.riskScore <= filter.riskScore!.max
        );
      }
      
      if (filter?.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        filteredUsers = filteredUsers.filter(user =>
          user.email.toLowerCase().includes(query) ||
          user.displayName?.toLowerCase().includes(query) ||
          user.id.includes(query)
        );
      }

      // Sort users
      filteredUsers.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (sortBy) {
          case 'email':
            aValue = a.email;
            bValue = b.email;
            break;
          case 'createdAt':
            aValue = a.createdAt;
            bValue = b.createdAt;
            break;
          case 'lastLoginAt':
            aValue = a.lastLoginAt || new Date(0);
            bValue = b.lastLoginAt || new Date(0);
            break;
          case 'riskScore':
            aValue = a.riskScore;
            bValue = b.riskScore;
            break;
          default:
            aValue = a.createdAt;
            bValue = b.createdAt;
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      const total = filteredUsers.length;
      const totalPages = Math.ceil(total / limit);

      return {
        users: filteredUsers,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      console.error('Error getting users:', error);
      throw error;
    }
  }

  /**
   * Get detailed user information
   */
  static async getUserDetails(userId: string): Promise<AdminUser> {
    try {
      const userResult = await FirestoreService.getDocument('users', userId);
      
      if (!userResult.success || !userResult.data) {
        throw new Error('User not found');
      }

      return await this.enhanceUserWithAdminData(userResult.data as User);
    } catch (error) {
      console.error('Error getting user details:', error);
      throw error;
    }
  }

  /**
   * Suspend a user account
   */
  static async suspendUser(
    userId: string,
    adminId: string,
    reason: string,
    duration?: number // Duration in days
  ): Promise<void> {
    try {
      const suspendedUntil = duration 
        ? new Date(Date.now() + (duration * 24 * 60 * 60 * 1000))
        : undefined;

      await FirestoreService.updateDocument('users', userId, {
        status: 'suspended',
        suspendedAt: new Date(),
        suspendedUntil,
        suspendedBy: adminId,
        suspendedReason: reason,
        updatedAt: new Date(),
      });

      // Log admin action
      await this.logUserAction(userId, adminId, 'suspend', reason, {
        duration,
        suspendedUntil,
      });

      // Optionally send notification to user
      await this.sendUserNotification(userId, 'account_suspended', {
        reason,
        suspendedUntil,
      });
    } catch (error) {
      console.error('Error suspending user:', error);
      throw error;
    }
  }

  /**
   * Ban a user account permanently
   */
  static async banUser(
    userId: string,
    adminId: string,
    reason: string
  ): Promise<void> {
    try {
      await FirestoreService.updateDocument('users', userId, {
        status: 'banned',
        bannedAt: new Date(),
        bannedBy: adminId,
        bannedReason: reason,
        updatedAt: new Date(),
      });

      // Cancel active subscriptions
      await this.cancelUserSubscriptions(userId, 'Account banned');

      // Log admin action
      await this.logUserAction(userId, adminId, 'ban', reason);

      // Send notification
      await this.sendUserNotification(userId, 'account_banned', { reason });
    } catch (error) {
      console.error('Error banning user:', error);
      throw error;
    }
  }

  /**
   * Reactivate a suspended user
   */
  static async unsuspendUser(
    userId: string,
    adminId: string,
    reason: string
  ): Promise<void> {
    try {
      await FirestoreService.updateDocument('users', userId, {
        status: 'active',
        suspendedAt: null,
        suspendedUntil: null,
        suspendedBy: null,
        suspendedReason: null,
        reactivatedAt: new Date(),
        reactivatedBy: adminId,
        updatedAt: new Date(),
      });

      // Log admin action
      await this.logUserAction(userId, adminId, 'unsuspend', reason);

      // Send notification
      await this.sendUserNotification(userId, 'account_reactivated', { reason });
    } catch (error) {
      console.error('Error unsuspending user:', error);
      throw error;
    }
  }

  /**
   * Delete a user account and all associated data
   */
  static async deleteUser(
    userId: string,
    adminId: string,
    reason: string
  ): Promise<void> {
    try {
      // Cancel subscriptions first
      await this.cancelUserSubscriptions(userId, 'Account deletion');

      // Delete user data in batches
      const collections = [
        `users/${userId}/accounts`,
        `users/${userId}/subscriptions`,
        `users/${userId}/backups`,
        `users/${userId}/devices`,
      ];

      for (const collectionPath of collections) {
        const result = await FirestoreService.getCollection(collectionPath);
        if (result.success) {
          for (const doc of result.data) {
            await FirestoreService.deleteDocument(collectionPath, doc.id);
          }
        }
      }

      // Delete user profile
      await FirestoreService.deleteDocument('users', userId);

      // Log admin action
      await this.logUserAction(userId, adminId, 'delete', reason);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Perform bulk actions on multiple users
   */
  static async performBulkAction(
    bulkAction: BulkAction,
    adminId: string
  ): Promise<{
    success: number;
    failed: number;
    errors: Array<{ userId: string; error: string }>;
  }> {
    let success = 0;
    let failed = 0;
    const errors: Array<{ userId: string; error: string }> = [];

    for (const userId of bulkAction.userIds) {
      try {
        switch (bulkAction.action) {
          case 'suspend':
            await this.suspendUser(userId, adminId, bulkAction.reason);
            break;
          case 'ban':
            await this.banUser(userId, adminId, bulkAction.reason);
            break;
          case 'delete':
            await this.deleteUser(userId, adminId, bulkAction.reason);
            break;
          case 'send_notification':
            await this.sendUserNotification(userId, 'admin_message', {
              message: bulkAction.reason,
            });
            break;
          default:
            throw new Error(`Unsupported bulk action: ${bulkAction.action}`);
        }
        success++;
      } catch (error) {
        failed++;
        errors.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { success, failed, errors };
  }

  /**
   * Get user action history
   */
  static async getUserActionHistory(
    userId: string,
    limit: number = 50
  ): Promise<UserAction[]> {
    try {
      const result = await FirestoreService.getCollection(
        'user_actions',
        [{ field: 'userId', operator: '==', value: userId }],
        { limit, orderBy: { field: 'createdAt', direction: 'desc' } }
      );

      return result.success ? result.data as UserAction[] : [];
    } catch (error) {
      console.error('Error getting user action history:', error);
      return [];
    }
  }

  /**
   * Generate user data export
   */
  static async exportUserData(userId: string): Promise<{
    user: User;
    accounts: any[];
    subscriptions: UserSubscription[];
    usage: any[];
    actions: UserAction[];
  }> {
    try {
      // Get user profile
      const userResult = await FirestoreService.getDocument('users', userId);
      const user = userResult.data as User;

      // Get user accounts
      const accountsResult = await FirestoreService.getCollection(`users/${userId}/accounts`);
      const accounts = accountsResult.success ? accountsResult.data : [];

      // Get subscriptions
      const subscriptionsResult = await FirestoreService.getCollection(`users/${userId}/subscriptions`);
      const subscriptions = subscriptionsResult.success ? subscriptionsResult.data as UserSubscription[] : [];

      // Get usage data
      const usageResult = await FirestoreService.getCollection(
        'usage',
        [{ field: 'userId', operator: '==', value: userId }]
      );
      const usage = usageResult.success ? usageResult.data : [];

      // Get action history
      const actions = await this.getUserActionHistory(userId, 1000);

      return {
        user,
        accounts,
        subscriptions,
        usage,
        actions,
      };
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }

  // Helper methods

  private static async enhanceUserWithAdminData(user: User): Promise<AdminUser> {
    try {
      // Get subscription info
      const subscriptionsResult = await FirestoreService.getCollection(
        `users/${user.id}/subscriptions`,
        [{ field: 'status', operator: 'in', value: ['active', 'trialing', 'past_due'] }]
      );
      
      const subscription = subscriptionsResult.success && subscriptionsResult.data.length > 0
        ? subscriptionsResult.data[0] as UserSubscription
        : undefined;

      // Get usage stats
      const usage = await LicenseManagementService.getCurrentUsage(user.id);

      // Get violations count
      const violationsResult = await FirestoreService.getCollection(
        'license_violations',
        [{ field: 'userId', operator: '==', value: user.id }]
      );
      const violations = violationsResult.success ? violationsResult.data.length : 0;

      // Calculate risk score (simplified)
      const riskScore = this.calculateRiskScore(user, violations, usage);

      return {
        ...user,
        subscription,
        accountsCount: usage.accounts,
        backupsCount: usage.backups,
        storageUsed: usage.storageUsed,
        violations,
        riskScore,
        status: user.status || 'active',
      };
    } catch (error) {
      console.error('Error enhancing user with admin data:', error);
      return {
        ...user,
        accountsCount: 0,
        backupsCount: 0,
        storageUsed: 0,
        violations: 0,
        riskScore: 0,
        status: 'active',
      };
    }
  }

  private static calculateRiskScore(user: User, violations: number, usage: any): number {
    let score = 0;

    // Factor in violations
    score += violations * 10;

    // Factor in account age (newer accounts are higher risk)
    const accountAge = Date.now() - user.createdAt.getTime();
    const daysSinceRegistration = accountAge / (24 * 60 * 60 * 1000);
    if (daysSinceRegistration < 7) score += 20;
    else if (daysSinceRegistration < 30) score += 10;

    // Factor in usage patterns
    if (usage.accounts > 100) score += 15; // Unusually high account count
    if (usage.apiCalls > 10000) score += 10; // High API usage

    // Factor in login patterns
    const lastLogin = user.lastLoginAt || user.createdAt;
    const daysSinceLogin = (Date.now() - lastLogin.getTime()) / (24 * 60 * 60 * 1000);
    if (daysSinceLogin > 90) score += 5; // Inactive users

    return Math.min(score, 100); // Cap at 100
  }

  private static async logUserAction(
    userId: string,
    adminId: string,
    action: UserAction['action'],
    reason: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      const userAction: UserAction = {
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        adminId,
        action,
        reason,
        metadata,
        createdAt: new Date(),
      };

      await FirestoreService.addDocument('user_actions', userAction);
    } catch (error) {
      console.error('Error logging user action:', error);
    }
  }

  private static async sendUserNotification(
    userId: string,
    type: string,
    data: Record<string, unknown>
  ): Promise<void> {
    try {
      // This would integrate with a notification service
      console.log(`Sending ${type} notification to user ${userId}:`, data);
    } catch (error) {
      console.error('Error sending user notification:', error);
    }
  }

  private static async cancelUserSubscriptions(userId: string, reason: string): Promise<void> {
    try {
      const subscriptionsResult = await FirestoreService.getCollection(
        `users/${userId}/subscriptions`,
        [{ field: 'status', operator: 'in', value: ['active', 'trialing', 'past_due'] }]
      );

      if (subscriptionsResult.success) {
        for (const subscription of subscriptionsResult.data) {
          await FirestoreService.updateDocument(
            `users/${userId}/subscriptions`,
            subscription.id,
            {
              status: 'canceled',
              canceledAt: new Date(),
              canceledReason: reason,
              updatedAt: new Date(),
            }
          );
        }
      }
    } catch (error) {
      console.error('Error canceling user subscriptions:', error);
    }
  }
}