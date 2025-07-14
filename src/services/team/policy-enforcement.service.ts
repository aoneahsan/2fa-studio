/**
 * Policy Enforcement Service
 * Implements and enforces team security policies
 * @module services/team/policy-enforcement
 */

import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@services/firebase';
import { RBACService, Resource, Action } from './rbac.service';
import { AuditHelper } from '@services/compliance/audit-helper';
import { AuthService } from '@services/auth.service';
import { DeviceService } from '@services/device.service';
import { SessionService } from '@services/session.service';
import { NotificationService } from '@services/notification.service';

export interface TeamPolicy {
  id?: string;
  teamId: string;
  name: string;
  description: string;
  type: PolicyType;
  enabled: boolean;
  _config: PolicyConfig;
  enforcement: PolicyEnforcement;
  createdBy: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  lastEnforcedAt?: Date | Timestamp;
  violations?: number;
}

export enum PolicyType {
  // Authentication Policies
  PASSWORD_COMPLEXITY = 'password_complexity',
  PASSWORD_EXPIRY = 'password_expiry',
  MFA_REQUIREMENT = 'mfa_requirement',
  
  // Access Policies
  SESSION_TIMEOUT = 'session_timeout',
  IP_RESTRICTION = 'ip_restriction',
  DEVICE_TRUST = 'device_trust',
  GEOLOCATION = 'geolocation',
  
  // Data Policies
  EXPORT_RESTRICTION = 'export_restriction',
  SHARING_RESTRICTION = 'sharing_restriction',
  RETENTION_POLICY = 'retention_policy',
  
  // Security Policies
  ENCRYPTION_REQUIREMENT = 'encryption_requirement',
  AUDIT_REQUIREMENT = 'audit_requirement',
  APPROVAL_WORKFLOW = 'approval_workflow',
  
  // Operational Policies
  BACKUP_FREQUENCY = 'backup_frequency',
  ACCESS_REVIEW = 'access_review',
  TRAINING_REQUIREMENT = 'training_requirement'
}

export interface PolicyConfig {
  // Password Complexity
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  preventReuse?: number; // Number of previous passwords to check
  
  // Password Expiry
  expiryDays?: number;
  warningDays?: number;
  
  // MFA
  mfaMethods?: ('totp' | 'sms' | 'email' | 'biometric' | 'hardware')[];
  gracePeriodDays?: number;
  
  // Session
  timeoutMinutes?: number;
  maxConcurrentSessions?: number;
  
  // IP Restriction
  allowedIPs?: string[];
  blockedIPs?: string[];
  allowedCountries?: string[];
  blockedCountries?: string[];
  
  // Device Trust
  requireTrustedDevice?: boolean;
  deviceExpiryDays?: number;
  maxDevicesPerUser?: number;
  
  // Export/Sharing
  allowedFormats?: string[];
  maxExportItems?: number;
  requireApproval?: boolean;
  watermark?: boolean;
  
  // Backup
  frequencyHours?: number;
  retentionDays?: number;
  
  // Access Review
  reviewFrequencyDays?: number;
  reviewers?: string[];
  
  // Custom config
  customRules?: PolicyRule[];
}

export interface PolicyRule {
  id: string;
  condition: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'regex';
    value: unknown;
  };
  action: 'allow' | 'deny' | 'require_approval' | 'notify';
  message?: string;
}

export interface PolicyEnforcement {
  mode: 'audit' | 'warn' | 'enforce';
  actions: PolicyAction[];
  exemptUsers?: string[];
  exemptRoles?: string[];
  notifyOnViolation?: boolean;
  blockOnViolation?: boolean;
}

export enum PolicyAction {
  LOG = 'log',
  NOTIFY_USER = 'notify_user',
  NOTIFY_ADMIN = 'notify_admin',
  BLOCK_ACTION = 'block_action',
  REQUIRE_APPROVAL = 'require_approval',
  FORCE_LOGOUT = 'force_logout',
  DISABLE_ACCOUNT = 'disable_account',
  CUSTOM_WEBHOOK = 'custom_webhook'
}

export interface PolicyViolation {
  id?: string;
  policyId: string;
  policyName: string;
  policyType: PolicyType;
  userId: string;
  userEmail: string;
  timestamp: Date | Timestamp;
  action: string;
  resource?: string;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date | Timestamp;
  resolution?: string;
}

export interface PolicyEvaluation {
  allowed: boolean;
  violated: boolean;
  violations: PolicyViolation[];
  warnings: string[];
  requiresApproval: boolean;
  appliedPolicies: string[];
}

