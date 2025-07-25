/**
 * Authentication Cloud Functions
 */

import {onCall, HttpsError} from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import {FirebaseAuthRequest} from './types';
import {beforeUserCreated} from 'firebase-functions/v2/identity';

// Lazy initialization to prevent calling before admin.initializeApp()
const getDb = () => admin.firestore();

/**
 * Trigger when a new user is created
 */
export const onUserCreate = beforeUserCreated(async (event) => {
	const user = event.data;
	
	if (!user) {
		console.error('No user data provided');
		return;
	}
	
	try {
		// Create user document in Firestore
		await getDb()
			.collection('users')
			.doc(user.uid)
			.set({
				email: user.email,
				displayName: user.displayName || user.email?.split('@')[0],
				photoURL: user.photoURL,
				role: 'user',
				subscription: {
					tier: 'free',
					accountLimit: 10,
					validUntil: null,
				},
				accountCount: 0,
				settings: {
					theme: 'system',
					notifications: {
						security: true,
						updates: true,
						marketing: false,
					},
					autoBackup: false,
					biometricEnabled: false,
				},
				createdAt: admin.firestore.FieldValue.serverTimestamp(),
				lastActive: admin.firestore.FieldValue.serverTimestamp(),
			});

		// Send welcome notification to new user
		await sendWelcomeNotification(user);

		console.log(`User created: ${user.uid}`);
	} catch (error) {
		console.error('Error creating user document:', error);
	}
});

/**
 * Trigger when a user is deleted
 */
export async function onUserDelete(userId: string) {
	try {
		const batch = getDb().batch();

		// Delete user's accounts
		const accountsSnapshot = await getDb()
			.collection('accounts')
			.where('userId', '==', userId)
			.get();

		accountsSnapshot.forEach((doc) => {
			batch.delete(doc.ref);
		});

		// Delete user's sessions
		const sessionsSnapshot = await getDb()
			.collection('sessions')
			.where('userId', '==', userId)
			.get();

		sessionsSnapshot.forEach((doc) => {
			batch.delete(doc.ref);
		});

		// Delete user's backups
		const backupsSnapshot = await getDb()
			.collection('backups')
			.where('userId', '==', userId)
			.get();

		backupsSnapshot.forEach((doc) => {
			batch.delete(doc.ref);
		});

		// Delete user document
		batch.delete(getDb().collection('users').doc(userId));

		await batch.commit();

		console.log(`User deleted: ${userId}`);
	} catch (error) {
		console.error('Error deleting user data:', error);
	}
}

/**
 * Validate admin privileges
 */
export const validateAdmin = onCall(async (request: FirebaseAuthRequest) => {
	if (!request.auth) {
		throw new HttpsError(
			'unauthenticated',
			'User must be authenticated'
		);
	}

	try {
		const userDoc = await getDb().collection('users').doc(request.auth.uid).get();
		const userData = userDoc.data();

		const isAdmin =
			userData?.role === 'admin' || userData?.role === 'super_admin';
		const isSuperAdmin = userData?.role === 'super_admin';

		return {
			isAdmin,
			isSuperAdmin,
			role: userData?.role || 'user',
		};
	} catch (error) {
		console.error('Error validating admin:', error);
		throw new HttpsError(
			'internal',
			'Failed to validate admin status'
		);
	}
});

/**
 * Cleanup expired sessions
 */
export const cleanupSessions = onCall(async (request: FirebaseAuthRequest) => {
	// This can be called by scheduled function or admin
	if (request.auth) {
		// Check if admin
		const userDoc = await getDb().collection('users').doc(request.auth.uid).get();
		if (
			userDoc.data()?.role !== 'admin' &&
			userDoc.data()?.role !== 'super_admin'
		) {
			throw new HttpsError(
				'permission-denied',
				'Admin access required'
			);
		}
	}

	return cleanupExpiredSessions();
});

/**
 * Cleanup expired sessions (internal function)
 */
export async function cleanupExpiredSessions() {
	try {
		const now = new Date();
		const expiredSessionsSnapshot = await getDb()
			.collection('sessions')
			.where('expiresAt', '<', now)
			.get();

		const batch = getDb().batch();
		let count = 0;

		expiredSessionsSnapshot.forEach((doc) => {
			batch.delete(doc.ref);
			count++;
		});

		if (count > 0) {
			await batch.commit();
			console.log(`Cleaned up ${count} expired sessions`);
		}

		return { cleaned: count };
	} catch (error) {
		console.error('Error cleaning up sessions:', error);
		throw new HttpsError(
			'internal',
			'Failed to cleanup sessions'
		);
	}
}

