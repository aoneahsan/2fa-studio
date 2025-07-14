/**
 * Single Sign-On (SSO) service for enterprise features
 * @module services/sso
 */

import { AuthService } from './auth.service';
import { FirestoreService } from './firestore.service';
import { ErrorMonitoringService } from './error-monitoring.service';

export interface SSOConfig {
  id: string;
  organizationId: string;
  provider: 'saml' | 'oidc' | 'ldap' | 'azure_ad' | 'google_workspace' | 'okta';
  name: string;
  enabled: boolean;
  configuration: Record<string, any>;
  mappings: UserAttributeMappings;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAttributeMappings {
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  department?: string;
  title?: string;
  groups?: string;
  roles?: string;
}

export interface SAMLConfig {
  entityId: string;
  ssoUrl: string;
  x509Certificate: string;
  signRequests: boolean;
  wantAssertionsSigned: boolean;
  nameIdFormat: string;
  attributeMapping: UserAttributeMappings;
}

export interface OIDCConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  responseType: 'code' | 'id_token' | 'code id_token';
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string;
  jwksUri: string;
}

export interface LDAPConfig {
  url: string;
  bindDn: string;
  bindCredentials: string;
  searchBase: string;
  searchFilter: string;
  attributes: string[];
  tlsOptions?: {
    rejectUnauthorized: boolean;
    ca?: string[];
  };
}

export interface SSOLoginResult {
  success: boolean;
  user?: unknown;
  error?: string;
  redirectUrl?: string;
}

export class SSOService {
  private static ssoConfigs: Map<string, SSOConfig> = new Map();

  /**
   * Initialize SSO service
   */
  static async initialize(): Promise<void> {
    try {
      // Load SSO configurations from Firestore
      await this.loadSSOConfigurations();
    } catch (error) {
      console.error('Failed to initialize SSO service:', error);
      await ErrorMonitoringService.reportError(_error, {
        category: 'auth',
        severity: 'high',
        _context: { operation: 'sso_initialization' }
      });
    }
  }

