/**
 * Mock for ts-buildkit package
 */
import { vi } from 'vitest';

// Type utilities
export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;
export type DeepReadonly<T> = T extends object ? { readonly [P in keyof T]: DeepReadonly<T[P]> } : T;
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type ValueOf<T> = T[keyof T];

// Array utilities
export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const unique = <T>(array: T[]): T[] => [...new Set(array)];
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    if (!groups[group]) groups[group] = [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};
export const sortBy = <T>(array: T[], key: keyof T): T[] => 
  [...array].sort((a, b) => String(a[key]).localeCompare(String(b[key])));

// Object utilities
export const pick = <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) result[key] = obj[key];
  });
  return result;
};

export const omit = <T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result as Omit<T, K>;
};

export const merge = <T extends object>(...objects: Partial<T>[]): T => 
  Object.assign({}, ...objects) as T;

export const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

// String utilities
export const capitalize = (str: string): string => 
  str.charAt(0).toUpperCase() + str.slice(1);

export const camelCase = (str: string): string => 
  str.replace(/[-_\s](.)/g, (_, char) => char.toUpperCase());

export const snakeCase = (str: string): string => 
  str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');

export const kebabCase = (str: string): string => 
  str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).replace(/^-/, '');

export const truncate = (str: string, length: number): string => 
  str.length > length ? str.substring(0, length) + '...' : str;

// Validation utilities
export const isEmail = (email: string): boolean => 
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isUUID = (uuid: string): boolean => 
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);

export const isEmpty = (value: any): boolean => 
  value === null || value === undefined || value === '' || 
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === 'object' && Object.keys(value).length === 0);

// Date utilities
export const formatDate = (date: Date, format: string): string => 
  date.toISOString().split('T')[0];

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const diffDays = (date1: Date, date2: Date): number => 
  Math.floor((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));

export const isAfter = (date1: Date, date2: Date): boolean => date1 > date2;
export const isBefore = (date1: Date, date2: Date): boolean => date1 < date2;

// Promise utilities
export const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

export const retry = async <T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await delay(delayMs);
    return retry(fn, retries - 1, delayMs);
  }
};

export const timeout = <T>(promise: Promise<T>, ms: number): Promise<T> => 
  Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), ms)
    ),
  ]);

export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T => {
  let timeoutId: NodeJS.Timeout;
  return ((...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
};

export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): T => {
  let inThrottle: boolean;
  return ((...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
};

// Error utilities
export const createError = (message: string, code?: string): Error => {
  const error = new Error(message);
  if (code) (error as any).code = code;
  return error;
};

export const isError = (error: any): error is Error => error instanceof Error;

export const getErrorMessage = (error: unknown): string => {
  if (isError(error)) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
};