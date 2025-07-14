/**
 * Edit account modal component
 * @module components/accounts/EditAccountModal
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@src/store';
import { updateAccount } from '@store/slices/accountsSlice';
import { closeModal, addToast } from '@store/slices/uiSlice';
import { OTPAccount } from '@services/otp.service';
import { selectTags, fetchTags } from '@store/slices/tagsSlice';
import { selectFolders } from '@store/slices/foldersSlice';
import TagSelector from '@components/tags/TagSelector';
import FolderSelector from '@components/folders/FolderSelector';
import BiometricSettings from '@components/accounts/BiometricSettings';
import AccountUsageChart from '@components/analytics/AccountUsageChart';
import { TagService } from '@services/tag.service';
import { AnalyticsService } from '@services/analytics.service';
import { useAccounts } from '@hooks/useAccounts';
import { UsageStats } from '@app-types/analytics';
import { 
  XMarkIcon,
  BuildingOfficeIcon,
  UserIcon,
  TagIcon,
  ClockIcon,
  HashtagIcon,
  KeyIcon,
  FolderIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import FingerPrintIcon from '@components/icons/FingerPrintIcon';

/**
 * Modal for editing existing 2FA accounts
 */
const EditAccountModal: React.FC = () => {
  const dispatch = useDispatch();
  const modal = useSelector((state: RootState) => state.ui.modal);
  const { user } = useSelector((state: RootState) => state.auth);
  const accounts = useSelector((state: RootState) => state.accounts.accounts);
  const tags = useSelector(selectTags);
  const folders = useSelector(selectFolders);
  const { updateAccount: updateAccountHook } = useAccounts();
  
  const accountId = modal.data?.accountId;
  const account = accounts.find(a => a.id === accountId);
  
  const [formData, setFormData] = useState({
    issuer: '',
    label: '',
    tags: [] as string[],
    folderId: null as string | null,
    isFavorite: false,
    period: 30,
    digits: 6,
    algorithm: 'SHA1' as 'SHA1' | 'SHA256' | 'SHA512',
    counter: 0
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'analytics'>('details');

  useEffect(() => {
    if (account) {
      setFormData({
        issuer: account.issuer,
        label: account.label,
        tags: account.tags || [],
        folderId: account.folderId || null,
        isFavorite: account.isFavorite || false,
        period: account.period || 30,
        digits: account.digits || 6,
        algorithm: account.algorithm || 'SHA1',
        counter: account.counter || 0
      });
      
      // Load usage stats
      if (user) {
        AnalyticsService.getAccountUsageStats(user.id, account.id)
          .then(setUsageStats)
          .catch(console.error);
      }
    }
  }, [account, user]);

  // Load tags on mount
  useEffect(() => {
    if (user && tags.length === 0) {
      dispatch(fetchTags(user.id));
    }
  }, [user, tags.length, dispatch]);

  const handleClose = () => {
    dispatch(closeModal());
  };

  const handleChange = (_e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'period' || name === 'digits' || name === 'counter' 
        ? parseInt(value) 
        : value
    }));
  };


  const handleSubmit = async (_e: React.FormEvent) => {
    e.preventDefault();
    
    if (!account) return;
    
    setIsSubmitting(true);

    try {
      const updatedAccount: OTPAccount = {
        ...account,
        issuer: formData.issuer.trim(),
        label: formData.label.trim(),
        tags: formData.tags,
        folderId: formData.folderId,
        isFavorite: formData.isFavorite,
        period: formData.period,
        digits: formData.digits,
        algorithm: formData.algorithm,
        counter: account.type === 'hotp' ? formData.counter : undefined,
        updatedAt: new Date()
      };
      
      await updateAccountHook(updatedAccount);
      
      handleClose();
    } catch (error) {
      console.error('Error updating account:', error);
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

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'details'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ChartBarIcon className="w-4 h-4 inline mr-1" />
            Analytics
          </button>
        </div>

        {/* Content */}
        {activeTab === 'details' ? (
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

          {/* Folder */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <FolderIcon className="w-4 h-4 inline mr-1" />
              Folder
            </label>
            <FolderSelector
              value={formData.folderId}
              onChange={(folderId) => setFormData({ ...formData, folderId })}
              placeholder="Select a folder (optional)"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <TagIcon className="w-4 h-4 inline mr-1" />
              Tags
            </label>
            <TagSelector
              selectedTags={formData.tags}
              onChange={(tagIds) => setFormData({ ...formData, tags: tagIds })}
              placeholder="Select or create tags..."
              allowCreate={true}
              multiple={true}
            />
            {/* Tag suggestions based on issuer */}
            {formData.issuer && (() => {
              const suggestions = TagService.getTagSuggestions(formData.issuer);
              const availableSuggestions = suggestions.filter(
                name => !formData.tags.some(tagId => {
                  const tag = tags.find(t => t.id === tagId);
                  return tag?.name === name;
                })
              );
              if (availableSuggestions.length === 0) return null;
              
              return (
                <div className="mt-2 text-xs text-muted-foreground">
                  Suggestions: 
                  {availableSuggestions.map((name) => {
                    const matchingTag = tags.find(t => t.name === name);
                    if (!matchingTag) return null;
                    
                    return (
                      <button
                        key={matchingTag.id}
                        type="button"
                        onClick={() => setFormData({ 
                          ...formData, 
                          tags: [...formData.tags, matchingTag.id] 
                        })}
                        className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
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

          {/* Biometric Settings */}
          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <FingerPrintIcon className="w-4 h-4" />
              Biometric Protection
            </h3>
            {account && (
              <BiometricSettings 
                account={account} 
                onUpdate={() => {
                  // Refresh the account data
                  // This will be handled by the Firestore listener
                }}
              />
            )}
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
        ) : (
          <div className="p-6">
            {usageStats ? (
              <AccountUsageChart stats={usageStats} />
            ) : (
              <div className="text-center py-8">
                <ChartBarIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3 animate-pulse" />
                <p className="text-muted-foreground">Loading analytics...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EditAccountModal;