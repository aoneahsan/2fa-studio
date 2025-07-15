/**
 * Google Play Billing Service
 * @module services/google-play-billing
 */

import { Capacitor } from '@capacitor/core';
import {
	UserSubscription,
	PaymentMethod,
	Invoice,
	SubscriptionTier,
	PaymentProvider,
} from '@src/types/subscription';
import { FirestoreService } from './firestore.service';
import {
	GooglePlayNotification,
	GooglePlaySubscriptionNotification,
} from '@src/types/payment';

export interface GooglePlayProduct {
	productId: string;
	type: 'inapp' | 'subs';
	price: string;
	price_amount_micros: number;
	price_currency_code: string;
	title: string;
	description: string;
	subscriptionPeriod?: string;
	freeTrialPeriod?: string;
	introductoryPrice?: string;
	introductoryPricePeriod?: string;
	introductoryPriceCycles?: number;
}

export interface GooglePlayPurchase {
	productId: string;
	purchaseToken: string;
	purchaseTime: number;
	purchaseState: number;
	acknowledged: boolean;
	autoRenewing?: boolean;
	orderId: string;
	packageName: string;
	developerPayload?: string;
	signature: string;
	originalJson: string;
}

export interface GooglePlaySubscription {
	productId: string;
	purchaseToken: string;
	autoRenewing: boolean;
	orderId: string;
	packageName: string;
	purchaseTime: number;
	purchaseState: number;
	acknowledged: boolean;
	expiryTimeMillis: number;
	startTimeMillis: number;
	linkedPurchaseToken?: string;
	paymentState?: number;
	cancelReason?: number;
	userCancellationTimeMillis?: number;
	priceAmountMicros: number;
	priceCurrencyCode: string;
	countryCode: string;
}

export interface PlayStoreReceiptValidationResult {
	valid: boolean;
	subscription?: GooglePlaySubscription;
	error?: string;
	fraudRisk?: 'low' | 'medium' | 'high';
}

export class GooglePlayBillingService {
	private static isInitialized = false;
	private static isConnected = false;
	private static availableProducts: GooglePlayProduct[] = [];

