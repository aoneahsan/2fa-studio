import React, { useState, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, DocumentArrowUpIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { ImportExportService, ImportFormat } from '@services/importExport.service';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { showToast } from '@store/slices/uiSlice';
import { addAccount } from '@store/slices/accountsSlice';
import { OTPAccount } from '@services/otp.service';

interface ImportAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportAccountsModal({ isOpen, onClose }: ImportAccountsModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ImportFormat>('json');
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dispatch = useAppDispatch();

  const formats: { value: ImportFormat; label: string; encrypted: boolean }[] = [
    { value: 'json', label: '2FA Studio JSON', encrypted: true },
    { value: 'google_authenticator', label: 'Google Authenticator', encrypted: false },
    { value: 'authy', label: 'Authy', encrypted: false },
    { value: '2fas', label: '2FAS', encrypted: false },
    { value: 'aegis', label: 'Aegis', encrypted: false },
    { value: 'raivo', label: 'Raivo OTP', encrypted: false },
  ];

  const handleFileChange = (_e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = _e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const format = formats.find(f => f.value === selectedFormat);
      setShowPasswordField(format?.encrypted || false);
    }
  };

  const handleFormatChange = (format: ImportFormat) => {
    setSelectedFormat(format);
    const selectedFormatInfo = formats.find(f => f.value === format);
    setShowPasswordField(selectedFormatInfo?.encrypted || false);
  };

  const handleImport = async () => {
    if (!file) {
      dispatch(showToast({ message: 'Please select a file', type: 'error' }));
      return;
    }

    setIsImporting(true);
    try {
      const text = await file.text();
      const importedAccounts = await ImportExportService.importAccounts(
        text,
        selectedFormat,
        showPasswordField ? password : undefined
      );

      // Add imported accounts to the store
      for (const account of importedAccounts) {
        const newAccount: OTPAccount = {
          id: crypto.randomUUID(),
          issuer: account.issuer,
          label: account.label,
          secret: account.secret,
          algorithm: account.algorithm || 'SHA1',
          digits: account.digits || 6,
          period: account.period || 30,
          type: account.type || 'totp',
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: account.tags || [],
          iconUrl: account.iconUrl,
          notes: account.notes,
          counter: account.counter,
          backupCodes: account.backupCodes || [],
        };
        dispatch(addAccount(newAccount));
      }

      dispatch(showToast({ 
        message: `Successfully imported ${importedAccounts.length} accounts`, 
        type: 'success' 
      }));
      
      // Reset form and close modal
      setFile(null);
      setPassword('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();
    } catch (error) {
      dispatch(showToast({ 
        message: error instanceof Error ? error.message : 'Failed to import accounts', 
        type: 'error' 
      }));
    } finally {
      setIsImporting(false);
    }
  };

  const handleDragOver = (_e: React.DragEvent) => {
    _e.preventDefault();
    _e.stopPropagation();
  };

  const handleDrop = (_e: React.DragEvent) => {
    _e.preventDefault();
    _e.stopPropagation();
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      const format = formats.find(f => f.value === selectedFormat);
      setShowPasswordField(format?.encrypted || false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full rounded-lg bg-white dark:bg-gray-800 shadow-xl">
          <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
              Import Accounts
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Import Format
              </label>
              <select
                value={selectedFormat}
                onChange={(e) => handleFormatChange(_e.target.value as ImportFormat)}
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
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select File
              </label>
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6
                         hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".json,.txt,.xml"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  {file ? (
                    <>
                      <DocumentArrowUpIcon className="h-12 w-12 text-indigo-500 mb-3" />
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </>
                  ) : (
                    <>
                      <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mb-3" />
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        JSON, XML, or TXT files
                      </p>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Password Field (for encrypted formats) */}
            {showPasswordField && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Decryption Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password to decrypt file"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           placeholder-gray-400 dark:placeholder-gray-500
                           focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
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
              onClick={handleImport}
              disabled={!file || isImporting}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg 
                       hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed 
                       transition-colors"
            >
              {isImporting ? 'Importing...' : 'Import'}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}