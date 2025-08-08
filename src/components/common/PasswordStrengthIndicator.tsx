import React, { useMemo } from 'react';

interface PasswordStrengthIndicatorProps {
  password: string;
  showText?: boolean;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  showText = true
}) => {
  const strength = useMemo(() => {
    if (!password) return { score: 0, text: 'Enter password', color: 'bg-gray-300' };
    
    let score = 0;
    
    // Length check
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    
    // Character variety
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    
    // Common patterns (negative points)
    if (/(.)\1{2,}/.test(password)) score--; // Repeated characters
    if (/^(password|123456|qwerty)/i.test(password)) score -= 2; // Common passwords
    
    // Normalize score
    const normalizedScore = Math.max(0, Math.min(5, Math.floor((score / 7) * 5)));
    
    const strengthLevels = [
      { score: 0, text: 'Very Weak', color: 'bg-red-500' },
      { score: 1, text: 'Weak', color: 'bg-orange-500' },
      { score: 2, text: 'Fair', color: 'bg-yellow-500' },
      { score: 3, text: 'Good', color: 'bg-blue-500' },
      { score: 4, text: 'Strong', color: 'bg-green-500' },
      { score: 5, text: 'Very Strong', color: 'bg-green-600' }
    ];
    
    return strengthLevels[normalizedScore] || strengthLevels[0];
  }, [password]);

  return (
    <div className="space-y-2">
      <div className="flex gap-1 h-1">
        {[0, 1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className={`flex-1 rounded-full transition-colors ${
              index < strength.score ? strength.color : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      {showText && password && (
        <p className={`text-xs ${strength.color.replace('bg-', 'text-')}`}>
          {strength.text}
        </p>
      )}
    </div>
  );
};