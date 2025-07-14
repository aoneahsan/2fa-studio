/**
 * Subscription settings component
 * @module components/settings/SubscriptionSettings
 */

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@src/store';
import { addToast } from '@store/slices/uiSlice';
import { updateUserSubscription } from '@store/slices/authSlice';
import {
	CheckIcon,
	XMarkIcon,
	SparklesIcon,
	RocketLaunchIcon,
	CreditCardIcon,
	CalendarDaysIcon,
	ArrowRightIcon,
} from '@heroicons/react/24/outline';

interface PricingPlan {
	id: 'free' | 'premium' | 'enterprise';
	name: string;
	price: number;
	interval: 'month' | 'year';
	features: string[];
	limitations: string[];
	recommended?: boolean;
}

/**
 * Subscription settings tab component
 */
const SubscriptionSettings: React.FC = () => {
	const dispatch = useDispatch();
	const { user } = useSelector((state: RootState) => state._auth);
	const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>(
		'yearly'
	);
	const [isProcessing, setIsProcessing] = useState(false);

	const plans: PricingPlan[] = [
		{
			id: 'free',
			name: 'Free',
			price: 0,
			interval: 'month',
			features: [
				'Up to 10 2FA accounts',
				'Basic encryption',
				'Manual backups',
				'Mobile app access',
				'QR code scanning',
			],
			limitations: [
				'Limited to 10 accounts',
				'No Google Drive sync',
				'No browser extension',
				'No priority support',
				'Contains ads',
			],
		},
		{
			id: 'premium',
			name: 'Premium',
			price: selectedPlan === 'monthly' ? 4.99 : 49.99,
			interval: selectedPlan === 'monthly' ? 'month' : 'year',
			features: [
				'Unlimited 2FA accounts',
				'Advanced encryption',
				'Automatic Google Drive backup',
				'Chrome browser extension',
				'Ad-free experience',
				'Priority support',
				'Backup encryption',
				'Import/Export tools',
				'Custom tags & categories',
				'Biometric authentication',
			],
			limitations: [],
			recommended: true,
		},
		{
			id: 'enterprise',
			name: 'Enterprise',
			price: 19.99,
			interval: 'month',
			features: [
				'Everything in Premium',
				'Multi-device sync',
				'Team management',
				'Advanced admin panel',
				'API access',
				'Custom branding',
				'Dedicated support',
				'SLA guarantee',
				'Audit logs',
				'SSO integration',
			],
			limitations: [],
		},
	];

	const currentPlan =
		plans.find((p: any) => p.id === user?.subscription.type) || plans[0];

	const handleUpgrade = async (planId: string) => {
		setIsProcessing(true);

		try {
			// Simulate payment processing
			await new Promise((resolve) => setTimeout(resolve, 2000));

			// Update subscription in store
			dispatch(
				updateUserSubscription({
					type: planId as 'free' | 'premium' | 'enterprise',
					status: 'active',
					expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
					accountLimit: planId === 'free' ? 10 : undefined,
				})
			);

			dispatch(
				addToast({
					type: 'success',
					message: `Successfully upgraded to ${planId} plan!`,
				}) as any
			);
		} catch (error) {
			dispatch(
				addToast({
					type: 'error',
					message: 'Payment failed. Please try again.',
				}) as any
			);
		} finally {
			setIsProcessing(false);
		}
	};

	const handleCancelSubscription = () => {
		const confirmed = window.confirm(
			'Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.'
		);

		if (confirmed) {
			dispatch(
				addToast({
					type: 'info',
					message:
						'Subscription cancelled. You have access until the end of your billing period.',
				}) as any
			);
		}
	};

	const formatPrice = (price: number, interval: string) => {
		if (price === 0) return 'Free';
		return `$${price}/${interval === 'year' ? 'year' : 'mo'}`;
	};

	const calculateSavings = () => {
		const monthlyPrice = 4.99 * 12;
		const yearlyPrice = 49.99;
		const savings = monthlyPrice - yearlyPrice;
		const percentage = Math.round((savings / monthlyPrice) * 100);
		return { savings: savings.toFixed(2), percentage };
	};

	const savings = calculateSavings();

	return (
		<div className='space-y-6'>
			<div>
				<h2 className='text-lg font-semibold text-foreground mb-2'>
					Subscription & Billing
				</h2>
				<p className='text-sm text-muted-foreground'>
					Manage your subscription and unlock premium features
				</p>
			</div>

			{/* Current Subscription Status */}
			{user?.subscription.type !== 'free' && (
				<div className='bg-primary/10 border border-primary/20 rounded-lg p-6'>
					<div className='flex items-start justify-between'>
						<div>
							<h3 className='font-semibold text-foreground flex items-center gap-2'>
								<SparklesIcon className='w-5 h-5 text-primary' />
								{currentPlan.name} Plan
							</h3>
							<p className='text-sm text-muted-foreground mt-1'>
								Your subscription is active
							</p>

							<div className='mt-4 space-y-2'>
								<div className='flex items-center gap-2 text-sm'>
									<CalendarDaysIcon className='w-4 h-4 text-muted-foreground' />
									<span>
										Next billing date:{' '}
										{user?.subscription.expiresAt
											? new Date(
													(user as any).subscription.expiresAt
												).toLocaleDateString()
											: 'N/A'}
									</span>
								</div>
								<div className='flex items-center gap-2 text-sm'>
									<CreditCardIcon className='w-4 h-4 text-muted-foreground' />
									<span>Payment method: •••• 4242</span>
								</div>
							</div>
						</div>

						<button
							onClick={handleCancelSubscription}
							className='text-sm text-red-600 hover:text-red-700'
						>
							Cancel subscription
						</button>
					</div>
				</div>
			)}

			{/* Billing Toggle */}
			<div className='flex justify-center'>
				<div className='bg-muted p-1 rounded-lg inline-flex'>
					<button
						onClick={() => setSelectedPlan('monthly')}
						className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
							selectedPlan === 'monthly'
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground'
						}`}
					>
						Monthly billing
					</button>
					<button
						onClick={() => setSelectedPlan('yearly')}
						className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
							selectedPlan === 'yearly'
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground'
						}`}
					>
						Yearly billing
					</button>
				</div>
			</div>

			{selectedPlan === 'yearly' && (
				<div className='text-center'>
					<p className='text-sm text-green-600 dark:text-green-400 font-medium'>
						Save ${savings.savings} ({savings.percentage}%) with yearly billing
					</p>
				</div>
			)}

			{/* Pricing Plans */}
			<div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
				{plans.map((plan) => {
					const isCurrentPlan = plan.id === user?.subscription.type;
					const canUpgrade =
						plans.findIndex((p) => p.id === plan.id) >
						plans.findIndex((p) => p.id === user?.subscription.type);

					return (
						<div
							key={plan.id}
							className={`
                relative bg-card border rounded-lg p-6
                ${plan.recommended ? 'border-primary shadow-lg' : 'border-border'}
                ${isCurrentPlan ? 'ring-2 ring-primary' : ''}
              `}
						>
							{plan.recommended && (
								<div className='absolute -top-3 left-1/2 -translate-x-1/2'>
									<span className='bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full'>
										RECOMMENDED
									</span>
								</div>
							)}

							{isCurrentPlan && (
								<div className='absolute -top-3 right-4'>
									<span className='bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full'>
										CURRENT PLAN
									</span>
								</div>
							)}

							<div className='text-center mb-6'>
								<h3 className='text-xl font-bold text-foreground mb-2'>
									{plan.name}
								</h3>
								<div className='text-3xl font-bold text-foreground'>
									{formatPrice(plan.price, plan.interval)}
								</div>
								{plan.price > 0 && plan.interval === 'year' && (
									<p className='text-sm text-muted-foreground'>
										${(plan.price / 12).toFixed(2)}/month
									</p>
								)}
							</div>

							{/* Features */}
							<div className='space-y-3 mb-6'>
								{plan.features.map((feature, index) => (
									<div key={index} className='flex items-start gap-2'>
										<CheckIcon className='w-5 h-5 text-green-500 flex-shrink-0 mt-0.5' />
										<span className='text-sm text-foreground'>{feature}</span>
									</div>
								))}

								{plan.limitations.map((limitation, index) => (
									<div key={index} className='flex items-start gap-2'>
										<XMarkIcon className='w-5 h-5 text-red-500 flex-shrink-0 mt-0.5' />
										<span className='text-sm text-muted-foreground'>
											{limitation}
										</span>
									</div>
								))}
							</div>

							{/* Action Button */}
							<button
								onClick={() => canUpgrade && handleUpgrade(plan.id)}
								disabled={
									isCurrentPlan ||
									isProcessing ||
									(plan.id !== 'free' && !canUpgrade)
								}
								className={`
                  w-full py-3 px-4 rounded-lg font-medium transition-colors
                  ${
										isCurrentPlan
											? 'bg-muted text-muted-foreground cursor-not-allowed'
											: plan.recommended
												? 'btn btn-primary'
												: 'btn btn-outline'
									}
                `}
							>
								{isCurrentPlan ? (
									'Current Plan'
								) : canUpgrade ? (
									<>
										Upgrade to {plan.name}
										<ArrowRightIcon className='w-4 h-4 ml-2 inline' />
									</>
								) : (
									'Contact Sales'
								)}
							</button>
						</div>
					);
				})}
			</div>

			{/* Payment Methods */}
			<div className='border-t border-border pt-6'>
				<h3 className='text-sm font-medium text-foreground mb-4'>
					Payment Methods
				</h3>

				<div className='space-y-3'>
					<div className='flex items-center justify-between p-4 bg-muted/30 rounded-lg'>
						<div className='flex items-center gap-3'>
							<CreditCardIcon className='w-8 h-8 text-muted-foreground' />
							<div>
								<p className='font-medium text-foreground'>
									•••• •••• •••• 4242
								</p>
								<p className='text-sm text-muted-foreground'>Expires 12/24</p>
							</div>
						</div>
						<button className='text-sm text-primary hover:underline'>
							Update
						</button>
					</div>

					<button className='w-full p-4 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-foreground transition-colors'>
						+ Add payment method
					</button>
				</div>
			</div>

			{/* Billing History */}
			<div className='border-t border-border pt-6'>
				<h3 className='text-sm font-medium text-foreground mb-4'>
					Billing History
				</h3>

				<div className='space-y-2'>
					{[1, 2, 3].map((i) => (
						<div key={i} className='flex items-center justify-between py-2'>
							<div>
								<p className='text-sm font-medium text-foreground'>
									{currentPlan.name} Plan -{' '}
									{new Date(
										Date.now() - i * 30 * 24 * 60 * 60 * 1000
									).toLocaleDateString()}
								</p>
								<p className='text-xs text-muted-foreground'>
									Invoice #{`INV-2024-${String(i).padStart(4, '0')}`}
								</p>
							</div>
							<div className='text-right'>
								<p className='text-sm font-medium text-foreground'>
									${currentPlan.price}
								</p>
								<button className='text-xs text-primary hover:underline'>
									Download
								</button>
							</div>
						</div>
					))}
				</div>

				<button className='text-sm text-primary hover:underline mt-3'>
					View all invoices
				</button>
			</div>
		</div>
	);
};

export default SubscriptionSettings;
