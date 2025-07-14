/**
 * Admin Service for managing users and subscriptions
 * @module services/admin
 */

import {
	collection,
	doc,
	getDoc,
	getDocs,
	updateDoc,
	query,
	where,
	orderBy,
	limit,
	startAfter,
	DocumentSnapshot,
	addDoc,
	serverTimestamp,
	Timestamp,
	runTransaction,
	QueryConstraint,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, auth } from '@src/config/firebase';
import {
	User,
	AdminStats,
	SubscriptionTier,
	SubscriptionStatus,
	AdminAction,
	UserRole,
} from '@src/types';
import { AuditLogService } from '@services/audit-log.service';

export interface UserSearchParams {
	searchTerm?: string;
	subscriptionTier?: SubscriptionTier;
	subscriptionStatus?: SubscriptionStatus;
	sortBy?: 'createdAt' | 'lastLogin' | 'email';
	sortOrder?: 'asc' | 'desc';
	pageSize?: number;
	lastDoc?: DocumentSnapshot;
}

export interface UserUpdateParams {
	userId: string;
	updates: {
		subscriptionTier?: SubscriptionTier;
		subscriptionStatus?: SubscriptionStatus;
		accountLimit?: number | null;
		role?: UserRole;
		disabled?: boolean;
	};
	reason: string;
}

export class AdminService {
	private static functions = getFunctions();

	/**
	 * Check if current user is admin
	 */
	static async isAdmin(): Promise<boolean> {
		try {
			const currentUser = auth.currentUser;
			if (!currentUser) return false;

			const idTokenResult = await currentUser.getIdTokenResult();
			return (
				idTokenResult.claims.role === 'admin' ||
				idTokenResult.claims.role === 'super_admin'
			);
		} catch (error) {
			console.error('Error checking admin status:', error);
			return false;
		}
	}

	/**
	 * Check if current user is super admin
	 */
	static async isSuperAdmin(): Promise<boolean> {
		try {
			const currentUser = auth.currentUser;
			if (!currentUser) return false;

			const idTokenResult = await currentUser.getIdTokenResult();
			return idTokenResult.claims.role === 'super_admin';
		} catch (error) {
			console.error('Error checking super admin status:', error);
			return false;
		}
	}

	/**
	 * Get admin dashboard statistics
	 */
	static async getDashboardStats(): Promise<AdminStats> {
		try {
			const getStats = httpsCallable<void, AdminStats>(
				this.functions,
				'getAdminStats'
			);
			const result = await getStats();
			return result.data;
		} catch (error) {
			console.error('Error getting dashboard stats:', error);
			throw error;
		}
	}

	/**
	 * Search and filter users
	 */
	static async searchUsers(params: UserSearchParams): Promise<{
		users: User[];
		lastDoc: DocumentSnapshot | null;
		hasMore: boolean;
	}> {
		try {
			const q = collection(db, 'users');
			const constraints: QueryConstraint[] = [];

			// Add filters
			if (params.subscriptionTier) {
				constraints.push(
					where('subscription.tier', '==', params.subscriptionTier)
				);
			}
			if (params.subscriptionStatus) {
				constraints.push(
					where('subscription.status', '==', params.subscriptionStatus)
				);
			}

			// Add sorting
			const sortField = params.sortBy || 'createdAt';
			const sortOrder = params.sortOrder || 'desc';
			constraints.push(orderBy(sortField, sortOrder));

			// Add pagination
			const pageSize = params.pageSize || 20;
			constraints.push(limit(pageSize + 1));

			if (params.lastDoc) {
				constraints.push(startAfter(params.lastDoc));
			}

			// Execute query
			const queryRef = query(q, ...constraints);
			const snapshot = await getDocs(queryRef);

			const users: User[] = [];
			let lastDocSnapshot: DocumentSnapshot | null = null;

			snapshot.docs.slice(0, pageSize).forEach((doc) => {
				const userData = doc.data();
				if (userData) {
					users.push({ id: doc.id, ...userData } as User);
					lastDocSnapshot = doc;
				}
			});

			const hasMore = snapshot.docs.length > pageSize;

			// If search term provided, filter results client-side
			if (params.searchTerm) {
				const term = params.searchTerm.toLowerCase();
				return {
					users: users.filter(
						(user: any) =>
							user.email.toLowerCase().includes(term) ||
							user.displayName?.toLowerCase().includes(term)
					),
					lastDoc: lastDocSnapshot,
					hasMore,
				};
			}

			return { users, lastDoc: lastDocSnapshot, hasMore };
		} catch (error) {
			console.error('Error searching users:', error);
			throw error;
		}
	}

