/**
 * Offline Queue Management Service
 * Handles queuing and processing of operations when offline with priority handling and retry mechanisms
 * @module services/offline-queue
 */

import { MobileEncryptionService } from './mobile-encryption.service';
import { UnifiedTrackingService } from './unified-tracking.service';

export type QueueOperationType = 
  | 'account_create' | 'account_update' | 'account_delete'
  | 'folder_create' | 'folder_update' | 'folder_delete'
  | 'tag_create' | 'tag_update' | 'tag_delete'
  | 'settings_update' | 'backup_create' | 'sync_event';

export interface QueuedOperation {
  id: string;
  type: QueueOperationType;
  data: any;
  userId: string;
  deviceId: string;
  timestamp: Date;
  priority: number; // 0 = highest, higher numbers = lower priority
  retryCount: number;
  maxRetries: number;
  lastAttempt?: Date;
  failureReason?: string;
  dependencies?: string[]; // IDs of operations that must complete first
  expiresAt?: Date; // When the operation should be discarded
  metadata?: {
    size: number;
    compressed: boolean;
    encrypted: boolean;
    category: 'critical' | 'important' | 'normal' | 'low';
  };
}

export interface QueueStatus {
  totalOperations: number;
  pendingOperations: number;
  processingOperations: number;
  completedOperations: number;
  failedOperations: number;
  retryingOperations: number;
  queueSize: number; // in bytes
  oldestOperation?: Date;
  averageProcessingTime: number;
  successRate: number;
}

export interface QueueConfig {
  maxQueueSize: number; // Maximum operations in queue
  maxQueueSizeBytes: number; // Maximum queue size in bytes
  maxRetries: number;
  retryDelayMs: number;
  maxRetryDelayMs: number;
  batchSize: number;
  priorityLevels: {
    [key in QueueOperationType]: number;
  };
  retentionDays: number;
  enableCompression: boolean;
  enableEncryption: boolean;
  processingConcurrency: number;
}

const PROJECT_PREFIX = 'fa2s_';

export class OfflineQueueService {
  private static readonly QUEUE_KEY = `${PROJECT_PREFIX}offline_queue`;
  private static readonly CONFIG_KEY = `${PROJECT_PREFIX}queue_config`;
  private static readonly STATUS_KEY = `${PROJECT_PREFIX}queue_status`;
  private static readonly PROCESSING_KEY = `${PROJECT_PREFIX}processing_operations`;

  private static queue: QueuedOperation[] = [];
  private static processingOperations: Set<string> = new Set();
  private static isProcessing = false;
  private static config: QueueConfig = {
    maxQueueSize: 1000,
    maxQueueSizeBytes: 50 * 1024 * 1024, // 50MB
    maxRetries: 3,
    retryDelayMs: 1000,
    maxRetryDelayMs: 60000,
    batchSize: 10,
    priorityLevels: {
      account_create: 1,
      account_update: 2,
      account_delete: 1,
      folder_create: 3,
      folder_update: 4,
      folder_delete: 2,
      tag_create: 4,
      tag_update: 5,
      tag_delete: 3,
      settings_update: 2,
      backup_create: 1,
      sync_event: 3,
    },
    retentionDays: 7,
    enableCompression: true,
    enableEncryption: true,
    processingConcurrency: 3,
  };
  private static status: QueueStatus = {
    totalOperations: 0,
    pendingOperations: 0,
    processingOperations: 0,
    completedOperations: 0,
    failedOperations: 0,
    retryingOperations: 0,
    queueSize: 0,
    averageProcessingTime: 0,
    successRate: 100,
  };
  private static eventHandlers: Map<string, ((operation: QueuedOperation) => void)[]> = new Map();

  /**
   * Initialize the offline queue service
   */
  static async initialize(): Promise<void> {
    try {
      await this.loadQueue();
      await this.loadConfig();
      await this.loadStatus();
      
      // Clean up expired operations
      await this.cleanupExpiredOperations();
      
      // Start processing if online
      if (navigator.onLine) {
        this.startProcessing();
      }

      // Listen for online/offline events
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));

      console.log('OfflineQueueService initialized', {
        queueSize: this.queue.length,
        config: this.config,
      });

