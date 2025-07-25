/**
 * Team Vault Service - Manages team shared vaults for secure 2FA account sharing
 * @module services/team/team-vault
 */

import {
	collection,
	doc,
	getDocs,
	getDoc,
	addDoc,
	updateDoc,
	deleteDoc,
	query,
	where,
	orderBy,
	limit,
	serverTimestamp,
	Timestamp,
	getFirestore,
	arrayUnion,
	arrayRemove,
} from 'firebase/firestore';

import type { Account } from '../../types/account';
import { RBACService, Resource, Action } from './rbac.service';
import { AuditLogService } from '../audit-log.service';
import { ErrorMonitoringService } from '../error-monitoring.service';
import { MobileEncryptionService } from '../mobile-encryption.service';
import { AuthService } from '../auth.service';
import { auth } from '../../config/firebase';

const db = getFirestore();

export interface TeamVault {
	id?: string;
	name: string;
	description?: string;
	teamId: string;
	createdBy: string;
	createdAt: Date | Timestamp;
	updatedAt: Date | Timestamp;
	memberIds: string[]; // Users with access to this vault
	accountIds: string[]; // 2FA accounts in this vault
	settings: VaultSettings;
	metadata?: {
		icon?: string;
		color?: string;
		tags?: string[];
	};
}

export interface VaultSettings {
	requireApproval: boolean; // Require approval for modifications
	approvers?: string[]; // User IDs who can approve changes
	autoLockMinutes?: number; // Auto-lock vault after inactivity
	allowExport: boolean;
	allowSharing: boolean;
	accessLog: boolean; // Log all access to vault accounts
	rotationPolicy?: {
		enabled: boolean;
		intervalDays: number;
		lastRotation?: Date | Timestamp;
		nextRotation?: Date | Timestamp;
	};
}

export interface VaultAccount {
	id?: string;
	vaultId: string;
	accountId: string;
	addedBy: string;
	addedAt: Date | Timestamp;
	lastAccessedBy?: string;
	lastAccessedAt?: Date | Timestamp;
	accessCount: number;
	notes?: string;
	permissions?: {
		canView: string[]; // Specific user IDs
		canEdit: string[]; // Specific user IDs
		canDelete: string[]; // Specific user IDs
	};
}

export interface VaultAccessLog {
	id?: string;
	vaultId: string;
	accountId?: string;
	userId: string;
	action: VaultAction;
	timestamp: Date | Timestamp;
	details?: Record<string, any>;
	ipAddress?: string;
	deviceInfo?: string;
}

export enum VaultAction {
	VAULT_CREATED = 'vault.created',
	VAULT_UPDATED = 'vault.updated',
	VAULT_DELETED = 'vault.deleted',
	ACCOUNT_ADDED = 'account.added',
	ACCOUNT_REMOVED = 'account.removed',
	ACCOUNT_ACCESSED = 'account.accessed',
	ACCOUNT_MODIFIED = 'account.modified',
	MEMBER_ADDED = 'member.added',
	MEMBER_REMOVED = 'member.removed',
	SETTINGS_UPDATED = 'settings.updated',
	APPROVAL_REQUESTED = 'approval.requested',
	APPROVAL_GRANTED = 'approval.granted',
	APPROVAL_DENIED = 'approval.denied',
}

export interface VaultApproval {
	id?: string;
	vaultId: string;
	requestedBy: string;
	requestedAt: Date | Timestamp;
	action: VaultAction;
	targetId?: string; // Account ID or Member ID
	details: Record<string, any>;
	status: 'pending' | 'approved' | 'denied' | 'expired';
	approvedBy?: string;
	approvedAt?: Date | Timestamp;
	deniedBy?: string;
	deniedAt?: Date | Timestamp;
	reason?: string;
	expiresAt: Date | Timestamp;
}

export class TeamVaultService {
	private static readonly VAULTS_COLLECTION = 'team_vaults';
	private static readonly VAULT_ACCOUNTS_COLLECTION = 'vault_accounts';
	private static readonly VAULT_ACCESS_LOGS = 'vault_access_logs';
	private static readonly VAULT_APPROVALS = 'vault_approvals';
	private static readonly APPROVAL_EXPIRY_HOURS = 24;

