/**
 * Firebase Cloud Functions for 2FA Studio
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as adminFunctions from "./admin";
import * as authFunctions from "./auth";
import * as subscriptionFunctions from "./subscription";
import * as backupFunctions from "./backup";
import * as analyticsFunctions from "./analytics";
import * as securityFunctions from "./security";
import * as webhookFunctions from "./webhooks";

// Initialize Firebase Admin
admin.initializeApp();

// Admin Functions
export const adminGetUserStats = adminFunctions.getUserStats;
export const adminUpdateUserSubscription = adminFunctions.updateUserSubscription;
export const adminDeleteUser = adminFunctions.deleteUser;
export const adminGetSystemStats = adminFunctions.getSystemStats;
export const adminSendNotification = adminFunctions.sendNotification;
export const adminExportUsers = adminFunctions.exportUsers;

// Auth Functions
export const authOnUserCreate = authFunctions.onUserCreate;
export const authOnUserDelete = authFunctions.onUserDelete;
export const authValidateAdmin = authFunctions.validateAdmin;
export const authCleanupSessions = authFunctions.cleanupSessions;

// Subscription Functions
export const subscriptionCreateCheckoutSession = subscriptionFunctions.createCheckoutSession;
export const subscriptionCreatePortalSession = subscriptionFunctions.createPortalSession;
export const subscriptionWebhook = subscriptionFunctions.handleStripeWebhook;
export const subscriptionCheckLimits = subscriptionFunctions.checkAccountLimits;
export const subscriptionUpdateUsage = subscriptionFunctions.updateUsageStats;

// Backup Functions
export const backupScheduleAutoBackup = backupFunctions.scheduleAutoBackup;
export const backupCleanupOldBackups = backupFunctions.cleanupOldBackups;
export const backupExportUserData = backupFunctions.exportUserData;
export const backupValidateBackup = backupFunctions.validateBackup;

// Analytics Functions
export const analyticsAggregateDaily = analyticsFunctions.aggregateDailyStats;
export const analyticsGenerateReports = analyticsFunctions.generateReports;
export const analyticsTrackEvent = analyticsFunctions.trackEvent;
export const analyticsCleanupOldData = analyticsFunctions.cleanupOldAnalytics;

// Security Functions
export const securityMonitorSuspiciousActivity = securityFunctions.monitorSuspiciousActivity;
export const securityEnforceRateLimit = securityFunctions.enforceRateLimit;
export const securityValidateRequest = securityFunctions.validateRequest;
export const securityAuditLog = securityFunctions.createAuditLog;

// Webhook Functions
export const webhookOneSignal = webhookFunctions.handleOneSignalWebhook;
export const webhookGoogleDrive = webhookFunctions.handleGoogleDriveWebhook;

// Scheduled Functions
export const scheduledCleanup = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async (context) => {
    console.log("Running daily cleanup tasks");
    
    // Cleanup tasks
    await Promise.all([
      authFunctions.cleanupExpiredSessions(),
      backupFunctions.cleanupOldBackups(),
      analyticsFunctions.cleanupOldAnalytics(),
      securityFunctions.cleanupOldAuditLogs(),
    ]);
    
    return null;
  });

export const scheduledUsageCheck = functions.pubsub
  .schedule("every 1 hours")
  .onRun(async (context) => {
    console.log("Checking user usage limits");
    
    await subscriptionFunctions.enforceUsageLimits();
    
    return null;
  });

export const scheduledBackup = functions.pubsub
  .schedule("every 12 hours")
  .onRun(async (context) => {
    console.log("Running scheduled backups");
    
    await backupFunctions.runScheduledBackups();
    
    return null;
  });

// HTTP Functions for API
export const api = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  
  // Route API requests
  const path = req.path.split("/").filter(Boolean);
  
  try {
    if (path[0] === "health") {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    } else if (path[0] === "admin" && path[1]) {
      // Admin API routes
      await adminFunctions.handleAdminAPI(req, res);
    } else if (path[0] === "webhook" && path[1]) {
      // Webhook routes
      await webhookFunctions.handleWebhook(req, res);
    } else {
      res.status(404).json({ error: "Not found" });
    }
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});