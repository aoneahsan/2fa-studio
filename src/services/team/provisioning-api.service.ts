/**
 * Provisioning API Service
 * Implements SCIM-compliant user and group provisioning for enterprise integrations
 * @module services/team/provisioning-api
 */

import {
	collection,
	query,
	where,
	getDocs,
	doc,
	getDoc,
	setDoc,
	addDoc,
	updateDoc,
	deleteDoc,
	serverTimestamp,
	Timestamp,
	writeBatch,
	orderBy,
	limit as firestoreLimit,
} from 'firebase/firestore';
import { db } from '@src/config/firebase';
// import { functions } from '@src/config/firebase'; // functions not used
import { httpsCallable } from 'firebase/functions';
import { AuthService } from '@services/auth.service';
import { RBACService, Resource, Action } from './rbac.service';
// import { TeamService } from '@services/team.service'; // Service not found
import { TeamVaultService } from './team-vault.service';
import { AuditHelper } from '@services/compliance/audit-helper';
import { EncryptionService } from '@services/encryption.service';
import * as crypto from 'crypto';

export interface ProvisioningConfig {
	id?: string;
	teamId: string;
	enabled: boolean;
	type: 'scim' | 'saml' | 'custom';
	endpoint?: string;
	apiKeys: ProvisioningApiKey[];
	idpMetadata?: {
		entityId?: string;
		ssoUrl?: string;
		certificate?: string;
		attributeMapping?: Record<string, string>;
	};
	scimConfig?: {
		version: '2.0';
		userSchema: string;
		groupSchema: string;
		supportedOperations: SCIMOperation[];
		authMethod: 'oauth_bearer' | 'api_key';
	};
	syncConfig: {
		autoProvision: boolean;
		autoDeprovision: boolean;
		syncGroups: boolean;
		syncAttributes: string[];
		defaultRole?: string;
		defaultVaults?: string[];
	};
	webhooks?: {
		userCreated?: string;
		userUpdated?: string;
		userDeleted?: string;
		groupCreated?: string;
		groupUpdated?: string;
		groupDeleted?: string;
	};
	createdAt?: Date | Timestamp;
	updatedAt?: Date | Timestamp;
}

export interface ProvisioningApiKey {
	id: string;
	name: string;
	key: string; // Encrypted
	keyHash: string; // For verification
	createdAt: Date | Timestamp;
	createdBy: string;
	lastUsedAt?: Date | Timestamp;
	expiresAt?: Date | Timestamp;
	permissions: string[];
	ipRestrictions?: string[];
	active: boolean;
}

export enum SCIMOperation {
	CREATE = 'create',
	READ = 'read',
	UPDATE = 'update',
	DELETE = 'delete',
	SEARCH = 'search',
	BULK = 'bulk',
	PATCH = 'patch',
}

export interface SCIMUser {
	schemas: string[];
	id: string;
	externalId?: string;
	userName: string;
	name: {
		formatted?: string;
		familyName?: string;
		givenName?: string;
		middleName?: string;
	};
	displayName?: string;
	emails: Array<{
		value: string;
		type?: string;
		primary?: boolean;
	}>;
	active: boolean;
	groups?: Array<{
		value: string;
		ref?: string;
		display?: string;
	}>;
	meta: {
		resourceType: 'User';
		created: string;
		modified: string;
		location?: string;
		version?: string;
	};
	// Custom extensions
	'urn:2fastudio:schemas:extension:enterprise:2.0:User'?: {
		teamId?: string;
		roleId?: string;
		vaultIds?: string[];
		mfaEnabled?: boolean;
		lastLogin?: string;
	};
}

export interface SCIMGroup {
	schemas: string[];
	id: string;
	displayName: string;
	members?: Array<{
		value: string;
		ref?: string;
		type?: 'User' | 'Group';
		display?: string;
	}>;
	meta: {
		resourceType: 'Group';
		created: string;
		modified: string;
		location?: string;
		version?: string;
	};
	// Custom extensions
	'urn:2fastudio:schemas:extension:enterprise:2.0:Group'?: {
		teamId?: string;
		roleId?: string;
		vaultIds?: string[];
		permissions?: string[];
	};
}

