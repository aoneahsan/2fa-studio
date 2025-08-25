/**
 * Advanced Sync Conflict Resolution Component
 * Provides UI for resolving sync conflicts between devices with detailed comparison
 */

import React, { useState, useEffect } from 'react';
import {
  AdvancedSyncService,
  SyncConflict,
} from '@src/services/advanced-sync.service';
import { Button } from '@src/components/ui/button';
import { Card } from '@src/components/ui/card';
import { Badge } from '@src/components/common/Badge';
import { ConfirmationDialog } from '@src/components/common/ConfirmationDialog';
import { CloudIcon, DevicePhoneMobileIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface SyncConflictResolverProps {
  conflicts?: SyncConflict[];
  onConflictResolved?: (conflictId: string, resolution: 'local' | 'remote' | 'merge') => void;
  className?: string;
}

export const SyncConflictResolver: React.FC<SyncConflictResolverProps> = ({
  conflicts: propConflicts,
  onConflictResolved,
  className = '',
}) => {
  const [conflicts, setConflicts] = useState<SyncConflict[]>(
    propConflicts || AdvancedSyncService.getUnresolvedConflicts()
  );
  const [selectedConflict, setSelectedConflict] = useState<SyncConflict | null>(null);
  const [resolutionType, setResolutionType] = useState<'local' | 'remote' | 'merge' | null>(null);
  const [customMergeData, setCustomMergeData] = useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (!propConflicts) {
      // Subscribe to conflict updates
      const unsubscribe = AdvancedSyncService.onSyncEvent('conflict_detected', () => {
        setConflicts(AdvancedSyncService.getUnresolvedConflicts());
      });

      const resolveUnsubscribe = AdvancedSyncService.onSyncEvent('conflict_resolved', () => {
        setConflicts(AdvancedSyncService.getUnresolvedConflicts());
      });

      return () => {
        unsubscribe();
        resolveUnsubscribe();
      };
    }
  }, [propConflicts]);

  useEffect(() => {
    if (propConflicts) {
      setConflicts(propConflicts);
    }
  }, [propConflicts]);

  const handleResolveConflict = (
    conflict: SyncConflict,
    resolution: 'local' | 'remote' | 'merge'
  ) => {
    setSelectedConflict(conflict);
    setResolutionType(resolution);
    
    if (resolution === 'merge') {
      // For merge, prepare initial merged data
      const merged = mergeConflictData(conflict);
      setCustomMergeData(merged);
    }
    
    setShowConfirmDialog(true);
  };

  const confirmResolution = async () => {
    if (!selectedConflict || !resolutionType) return;

    setIsResolving(true);
    try {
      await AdvancedSyncService.resolveConflict(
        selectedConflict.id,
        resolutionType,
        resolutionType === 'merge' ? customMergeData : undefined
      );

      // Update local conflicts list
      setConflicts(prev => prev.filter(c => c.id !== selectedConflict.id));
      
      if (onConflictResolved) {
        onConflictResolved(selectedConflict.id, resolutionType);
      }
    } catch (error) {
      console.error('Error resolving conflict:', error);
    } finally {
      setIsResolving(false);
      setShowConfirmDialog(false);
      setSelectedConflict(null);
      setResolutionType(null);
      setCustomMergeData(null);
    }
  };

  const mergeConflictData = (conflict: SyncConflict): any => {
    const { localData, remoteData } = conflict;
    
    switch (conflict.type) {
      case 'account':
        return {
          ...remoteData,
          label: remoteData.label || localData.label,
          issuer: remoteData.issuer || localData.issuer,
          notes: remoteData.notes || localData.notes,
          tags: [...new Set([...(localData.tags || []), ...(remoteData.tags || [])])],
          isFavorite: localData.isFavorite || remoteData.isFavorite,
          category: remoteData.category || localData.category,
          updatedAt: new Date(),
        };
      
      case 'folder':
        return {
          ...remoteData,
          name: remoteData.name || localData.name,
          description: remoteData.description || localData.description,
          accountIds: [...new Set([...(localData.accountIds || []), ...(remoteData.accountIds || [])])],
          updatedAt: new Date(),
        };
      
      case 'tag':
        return {
          ...remoteData,
          name: remoteData.name || localData.name,
          color: remoteData.color || localData.color,
          accountIds: [...new Set([...(localData.accountIds || []), ...(remoteData.accountIds || [])])],
          updatedAt: new Date(),
        };
      
      default:
        return { ...remoteData, ...localData, updatedAt: new Date() };
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString();
  };

  const formatDataDifferences = (local: any, remote: any) => {
    const differences = [];
    const allKeys = new Set([...Object.keys(local), ...Object.keys(remote)]);
    
    for (const key of allKeys) {
      if (key === 'updatedAt' || key === 'createdAt') continue;
      
      const localValue = local[key];
      const remoteValue = remote[key];
      
      if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
        differences.push({
          field: key,
          local: localValue,
          remote: remoteValue,
        });
      }
    }
    
    return differences;
  };

  const renderFieldValue = (value: any) => {
    if (value === null || value === undefined) return <span className="text-gray-400">null</span>;
    if (typeof value === 'boolean') return value.toString();
    if (Array.isArray(value)) return `[${value.join(', ')}]`;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  if (conflicts.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 dark:text-gray-400 ${className}`}>
        <div className="text-lg font-medium mb-2">No Conflicts</div>
        <div className="text-sm">All changes have been synchronized successfully.</div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Sync Conflicts ({conflicts.length})
        </h3>
        <Badge variant="destructive">
          Action Required
        </Badge>
      </div>

      {conflicts.map((conflict) => {
        const differences = formatDataDifferences(conflict.localData, conflict.remoteData);
        
        return (
          <Card key={conflict.id} className="p-6">
            <div className="space-y-4">
              {/* Conflict Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                    {conflict.type.charAt(0).toUpperCase() + conflict.type.slice(1)} Conflict
                  </h4>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Entity ID: {conflict.entityId}
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">
                  {conflict.type}
                </Badge>
              </div>

              {/* Conflict Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Local Version */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-blue-600 dark:text-blue-400">
                      <DevicePhoneMobileIcon className="w-4 h-4 inline mr-1" />
                      Local Version (This Device)
                    </h5>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimestamp(conflict.localTimestamp)}
                    </div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    {differences.map((diff, index) => (
                      <div key={index} className="mb-2 last:mb-0">
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {diff.field}:
                        </div>
                        <div className="text-sm text-gray-900 dark:text-gray-100 break-words">
                          {renderFieldValue(diff.local)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Remote Version */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-green-600 dark:text-green-400">
                      <CloudIcon className="w-4 h-4 inline mr-1" />
                      Remote Version (Other Device)
                    </h5>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimestamp(conflict.remoteTimestamp)}
                    </div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    {differences.map((diff, index) => (
                      <div key={index} className="mb-2 last:mb-0">
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {diff.field}:
                        </div>
                        <div className="text-sm text-gray-900 dark:text-gray-100 break-words">
                          {renderFieldValue(diff.remote)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Differences Summary */}
              {differences.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                    <ExclamationTriangleIcon className="w-4 h-4 inline mr-1" />
                    Fields with conflicts ({differences.length}):
                  </div>
                  <div className="text-xs text-yellow-700 dark:text-yellow-300">
                    {differences.map(d => d.field).join(', ')}
                  </div>
                </div>
              )}

              {/* Resolution Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResolveConflict(conflict, 'local')}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  Keep Local Version
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResolveConflict(conflict, 'remote')}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  Keep Remote Version
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResolveConflict(conflict, 'merge')}
                  className="text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  Merge Both Versions
                </Button>
              </div>
            </div>
          </Card>
        );
      })}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmDialog}
        title="Resolve Sync Conflict"
        message={
          selectedConflict && resolutionType
            ? `Are you sure you want to resolve this ${selectedConflict.type} conflict using the ${resolutionType} version? This action cannot be undone.`
            : ''
        }
        confirmText={isResolving ? 'Resolving...' : 'Resolve Conflict'}
        cancelText="Cancel"
        onConfirm={confirmResolution}
        onCancel={() => setShowConfirmDialog(false)}
        isDestructive={false}
        isLoading={isResolving}
      />
    </div>
  );
};