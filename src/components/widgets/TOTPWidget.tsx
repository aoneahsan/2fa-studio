/**
 * TOTP Widget Component for Home Screen
 */

import React from 'react';
import { useAccounts } from '@/hooks/useAccounts';
import { TOTPService } from '@/services/totp.service';

interface TOTPWidgetProps {
  accountId?: string;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  autoRefresh?: boolean;
}

const TOTPWidget: React.FC<TOTPWidgetProps> = ({
  accountId,
  size = 'medium',
  showIcon = true,
  autoRefresh = true
}) => {
  const { accounts } = useAccounts();
  const [currentTime, setCurrentTime] = React.useState(Date.now());
  
  const account = accountId ? accounts.find(a => a.id === accountId) : accounts[0];
  
  React.useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [autoRefresh]);
  
  if (!account) {
    return (
      <div className="widget-container">
        <div className="widget-empty">No 2FA accounts</div>
      </div>
    );
  }
  
  const code = TOTPService.generateTOTP(account.secret, {
    algorithm: account.algorithm,
    digits: account.digits,
    period: account.period
  });
  
  const timeRemaining = TOTPService.getTimeRemaining(account.period || 30);
  
  return (
    <div className={`widget-container widget-${size}`}>
      <div className="widget-header">
        {showIcon && account.icon && (
          <img src={account.icon} alt="" className="widget-icon" />
        )}
        <span className="widget-issuer">{account.issuer}</span>
      </div>
      <div className="widget-code">{code}</div>
      <div className="widget-timer">
        <div 
          className="timer-bar" 
          style={{ 
            width: `${(timeRemaining / (account.period || 30)) * 100}%` 
          }}
        />
        <span className="timer-text">{timeRemaining}s</span>
      </div>
    </div>
  );
};

export default TOTPWidget;