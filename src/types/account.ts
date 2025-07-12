export interface Account {
  id: string;
  userId: string;
  issuer: string;
  label: string;
  secret: string;
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
  digits: number;
  period: number;
  type: 'totp' | 'hotp';
  counter?: number;
  icon?: string;
  color?: string;
  tags: string[];
  isFavorite: boolean;
  backupCodes: string[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
  lastUsed: number | null;
}