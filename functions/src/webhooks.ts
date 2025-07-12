/**
 * Webhook Cloud Functions
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Request, Response } from "express";
import * as crypto from "crypto";

const db = admin.firestore();

/**
 * Handle OneSignal webhook
 */
export const handleOneSignalWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  // Verify webhook signature
  const signature = req.headers["onesignal-signature"] as string;
  if (!verifyOneSignalSignature(req.body, signature)) {
    res.status(401).send("Invalid signature");
    return;
  }

  try {
    const event = req.body;
    
    switch (event.event) {
      case "notification.clicked":
        await handleNotificationClicked(event);
        break;
        
      case "notification.viewed":
        await handleNotificationViewed(event);
        break;
        
      case "subscription.changed":
        await handleSubscriptionChanged(event);
        break;
        
      default:
        console.log(`Unhandled OneSignal event: ${event.event}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Error processing OneSignal webhook:", error);
    res.status(500).send("Webhook processing failed");
  }
});

/**
 * Handle Google Drive webhook
 */
export const handleGoogleDriveWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  // Verify webhook is from Google
  const channelId = req.headers["x-goog-channel-id"];
  const resourceState = req.headers["x-goog-resource-state"];
  
  if (!channelId || !resourceState) {
    res.status(400).send("Missing required headers");
    return;
  }

  try {
    console.log(`Google Drive webhook: ${resourceState} for channel ${channelId}`);
    
    // Handle different resource states
    switch (resourceState) {
      case "sync":
        // Initial sync message
        break;
        
      case "add":
      case "update":
        await handleDriveFileChange(req.body);
        break;
        
      case "remove":
      case "trash":
        await handleDriveFileRemoval(req.body);
        break;
        
      default:
        console.log(`Unknown resource state: ${resourceState}`);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Error processing Google Drive webhook:", error);
    res.status(500).send("Webhook processing failed");
  }
});

/**
 * Generic webhook handler
 */
export async function handleWebhook(req: Request, res: Response) {
  const path = req.path.split("/").filter(Boolean);
  const webhookType = path[1];

  switch (webhookType) {
    case "stripe":
      // Handled in subscription.ts
      res.status(404).send("Use /stripe-webhook endpoint");
      break;
      
    case "onesignal":
      await handleOneSignalWebhook(req, res);
      break;
      
    case "googledrive":
      await handleGoogleDriveWebhook(req, res);
      break;
      
    default:
      res.status(404).json({ error: "Unknown webhook type" });
  }
}

/**
 * Verify OneSignal webhook signature
 */
function verifyOneSignalSignature(payload: any, signature: string): boolean {
  if (!signature) return false;
  
  const secret = functions.config().onesignal.webhook_secret;
  if (!secret) {
    console.warn("OneSignal webhook secret not configured");
    return true; // Allow in development
  }
  
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("base64");
  
  return signature === expectedSignature;
}

/**
 * Handle notification clicked event
 */
async function handleNotificationClicked(event: any) {
  try {
    const { userId, notificationId, heading, content } = event.data;
    
    // Log the click
    await db.collection("notification_events").add({
      type: "clicked",
      userId,
      notificationId,
      heading,
      content,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Update user engagement metrics
    if (userId) {
      await db.collection("users").doc(userId).update({
        "engagement.lastNotificationClick": admin.firestore.FieldValue.serverTimestamp(),
        "engagement.notificationClicks": admin.firestore.FieldValue.increment(1),
      });
    }
  } catch (error) {
    console.error("Error handling notification click:", error);
  }
}

/**
 * Handle notification viewed event
 */
async function handleNotificationViewed(event: any) {
  try {
    const { userId, notificationId } = event.data;
    
    // Log the view
    await db.collection("notification_events").add({
      type: "viewed",
      userId,
      notificationId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Error handling notification view:", error);
  }
}

/**
 * Handle subscription changed event
 */
async function handleSubscriptionChanged(event: any) {
  try {
    const { userId, subscribed, subscriptionId } = event.data;
    
    if (userId) {
      const updates: any = {
        "pushNotifications.subscribed": subscribed,
        "pushNotifications.lastUpdated": admin.firestore.FieldValue.serverTimestamp(),
      };
      
      if (subscriptionId) {
        updates["pushNotifications.subscriptionId"] = subscriptionId;
      }
      
      await db.collection("users").doc(userId).update(updates);
    }
  } catch (error) {
    console.error("Error handling subscription change:", error);
  }
}

/**
 * Handle Google Drive file change
 */
async function handleDriveFileChange(data: any) {
  try {
    // Parse file change data
    const { fileId, userId } = data;
    
    if (!fileId || !userId) return;
    
    // Check if this is a backup file
    const backupSnapshot = await db
      .collection("backups")
      .where("driveFileId", "==", fileId)
      .where("userId", "==", userId)
      .limit(1)
      .get();
    
    if (!backupSnapshot.empty) {
      const backupDoc = backupSnapshot.docs[0];
      
      // Update backup metadata
      await backupDoc.ref.update({
        lastModified: admin.firestore.FieldValue.serverTimestamp(),
        syncStatus: "pending",
      });
      
      // TODO: Trigger sync process
    }
  } catch (error) {
    console.error("Error handling Drive file change:", error);
  }
}

/**
 * Handle Google Drive file removal
 */
async function handleDriveFileRemoval(data: any) {
  try {
    const { fileId, userId } = data;
    
    if (!fileId || !userId) return;
    
    // Find and mark backup as deleted
    const backupSnapshot = await db
      .collection("backups")
      .where("driveFileId", "==", fileId)
      .where("userId", "==", userId)
      .limit(1)
      .get();
    
    if (!backupSnapshot.empty) {
      const backupDoc = backupSnapshot.docs[0];
      
      await backupDoc.ref.update({
        deletedFromDrive: true,
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      // Notify user
      await db
        .collection("users")
        .doc(userId)
        .collection("notifications")
        .add({
          title: "Backup Deleted",
          message: "A backup file was deleted from your Google Drive",
          type: "warning",
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
  } catch (error) {
    console.error("Error handling Drive file removal:", error);
  }
}

/**
 * Register webhook endpoint
 */
export const registerWebhook = functions.https.onCall(async (data, context) => {
  // Check admin privileges
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const userDoc = await db.collection("users").doc(context.auth.uid).get();
  if (!["admin", "super_admin"].includes(userDoc.data()?.role)) {
    throw new functions.https.HttpsError("permission-denied", "Admin access required");
  }

  const { service, url, events, secret } = data;

  if (!service || !url || !events) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
  }

  try {
    // Store webhook configuration
    const webhookRef = await db.collection("webhooks").add({
      service,
      url,
      events,
      secret: secret ? crypto.createHash("sha256").update(secret).digest("hex") : null,
      active: true,
      createdBy: context.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastTriggered: null,
      failureCount: 0,
    });

    return { 
      webhookId: webhookRef.id,
      message: "Webhook registered successfully",
    };
  } catch (error) {
    console.error("Error registering webhook:", error);
    throw new functions.https.HttpsError("internal", "Failed to register webhook");
  }
});

/**
 * List registered webhooks
 */
export const listWebhooks = functions.https.onCall(async (data, context) => {
  // Check admin privileges
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const userDoc = await db.collection("users").doc(context.auth.uid).get();
  if (!["admin", "super_admin"].includes(userDoc.data()?.role)) {
    throw new functions.https.HttpsError("permission-denied", "Admin access required");
  }

  try {
    const webhooksSnapshot = await db
      .collection("webhooks")
      .orderBy("createdAt", "desc")
      .get();

    const webhooks = webhooksSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      secret: undefined, // Don't expose secrets
    }));

    return { webhooks };
  } catch (error) {
    console.error("Error listing webhooks:", error);
    throw new functions.https.HttpsError("internal", "Failed to list webhooks");
  }
});