  /**
   * Create SSO configuration for organization
   */
  static async createSSOConfig(
    organizationId: string,
    _config: Omit<SSOConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const ssoConfig: SSOConfig = {
        ..._config,
        id: `sso_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        organizationId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Validate configuration based on provider
      await this.validateSSOConfig(ssoConfig);

      // Store in Firestore
      const configId = await FirestoreService.createDocument(
        'sso_configurations',
        ssoConfig,
        ssoConfig.id
      );

      // Cache locally
      this.ssoConfigs.set(configId, ssoConfig);

      return configId;
    } catch (error) {
      console.error('Failed to create SSO _config:', error);
      await ErrorMonitoringService.reportError(_error, {
        category: 'auth',
        severity: 'high',
        _context: { operation: 'create_sso_config', organizationId }
      });
      throw error;
    }
  }

  /**
   * Initiate SAML SSO login
   */
  static async initiateSAMLLogin(
    organizationId: string,
    relayState?: string
  ): Promise<SSOLoginResult> {
    try {
      const config = await this.getSSOConfig(organizationId, 'saml');
      if (!config || !config.enabled) {
        throw new Error('SAML SSO not configured or disabled');
      }

      const samlConfig = config.configuration as SAMLConfig;
      
      // Generate SAML request
      const samlRequest = await this.generateSAMLRequest(samlConfig, relayState);
      
      return {
        success: true,
        redirectUrl: `${samlConfig.ssoUrl}?SAMLRequest=${encodeURIComponent(samlRequest)}&RelayState=${encodeURIComponent(relayState || '')}`
      };
    } catch (error) {
      console.error('Failed to initiate SAML login:', error);
      await ErrorMonitoringService.reportError(_error, {
        category: 'auth',
        severity: 'high',
        _context: { operation: 'saml_login_initiation', organizationId }
      });
      
      return {
        success: false,
        _error: error.message
      };
    }
  }

  /**
   * Handle SAML SSO response
   */
  static async handleSAMLResponse(
    samlResponse: string,
    relayState?: string
  ): Promise<SSOLoginResult> {
    try {
      // Decode and validate SAML response
      const decodedResponse = this.decodeSAMLResponse(samlResponse);
      const validationResult = await this.validateSAMLResponse(decodedResponse);
      
      if (!validationResult.valid) {
        throw new Error(`Invalid SAML response: ${validationResult.error}`);
      }

      // Extract user attributes
      const userAttributes = this.extractSAMLAttributes(decodedResponse);
      
      // Get SSO config for attribute mapping
      const organizationId = validationResult.organizationId;
      const config = await this.getSSOConfig(organizationId, 'saml');
      
      if (!_config) {
        throw new Error('SSO configuration not found');
      }

      // Map attributes to user object
      const mappedUser = this.mapUserAttributes(userAttributes, config.mappings);
      
      // Create or update user in system
      const user = await this.createOrUpdateSSOUser(mappedUser, organizationId);
      
      return {
        success: true,
        user
      };
    } catch (error) {
      console.error('Failed to handle SAML response:', error);
      await ErrorMonitoringService.reportError(_error, {
        category: 'auth',
        severity: 'high',
        _context: { operation: 'saml_response_handling' }
      });
      
      return {
        success: false,
        _error: error.message
      };
    }
  }

  /**
   * Initiate OIDC SSO login
   */
  static async initiateOIDCLogin(
    organizationId: string,
    state?: string
  ): Promise<SSOLoginResult> {
    try {
      const config = await this.getSSOConfig(organizationId, 'oidc');
      if (!config || !config.enabled) {
        throw new Error('OIDC SSO not configured or disabled');
      }

      const oidcConfig = config.configuration as OIDCConfig;
      
      // Generate authorization URL
      const authUrl = this.generateOIDCAuthorizationUrl(oidcConfig, state);
      
      return {
        success: true,
        redirectUrl: authUrl
      };
    } catch (error) {
      console.error('Failed to initiate OIDC login:', error);
      await ErrorMonitoringService.reportError(_error, {
        category: 'auth',
        severity: 'high',
        _context: { operation: 'oidc_login_initiation', organizationId }
      });
      
      return {
        success: false,
        _error: error.message
      };
    }
  }

  /**
   * Handle OIDC callback
   */
  static async handleOIDCCallback(
    code: string,
    state: string,
    organizationId: string
  ): Promise<SSOLoginResult> {
    try {
      const config = await this.getSSOConfig(organizationId, 'oidc');
      if (!_config) {
        throw new Error('OIDC configuration not found');
      }

      const oidcConfig = config.configuration as OIDCConfig;
      
      // Exchange code for tokens
      const tokens = await this.exchangeOIDCCode(oidcConfig, code);
      
      // Get user info
      const userInfo = await this.getOIDCUserInfo(oidcConfig, tokens.accessToken);
      
      // Map attributes to user object
      const mappedUser = this.mapUserAttributes(userInfo, config.mappings);
      
      // Create or update user in system
      const user = await this.createOrUpdateSSOUser(mappedUser, organizationId);
      
      return {
        success: true,
        user
      };
    } catch (error) {
      console.error('Failed to handle OIDC callback:', error);
      await ErrorMonitoringService.reportError(_error, {
        category: 'auth',
        severity: 'high',
        _context: { operation: 'oidc_callback_handling', organizationId }
      });
      
      return {
        success: false,
        _error: error.message
      };
    }
  }

  /**
   * Test LDAP connection
   */
  static async testLDAPConnection(_config: LDAPConfig): Promise<boolean> {
    try {
      // This would use a server-side LDAP client
      // For now, we'll simulate the test
      console.log('Testing LDAP connection:', config.url);
      
      // In a real implementation, this would be handled by a backend service
      return true;
    } catch (error) {
      console.error('LDAP connection test failed:', error);
      return false;
    }
  }

  /**
   * Get available SSO providers for organization
   */
  static async getAvailableProviders(organizationId: string): Promise<SSOConfig[]> {
    try {
      const result = await FirestoreService.getCollection<SSOConfig>(
        'sso_configurations',
        [
          { field: 'organizationId', operator: '==', value: organizationId },
          { field: 'enabled', operator: '==', value: true }
        ]
      );

      return result.success ? result.data : [];
    } catch (error) {
      console.error('Failed to get available SSO providers:', error);
      return [];
    }
  }

  /**
   * Update SSO configuration
   */
  static async updateSSOConfig(
    configId: string,
    updates: Partial<SSOConfig>
  ): Promise<void> {
    try {
      const updatedConfig = {
        ...updates,
        updatedAt: new Date()
      };

      await FirestoreService.updateDocument('sso_configurations', configId, updatedConfig);
      
      // Update cache
      const existing = this.ssoConfigs.get(configId);
      if (existing) {
        this.ssoConfigs.set(configId, { ...existing, ...updatedConfig });
      }
    } catch (error) {
      console.error('Failed to update SSO _config:', error);
      throw error;
    }
  }

  /**
   * Delete SSO configuration
   */
  static async deleteSSOConfig(configId: string): Promise<void> {
    try {
      await FirestoreService.deleteDocument('sso_configurations', configId);
      this.ssoConfigs.delete(configId);
    } catch (error) {
      console.error('Failed to delete SSO _config:', error);
      throw error;
    }
  }

  // Private helper methods

  private static async loadSSOConfigurations(): Promise<void> {
    const result = await FirestoreService.getCollection<SSOConfig>('sso_configurations');
    
    if (result.success) {
      result.data.forEach(config => {
        this.ssoConfigs.set(config.id, _config);
      });
    }
  }

  private static async getSSOConfig(
    organizationId: string,
    provider: SSOConfig['provider']
  ): Promise<SSOConfig | null> {
    // Check cache first
    for (const config of this.ssoConfigs.values()) {
      if (config.organizationId === organizationId && config.provider === provider) {
        return config;
      }
    }

    // Load from Firestore
    const result = await FirestoreService.getCollection<SSOConfig>(
      'sso_configurations',
      [
        { field: 'organizationId', operator: '==', value: organizationId },
        { field: 'provider', operator: '==', value: provider }
      ]
    );

    return result.success && result.data.length > 0 ? result.data[0] : null;
  }

  private static async validateSSOConfig(_config: SSOConfig): Promise<void> {
    switch (config.provider) {
      case 'saml':
        this.validateSAMLConfig(config.configuration as SAMLConfig);
        break;
      case 'oidc':
        this.validateOIDCConfig(config.configuration as OIDCConfig);
        break;
      case 'ldap':
        this.validateLDAPConfig(config.configuration as LDAPConfig);
        break;
      default:
        throw new Error(`Unsupported SSO provider: ${config.provider}`);
    }
  }

  private static validateSAMLConfig(_config: SAMLConfig): void {
    if (!config.entityId || !config.ssoUrl || !config.x509Certificate) {
      throw new Error('Missing required SAML configuration fields');
    }
  }

  private static validateOIDCConfig(_config: OIDCConfig): void {
    if (!config.issuer || !config.clientId || !config.authorizationEndpoint) {
      throw new Error('Missing required OIDC configuration fields');
    }
  }

  private static validateLDAPConfig(_config: LDAPConfig): void {
    if (!config.url || !config.searchBase || !config.searchFilter) {
      throw new Error('Missing required LDAP configuration fields');
    }
  }

  private static async generateSAMLRequest(
    _config: SAMLConfig,
    relayState?: string
  ): Promise<string> {
    // In a real implementation, this would use a SAML library
    // For now, we'll return a placeholder
    return btoa(`<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" />`);
  }

  private static decodeSAMLResponse(response: string): unknown {
    // Decode base64 SAML response
    return atob(response);
  }

  private static async validateSAMLResponse(response: unknown): Promise<{
    valid: boolean;
    error?: string;
    organizationId?: string;
  }> {
    // Validate SAML response signature and assertions
    // For now, we'll return a mock validation
    return {
      valid: true,
      organizationId: 'test-org'
    };
  }

  private static extractSAMLAttributes(response: unknown): Record<string, any> {
    // Extract user attributes from SAML response
    return {
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      department: 'Engineering'
    };
  }

  private static generateOIDCAuthorizationUrl(_config: OIDCConfig, state?: string): string {
    const params = new URLSearchParams({
      response_type: config.responseType,
      client_id: config.clientId,
      scope: config.scopes.join(' '),
      redirect_uri: `${window.location.origin}/auth/oidc/callback`,
      state: state || Math.random().toString(36)
    });

    return `${config.authorizationEndpoint}?${params.toString()}`;
  }

  private static async exchangeOIDCCode(_config: OIDCConfig, code: string): Promise<{
    accessToken: string;
    idToken: string;
    refreshToken?: string;
  }> {
    // Exchange authorization code for tokens
    // This would be done server-side in a real implementation
    return {
      accessToken: 'mock_access_token',
      idToken: 'mock_id_token'
    };
  }

  private static async getOIDCUserInfo(_config: OIDCConfig, accessToken: string): Promise<Record<string, any>> {
    // Get user info from OIDC provider
    return {
      email: 'user@example.com',
      given_name: 'John',
      family_name: 'Doe',
      department: 'Engineering'
    };
  }

  private static mapUserAttributes(
    attributes: Record<string, any>,
    mappings: UserAttributeMappings
  ): unknown {
    const mappedUser: unknown = {};

    Object.entries(mappings).forEach(([userField, attributePath]) => {
      if (attributePath && attributes[attributePath]) {
        mappedUser[userField] = attributes[attributePath];
      }
    });

    return mappedUser;
  }

  private static async createOrUpdateSSOUser(
    userAttributes: unknown,
    organizationId: string
  ): Promise<any> {
    try {
      // Check if user exists
      const existingUser = await this.findUserByEmail(userAttributes.email);
      
      if (existingUser) {
        // Update existing user
        await FirestoreService.updateDocument('users', existingUser.id, {
          ...userAttributes,
          organizationId,
          lastSSOLogin: new Date(),
          updatedAt: new Date()
        });
        
        return { ...existingUser, ...userAttributes };
      } else {
        // Create new user
        const newUser = {
          ...userAttributes,
          organizationId,
          ssoProvider: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const userId = await FirestoreService.createDocument('users', newUser);
        
        return { ...newUser, id: userId };
      }
    } catch (error) {
      console.error('Failed to create or update SSO user:', error);
      throw error;
    }
  }

  private static async findUserByEmail(email: string): Promise<any> {
    const result = await FirestoreService.getCollection('users', [
      { field: 'email', operator: '==', value: email }
    ]);

    return result.success && result.data.length > 0 ? result.data[0] : null;
  }
}