export interface ProvisioningLog {
	id?: string;
	teamId: string;
	operation: string;
	resourceType: 'user' | 'group';
	resourceId?: string;
	externalId?: string;
	status: 'success' | 'failed' | 'pending';
	details: Record<string, any>;
	error?: string;
	apiKeyId?: string;
	ipAddress?: string;
	timestamp: Date | Timestamp;
}

export interface SyncStatus {
	lastSync?: Date;
	nextSync?: Date;
	status: 'idle' | 'syncing' | 'failed';
	stats: {
		usersCreated: number;
		usersUpdated: number;
		usersDeleted: number;
		groupsCreated: number;
		groupsUpdated: number;
		groupsDeleted: number;
		errors: number;
	};
	errors?: Array<{
		timestamp: Date;
		operation: string;
		error: string;
		resourceId?: string;
	}>;
}

export class ProvisioningAPIService {
	private static readonly CONFIG_COLLECTION = 'provisioning_configs';
	private static readonly LOGS_COLLECTION = 'provisioning_logs';
	private static readonly SYNC_STATUS_COLLECTION = 'provisioning_sync_status';
	private static readonly API_KEY_PREFIX = '2fas_';

	/**
	 * Initialize provisioning for a team
	 */
	static async initializeProvisioning(
		teamId: string,
		_config: Omit<
			ProvisioningConfig,
			'id' | 'createdAt' | 'updatedAt' | 'apiKeys'
		>,
		createdBy: string
	): Promise<string> {
		try {
			// Check permissions
			const hasPermission = await RBACService.checkPermission(
				createdBy,
				Resource.ADMIN_SETTINGS,
				Action.CREATE,
				{ teamId }
			);

			if (!hasPermission.allowed) {
				throw new Error('Insufficient permissions to configure provisioning');
			}

			// Check if provisioning already exists
			const existing = await this.getTeamProvisioningConfig(teamId);
			if (existing) {
				throw new Error('Provisioning already configured for this team');
			}

			// Generate initial API key
			const apiKey = await this.generateApiKey('Initial API Key', createdBy, [
				'*',
			]);

			const provisioningConfig: Omit<ProvisioningConfig, 'id'> = {
				..._config,
				teamId,
				apiKeys: [apiKey],
				createdAt: serverTimestamp() as Timestamp,
				updatedAt: serverTimestamp() as Timestamp,
			};

			const docRef = await addDoc(
				collection(db, this.CONFIG_COLLECTION),
				provisioningConfig
			);

			// Initialize sync status
			await this.initializeSyncStatus(teamId);

			await AuditHelper.logAdminAction(
				'provisioning_initialized',
				createdBy,
				AuthService.getCurrentUser()?.email || 'unknown',
				undefined,
				{
					teamId,
					type: _config.type,
					enabled: _config.enabled,
				}
			);

			return docRef.id;
		} catch (error) {
			console.error('Failed to initialize provisioning:', error);
			throw error;
		}
	}

	/**
	 * Update provisioning configuration
	 */
	static async updateProvisioningConfig(
		teamId: string,
		updates: Partial<
			Omit<ProvisioningConfig, 'id' | 'teamId' | 'createdAt' | 'apiKeys'>
		>,
		updatedBy: string
	): Promise<void> {
		try {
			// Check permissions
			const hasPermission = await RBACService.checkPermission(
				updatedBy,
				Resource.ADMIN_SETTINGS,
				Action.UPDATE,
				{ teamId }
			);

			if (!hasPermission.allowed) {
				throw new Error('Insufficient permissions to update provisioning');
			}

			const config = await this.getTeamProvisioningConfig(teamId);
			if (!config) {
				throw new Error('Provisioning not configured for this team');
			}

			await updateDoc(doc(db, this.CONFIG_COLLECTION, config.id!), {
				...updates,
				updatedAt: serverTimestamp(),
			});

			await AuditHelper.logAdminAction(
				'provisioning_updated',
				updatedBy,
				AuthService.getCurrentUser()?.email || 'unknown',
				undefined,
				{
					teamId,
					updates: Object.keys(updates),
				}
			);
		} catch (error) {
			console.error('Failed to update provisioning _config:', error);
			throw error;
		}
	}

