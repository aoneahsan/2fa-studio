/**
 * Subscription Cloud Functions
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";

const db = admin.firestore();
const stripe = new Stripe(functions.config().stripe.secret_key, {
  apiVersion: "2023-10-16",
});

// Subscription tiers and prices
const SUBSCRIPTION_PRICES = {
  pro: functions.config().stripe.price_pro || "price_pro_monthly",
  premium: functions.config().stripe.price_premium || "price_premium_monthly",
  business: functions.config().stripe.price_business || "price_business_monthly",
};

const TIER_LIMITS = {
  free: { accounts: 10, backups: 1 },
  pro: { accounts: 50, backups: 10 },
  premium: { accounts: -1, backups: -1 }, // Unlimited
  business: { accounts: -1, backups: -1 }, // Unlimited
};

/**
 * Create Stripe checkout session
 */
export const createCheckoutSession = functions.https.onCall(async (_data, _context) => {
  if (!context._auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const { tier, successUrl, cancelUrl } = data;

  if (!tier || !SUBSCRIPTION_PRICES[tier as keyof typeof SUBSCRIPTION_PRICES]) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid subscription tier");
  }

  try {
    // Get or create Stripe customer
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    const userData = userDoc.data();
    
    let customerId = userData?.stripeCustomerId;
    
    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: userData?.email,
        metadata: {
          userId: context.auth.uid,
        },
      });
      
      customerId = customer.id;
      
      // Save customer ID
      await userDoc.ref.update({
        stripeCustomerId: customerId,
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: SUBSCRIPTION_PRICES[tier as keyof typeof SUBSCRIPTION_PRICES],
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl || `${functions.config().app.url}/settings?tab=subscription&status=success`,
      cancel_url: cancelUrl || `${functions.config().app.url}/settings?tab=subscription&status=cancelled`,
      metadata: {
        userId: context.auth.uid,
        tier,
      },
    });

    return { sessionId: session.id, url: session.url };
  } catch (_error) {
    console.error('Error creating checkout session:', error);
    throw new functions.https.HttpsError("internal", "Failed to create checkout session");
  }
});

/**
 * Create customer portal session
 */
export const createPortalSession = functions.https.onCall(async (_data, _context) => {
  if (!context._auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const { returnUrl } = data;

  try {
    // Get user's Stripe customer ID
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    const customerId = userDoc.data()?.stripeCustomerId;

    if (!customerId) {
      throw new functions.https.HttpsError("not-found", "No subscription found");
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || `${functions.config().app.url}/settings?tab=subscription`,
    });

    return { url: session.url };
  } catch (_error) {
    console.error('Error creating portal session:', error);
    throw new functions.https.HttpsError("internal", "Failed to create portal session");
  }
});

/**
 * Handle Stripe webhook
 */
export const handleStripeWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const sig = req.headers["stripe-signature"];
  const endpointSecret = functions.config().stripe.webhook_secret;

  if (!sig || !endpointSecret) {
    res.status(400).send("Missing signature or secret");
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err: unknown) {
    console.error("Webhook signature verification failed:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (_error) {
    console.error('Error processing webhook:', error);
    res.status(500).send("Webhook processing failed");
  }
});

/**
 * Check account limits for user
 */
export const checkAccountLimits = functions.https.onCall(async (_data, _context) => {
  if (!context._auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    const userData = userDoc.data();
    
    const tier = userData?.subscription?.tier || "free";
    const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS];
    const currentCount = userData?.accountCount || 0;

    return {
      tier,
      limit: limits.accounts,
      current: currentCount,
      remaining: limits.accounts === -1 ? -1 : limits.accounts - currentCount,
      canAdd: limits.accounts === -1 || currentCount < limits.accounts,
    };
  } catch (_error) {
    console.error('Error checking limits:', error);
    throw new functions.https.HttpsError("internal", "Failed to check limits");
  }
});

/**
 * Update usage statistics
 */
export const updateUsageStats = functions.https.onCall(async (_data, _context) => {
  if (!context._auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const { action, value = 1 } = data;

  try {
    const increment = admin.firestore.FieldValue.increment(value);
    const updates: unknown = {
      lastActive: admin.firestore.FieldValue.serverTimestamp(),
    };

    switch (action) {
      case "account_added":
        updates.accountCount = increment;
        break;
      case "account_removed":
        updates.accountCount = admin.firestore.FieldValue.increment(-value);
        break;
      case "backup_created":
        updates["usage.backupsThisMonth"] = increment;
        break;
      case "code_generated":
        updates["usage.codesGeneratedToday"] = increment;
        break;
    }

    await db.collection("users").doc(context.auth.uid).update(updates);

    return { success: true };
  } catch (_error) {
    console.error('Error updating usage stats:', error);
    throw new functions.https.HttpsError("internal", "Failed to update usage stats");
  }
});

/**
 * Enforce usage limits (scheduled function)
 */
export async function enforceUsageLimits() {
  try {
    // Check users exceeding limits
    const usersSnapshot = await db.collection("users").get();
    const batch = db.batch();
    let violations = 0;

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const tier = userData.subscription?.tier || "free";
      const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS];
      
      if (limits.accounts !== -1 && userData.accountCount > limits.accounts) {
        // Mark as exceeding limits
        batch.update(doc.ref, {
          "subscription.exceedsLimits": true,
          "subscription.limitExceededAt": admin.firestore.FieldValue.serverTimestamp(),
        });
        violations++;
      }
    }

    if (violations > 0) {
      await batch.commit();
      console.log(`Found ${violations} users exceeding limits`);
    }

    return { violations };
  } catch (_error) {
    console.error('Error enforcing limits:', error);
    throw error;
  }
}

// Webhook handlers
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier;

  if (!userId || !tier) {
    console.error("Missing metadata in checkout session");
    return;
  }

  console.log(`Checkout completed for user ${userId}, tier: ${tier}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  // Find user by Stripe customer ID
  const usersSnapshot = await db
    .collection("users")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    console.error(`User not found for customer ${customerId}`);
    return;
  }

  const userDoc = usersSnapshot.docs[0];
  const priceId = subscription.items.data[0]?.price.id;
  
  // Determine tier from price ID
  let tier = "free";
  for (const [t, p] of Object.entries(SUBSCRIPTION_PRICES)) {
    if (p === priceId) {
      tier = t;
      break;
    }
  }

  // Update subscription
  await userDoc.ref.update({
    subscription: {
      tier,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      accountLimit: TIER_LIMITS[tier as keyof typeof TIER_LIMITS].accounts,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  });

  console.log(`Updated subscription for user ${userDoc.id} to ${tier}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  // Find user by Stripe customer ID
  const usersSnapshot = await db
    .collection("users")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    console.error(`User not found for customer ${customerId}`);
    return;
  }

  const userDoc = usersSnapshot.docs[0];

  // Revert to free tier
  await userDoc.ref.update({
    subscription: {
      tier: "free",
      accountLimit: TIER_LIMITS.free.accounts,
      status: "cancelled",
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  });

  console.log(`Subscription cancelled for user ${userDoc.id}`);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`Payment succeeded for invoice ${invoice.id}`);
  // TODO: Send payment confirmation email
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log(`Payment failed for invoice ${invoice.id}`);
  // TODO: Send payment failure notification
}