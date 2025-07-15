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
	sendEmailVerification,
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
	Timestamp,
} from 'firebase/firestore';
import { auth, db } from '@src/config/firebase';
import { User, Device, Subscription } from '@src/types';
import { Capacitor } from '@capacitor/core';
import { authRateLimiter } from '@utils/rate-limiter';
import { AuditLogService } from '@services/audit-log.service';

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
		const emailRegex =
			/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
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
		const persistence = rememberMe
			? browserLocalPersistence
			: browserSessionPersistence;
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
				id: (userCredential as any).user.uid,
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
						noAds: false,
					},
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
					fontSize: 'medium',
				},
				lastBackup: null,
				backupEnabled: false,
				deviceCount: 1,
			};

			await setDoc(doc(db, 'users', userData.id), {
				...userData,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			});

			// Register device
			await this.registerDevice(userData.id);

			// Initialize default tags
			const { TagService } = await import('@services/tag.service');
			await TagService.initializeDefaultTags(userData.id);

			// Log successful signup
			await AuditLogService.log({
				userId: userData.id,
				action: 'auth.signup',
				resource: 'auth',
				severity: 'info',
				success: true,
				details: {
					email: userData.email,
					authProvider: 'email',
				},
			});

			return userData;
		} catch (error: unknown) {
			// Log failed signup attempt
			const authError = error as any;
			await AuditLogService.log({
				userId: credentials.email,
				action: 'auth.signup',
				resource: 'auth',
				severity: 'warning',
				success: false,
				errorMessage: authError.code,
				details: {
					email: credentials.email,
					errorCode: authError.code,
				},
			});

			throw new Error(this.getErrorMessage(authError.code));
		}
	}

	/**
	 * Sign in with email and password
	 */
	static async signIn(credentials: AuthCredentials): Promise<User> {
		const rateLimitKey = `_auth:${credentials.email}`;

		// Check rate limit
		if (!authRateLimiter.isAllowed(rateLimitKey)) {
			const blockedTime = authRateLimiter.getBlockedTime(rateLimitKey);
			const minutes = Math.ceil(blockedTime / 60000);

			// Log account locked due to rate limiting
			await AuditLogService.log({
				userId: credentials.email,
				action: 'auth.account_locked',
				resource: 'auth',
				severity: 'critical',
				success: false,
				details: {
					email: credentials.email,
					reason: 'rate_limit_exceeded',
					blockedMinutes: minutes,
				},
			});

			throw new Error(
				`Too many login attempts. Please try again in ${minutes} minutes.`
			);
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
				lastLogin: serverTimestamp(),
			});

			// Register/update device
			await this.registerDevice(user.id);

			// Reset rate limit on successful login
			authRateLimiter.reset(rateLimitKey);

			// Log successful login
			await AuditLogService.log({
				userId: user.id,
				action: 'auth.login',
				resource: 'auth',
				severity: 'info',
				success: true,
				details: {
					email: user.email,
					authProvider: 'email',
				},
			});

			// Check for suspicious activity
			await AuditLogService.detectSuspiciousActivity(user.id);

			return user;
		} catch (error: unknown) {
			// Record failed attempt
			authRateLimiter.recordAttempt(rateLimitKey);

			// Log failed login
			const authError = error as any;
			await AuditLogService.log({
				userId: credentials.email,
				action: 'auth.failed_login',
				resource: 'auth',
				severity: 'warning',
				success: false,
				errorMessage: authError.code,
				details: {
					email: credentials.email,
					errorCode: authError.code,
				},
			});

			const remainingAttempts =
				authRateLimiter.getRemainingAttempts(rateLimitKey);
			if (remainingAttempts > 0) {
				throw new Error(
					`${this.getErrorMessage(authError.code)} (${remainingAttempts} attempts remaining)`
				);
			} else {
				throw new Error(this.getErrorMessage(authError.code));
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
		} catch (error: unknown) {
			const authError = error as any;
			throw new Error(this.getErrorMessage(authError.code));
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
		} catch (error: unknown) {
			const authError = error as any;
			throw new Error(this.getErrorMessage(authError.code));
		}
	}

	/**
	 * Handle social sign-in (Google/Apple)
	 */
	private static async handleSocialSignIn(
		userCredential: unknown,
		provider: 'google' | 'apple'
	): Promise<User> {
		const cred = userCredential as any;

		// Check if user exists
		const userDoc = await getDoc(doc(db, 'users', cred.user.uid));

		if (userDoc.exists()) {
			// Existing user
			const user = await this.getUserData(cred.user);
			await this.registerDevice(user.id);

			// Update last login
			await updateDoc(doc(db, 'users', user.id), {
				lastLogin: serverTimestamp(),
			});

			// Log social login
			await AuditLogService.log({
				userId: user.id,
				action: 'auth.login',
				resource: 'auth',
				severity: 'info',
				success: true,
				details: {
					email: user.email,
					authProvider: provider,
				},
			});

			return user;
		} else {
			// New user - create profile
			const userData: User = {
				id: cred.user.uid,
				email: cred.user.email!,
				displayName: cred.user.displayName || '',
				photoURL: cred.user.photoURL || '',
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
						noAds: false,
					},
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
					fontSize: 'medium',
				},
				lastBackup: null,
				backupEnabled: provider === 'google',
				deviceCount: 1,
				authProvider: provider,
			};

			await setDoc(doc(db, 'users', userData.id), {
				...userData,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			});

			await this.registerDevice(userData.id);

			// Initialize default tags
			const { TagService } = await import('@services/tag.service');
			await TagService.initializeDefaultTags(userData.id);

			// Log social signup
			await AuditLogService.log({
				userId: userData.id,
				action: 'auth.signup',
				resource: 'auth',
				severity: 'info',
				success: true,
				details: {
					email: userData.email,
					authProvider: provider,
				},
			});

			return userData;
		}
	}

	/**
	 * Sign out
	 */
	static async signOut(): Promise<void> {
		try {
			// Remove device registration
			const currentUserId = this.currentUser?.id;
			if (this.currentUser) {
				await this.unregisterDevice(this.currentUser.id);
			}

			await signOut(auth);
			this.currentUser = null;

			// Log signout
			await AuditLogService.log({
				userId: currentUserId || 'unknown',
				action: 'auth.logout',
				resource: 'auth',
				severity: 'info',
				success: true,
				details: {},
			});
		} catch (error: unknown) {
			const authError = error as any;
			throw new Error(this.getErrorMessage(authError.code));
		}
	}

	/**
	 * Send password reset email
	 */
	static async sendPasswordResetEmail(email: string): Promise<void> {
		try {
			await sendPasswordResetEmail(auth, email);

			// Log password reset request
			await AuditLogService.log({
				userId: email,
				action: 'auth.password_reset',
				resource: 'auth',
				severity: 'info',
				success: true,
				details: { email },
			});
		} catch (error: unknown) {
			const authError = error as any;
			throw new Error(this.getErrorMessage(authError.code));
		}
	}

	/**
	 * Update user profile
	 */
	static async updateProfile(
		displayName: string,
		photoURL?: string
	): Promise<void> {
		try {
			if (!auth.currentUser) throw new Error('No authenticated user');

			// Update profile in Firebase Auth
			await updateProfile(auth.currentUser, {
				displayName,
				photoURL,
			});

			// Update profile in Firestore
			await updateDoc(doc(db, 'users', auth.currentUser.uid), {
				displayName,
				photoURL,
				updatedAt: serverTimestamp(),
			});
		} catch (error: unknown) {
			throw new Error(this.getErrorMessage((error as any).code));
		}
	}

	/**
	 * Update password
	 */
	static async updatePassword(
		currentPassword: string,
		newPassword: string
	): Promise<void> {
		try {
			if (!auth.currentUser || !auth.currentUser.email) {
				throw new Error('No authenticated user or email');
			}

			// Re-authenticate user before password change
			const credential = EmailAuthProvider.credential(
				auth.currentUser.email,
				currentPassword
			);
			await reauthenticateWithCredential(auth.currentUser, credential);

			// Update password
			await updatePassword(auth.currentUser, newPassword);

			// Log password change
			await this.logAuditEvent({
				userId: auth.currentUser.uid,
				action: 'auth.password_changed',
				resource: 'auth',
				severity: 'info',
				success: true,
				details: { timestamp: new Date() },
			});
		} catch (error: unknown) {
			throw new Error(this.getErrorMessage((error as any).code));
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
					noAds: false,
				},
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
				fontSize: 'medium',
			},
			lastBackup: data.lastBackup?.toDate() || null,
			backupEnabled: data.backupEnabled || false,
			deviceCount: data.deviceCount || 1,
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
			trusted: true,
		};

		await setDoc(
			doc(db, 'users', userId, 'devices', device.id),
			{
				...device,
				lastSeen: serverTimestamp(),
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
	private static async getDeviceInfo(): Promise<{
		id: string;
		name: string;
		platform: string;
	}> {
		if (Capacitor.isNativePlatform()) {
			const { Device } = await import('@capacitor/device');
			const info = await Device.getInfo();
			const id = await Device.getId();

			return {
				id: id.identifier || 'unknown',
				name: info.model || 'Unknown Device',
				platform: info.platform,
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
				platform,
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
	 * Log audit event
	 */
	private static async logAuditEvent(event: {
		userId: string;
		action: string;
		resource: string;
		severity: 'info' | 'warning' | 'critical';
		success: boolean;
		details: any;
	}): Promise<void> {
		try {
			// For now, just log to console. This should be replaced with actual audit service
			console.log('Audit Event:', event);
		} catch (error) {
			console.error('Failed to log audit event:', error);
		}
	}

	/**
	 * Get error message from error code
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
		const limit = (this.currentUser as any).subscription.accountLimit;
		return limit === null || currentCount < limit;
	}

	/**
	 * Send email verification
	 */
	static async sendEmailVerification(): Promise<void> {
		try {
			if (!auth.currentUser) throw new Error('No authenticated user');

			// Send verification email
			await sendEmailVerification(auth.currentUser);

			// Log email verification sent
			await this.logAuditEvent({
				userId: auth.currentUser.uid,
				action: 'auth.email_verified',
				resource: 'auth',
				severity: 'info',
				success: true,
				details: { email: auth.currentUser.email },
			});
		} catch (error: unknown) {
			throw new Error(this.getErrorMessage((error as any).code));
		}
	}

	/**
	 * Link with Google provider
	 */
	static async linkWithGoogle(): Promise<void> {
		try {
			if (!auth.currentUser) throw new Error('No authenticated user');

			const provider = new GoogleAuthProvider();
			provider.addScope('https://www.googleapis.com/auth/drive.file');

			const result = await signInWithPopup(auth, provider);
			await linkWithCredential(
				auth.currentUser,
				GoogleAuthProvider.credentialFromResult(result)!
			);

			// Update user data to enable cloud backup
			await updateDoc(doc(db, 'users', auth.currentUser.uid), {
				authProvider: 'google',
				backupEnabled: true,
				googleDriveConnected: true,
				'subscription.features.cloudBackup': true,
				updatedAt: serverTimestamp(),
			});

			// Log provider linked
			await this.logAuditEvent({
				userId: auth.currentUser.uid,
				action: 'auth.provider_linked',
				resource: 'auth',
				severity: 'info',
				success: true,
				details: { provider: 'google' },
			});
		} catch (error: unknown) {
			throw new Error(this.getErrorMessage((error as any).code));
		}
	}

	/**
	 * Unlink provider
	 */
	static async unlinkProvider(providerId: string): Promise<void> {
		try {
			if (!auth.currentUser) throw new Error('No authenticated user');

			await unlink(auth.currentUser, providerId);

			// Update user data if unlinking Google
			if (providerId === 'google.com') {
				await updateDoc(doc(db, 'users', auth.currentUser.uid), {
					backupEnabled: false,
					'subscription.features.cloudBackup': false,
					googleDriveConnected: false,
					updatedAt: serverTimestamp(),
				});
			}

			// Log provider unlinked
			await this.logAuditEvent({
				userId: auth.currentUser.uid,
				action: 'auth.provider_unlinked',
				resource: 'auth',
				severity: 'warning',
				success: true,
				details: { provider: providerId },
			});
		} catch (error: unknown) {
			throw new Error(this.getErrorMessage((error as any).code));
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
				const credential = EmailAuthProvider.credential(
					auth.currentUser.email,
					password
				);
				await reauthenticateWithCredential(auth.currentUser, credential);
			}

			const userId = auth.currentUser.uid;

			// Delete user data from Firestore (handled by security rules and cloud functions)
			await updateDoc(doc(db, 'users', userId), {
				deleted: true,
				deletedAt: serverTimestamp(),
			});

			// Delete Firebase Auth user
			await deleteUser(auth.currentUser);

			// Log account deletion
			await AuditLogService.log({
				userId: userId,
				action: 'auth.account_deleted',
				resource: 'auth',
				severity: 'critical',
				success: true,
				details: { permanent: true },
			});

			this.currentUser = null;
		} catch (error: unknown) {
			const authError = error as any;
			throw new Error(this.getErrorMessage(authError.code));
		}
	}

	/**
	 * Create user (Admin only - for provisioning API)
	 */
	static async createUser(userData: {
		email: string;
		displayName: string;
		disabled?: boolean;
	}): Promise<{ uid: string; email: string; displayName: string }> {
		try {
			// Note: This would require Firebase Admin SDK in a real implementation
			// For now, creating a regular user and updating the profile
			const userCredential = await createUserWithEmailAndPassword(
				auth,
				userData.email,
				Math.random().toString(36) // Temporary password - user would need to reset
			);

			// Update profile
			await updateProfile(userCredential.user, {
				displayName: userData.displayName,
			});

			// Create user document in Firestore
			const userDoc: User = {
				id: userCredential.user.uid,
				email: userData.email,
				displayName: userData.displayName,
				photoURL: '',
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
						noAds: false,
					},
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
					fontSize: 'medium',
				},
				lastBackup: null,
				backupEnabled: false,
				deviceCount: 0,
				disabled: userData.disabled || false,
			};

			await setDoc(doc(db, 'users', userDoc.id), {
				...userDoc,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			});

			return {
				uid: userCredential.user.uid,
				email: userData.email,
				displayName: userData.displayName,
			};
		} catch (error: unknown) {
			const authError = error as any;
			throw new Error(this.getErrorMessage(authError.code));
		}
	}

	/**
	 * Update user (Admin only)
	 */
	static async updateUser(
		userId: string,
		updates: { disabled?: boolean; [key: string]: any }
	): Promise<void> {
		try {
			// Update in Firestore
			await updateDoc(doc(db, 'users', userId), {
				...updates,
				updatedAt: serverTimestamp(),
			});
		} catch (error: unknown) {
			const authError = error as any;
			throw new Error(this.getErrorMessage(authError.code));
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
	 * Get linked providers
	 */
	static getLinkedProviders(): string[] {
		if (!auth.currentUser) return [];
		return auth.currentUser.providerData.map(
			(provider: any) => provider.providerId
		);
	}
}