	/**
	 * Create a new team vault
	 */
	static async createVault(
		vault: Omit<
			TeamVault,
			'id' | 'createdAt' | 'updatedAt' | 'memberIds' | 'accountIds'
		>,
		creatorId: string
	): Promise<string> {
		try {
			const vaultData = {
				...vault,
				createdBy: creatorId,
				createdAt: new Date(),
				updatedAt: new Date(),
				memberIds: [creatorId], // Creator is automatically a member
				accountIds: [],
			};

			const docRef = await addDoc(collection(db, 'team_vaults'), vaultData);

			// Log vault creation
			await AuditLogService.log({
				userId: creatorId,
				action: 'vault.created',
				resource: 'vault',
				severity: 'info',
				success: true,
				details: {
					vaultId: docRef.id,
					vaultName: vault.name,
				},
			});

			return docRef.id;
		} catch (error) {
			console.error('Failed to create vault:', error);
			throw error;
		}
	}

	/**
	 * Update vault settings
	 */
	static async updateVault(
		vaultId: string,
		updates: Partial<
			Omit<TeamVault, 'id' | 'createdAt' | 'createdBy' | 'teamId'>
		>,
		updaterId: string
	): Promise<void> {
		try {
			const vaultRef = doc(db, this.VAULTS_COLLECTION, vaultId);
			const vaultDoc = await getDoc(vaultRef);

			if (!vaultDoc.exists()) {
				throw new Error('Vault not found');
			}

			const vault = vaultDoc.data() as TeamVault;

			// Check if user has permission to update vault
			const hasPermission = await RBACService.checkPermission(
				updaterId,
				Resource.VAULTS,
				Action.UPDATE,
				{ teamId: vault.teamId, resourceId: vaultId }
			);

			if (!hasPermission.allowed) {
				throw new Error('Insufficient permissions to update vault');
			}

			// Update vault
			await updateDoc(vaultRef, {
				...updates,
				updatedAt: serverTimestamp(),
			});

			// Log vault update
			await AuditLogService.log({
				userId: updaterId,
				action: 'vault.updated',
				resource: 'vault',
				severity: 'info',
				success: true,
				details: {
					vaultId,
					changes: updates,
				},
			});
		} catch (error) {
			console.error('Failed to update vault:', error);
			throw error;
		}
	}

	/**
	 * Add account to vault
	 */
	static async addAccountToVault(
		vaultId: string,
		accountId: string,
		adderId: string,
		notes?: string
	): Promise<void> {
		try {
			const vault = await this.getVault(vaultId);
			if (!vault) {
				throw new Error('Vault not found');
			}

			// Check if user has permission to add accounts
			const hasPermission = await RBACService.checkPermission(
				adderId,
				Resource.VAULTS,
				Action.UPDATE,
				{ teamId: vault.teamId, resourceId: vaultId }
			);

			if (!hasPermission.allowed) {
				throw new Error('Insufficient permissions to add accounts to vault');
			}

			// Fix Firestore collection method call
			const accountDoc = await getDoc(doc(db, 'accounts', accountId));
			if (!accountDoc.exists()) {
				throw new Error('Account not found');
			}

			const accountData = accountDoc.data();
			const account: Account = {
				id: accountDoc.id,
				userId: accountData.userId || adderId,
				issuer: accountData.issuer || '',
				label: accountData.label || '',
				secret: accountData.secret || '',
				type: accountData.type || 'totp',
				algorithm: accountData.algorithm || 'SHA1',
				digits: accountData.digits || 6,
				period: accountData.period || 30,
				counter: accountData.counter || 0,
				createdAt: accountData.createdAt || Date.now(),
				updatedAt: accountData.updatedAt || Date.now(),
				tags: accountData.tags || [],
				isFavorite: accountData.isFavorite || false,
				backupCodes: accountData.backupCodes || [],
				lastUsed: accountData.lastUsed || null,
				folderId: accountData.folderId || null,
				notes: accountData.notes,
				icon: accountData.icon,
				color: accountData.color,
			};

			// Check if account exists and user has access
			if (!account || account.userId !== adderId) {
				throw new Error('Account not found or access denied');
			}

			// Check if approval is required
			if (
				vault.settings.requireApproval &&
				!vault.settings.approvers?.includes(adderId)
			) {
				await this.requestApproval(
					vaultId,
					adderId,
					VaultAction.ACCOUNT_ADDED,
					accountId,
					{ accountName: account.label, notes }
				);
				return;
			}

			// Add account to vault
			const vaultRef = doc(db, this.VAULTS_COLLECTION, vaultId);
			await updateDoc(vaultRef, {
				accountIds: arrayUnion(accountId),
				updatedAt: serverTimestamp(),
			});

			// Create vault account entry
			await addDoc(collection(db, this.VAULT_ACCOUNTS_COLLECTION), {
				vaultId,
				accountId,
				addedBy: adderId,
				addedAt: serverTimestamp(),
				accessCount: 0,
				notes,
			});

			// Log account added to vault
			await AuditLogService.log({
				userId: adderId,
				action: 'vault.account_added',
				resource: 'vault',
				severity: 'info',
				success: true,
				details: {
					vaultId,
					accountId,
				},
			});
		} catch (error) {
			console.error('Failed to add account to vault:', error);
			throw error;
		}
	}