export class PolicyEnforcementService {
  private static readonly POLICIES_COLLECTION = 'team_policies';
  private static readonly VIOLATIONS_COLLECTION = 'policy_violations';
  private static readonly POLICY_CACHE = new Map<string, TeamPolicy[]>();
  private static readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  /**
   * Create a new team policy
   */
  static async createPolicy(
    policy: Omit<TeamPolicy, 'id' | 'createdAt' | 'updatedAt' | 'violations'>,
    creatorId: string
  ): Promise<string> {
    try {
      // Check permissions
      const hasPermission = await RBACService.checkPermission(
        creatorId,
        Resource.SECURITY_POLICIES,
        Action.CREATE,
        { teamId: policy.teamId }
      );

      if (!hasPermission.allowed) {
        throw new Error('Insufficient permissions to create policy');
      }

      const policyData: Omit<TeamPolicy, 'id'> = {
        ...policy,
        createdBy: creatorId,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        violations: 0
      };

      const docRef = await addDoc(collection(db, this.POLICIES_COLLECTION), policyData);

      await AuditHelper.logSecurityAction(
        'device_trust', // Using existing action type
        creatorId,
        AuthService.getCurrentUser()?.email || 'unknown',
        {
          action: 'policy_created',
          policyId: docRef.id,
          policyName: policy.name,
          policyType: policy.type
        }
      );

      // Clear cache for this team
      this.clearTeamCache(policy.teamId);

      return docRef.id;
    } catch (_error) {
      console.error('Failed to create policy:', _error);
      throw error;
    }
  }

  /**
   * Update team policy
   */
  static async updatePolicy(
    policyId: string,
    updates: Partial<Omit<TeamPolicy, 'id' | 'createdAt' | 'createdBy' | 'teamId'>>,
    updaterId: string
  ): Promise<void> {
    try {
      const policy = await this.getPolicy(policyId);
      if (!policy) {
        throw new Error('Policy not found');
      }

      // Check permissions
      const hasPermission = await RBACService.checkPermission(
        updaterId,
        Resource.SECURITY_POLICIES,
        Action.UPDATE,
        { teamId: policy.teamId }
      );

      if (!hasPermission.allowed) {
        throw new Error('Insufficient permissions to update policy');
      }

      await updateDoc(doc(db, this.POLICIES_COLLECTION, policyId), {
        ...updates,
        updatedAt: serverTimestamp()
      });

      await AuditHelper.logSecurityAction(
        'device_trust',
        updaterId,
        AuthService.getCurrentUser()?.email || 'unknown',
        {
          action: 'policy_updated',
          policyId,
          policyName: policy.name,
          updates: Object.keys(updates)
        }
      );

      // Clear cache for this team
      this.clearTeamCache(policy.teamId);
    } catch (_error) {
      console.error('Failed to update policy:', _error);
      throw error;
    }
  }

  /**
   * Evaluate policies for an action
   */
  static async evaluatePolicies(
    userId: string,
    teamId: string,
    action: string,
    resource?: string,
    context?: Record<string, any>
  ): Promise<PolicyEvaluation> {
    try {
      const policies = await this.getTeamPolicies(teamId);
      const activePolicies = policies.filter(p => p.enabled);

      const evaluation: PolicyEvaluation = {
        allowed: true,
        violated: false,
        violations: [],
        warnings: [],
        requiresApproval: false,
        appliedPolicies: []
      };

      for (const policy of activePolicies) {
        // Check if user is exempt
        if (await this.isUserExempt(userId, policy)) {
          continue;
        }

        const result = await this.evaluatePolicy(policy, userId, action, resource, _context);
        
        evaluation.appliedPolicies.push(policy.name);

        if (result.violated) {
          evaluation.violated = true;
          
          const violation = await this.recordViolation(
            policy,
            userId,
            action,
            resource,
            result.details
          );
          
          evaluation.violations.push(violation);

          // Apply enforcement actions
          const enforcement = await this.enforcePolicy(policy, violation);
          
          if (enforcement.blocked) {
            evaluation.allowed = false;
          }
          
          if (enforcement.requiresApproval) {
            evaluation.requiresApproval = true;
          }
          
          if (enforcement.warning) {
            evaluation.warnings.push(enforcement.warning);
          }
        }
      }

      return evaluation;
    } catch (_error) {
      console.error('Failed to evaluate policies:', _error);
      throw error;
    }
  }

