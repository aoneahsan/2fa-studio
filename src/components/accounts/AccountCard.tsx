/**
 * Account card component for displaying 2FA accounts
 * @module components/accounts/AccountCard
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { OTPAccount, OTPService } from '@services/otp.service';
import { BiometricAccountService } from '@services/biometric-account.service';
import { AnalyticsService } from '@services/analytics.service';
import { addToast } from '@store/slices/uiSlice';
import { incrementHOTPCounter } from '@store/slices/accountsSlice';
import { useAppSelector } from '@hooks/useAppSelector';
import { selectTagById } from '@store/slices/tagsSlice';
import { selectFolderById } from '@store/slices/foldersSlice';
import { RootState } from '@src/store';
import { 
  ClipboardDocumentIcon, 
  PencilIcon, 
  TrashIcon,
  ArrowPathIcon,
  StarIcon as StarOutlineIcon,
  FolderIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import FingerPrintIcon from '@components/icons/FingerPrintIcon';
import TagPill from '@components/tags/TagPill';

interface AccountCardProps {
  account: OTPAccount;
  onEdit: (account: OTPAccount) => void;
  onDelete: (account: OTPAccount) => void;
  onToggleFavorite?: (account: OTPAccount) => void;
}

/**
 * Displays a single 2FA account with OTP code generation
 */
