/**
 * Social Login Buttons Component
 * Uses AuthManagerService for OAuth authentication
 * @module components/auth/SocialLoginButtons
 */

import React, { useState } from 'react';
import { AuthManagerService } from '@services/auth-manager.service';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { addToast } from '@store/slices/uiSlice';
import { Button } from '@components/ui/button-buildkit';

interface SocialLoginButtonsProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({
  onSuccess,
  onError
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSocialLogin = async (provider: string) => {
    setLoading(provider);
    
    try {
      const result = await AuthManagerService.signInWithProvider({
        provider: provider as any,
        scopes: provider === 'google' ? ['email', 'profile'] : [],
      });

      if (result.success && result.user) {
        dispatch(addToast({
          id: `login-success-${Date.now()}`,
          type: 'success',
          message: `Successfully signed in with ${AuthManagerService.getProviderDisplayName(provider)}!`
        }));
        
        onSuccess?.();
        navigate('/accounts');
      }
    } catch (error) {
      console.error(`${provider} login error:`, error);
      dispatch(addToast({
        id: `login-error-${Date.now()}`,
        type: 'error',
        message: `Failed to sign in with ${AuthManagerService.getProviderDisplayName(provider)}`
      }));
      
      onError?.(error as Error);
    } finally {
      setLoading(null);
    }
  };

  const providers = AuthManagerService.getAvailableProviders();

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        );
      case 'apple':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 3-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
        );
      case 'facebook':
        return (
          <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        );
      case 'microsoft':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#F25022" d="M11.4 0H0v11.4h11.4V0z"/>
            <path fill="#00A4EF" d="M24 0H12.6v11.4H24V0z"/>
            <path fill="#7FBA00" d="M11.4 12.6H0V24h11.4V12.6z"/>
            <path fill="#FFB900" d="M24 12.6H12.6V24H24V12.6z"/>
          </svg>
        );
      case 'github':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        );
      case 'twitter':
        return (
          <svg className="w-5 h-5" fill="#1DA1F2" viewBox="0 0 24 24">
            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const getProviderButtonClass = (provider: string) => {
    switch (provider) {
      case 'google':
        return 'border-gray-300 hover:bg-gray-50';
      case 'apple':
        return 'bg-black text-white hover:bg-gray-900';
      case 'facebook':
        return 'bg-[#1877F2] text-white hover:bg-[#1664D9]';
      case 'microsoft':
        return 'border-gray-300 hover:bg-gray-50';
      case 'github':
        return 'bg-gray-900 text-white hover:bg-gray-800';
      case 'twitter':
        return 'bg-[#1DA1F2] text-white hover:bg-[#1A91DA]';
      default:
        return 'border-gray-300 hover:bg-gray-50';
    }
  };

  return (
    <div className="space-y-3">
      {providers.map((provider) => (
        <Button
          key={provider}
          onClick={() => handleSocialLogin(provider)}
          disabled={loading !== null}
          loading={loading === provider}
          fullWidth
          variant="outline"
          className={`justify-center ${getProviderButtonClass(provider)}`}
        >
          {loading !== provider && getProviderIcon(provider)}
          <span className="ml-2">
            Continue with {AuthManagerService.getProviderDisplayName(provider)}
          </span>
        </Button>
      ))}
    </div>
  );
};

export default SocialLoginButtons;