	/**
	 * Get user details
	 */
	static async getUserDetails(userId: string): Promise<User | null> {
		try {
			const userDoc = await getDoc(doc(db, 'users', userId));
			if (!userDoc.exists()) {
				return null;
			}

			// Log admin accessing user data
			await AuditLogService.log({
				userId: auth.currentUser?.uid || 'unknown',
				action: 'admin.user_data_accessed',
				resource: `user/${userId}`,
				severity: 'info',
				success: true,
				details: {
					targetUserId: userId,
				},
			});

			return { id: userDoc.id, ...userDoc.data() } as User;
		} catch (error) {
			console.error('Error getting user details:', error);
			throw error;
		}
	}

	/**
	 * Update user subscription (admin action)
	 */
	static async updateUserSubscription(params: UserUpdateParams): Promise<void> {
		try {
			await runTransaction(db, async (transaction) => {
				const userRef = doc(db, 'users', params.userId);
				const userDoc = await transaction.get(userRef);

				if (!userDoc.exists()) {
					throw new Error('User not found');
				}

				const updates: any = {
					updatedAt: serverTimestamp(),
				};

				// Update subscription fields
				if (params.updates.subscriptionTier !== undefined) {
					updates['subscription.tier'] = params.updates.subscriptionTier;

					// Update features based on tier
					const features = this.getFeaturesByTier(
						params.updates.subscriptionTier
					);
					updates['subscription.features'] = features;
				}

				if (params.updates.subscriptionStatus !== undefined) {
					updates['subscription.status'] = params.updates.subscriptionStatus;
				}

				if (params.updates.accountLimit !== undefined) {
					updates['subscription.accountLimit'] = params.updates.accountLimit;
				}

				if (params.updates.role !== undefined) {
					updates['role'] = params.updates.role;
				}

				if (params.updates.disabled !== undefined) {
					updates['disabled'] = params.updates.disabled;
				}

				// Update user document
				transaction.update(userRef, updates);

				// Log admin action
				const actionRef = doc(collection(db, 'adminActions'));
				transaction.set(actionRef, {
					adminId: auth.currentUser?.uid,
					action: 'update_user_subscription',
					targetUserId: params.userId,
					metadata: {
						updates: params.updates,
						reason: params.reason,
					},
					timestamp: serverTimestamp(),
					ipAddress: null, // Would be set by Cloud Function
				});
			});

			// Log to audit service
			await AuditLogService.log({
				userId: auth.currentUser?.uid || 'unknown',
				action: 'admin.subscription_changed',
				resource: `user/${params.userId}`,
				severity: 'warning',
				success: true,
				details: {
					targetUserId: params.userId,
					changes: params.updates,
					reason: params.reason,
				},
			});

			// If role was updated, refresh the user's custom claims
			if (params.updates.role !== undefined) {
				const updateClaims = httpsCallable(this.functions, 'updateUserClaims');
				await updateClaims({
					userId: params.userId,
					role: params.updates.role,
				});
			}

			// Log disable/enable actions
			if (params.updates.disabled !== undefined) {
				await AuditLogService.log({
					userId: auth.currentUser?.uid || 'unknown',
					action: params.updates.disabled
						? 'admin.user_disabled'
						: 'admin.user_enabled',
					resource: `user/${params.userId}`,
					severity: 'critical',
					success: true,
					details: {
						targetUserId: params.userId,
						reason: params.reason,
					},
				});
			}
		} catch (error) {
			console.error('Error updating user subscription:', error);
			throw error;
		}
	}

	/**
	 * Get features by subscription tier
	 */
	private static getFeaturesByTier(
		tier: SubscriptionTier
	): Record<string, boolean> {
		const baseFeatures = {
			cloudBackup: false,
			browserExtension: false,
			prioritySupport: false,
			advancedSecurity: false,
			noAds: false,
			familySharing: false,
		};

		switch (tier) {
			case 'premium':
				return {
					...baseFeatures,
					cloudBackup: true,
					browserExtension: true,
					prioritySupport: true,
					advancedSecurity: true,
					noAds: true,
				};
			case 'family':
				return {
					...baseFeatures,
					cloudBackup: true,
					browserExtension: true,
					prioritySupport: true,
					advancedSecurity: true,
					noAds: true,
					familySharing: true,
				};
			case 'enterprise':
				return {
					cloudBackup: true,
					browserExtension: true,
					prioritySupport: true,
					advancedSecurity: true,
					noAds: true,
					familySharing: true,
				};
			default:
				return baseFeatures;
		}
	}