      await UnifiedTrackingService.track('offline_queue_initialized', {
        queueSize: this.queue.length,
        totalOperations: this.status.totalOperations,
      });
    } catch (error) {
      console.error('Error initializing offline queue service:', error);
    }
  }

  /**
   * Add operation to queue
   */
  static async addOperation(
    type: QueueOperationType,
    data: any,
    userId: string,
    deviceId: string,
    options: {
      priority?: number;
      dependencies?: string[];
      expiresAt?: Date;
      category?: 'critical' | 'important' | 'normal' | 'low';
    } = {}
  ): Promise<string> {
    // Check queue size limits
    if (this.queue.length >= this.config.maxQueueSize) {
      await this.enforceQueueSizeLimit();
    }

    const operationId = crypto.randomUUID();
    const priority = options.priority ?? this.config.priorityLevels[type];
    const category = options.category ?? this.getCategoryFromType(type);

    // Prepare data
    let processedData = data;
    let compressed = false;
    let encrypted = false;
    let size = JSON.stringify(data).length;

    // Compress if enabled and data is large enough
    if (this.config.enableCompression && size > 1024) {
      try {
        processedData = await this.compressData(data);
        compressed = true;
        size = JSON.stringify(processedData).length;
      } catch (error) {
        console.warn('Compression failed:', error);
      }
    }

    // Encrypt if enabled
    if (this.config.enableEncryption) {
      try {
        processedData = await this.encryptData(processedData);
        encrypted = true;
        size = JSON.stringify(processedData).length;
      } catch (error) {
        console.warn('Encryption failed:', error);
      }
    }

    const operation: QueuedOperation = {
      id: operationId,
      type,
      data: processedData,
      userId,
      deviceId,
      timestamp: new Date(),
      priority,
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      dependencies: options.dependencies || [],
      expiresAt: options.expiresAt,
      metadata: {
        size,
        compressed,
        encrypted,
        category,
      },
    };

    this.queue.push(operation);
    this.sortQueue();
    
    this.status.totalOperations++;
    this.status.pendingOperations++;
    this.status.queueSize += size;

    await this.saveQueue();
    await this.saveStatus();

    // Emit event
    this.emitEvent('operation_added', operation);

    // Try to process if online
    if (navigator.onLine && !this.isProcessing) {
      this.startProcessing();
    }

    await UnifiedTrackingService.track('offline_operation_queued', {
      operationType: type,
      priority,
      category,
      queueSize: this.queue.length,
    });

    return operationId;
  }

  /**
   * Remove operation from queue
   */
  static async removeOperation(operationId: string): Promise<boolean> {
    const index = this.queue.findIndex(op => op.id === operationId);
    if (index === -1) return false;

    const operation = this.queue[index];
    this.queue.splice(index, 1);
    
    this.status.pendingOperations = Math.max(0, this.status.pendingOperations - 1);
    this.status.queueSize = Math.max(0, this.status.queueSize - (operation.metadata?.size || 0));

    await this.saveQueue();
    await this.saveStatus();
    
    this.emitEvent('operation_removed', operation);
    return true;
  }

  /**
   * Get operation by ID
   */
  static getOperation(operationId: string): QueuedOperation | null {
    return this.queue.find(op => op.id === operationId) || null;
  }

  /**
   * Get operations by type
   */
  static getOperationsByType(type: QueueOperationType): QueuedOperation[] {
    return this.queue.filter(op => op.type === type);
  }

  /**
   * Get operations by priority
   */
  static getOperationsByPriority(priority: number): QueuedOperation[] {
    return this.queue.filter(op => op.priority === priority);
  }

  /**
   * Get operations by category
   */
  static getOperationsByCategory(category: 'critical' | 'important' | 'normal' | 'low'): QueuedOperation[] {
    return this.queue.filter(op => op.metadata?.category === category);
  }

  /**
   * Get all pending operations
   */
  static getPendingOperations(): QueuedOperation[] {
    return this.queue.filter(op => !this.processingOperations.has(op.id));
  }

  /**
   * Get processing operations
   */
  static getProcessingOperations(): QueuedOperation[] {
    return this.queue.filter(op => this.processingOperations.has(op.id));
  }

  /**
   * Get failed operations (exceeded max retries)
   */
  static getFailedOperations(): QueuedOperation[] {
    return this.queue.filter(op => op.retryCount >= op.maxRetries);
  }

  /**
   * Get queue status
   */
  static getQueueStatus(): QueueStatus {
    return { ...this.status };
  }

  /**
   * Update queue configuration
   */
  static updateConfig(updates: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...updates };
    localStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.config));
  }

  /**
   * Clear all operations
   */
  static async clearQueue(): Promise<void> {
    const clearedCount = this.queue.length;
    this.queue = [];
    this.processingOperations.clear();
    
    this.status.pendingOperations = 0;
    this.status.processingOperations = 0;
    this.status.queueSize = 0;

    await this.saveQueue();
    await this.saveStatus();

    await UnifiedTrackingService.track('offline_queue_cleared', {
      clearedOperations: clearedCount,
    });
  }

  /**
   * Retry failed operation
   */
  static async retryOperation(operationId: string): Promise<boolean> {
    const operation = this.getOperation(operationId);
    if (!operation) return false;

    operation.retryCount = 0;
    operation.lastAttempt = undefined;
    operation.failureReason = undefined;

    await this.saveQueue();
    
    // Try to process if online
    if (navigator.onLine && !this.isProcessing) {
      this.startProcessing();
    }

    this.emitEvent('operation_retried', operation);
    return true;
  }

  /**
   * Process operations (when online)
   */
  private static async startProcessing(): Promise<void> {
    if (this.isProcessing || !navigator.onLine) return;

    this.isProcessing = true;
    
    try {
      const pendingOps = this.getPendingOperations()
        .filter(op => this.canProcessOperation(op))
        .slice(0, this.config.batchSize);

      if (pendingOps.length === 0) {
        this.isProcessing = false;
        return;
      }

      // Process operations with concurrency limit
      const processingPromises = [];
      const concurrentOps = pendingOps.slice(0, this.config.processingConcurrency);

      for (const operation of concurrentOps) {
        processingPromises.push(this.processOperation(operation));
      }

      await Promise.allSettled(processingPromises);

      // Continue processing if more operations are available
      if (this.getPendingOperations().length > 0) {
        setTimeout(() => this.startProcessing(), 100);
      } else {
        this.isProcessing = false;
      }
    } catch (error) {
      console.error('Error processing operations:', error);
      this.isProcessing = false;
    }
  }

  /**
   * Process a single operation
   */
  private static async processOperation(operation: QueuedOperation): Promise<void> {
    if (this.processingOperations.has(operation.id)) return;

    const startTime = Date.now();
    this.processingOperations.add(operation.id);
    this.status.processingOperations++;

    try {
      // Decrypt and decompress data if needed
      let processedData = operation.data;
      
      if (operation.metadata?.encrypted) {
        processedData = await this.decryptData(processedData);
      }
      
      if (operation.metadata?.compressed) {
        processedData = await this.decompressData(processedData);
      }

      // Process the operation based on its type
      await this.executeOperation(operation.type, processedData, operation);

      // Operation successful - remove from queue
      await this.removeOperation(operation.id);
      
      const processingTime = Date.now() - startTime;
      this.updateAverageProcessingTime(processingTime);
      
      this.status.completedOperations++;
      this.updateSuccessRate();

      this.emitEvent('operation_completed', operation);

      await UnifiedTrackingService.track('offline_operation_processed', {
        operationType: operation.type,
        processingTime,
        retryCount: operation.retryCount,
      });

    } catch (error) {
      operation.retryCount++;
      operation.lastAttempt = new Date();
      operation.failureReason = error instanceof Error ? error.message : String(error);

      console.error(`Operation ${operation.id} failed:`, error);

      if (operation.retryCount >= operation.maxRetries) {
        this.status.failedOperations++;
        this.emitEvent('operation_failed', operation);
        
        await UnifiedTrackingService.track('offline_operation_failed', {
          operationType: operation.type,
          retryCount: operation.retryCount,
          error: operation.failureReason,
        });
      } else {
        this.status.retryingOperations++;
        this.emitEvent('operation_retry_scheduled', operation);
      }

      this.updateSuccessRate();
      await this.saveQueue();
    } finally {
      this.processingOperations.delete(operation.id);
      this.status.processingOperations = Math.max(0, this.status.processingOperations - 1);
      await this.saveStatus();
    }
  }

  /**
   * Execute operation based on type
   */
  private static async executeOperation(
    type: QueueOperationType,
    data: any,
    operation: QueuedOperation
  ): Promise<void> {
    // This would integrate with your actual sync/API services
    // For now, we'll simulate the processing
    console.log(`Executing ${type} operation:`, { id: operation.id, data });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

    // Simulate occasional failures for testing
    if (Math.random() < 0.1) { // 10% failure rate for testing
      throw new Error(`Simulated network error for ${type}`);
    }
  }

  /**
   * Check if operation can be processed (dependencies met, not expired, etc.)
   */
  private static canProcessOperation(operation: QueuedOperation): boolean {
    // Check if expired
    if (operation.expiresAt && operation.expiresAt < new Date()) {
      this.removeOperation(operation.id);
      return false;
    }

    // Check if max retries exceeded
    if (operation.retryCount >= operation.maxRetries) {
      return false;
    }

    // Check retry delay
    if (operation.lastAttempt) {
      const retryDelay = Math.min(
        this.config.retryDelayMs * Math.pow(2, operation.retryCount),
        this.config.maxRetryDelayMs
      );
      if (Date.now() - operation.lastAttempt.getTime() < retryDelay) {
        return false;
      }
    }

    // Check dependencies
    if (operation.dependencies && operation.dependencies.length > 0) {
      for (const depId of operation.dependencies) {
        if (this.getOperation(depId)) {
          return false; // Dependency still in queue
        }
      }
    }

    return true;
  }

  /**
   * Sort queue by priority and timestamp
   */
  private static sortQueue(): void {
    this.queue.sort((a, b) => {
      // First by priority (lower number = higher priority)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Then by timestamp (older first)
      return a.timestamp.getTime() - b.timestamp.getTime();
    });
  }

  /**
   * Enforce queue size limits
   */
  private static async enforceQueueSizeLimit(): Promise<void> {
    // Remove oldest low-priority operations
    const lowPriorityOps = this.queue
      .filter(op => op.priority > 3 && !this.processingOperations.has(op.id))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    let removedCount = 0;
    while (this.queue.length >= this.config.maxQueueSize && lowPriorityOps.length > removedCount) {
      await this.removeOperation(lowPriorityOps[removedCount].id);
      removedCount++;
    }

    // If still over limit, remove by size
    if (this.status.queueSize >= this.config.maxQueueSizeBytes) {
      const largeOps = this.queue
        .filter(op => !this.processingOperations.has(op.id))
        .sort((a, b) => (b.metadata?.size || 0) - (a.metadata?.size || 0));

      for (const op of largeOps) {
        if (this.status.queueSize < this.config.maxQueueSizeBytes) break;
        await this.removeOperation(op.id);
      }
    }
  }

  /**
   * Clean up expired operations
   */
  private static async cleanupExpiredOperations(): Promise<void> {
    const now = new Date();
    const retentionCutoff = new Date(now.getTime() - this.config.retentionDays * 24 * 60 * 60 * 1000);

    const expiredOps = this.queue.filter(op => 
      (op.expiresAt && op.expiresAt < now) ||
      (op.timestamp < retentionCutoff && op.retryCount >= op.maxRetries)
    );

    for (const op of expiredOps) {
      await this.removeOperation(op.id);
    }

    if (expiredOps.length > 0) {
      await UnifiedTrackingService.track('offline_operations_expired', {
        expiredCount: expiredOps.length,
      });
    }
  }

  /**
   * Get category from operation type
   */
  private static getCategoryFromType(type: QueueOperationType): 'critical' | 'important' | 'normal' | 'low' {
    switch (type) {
      case 'account_create':
      case 'account_delete':
      case 'backup_create':
        return 'critical';
      case 'account_update':
      case 'settings_update':
        return 'important';
      case 'folder_create':
      case 'folder_update':
      case 'sync_event':
        return 'normal';
      default:
        return 'low';
    }
  }

  /**
   * Update average processing time
   */
  private static updateAverageProcessingTime(newTime: number): void {
    const completedCount = this.status.completedOperations;
    this.status.averageProcessingTime = 
      (this.status.averageProcessingTime * (completedCount - 1) + newTime) / completedCount;
  }

  /**
   * Update success rate
   */
  private static updateSuccessRate(): void {
    const total = this.status.completedOperations + this.status.failedOperations;
    if (total === 0) {
      this.status.successRate = 100;
    } else {
      this.status.successRate = (this.status.completedOperations / total) * 100;
    }
  }

  /**
   * Handle online event
   */
  private static handleOnline(): void {
    console.log('Device came online - starting queue processing');
    this.startProcessing();
  }

  /**
   * Handle offline event
   */
  private static handleOffline(): void {
    console.log('Device went offline - queue processing will resume when online');
    this.isProcessing = false;
  }

  /**
   * Compress data
   */
  private static async compressData(data: any): Promise<string> {
    // Simple compression using built-in compression if available
    const jsonStr = JSON.stringify(data);
    
    if ('CompressionStream' in window) {
      try {
        const stream = new CompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(new TextEncoder().encode(jsonStr));
        writer.close();
        
        const chunks = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) chunks.push(value);
        }
        
        const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          compressed.set(chunk, offset);
          offset += chunk.length;
        }
        
        return btoa(String.fromCharCode(...compressed));
      } catch (error) {
        console.warn('Compression failed, using uncompressed data:', error);
      }
    }
    
    return jsonStr;
  }

  /**
   * Decompress data
   */
  private static async decompressData(compressedData: string): Promise<any> {
    if ('DecompressionStream' in window) {
      try {
        const compressed = Uint8Array.from(atob(compressedData), c => c.charCodeAt(0));
        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(compressed);
        writer.close();
        
        const chunks = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) chunks.push(value);
        }
        
        const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          decompressed.set(chunk, offset);
          offset += chunk.length;
        }
        
        const jsonStr = new TextDecoder().decode(decompressed);
        return JSON.parse(jsonStr);
      } catch (error) {
        console.error('Decompression failed:', error);
      }
    }
    
    return JSON.parse(compressedData);
  }

  /**
   * Encrypt data
   */
  private static async encryptData(data: any): Promise<string> {
    const jsonStr = JSON.stringify(data);
    return await MobileEncryptionService.encrypt(jsonStr);
  }

  /**
   * Decrypt data
   */
  private static async decryptData(encryptedData: string): Promise<any> {
    const jsonStr = await MobileEncryptionService.decrypt(encryptedData);
    return JSON.parse(jsonStr);
  }

  /**
   * Event management
   */
  static addEventListener(
    event: 'operation_added' | 'operation_removed' | 'operation_completed' | 'operation_failed' | 'operation_retry_scheduled' | 'operation_retried',
    handler: (operation: QueuedOperation) => void
  ): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    
    this.eventHandlers.get(event)!.push(handler);
    
    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  private static emitEvent(event: string, operation: QueuedOperation): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(operation);
      } catch (error) {
        console.error('Event handler error:', error);
      }
    });
  }

  /**
   * Storage operations
   */
  private static async loadQueue(): Promise<void> {
    try {
      const queueStr = localStorage.getItem(this.QUEUE_KEY);
      if (queueStr) {
        const savedQueue = JSON.parse(queueStr);
        this.queue = savedQueue.map((op: any) => ({
          ...op,
          timestamp: new Date(op.timestamp),
          lastAttempt: op.lastAttempt ? new Date(op.lastAttempt) : undefined,
          expiresAt: op.expiresAt ? new Date(op.expiresAt) : undefined,
        }));
        this.sortQueue();
      }
    } catch (error) {
      console.error('Error loading queue:', error);
      this.queue = [];
    }
  }

  private static async saveQueue(): Promise<void> {
    try {
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Error saving queue:', error);
    }
  }

  private static loadConfig(): void {
    try {
      const configStr = localStorage.getItem(this.CONFIG_KEY);
      if (configStr) {
        const savedConfig = JSON.parse(configStr);
        this.config = { ...this.config, ...savedConfig };
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  }

  private static loadStatus(): void {
    try {
      const statusStr = localStorage.getItem(this.STATUS_KEY);
      if (statusStr) {
        const savedStatus = JSON.parse(statusStr);
        this.status = {
          ...this.status,
          ...savedStatus,
          oldestOperation: savedStatus.oldestOperation ? new Date(savedStatus.oldestOperation) : undefined,
        };
      }
    } catch (error) {
      console.error('Error loading status:', error);
    }
  }

  private static async saveStatus(): Promise<void> {
    try {
      // Update calculated fields
      this.status.pendingOperations = this.getPendingOperations().length;
      this.status.processingOperations = this.processingOperations.size;
      
      const oldestOp = this.queue.reduce((oldest, op) => 
        !oldest || op.timestamp < oldest.timestamp ? op : oldest, null as QueuedOperation | null);
      this.status.oldestOperation = oldestOp?.timestamp;
      
      localStorage.setItem(this.STATUS_KEY, JSON.stringify(this.status));
    } catch (error) {
      console.error('Error saving status:', error);
    }
  }

  /**
   * Cleanup and shutdown
   */
  static cleanup(): void {
    this.isProcessing = false;
    this.processingOperations.clear();
    this.eventHandlers.clear();
    
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
  }
}