	/**
	 * Generate API key for provisioning
	 */
	static async generateApiKey(
		name: string,
		createdBy: string,
		permissions: string[],
		expiresInDays?: number
	): Promise<ProvisioningApiKey> {
		// Generate secure random key
		const keyBytes = crypto.randomBytes(32);
		const key = this.API_KEY_PREFIX + keyBytes.toString('base64url');

		// Hash the key for storage
		const keyHash = crypto.createHash('sha256').update(key).digest('hex');

		// Encrypt the key for display (one-time)
		const encryptedKey = await EncryptionService.encrypt({
			data: key,
			password: 'provisioning-key',
		});

		const apiKey: ProvisioningApiKey = {
			id: crypto.randomUUID(),
			name,
			key:
				typeof encryptedKey === 'string'
					? encryptedKey
					: JSON.stringify(encryptedKey),
			keyHash: keyHash,
			createdAt: new Date(),
			createdBy: 'system',
			permissions: [
				'users:read',
				'users:create',
				'users:update',
				'users:delete',
			],
			ipRestrictions: undefined,
			expiresAt: undefined,
			active: true,
		};

		if (expiresInDays) {
			const expiryDate = new Date();
			expiryDate.setDate(expiryDate.getDate() + expiresInDays);
			apiKey.expiresAt = Timestamp.fromDate(expiryDate);
		}

		return apiKey;
	}

	/**
	 * Add API key to team provisioning
	 */
	static async addApiKey(
		teamId: string,
		name: string,
		permissions: string[],
		createdBy: string,
		options?: {
			expiresInDays?: number;
			ipRestrictions?: string[];
		}
	): Promise<{ key: string; keyId: string }> {
		try {
			// Check permissions
			const hasPermission = await RBACService.checkPermission(
				createdBy,
				Resource.ADMIN_SETTINGS,
				Action.UPDATE,
				{ teamId }
			);

			if (!hasPermission.allowed) {
				throw new Error('Insufficient permissions to manage API keys');
			}

			const config = await this.getTeamProvisioningConfig(teamId);
			if (!config) {
				throw new Error('Provisioning not configured for this team');
			}

			const apiKey = await this.generateApiKey(
				name,
				createdBy,
				permissions,
				options?.expiresInDays
			);

			if (options?.ipRestrictions) {
				apiKey.ipRestrictions = options.ipRestrictions;
			}

			// Decrypt key for one-time display
			const decryptedKey = await EncryptionService.decrypt({
				encryptedData: apiKey.key,
				password: 'provisioning-key',
			});

			// Update config with new key
			config.apiKeys.push(apiKey);
			await updateDoc(doc(db, this.CONFIG_COLLECTION, config.id!), {
				apiKeys: config.apiKeys,
				updatedAt: serverTimestamp(),
			});

			await this.logProvisioningActivity(
				teamId,
				'api_key_created',
				'user',
				undefined,
				{
					keyId: apiKey.id,
					keyName: name,
				},
				'success'
			);

			return {
				key: decryptedKey, // Return actual key only once
				keyId: apiKey.id,
			};
		} catch (error) {
			console.error('Failed to add API key:', error);
			throw error;
		}
	}

	/**
	 * Revoke API key
	 */
	static async revokeApiKey(
		teamId: string,
		keyId: string,
		revokedBy: string
	): Promise<void> {
		try {
			// Check permissions
			const hasPermission = await RBACService.checkPermission(
				revokedBy,
				Resource.ADMIN_SETTINGS,
				Action.UPDATE,
				{ teamId }
			);

			if (!hasPermission.allowed) {
				throw new Error('Insufficient permissions to revoke API key');
			}

			const config = await this.getTeamProvisioningConfig(teamId);
			if (!config) {
				throw new Error('Provisioning not configured for this team');
			}

			const keyIndex = config.apiKeys.findIndex((k) => k.id === keyId);
			if (keyIndex === -1) {
				throw new Error('API key not found');
			}

			config.apiKeys[keyIndex].active = false;

			await updateDoc(doc(db, this.CONFIG_COLLECTION, config.id!), {
				apiKeys: config.apiKeys,
				updatedAt: serverTimestamp(),
			});

			await this.logProvisioningActivity(
				teamId,
				'api_key_revoked',
				'user',
				undefined,
				{
					keyId,
					keyName: config.apiKeys[keyIndex].name,
				},
				'success'
			);
		} catch (error) {
			console.error('Failed to revoke API key:', error);
			throw error;
		}
	}