	/**
	 * Remove account from vault
	 */
	static async removeAccountFromVault(
		vaultId: string,
		accountId: string,
		removerId: string
	): Promise<void> {
		try {
			const vault = await this.getVault(vaultId);
			if (!vault) {
				throw new Error('Vault not found');
			}

			// Check permissions
			const hasPermission = await RBACService.checkPermission(
				removerId,
				Resource.VAULTS_UPDATE,
				Action.UPDATE,
				{ teamId: vault.teamId, resourceId: vaultId }
			);

			if (!hasPermission.allowed) {
				throw new Error(
					'Insufficient permissions to remove account from vault'
				);
			}

			// Check if approval is required
			if (
				vault.settings.requireApproval &&
				!vault.settings.approvers?.includes(removerId)
			) {
				await this.requestApproval(
					vaultId,
					removerId,
					VaultAction.ACCOUNT_REMOVED,
					accountId,
					{}
				);
				throw new Error('Approval required to remove account from vault');
			}

			// Find and delete vault account entry
			const q = query(
				collection(db, this.VAULT_ACCOUNTS_COLLECTION),
				where('vaultId', '==', vaultId),
				where('accountId', '==', accountId)
			);

			const snapshot = await getDocs(q);
			if (!snapshot.empty) {
				await deleteDoc(snapshot.docs[0].ref);
			}

			// Update vault's account list
			await updateDoc(doc(db, this.VAULTS_COLLECTION, vaultId), {
				accountIds: arrayRemove(accountId),
				updatedAt: serverTimestamp(),
			});

			// Remove sharing from members
			await this.unshareAccountFromMembers(accountId, vault.memberIds);

			await this.logVaultAccess(
				vaultId,
				accountId,
				removerId,
				VaultAction.ACCOUNT_REMOVED,
				{}
			);

			await AuditLogService.logAccountAction(
				'vault.account_removed',
				accountId,
				AuthService.getCurrentUser()?.email || 'unknown',
				{ action: 'removed_from_vault', vaultId, vaultName: vault.name }
			);
		} catch (error) {
			console.error('Failed to remove account from vault:', error);
			throw error;
		}
	}

	/**
	 * Add member to vault
	 */
	static async addMemberToVault(
		vaultId: string,
		memberId: string,
		adderId: string
	): Promise<void> {
		try {
			const vault = await this.getVault(vaultId);
			if (!vault) {
				throw new Error('Vault not found');
			}

			// Check permissions
			const hasPermission = await RBACService.checkPermission(
				adderId,
				Resource.VAULTS_SHARE,
				Action.SHARE,
				{ teamId: vault.teamId, resourceId: vaultId }
			);

			if (!hasPermission.allowed) {
				throw new Error('Insufficient permissions to add member to vault');
			}

			if (vault.memberIds.includes(memberId)) {
				throw new Error('User is already a member of this vault');
			}

			// Update vault members
			await updateDoc(doc(db, this.VAULTS_COLLECTION, vaultId), {
				memberIds: arrayUnion(memberId),
				updatedAt: serverTimestamp(),
			});

			// Share all vault accounts with new member
			const vaultAccounts = await this.getVaultAccounts(vaultId);
			const accountIds = vaultAccounts.map((va: any) => va.accountId);
			await this.shareAccountWithMembers(accountIds, [memberId]);

			await this.logVaultAccess(
				vaultId,
				undefined,
				adderId,
				VaultAction.MEMBER_ADDED,
				{
					memberId,
				}
			);

			await AuditLogService.logAccountAction(
				'vault.member_added',
				vaultId,
				AuthService.getCurrentUser()?.email || 'unknown',
				{
					memberId,
					memberEmail: 'member-email', // Would get from user service
					vaultName: vault.name,
				}
			);
		} catch (error) {
			console.error('Failed to add member to vault:', error);
			throw error;
		}
	}

