/**
 * Subscription Service for managing Stripe subscriptions
 * @module services/subscription
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';
import {
	doc,
	updateDoc,
	getDoc,
	collection,
	query,
	where,
	getDocs,
	addDoc,
	serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '@src/config/firebase';
import { User, SubscriptionTier, SubscriptionStatus } from '@src/types';

// Initialize Stripe
let stripePromise: Promise<Stripe | null>;

export interface PriceOption {
	id: string;
	priceId: string;
	name: string;
	description: string;
	price: number;
	currency: string;
	interval: 'month' | 'year';
	features: string[];
}

export interface CreateCheckoutSessionParams {
	priceId: string;
	userId: string;
	email: string;
	successUrl: string;
	cancelUrl: string;
}

export interface SubscriptionUpdate {
	tier: SubscriptionTier;
	status: SubscriptionStatus;
	stripeCustomerId?: string;
	stripeSubscriptionId?: string;
	stripePriceId?: string;
	currentPeriodStart?: Date;
	currentPeriodEnd?: Date;
	cancelAtPeriodEnd?: boolean;
}

export class SubscriptionService {
	private static prices: PriceOption[] = [
		{
			id: 'premium_monthly',
			priceId: import.meta.env.VITE_STRIPE_PRICE_PREMIUM_MONTHLY || '',
			name: 'Premium Monthly',
			description: 'Unlimited accounts, no ads, automatic backups',
			price: 299, // in cents
			currency: 'usd',
			interval: 'month',
			features: [
				'Unlimited accounts',
				'No advertisements',
				'Automatic cloud backup',
				'Priority support',
				'Browser extension',
				'Advanced security features',
			],
		},
		{
			id: 'premium_yearly',
			priceId: import.meta.env.VITE_STRIPE_PRICE_PREMIUM_YEARLY || '',
			name: 'Premium Yearly',
			description: 'Save 20% with annual billing',
			price: 2399, // in cents (20% off)
			currency: 'usd',
			interval: 'year',
			features: [
				'Everything in Premium Monthly',
				'Save $7.20 per year',
				'2 months free',
			],
		},
		{
			id: 'family_monthly',
			priceId: import.meta.env.VITE_STRIPE_PRICE_FAMILY_MONTHLY || '',
			name: 'Family Monthly',
			description: 'Share with up to 5 family members',
			price: 499, // in cents
			currency: 'usd',
			interval: 'month',
			features: [
				'Everything in Premium',
				'Up to 5 family members',
				'Family vault sharing',
				'Centralized billing',
				'Family management tools',
			],
		},
		{
			id: 'family_yearly',
			priceId: import.meta.env.VITE_STRIPE_PRICE_FAMILY_YEARLY || '',
			name: 'Family Yearly',
			description: 'Best value for families',
			price: 3999, // in cents (33% off)
			currency: 'usd',
			interval: 'year',
			features: [
				'Everything in Family Monthly',
				'Save $19.89 per year',
				'2.5 months free',
			],
		},
	];

	/**
	 * Initialize Stripe
	 */
	static async initializeStripe(): Promise<Stripe | null> {
		if (!stripePromise) {
			const publishableKey = (import.meta as any).env
				.VITE_STRIPE_PUBLISHABLE_KEY;
			if (!publishableKey) {
				console.error('Stripe publishable key not configured');
				return null;
			}
			stripePromise = loadStripe(publishableKey);
		}
		return stripePromise;
	}

	/**
	 * Get available subscription plans
	 */
	static getAvailablePlans(): PriceOption[] {
		return this.prices.filter((price: any) => price.priceId);
	}

	/**
	 * Create a Stripe checkout session
	 */
	static async createCheckoutSession(
		params: CreateCheckoutSessionParams
	): Promise<string> {
		try {
			const response = await fetch('/api/create-checkout-session', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${await auth.currentUser?.getIdToken()}`,
				},
				body: JSON.stringify({
					priceId: params.priceId,
					userId: params.userId,
					email: params.email,
					successUrl: params.successUrl,
					cancelUrl: params.cancelUrl,
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to create checkout session');
			}

			const { sessionId } = await response.json();
			return sessionId;
		} catch (error) {
			console.error('Error creating checkout session:', error);
			throw error;
		}
	}

	/**
	 * Redirect to Stripe checkout
	 */
	static async redirectToCheckout(sessionId: string): Promise<void> {
		const stripe = await this.initializeStripe();
		if (!stripe) {
			throw new Error('Stripe not initialized');
		}

		const { error } = await stripe.redirectToCheckout({ sessionId });
		if (error) {
			throw error;
		}
	}

	/**
	 * Create billing portal session
	 */
	static async createBillingPortalSession(customerId: string): Promise<string> {
		try {
			const response = await fetch('/api/create-billing-portal-session', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${await auth.currentUser?.getIdToken()}`,
				},
				body: JSON.stringify({ customerId }),
			});

			if (!response.ok) {
				throw new Error('Failed to create billing portal session');
			}

			const { url } = await response.json();
			return url;
		} catch (error) {
			console.error('Error creating billing portal session:', error);
			throw error;
		}
	}

	/**
	 * Update user subscription in Firestore
	 */
	static async updateUserSubscription(
		userId: string,
		update: SubscriptionUpdate
	): Promise<void> {
		try {
			const userRef = doc(db, 'users', userId);

			// Calculate account limit based on tier
			let accountLimit = 10; // Free tier
			if (update.tier === 'premium' || update.tier === 'family') {
				accountLimit = -1; // Unlimited
			}

			// Update user document
			await updateDoc(userRef, {
				'subscription.tier': update.tier,
				'subscription.status': update.status,
				'subscription.accountLimit': accountLimit,
				'subscription.stripeCustomerId': update.stripeCustomerId || null,
				'subscription.stripeSubscriptionId':
					update.stripeSubscriptionId || null,
				'subscription.stripePriceId': update.stripePriceId || null,
				'subscription.currentPeriodStart': update.currentPeriodStart || null,
				'subscription.currentPeriodEnd': update.currentPeriodEnd || null,
				'subscription.cancelAtPeriodEnd': update.cancelAtPeriodEnd || false,
				'subscription.features': this.getFeaturesByTier(update.tier),
				updatedAt: serverTimestamp(),
			});

			// Log subscription change
			await this.logSubscriptionEvent(userId, 'subscription_updated', {
				tier: update.tier,
				status: update.status,
			});
		} catch (error) {
			console.error('Error updating user subscription:', error);
			throw error;
		}
	}

	/**
	 * Get features by subscription tier
	 */
	private static getFeaturesByTier(
		tier: SubscriptionTier
	): Record<string, boolean> {
		const baseFeatures = {
			cloudBackup: false,
			browserExtension: false,
			prioritySupport: false,
			advancedSecurity: false,
			noAds: false,
			familySharing: false,
		};

		switch (tier) {
			case 'premium':
				return {
					...baseFeatures,
					cloudBackup: true,
					browserExtension: true,
					prioritySupport: true,
					advancedSecurity: true,
					noAds: true,
				};
			case 'family':
				return {
					...baseFeatures,
					cloudBackup: true,
					browserExtension: true,
					prioritySupport: true,
					advancedSecurity: true,
					noAds: true,
					familySharing: true,
				};
			default:
				return baseFeatures;
		}
	}

	/**
	 * Check if user has active subscription
	 */
	static async hasActiveSubscription(userId: string): Promise<boolean> {
		try {
			const userDoc = await getDoc(doc(db, 'users', userId));
			if (!userDoc.exists()) {
				return false;
			}

			const user = userDoc.data() as User;
			return (
				user.subscription?.status === 'active' &&
				user.subscription?.tier !== 'free'
			);
		} catch (error) {
			console.error('Error checking subscription:', error);
			return false;
		}
	}

	/**
	 * Get subscription usage stats
	 */
	static async getUsageStats(userId: string): Promise<{
		accountCount: number;
		accountLimit: number | null;
		storageUsed: number;
		lastBackup: Date | null;
	}> {
		try {
			// Get user data
			const userDoc = await getDoc(doc(db, 'users', userId));
			if (!userDoc.exists()) {
				throw new Error('User not found');
			}

			const user = userDoc.data() as User;

			// Count accounts
			const accountsQuery = query(
				collection(db, 'accounts'),
				where('userId', '==', userId)
			);
			const accountsSnapshot = await getDocs(accountsQuery);
			const accountCount = accountsSnapshot.size;

			return {
				accountCount,
				accountLimit: user.subscription?.accountLimit || 10,
				storageUsed: user.storageUsed || 0,
				lastBackup: user.lastBackup
					? (user.lastBackup as any).toDate
						? (user.lastBackup as any).toDate()
						: user.lastBackup
					: null,
			};
		} catch (error) {
			console.error('Error getting usage stats:', error);
			throw error;
		}
	}

	/**
	 * Log subscription events
	 */
	private static async logSubscriptionEvent(
		userId: string,
		event: string,
		metadata: Record<string, any>
	): Promise<void> {
		try {
			await addDoc(collection(db, 'subscriptionEvents'), {
				userId,
				event,
				metadata,
				timestamp: serverTimestamp(),
			});
		} catch (error) {
			console.error('Error logging subscription event:', error);
		}
	}

	/**
	 * Cancel subscription
	 */
	static async cancelSubscription(subscriptionId: string): Promise<void> {
		try {
			const response = await fetch('/api/cancel-subscription', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${await auth.currentUser?.getIdToken()}`,
				},
				body: JSON.stringify({ subscriptionId }),
			});

			if (!response.ok) {
				throw new Error('Failed to cancel subscription');
			}
		} catch (error) {
			console.error('Error canceling subscription:', error);
			throw error;
		}
	}

	/**
	 * Resume subscription (remove cancel at period end)
	 */
	static async resumeSubscription(subscriptionId: string): Promise<void> {
		try {
			const response = await fetch('/api/resume-subscription', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${await auth.currentUser?.getIdToken()}`,
				},
				body: JSON.stringify({ subscriptionId }),
			});

			if (!response.ok) {
				throw new Error('Failed to resume subscription');
			}
		} catch (error) {
			console.error('Error resuming subscription:', error);
			throw error;
		}
	}
}

export const subscriptionService = SubscriptionService;
