/**
 * BuildKit UI Integration Service
 * @module services/buildkit-ui
 */

// Note: buildkit-ui is a Capacitor plugin, not a React component library
// We'll create wrapper components as needed

// Placeholder exports until we implement proper wrappers
const Button = () => null;
const Input = () => null;
const Card = () => null;
const Modal = () => null;
const Toast = () => null;
const Spinner = () => null;
const Badge = () => null;
const Avatar = () => null;
const Dropdown = () => null;
const Switch = () => null;
const Tabs = () => null;
const Alert = () => null;
const Progress = () => null;
const Skeleton = () => null;
const Tooltip = () => null;
const IconButton = () => null;
const Form = () => null;
const FormField = () => null;
const ThemeProvider = ({ children }: any) => children;
const useTheme = () => ({});
const useToast = () => ({ show: () => {} });
const useModal = () => ({ open: () => {}, close: () => {} });
const animations = {};

// Re-export commonly used components for easy access
export {
  Button,
  Input,
  Card,
  Modal,
  Toast,
  Spinner,
  Badge,
  Avatar,
  Dropdown,
  Switch,
  Tabs,
  Alert,
  Progress,
  Skeleton,
  Tooltip,
  IconButton,
  Form,
  FormField,
  ThemeProvider,
  useTheme,
  useToast,
  useModal,
  animations
};

// Component mapping for migration
export const componentMap = {
  // Buttons
  'button': Button,
  'iconButton': IconButton,
  
  // Form elements
  'input': Input,
  'switch': Switch,
  'dropdown': Dropdown,
  
  // Layout
  'card': Card,
  'modal': Modal,
  'tabs': Tabs,
  
  // Feedback
  'alert': Alert,
  'toast': Toast,
  'spinner': Spinner,
  'progress': Progress,
  'skeleton': Skeleton,
  
  // Display
  'badge': Badge,
  'avatar': Avatar,
  'tooltip': Tooltip
};

// Theme configuration for 2FA Studio
export const buildkitTheme = {
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    secondary: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
    success: {
      50: '#f0fdf4',
      500: '#22c55e',
      700: '#15803d',
    },
    warning: {
      50: '#fffbeb',
      500: '#f59e0b',
      700: '#b45309',
    },
    error: {
      50: '#fef2f2',
      500: '#ef4444',
      700: '#b91c1c',
    }
  },
  
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  
  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: 'Menlo, Monaco, Consolas, "Courier New", monospace',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
    }
  },
  
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  
  transitions: {
    fast: '150ms ease-in-out',
    base: '200ms ease-in-out',
    slow: '300ms ease-in-out',
  }
};

// Animation presets for 2FA Studio
export const animationPresets = {
  fadeIn: animations.fadeIn,
  slideIn: animations.slideIn,
  scaleIn: animations.scaleIn,
  bounce: animations.bounce,
  shake: animations.shake,
};

// Custom styled components using buildkit-ui
export const StyledComponents = {
  // Account card with 2FA specific styling
  AccountCard: ({ children, ...props }: any) => (
    <Card
      className="hover:shadow-lg transition-shadow"
      padding="md"
      {...props}
    >
      {children}
    </Card>
  ),
  
  // Primary action button
  PrimaryButton: ({ children, ...props }: any) => (
    <Button
      variant="primary"
      size="md"
      className="font-medium"
      {...props}
    >
      {children}
    </Button>
  ),
  
  // Security alert component
  SecurityAlert: ({ type = 'warning', children, ...props }: any) => (
    <Alert
      type={type}
      icon={type === 'error' ? '🚨' : '⚠️'}
      {...props}
    >
      {children}
    </Alert>
  ),
  
  // Code display component
  CodeDisplay: ({ code, ...props }: any) => (
    <Card
      className="font-mono text-2xl text-center"
      padding="lg"
      {...props}
    >
      {code}
    </Card>
  ),
  
  // Loading state component
  LoadingState: ({ message = 'Loading...', ...props }: any) => (
    <div className="flex flex-col items-center justify-center p-8">
      <Spinner size="lg" {...props} />
      <p className="mt-4 text-gray-500">{message}</p>
    </div>
  ),
};

// Form validation utilities from buildkit-ui
export const validation = {
  email: (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? null : 'Invalid email address';
  },
  
  required: (value: any) => {
    return value ? null : 'This field is required';
  },
  
  minLength: (min: number) => (value: string) => {
    return value.length >= min ? null : `Must be at least ${min} characters`;
  },
  
  strongPassword: (value: string) => {
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumbers = /\d/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    const isLongEnough = value.length >= 8;
    
    if (!isLongEnough) return 'Password must be at least 8 characters';
    if (!hasUpperCase) return 'Password must contain uppercase letter';
    if (!hasLowerCase) return 'Password must contain lowercase letter';
    if (!hasNumbers) return 'Password must contain a number';
    if (!hasSpecialChar) return 'Password must contain special character';
    
    return null;
  }
};

// Utility hooks from buildkit-ui
export const hooks = {
  useTheme,
  useToast,
  useModal,
  
  // Custom hook for 2FA specific UI logic
  use2FATimer: (duration: number = 30) => {
    // This would be implemented to handle TOTP countdown
    return { timeLeft: duration, progress: 100 };
  }
};