	/**
	 * Remove member from vault
	 */
	static async removeMemberFromVault(
		vaultId: string,
		memberId: string,
		removerId: string
	): Promise<void> {
		try {
			const vault = await this.getVault(vaultId);
			if (!vault) {
				throw new Error('Vault not found');
			}

			// Check permissions
			const hasPermission = await RBACService.checkPermission(
				removerId,
				Resource.VAULTS_SHARE,
				Action.SHARE,
				{ teamId: vault.teamId, resourceId: vaultId }
			);

			if (!hasPermission.allowed) {
				throw new Error('Insufficient permissions to remove member from vault');
			}

			// Cannot remove the creator
			if (memberId === vault.createdBy) {
				throw new Error('Cannot remove vault creator');
			}

			// Update vault members
			await updateDoc(doc(db, this.VAULTS_COLLECTION, vaultId), {
				memberIds: arrayRemove(memberId),
				updatedAt: serverTimestamp(),
			});

			// Remove sharing of all vault accounts from member
			const vaultAccounts = await this.getVaultAccounts(vaultId);
			const accountIds = vaultAccounts.map((va: any) => va.accountId);
			await this.unshareAccountFromMembers(accountIds, [memberId]);

			await this.logVaultAccess(
				vaultId,
				undefined,
				removerId,
				VaultAction.MEMBER_REMOVED,
				{
					memberId,
				}
			);

			await AuditLogService.logAccountAction(
				'vault.member_removed',
				vaultId,
				AuthService.getCurrentUser()?.email || 'unknown',
				{
					memberId,
					memberEmail: 'member-email', // Would get from user service
					vaultName: vault.name,
				}
			);
		} catch (error) {
			console.error('Failed to remove member from vault:', error);
			throw error;
		}
	}

	/**
	 * Get vault by ID
	 */
	static async getVault(vaultId: string): Promise<TeamVault | null> {
		try {
			const docRef = doc(db, this.VAULTS_COLLECTION, vaultId);
			const docSnap = await getDoc(docRef);

			if (!docSnap.exists()) return null;

			return {
				id: docSnap.id,
				...docSnap.data(),
				createdAt: docSnap.data().createdAt?.toDate(),
				updatedAt: docSnap.data().updatedAt?.toDate(),
			} as TeamVault;
		} catch (error) {
			console.error('Failed to get vault:', error);
			throw error;
		}
	}

	/**
	 * Get team vaults
	 */
	static async getTeamVaults(
		teamId: string,
		userId: string
	): Promise<TeamVault[]> {
		try {
			// Check permissions
			const hasPermission = await RBACService.checkPermission(
				userId,
				Resource.VAULTS_READ,
				Action.READ,
				{ teamId }
			);

			if (!hasPermission.allowed) {
				throw new Error('Insufficient permissions to view team vaults');
			}

			const q = query(
				collection(db, this.VAULTS_COLLECTION),
				where('teamId', '==', teamId),
				where('memberIds', 'array-contains', userId)
			);

			const snapshot = await getDocs(q);
			return snapshot.docs.map(
				(doc: any) =>
					({
						id: doc.id,
						...doc.data(),
						createdAt: doc.data().createdAt?.toDate(),
						updatedAt: doc.data().updatedAt?.toDate(),
					}) as TeamVault
			);
		} catch (error) {
			console.error('Failed to get team vaults:', error);
			throw error;
		}
	}

	/**
	 * Get vault accounts
	 */
	static async getVaultAccounts(vaultId: string): Promise<VaultAccount[]> {
		try {
			const q = query(
				collection(db, this.VAULT_ACCOUNTS_COLLECTION),
				where('vaultId', '==', vaultId)
			);

			const snapshot = await getDocs(q);
			return snapshot.docs.map(
				(doc: any) =>
					({
						id: doc.id,
						...doc.data(),
						addedAt: doc.data().addedAt?.toDate(),
						lastAccessedAt: doc.data().lastAccessedAt?.toDate(),
					}) as VaultAccount
			);
		} catch (error) {
			console.error('Failed to get vault accounts:', error);
			throw error;
		}
	}

