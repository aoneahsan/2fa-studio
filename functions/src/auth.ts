/**
 * Authentication Cloud Functions
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();
const auth = admin.auth();

/**
 * Trigger when a new user is created
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  try {
    // Create user document in Firestore
    await db.collection("users").doc(user.uid).set({
      email: user.email,
      displayName: user.displayName || user.email?.split("@")[0],
      photoURL: user.photoURL,
      role: "user",
      subscription: {
        tier: "free",
        accountLimit: 10,
        validUntil: null,
      },
      accountCount: 0,
      settings: {
        theme: "system",
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

    // Send welcome email/notification
    await sendWelcomeNotification(user);

    console.log(`User created: ${user.uid}`);
  } catch (_error) {
    console.error('Error creating user document:', error);
  }
});

/**
 * Trigger when a user is deleted
 */
export const onUserDelete = functions.auth.user().onDelete(async (user) => {
  try {
    const batch = db.batch();

    // Delete user's accounts
    const accountsSnapshot = await db
      .collection("accounts")
      .where("userId", "==", user.uid)
      .get();

    accountsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete user's sessions
    const sessionsSnapshot = await db
      .collection("sessions")
      .where("userId", "==", user.uid)
      .get();

    sessionsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete user's backups
    const backupsSnapshot = await db
      .collection("backups")
      .where("userId", "==", user.uid)
      .get();

    backupsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete user document
    batch.delete(db.collection("users").doc(user.uid));

    await batch.commit();

    console.log(`User deleted: ${user.uid}`);
  } catch (_error) {
    console.error('Error deleting user data:', error);
  }
});

/**
 * Validate admin privileges
 */
export const validateAdmin = functions.https.onCall(async (_data, _context) => {
  if (!context._auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    const userData = userDoc.data();
    
    const isAdmin = userData?.role === "admin" || userData?.role === "super_admin";
    const isSuperAdmin = userData?.role === "super_admin";

    return {
      isAdmin,
      isSuperAdmin,
      role: userData?.role || "user",
    };
  } catch (_error) {
    console.error('Error validating admin:', error);
    throw new functions.https.HttpsError("internal", "Failed to validate admin status");
  }
});

/**
 * Cleanup expired sessions
 */
export const cleanupSessions = functions.https.onCall(async (_data, _context) => {
  // This can be called by scheduled function or admin
  if (context._auth) {
    // Check if admin
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    if (userDoc.data()?.role !== "admin" && userDoc.data()?.role !== "super_admin") {
      throw new functions.https.HttpsError("permission-denied", "Admin access required");
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
    const expiredSessionsSnapshot = await db
      .collection("sessions")
      .where("expiresAt", "<", now)
      .get();

    const batch = db.batch();
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
  } catch (_error) {
    console.error('Error cleaning up sessions:', error);
    throw new functions.https.HttpsError("internal", "Failed to cleanup sessions");
  }
}

/**
 * Send welcome notification to new user
 */
async function sendWelcomeNotification(user: admin.auth.UserRecord) {
  try {
    // Add welcome notification to user's notifications
    await db
      .collection("users")
      .doc(user.uid)
      .collection("notifications")
      .add({
        title: "Welcome to 2FA Studio!",
        message: "Your account has been created successfully. Start adding your 2FA accounts to keep them secure.",
        type: "info",
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // TODO: Send welcome email via SendGrid or other email service
    // TODO: Send push notification via OneSignal
  } catch (_error) {
    console.error('Error sending welcome notification:', error);
  }
}

/**
 * Create session for user
 */
export const createSession = functions.https.onCall(async (_data, _context) => {
  if (!context._auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const { deviceInfo, remember = false } = data;

  try {
    // Calculate expiration (30 days if remember, 24 hours otherwise)
    const expirationHours = remember ? 24 * 30 : 24;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    // Create session
    const sessionRef = await db.collection("sessions").add({
      userId: context.auth.uid,
      deviceInfo: {
        userAgent: deviceInfo?.userAgent || "Unknown",
        platform: deviceInfo?.platform || "Unknown",
        browser: deviceInfo?.browser || "Unknown",
        ip: context.rawRequest.ip || "Unknown",
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
      remember,
    });

    // Update user's last active
    await db.collection("users").doc(context.auth.uid).update({
      lastActive: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      sessionId: sessionRef.id,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (_error) {
    console.error('Error creating session:', error);
    throw new functions.https.HttpsError("internal", "Failed to create session");
  }
});

/**
 * Revoke session
 */
export const revokeSession = functions.https.onCall(async (_data, _context) => {
  if (!context._auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const { sessionId } = data;

  if (!sessionId) {
    throw new functions.https.HttpsError("invalid-argument", "Session ID required");
  }

  try {
    // Get session
    const sessionDoc = await db.collection("sessions").doc(sessionId).get();
    
    if (!sessionDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Session not found");
    }

    // Check if session belongs to user
    if (sessionDoc.data()?.userId !== context.auth.uid) {
      throw new functions.https.HttpsError("permission-denied", "Cannot revoke this session");
    }

    // Delete session
    await sessionDoc.ref.delete();

    return { success: true };
  } catch (_error) {
    console.error('Error revoking session:', error);
    throw new functions.https.HttpsError("internal", "Failed to revoke session");
  }
});

/**
 * Get user sessions
 */
export const getUserSessions = functions.https.onCall(async (_data, _context) => {
  if (!context._auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    const sessionsSnapshot = await db
      .collection("sessions")
      .where("userId", "==", context.auth.uid)
      .orderBy("lastActiveAt", "desc")
      .get();

    const sessions: unknown[] = [];
    sessionsSnapshot.forEach((doc) => {
      sessions.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return { sessions };
  } catch (_error) {
    console.error('Error getting sessions:', error);
    throw new functions.https.HttpsError("internal", "Failed to get sessions");
  }
});