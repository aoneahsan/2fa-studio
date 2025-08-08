import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  disabled?: boolean;
  className?: string;
  offset?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 200,
  disabled = false,
  className = '',
  offset = 8
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - offset;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + offset;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - offset;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + offset;
        break;
    }

    // Prevent tooltip from going off-screen
    if (left < 0) left = offset;
    if (left + tooltipRect.width > viewportWidth) {
      left = viewportWidth - tooltipRect.width - offset;
    }
    if (top < 0) top = offset;
    if (top + tooltipRect.height > viewportHeight) {
      top = viewportHeight - tooltipRect.height - offset;
    }

    setCoords({ top, left });
  };

  const handleMouseEnter = () => {
    if (disabled) return;
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible]);

  const tooltipContent = isVisible && !disabled && (
    <div
      ref={tooltipRef}
      className={`fixed z-50 px-2 py-1 text-xs bg-gray-900 text-white rounded shadow-lg pointer-events-none animate-in ${className}`}
      style={{
        top: `${coords.top}px`,
        left: `${coords.left}px`,
      }}
    >
      {content}
      <div
        className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
          position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' :
          position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' :
          position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' :
          'left-[-4px] top-1/2 -translate-y-1/2'
        }`}
      />
    </div>
  );

  return (
    <>
      {React.cloneElement(children, {
        ref: triggerRef,
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        onFocus: handleMouseEnter,
        onBlur: handleMouseLeave,
      })}
      {createPortal(tooltipContent, document.body)}
    </>
  );
};

// Tooltip provider for managing multiple tooltips
interface TooltipProviderProps {
  children: React.ReactNode;
  delayDuration?: number;
  skipDelayDuration?: number;
}

const TooltipContext = React.createContext<{
  delayDuration: number;
  skipDelayDuration: number;
}>({
  delayDuration: 200,
  skipDelayDuration: 0,
});

export const TooltipProvider: React.FC<TooltipProviderProps> = ({
  children,
  delayDuration = 200,
  skipDelayDuration = 0,
}) => {
  return (
    <TooltipContext.Provider value={{ delayDuration, skipDelayDuration }}>
      {children}
    </TooltipContext.Provider>
  );
};

// Helper tooltip components for common use cases
export const IconTooltip: React.FC<{
  content: string;
  children: React.ReactElement;
}> = ({ content, children }) => (
  <Tooltip content={content} position="top" delay={500}>
    {children}
  </Tooltip>
);

export const HelpTooltip: React.FC<{
  content: string;
  className?: string;
}> = ({ content, className = '' }) => (
  <Tooltip content={content} position="top">
    <button className={`inline-flex items-center justify-center w-4 h-4 text-xs font-medium text-muted-foreground border rounded-full hover:bg-muted ${className}`}>
      ?
    </button>
  </Tooltip>
);

// Tooltip with rich content
export const RichTooltip: React.FC<{
  title?: string;
  description?: string;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
}> = ({ title, description, children, position = 'top' }) => {
  const content = (
    <div className="max-w-xs">
      {title && <div className="font-semibold mb-1">{title}</div>}
      {description && <div className="text-gray-300">{description}</div>}
    </div>
  );

  return (
    <Tooltip content={content} position={position} className="px-3 py-2">
      {children}
    </Tooltip>
  );
};

// Keyboard shortcut tooltip
export const ShortcutTooltip: React.FC<{
  keys: string[];
  description: string;
  children: React.ReactElement;
}> = ({ keys, description, children }) => {
  const content = (
    <div className="flex items-center gap-2">
      <span>{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <React.Fragment key={index}>
            <kbd className="px-1.5 py-0.5 text-xs bg-gray-700 rounded">
              {key}
            </kbd>
            {index < keys.length - 1 && <span>+</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  return <Tooltip content={content} position="bottom">{children}</Tooltip>;
};