	/**
	 * Get admin action logs
	 */
	static async getAdminActions(params: {
		adminId?: string;
		targetUserId?: string;
		action?: string;
		startDate?: Date;
		endDate?: Date;
		pageSize?: number;
		lastDoc?: DocumentSnapshot;
	}): Promise<{
		actions: AdminAction[];
		lastDoc: DocumentSnapshot | null;
		hasMore: boolean;
	}> {
		try {
			const constraints: QueryConstraint[] = [];

			// Add filters
			if (params.adminId) {
				constraints.push(where('adminId', '==', params.adminId));
			}
			if (params.targetUserId) {
				constraints.push(where('targetUserId', '==', params.targetUserId));
			}
			if (params.action) {
				constraints.push(where('action', '==', params.action));
			}
			if (params.startDate) {
				constraints.push(
					where('timestamp', '>=', Timestamp.fromDate(params.startDate))
				);
			}
			if (params.endDate) {
				constraints.push(
					where('timestamp', '<=', Timestamp.fromDate(params.endDate))
				);
			}

			// Add sorting and pagination
			constraints.push(orderBy('timestamp', 'desc'));
			const pageSize = params.pageSize || 50;
			constraints.push(limit(pageSize + 1));

			if (params.lastDoc) {
				constraints.push(startAfter(params.lastDoc));
			}

			// Execute query
			const q = query(collection(db, 'adminActions'), ...constraints);
			const snapshot = await getDocs(q);

			const actions: AdminAction[] = [];
			let lastDocSnapshot: DocumentSnapshot | null = null;

			snapshot.docs.slice(0, pageSize).forEach((doc) => {
				const data = doc.data();
				actions.push({
					id: doc.id,
					...data,
					timestamp: data.timestamp?.toDate(),
				} as AdminAction);
				lastDocSnapshot = doc;
			});

			const hasMore = snapshot.docs.length > pageSize;

			return { actions, lastDoc: lastDocSnapshot, hasMore };
		} catch (error) {
			console.error('Error getting admin actions:', error);
			throw error;
		}
	}

	/**
	 * Send notification to user
	 */
	static async sendUserNotification(params: {
		userId: string;
		title: string;
		message: string;
		type: 'info' | 'warning' | 'success' | 'error';
	}): Promise<void> {
		try {
			const sendNotification = httpsCallable(
				this.functions,
				'sendUserNotification'
			);
			await sendNotification(params);

			// Log admin action
			await addDoc(collection(db, 'adminActions'), {
				adminId: auth.currentUser?.uid,
				action: 'send_notification',
				targetUserId: params.userId,
				metadata: {
					title: params.title,
					message: params.message,
					type: params.type,
				},
				timestamp: serverTimestamp(),
			});
		} catch (error) {
			console.error('Error sending notification:', error);
			throw error;
		}
	}

	/**
	 * Export user data (GDPR compliance)
	 */
	static async exportUserData(userId: string): Promise<string> {
		try {
			const exportData = httpsCallable<
				{ userId: string },
				{ downloadUrl: string }
			>(this.functions, 'exportUserData');
			const result = await exportData({ userId });
			return (result as any).data.downloadUrl;
		} catch (error) {
			console.error('Error exporting user data:', error);
			throw error;
		}
	}

	/**
	 * Delete user account (GDPR compliance)
	 */
	static async deleteUserAccount(
		userId: string,
		reason: string
	): Promise<void> {
		try {
			const deleteAccount = httpsCallable(this.functions, 'deleteUserAccount');
			await deleteAccount({ userId, reason });

			// Log admin action
			await addDoc(collection(db, 'adminActions'), {
				adminId: auth.currentUser?.uid,
				action: 'delete_user_account',
				targetUserId: userId,
				metadata: { reason },
				timestamp: serverTimestamp(),
			});
		} catch (error) {
			console.error('Error deleting user account:', error);
			throw error;
		}
	}
}

export const adminService = AdminService;
