/**
 * Role-Based Access Control (RBAC) Service
 * Implements fine-grained permissions for team management
 * @module services/team/rbac
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
} from 'firebase/firestore';
import { db } from '@src/config/firebase';
import { AuditHelper } from '@services/compliance/audit-helper';
import { AuthService } from '@services/auth.service';

export interface Role {
	id?: string;
	name: string;
	description: string;
	permissions: Permission[];
	isSystem: boolean; // System roles cannot be modified
	priority: number; // Higher priority roles override lower ones
	createdAt?: Date | Timestamp;
	updatedAt?: Date | Timestamp;
	createdBy?: string;
}

export interface Permission {
	resource: Resource;
	actions: Action[];
	conditions?: PermissionCondition[];
}

export interface PermissionCondition {
	type: 'own' | 'team' | 'custom';
	field?: string;
	operator?: 'equals' | 'contains' | 'in';
	value?: unknown;
}

export enum Resource {
	// Account Management
	ACCOUNTS = 'accounts',
	ACCOUNTS_CREATE = 'accounts.create',
	ACCOUNTS_READ = 'accounts.read',
	ACCOUNTS_UPDATE = 'accounts.update',
	ACCOUNTS_DELETE = 'accounts.delete',
	ACCOUNTS_EXPORT = 'accounts.export',
	ACCOUNTS_IMPORT = 'accounts.import',

	// Team Management
	TEAM = 'team',
	TEAM_MEMBERS = 'team.members',
	TEAM_INVITE = 'team.invite',
	TEAM_REMOVE = 'team.remove',
	TEAM_ROLES = 'team.roles',
	TEAM_SETTINGS = 'team.settings',

	// Vault Management
	VAULTS = 'vaults',
	VAULTS_CREATE = 'vaults.create',
	VAULTS_READ = 'vaults.read',
	VAULTS_UPDATE = 'vaults.update',
	VAULTS_DELETE = 'vaults.delete',
	VAULTS_SHARE = 'vaults.share',

	// Security
	SECURITY = 'security',
	SECURITY_AUDIT = 'security.audit',
	SECURITY_POLICIES = 'security.policies',
	SECURITY_DEVICES = 'security.devices',

	// Compliance
	COMPLIANCE = 'compliance',
	COMPLIANCE_REPORTS = 'compliance.reports',
	COMPLIANCE_GDPR = 'compliance.gdpr',
	COMPLIANCE_SOC2 = 'compliance.soc2',

	// Administration
	ADMIN = 'admin',
	ADMIN_USERS = 'admin.users',
	ADMIN_BILLING = 'admin.billing',
	ADMIN_SETTINGS = 'admin.settings',
}

export enum Action {
	CREATE = 'create',
	READ = 'read',
	UPDATE = 'update',
	DELETE = 'delete',
	SHARE = 'share',
	EXPORT = 'export',
	IMPORT = 'import',
	EXECUTE = 'execute',
	APPROVE = 'approve',
	AUDIT = 'audit',
}

export interface UserRole {
	id?: string;
	userId: string;
	roleId: string;
	teamId?: string;
	grantedBy: string;
	grantedAt: Date | Timestamp;
	expiresAt?: Date | Timestamp;
	isActive: boolean;
}

export interface PermissionCheck {
	allowed: boolean;
	reason?: string;
	matchedRole?: string;
	matchedPermission?: Permission;
}

export class RBACService {
	private static readonly ROLES_COLLECTION = 'rbac_roles';
	private static readonly USER_ROLES_COLLECTION = 'rbac_user_roles';
	private static readonly PERMISSION_CACHE = new Map<string, PermissionCheck>();
	private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

	// Default system roles
	private static readonly SYSTEM_ROLES: Omit<
		Role,
		'id' | 'createdAt' | 'updatedAt'
	>[] = [
		{
			name: 'super_admin',
			description: 'Full system access',
			permissions: [
				{
					resource: Resource.ADMIN,
					actions: [
						Action.CREATE,
						Action.READ,
						Action.UPDATE,
						Action.DELETE,
						Action.EXECUTE,
					],
				},
			],
			isSystem: true,
			priority: 100,
			createdBy: 'system',
		},
		{
			name: 'team_admin',
			description: 'Full team management access',
			permissions: [
				{
					resource: Resource.TEAM,
					actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
					conditions: [{ type: 'team' }],
				},
				{
					resource: Resource.VAULTS,
					actions: [
						Action.CREATE,
						Action.READ,
						Action.UPDATE,
						Action.DELETE,
						Action.SHARE,
					],
					conditions: [{ type: 'team' }],
				},
				{
					resource: Resource.SECURITY,
					actions: [Action.READ, Action.UPDATE],
					conditions: [{ type: 'team' }],
				},
			],
			isSystem: true,
			priority: 80,
			createdBy: 'system',
		},
		{
			name: 'team_manager',
			description: 'Manage team members and vaults',
			permissions: [
				{
					resource: Resource.TEAM_MEMBERS,
					actions: [Action.READ, Action.UPDATE],
					conditions: [{ type: 'team' }],
				},
				{
					resource: Resource.VAULTS,
					actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.SHARE],
					conditions: [{ type: 'team' }],
				},
				{
					resource: Resource.ACCOUNTS,
					actions: [Action.CREATE, Action.READ, Action.UPDATE],
					conditions: [{ type: 'team' }],
				},
			],
			isSystem: true,
			priority: 60,
			createdBy: 'system',
		},
		{
			name: 'team_member',
			description: 'Basic team member access',
			permissions: [
				{
					resource: Resource.ACCOUNTS,
					actions: [Action.CREATE, Action.READ, Action.UPDATE],
					conditions: [{ type: 'own' }],
				},
				{
					resource: Resource.VAULTS,
					actions: [Action.READ],
					conditions: [{ type: 'team' }],
				},
				{
					resource: Resource.TEAM,
					actions: [Action.READ],
					conditions: [{ type: 'team' }],
				},
			],
			isSystem: true,
			priority: 40,
			createdBy: 'system',
		},
		{
			name: 'guest',
			description: 'Limited read-only access',
			permissions: [
				{
					resource: Resource.ACCOUNTS,
					actions: [Action.READ],
					conditions: [
						{
							type: 'custom',
							field: 'shared',
							operator: 'equals',
							value: true,
						},
					],
				},
				{
					resource: Resource.VAULTS,
					actions: [Action.READ],
					conditions: [
						{
							type: 'custom',
							field: 'shared',
							operator: 'equals',
							value: true,
						},
					],
				},
			],
			isSystem: true,
			priority: 20,
			createdBy: 'system',
		},
		{
			name: 'compliance_officer',
			description: 'Access to compliance and audit features',
			permissions: [
				{
					resource: Resource.COMPLIANCE,
					actions: [Action.READ, Action.EXECUTE, Action.EXPORT],
				},
				{
					resource: Resource.SECURITY_AUDIT,
					actions: [Action.READ, Action.EXPORT],
				},
			],
			isSystem: true,
			priority: 70,
			createdBy: 'system',
		},
	];

	/**
	 * Initialize default roles
	 */
	static async initializeRoles(): Promise<void> {
		try {
			const rolesSnapshot = await getDocs(
				collection(db, this.ROLES_COLLECTION)
			);

			if (rolesSnapshot.empty) {
				const batch = writeBatch(db);

				for (const role of this.SYSTEM_ROLES) {
					const roleRef = doc(collection(db, this.ROLES_COLLECTION));
					batch.set(roleRef, {
						...role,
						createdAt: serverTimestamp(),
						updatedAt: serverTimestamp(),
					});
				}

				await batch.commit();

				await AuditHelper.logAdminAction(
					'roles_initialized',
					'system',
					'system',
					undefined,
					{ rolesCount: this.SYSTEM_ROLES.length }
				);
			}
		} catch (error) {
			console.error('Failed to initialize roles:', error);
			throw error;
		}
	}

	/**
	 * Check if user has permission
	 */
	static async checkPermission(
		userId: string,
		resource: Resource,
		action: Action,
		context?: {
			teamId?: string;
			resourceId?: string;
			resourceOwnerId?: string;
			customConditions?: Record<string, any>;
		}
	): Promise<PermissionCheck> {
		try {
			// Check cache first
			const cacheKey = `${userId}:${resource}:${action}:${JSON.stringify(context)}`;
			const cached = this.getFromCache(cacheKey);
			if (cached) return cached;

			// Get user's roles
			const userRoles = await this.getUserRoles(userId);
			if (userRoles.length === 0) {
				return this.cacheResult(cacheKey, {
					allowed: false,
					reason: 'No roles assigned',
				});
			}

			// Get role definitions
			const roleIds = userRoles.map((ur: any) => ur.roleId);
			const roles = await this.getRolesByIds(roleIds);

			// Sort by priority (highest first)
			roles.sort((a, b) => b.priority - a.priority);

			// Check permissions
			for (const role of roles) {
				for (const permission of role.permissions) {
					if (
						this.matchesResource(permission.resource, resource) &&
						permission.actions.includes(action)
					) {
						// Check conditions
						if (!permission.conditions || permission.conditions.length === 0) {
							return this.cacheResult(cacheKey, {
								allowed: true,
								matchedRole: role.name,
								matchedPermission: permission,
							});
						}

						const conditionsMet = await this.evaluateConditions(
							permission.conditions,
							context,
							{
								userId,
								resource,
								action,
								context,
							}
						);

						if (conditionsMet) {
							return this.cacheResult(cacheKey, {
								allowed: true,
								matchedRole: role.name,
								matchedPermission: permission,
							});
						}
					}
				}
			}

			return this.cacheResult(cacheKey, {
				allowed: false,
				reason: 'No matching permissions',
			});
		} catch (error) {
			console.error('Failed to check permission:', error);
			return {
				allowed: false,
				reason: 'Permission check failed',
			};
		}
	}

	/**
	 * Assign role to user
	 */
	static async assignRole(
		userId: string,
		roleId: string,
		grantedBy: string,
		teamId?: string,
		expiresAt?: Date
	): Promise<string> {
		try {
			// Check if granter has permission
			const canGrant = await this.checkPermission(
				grantedBy,
				Resource.TEAM_ROLES,
				Action.UPDATE,
				{ teamId }
			);
			if (!canGrant.allowed) {
				throw new Error('Insufficient permissions to assign roles');
			}

			// Check if role exists
			const role = await this.getRole(roleId);
			if (!role) {
				throw new Error('Role not found');
			}

			// Check for existing assignment
			const existing = await this.getUserRoleAssignment(userId, roleId, teamId);
			if (existing && existing.isActive) {
				throw new Error('Role already assigned');
			}

			const userRole: Omit<UserRole, 'id'> = {
				userId,
				roleId,
				teamId,
				grantedBy,
				grantedAt: serverTimestamp() as Timestamp,
				expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : undefined,
				isActive: true,
			};

			const docRef = await addDoc(
				collection(db, this.USER_ROLES_COLLECTION),
				userRole
			);

			await AuditHelper.logAdminAction(
				'role_assigned',
				grantedBy,
				AuthService.getCurrentUser()?.email || 'system',
				userId,
				{
					roleId,
					roleName: role.name,
					teamId,
					expiresAt: expiresAt?.toISOString(),
				}
			);

			// Clear cache for this user
			this.clearUserCache(userId);

			return docRef.id;
		} catch (error) {
			console.error('Failed to assign role:', error);
			throw error;
		}
	}

	/**
	 * Revoke role from user
	 */
	static async revokeRole(
		userId: string,
		roleId: string,
		revokedBy: string,
		teamId?: string
	): Promise<void> {
		try {
			// Check if revoker has permission
			const canRevoke = await this.checkPermission(
				revokedBy,
				Resource.TEAM_ROLES,
				Action.UPDATE,
				{ teamId }
			);
			if (!canRevoke.allowed) {
				throw new Error('Insufficient permissions to revoke roles');
			}

			const assignment = await this.getUserRoleAssignment(
				userId,
				roleId,
				teamId
			);
			if (!assignment) {
				throw new Error('Role assignment not found');
			}

			await updateDoc(doc(db, this.USER_ROLES_COLLECTION, assignment.id!), {
				isActive: false,
				revokedBy,
				revokedAt: serverTimestamp(),
			});

			const role = await this.getRole(roleId);

			await AuditHelper.logAdminAction(
				'role_revoked',
				revokedBy,
				AuthService.getCurrentUser()?.email || 'system',
				userId,
				{
					roleId,
					roleName: role?.name,
					teamId,
				}
			);

			// Clear cache for this user
			this.clearUserCache(userId);
		} catch (error) {
			console.error('Failed to revoke role:', error);
			throw error;
		}
	}

	/**
	 * Create custom role
	 */
	static async createRole(
		role: Omit<Role, 'id' | 'createdAt' | 'updatedAt' | 'isSystem'>,
		createdBy: string
	): Promise<string> {
		try {
			// Check if creator has permission
			const canCreate = await this.checkPermission(
				createdBy,
				Resource.TEAM_ROLES,
				Action.CREATE
			);
			if (!canCreate.allowed) {
				throw new Error('Insufficient permissions to create roles');
			}

			// Validate role name is unique
			const existing = await this.getRoleByName(role.name);
			if (existing) {
				throw new Error('Role name already exists');
			}

			const roleData: Omit<Role, 'id'> = {
				...role,
				isSystem: false,
				createdBy,
				createdAt: serverTimestamp() as Timestamp,
				updatedAt: serverTimestamp() as Timestamp,
			};

			const docRef = await addDoc(
				collection(db, this.ROLES_COLLECTION),
				roleData
			);

			await AuditHelper.logAdminAction(
				'role_created',
				createdBy,
				AuthService.getCurrentUser()?.email || 'system',
				undefined,
				{
					roleId: docRef.id,
					roleName: role.name,
					permissions: role.permissions.length,
				}
			);

			return docRef.id;
		} catch (error) {
			console.error('Failed to create role:', error);
			throw error;
		}
	}

	/**
	 * Update custom role
	 */
	static async updateRole(
		roleId: string,
		updates: Partial<Omit<Role, 'id' | 'isSystem' | 'createdAt' | 'createdBy'>>,
		updatedBy: string
	): Promise<void> {
		try {
			// Check if updater has permission
			const canUpdate = await this.checkPermission(
				updatedBy,
				Resource.TEAM_ROLES,
				Action.UPDATE
			);
			if (!canUpdate.allowed) {
				throw new Error('Insufficient permissions to update roles');
			}

			const role = await this.getRole(roleId);
			if (!role) {
				throw new Error('Role not found');
			}

			if (role.isSystem) {
				throw new Error('Cannot modify system roles');
			}

			await updateDoc(doc(db, this.ROLES_COLLECTION, roleId), {
				...updates,
				updatedAt: serverTimestamp(),
			});

			await AuditHelper.logAdminAction(
				'role_updated',
				updatedBy,
				AuthService.getCurrentUser()?.email || 'system',
				undefined,
				{
					roleId,
					roleName: role.name,
					updates: Object.keys(updates),
				}
			);

			// Clear cache for all users with this role
			await this.clearRoleCache(roleId);
		} catch (error) {
			console.error('Failed to update role:', error);
			throw error;
		}
	}

	/**
	 * Delete custom role
	 */
	static async deleteRole(roleId: string, deletedBy: string): Promise<void> {
		try {
			// Check if deleter has permission
			const canDelete = await this.checkPermission(
				deletedBy,
				Resource.TEAM_ROLES,
				Action.DELETE
			);
			if (!canDelete.allowed) {
				throw new Error('Insufficient permissions to delete roles');
			}

			const role = await this.getRole(roleId);
			if (!role) {
				throw new Error('Role not found');
			}

			if (role.isSystem) {
				throw new Error('Cannot delete system roles');
			}

			// Check if role is in use
			const assignments = await this.getRoleAssignments(roleId);
			if (assignments.length > 0) {
				throw new Error('Cannot delete role that is assigned to users');
			}

			await deleteDoc(doc(db, this.ROLES_COLLECTION, roleId));

			await AuditHelper.logAdminAction(
				'role_deleted',
				deletedBy,
				AuthService.getCurrentUser()?.email || 'system',
				undefined,
				{
					roleId,
					roleName: role.name,
				}
			);
		} catch (error) {
			console.error('Failed to delete role:', error);
			throw error;
		}
	}

	/**
	 * Get all roles
	 */
	static async getRoles(): Promise<Role[]> {
		try {
			const snapshot = await getDocs(collection(db, this.ROLES_COLLECTION));
			return snapshot.docs.map(
				(doc: any) =>
					({
						id: doc.id,
						...doc.data(),
						createdAt: doc.data().createdAt?.toDate(),
						updatedAt: doc.data().updatedAt?.toDate(),
					}) as Role
			);
		} catch (error) {
			console.error('Failed to get roles:', error);
			throw error;
		}
	}

	/**
	 * Get user's effective permissions
	 */
	static async getUserPermissions(
		userId: string,
		teamId?: string
	): Promise<{
		roles: Role[];
		permissions: Map<Resource, Set<Action>>;
		isAdmin: boolean;
	}> {
		try {
			const userRoles = await this.getUserRoles(userId, teamId);
			const roleIds = userRoles.map((ur: any) => ur.roleId);
			const roles = await this.getRolesByIds(roleIds);

			const permissions = new Map<Resource, Set<Action>>();
			let isAdmin = false;

			for (const role of roles) {
				if (role.name === 'super_admin') {
					isAdmin = true;
				}

				for (const permission of role.permissions) {
					if (!permissions.has(permission.resource)) {
						permissions.set(permission.resource, new Set());
					}

					permission.actions.forEach((action) => {
						permissions.get(permission.resource)!.add(action);
					});
				}
			}

			return { roles, permissions, isAdmin };
		} catch (error) {
			console.error('Failed to get user permissions:', error);
			throw error;
		}
	}

	// Helper methods

	private static async getUserRoles(
		userId: string,
		teamId?: string
	): Promise<UserRole[]> {
		let q = query(
			collection(db, this.USER_ROLES_COLLECTION),
			where('userId', '==', userId),
			where('isActive', '==', true)
		);

		if (teamId) {
			q = query(q, where('teamId', '==', teamId));
		}

		const snapshot = await getDocs(q);
		const now = new Date();

		return snapshot.docs
			.map(
				(doc: any) =>
					({
						id: doc.id,
						...doc.data(),
						grantedAt: doc.data().grantedAt?.toDate(),
						expiresAt: doc.data().expiresAt?.toDate(),
					}) as UserRole
			)
			.filter((ur: any) => !ur.expiresAt || ur.expiresAt > now);
	}

	private static async getUserRoleAssignment(
		userId: string,
		roleId: string,
		teamId?: string
	): Promise<UserRole | null> {
		let q = query(
			collection(db, this.USER_ROLES_COLLECTION),
			where('userId', '==', userId),
			where('roleId', '==', roleId)
		);

		if (teamId) {
			q = query(q, where('teamId', '==', teamId));
		}

		const snapshot = await getDocs(q);
		if (snapshot.empty) return null;

		const doc = snapshot.docs[0];
		return {
			id: doc.id,
			...doc.data(),
			grantedAt: doc.data().grantedAt?.toDate(),
			expiresAt: doc.data().expiresAt?.toDate(),
		} as UserRole;
	}

	private static async getRoleAssignments(roleId: string): Promise<UserRole[]> {
		const q = query(
			collection(db, this.USER_ROLES_COLLECTION),
			where('roleId', '==', roleId),
			where('isActive', '==', true)
		);

		const snapshot = await getDocs(q);
		return snapshot.docs.map(
			(doc: any) =>
				({
					id: doc.id,
					...doc.data(),
				}) as UserRole
		);
	}

	private static async getRole(roleId: string): Promise<Role | null> {
		const docRef = doc(db, this.ROLES_COLLECTION, roleId);
		const docSnap = await getDoc(docRef);

		if (!docSnap.exists()) return null;

		return {
			id: docSnap.id,
			...docSnap.data(),
			createdAt: docSnap.data().createdAt?.toDate(),
			updatedAt: docSnap.data().updatedAt?.toDate(),
		} as Role;
	}

	private static async getRoleByName(name: string): Promise<Role | null> {
		const q = query(
			collection(db, this.ROLES_COLLECTION),
			where('name', '==', name)
		);

		const snapshot = await getDocs(q);
		if (snapshot.empty) return null;

		const doc = snapshot.docs[0];
		return {
			id: doc.id,
			...doc.data(),
			createdAt: doc.data().createdAt?.toDate(),
			updatedAt: doc.data().updatedAt?.toDate(),
		} as Role;
	}

	private static async getRolesByIds(roleIds: string[]): Promise<Role[]> {
		const roles: Role[] = [];

		for (const roleId of roleIds) {
			const role = await this.getRole(roleId);
			if (role) roles.push(role);
		}

		return roles;
	}

	private static matchesResource(
		permissionResource: Resource,
		requestedResource: Resource
	): boolean {
		// Exact match
		if (permissionResource === requestedResource) return true;

		// Wildcard match (e.g., 'accounts' matches 'accounts.create')
		if (requestedResource.startsWith(permissionResource + '.')) return true;

		return false;
	}

	private static async evaluateConditions(
		conditions: PermissionCondition[],
		context?: {
			teamId?: string;
			resourceId?: string;
			resourceOwnerId?: string;
			customConditions?: Record<string, any>;
		},
		originalContext?: {
			userId: string;
			resource: Resource;
			action: Action;
			context: {
				teamId?: string;
				resourceId?: string;
				resourceOwnerId?: string;
				customConditions?: Record<string, any>;
			};
		}
	): Promise<boolean> {
		for (const condition of conditions) {
			switch (condition.type) {
				case 'own':
					if (
						!condition.field ||
						!originalContext?.resourceOwnerId ||
						originalContext.resourceOwnerId !== originalContext.userId
					) {
						return false;
					}
					break;

				case 'team':
					if (!condition.field || !originalContext?.teamId) {
						return false;
					}
					// Additional team membership check would go here
					break;

				case 'custom': {
					if (!condition.field || !originalContext?.customConditions) {
						return false;
					}

					const value = originalContext.customConditions[condition.field];
					switch (condition.operator) {
						case 'equals':
							if (value !== condition.value) return false;
							break;
						case 'contains':
							if (!value?.includes?.(condition.value)) return false;
							break;
						case 'in':
							if (!condition.value?.includes?.(value)) return false;
							break;
					}
					break;
				}
			}
		}

		return true;
	}

	private static getFromCache(key: string): PermissionCheck | null {
		const cached = this.PERMISSION_CACHE.get(key);
		if (!cached) return null;

		const age = Date.now() - (cached as any).timestamp;
		if (age > this.CACHE_TTL) {
			this.PERMISSION_CACHE.delete(key);
			return null;
		}

		return cached;
	}

	private static cacheResult(
		key: string,
		result: PermissionCheck
	): PermissionCheck {
		(result as any).timestamp = Date.now();
		this.PERMISSION_CACHE.set(key, result);
		return result;
	}

	private static clearUserCache(userId: string): void {
		for (const key of this.PERMISSION_CACHE.keys()) {
			if (key.startsWith(`${userId}:`)) {
				this.PERMISSION_CACHE.delete(key);
			}
		}
	}

	private static async clearRoleCache(roleId: string): Promise<void> {
		// Get all users with this role
		const assignments = await this.getRoleAssignments(roleId);

		// Clear cache for each user
		for (const assignment of assignments) {
			this.clearUserCache(assignment.userId);
		}
	}
}
