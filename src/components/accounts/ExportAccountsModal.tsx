import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, DocumentArrowDownIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { ImportExportService, ExportFormat } from '@services/importExport.service';
import { useAppSelector } from '@hooks/useAppSelector';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { showToast } from '@store/slices/uiSlice';
import { selectAllAccounts } from '@store/slices/accountsSlice';

interface ExportAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportAccountsModal({ isOpen, onClose }: ExportAccountsModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [useEncryption, setUseEncryption] = useState(true);
  const accounts = useAppSelector(selectAllAccounts);
  const dispatch = useAppDispatch();

  const formats: { value: ExportFormat; label: string; supportsEncryption: boolean }[] = [
    { value: 'json', label: '2FA Studio JSON', supportsEncryption: true },
    { value: 'google_authenticator', label: 'Google Authenticator', supportsEncryption: false },
    { value: 'authy', label: 'Authy', supportsEncryption: false },
    { value: '2fas', label: '2FAS', supportsEncryption: false },
    { value: 'aegis', label: 'Aegis', supportsEncryption: false },
    { value: 'raivo', label: 'Raivo OTP', supportsEncryption: false },
  ];

  const handleFormatChange = (format: ExportFormat) => {
    setSelectedFormat(format);
    const selectedFormatInfo = formats.find((f: any) => f.value === format);
    if (!selectedFormatInfo?.supportsEncryption) {
      setUseEncryption(false);
    }
  };

  const handleExport = async () => {
    if (accounts.length === 0) {
      dispatch(showToast({ message: 'No accounts to export', type: 'warning' }) as any);
      return;
    }

    if (useEncryption) {
      if (!password) {
        dispatch(showToast({ message: 'Please enter a password', type: 'error' }) as any);
        return;
      }
      if (password !== confirmPassword) {
        dispatch(showToast({ message: 'Passwords do not match', type: 'error' }) as any);
        return;
      }
      if (password.length < 8) {
        dispatch(showToast({ message: 'Password must be at least 8 characters', type: 'error' }) as any);
        return;
      }
    }

    setIsExporting(true);
    try {
      const exportData = await ImportExportService.exportAccounts(
        accounts,
        selectedFormat,
        useEncryption ? password : undefined
      );

      // Create and download file
      const blob = new Blob([exportData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      const extension = selectedFormat === 'json' ? 'json' : 'txt';
      a.href = url;
      a.download = `2fa-studio-export-${timestamp}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      dispatch(showToast({ 
        message: `Successfully exported ${accounts.length} accounts`, 
        type: 'success' 
      }) as any);
      
      // Reset form and close modal
      setPassword('');
      setConfirmPassword('');
      onClose();
    } catch (error) {
      dispatch(showToast({ 
        message: error instanceof Error ? error.message : 'Failed to export accounts', 
        type: 'error' 
      }) as any);
    } finally {
      setIsExporting(false);
    }
  };

  const currentFormat = formats.find((f: any) => f.value === selectedFormat);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full rounded-lg bg-white dark:bg-gray-800 shadow-xl">
          <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
              Export Accounts
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Export Summary */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <DocumentArrowDownIcon className="h-8 w-8 text-indigo-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {accounts.length} accounts will be exported
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    All your 2FA accounts will be included in the export
                  </p>
                </div>
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Export Format
              </label>
              <select
                value={selectedFormat}
                onChange={(e) => handleFormatChange(e.target.value as ExportFormat)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {formats.map((format) => (
                  <option key={format.value} value={format.value}>
                    {format.label}
                  </option>
                ))}
              </select>
              {!currentFormat?.supportsEncryption && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  This format does not support encryption. Your accounts will be exported in plain text.
                </p>
              )}
            </div>

            {/* Encryption Option */}
            {currentFormat?.supportsEncryption && (
              <div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={useEncryption}
                    onChange={(e) => setUseEncryption(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 rounded border-gray-300 
                             focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Encrypt export file
                  </span>
                </label>
                <p className="mt-1 ml-7 text-xs text-gray-500 dark:text-gray-400">
                  Protect your export with a password
                </p>
              </div>
            )}

            {/* Password Fields */}
            {useEncryption && currentFormat?.supportsEncryption && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Encryption Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             placeholder-gray-400 dark:placeholder-gray-500
                             focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             placeholder-gray-400 dark:placeholder-gray-500
                             focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 
                              dark:border-amber-800 rounded-lg p-3">
                  <div className="flex gap-2">
                    <ShieldCheckIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 
                                              flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Remember this password
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        You'll need it to import this file later. Store it securely!
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 p-6 border-t dark:border-gray-700">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 
                       dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 
                       rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || accounts.length === 0}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg 
                       hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed 
                       transition-colors"
            >
              {isExporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}