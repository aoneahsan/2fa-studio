/**
 * Device management service for multi-device sync
 * @module services/device
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@src/config/firebase';
import { Device as CapacitorDevice } from '@capacitor/device';
import { v4 as uuidv4 } from 'uuid';

export interface DeviceInfo {
  id: string;
  userId: string;
  deviceId: string;
  name: string;
  platform: 'web' | 'ios' | 'android';
  model?: string;
  operatingSystem?: string;
  osVersion?: string;
  appVersion?: string;
  isCurrentDevice: boolean;
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;
  fcmToken?: string; // For push notifications
  isTrusted: boolean;
  sessionId: string;
}

export interface DeviceSession {
  id: string;
  deviceId: string;
  userId: string;
  startedAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
}

const PROJECT_PREFIX = 'fa2s_';

export class DeviceService {
  private static readonly DEVICES_COLLECTION = `${PROJECT_PREFIX}devices`;
  private static readonly SESSIONS_COLLECTION = `${PROJECT_PREFIX}sessions`;
  private static readonly DEVICE_ID_KEY = `${PROJECT_PREFIX}device_id`;
  private static readonly SESSION_ID_KEY = `${PROJECT_PREFIX}session_id`;
  private static readonly SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

  /**
   * Get or create device ID for current device
   */
  static async getDeviceId(): Promise<string> {
    // Check localStorage for existing device ID
    const existingId = localStorage.getItem(this.DEVICE_ID_KEY);
    if (existingId) {
      return existingId;
    }

    // Generate new device ID
    const newId = uuidv4();
    localStorage.setItem(this.DEVICE_ID_KEY, newId);
    return newId;
  }

  /**
   * Get current session ID
   */
  static getSessionId(): string | null {
    return localStorage.getItem(this.SESSION_ID_KEY);
  }

  /**
   * Register current device
   */
  static async registerDevice(userId: string, name?: string): Promise<DeviceInfo> {
    const deviceId = await this.getDeviceId();
    
    // Get device info from Capacitor
    const info = await CapacitorDevice.getInfo();
    const deviceName = name || `${info.manufacturer || ''} ${info.model || 'Unknown Device'}`.trim();

    // Check if device already exists
    const devicesRef = collection(db, 'users', userId, this.DEVICES_COLLECTION);
    const q = query(devicesRef, where('deviceId', '==', deviceId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // Update existing device
      const existingDoc = snapshot.docs[0];
      const deviceRef = doc(db, 'users', userId, this.DEVICES_COLLECTION, existingDoc.id);
      
      await updateDoc(deviceRef, {
        name: deviceName,
        platform: info.platform,
        model: info.model,
        operatingSystem: info.operatingSystem,
        osVersion: info.osVersion,
        lastActive: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        id: existingDoc.id,
        ...existingDoc.data(),
        lastActive: new Date(),
        updatedAt: new Date(),
      } as DeviceInfo;
    }

    // Create new device
    const newDevice = {
      userId,
      deviceId,
      name: deviceName,
      platform: info.platform as 'web' | 'ios' | 'android',
      model: info.model,
      operatingSystem: info.operatingSystem,
      osVersion: info.osVersion,
      appVersion: info.appVersion,
      isCurrentDevice: true,
      lastActive: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isTrusted: false,
      sessionId: '',
    };

    const docRef = await addDoc(devicesRef, newDevice);
    
    return {
      id: docRef.id,
      ...newDevice,
      lastActive: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as DeviceInfo;
  }

  /**
   * Create a new session for the device
   */
  static async createSession(userId: string, deviceId: string): Promise<DeviceSession> {
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.SESSION_DURATION);

    const session = {
      deviceId,
      userId,
      startedAt: serverTimestamp(),
      lastActivity: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
      isActive: true,
    };

    const sessionsRef = collection(db, 'users', userId, this.SESSIONS_COLLECTION);
    const docRef = await addDoc(sessionsRef, session);

    // Store session ID locally
    localStorage.setItem(this.SESSION_ID_KEY, docRef.id);

    // Update device with session ID
    const devicesRef = collection(db, 'users', userId, this.DEVICES_COLLECTION);
    const deviceQuery = query(devicesRef, where('deviceId', '==', deviceId));
    const deviceSnapshot = await getDocs(deviceQuery);
    
    if (!deviceSnapshot.empty) {
      const deviceDoc = deviceSnapshot.docs[0];
      await updateDoc(deviceDoc.ref, {
        sessionId: docRef.id,
        lastActive: serverTimestamp(),
      });
    }

    return {
      id: docRef.id,
      ...session,
      startedAt: now,
      lastActivity: now,
      expiresAt,
    } as DeviceSession;
  }

  /**
   * Update session activity
   */
  static async updateSessionActivity(userId: string, sessionId: string): Promise<void> {
    const sessionRef = doc(db, 'users', userId, this.SESSIONS_COLLECTION, sessionId);
    await updateDoc(sessionRef, {
      lastActivity: serverTimestamp(),
    });
  }

  /**
   * Get all devices for a user
   */
  static async getUserDevices(userId: string): Promise<DeviceInfo[]> {
    const devicesRef = collection(db, 'users', userId, this.DEVICES_COLLECTION);
    const q = query(devicesRef, orderBy('lastActive', 'desc'));
    const snapshot = await getDocs(q);

    const currentDeviceId = await this.getDeviceId();

    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      isCurrentDevice: doc.data().deviceId === currentDeviceId,
      lastActive: (doc.data().lastActive as Timestamp)?.toDate() || new Date(),
      createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
      updatedAt: (doc.data().updatedAt as Timestamp)?.toDate() || new Date(),
    } as DeviceInfo));
  }

  /**
   * Get active sessions for a user
   */
  static async getActiveSessions(userId: string): Promise<DeviceSession[]> {
    const sessionsRef = collection(db, 'users', userId, this.SESSIONS_COLLECTION);
    const q = query(
      sessionsRef, 
      where('isActive', '==', true),
      where('expiresAt', '>', Timestamp.now()),
      orderBy('expiresAt', 'desc'),
      orderBy('lastActivity', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      startedAt: (doc.data().startedAt as Timestamp)?.toDate() || new Date(),
      lastActivity: (doc.data().lastActivity as Timestamp)?.toDate() || new Date(),
      expiresAt: (doc.data().expiresAt as Timestamp)?.toDate() || new Date(),
    } as DeviceSession));
  }

  /**
   * Trust a device
   */
  static async trustDevice(userId: string, deviceId: string): Promise<void> {
    const devicesRef = collection(db, 'users', userId, this.DEVICES_COLLECTION);
    const q = query(devicesRef, where('id', '==', deviceId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const deviceRef = doc(db, 'users', userId, this.DEVICES_COLLECTION, snapshot.docs[0].id);
      await updateDoc(deviceRef, {
        isTrusted: true,
        updatedAt: serverTimestamp(),
      });
    }
  }

  /**
   * Remove a device
   */
  static async removeDevice(userId: string, deviceId: string): Promise<void> {
    // End all sessions for this device
    const sessionsRef = collection(db, 'users', userId, this.SESSIONS_COLLECTION);
    const sessionQuery = query(sessionsRef, where('deviceId', '==', deviceId));
    const sessionSnapshot = await getDocs(sessionQuery);

    for (const sessionDoc of sessionSnapshot.docs) {
      await updateDoc(sessionDoc.ref, {
        isActive: false,
        updatedAt: serverTimestamp(),
      });
    }

    // Remove the device
    const devicesRef = collection(db, 'users', userId, this.DEVICES_COLLECTION);
    const deviceQuery = query(devicesRef, where('deviceId', '==', deviceId));
    const deviceSnapshot = await getDocs(deviceQuery);

    for (const deviceDoc of deviceSnapshot.docs) {
      await deleteDoc(deviceDoc.ref);
    }
  }

  /**
   * End a session
   */
  static async endSession(userId: string, sessionId: string): Promise<void> {
    const sessionRef = doc(db, 'users', userId, this.SESSIONS_COLLECTION, sessionId);
    await updateDoc(sessionRef, {
      isActive: false,
      updatedAt: serverTimestamp(),
    });

    // Clear local session if it matches
    const currentSessionId = this.getSessionId();
    if (currentSessionId === sessionId) {
      localStorage.removeItem(this.SESSION_ID_KEY);
    }
  }

  /**
   * Check if current device is trusted
   */
  static async isCurrentDeviceTrusted(userId: string): Promise<boolean> {
    const deviceId = await this.getDeviceId();
    const devicesRef = collection(db, 'users', userId, this.DEVICES_COLLECTION);
    const q = query(devicesRef, where('deviceId', '==', deviceId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return snapshot.docs[0].data().isTrusted || false;
    }

    return false;
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(userId: string): Promise<void> {
    const sessionsRef = collection(db, 'users', userId, this.SESSIONS_COLLECTION);
    const q = query(
      sessionsRef,
      where('expiresAt', '<', Timestamp.now())
    );
    const snapshot = await getDocs(q);

    for (const sessionDoc of snapshot.docs) {
      await updateDoc(sessionDoc.ref, {
        isActive: false,
        updatedAt: serverTimestamp(),
      });
    }
  }
}