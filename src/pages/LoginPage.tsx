/**
 * Login page component
 * @module pages/LoginPage
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@src/store';
import { signIn } from '@store/slices/authSlice';
import { setEncryptionKey } from '@store/slices/authSlice';
import { addToast } from '@store/slices/uiSlice';
import { EncryptionService } from '@services/encryption.service';
import { LockClosedIcon, EnvelopeIcon, KeyIcon } from '@heroicons/react/24/outline';

/**
 * Login page for user authentication
 */
const LoginPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [encryptionPassword, setEncryptionPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEncryptionField, setShowEncryptionField] = useState(false);

  const handleSubmit = async (_e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      dispatch(addToast({
        type: 'error',
        message: 'Please fill in all fields',
      }));
      return;
    }

    setIsLoading(true);

    try {
      // Sign in with Firebase
      await dispatch(signIn({ email, password })).unwrap();
      
      // Show encryption password field after successful auth
      if (!showEncryptionField) {
        setShowEncryptionField(true);
        setIsLoading(false);
        return;
      }

      // Validate encryption password
      if (!encryptionPassword) {
        dispatch(addToast({
          type: 'error',
          message: 'Please enter your encryption password',
        }));
        setIsLoading(false);
        return;
      }

      // Hash the encryption password for use as key
      const encryptionKey = await EncryptionService.hashPassword(encryptionPassword);
      dispatch(setEncryptionKey(encryptionKey));
      
      dispatch(addToast({
        type: 'success',
        message: 'Welcome back!',
      }));
      
      navigate('/dashboard');
    } catch (_error: unknown) {
      console.error('Login _error:', _error);
      dispatch(addToast({
        type: 'error',
        message: error.message || 'Failed to sign in',
      }));
      setShowEncryptionField(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <LockClosedIcon className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
            Sign in to 2FA Studio
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Or{' '}
            <Link to="/register" className="font-medium text-primary hover:text-primary/80">
              create a new account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {!showEncryptionField ? (
              <>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <EnvelopeIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(_e) => setEmail(e.target.value)}
                      className="input pl-10"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <KeyIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(_e) => setPassword(e.target.value)}
                      className="input pl-10"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    ✓ Authentication successful
                  </p>
                </div>

                <div>
                  <label htmlFor="encryptionPassword" className="block text-sm font-medium text-foreground mb-2">
                    Encryption Password
                  </label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Enter your encryption password to decrypt your 2FA codes
                  </p>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <input
                      id="encryptionPassword"
                      name="encryptionPassword"
                      type="password"
                      autoComplete="off"
                      required
                      value={encryptionPassword}
                      onChange={(_e) => setEncryptionPassword(e.target.value)}
                      className="input pl-10"
                      placeholder="Your encryption password"
                      autoFocus
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary btn-lg w-full"
            >
              {isLoading ? 'Signing in...' : showEncryptionField ? 'Unlock' : 'Sign in'}
            </button>
          </div>

          {!showEncryptionField && (
            <div className="flex items-center justify-between text-sm">
              <Link
                to="/forgot-password"
                className="text-primary hover:text-primary/80"
              >
                Forgot your password?
              </Link>
            </div>
          )}
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-muted-foreground">Security Notice</span>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            <p>Your 2FA codes are end-to-end encrypted.</p>
            <p>We never have access to your encryption password.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;