/**
 * Send welcome notification to new user
 */
async function sendWelcomeNotification(user: unknown) {
	try {
		// Add welcome notification to user's notifications
		await getDb().collection('users').doc((user as any).uid).collection('notifications').add({
			title: 'Welcome to 2FA Studio!',
			message:
				'Your account has been created successfully. Start adding your 2FA accounts to keep them secure.',
			type: 'info',
			read: false,
			createdAt: admin.firestore.FieldValue.serverTimestamp(),
		});

		// TODO: Send welcome email via SendGrid or other email service
		// TODO: Send push notification via OneSignal
	} catch (error) {
		console.error('Error sending welcome notification:', error);
	}
}

/**
 * Create session for user
 */
export const createSession = onCall(async (request: FirebaseAuthRequest<{deviceInfo?: unknown; remember?: boolean}>) => {
	if (!request.auth) {
		throw new HttpsError(
			'unauthenticated',
			'User must be authenticated'
		);
	}

	const { deviceInfo, remember = false } = request.data ?? {};

	try {
		// Calculate expiration (30 days if remember, 24 hours otherwise)
		const expirationHours = remember ? 24 * 30 : 24;
		const expiresAt = new Date();
		expiresAt.setHours(expiresAt.getHours() + expirationHours);

		// Create session
		const sessionRef = await getDb().collection('sessions').add({
			userId: request.auth.uid,
			deviceInfo: {
				userAgent: (deviceInfo as any)?.userAgent || 'Unknown',
				platform: (deviceInfo as any)?.platform || 'Unknown',
				browser: (deviceInfo as any)?.browser || 'Unknown',
				ip: (request.rawRequest as any)?.ip || 'Unknown',
			},
			createdAt: admin.firestore.FieldValue.serverTimestamp(),
			lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
			expiresAt,
			remember,
		});

		// Update user's last active
		await getDb().collection('users').doc(request.auth.uid).update({
			lastActive: admin.firestore.FieldValue.serverTimestamp(),
		});

		return {
			sessionId: sessionRef.id,
			expiresAt: expiresAt.toISOString(),
		};
	} catch (error) {
		console.error('Error creating session:', error);
		throw new HttpsError(
			'internal',
			'Failed to create session'
		);
	}
});

/**
 * Revoke session
 */
export const revokeSession = onCall(async (request: FirebaseAuthRequest<{sessionId?: string}>) => {
	if (!request.auth) {
		throw new HttpsError(
			'unauthenticated',
			'User must be authenticated'
		);
	}

	const { sessionId } = request.data ?? {};

	if (!sessionId) {
		throw new HttpsError(
			'invalid-argument',
			'Session ID required'
		);
	}

	try {
		// Get session
		const sessionDoc = await getDb().collection('sessions').doc(sessionId).get();

		if (!sessionDoc.exists) {
			throw new HttpsError('not-found', 'Session not found');
		}

		// Check if session belongs to user
		if (sessionDoc.data()?.userId !== request.auth.uid) {
			throw new HttpsError(
				'permission-denied',
				'Cannot revoke this session'
			);
		}

		// Delete session
		await sessionDoc.ref.delete();

		return { success: true };
	} catch (error) {
		console.error('Error revoking session:', error);
		throw new HttpsError(
			'internal',
			'Failed to revoke session'
		);
	}
});

/**
 * Get user sessions
 */
export const getUserSessions = onCall(async (request: FirebaseAuthRequest) => {
	if (!request.auth) {
		throw new HttpsError(
			'unauthenticated',
			'User must be authenticated'
		);
	}

	try {
		const sessionsSnapshot = await getDb()
			.collection('sessions')
			.where('userId', '==', request.auth.uid)
			.orderBy('lastActiveAt', 'desc')
			.get();

		const sessions: unknown[] = [];
		sessionsSnapshot.forEach((doc) => {
			sessions.push({
				id: doc.id,
				...doc.data(),
			});
		});

		return { sessions };
	} catch (error) {
		console.error('Error getting sessions:', error);
		throw new HttpsError('internal', 'Failed to get sessions');
	}
});