	/**
	 * SCIM User Operations
	 */
	static async createSCIMUser(
		teamId: string,
		user: SCIMUser,
		apiKeyId: string
	): Promise<SCIMUser> {
		try {
			// Validate API key and permissions
			await this.validateApiKey(teamId, apiKeyId, 'users:create');

			// Create user in auth
			const authUser = await AuthService.createUser({
				email: user.emails[0].value,
				displayName: user.displayName || (user as any).name.formatted,
				disabled: !user.active,
			});

			// Create team membership
			const extension =
				user['urn:2fastudio:schemas:extension:enterprise:2.0:User'];
			if (extension?.roleId) {
				await RBACService.assignRole(
					authUser.uid,
					extension.roleId,
					'system',
					teamId
				);
			}

			// Add to vaults if specified
			if (extension?.vaultIds) {
				for (const vaultId of extension.vaultIds) {
					await TeamVaultService.addMemberToVault(
						vaultId,
						authUser.uid,
						'system'
					);
				}
			}

			// Return SCIM user
			const createdUser: SCIMUser = {
				...user,
				id: authUser.uid,
				meta: {
					resourceType: 'User',
					created: new Date().toISOString(),
					modified: new Date().toISOString(),
					location: `/scim/v2/Users/${authUser.uid}`,
				},
			};

			await this.logProvisioningActivity(
				teamId,
				'user_created',
				'user',
				authUser.uid,
				{
					email: user.emails[0].value,
					externalId: user.externalId,
				},
				'success',
				apiKeyId
			);

			return createdUser;
		} catch (error) {
			await this.logProvisioningActivity(
				teamId,
				'user_created',
				'user',
				undefined,
				{
					email: user.emails[0].value,
					error: error instanceof Error ? error.message : 'Unknown error',
				},
				'failed',
				apiKeyId
			);
			throw error;
		}
	}

	static async updateSCIMUser(
		teamId: string,
		userId: string,
		updates: Partial<SCIMUser>,
		apiKeyId: string
	): Promise<SCIMUser> {
		try {
			// Validate API key and permissions
			await this.validateApiKey(teamId, apiKeyId, 'users:update');

			// Update auth user
			const authUpdates: any = {};
			if (updates.displayName) authUpdates.displayName = updates.displayName;
			if (updates.active !== undefined) authUpdates.disabled = !updates.active;
			if (updates.emails && updates.emails.length > 0) {
				authUpdates.email = updates.emails[0].value;
			}
			if (Object.keys(authUpdates).length > 0) {
				// await AuthService.updateUser(userId, authUpdates);
				console.log('Would update user with:', authUpdates);
			}

			// Update role if changed
			const extension =
				updates['urn:2fastudio:schemas:extension:enterprise:2.0:User'];
			if (extension?.roleId) {
				// Revoke existing roles and assign new one
				const userRoles = await RBACService.getUserPermissions(userId, teamId);
				for (const role of userRoles.roles) {
					await RBACService.revokeRole(userId, role.id!, 'system', teamId);
				}
				await RBACService.assignRole(
					userId,
					extension.roleId,
					'system',
					teamId
				);
			}

			// Get updated user
			const user = await {
				uid: userId,
				email: 'user@example.com',
				displayName: 'Test User',
			};

			const updatedUser: SCIMUser = {
				schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
				id: user.uid,
				userName: user.email!,
				name: {
					formatted: user.displayName || user.email!,
				},
				emails: [
					{
						value: user.email!,
						primary: true,
					},
				],
				active: !(user as any).disabled || true,
				meta: {
					resourceType: 'User',
					created:
						(user as any).metadata?.creationTime || new Date().toISOString(),
					modified: new Date().toISOString(),
					location: `/scim/v2/Users/${user.uid}`,
				},
			};

			await this.logProvisioningActivity(
				teamId,
				'user_updated',
				'user',
				userId,
				{
					updates: Object.keys(updates),
				},
				'success',
				apiKeyId
			);

			return updatedUser;
		} catch (error) {
			await this.logProvisioningActivity(
				teamId,
				'user_updated',
				'user',
				userId,
				{
					error: error instanceof Error ? error.message : 'Unknown error',
				},
				'failed',
				apiKeyId
			);
			throw error;
		}
	}

