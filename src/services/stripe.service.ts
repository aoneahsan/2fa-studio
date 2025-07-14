/**
 * Stripe payment integration service
 * @module services/stripe
 */

import {
	loadStripe,
	Stripe,
	StripeElements,
	StripeCardElement,
} from '@stripe/stripe-js';
import {
	UserSubscription,
	PaymentMethod,
	Customer,
	Invoice,
	SubscriptionTier,
	PaymentProvider,
} from '@src/types/subscription';
import { FirestoreService } from './firestore.service';

export interface CreateSubscriptionParams {
	userId: string;
	planId: string;
	paymentMethodId: string;
	billingAddress?: {
		line1: string;
		line2?: string;
		city: string;
		state?: string;
		postalCode: string;
		country: string;
	};
	taxId?: string;
	couponCode?: string;
}

export interface UpdateSubscriptionParams {
	subscriptionId: string;
	planId?: string;
	paymentMethodId?: string;
	cancelAtPeriodEnd?: boolean;
}

export interface CreatePaymentIntentParams {
	amount: number;
	currency: string;
	paymentMethodId: string;
	customerId?: string;
	metadata?: Record<string, string>;
}

export interface StripeWebhookEvent {
	id: string;
	type: string;
	data: {
		object: unknown;
	};
	created: number;
	livemode: boolean;
}

export class StripeService {
	private static stripe: Stripe | null = null;
	private static elements: StripeElements | null = null;

	/**
	 * Initialize Stripe with publishable key
	 */
	static async initialize(publishableKey: string): Promise<Stripe> {
		if (!this.stripe) {
			this.stripe = await loadStripe(publishableKey);
			if (!this.stripe) {
				throw new Error('Failed to initialize Stripe');
			}
		}
		return this.stripe;
	}

	/**
	 * Create Stripe Elements
	 */
	static createElements(options?: {
		clientSecret?: string;
		appearance?: unknown;
	}): StripeElements {
		if (!this.stripe) {
			throw new Error('Stripe not initialized');
		}

		this.elements = this.stripe.elements(options);
		return this.elements;
	}

	/**
	 * Create payment method from card element
	 */
	static async createPaymentMethod(
		cardElement: StripeCardElement,
		billingDetails?: {
			name?: string;
			email?: string;
			phone?: string;
			address?: unknown;
		}
	): Promise<{ paymentMethod?: unknown; error?: unknown }> {
		if (!this.stripe) {
			throw new Error('Stripe not initialized');
		}

		return await this.stripe.createPaymentMethod({
			type: 'card',
			card: cardElement,
			billing_details: billingDetails,
		});
	}

	/**
	 * Confirm payment intent
	 */
	static async confirmPayment(
		clientSecret: string,
		options?: {
			payment_method?: string;
			return_url?: string;
		}
	): Promise<{ paymentIntent?: unknown; error?: unknown }> {
		if (!this.stripe) {
			throw new Error('Stripe not initialized');
		}

		return await this.stripe.confirmPayment({
			clientSecret,
			...options,
		});
	}

	/**
	 * Create subscription via Cloud Function
	 */
	static async createSubscription(params: CreateSubscriptionParams): Promise<{
		success: boolean;
		subscription?: UserSubscription;
		clientSecret?: string;
		error?: string;
	}> {
		try {
			// Call Cloud Function to create subscription
			const response = await fetch('/api/stripe/create-subscription', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(params),
			});

			const result = await response.json();

			if (!response.ok) {
				return {
					success: false,
					error: result.error || 'Failed to create subscription',
				};
			}

			// Store subscription in Firestore
			if (result.subscription) {
				await FirestoreService.createDocument(
					`users/${params.userId}/subscriptions`,
					{
						...result.subscription,
						provider: 'stripe' as PaymentProvider,
						createdAt: new Date(),
						updatedAt: new Date(),
					}
				);
			}

			return {
				success: true,
				subscription: result.subscription,
				clientSecret: result.clientSecret,
			};
		} catch (error) {
			console.error('Error creating subscription:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Update subscription
	 */
	static async updateSubscription(params: UpdateSubscriptionParams): Promise<{
		success: boolean;
		subscription?: UserSubscription;
		error?: string;
	}> {
		try {
			const response = await fetch('/api/stripe/update-subscription', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(params),
			});

			const result = await response.json();

			if (!response.ok) {
				return {
					success: false,
					error: result.error || 'Failed to update subscription',
				};
			}

			// Update subscription in Firestore
			if (result.subscription) {
				const firestoreResult = await FirestoreService.getCollection(
					'subscriptions',
					[
						{
							field: 'providerSubscriptionId',
							operator: '==',
							value: params.subscriptionId,
						},
					]
				);

				if (firestoreResult.success && firestoreResult.data.length > 0) {
					await FirestoreService.updateDocument(
						'subscriptions',
						firestoreResult.data[0].id,
						{
							...result.subscription,
							updatedAt: new Date(),
						}
					);
				}
			}

			return {
				success: true,
				subscription: result.subscription,
			};
		} catch (error) {
			console.error('Error updating subscription:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Cancel subscription
	 */
	static async cancelSubscription(
		subscriptionId: string,
		immediately: boolean = false
	): Promise<{
		success: boolean;
		subscription?: UserSubscription;
		error?: string;
	}> {
		try {
			const response = await fetch('/api/stripe/cancel-subscription', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					subscriptionId,
					immediately,
				}),
			});

			const result = await response.json();

			if (!response.ok) {
				return {
					success: false,
					error: result.error || 'Failed to cancel subscription',
				};
			}

			// Update subscription in Firestore
			if (result.subscription) {
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
							...result.subscription,
							updatedAt: new Date(),
						}
					);
				}
			}

