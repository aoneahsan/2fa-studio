/**
 * Edit account modal component
 * @module components/accounts/EditAccountModal
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { updateAccount } from '../../store/slices/accountsSlice';
import { closeModal, addToast } from '../../store/slices/uiSlice';
import { OTPAccount } from '../../services/otp.service';
import { 
  XMarkIcon,
  BuildingOfficeIcon,
  UserIcon,
  TagIcon,
  ClockIcon,
  HashtagIcon,
  KeyIcon
} from '@heroicons/react/24/outline';

/**
 * Modal for editing existing 2FA accounts
 */
const EditAccountModal: React.FC = () => {
  const dispatch = useDispatch();
  const modal = useSelector((state: RootState) => state.ui.modal);
  const accounts = useSelector((state: RootState) => state.accounts.accounts);
  
  const accountId = modal.data?.accountId;
  const account = accounts.find(a => a.id === accountId);
  
  const [formData, setFormData] = useState({
    issuer: '',
    label: '',
    tags: [] as string[],
    period: 30,
    digits: 6,
    algorithm: 'SHA1' as 'SHA1' | 'SHA256' | 'SHA512',
    counter: 0
  });
  
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (account) {
      setFormData({
        issuer: account.issuer,
        label: account.label,
        tags: account.tags || [],
        period: account.period || 30,
        digits: account.digits || 6,
        algorithm: account.algorithm || 'SHA1',
        counter: account.counter || 0
      });
    }
  }, [account]);

  const handleClose = () => {
    dispatch(closeModal());
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'period' || name === 'digits' || name === 'counter' 
        ? parseInt(value) 
        : value
    }));
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!formData.tags.includes(newTag)) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, newTag]
        }));
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!account) return;
    
    setIsSubmitting(true);

    try {
      const updatedAccount: OTPAccount = {
        ...account,
        issuer: formData.issuer,
        label: formData.label,
        tags: formData.tags,
        period: formData.period,
        digits: formData.digits,
        algorithm: formData.algorithm,
        counter: formData.counter,
        updatedAt: new Date()
      };

      dispatch(updateAccount(updatedAccount));
      
      dispatch(addToast({
        type: 'success',
        message: 'Account updated successfully'
      }));
      
      handleClose();
    } catch (error) {
      dispatch(addToast({
        type: 'error',
        message: 'Failed to update account'
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!account) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background border border-border rounded-lg w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Edit Account</h2>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Issuer */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <BuildingOfficeIcon className="w-4 h-4 inline mr-1" />
              Issuer (e.g., Google, GitHub)
            </label>
            <input
              type="text"
              name="issuer"
              value={formData.issuer}
              onChange={handleChange}
              className="input"
              placeholder="Enter service name"
              required
            />
          </div>

          {/* Account Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <UserIcon className="w-4 h-4 inline mr-1" />
              Account Name
            </label>
            <input
              type="text"
              name="label"
              value={formData.label}
              onChange={handleChange}
              className="input"
              placeholder="e.g., user@example.com"
              required
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <TagIcon className="w-4 h-4 inline mr-1" />
              Tags
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleAddTag}
                className="input"
                placeholder="Press Enter to add tags"
              />
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
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
          </div>

          {/* Advanced Settings */}
          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-medium text-foreground mb-3">Advanced Settings</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Period (TOTP only) */}
              {account.type === 'totp' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <ClockIcon className="w-4 h-4 inline mr-1" />
                    Period (seconds)
                  </label>
                  <select
                    name="period"
                    value={formData.period}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value={30}>30</option>
                    <option value={60}>60</option>
                    <option value={90}>90</option>
                  </select>
                </div>
              )}

              {/* Counter (HOTP only) */}
              {account.type === 'hotp' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <HashtagIcon className="w-4 h-4 inline mr-1" />
                    Counter
                  </label>
                  <input
                    type="number"
                    name="counter"
                    value={formData.counter}
                    onChange={handleChange}
                    className="input"
                    min="0"
                  />
                </div>
              )}

              {/* Digits */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <HashtagIcon className="w-4 h-4 inline mr-1" />
                  Digits
                </label>
                <select
                  name="digits"
                  value={formData.digits}
                  onChange={handleChange}
                  className="input"
                >
                  <option value={6}>6</option>
                  <option value={7}>7</option>
                  <option value={8}>8</option>
                </select>
              </div>

              {/* Algorithm */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <KeyIcon className="w-4 h-4 inline mr-1" />
                  Algorithm
                </label>
                <select
                  name="algorithm"
                  value={formData.algorithm}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="SHA1">SHA1</option>
                  <option value="SHA256">SHA256</option>
                  <option value="SHA512">SHA512</option>
                </select>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Warning:</strong> Changing advanced settings may cause the codes to stop working. 
              Only modify these if you know what you're doing.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-outline flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary flex-1"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAccountModal;