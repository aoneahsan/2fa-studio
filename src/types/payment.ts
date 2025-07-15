/**
 * Payment notification types for Apple Pay and Google Play
 * @module types/payment
 */

export interface ApplePayNotification {
	notificationType: string;
	latestReceiptInfo: any;
	password: string;
	latestReceipt: string;
}

export interface GooglePlayNotification {
	subscriptionNotification?: {
		subscriptionId: string;
		purchaseToken: string;
		notificationType: number;
	};
	testNotification?: {
		version: string;
	};
}

export interface GooglePlaySubscriptionNotification {
	subscriptionId: string;
	purchaseToken: string;
	notificationType: number;
}

export interface StripeNotification {
	id: string;
	object: string;
	type: string;
	data: {
		object: any;
	};
	api_version: string;
	created: number;
	livemode: boolean;
	pending_webhooks: number;
	request: {
		id: string;
		idempotency_key?: string;
	};
}

// Receipt validation interfaces
export interface ReceiptInfo {
	transaction_id: string;
	cancellation_date_ms?: string;
	[key: string]: any;
}

export interface Purchase {
	cancellationDate?: number;
	subscriptionExpirationDate?: number;
	subscriptionInGracePeriod?: boolean;
	[key: string]: any;
}
