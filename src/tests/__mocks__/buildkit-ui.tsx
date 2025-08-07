/**
 * Mock for buildkit-ui package
 */
import React from 'react';
import { vi } from 'vitest';

// Mock theme
export const buildkitTheme = {
  colors: {
    primary: '#3B82F6',
    secondary: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    success: '#10B981',
    info: '#3B82F6',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
    },
  },
};

// Mock components
export const Button = ({ children, ...props }: any) => (
  <button {...props}>{children}</button>
);

export const Card = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const Modal = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const Input = (props: any) => <input {...props} />;

export const Select = ({ children, ...props }: any) => (
  <select {...props}>{children}</select>
);

export const Checkbox = (props: any) => <input type="checkbox" {...props} />;

export const Radio = (props: any) => <input type="radio" {...props} />;

export const Switch = (props: any) => <input type="checkbox" {...props} />;

export const Label = ({ children, ...props }: any) => (
  <label {...props}>{children}</label>
);

export const Badge = ({ children, ...props }: any) => (
  <span {...props}>{children}</span>
);

export const Alert = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const Toast = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const Tooltip = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const Progress = (props: any) => <progress {...props} />;

export const Spinner = () => <div>Loading...</div>;

export const Tabs = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const TabsContent = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const TabsList = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const TabsTrigger = ({ children, ...props }: any) => (
  <button {...props}>{children}</button>
);

export const Dialog = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const DialogContent = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const DialogTrigger = ({ children, ...props }: any) => (
  <button {...props}>{children}</button>
);

export const DropdownMenu = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const DropdownMenuContent = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const DropdownMenuItem = ({ children, ...props }: any) => (
  <div {...props}>{children}</div>
);

export const DropdownMenuTrigger = ({ children, ...props }: any) => (
  <button {...props}>{children}</button>
);

// Mock utilities
export const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

// Mock hooks
export const useTheme = () => ({ theme: buildkitTheme, setTheme: vi.fn() });
export const useToast = () => ({ toast: vi.fn() });
export const useModal = () => ({ openModal: vi.fn(), closeModal: vi.fn() });

// Mock animations
export const animations = {
  fadeIn: 'fadeIn',
  fadeOut: 'fadeOut',
  slideIn: 'slideIn',
  slideOut: 'slideOut',
};