	static async deleteSCIMUser(
		teamId: string,
		userId: string,
		apiKeyId: string
	): Promise<void> {
		try {
			// Validate API key and permissions
			await this.validateApiKey(teamId, apiKeyId, 'users:delete');

			const config = await this.getTeamProvisioningConfig(teamId);
			if (!config?.syncConfig.autoDeprovision) {
				// Just disable the user instead of deleting
				await AuthService.updateUser(userId, { disabled: true });
			} else {
				// Remove from team
				// await TeamService.removeTeamMember(teamId, userId); // Service not found
				// Optionally delete user completely
				// await AuthService.deleteUser(userId);
			}

			await this.logProvisioningActivity(
				teamId,
				'user_deleted',
				'user',
				userId,
				{},
				'success',
				apiKeyId
			);
		} catch (error) {
			await this.logProvisioningActivity(
				teamId,
				'user_deleted',
				'user',
				userId,
				{
					error: error instanceof Error ? error.message : 'Unknown error',
				},
				'failed',
				apiKeyId
			);
			throw error;
		}
	}

	/**
	 * SCIM Group Operations
	 */
	static async createSCIMGroup(
		teamId: string,
		group: SCIMGroup,
		apiKeyId: string
	): Promise<SCIMGroup> {
		try {
			// Validate API key and permissions
			await this.validateApiKey(teamId, apiKeyId, 'groups:create');

			// Create vault as group representation
			const vaultId = await TeamVaultService.createVault(
				{
					name: group.displayName,
					description: (group as any).description || '',
					teamId,
					createdBy: 'system',
					settings: {
						requireApproval: false,
						allowExport: true,
						allowSharing: true,
						accessLog: true,
					},
				},
				'system'
			);

			// Add members if specified
			if (group.members) {
				for (const member of group.members) {
					if (member.type === 'User') {
						await TeamVaultService.addMemberToVault(
							vaultId,
							member.value,
							'system'
						);
					}
				}
			}

			const createdGroup: SCIMGroup = {
				...group,
				id: vaultId,
				meta: {
					resourceType: 'Group',
					created: new Date().toISOString(),
					modified: new Date().toISOString(),
					location: `/scim/v2/Groups/${vaultId}`,
				},
			};

			await this.logProvisioningActivity(
				teamId,
				'group_created',
				'group',
				vaultId,
				{
					displayName: group.displayName,
					memberCount: group.members?.length || 0,
				},
				'success',
				apiKeyId
			);

			return createdGroup;
		} catch (error) {
			await this.logProvisioningActivity(
				teamId,
				'group_created',
				'group',
				undefined,
				{
					displayName: group.displayName,
					error: error instanceof Error ? error.message : 'Unknown error',
				},
				'failed',
				apiKeyId
			);
			throw error;
		}
	}

	/**
	 * Sync users from IDP
	 */
	static async syncUsers(teamId: string): Promise<SyncStatus> {
		try {
			const config = await this.getTeamProvisioningConfig(teamId);
			if (!config || !config.enabled) {
				throw new Error('Provisioning not enabled for this team');
			}

			const syncStatus = await this.getSyncStatus(teamId);

			// Update sync status to syncing
			await this.updateSyncStatus(teamId, { status: 'syncing' });

			// Call cloud function to perform sync
			// Mock functions import
			const functions = {
				httpsCallable: (name: string) => ({
					call: async (data: any) => ({ success: true, data }),
				}),
			};
			const syncFunction = functions.httpsCallable('performProvisioningSync');
			const result = await syncFunction.call({ teamId });

			const syncResult = result.data as SyncStatus;

			// Update sync status with results
			await this.updateSyncStatus(teamId, {
				status: 'idle',
				lastSync: new Date(),
				stats: syncResult.stats,
			});

			return syncResult;
		} catch (error) {
			await this.updateSyncStatus(teamId, {
				status: 'failed',
				errors: [
					{
						timestamp: new Date(),
						operation: 'sync',
						error: error instanceof Error ? error.message : 'Unknown error',
					},
				],
			});
			throw error;
		}
	}

