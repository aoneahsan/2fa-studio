/**
 * Toast utility functions
 * @module utils/toast
 */

export interface ToastOptions {
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  position?: 'top' | 'center' | 'bottom';
}

export const showToast = (message: string, options: ToastOptions = {}) => {
  // Implementation will depend on your toast library
  // For now, we'll use console for development
  console.log(`[${options.type || 'info'}] ${message}`);
  
  // You can integrate with react-hot-toast, react-toastify, or Capacitor Toast here
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    // Use Capacitor Toast for mobile
    import('@capacitor/toast').then(({ Toast }) => {
      const duration = options.duration ? 
        (options.duration > 3000 ? 'long' : 'short') : 
        (options.type === 'error' ? 'long' : 'short');
      
      Toast.show({
        text: message,
        duration: duration,
        position: options.position || 'bottom',
      });
    });
  }
};

export const showSuccess = (message: string) => showToast(message, { type: 'success' });
export const showError = (message: string) => showToast(message, { type: 'error' });
export const showWarning = (message: string) => showToast(message, { type: 'warning' });
export const showInfo = (message: string) => showToast(message, { type: 'info' });