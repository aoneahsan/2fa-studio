/**
 * Add Account Modal component
 * @module components/accounts/AddAccountModal
 */

import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Device } from '@capacitor/device';
import { closeModal, addToast } from '@store/slices/uiSlice';
import { useAccounts } from '@hooks/useAccounts';
import { OTPService } from '@services/otp.service';
import QRScanner from '@components/accounts/QRScanner';
import {
	XMarkIcon,
	CameraIcon,
	PencilSquareIcon,
	CheckIcon,
} from '@heroicons/react/24/outline';
import { useAppSelector } from '@hooks/useAppSelector';
import {
	selectTags,
	fetchTags,
	initializeDefaultTags,
} from '@store/slices/tagsSlice';
import { selectFolders } from '@store/slices/foldersSlice';
import TagSelector from '@components/tags/TagSelector';
import FolderSelector from '@components/folders/FolderSelector';
import { TagService } from '@services/tag.service';
import { FolderIcon } from '@heroicons/react/24/outline';

interface FormData {
	issuer: string;
	label: string;
	secret: string;
	algorithm: 'SHA1' | 'SHA256' | 'SHA512';
	digits: number;
	period: number;
	type: 'totp' | 'hotp';
	counter?: number;
	tags: string[];
	folderId: string | null;
	isFavorite: boolean;
}

/**
 * Modal for adding new 2FA accounts
 */