	/**
	 * Access vault account
	 */
	static async accessVaultAccount(
		vaultId: string,
		accountId: string,
		userId: string
	): Promise<Account> {
		try {
			const vault = await this.getVault(vaultId);
			if (!vault) {
				throw new Error('Vault not found');
			}

			// Check if user has access to vault
			if (!vault.memberIds.includes(userId)) {
				throw new Error('Access denied to vault');
			}

			// Check if account exists in vault
			if (!vault.accountIds.includes(accountId)) {
				throw new Error('Account not found in vault');
			}

			// Get account from database
			const accountDoc = await getDoc(doc(db, 'accounts', accountId));

			if (!accountDoc.exists) {
				throw new Error('Account not found');
			}

			const accountData = accountDoc.data();
			if (!accountData) {
				throw new Error('Account data not found');
			}

			// Create proper Account object
			const account: Account = {
				id: accountDoc.id,
				userId: accountData.userId || userId,
				issuer: accountData.issuer || '',
				label: accountData.label || '',
				secret: accountData.secret || '',
				type: accountData.type || 'totp',
				algorithm: accountData.algorithm || 'SHA1',
				digits: accountData.digits || 6,
				period: accountData.period || 30,
				counter: accountData.counter || 0,
				createdAt: accountData.createdAt?.toDate?.() || new Date(),
				updatedAt: accountData.updatedAt?.toDate?.() || new Date(),
				tags: accountData.tags || [],
				isFavorite: accountData.isFavorite || false,
				backupCodes: accountData.backupCodes || [],
				lastUsed: accountData.lastUsed || null,
				folderId: accountData.folderId || null,
				notes: accountData.notes,
				icon: accountData.icon,
				color: accountData.color,
			};

			// Check if account exists and user has access
			if (!account || account.userId !== userId) {
				throw new Error('Account not found or access denied');
			}

			// Check if approval is required
			if (
				vault.settings.requireApproval &&
				!vault.settings.approvers?.includes(userId)
			) {
				await this.requestApproval(
					vaultId,
					userId,
					VaultAction.ACCOUNT_ACCESSED,
					accountId,
					{ accountName: account.label }
				);
			}

			// Log access
			await this.logVaultAccess(
				vaultId,
				accountId,
				userId,
				VaultAction.ACCOUNT_ACCESSED,
				{
					accountName: account.label,
				}
			);

			return account;
		} catch (error) {
			console.error('Failed to access vault account:', error);
			throw error;
		}
	}

	/**
	 * Request approval for vault action
	 */
	static async requestApproval(
		vaultId: string,
		requestedBy: string,
		action: VaultAction,
		targetId?: string,
		details: Record<string, any> = {}
	): Promise<string> {
		try {
			const expiresAt = new Date();
			expiresAt.setHours(expiresAt.getHours() + this.APPROVAL_EXPIRY_HOURS);

			const approval: Omit<VaultApproval, 'id'> = {
				vaultId,
				requestedBy,
				requestedAt: serverTimestamp() as Timestamp,
				action,
				targetId,
				details,
				status: 'pending',
				expiresAt: Timestamp.fromDate(expiresAt),
			};

			const docRef = await addDoc(
				collection(db, this.VAULT_APPROVALS),
				approval
			);

			await this.logVaultAccess(
				vaultId,
				targetId,
				requestedBy,
				VaultAction.APPROVAL_REQUESTED,
				{
					action,
					approvalId: docRef.id,
				}
			);

			// Notify approvers (implement notification service)
			// NotificationService.notifyApprovers((vault as any).settings.approvers, ...);

			return docRef.id;
		} catch (error) {
			console.error('Failed to request approval:', error);
			throw error;
		}
	}

