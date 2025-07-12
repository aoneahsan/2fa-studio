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
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
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
import { auth, db } from '../config/firebase';
import { User, Device, Subscription } from '../types';
import { Capacitor } from '@capacitor/core';
import { authRateLimiter } from '../utils/rate-limiter';

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

      // Check if user exists
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (userDoc.exists()) {
        // Existing user
        const user = await this.getUserData(userCredential.user);
        await this.registerDevice(user.id);
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
              cloudBackup: true, // Google users get cloud backup
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
          backupEnabled: true,
          deviceCount: 1
        };

        await setDoc(doc(db, 'users', userData.id), {
          ...userData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        await this.registerDevice(userData.id);
        return userData;
      }
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
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
      let platform = 'web';
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
}