  /**
   * Get policy by ID
   */
  static async getPolicy(policyId: string): Promise<TeamPolicy | null> {
    try {
      const docRef = doc(db, this.POLICIES_COLLECTION, policyId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) return null;

      return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate(),
        updatedAt: docSnap.data().updatedAt?.toDate(),
        lastEnforcedAt: docSnap.data().lastEnforcedAt?.toDate()
      } as TeamPolicy;
    } catch (_error) {
      console.error('Failed to get policy:', _error);
      throw error;
    }
  }

  /**
   * Get team policies
   */
  static async getTeamPolicies(teamId: string, useCache: boolean = true): Promise<TeamPolicy[]> {
    try {
      // Check cache
      if (useCache) {
        const cached = this.getFromCache(teamId);
        if (cached) return cached;
      }

      const q = query(
        collection(db, this.POLICIES_COLLECTION),
        where('teamId', '==', teamId)
      );

      const snapshot = await getDocs(q);
      const policies = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        lastEnforcedAt: doc.data().lastEnforcedAt?.toDate()
      } as TeamPolicy));

      // Cache the result
      this.cacheTeamPolicies(teamId, policies);

      return policies;
    } catch (_error) {
      console.error('Failed to get team policies:', _error);
      throw error;
    }
  }

  /**
   * Get policy violations
   */
  static async getPolicyViolations(
    teamId: string,
    days: number = 30,
    resolved?: boolean
  ): Promise<PolicyViolation[]> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      // Get team policies first
      const teamPolicies = await this.getTeamPolicies(teamId);
      const policyIds = teamPolicies.map(p => p.id!);

      if (policyIds.length === 0) return [];

      let q = query(
        collection(db, this.VIOLATIONS_COLLECTION),
        where('policyId', 'in', policyIds),
        where('timestamp', '>=', Timestamp.fromDate(since))
      );

      if (resolved !== undefined) {
        q = query(q, where('resolved', '==', resolved));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
        resolvedAt: doc.data().resolvedAt?.toDate()
      } as PolicyViolation));
    } catch (_error) {
      console.error('Failed to get policy violations:', _error);
      throw error;
    }
  }

  /**
   * Resolve policy violation
   */
  static async resolveViolation(
    violationId: string,
    resolvedBy: string,
    resolution: string
  ): Promise<void> {
    try {
      await updateDoc(doc(db, this.VIOLATIONS_COLLECTION, violationId), {
        resolved: true,
        resolvedBy,
        resolvedAt: serverTimestamp(),
        resolution
      });

      const violation = await getDoc(doc(db, this.VIOLATIONS_COLLECTION, violationId));
      const violationData = violation.data() as PolicyViolation;

      await AuditHelper.logSecurityAction(
        'device_trust',
        resolvedBy,
        AuthService.getCurrentUser()?.email || 'unknown',
        {
          action: 'violation_resolved',
          violationId,
          policyName: violationData.policyName,
          userId: violationData.userId,
          resolution
        }
      );
    } catch (_error) {
      console.error('Failed to resolve violation:', _error);
      throw error;
    }
  }

  /**
   * Check specific policy types
   */
  static async checkPasswordPolicy(
    teamId: string,
    password: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const policies = await this.getTeamPolicies(teamId);
      const passwordPolicies = policies.filter(
        p => p.type === PolicyType.PASSWORD_COMPLEXITY && p.enabled
      );

      const errors: string[] = [];

      for (const policy of passwordPolicies) {
        const config = policy.config;

        if (config.minLength && password.length < config.minLength) {
          errors.push(`Password must be at least ${config.minLength} characters`);
        }

        if (config.requireUppercase && !/[A-Z]/.test(password)) {
          errors.push('Password must contain uppercase letters');
        }

        if (config.requireLowercase && !/[a-z]/.test(password)) {
          errors.push('Password must contain lowercase letters');
        }

        if (config.requireNumbers && !/\d/.test(password)) {
          errors.push('Password must contain numbers');
        }

        if (config.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
          errors.push('Password must contain special characters');
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (_error) {
      console.error('Failed to check password policy:', _error);
      return { valid: true, errors: [] };
    }
  }

  static async checkSessionPolicy(
    teamId: string,
    userId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const policies = await this.getTeamPolicies(teamId);
      const sessionPolicies = policies.filter(
        p => p.type === PolicyType.SESSION_TIMEOUT && p.enabled
      );

      for (const policy of sessionPolicies) {
        const config = policy.config;

        // Check concurrent sessions
        if (config.maxConcurrentSessions) {
          const activeSessions = await SessionService.getActiveSessions(userId);
          if (activeSessions.length >= config.maxConcurrentSessions) {
            return {
              allowed: false,
              reason: `Maximum concurrent sessions (${config.maxConcurrentSessions}) exceeded`
            };
          }
        }
      }

      return { allowed: true };
    } catch (_error) {
      console.error('Failed to check session policy:', _error);
      return { allowed: true };
    }
  }

  static async checkIPPolicy(
    teamId: string,
    ipAddress: string,
    country?: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const policies = await this.getTeamPolicies(teamId);
      const ipPolicies = policies.filter(
        p => p.type === PolicyType.IP_RESTRICTION && p.enabled
      );

      for (const policy of ipPolicies) {
        const config = policy.config;

        // Check blocked IPs
        if (config.blockedIPs?.includes(ipAddress)) {
          return {
            allowed: false,
            reason: 'IP address is blocked'
          };
        }

        // Check allowed IPs
        if (config.allowedIPs && config.allowedIPs.length > 0) {
          if (!config.allowedIPs.includes(ipAddress)) {
            return {
              allowed: false,
              reason: 'IP address is not in allowed list'
            };
          }
        }

        // Check country restrictions
        if (country) {
          if (config.blockedCountries?.includes(country)) {
            return {
              allowed: false,
              reason: `Access from ${country} is blocked`
            };
          }

          if (config.allowedCountries && config.allowedCountries.length > 0) {
            if (!config.allowedCountries.includes(country)) {
              return {
                allowed: false,
                reason: `Access from ${country} is not allowed`
              };
            }
          }
        }
      }

      return { allowed: true };
    } catch (_error) {
      console.error('Failed to check IP policy:', _error);
      return { allowed: true };
    }
  }

  // Helper methods

  private static async evaluatePolicy(
    policy: TeamPolicy,
    userId: string,
    action: string,
    resource?: string,
    context?: Record<string, any>
  ): Promise<{ violated: boolean; details: Record<string, any> }> {
    switch (policy.type) {
      case PolicyType.MFA_REQUIREMENT:
        return this.evaluateMFAPolicy(policy, userId);
      
      case PolicyType.DEVICE_TRUST:
        return this.evaluateDevicePolicy(policy, userId, _context);
      
      case PolicyType.EXPORT_RESTRICTION:
        return this.evaluateExportPolicy(policy, action, _context);
      
      // Add more policy type evaluations as needed
      
      default:
        return { violated: false, details: {} };
    }
  }

  private static async evaluateMFAPolicy(
    policy: TeamPolicy,
    userId: string
  ): Promise<{ violated: boolean; details: Record<string, any> }> {
    const user = await AuthService.getCurrentUser();
    const hasMFA = user?.multiFactor?.enrolledFactors?.length > 0;

    if (!hasMFA && policy.config.gracePeriodDays) {
      const accountAge = Date.now() - (user?.metadata?.creationTime ? new Date(user.metadata.creationTime).getTime() : 0);
      const gracePeriodMs = policy.config.gracePeriodDays * 24 * 60 * 60 * 1000;
      
      if (accountAge > gracePeriodMs) {
        return {
          violated: true,
          details: {
            reason: 'MFA not enabled after grace period',
            gracePeriodExpired: true
          }
        };
      }
    }

    return { violated: false, details: {} };
  }

  private static async evaluateDevicePolicy(
    policy: TeamPolicy,
    userId: string,
    context?: Record<string, any>
  ): Promise<{ violated: boolean; details: Record<string, any> }> {
    if (!policy.config.requireTrustedDevice) {
      return { violated: false, details: {} };
    }

    const deviceId = context?.deviceId;
    if (!deviceId) {
      return {
        violated: true,
        details: { reason: 'No device ID provided' }
      };
    }

    const isTrusted = await DeviceService.isDeviceTrusted(deviceId, userId);
    if (!isTrusted) {
      return {
        violated: true,
        details: { reason: 'Device is not trusted', deviceId }
      };
    }

    return { violated: false, details: {} };
  }

  private static async evaluateExportPolicy(
    policy: TeamPolicy,
    action: string,
    context?: Record<string, any>
  ): Promise<{ violated: boolean; details: Record<string, any> }> {
    if (action !== 'export') {
      return { violated: false, details: {} };
    }

    const format = context?.format;
    const itemCount = context?.itemCount || 0;

    if (policy.config.allowedFormats && !policy.config.allowedFormats.includes(format)) {
      return {
        violated: true,
        details: {
          reason: 'Export format not allowed',
          format,
          allowedFormats: policy.config.allowedFormats
        }
      };
    }

    if (policy.config.maxExportItems && itemCount > policy.config.maxExportItems) {
      return {
        violated: true,
        details: {
          reason: 'Export item count exceeds limit',
          itemCount,
          maxAllowed: policy.config.maxExportItems
        }
      };
    }

    return { violated: false, details: {} };
  }

  private static async recordViolation(
    policy: TeamPolicy,
    userId: string,
    action: string,
    resource?: string,
    details: Record<string, any> = {}
  ): Promise<PolicyViolation> {
    const user = await AuthService.getCurrentUser();
    
    const violation: Omit<PolicyViolation, 'id'> = {
      policyId: policy.id!,
      policyName: policy.name,
      policyType: policy.type,
      userId,
      userEmail: user?.email || 'unknown',
      timestamp: serverTimestamp() as Timestamp,
      action,
      resource,
      details,
      severity: this.calculateSeverity(policy, details),
      resolved: false
    };

    const docRef = await addDoc(collection(db, this.VIOLATIONS_COLLECTION), violation);

    // Update policy violation count
    await updateDoc(doc(db, this.POLICIES_COLLECTION, policy.id!), {
      violations: (policy.violations || 0) + 1,
      lastEnforcedAt: serverTimestamp()
    });

    return {
      id: docRef.id,
      ...violation,
      timestamp: new Date()
    } as PolicyViolation;
  }

  private static async enforcePolicy(
    policy: TeamPolicy,
    violation: PolicyViolation
  ): Promise<{
    blocked: boolean;
    requiresApproval: boolean;
    warning?: string;
  }> {
    const enforcement = policy.enforcement;
    let blocked = false;
    let requiresApproval = false;
    let warning: string | undefined;

    switch (enforcement.mode) {
      case 'audit':
        // Just log, don't block
        break;
      
      case 'warn':
        warning = `Policy violation: ${policy.name}`;
        break;
      
      case 'enforce':
        if (enforcement.blockOnViolation) {
          blocked = true;
        }
        break;
    }

    // Apply enforcement actions
    for (const action of enforcement.actions) {
      switch (action) {
        case PolicyAction.BLOCK_ACTION:
          blocked = true;
          break;
        
        case PolicyAction.REQUIRE_APPROVAL:
          requiresApproval = true;
          break;
        
        case PolicyAction.NOTIFY_USER:
          await NotificationService.notifyUser(
            violation.userId,
            `Policy Violation: ${policy.name}`,
            `You have violated the ${policy.name} policy. ${violation.details.reason || ''}`
          );
          break;
        
        case PolicyAction.NOTIFY_ADMIN:
          // Notify team admins
          break;
        
        case PolicyAction.FORCE_LOGOUT:
          await SessionService.invalidateUserSessions(violation.userId);
          break;
        
        case PolicyAction.DISABLE_ACCOUNT:
          // Disable user account
          break;
      }
    }

    return { blocked, requiresApproval, warning };
  }

  private static calculateSeverity(
    policy: TeamPolicy,
    details: Record<string, any>
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Severity calculation logic based on policy type and violation details
    switch (policy.type) {
      case PolicyType.MFA_REQUIREMENT:
      case PolicyType.ENCRYPTION_REQUIREMENT:
        return 'high';
      
      case PolicyType.IP_RESTRICTION:
      case PolicyType.DEVICE_TRUST:
        return 'critical';
      
      case PolicyType.PASSWORD_COMPLEXITY:
      case PolicyType.SESSION_TIMEOUT:
        return 'medium';
      
      default:
        return 'low';
    }
  }

  private static async isUserExempt(
    userId: string,
    policy: TeamPolicy
  ): Promise<boolean> {
    // Check if user is in exempt list
    if (policy.enforcement.exemptUsers?.includes(userId)) {
      return true;
    }

    // Check if user has exempt role
    if (policy.enforcement.exemptRoles && policy.enforcement.exemptRoles.length > 0) {
      const userPermissions = await RBACService.getUserPermissions(userId);
      for (const role of userPermissions.roles) {
        if (policy.enforcement.exemptRoles.includes(role.name)) {
          return true;
        }
      }
    }

    return false;
  }

  private static getFromCache(teamId: string): TeamPolicy[] | null {
    const cached = this.POLICY_CACHE.get(teamId);
    if (!cached) return null;

    const age = Date.now() - (cached as unknown).timestamp;
    if (age > this.CACHE_TTL) {
      this.POLICY_CACHE.delete(teamId);
      return null;
    }

    return cached;
  }

  private static cacheTeamPolicies(teamId: string, policies: TeamPolicy[]): void {
    (policies as unknown).timestamp = Date.now();
    this.POLICY_CACHE.set(teamId, policies);
  }

  private static clearTeamCache(teamId: string): void {
    this.POLICY_CACHE.delete(teamId);
  }
}