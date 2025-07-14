/**
 * Registration page component
 * @module pages/RegisterPage
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@src/store';
import { signUp } from '@store/slices/authSlice';
import { setEncryptionKey } from '@store/slices/authSlice';
import { addToast } from '@store/slices/uiSlice';
import { EncryptionService } from '@services/encryption.service';
import { 
  UserPlusIcon, 
  EnvelopeIcon, 
  KeyIcon, 
  LockClosedIcon,
  CheckIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

interface PasswordStrength {
  score: number;
  feedback: string[];
}

/**
 * Registration page for new users
 */
const RegisterPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [encryptionPassword, setEncryptionPassword] = useState('');
  const [confirmEncryptionPassword, setConfirmEncryptionPassword] = useState('');
  const [encryptionHint, setEncryptionHint] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, feedback: [] });
  const [encryptionStrength, setEncryptionStrength] = useState<PasswordStrength>({ score: 0, feedback: [] });

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    const strength = EncryptionService.validatePasswordStrength(value);
    setPasswordStrength(strength);
  };

  const handleEncryptionPasswordChange = (value: string) => {
    setEncryptionPassword(value);
    const strength = EncryptionService.validatePasswordStrength(value);
    setEncryptionStrength(strength);
  };

  const handleSubmit = async (_e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!email || !password || !confirmPassword || !encryptionPassword || !confirmEncryptionPassword) {
      dispatch(addToast({
        type: 'error',
        message: 'Please fill in all fields',
      }));
      return;
    }

    if (password !== confirmPassword) {
      dispatch(addToast({
        type: 'error',
        message: 'Passwords do not match',
      }));
      return;
    }

    if (encryptionPassword !== confirmEncryptionPassword) {
      dispatch(addToast({
        type: 'error',
        message: 'Encryption passwords do not match',
      }));
      return;
    }

    if (passwordStrength.score < 3) {
      dispatch(addToast({
        type: 'error',
        message: 'Please choose a stronger password',
      }));
      return;
    }

    if (encryptionStrength.score < 3) {
      dispatch(addToast({
        type: 'error',
        message: 'Please choose a stronger encryption password',
      }));
      return;
    }

    setIsLoading(true);

    try {
      // Create account
      await dispatch(signUp({ email, password })).unwrap();
      
      // Set encryption key
      const encryptionKey = await EncryptionService.hashPassword(encryptionPassword);
      dispatch(setEncryptionKey(encryptionKey));
      
      // TODO: Save encryption hint to user profile in Firestore
      
      dispatch(addToast({
        type: 'success',
        message: 'Account created successfully!',
      }));
      
      navigate('/dashboard');
    } catch (_error: unknown) {
      console.error('Registration _error:', error);
      dispatch(addToast({
        type: 'error',
        message: error.message || 'Failed to create account',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthColor = (score: number) => {
    if (score < 3) return 'text-red-500';
    if (score < 5) return 'text-yellow-500';
    if (score < 7) return 'text-blue-500';
    return 'text-green-500';
  };

  const getStrengthText = (score: number) => {
    if (score < 3) return 'Weak';
    if (score < 5) return 'Fair';
    if (score < 7) return 'Good';
    return 'Strong';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <UserPlusIcon className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Or{' '}
            <Link to="/login" className="font-medium text-primary hover:text-primary/80">
              sign in to existing account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Email */}
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
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Account Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Account password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                />
              </div>
              {password && (
                <div className="mt-2">
                  <p className={`text-xs ${getStrengthColor(passwordStrength.score)}`}>
                    Password strength: {getStrengthText(passwordStrength.score)}
                  </p>
                  {passwordStrength.feedback.length > 0 && (
                    <ul className="mt-1 text-xs text-muted-foreground">
                      {passwordStrength.feedback.map((item, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <XMarkIcon className="w-3 h-3 text-red-500 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
              {confirmPassword && password && (
                <p className={`text-xs mt-1 ${password === confirmPassword ? 'text-green-500' : 'text-red-500'}`}>
                  {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}
            </div>

            {/* Encryption Password */}
            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-foreground mb-2">
                Encryption password
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                This password encrypts your 2FA codes. It's separate from your account password for extra security.
                <strong className="text-warning"> Remember it! We cannot recover this password.</strong>
              </p>
              
              <div>
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
                    onChange={(e) => handleEncryptionPasswordChange(e.target.value)}
                    className="input pl-10"
                    placeholder="Strong encryption password"
                  />
                </div>
                {encryptionPassword && (
                  <div className="mt-2">
                    <p className={`text-xs ${getStrengthColor(encryptionStrength.score)}`}>
                      Encryption strength: {getStrengthText(encryptionStrength.score)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Confirm Encryption Password */}
            <div>
              <label htmlFor="confirmEncryptionPassword" className="block text-sm font-medium text-foreground mb-2">
                Confirm encryption password
              </label>
              <input
                id="confirmEncryptionPassword"
                name="confirmEncryptionPassword"
                type="password"
                autoComplete="off"
                required
                value={confirmEncryptionPassword}
                onChange={(e) => setConfirmEncryptionPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </div>

            {/* Encryption Hint */}
            <div>
              <label htmlFor="encryptionHint" className="block text-sm font-medium text-foreground mb-2">
                Encryption password hint (optional)
              </label>
              <input
                id="encryptionHint"
                name="encryptionHint"
                type="text"
                value={encryptionHint}
                onChange={(e) => setEncryptionHint(e.target.value)}
                className="input"
                placeholder="A hint to help you remember"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This hint will be shown when you need to enter your encryption password
              </p>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary btn-lg w-full"
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            By creating an account, you agree to our{' '}
            <Link to="/terms" className="text-primary hover:text-primary/80">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-primary hover:text-primary/80">
              Privacy Policy
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;