const AccountCard: React.FC<AccountCardProps> = ({ account, onEdit, onDelete, onToggleFavorite }) => {
  const dispatch = useDispatch();
  const { user } = useAppSelector((state: RootState) => state.auth);
  const [otpCode, setOtpCode] = useState('');
  const [remainingTime, setRemainingTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isCopying, setIsCopying] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  
  const biometricStatus = BiometricAccountService.getBiometricStatus(account);

  // Check if account needs biometric unlock
  useEffect(() => {
    setIsLocked(BiometricAccountService.isBiometricRequired(account));
  }, [account]);

  // Track view analytics
  useEffect(() => {
    if (!hasTrackedView && user && !isLocked && otpCode && otpCode !== '••••••') {
      AnalyticsService.trackUsage(user.id, account.id, 'view');
      setHasTrackedView(true);
    }
  }, [hasTrackedView, user, account.id, isLocked, otpCode]);

  // Generate OTP code
  const generateCode = useCallback(() => {
    if (isLocked) {
      setOtpCode('••••••');
      return;
    }
    
    try {
      const result = OTPService.generateCode(account);
      setOtpCode(result.code || '');
      
      if (account.type === 'totp' && result.remainingTime) {
        setRemainingTime(result.remainingTime);
        setProgress(result.progress || 0);
      }
    } catch (error) {
      console.error('Failed to generate code:', error);
      setOtpCode('ERROR');
    }
  }, [account, isLocked]);

  // Initial code generation
  useEffect(() => {
    generateCode();
  }, [generateCode]);

  // Update TOTP codes every second
  useEffect(() => {
    if (account.type !== 'totp') return;

    const interval = setInterval(() => {
      generateCode();
    }, 1000);

    return () => clearInterval(interval);
  }, [account.type, generateCode]);

  // Handle biometric unlock
  const handleBiometricUnlock = async () => {
    setIsAuthenticating(true);
    
    try {
      const result = await BiometricAccountService.authenticateAccount(
        account,
        `Unlock ${account.label}`
      );
      
      if (result.success) {
        setIsLocked(false);
        generateCode();
      } else {
        dispatch(addToast({
          type: 'error',
          message: result.error || 'Biometric authentication failed',
        }));
      }
    } catch (error) {
      dispatch(addToast({
        type: 'error',
        message: 'Failed to authenticate',
      }));
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Copy code to clipboard
  const handleCopyCode = async () => {
    if (!otpCode || otpCode === 'ERROR' || isLocked) {
      if (isLocked) {
        await handleBiometricUnlock();
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(otpCode);
      setIsCopying(true);
      
      // Track copy analytics
      if (user) {
        AnalyticsService.trackUsage(user.id, account.id, 'copy');
      }
      
      dispatch(addToast({
        type: 'success',
        message: 'Code copied to clipboard',
        duration: 2000
      }));

      setTimeout(() => setIsCopying(false), 1000);
    } catch (error) {
      console.error('Failed to copy:', error);
      dispatch(addToast({
        type: 'error',
        message: 'Failed to copy code'
      }));
    }
  };

  // Generate next HOTP code
  const handleGenerateHOTP = () => {
    if (account.type !== 'hotp') return;
    
    dispatch(incrementHOTPCounter(account.id));
    generateCode();
    
    // Track generation analytics
    if (user) {
      AnalyticsService.trackUsage(user.id, account.id, 'generate');
    }
  };

  // Format code for display
  const formatCode = (code: string) => {
    if (!code) return '------';
    const mid = Math.ceil(code.length / 2);
    return `${code.slice(0, mid)} ${code.slice(mid)}`;
  };

  // Get account icon
  const getAccountIcon = () => {
    if (account.iconUrl) {
      return (
        <img 
          src={account.iconUrl} 
          alt={account.issuer}
          className="w-full h-full object-contain"
          onError={(_e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      );
    }

    // Fallback to first letter
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold text-lg">
        {account.issuer.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start gap-4">
        {/* Account Icon */}
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          {getAccountIcon()}
        </div>

        {/* Account Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">
            {account.issuer}
          </h3>
          <p className="text-sm text-muted-foreground truncate">
            {account.label}
          </p>

          {/* Tags and Folder */}
          <div className="flex items-center gap-2 mt-1">
            {account.folderId && (
              <AccountFolderInfo folderId={account.folderId} />
            )}
            {account.tags && account.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {account.tags.map((tagId) => (
                  <AccountTagPill key={tagId} tagId={tagId} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {biometricStatus.isEnabled && (
            <div className="p-1.5 text-primary" title="Biometric protected">
              <FingerPrintIcon className="w-4 h-4" />
            </div>
          )}
          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(account)}
              className="p-1.5 rounded hover:bg-muted transition-colors"
              title={account.isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              {account.isFavorite ? (
                <StarSolidIcon className="w-4 h-4 text-yellow-500" />
              ) : (
                <StarOutlineIcon className="w-4 h-4 text-muted-foreground hover:text-yellow-500" />
              )}
            </button>
          )}
          <button
            onClick={() => onEdit(account)}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            title="Edit account"
          >
            <PencilIcon className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => onDelete(account)}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            title="Delete account"
          >
            <TrashIcon className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* OTP Code Display */}
      <div className="mt-4">
        {isLocked ? (
          <div className="flex items-center justify-between">
            <button
              onClick={handleBiometricUnlock}
              disabled={isAuthenticating}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
            >
              <LockClosedIcon className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">
                {isAuthenticating ? 'Authenticating...' : 'Unlock with biometric'}
              </span>
            </button>
            {biometricStatus.remainingMinutes && (
              <span className="text-xs text-muted-foreground">
                {biometricStatus.remainingMinutes}m remaining
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <button
              onClick={handleCopyCode}
              className={`flex items-center gap-2 text-2xl font-mono font-bold transition-all ${
                isCopying ? 'text-green-500' : 'text-foreground hover:text-primary'
              }`}
              disabled={!otpCode || otpCode === 'ERROR'}
              data-testid="totp-code"
            >
              <span>{formatCode(otpCode)}</span>
              <ClipboardDocumentIcon className="w-5 h-5" />
            </button>

            {/* Timer or Counter */}
            {account.type === 'totp' ? (
            <div className="flex items-center gap-2">
              <div className="relative w-8 h-8">
                <svg className="w-8 h-8 transform -rotate-90">
                  <circle
                    cx="16"
                    cy="16"
                    r="14"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="16"
                    cy="16"
                    r="14"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 14}`}
                    strokeDashoffset={`${2 * Math.PI * 14 * (1 - progress / 100)}`}
                    className="text-primary transition-all duration-1000"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium" data-testid="countdown">
                  {remainingTime}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Counter: {account.counter || 0}
              </span>
              <button
                onClick={handleGenerateHOTP}
                className="p-1.5 rounded hover:bg-muted transition-colors"
                title="Generate next code"
              >
                <ArrowPathIcon className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}
          </div>
        )}

        {/* Progress bar for TOTP */}
        {account.type === 'totp' && !isLocked && (
          <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Sub-component for rendering tags with hooks
const AccountTagPill: React.FC<{ tagId: string }> = ({ tagId }) => {
  const tag = useAppSelector(selectTagById(tagId));
  
  if (!tag) return null;
  
  return <TagPill tag={tag} size="sm" />;
};

// Sub-component for rendering folder info with hooks
const AccountFolderInfo: React.FC<{ folderId: string }> = ({ folderId }) => {
  const folder = useAppSelector((state) => selectFolderById(state, folderId));
  
  if (!folder) return null;
  
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <FolderIcon 
        className="w-3.5 h-3.5" 
        style={{ color: folder.color || undefined }}
      />
      <span>{folder.name}</span>
    </div>
  );
};

export default AccountCard;