			return {
				success: true,
				subscription: result.subscription,
			};
		} catch (error) {
			console.error('Error canceling subscription:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Get customer's payment methods
	 */
	static async getPaymentMethods(customerId: string): Promise<{
		success: boolean;
		paymentMethods: PaymentMethod[];
		error?: string;
	}> {
		try {
			const response = await fetch(`/api/stripe/payment-methods/${customerId}`);
			const result = await response.json();

			if (!response.ok) {
				return {
					success: false,
					paymentMethods: [],
					error: result.error || 'Failed to get payment methods',
				};
			}

			return {
				success: true,
				paymentMethods: result.paymentMethods,
			};
		} catch (error) {
			console.error('Error getting payment methods:', error);
			return {
				success: false,
				paymentMethods: [],
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Attach payment method to customer
	 */
	static async attachPaymentMethod(
		paymentMethodId: string,
		customerId: string
	): Promise<{
		success: boolean;
		paymentMethod?: PaymentMethod;
		error?: string;
	}> {
		try {
			const response = await fetch('/api/stripe/attach-payment-method', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					paymentMethodId,
					customerId,
				}),
			});

			const result = await response.json();

			if (!response.ok) {
				return {
					success: false,
					error: result.error || 'Failed to attach payment method',
				};
			}

			return {
				success: true,
				paymentMethod: result.paymentMethod,
			};
		} catch (error) {
			console.error('Error attaching payment method:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Detach payment method from customer
	 */
	static async detachPaymentMethod(paymentMethodId: string): Promise<{
		success: boolean;
		error?: string;
	}> {
		try {
			const response = await fetch('/api/stripe/detach-payment-method', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					paymentMethodId,
				}),
			});

			const result = await response.json();

			if (!response.ok) {
				return {
					success: false,
					error: result.error || 'Failed to detach payment method',
				};
			}

			return {
				success: true,
			};
		} catch (error) {
			console.error('Error detaching payment method:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Get customer invoices
	 */
	static async getInvoices(
		customerId: string,
		limit: number = 10
	): Promise<{
		success: boolean;
		invoices: Invoice[];
		error?: string;
	}> {
		try {
			const response = await fetch(
				`/api/stripe/invoices/${customerId}?limit=${limit}`
			);
			const result = await response.json();

			if (!response.ok) {
				return {
					success: false,
					invoices: [],
					error: result.error || 'Failed to get invoices',
				};
			}

			return {
				success: true,
				invoices: result.invoices,
			};
		} catch (error) {
			console.error('Error getting invoices:', error);
			return {
				success: false,
				invoices: [],
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Create portal session for customer self-service
	 */
	static async createPortalSession(
		customerId: string,
		returnUrl: string
	): Promise<{
		success: boolean;
		url?: string;
		error?: string;
	}> {
		try {
			const response = await fetch('/api/stripe/create-portal-session', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					customerId,
					returnUrl,
				}),
			});

			const result = await response.json();

			if (!response.ok) {
				return {
					success: false,
					error: result.error || 'Failed to create portal session',
				};
			}

			return {
				success: true,
				url: result.url,
			};
		} catch (error) {
			console.error('Error creating portal session:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Process webhook event
	 */
	static async processWebhook(event: StripeWebhookEvent): Promise<void> {
		switch (event.type) {
			case 'customer.subscription.created':
			case 'customer.subscription.updated':
				await this.handleSubscriptionUpdate(event.data.object);
				break;

			case 'customer.subscription.deleted':
				await this.handleSubscriptionDeleted(event.data.object);
				break;

			case 'invoice.payment_succeeded':
				await this.handleInvoicePaymentSucceeded(event.data.object);
				break;

			case 'invoice.payment_failed':
				await this.handleInvoicePaymentFailed(event.data.object);
				break;

			case 'payment_method.attached':
				await this.handlePaymentMethodAttached(event.data.object);
				break;

			default:
				console.log(`Unhandled Stripe webhook event: ${event.type}`);
		}
	}

	/**
	 * Handle subscription update webhook
	 */
	private static async handleSubscriptionUpdate(
		subscription: unknown
	): Promise<void> {
		try {
			const firestoreResult = await FirestoreService.getCollection(
				'subscriptions',
				[
					{
						field: 'providerSubscriptionId',
						operator: '==',
						value: subscription.id,
					},
				]
			);

			const subscriptionData = {
				status: subscription.status,
				currentPeriodStart: new Date(subscription.current_period_start * 1000),
				currentPeriodEnd: new Date(subscription.current_period_end * 1000),
				cancelAtPeriodEnd: subscription.cancel_at_period_end,
				canceledAt: subscription.canceled_at
					? new Date(subscription.canceled_at * 1000)
					: null,
				updatedAt: new Date(),
				metadata: subscription.metadata,
			};

			if (firestoreResult.success && firestoreResult.data.length > 0) {
				await FirestoreService.updateDocument(
					'subscriptions',
					firestoreResult.data[0].id,
					subscriptionData
				);
			}
		} catch (error) {
			console.error('Error handling subscription update:', error);
		}
	}

	/**
	 * Handle subscription deleted webhook
	 */
	private static async handleSubscriptionDeleted(
		subscription: unknown
	): Promise<void> {
		try {
			const firestoreResult = await FirestoreService.getCollection(
				'subscriptions',
				[
					{
						field: 'providerSubscriptionId',
						operator: '==',
						value: subscription.id,
					},
				]
			);

			if (firestoreResult.success && firestoreResult.data.length > 0) {
				await FirestoreService.updateDocument(
					'subscriptions',
					firestoreResult.data[0].id,
					{
						status: 'canceled',
						canceledAt: new Date(),
						updatedAt: new Date(),
					}
				);
			}
		} catch (error) {
			console.error('Error handling subscription deletion:', error);
		}
	}

	/**
	 * Handle invoice payment succeeded webhook
	 */
	private static async handleInvoicePaymentSucceeded(
		invoice: unknown
	): Promise<void> {
		try {
			// Store invoice in Firestore
			await FirestoreService.createDocument('invoices', {
				providerInvoiceId: invoice.id,
				customerId: invoice.customer,
				subscriptionId: invoice.subscription,
				amount: invoice.amount_paid,
				currency: invoice.currency,
				status: 'paid',
				periodStart: new Date(invoice.period_start * 1000),
				periodEnd: new Date(invoice.period_end * 1000),
				paidAt: new Date(invoice.status_transitions.paid_at * 1000),
				hostedInvoiceUrl: invoice.hosted_invoice_url,
				invoicePdf: invoice.invoice_pdf,
				provider: 'stripe',
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		} catch (error) {
			console.error('Error handling invoice payment succeeded:', error);
		}
	}

	/**
	 * Handle invoice payment failed webhook
	 */
	private static async handleInvoicePaymentFailed(
		invoice: unknown
	): Promise<void> {
		try {
			// Update subscription status and send notification
			const firestoreResult = await FirestoreService.getCollection(
				'subscriptions',
				[
					{
						field: 'providerSubscriptionId',
						operator: '==',
						value: invoice.subscription,
					},
				]
			);

			if (firestoreResult.success && firestoreResult.data.length > 0) {
				await FirestoreService.updateDocument(
					'subscriptions',
					firestoreResult.data[0].id,
					{
						status: 'past_due',
						updatedAt: new Date(),
					}
				);
			}
		} catch (error) {
			console.error('Error handling invoice payment failed:', error);
		}
	}

	/**
	 * Handle payment method attached webhook
	 */
	private static async handlePaymentMethodAttached(
		paymentMethod: unknown
	): Promise<void> {
		try {
			// Store payment method in Firestore if it doesn't exist
			const existing = await FirestoreService.getCollection('payment_methods', [
				{
					field: 'providerPaymentMethodId',
					operator: '==',
					value: paymentMethod.id,
				},
			]);

			if (!existing.success || existing.data.length === 0) {
				await FirestoreService.createDocument('payment_methods', {
					providerPaymentMethodId: paymentMethod.id,
					customerId: paymentMethod.customer,
					type: paymentMethod.type,
					last4: paymentMethod.card?.last4,
					brand: paymentMethod.card?.brand,
					expiryMonth: paymentMethod.card?.exp_month,
					expiryYear: paymentMethod.card?.exp_year,
					provider: 'stripe',
					isDefault: false,
					createdAt: new Date(),
					updatedAt: new Date(),
				});
			}
		} catch (error) {
			console.error('Error handling payment method attached:', error);
		}
	}
}