	/**
	 * Initialize Google Play Billing
	 */
	static async initialize(): Promise<{ success: boolean; error?: string }> {
		try {
			if (
				!Capacitor.isNativePlatform() ||
				Capacitor.getPlatform() !== 'android'
			) {
				return {
					success: false,
					error: 'Google Play Billing is only available on Android',
				};
			}

			// Initialize billing client
			// This would normally use a Capacitor plugin
			// For now, we'll simulate the initialization
			this.isInitialized = true;
			this.isConnected = true;

			console.log('Google Play Billing initialized');
			return { success: true };
		} catch (error) {
			console.error('Error initializing Google Play Billing:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Query available products
	 */
	static async queryProducts(productIds: string[]): Promise<{
		success: boolean;
		products: GooglePlayProduct[];
		error?: string;
	}> {
		try {
			if (!this.isConnected) {
				throw new Error('Google Play Billing not connected');
			}

			// Simulate product query
			// In real implementation, this would call the Google Play Billing API
			const mockProducts: GooglePlayProduct[] = productIds.map((id: any) => ({
				productId: id,
				type: id.includes('monthly') ? 'subs' : 'subs',
				price: id.includes('premium')
					? '$2.99'
					: id.includes('family')
						? '$4.99'
						: '$9.99',
				price_amount_micros: id.includes('premium')
					? 2990000
					: id.includes('family')
						? 4990000
						: 9990000,
				price_currency_code: 'USD',
				title: `2FA Studio ${id.replace('_', ' ')}`,
				description: `2FA Studio subscription - ${id}`,
				subscriptionPeriod: id.includes('monthly') ? 'P1M' : 'P1Y',
				freeTrialPeriod: 'P7D',
			}));

			this.availableProducts = mockProducts;

			return {
				success: true,
				products: mockProducts,
			};
		} catch (error) {
			console.error('Error querying products:', error);
			return {
				success: false,
				products: [],
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Purchase a subscription
	 */
	static async purchaseSubscription(productId: string): Promise<{
		success: boolean;
		purchase?: GooglePlayPurchase;
		error?: string;
	}> {
		try {
			if (!this.isConnected) {
				throw new Error('Google Play Billing not connected');
			}

			// Simulate purchase flow
			// In real implementation, this would launch the Google Play purchase flow
			const mockPurchase: GooglePlayPurchase = {
				productId,
				purchaseToken: `gpa.${Math.random().toString(36).substr(2, 9)}`,
				purchaseTime: Date.now(),
				purchaseState: 1, // PURCHASED
				acknowledged: false,
				autoRenewing: true,
				orderId: `GPA.${Math.random().toString(36).substr(2, 12)}`,
				packageName: 'com.fa2s.app',
				signature: 'mock_signature',
				originalJson: '{}',
			};

			return {
				success: true,
				purchase: mockPurchase,
			};
		} catch (error) {
			console.error('Error purchasing subscription:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Acknowledge a purchase
	 */
	static async acknowledgePurchase(purchaseToken: string): Promise<{
		success: boolean;
		error?: string;
	}> {
		try {
			if (!this.isConnected) {
				throw new Error('Google Play Billing not connected');
			}

			// Simulate acknowledgment
			// In real implementation, this would call the acknowledgePurchase API
			console.log('Acknowledging purchase:', purchaseToken);

			return { success: true };
		} catch (error) {
			console.error('Error acknowledging purchase:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Query existing purchases
	 */
	static async queryPurchases(): Promise<{
		success: boolean;
		purchases: GooglePlayPurchase[];
		error?: string;
	}> {
		try {
			if (!this.isConnected) {
				throw new Error('Google Play Billing not connected');
			}

			// Simulate query purchases
			// In real implementation, this would query existing purchases
			return {
				success: true,
				purchases: [],
			};
		} catch (error) {
			console.error('Error querying purchases:', error);
			return {
				success: false,
				purchases: [],
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Validate purchase receipt with Google Play Console API
	 */
	static async validateReceipt(
		packageName: string,
		productId: string,
		purchaseToken: string
	): Promise<PlayStoreReceiptValidationResult> {
		try {
			// Call Cloud Function to validate receipt
			const response = await fetch('/api/google-play/validate-receipt', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					packageName,
					productId,
					purchaseToken,
				}),
			});

			const result = await response.json();

			if (!response.ok) {
				return {
					valid: false,
					error: result.error || 'Receipt validation failed',
				};
			}

			return {
				valid: true,
				subscription: result.subscription,
				fraudRisk: result.fraudRisk || 'low',
			};
		} catch (error) {
			console.error('Error validating receipt:', error);
			return {
				valid: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Create subscription from Google Play purchase
	 */
	static async createSubscriptionFromPurchase(
		userId: string,
		purchase: GooglePlayPurchase,
		planId: string
	): Promise<{
		success: boolean;
		subscription?: UserSubscription;
		error?: string;
	}> {
		try {
			// Validate the purchase first
			const validation = await this.validateReceipt(
				purchase.packageName,
				purchase.productId,
				purchase.purchaseToken
			);

			if (!validation.valid) {
				return {
					success: false,
					error: validation.error || 'Invalid purchase',
				};
			}

			// Create subscription record
			const subscription: UserSubscription = {
				id: `gp_${purchase.orderId}`,
				userId,
				planId,
				tier: this.getTierFromProductId(purchase.productId),
				status: 'active',
				provider: 'google_play',
				providerSubscriptionId: purchase.purchaseToken,
				currentPeriodStart: new Date(purchase.purchaseTime),
				currentPeriodEnd: new Date(
					purchase.purchaseTime + 30 * 24 * 60 * 60 * 1000
				), // 30 days
				cancelAtPeriodEnd: false,
				createdAt: new Date(),
				updatedAt: new Date(),
				metadata: {
					orderId: purchase.orderId,
					productId: purchase.productId,
					packageName: purchase.packageName,
				},
			};

			// Store in Firestore
			await FirestoreService.createDocument(
				`users/${userId}/subscriptions`,
				subscription
			);

			// Acknowledge the purchase
			await this.acknowledgePurchase(purchase.purchaseToken);

			return {
				success: true,
				subscription,
			};
		} catch (error) {
			console.error('Error creating subscription from purchase:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Cancel subscription
	 */
	static async cancelSubscription(subscriptionId: string): Promise<{
		success: boolean;
		error?: string;
	}> {
		try {
			// Note: Google Play subscriptions can only be canceled by the user
			// through the Play Store. We can only update our internal state.

			const firestoreResult = await FirestoreService.getCollection(
				'subscriptions',
				[
					{
						field: 'providerSubscriptionId',
						operator: '==',
						value: subscriptionId,
					},
				]
			);

			if (firestoreResult.success && firestoreResult.data.length > 0) {
				await FirestoreService.updateDocument(
					'subscriptions',
					firestoreResult.data[0].id,
					{
						cancelAtPeriodEnd: true,
						updatedAt: new Date(),
					}
				);
			}

			return { success: true };
		} catch (error) {
			console.error('Error canceling subscription:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Handle Google Play webhook (Real-time Developer Notifications)
	 */
	static async handleWebhook(
		notification: GooglePlayNotification
	): Promise<void> {
		try {
			const { subscriptionNotification, testNotification } =
				notification as GooglePlayNotification;

			if (testNotification) {
				console.log('Received Google Play test notification');
				return;
			}

			if (subscriptionNotification) {
				await this.handleSubscriptionNotification(subscriptionNotification);
			}
		} catch (error) {
			console.error('Error handling Google Play webhook:', error);
		}
	}

	/**
	 * Handle Google Play Developer Notification
	 */
	static async handleDeveloperNotification(
		notification: GooglePlayNotification
	): Promise<void> {
		try {
			const { subscriptionNotification, testNotification } = notification;

			if (testNotification) {
				console.log('Received Google Play test notification');
				return;
			}

			if (subscriptionNotification) {
				await this.handleSubscriptionNotification(subscriptionNotification);
			}
		} catch (error) {
			console.error('Error handling Google Play webhook:', error);
		}
	}

	/**
	 * Handle subscription notification
	 */
	private static async handleSubscriptionNotification(
		notification: GooglePlaySubscriptionNotification
	): Promise<void> {
		const { subscriptionId, purchaseToken, notificationType } = notification;

		try {
			let updateData: Partial<UserSubscription> = {};

			switch (notificationType) {
				case 1: // SUBSCRIPTION_RECOVERED
					updateData.status = 'active';
					break;
				case 2: // SUBSCRIPTION_RENEWED
					updateData.status = 'active';
					break;
				case 3: // SUBSCRIPTION_CANCELED
					updateData.status = 'canceled';
					updateData.canceledAt = new Date();
					break;
				case 4: // SUBSCRIPTION_PURCHASED
					updateData.status = 'active';
					break;
				case 5: // SUBSCRIPTION_ON_HOLD
					updateData.status = 'paused';
					break;
				case 6: // SUBSCRIPTION_IN_GRACE_PERIOD
					updateData.status = 'past_due';
					break;
				case 7: // SUBSCRIPTION_RESTARTED
					updateData.status = 'active';
					break;
				case 8: // SUBSCRIPTION_PRICE_CHANGE_CONFIRMED
					// Handle price change
					break;
				case 9: // SUBSCRIPTION_DEFERRED
					updateData.status = 'paused';
					break;
				case 12: // SUBSCRIPTION_REVOKED
					updateData.status = 'canceled';
					break;
				case 13: // SUBSCRIPTION_EXPIRED
					updateData.status = 'canceled';
					break;
			}

			await FirestoreService.updateDocument(
				'subscriptions',
				subscriptionId,
				updateData
			);
		} catch (error) {
			console.error('Error handling subscription notification:', error);
		}
	}

	/**
	 * Get subscription tier from product ID
	 */
	private static getTierFromProductId(productId: string): SubscriptionTier {
		if (productId.includes('premium')) return 'premium';
		if (productId.includes('family')) return 'family';
		if (productId.includes('business')) return 'business';
		return 'free';
	}

	/**
	 * Disconnect from Google Play Billing
	 */
	static disconnect(): void {
		this.isConnected = false;
		this.availableProducts = [];
		console.log('Google Play Billing disconnected');
	}

	/**
	 * Check if service is connected
	 */
	static isServiceConnected(): boolean {
		return this.isConnected;
	}

	/**
	 * Get available products
	 */
	static getAvailableProducts(): GooglePlayProduct[] {
		return this.availableProducts;
	}
}