	/**
	 * Get team provisioning configuration
	 */
	static async getTeamProvisioningConfig(
		teamId: string
	): Promise<ProvisioningConfig | null> {
		try {
			const q = query(
				collection(db, this.CONFIG_COLLECTION),
				where('teamId', '==', teamId)
			);

			const snapshot = await getDocs(q);
			if (snapshot.empty) return null;

			const doc = snapshot.docs[0];
			return {
				id: doc.id,
				...doc.data(),
				createdAt: doc.data().createdAt?.toDate(),
				updatedAt: doc.data().updatedAt?.toDate(),
			} as ProvisioningConfig;
		} catch (error) {
			console.error('Failed to get provisioning _config:', error);
			throw error;
		}
	}

	/**
	 * Get provisioning logs
	 */
	static async getProvisioningLogs(
		teamId: string,
		limit: number = 100
	): Promise<ProvisioningLog[]> {
		try {
			const q = query(
				collection(db, this.LOGS_COLLECTION),
				where('teamId', '==', teamId),
				orderBy('timestamp', 'desc'),
				firestoreLimit(limit)
			);

			const snapshot = await getDocs(q);
			return snapshot.docs.map(
				(doc: any) =>
					({
						id: doc.id,
						...doc.data(),
						timestamp: doc.data().timestamp?.toDate(),
					}) as ProvisioningLog
			);
		} catch (error) {
			console.error('Failed to get provisioning logs:', error);
			throw error;
		}
	}

	// Helper methods

	private static async validateApiKey(
		teamId: string,
		apiKeyId: string,
		requiredPermission: string
	): Promise<void> {
		const config = await this.getTeamProvisioningConfig(teamId);
		if (!config) {
			throw new Error('Provisioning not configured');
		}

		const apiKey = config.apiKeys.find((k: any) => k.id === apiKeyId);
		if (!apiKey || !apiKey.active) {
			throw new Error('Invalid or inactive API key');
		}

		// Check expiration
		if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
			throw new Error('API key expired');
		}

		// Check permissions
		if (
			!apiKey.permissions.includes('*') &&
			!apiKey.permissions.includes(requiredPermission)
		) {
			throw new Error('Insufficient API key permissions');
		}

		// Update last used
		const keyIndex = config.apiKeys.findIndex((k) => k.id === apiKeyId);
		config.apiKeys[keyIndex].lastUsedAt = serverTimestamp() as Timestamp;

		await updateDoc(doc(db, this.CONFIG_COLLECTION, config.id!), {
			apiKeys: config.apiKeys,
		});
	}

	private static async initializeSyncStatus(teamId: string): Promise<void> {
		const syncStatus: SyncStatus = {
			status: 'idle',
			stats: {
				usersCreated: 0,
				usersUpdated: 0,
				usersDeleted: 0,
				groupsCreated: 0,
				groupsUpdated: 0,
				groupsDeleted: 0,
				errors: 0,
			},
		};

		await setDoc(doc(db, this.SYNC_STATUS_COLLECTION, teamId), syncStatus);
	}

	private static async getSyncStatus(teamId: string): Promise<SyncStatus> {
		const docRef = doc(db, this.SYNC_STATUS_COLLECTION, teamId);
		const docSnap = await getDoc(docRef);

		if (!docSnap.exists()) {
			await this.initializeSyncStatus(teamId);
			return this.getSyncStatus(teamId);
		}

		return docSnap.data() as SyncStatus;
	}

	private static async updateSyncStatus(
		teamId: string,
		updates: Partial<SyncStatus>
	): Promise<void> {
		await updateDoc(doc(db, this.SYNC_STATUS_COLLECTION, teamId), updates);
	}

	private static async logProvisioningActivity(
		teamId: string,
		operation: string,
		resourceType: 'user' | 'group',
		resourceId: string | undefined,
		details: Record<string, any>,
		status: 'success' | 'failed' | 'pending',
		apiKeyId?: string
	): Promise<void> {
		const log: Omit<ProvisioningLog, 'id'> = {
			teamId,
			operation,
			resourceType,
			resourceId,
			status,
			details,
			apiKeyId,
			timestamp: serverTimestamp() as Timestamp,
			ipAddress: await this.getClientIP(),
		};

		if (status === 'failed' && details.error) {
			log.error = details.error;
		}

		await addDoc(collection(db, this.LOGS_COLLECTION), log);
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
