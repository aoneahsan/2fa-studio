/**
 * Mock for react-buildkit package
 */
import React from 'react';
import { vi } from 'vitest';

// Mock hooks
export const useDebounce = (value: any, delay: number) => value;
export const useThrottle = (value: any, delay: number) => value;
export const useLocalStorage = (key: string, initialValue: any) => [initialValue, vi.fn()];
export const useSessionStorage = (key: string, initialValue: any) => [initialValue, vi.fn()];
export const usePrevious = (value: any) => undefined;
export const useInterval = (callback: () => void, delay: number | null) => {};
export const useTimeout = (callback: () => void, delay: number | null) => {};
export const useClickOutside = (ref: any, handler: () => void) => {};
export const useKeyPress = (targetKey: string) => false;
export const useMediaQuery = (query: string) => false;
export const useScrollPosition = () => ({ x: 0, y: 0 });
export const useLockBodyScroll = () => {};
export const useDocumentTitle = (title: string) => {};
export const useAsync = (asyncFunction: () => Promise<any>, immediate = true) => ({
  execute: vi.fn(),
  status: 'idle',
  value: null,
  error: null,
});
export const useFetch = (url: string, options?: any) => ({
  data: null,
  loading: false,
  error: null,
});

// Mock components
export const ErrorBoundary = ({ children, fallback }: any) => <>{children}</>;
export const ConditionalWrapper = ({ condition, wrapper, children }: any) => 
  condition ? wrapper(children) : children;
export const Portal = ({ children }: any) => <>{children}</>;
export const LazyLoad = ({ children }: any) => <>{children}</>;
export const InfiniteScroll = ({ children }: any) => <>{children}</>;

// Mock HOCs
export const withErrorBoundary = (Component: any, options?: any) => Component;
export const withAuth = (Component: any) => Component;
export const withLoading = (Component: any) => Component;

// Mock context utilities
export const createContext = <T,>(defaultValue: T) => {
  const Context = React.createContext(defaultValue);
  const useContext = () => React.useContext(Context);
  return [Context.Provider, useContext] as const;
};

// Mock performance utilities
export const memo = React.memo;
export const useMemoizedFn = (fn: Function) => fn;