	/**
	 * Process approval request
	 */
	static async processApproval(
		approvalId: string,
		approverId: string,
		approved: boolean,
		reason?: string
	): Promise<void> {
		try {
			const approvalDoc = await getDoc(
				doc(db, this.VAULT_APPROVALS, approvalId)
			);
			if (!approvalDoc.exists()) {
				throw new Error('Approval request not found');
			}

			const approval = approvalDoc.data() as VaultApproval;

			if (approval.status !== 'pending') {
				throw new Error('Approval request is no longer pending');
			}

			const vault = await this.getVault(approval.vaultId);
			if (!vault) {
				throw new Error('Vault not found');
			}

			// Check if approver is authorized
			if (!vault.settings.approvers?.includes(approverId)) {
				throw new Error('Not authorized to approve this request');
			}

			// Update approval status
			await updateDoc(doc(db, this.VAULT_APPROVALS, approvalId), {
				status: approved ? 'approved' : 'denied',
				...(approved
					? {
							approvedBy: approverId,
							approvedAt: serverTimestamp(),
						}
					: {
							deniedBy: approverId,
							deniedAt: serverTimestamp(),
							reason,
						}),
			});

			await this.logVaultAccess(
				approval.vaultId,
				approval.targetId,
				approverId,
				approved ? VaultAction.APPROVAL_GRANTED : VaultAction.APPROVAL_DENIED,
				{ approvalId, reason }
			);

			// Execute the approved action
			if (approved) {
				await this.executeApprovedAction(approval);
			}
		} catch (error) {
			console.error('Failed to process approval:', error);
			throw error;
		}
	}

	/**
	 * Get vault access logs
	 */
	static async getVaultAccessLogs(
		vaultId: string,
		hours: number = 24
	): Promise<VaultAccessLog[]> {
		try {
			const since = new Date();
			since.setHours(since.getHours() - hours);

			const q = query(
				collection(db, this.VAULT_ACCESS_LOGS),
				where('vaultId', '==', vaultId),
				where('timestamp', '>=', Timestamp.fromDate(since)),
				orderBy('timestamp', 'desc'),
				limit(100)
			);

			const snapshot = await getDocs(q);
			return snapshot.docs.map(
				(doc: any) =>
					({
						id: doc.id,
						...doc.data(),
						timestamp: doc.data().timestamp?.toDate(),
					}) as VaultAccessLog
			);
		} catch (error) {
			console.error('Failed to get vault access logs:', error);
			throw error;
		}
	}

	// Helper methods

	private static async shareAccountWithMembers(
		accountIds: string | string[],
		memberIds: string[]
	): Promise<void> {
		const ids = Array.isArray(accountIds) ? accountIds : [accountIds];

		for (const accountId of ids) {
			for (const memberId of memberIds) {
				// Implementation would share the encrypted account with the member
				// This would involve re-encrypting the account secret with the member's public key
			}
		}
	}

	private static async unshareAccountFromMembers(
		accountIds: string | string[],
		memberIds: string[]
	): Promise<void> {
		const ids = Array.isArray(accountIds) ? accountIds : [accountIds];

		for (const accountId of ids) {
			for (const memberId of memberIds) {
				// Implementation would remove the member's access to the account
			}
		}
	}

	private static async logVaultAccess(
		vaultId: string,
		accountId: string | undefined,
		userId: string,
		action: VaultAction,
		details: Record<string, any>
	): Promise<void> {
		try {
			const log: Omit<VaultAccessLog, 'id'> = {
				vaultId,
				accountId,
				userId,
				action,
				timestamp: serverTimestamp() as Timestamp,
				details,
				ipAddress: await this.getClientIP(),
				deviceInfo: navigator.userAgent,
			};

			await addDoc(collection(db, this.VAULT_ACCESS_LOGS), log);
		} catch (error) {
			console.error('Failed to log vault access:', error);
		}
	}

	private static async executeApprovedAction(
		approval: VaultApproval
	): Promise<void> {
		// Execute the action that was approved
		switch (approval.action) {
			case VaultAction.VAULT_UPDATED:
				// Apply the vault updates
				break;
			case VaultAction.ACCOUNT_ADDED:
				// Add the account to the vault
				break;
			case VaultAction.ACCOUNT_REMOVED:
				// Remove the account from the vault
				break;
			// ... other actions
		}
	}

	private static async getClientIP(): Promise<string> {
		try {
			const response = await fetch('https://api.ipify.org?format=json');
			const data = await response.json();
			return data.ip;
		} catch {
			return 'unknown';
		}
	}
}
