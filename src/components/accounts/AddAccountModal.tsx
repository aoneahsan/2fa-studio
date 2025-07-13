/**
 * Add Account Modal component
 * @module components/accounts/AddAccountModal
 */

import React, { useState } from 'react';
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
  CheckIcon
} from '@heroicons/react/24/outline';

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
}

/**
 * Modal for adding new 2FA accounts
 */
const AddAccountModal: React.FC = () => {
  const dispatch = useDispatch();
  const { addAccount } = useAccounts();
  const [mode, setMode] = useState<'choice' | 'scan' | 'manual'>('choice');
  const [isLoading, setIsLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  
  const [formData, setFormData] = useState<FormData>({
    issuer: '',
    label: '',
    secret: '',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    type: 'totp',
    counter: 0,
    tags: []
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // Handle QR scan success
  const handleScanSuccess = (data: any) => {
    setFormData({
      ...formData,
      issuer: data.issuer || '',
      label: data.label || '',
      secret: data.secret || '',
      algorithm: data.algorithm || 'SHA1',
      digits: data.digits || 6,
      period: data.period || 30,
      type: data.type || 'totp',
      counter: data.counter || 0
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
        tags: formData.tags.filter(tag => tag.length > 0)
      });

      dispatch(addToast({
        type: 'success',
        message: 'Account added successfully'
      }));

      dispatch(closeModal());
    } catch (error) {
      console.error('Failed to add account:', error);
      dispatch(addToast({
        type: 'error',
        message: 'Failed to add account'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Add tag
  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  // Remove tag
  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag)
    });
  };

  // Check if we're on mobile for camera
  const checkMobileDevice = async () => {
    const info = await Device.getInfo();
    return info.platform !== 'web';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Add Account</h2>
          <button
            onClick={() => dispatch(closeModal())}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-8rem)]">
          {mode === 'choice' && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground text-center mb-6">
                How would you like to add your account?
              </p>
              
              <button
                onClick={async () => {
                  const isMobile = await checkMobileDevice();
                  if (isMobile || window.location.protocol === 'https:') {
                    setMode('scan');
                  } else {
                    dispatch(addToast({
                      type: 'error',
                      message: 'Camera access requires HTTPS or mobile app'
                    }));
                  }
                }}
                className="w-full flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                <CameraIcon className="w-8 h-8 text-primary" />
                <div className="text-left">
                  <h3 className="font-medium">Scan QR Code</h3>
                  <p className="text-sm text-muted-foreground">
                    Use your camera to scan the QR code
                  </p>
                </div>
              </button>

              <button
                onClick={() => setMode('manual')}
                className="w-full flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                <PencilSquareIcon className="w-8 h-8 text-primary" />
                <div className="text-left">
                  <h3 className="font-medium">Enter Manually</h3>
                  <p className="text-sm text-muted-foreground">
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
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Issuer */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Service Provider
                </label>
                <input
                  type="text"
                  value={formData.issuer}
                  onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                  className="input"
                  placeholder="e.g., Google, GitHub, etc."
                />
                {errors.issuer && (
                  <p className="text-xs text-red-500 mt-1">{errors.issuer}</p>
                )}
              </div>

              {/* Label */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="input"
                  placeholder="e.g., user@example.com"
                />
                {errors.label && (
                  <p className="text-xs text-red-500 mt-1">{errors.label}</p>
                )}
              </div>

              {/* Secret */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Secret Key
                </label>
                <input
                  type="text"
                  value={formData.secret}
                  onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                  className="input font-mono"
                  placeholder="Enter secret key"
                  autoComplete="off"
                />
                {errors.secret && (
                  <p className="text-xs text-red-500 mt-1">{errors.secret}</p>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'totp' | 'hotp' })}
                  className="input"
                >
                  <option value="totp">Time-based (TOTP)</option>
                  <option value="hotp">Counter-based (HOTP)</option>
                </select>
              </div>

              {/* Advanced Options */}
              <details className="border-t border-border pt-4">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                  Advanced Options
                </summary>
                
                <div className="mt-4 space-y-4">
                  {/* Algorithm */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Algorithm
                    </label>
                    <select
                      value={formData.algorithm}
                      onChange={(e) => setFormData({ ...formData, algorithm: e.target.value as any })}
                      className="input"
                    >
                      <option value="SHA1">SHA1</option>
                      <option value="SHA256">SHA256</option>
                      <option value="SHA512">SHA512</option>
                    </select>
                  </div>

                  {/* Digits */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Digits
                    </label>
                    <input
                      type="number"
                      value={formData.digits}
                      onChange={(e) => setFormData({ ...formData, digits: parseInt(e.target.value) })}
                      className="input"
                      min="6"
                      max="8"
                    />
                  </div>

                  {/* Period (TOTP) or Counter (HOTP) */}
                  {formData.type === 'totp' ? (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Period (seconds)
                      </label>
                      <input
                        type="number"
                        value={formData.period}
                        onChange={(e) => setFormData({ ...formData, period: parseInt(e.target.value) })}
                        className="input"
                        min="15"
                        max="60"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Initial Counter
                      </label>
                      <input
                        type="number"
                        value={formData.counter}
                        onChange={(e) => setFormData({ ...formData, counter: parseInt(e.target.value) })}
                        className="input"
                        min="0"
                      />
                    </div>
                  )}
                </div>
              </details>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    className="input flex-1"
                    placeholder="Add tag"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="btn btn-outline btn-sm"
                  >
                    Add
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-primary/10 text-primary"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-primary/70"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {mode === 'manual' && (
          <div className="flex gap-3 p-4 border-t border-border">
            <button
              type="button"
              onClick={() => dispatch(closeModal())}
              className="btn btn-outline flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="btn btn-primary flex-1"
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