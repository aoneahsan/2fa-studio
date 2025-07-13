/**
 * Authentication Service
 * @module services/auth
 */

import { 
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  onAuthStateChanged,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  linkWithCredential,
  unlink,
  deleteUser,
  sendEmailVerification
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { auth, db } from '@src/config/firebase';
import { User, Device, Subscription } from '@src/types';
import { Capacitor } from '@capacitor/core';
import { authRateLimiter } from '@utils/rate-limiter';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface UserProfile {
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
}

export class AuthService {
  private static currentUser: User | null = null;
  
  /**
   * Validate email format strictly
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
  }
  
  /**
   * Validate TOTP secret format
   */
  static validateTOTPSecret(secret: string): boolean {
    if (!secret || typeof secret !== 'string') return false;
    // Base32 alphabet check
    const base32Regex = /^[A-Z2-7]+=*$/;
    return base32Regex.test(secret) && secret.length >= 16;
  }
  
  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): boolean {
    if (!password || password.length < 8) return false;
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
  }
  
  /**
   * Sanitize user input to prevent XSS
   */
  static sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .replace(/[<>'"]/g, '') // Remove potential HTML/JS chars
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Initialize auth state listener
   */
  static initialize(onUserChange: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const user = await this.getUserData(firebaseUser);
        this.currentUser = user;
        onUserChange(user);
      } else {
        this.currentUser = null;
        onUserChange(null);
      }
    });
  }

  /**
   * Set auth persistence
   */
  static async setPersistence(rememberMe: boolean): Promise<void> {
    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);
  }

  /**
   * Sign up with email and password
   */
  static async signUp(credentials: AuthCredentials): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      // Create user document in Firestore
      const userData: User = {
        id: userCredential.user.uid,
        email: userCredential.user.email!,
        displayName: userCredential.user.displayName || '',
        photoURL: userCredential.user.photoURL || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        subscription: {
          tier: 'free',
          status: 'active',
          startDate: new Date(),
          endDate: null,
          accountLimit: 10,
          features: {
            cloudBackup: false,
            browserExtension: false,
            prioritySupport: false,
            advancedSecurity: false,
            noAds: false
          }
        },
        settings: {
          theme: 'system',
          language: 'en',
          autoLock: true,
          autoLockTimeout: 60,
          biometricAuth: false,
          showAccountIcons: true,
          copyOnTap: true,
          sortOrder: 'manual',
          groupByIssuer: false,
          hideTokens: false,
          fontSize: 'medium'
        },
        lastBackup: null,
        backupEnabled: false,
        deviceCount: 1
      };

      await setDoc(doc(db, 'users', userData.id), {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Register device
      await this.registerDevice(userData.id);
      
      // Initialize default tags
      const { TagService } = await import('@services/tag.service');
      await TagService.initializeDefaultTags(userData.id);

      return userData;
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Sign in with email and password
   */
  static async signIn(credentials: AuthCredentials): Promise<User> {
    const rateLimitKey = `auth:${credentials.email}`;
    
    // Check rate limit
    if (!authRateLimiter.isAllowed(rateLimitKey)) {
      const blockedTime = authRateLimiter.getBlockedTime(rateLimitKey);
      const minutes = Math.ceil(blockedTime / 60000);
      throw new Error(`Too many login attempts. Please try again in ${minutes} minutes.`);
    }
    
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      const user = await this.getUserData(userCredential.user);
      
      // Update last login
      await updateDoc(doc(db, 'users', user.id), {
        lastLogin: serverTimestamp()
      });

      // Register/update device
      await this.registerDevice(user.id);

      // Reset rate limit on successful login
      authRateLimiter.reset(rateLimitKey);

      return user;
    } catch (error: any) {
      // Record failed attempt
      authRateLimiter.recordAttempt(rateLimitKey);
      
      const remainingAttempts = authRateLimiter.getRemainingAttempts(rateLimitKey);
      if (remainingAttempts > 0) {
        throw new Error(`${this.getErrorMessage(error.code)} (${remainingAttempts} attempts remaining)`);
      } else {
        throw new Error(this.getErrorMessage(error.code));
      }
    }
  }

  /**
   * Sign in with Google
   */
  static async signInWithGoogle(): Promise<User> {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      
      let userCredential;
      
      if (Capacitor.isNativePlatform()) {
        // Use redirect for mobile apps
        await signInWithRedirect(auth, provider);
        userCredential = await getRedirectResult(auth);
        if (!userCredential) {
          throw new Error('No redirect result');
        }
      } else {
        // Use popup for web
        userCredential = await signInWithPopup(auth, provider);
      }

      return await this.handleSocialSignIn(userCredential, 'google');
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Sign in with Apple
   */
  static async signInWithApple(): Promise<User> {
    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      
      let userCredential;
      
      if (Capacitor.isNativePlatform()) {
        // Use redirect for mobile apps
        await signInWithRedirect(auth, provider);
        userCredential = await getRedirectResult(auth);
        if (!userCredential) {
          throw new Error('No redirect result');
        }
      } else {
        // Use popup for web
        userCredential = await signInWithPopup(auth, provider);
      }

      return await this.handleSocialSignIn(userCredential, 'apple');
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Handle social sign-in (Google/Apple)
   */
  private static async handleSocialSignIn(userCredential: any, provider: 'google' | 'apple'): Promise<User> {
    // Check if user exists
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    
    if (userDoc.exists()) {
      // Existing user
      const user = await this.getUserData(userCredential.user);
      await this.registerDevice(user.id);
      
      // Update last login
      await updateDoc(doc(db, 'users', user.id), {
        lastLogin: serverTimestamp()
      });
      
      return user;
    } else {
      // New user - create profile
      const userData: User = {
        id: userCredential.user.uid,
        email: userCredential.user.email!,
        displayName: userCredential.user.displayName || '',
        photoURL: userCredential.user.photoURL || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        subscription: {
          tier: 'free',
          status: 'active',
          startDate: new Date(),
          endDate: null,
          accountLimit: 10,
          features: {
            cloudBackup: provider === 'google', // Google users get cloud backup
            browserExtension: false,
            prioritySupport: false,
            advancedSecurity: false,
            noAds: false
          }
        },
        settings: {
          theme: 'system',
          language: 'en',
          autoLock: true,
          autoLockTimeout: 60,
          biometricAuth: false,
          showAccountIcons: true,
          copyOnTap: true,
          sortOrder: 'manual',
          groupByIssuer: false,
          hideTokens: false,
          fontSize: 'medium'
        },
        lastBackup: null,
        backupEnabled: provider === 'google',
        deviceCount: 1,
        authProvider: provider
      };

      await setDoc(doc(db, 'users', userData.id), {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await this.registerDevice(userData.id);
      
      // Initialize default tags
      const { TagService } = await import('@services/tag.service');
      await TagService.initializeDefaultTags(userData.id);
      
      return userData;
    }
  }

  /**
   * Sign out
   */
  static async signOut(): Promise<void> {
    try {
      // Remove device registration
      if (this.currentUser) {
        await this.unregisterDevice(this.currentUser.id);
      }
      
      await signOut(auth);
      this.currentUser = null;
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(profile: UserProfile): Promise<void> {
    if (!auth.currentUser) throw new Error('No authenticated user');

    try {
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: profile.displayName,
        photoURL: profile.photoURL
      });

      // Update Firestore document
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        ...profile,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Update password
   */
  static async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (!auth.currentUser || !auth.currentUser.email) {
      throw new Error('No authenticated user');
    }

    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Update password
      await updatePassword(auth.currentUser, newPassword);
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Get user data from Firestore
   */
  private static async getUserData(firebaseUser: FirebaseUser): Promise<User> {
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    
    if (!userDoc.exists()) {
      throw new Error('User data not found');
    }

    const data = userDoc.data();
    
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email!,
      displayName: data.displayName || firebaseUser.displayName || '',
      photoURL: data.photoURL || firebaseUser.photoURL || '',
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      subscription: data.subscription || {
        tier: 'free',
        status: 'active',
        startDate: new Date(),
        endDate: null,
        accountLimit: 10,
        features: {
          cloudBackup: false,
          browserExtension: false,
          prioritySupport: false,
          advancedSecurity: false,
          noAds: false
        }
      },
      settings: data.settings || {
        theme: 'system',
        language: 'en',
        autoLock: true,
        autoLockTimeout: 60,
        biometricAuth: false,
        showAccountIcons: true,
        copyOnTap: true,
        sortOrder: 'manual',
        groupByIssuer: false,
        hideTokens: false,
        fontSize: 'medium'
      },
      lastBackup: data.lastBackup?.toDate() || null,
      backupEnabled: data.backupEnabled || false,
      deviceCount: data.deviceCount || 1
    };
  }

  /**
   * Register device
   */
  private static async registerDevice(userId: string): Promise<void> {
    const deviceInfo = await this.getDeviceInfo();
    
    const device: Device = {
      id: deviceInfo.id,
      name: deviceInfo.name,
      platform: deviceInfo.platform,
      lastSeen: new Date(),
      trusted: true
    };

    await setDoc(
      doc(db, 'users', userId, 'devices', device.id),
      {
        ...device,
        lastSeen: serverTimestamp()
      },
      { merge: true }
    );
  }

  /**
   * Unregister device
   */
  private static async unregisterDevice(userId: string): Promise<void> {
    const deviceInfo = await this.getDeviceInfo();
    await deleteDoc(doc(db, 'users', userId, 'devices', deviceInfo.id));
  }

  /**
   * Get device info
   */
  private static async getDeviceInfo(): Promise<{ id: string; name: string; platform: string }> {
    if (Capacitor.isNativePlatform()) {
      const { Device } = await import('@capacitor/device');
      const info = await Device.getInfo();
      const id = await Device.getId();
      
      return {
        id: id.identifier || 'unknown',
        name: info.model || 'Unknown Device',
        platform: info.platform
      };
    } else {
      // Web platform
      const userAgent = navigator.userAgent;
      const platform = 'web';
      let name = 'Web Browser';
      
      if (userAgent.includes('Chrome')) name = 'Chrome';
      else if (userAgent.includes('Firefox')) name = 'Firefox';
      else if (userAgent.includes('Safari')) name = 'Safari';
      else if (userAgent.includes('Edge')) name = 'Edge';
      
      return {
        id: localStorage.getItem('deviceId') || this.generateDeviceId(),
        name,
        platform
      };
    }
  }

  /**
   * Generate device ID for web
   */
  private static generateDeviceId(): string {
    const id = crypto.randomUUID();
    localStorage.setItem('deviceId', id);
    return id;
  }

  /**
   * Get error message from Firebase error code
   */
  private static getErrorMessage(code: string): string {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'This email is already registered';
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/operation-not-allowed':
        return 'Operation not allowed';
      case 'auth/weak-password':
        return 'Password is too weak';
      case 'auth/user-disabled':
        return 'This account has been disabled';
      case 'auth/user-not-found':
        return 'No account found with this email';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/invalid-credential':
        return 'Invalid email or password';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection';
      case 'auth/popup-closed-by-user':
        return 'Sign in was cancelled';
      case 'auth/popup-blocked':
        return 'Sign in popup was blocked. Please allow popups';
      default:
        return 'An error occurred. Please try again';
    }
  }

  /**
   * Check if user has premium features
   */
  static hasPremiumFeature(feature: keyof Subscription['features']): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.subscription.features[feature] || false;
  }

  /**
   * Check if user can add more accounts
   */
  static canAddMoreAccounts(currentCount: number): boolean {
    if (!this.currentUser) return false;
    const limit = this.currentUser.subscription.accountLimit;
    return limit === null || currentCount < limit;
  }

  /**
   * Send email verification
   */
  static async sendEmailVerification(): Promise<void> {
    if (!auth.currentUser) throw new Error('No authenticated user');
    
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Link account with Google
   */
  static async linkWithGoogle(): Promise<void> {
    if (!auth.currentUser) throw new Error('No authenticated user');
    
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      
      const credential = await signInWithPopup(auth, provider);
      await linkWithCredential(auth.currentUser, credential.credential!);
      
      // Update user data to enable cloud backup
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        authProvider: 'google',
        backupEnabled: true,
        'subscription.features.cloudBackup': true,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Unlink account from provider
   */
  static async unlinkProvider(providerId: string): Promise<void> {
    if (!auth.currentUser) throw new Error('No authenticated user');
    
    try {
      await unlink(auth.currentUser, providerId);
      
      // Update user data if unlinking Google
      if (providerId === 'google.com') {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          backupEnabled: false,
          'subscription.features.cloudBackup': false,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Delete user account
   */
  static async deleteAccount(password?: string): Promise<void> {
    if (!auth.currentUser) throw new Error('No authenticated user');
    
    try {
      // Re-authenticate if password provided
      if (password && auth.currentUser.email) {
        const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
        await reauthenticateWithCredential(auth.currentUser, credential);
      }
      
      const userId = auth.currentUser.uid;
      
      // Delete user data from Firestore (handled by security rules and cloud functions)
      await updateDoc(doc(db, 'users', userId), {
        deleted: true,
        deletedAt: serverTimestamp()
      });
      
      // Delete Firebase Auth user
      await deleteUser(auth.currentUser);
      
      this.currentUser = null;
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Get current user
   */
  static getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Get current Firebase user
   */
  static getCurrentFirebaseUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return !!auth.currentUser;
  }

  /**
   * Get user's linked providers
   */
  static getLinkedProviders(): string[] {
    if (!auth.currentUser) return [];
    return auth.currentUser.providerData.map(provider => provider.providerId);
  }
}