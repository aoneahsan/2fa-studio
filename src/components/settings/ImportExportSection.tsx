/**
 * Import/Export Section Component
 * @module components/settings/ImportExportSection
 */

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { ArrowUpTrayIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useAppSelector } from '@hooks/useAppSelector';
import { selectAllAccounts } from '@store/slices/accountsSlice';
import { addToast, openModal } from '@store/slices/uiSlice';
import { ImportExportService } from '@services/import-export.service';
import { useAccounts } from '@hooks/useAccounts';

export const ImportExportSection: React.FC = () => {
  const dispatch = useDispatch();
  const accounts = useAppSelector(selectAllAccounts);
  const { addAccount } = useAccounts();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExportJSON = async (encrypted: boolean = false) => {
    setIsExporting(true);

    try {
      if (encrypted) {
        dispatch(openModal({
          type: 'exportPassword',
          data: { accounts }
        }) as any);
      } else {
        const json = await ImportExportService.exportToJSON(accounts);
        const filename = `2fa-studio-backup-${new Date().toISOString().split('T')[0]}.json`;
        ImportExportService.downloadFile(json, filename, 'application/json');
        
        dispatch(addToast({
          type: 'success',
          message: 'Accounts exported successfully'
        }) as any);
      }
    } catch (error) {
      console.error('Export error:', error);
      dispatch(addToast({
        type: 'error',
        message: 'Failed to export accounts'
      }) as any);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    try {
      const csv = ImportExportService.exportToCSV(accounts);
      const filename = `2fa-studio-backup-${new Date().toISOString().split('T')[0]}.csv`;
      ImportExportService.downloadFile(csv, filename, 'text/csv');
      
      dispatch(addToast({
        type: 'success',
        message: 'Accounts exported to CSV'
      }) as any);
    } catch (error) {
      console.error('Export error:', error);
      dispatch(addToast({
        type: 'error',
        message: 'Failed to export accounts'
      }) as any);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsImporting(true);

      try {
        const content = await file.text();
        
        // Check if encrypted
        let data: any;
        try {
          data = JSON.parse(content);
        } catch {
          throw new Error('Invalid file format');
        }

        if (data.encrypted) {
          // Open password modal
          dispatch(openModal({
            type: 'importPassword',
            data: { content }
          }) as any);
        } else {
          // Import directly
          const importedAccounts = await ImportExportService.importFromJSON(content);
          
          // Add accounts
          for (const account of importedAccounts) {
            await addAccount(account);
          }

          dispatch(addToast({
            type: 'success',
            message: `Imported ${importedAccounts.length} accounts`
          }) as any);
        }
      } catch (error: any) {
        console.error('Import error:', error);
        dispatch(addToast({
          type: 'error',
          message: error.message || 'Failed to import accounts'
        }) as any);
      } finally {
        setIsImporting(false);
      }
    };

    input.click();
  };

  return (
    <div className="bg-card rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Import & Export</h3>
      
      <div className="space-y-3">
        {/* Export Options */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Export Accounts</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleExportJSON(false)}
              disabled={isExporting || accounts.length === 0}
              className="flex items-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowUpTrayIcon className="w-4 h-4" />
              Export as JSON
            </button>
            
            <button
              onClick={() => handleExportJSON(true)}
              disabled={isExporting || accounts.length === 0}
              className="flex items-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowUpTrayIcon className="w-4 h-4" />
              Export Encrypted
            </button>
            
            <button
              onClick={handleExportCSV}
              disabled={accounts.length === 0}
              className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowUpTrayIcon className="w-4 h-4" />
              Export as CSV
            </button>
          </div>
        </div>

        {/* Import Option */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Import Accounts</h4>
          <button
            onClick={handleImport}
            disabled={isImporting}
            className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            {isImporting ? 'Importing...' : 'Import from JSON'}
          </button>
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• JSON format preserves all account details</p>
          <p>• CSV format is compatible with spreadsheet apps</p>
          <p>• Encrypted exports require a password</p>
        </div>
      </div>
    </div>
  );
};