const AddAccountModal: React.FC = () => {
	const dispatch = useDispatch();
	const { addAccount } = useAccounts();
	const tags = useAppSelector(selectTags);
	const user = useAppSelector((state) => (state as any)._auth.user);
	const [mode, setMode] = useState<'choice' | 'scan' | 'manual'>('choice');
	const [isLoading, setIsLoading] = useState(false);

	// Load tags on mount
	useEffect(() => {
		if (user && tags.length === 0) {
			dispatch(fetchTags(user.id) as any);
		}
	}, [user, tags.length, dispatch]);

	const [formData, setFormData] = useState<FormData>({
		issuer: '',
		label: '',
		secret: '',
		algorithm: 'SHA1',
		digits: 6,
		period: 30,
		type: 'totp',
		counter: 0,
		tags: [],
		folderId: null,
		isFavorite: false,
	});

	const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
		{}
	);

	// Handle QR scan success
	const handleScanSuccess = (data: any) => {
		setFormData({
			...formData,
			issuer: data.issuer || '',
			label: data.label || '',
			secret: data.secret || '',
			algorithm: (data as any).algorithm || 'SHA1',
			digits: data.digits || 6,
			period: data.period || 30,
			type: data.type || 'totp',
			counter: data.counter || 0,
		});
		setMode('manual');
	};

	// Validate form
	const validateForm = (): boolean => {
		const newErrors: Partial<Record<keyof FormData, string>> = {};

		if (!formData.issuer.trim()) {
			newErrors.issuer = 'Issuer is required';
		}

		if (!formData.label.trim()) {
			newErrors.label = 'Account name is required';
		}

		if (!formData.secret.trim()) {
			newErrors.secret = 'Secret key is required';
		} else {
			// Validate secret format
			try {
				// Remove spaces and convert to uppercase
				const cleanSecret = formData.secret.replace(/\s/g, '').toUpperCase();
				if (!/^[A-Z2-7]+$/.test(cleanSecret)) {
					newErrors.secret = 'Invalid secret key format';
				}
			} catch {
				newErrors.secret = 'Invalid secret key';
			}
		}

		if (formData.digits < 6 || formData.digits > 8) {
			newErrors.digits = 'Digits must be between 6 and 8';
		}

		if (formData.period < 15 || formData.period > 60) {
			newErrors.period = 'Period must be between 15 and 60 seconds';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	// Handle form submission
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		setIsLoading(true);

		try {
			// Clean secret
			const cleanSecret = formData.secret.replace(/\s/g, '').toUpperCase();

			// Generate icon URL
			const iconUrl = OTPService.getServiceIcon(formData.issuer);

			await addAccount({
				...formData,
				secret: cleanSecret,
				iconUrl,
				tags: formData.tags,
			});

			dispatch(
				addToast({
					type: 'success',
					message: 'Account added successfully',
				}) as any
			);

			dispatch(closeModal() as any);
		} catch (error) {
			console.error('Failed to add account:', error);
			dispatch(
				addToast({
					type: 'error',
					message: 'Failed to add account',
				}) as any
			);
		} finally {
			setIsLoading(false);
		}
	};

	// Check if we're on mobile for camera
	const checkMobileDevice = async () => {
		const info = await Device.getInfo();
		return info.platform !== 'web';
	};

	return (
		<div className='flex fixed inset-0 z-50 justify-center items-center p-4 bg-black/50'>
			<div className='bg-background rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden'>
				{/* Header */}
				<div className='flex justify-between items-center p-4 border-b border-border'>
					<h2 className='text-lg font-semibold text-foreground'>Add Account</h2>
					<button
						onClick={() => dispatch(closeModal() as any)}
						className='p-1 rounded transition-colors hover:bg-muted'
					>
						<XMarkIcon className='w-5 h-5' />
					</button>
				</div>

				{/* Content */}
				<div className='overflow-y-auto max-h-[calc(90vh-8rem)]'>
					{mode === 'choice' && (
						<div className='p-6 space-y-4'>
							<p className='mb-6 text-sm text-center text-muted-foreground'>
								How would you like to add your account?
							</p>

							<button
								onClick={async () => {
									const isMobile = await checkMobileDevice();
									if (isMobile || window.location.protocol === 'https:') {
										setMode('scan');
									} else {
										dispatch(
											addToast({
												type: 'error',
												message: 'Camera access requires HTTPS or mobile app',
											}) as any
										);
									}
								}}
								className='flex gap-4 items-center p-4 w-full rounded-lg border transition-colors border-border hover:bg-muted'
							>
								<CameraIcon className='w-8 h-8 text-primary' />
								<div className='text-left'>
									<h3 className='font-medium'>Scan QR Code</h3>
									<p className='text-sm text-muted-foreground'>
										Use your camera to scan the QR code
									</p>
								</div>
							</button>

							<button
								onClick={() => setMode('manual')}
								className='flex gap-4 items-center p-4 w-full rounded-lg border transition-colors border-border hover:bg-muted'
							>
								<PencilSquareIcon className='w-8 h-8 text-primary' />
								<div className='text-left'>
									<h3 className='font-medium'>Enter Manually</h3>
									<p className='text-sm text-muted-foreground'>
										Type in the account details
									</p>
								</div>
							</button>
						</div>
					)}

					{mode === 'scan' && (
						<QRScanner
							onScanSuccess={handleScanSuccess}
							onClose={() => setMode('choice')}
						/>
					)}

					{mode === 'manual' && (
						<form onSubmit={handleSubmit} className='p-6 space-y-4'>
							{/* Issuer */}
							<div>
								<label className='block mb-1 text-sm font-medium text-foreground'>
									Service Provider
								</label>
								<input
									type='text'
									value={formData.issuer}
									onChange={(e) =>
										setFormData({ ...formData, issuer: e.target.value })
									}
									className='input'
									placeholder='e.g., Google, GitHub, etc.'
								/>
								{errors.issuer && (
									<p className='mt-1 text-xs text-red-500'>{errors.issuer}</p>
								)}
							</div>

							{/* Label */}
							<div>
								<label className='block mb-1 text-sm font-medium text-foreground'>
									Account Name
								</label>
								<input
									type='text'
									value={formData.label}
									onChange={(e) =>
										setFormData({ ...formData, label: e.target.value })
									}
									className='input'
									placeholder='e.g., user@example.com'
								/>
								{errors.label && (
									<p className='mt-1 text-xs text-red-500'>{errors.label}</p>
								)}
							</div>

							{/* Secret */}
							<div>
								<label className='block mb-1 text-sm font-medium text-foreground'>
									Secret Key
								</label>
								<input
									type='text'
									value={formData.secret}
									onChange={(e) =>
										setFormData({ ...formData, secret: e.target.value })
									}
									className='font-mono input'
									placeholder='Enter secret key'
									autoComplete='off'
								/>
								{errors.secret && (
									<p className='mt-1 text-xs text-red-500'>{errors.secret}</p>
								)}
							</div>

							{/* Type */}
							<div>
								<label className='block mb-1 text-sm font-medium text-foreground'>
									Type
								</label>
								<select
									value={formData.type}
									onChange={(e) =>
										setFormData({
											...formData,
											type: e.target.value as 'totp' | 'hotp',
										})
									}
									className='input'
								>
									<option value='totp'>Time-based (TOTP)</option>
									<option value='hotp'>Counter-based (HOTP)</option>
								</select>
							</div>

							{/* Advanced Options */}
							<details className='pt-4 border-t border-border'>
								<summary className='text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground'>
									Advanced Options
								</summary>

								<div className='mt-4 space-y-4'>
									{/* Algorithm */}
									<div>
										<label className='block mb-1 text-sm font-medium text-foreground'>
											Algorithm
										</label>
										<select
											value={formData.algorithm}
											onChange={(e) =>
												setFormData({
													...formData,
													algorithm: e.target.value as
														| 'SHA1'
														| 'SHA256'
														| 'SHA512',
												})
											}
											className='input'
										>
											<option value='SHA1'>SHA1</option>
											<option value='SHA256'>SHA256</option>
											<option value='SHA512'>SHA512</option>
										</select>
									</div>

									{/* Digits */}
									<div>
										<label className='block mb-1 text-sm font-medium text-foreground'>
											Digits
										</label>
										<input
											type='number'
											value={formData.digits}
											onChange={(e) =>
												setFormData({
													...formData,
													digits: parseInt(e.target.value),
												})
											}
											className='input'
											min='6'
											max='8'
										/>
									</div>

									{/* Period (TOTP) or Counter (HOTP) */}
									{formData.type === 'totp' ? (
										<div>
											<label className='block mb-1 text-sm font-medium text-foreground'>
												Period (seconds)
											</label>
											<input
												type='number'
												value={formData.period}
												onChange={(e) =>
													setFormData({
														...formData,
														period: parseInt(e.target.value),
													})
												}
												className='input'
												min='15'
												max='60'
											/>
										</div>
									) : (
										<div>
											<label className='block mb-1 text-sm font-medium text-foreground'>
												Initial Counter
											</label>
											<input
												type='number'
												value={formData.counter}
												onChange={(e) =>
													setFormData({
														...formData,
														counter: parseInt(e.target.value),
													})
												}
												className='input'
												min='0'
											/>
										</div>
									)}
								</div>
							</details>

							{/* Folder */}
							<div>
								<label className='block mb-1 text-sm font-medium text-foreground'>
									Folder
								</label>
								<FolderSelector
									value={formData.folderId}
									onChange={(folderId) =>
										setFormData({ ...formData, folderId })
									}
									placeholder='Select a folder (optional)'
								/>
							</div>

							{/* Tags */}
							<div>
								<label className='block mb-1 text-sm font-medium text-foreground'>
									Tags
								</label>
								<TagSelector
									selectedTags={formData.tags}
									onChange={(tagIds) =>
										setFormData({ ...formData, tags: tagIds })
									}
									placeholder='Select or create tags...'
									allowCreate={true}
									multiple={true}
								/>
								{/* Tag suggestions based on issuer */}
								{formData.issuer &&
									(() => {
										const suggestions = TagService.getTagSuggestions(
											formData.issuer
										);
										const availableSuggestions = suggestions.filter(
											(name) =>
												!formData.tags.some((tagId) => {
													const tag = tags.find((t: any) => t.id === tagId);
													return tag?.name === name;
												})
										);
										if (availableSuggestions.length === 0) return null;

										return (
											<div className='mt-2 text-xs text-muted-foreground'>
												Suggestions:
												{availableSuggestions.map((name) => {
													const matchingTag = tags.find(
														(t: any) => t.name === name
													);
													if (!matchingTag) return null;

													return (
														<button
															key={matchingTag.id}
															type='button'
															onClick={() =>
																setFormData({
																	...formData,
																	tags: [...formData.tags, matchingTag.id],
																})
															}
															className='ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
														>
															{name}
														</button>
													);
												})}
											</div>
										);
									})()}
							</div>
						</form>
					)}
				</div>

				{/* Footer */}
				{mode === 'manual' && (
					<div className='flex gap-3 p-4 border-t border-border'>
						<button
							type='button'
							onClick={() => dispatch(closeModal() as any)}
							className='flex-1 btn btn-outline'
						>
							Cancel
						</button>
						<button
							onClick={handleSubmit}
							disabled={isLoading}
							className='flex-1 btn btn-primary'
						>
							{isLoading ? 'Adding...' : 'Add Account'}
						</button>
					</div>
				)}
			</div>
		</div>
	);
};

export default AddAccountModal;
