import React, { useState, useEffect } from 'react';

// Relative time display (e.g., "2 hours ago", "in 3 days")
interface RelativeTimeProps {
  date: Date | string | number;
  updateInterval?: number; // milliseconds
  className?: string;
}

export const RelativeTime: React.FC<RelativeTimeProps> = ({
  date,
  updateInterval = 60000, // update every minute
  className = ''
}) => {
  const [relativeTime, setRelativeTime] = useState('');

  const calculateRelativeTime = () => {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const absDiff = Math.abs(diff);
    
    const seconds = Math.floor(absDiff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    let timeString = '';
    
    if (years > 0) {
      timeString = `${years} year${years > 1 ? 's' : ''}`;
    } else if (months > 0) {
      timeString = `${months} month${months > 1 ? 's' : ''}`;
    } else if (weeks > 0) {
      timeString = `${weeks} week${weeks > 1 ? 's' : ''}`;
    } else if (days > 0) {
      timeString = `${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      timeString = `${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      timeString = `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      timeString = 'just now';
    }

    if (diff > 0 && timeString !== 'just now') {
      timeString += ' ago';
    } else if (diff < 0) {
      timeString = 'in ' + timeString;
    }

    setRelativeTime(timeString);
  };

  useEffect(() => {
    calculateRelativeTime();
    const interval = setInterval(calculateRelativeTime, updateInterval);
    return () => clearInterval(interval);
  }, [date, updateInterval]);

  return (
    <time 
      dateTime={new Date(date).toISOString()} 
      title={new Date(date).toLocaleString()}
      className={className}
    >
      {relativeTime}
    </time>
  );
};

// Countdown timer
interface CountdownProps {
  endTime: Date | string | number;
  onComplete?: () => void;
  format?: 'long' | 'short' | 'compact';
  showDays?: boolean;
  className?: string;
}

export const Countdown: React.FC<CountdownProps> = ({
  endTime,
  onComplete,
  format = 'long',
  showDays = true,
  className = ''
}) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const difference = end - now;

      if (difference <= 0) {
        setIsComplete(true);
        if (onComplete) onComplete();
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0
        };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000)
      };
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, [endTime, onComplete]);

  if (isComplete) {
    return <span className={className}>Complete</span>;
  }

  const formatTime = () => {
    const parts = [];
    
    if (showDays && timeLeft.days > 0) {
      parts.push(`${timeLeft.days}d`);
    }
    
    if (format === 'compact') {
      parts.push(
        `${String(timeLeft.hours).padStart(2, '0')}:${String(timeLeft.minutes).padStart(2, '0')}:${String(timeLeft.seconds).padStart(2, '0')}`
      );
    } else if (format === 'short') {
      parts.push(`${timeLeft.hours}h`);
      parts.push(`${timeLeft.minutes}m`);
      parts.push(`${timeLeft.seconds}s`);
    } else {
      if (timeLeft.hours > 0) parts.push(`${timeLeft.hours} hour${timeLeft.hours !== 1 ? 's' : ''}`);
      if (timeLeft.minutes > 0) parts.push(`${timeLeft.minutes} minute${timeLeft.minutes !== 1 ? 's' : ''}`);
      if (timeLeft.seconds > 0) parts.push(`${timeLeft.seconds} second${timeLeft.seconds !== 1 ? 's' : ''}`);
    }

    return parts.join(format === 'long' ? ', ' : ' ');
  };

  return <span className={className}>{formatTime()}</span>;
};

// OTP countdown (30-second timer that resets)
interface OTPCountdownProps {
  period?: number; // seconds
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  className?: string;
}

export const OTPCountdown: React.FC<OTPCountdownProps> = ({
  period = 30,
  size = 'md',
  showProgress = true,
  className = ''
}) => {
  const [timeLeft, setTimeLeft] = useState(period);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000);
      return period - (now % period);
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 100);

    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, [period]);

  const progress = ((period - timeLeft) / period) * 100;
  
  const sizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`font-mono ${sizes[size]}`}>{timeLeft}s</span>
      {showProgress && (
        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

// Duration display (formats milliseconds/seconds into readable format)
interface DurationDisplayProps {
  duration: number; // milliseconds
  format?: 'long' | 'short';
  className?: string;
}

export const DurationDisplay: React.FC<DurationDisplayProps> = ({
  duration,
  format = 'short',
  className = ''
}) => {
  const formatDuration = () => {
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (format === 'long') {
      const parts = [];
      if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
      if (hours % 24 > 0) parts.push(`${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`);
      if (minutes % 60 > 0) parts.push(`${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}`);
      if (seconds % 60 > 0) parts.push(`${seconds % 60} second${seconds % 60 !== 1 ? 's' : ''}`);
      return parts.join(', ');
    } else {
      if (days > 0) return `${days}d ${hours % 24}h`;
      if (hours > 0) return `${hours}h ${minutes % 60}m`;
      if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
      return `${seconds}s`;
    }
  };

  return <span className={className}>{formatDuration()}</span>;
};

// Time ago with auto-update
export const TimeAgo: React.FC<{ date: Date | string | number }> = ({ date }) => {
  return <RelativeTime date={date} updateInterval={60000} />;
};

// Formatted date/time display
interface FormattedDateTimeProps {
  date: Date | string | number;
  format?: 'date' | 'time' | 'datetime' | 'relative';
  showRelative?: boolean;
  className?: string;
}

export const FormattedDateTime: React.FC<FormattedDateTimeProps> = ({
  date,
  format = 'datetime',
  showRelative = false,
  className = ''
}) => {
  const dateObj = new Date(date);
  
  const formatDate = () => {
    switch (format) {
      case 'date':
        return dateObj.toLocaleDateString();
      case 'time':
        return dateObj.toLocaleTimeString();
      case 'datetime':
        return dateObj.toLocaleString();
      case 'relative':
        return <RelativeTime date={date} />;
      default:
        return dateObj.toLocaleString();
    }
  };

  return (
    <span className={className}>
      {formatDate()}
      {showRelative && format !== 'relative' && (
        <span className="text-muted-foreground ml-2">
          (<RelativeTime date={date} />)
        </span>
      )}
    </span>
  );
};