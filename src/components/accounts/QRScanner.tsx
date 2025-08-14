/**
 * QR Scanner component for adding 2FA accounts
 * @module components/accounts/QRScanner
 */

import React, { useState } from 'react';
import { useCodeCraftStudio } from 'code-craft-studio';
import { XMarkIcon, CameraIcon } from '@heroicons/react/24/outline';
import { OTPService } from '@services/otp.service';

interface QRScannerProps {
  onScanSuccess: (data: any) => void;
  onClose: () => void;
}

/**
 * QR Scanner component using code-craft-studio for native scanning
 */
const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onClose }) => {
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const { scanQRCode, isReady } = useCodeCraftStudio();

  const handleScan = async () => {
    setError(null);
    setIsScanning(true);

    try {
      const result = await scanQRCode({
        formats: ['QR_CODE'], // Only scan QR codes
      } as any);

      if (result.content) {
        handleScanResult(result.content);
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      setError(err.message || 'Failed to scan QR code. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleScanResult = (data: string) => {
    try {
      // Parse the OTP URI
      const parsed = OTPService.parseURI(data);
      
      if (!parsed || !parsed.secret) {
        setError('Invalid 2FA QR code. Please scan a valid authenticator QR code.');
        return;
      }

      // Success - pass the parsed data to parent
      onScanSuccess(parsed);
    } catch (err) {
      console.error('Error parsing QR code:', err);
      setError('Invalid QR code format. Please try again.');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsScanning(true);

    try {
      // Create a temporary image element to decode QR from file
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = async () => {
        // Create canvas to extract image data
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          setError('Failed to process image');
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);

        try {
          // Use code-craft-studio's QR scanning on the image data
          // Note: This is a fallback for web platform
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          // For now, we'll show an error as code-craft-studio may not support image scanning
          setError('Please use the camera scanner for best results.');
        } catch (err) {
          setError('Failed to scan QR code from image.');
        } finally {
          URL.revokeObjectURL(url);
          setIsScanning(false);
        }
      };

      img.onerror = () => {
        setError('Failed to load image');
        URL.revokeObjectURL(url);
        setIsScanning(false);
      };

      img.src = url;
    } catch (err) {
      console.error('File upload error:', err);
      setError('Failed to process image file.');
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Scan QR Code
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Camera Scanner Button */}
          <button
            onClick={handleScan}
            disabled={!isReady || isScanning}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <CameraIcon className="h-5 w-5" />
            {isScanning ? 'Scanning...' : 'Scan with Camera'}
          </button>

          {/* File Upload Option */}
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="qr-file-upload"
              disabled={isScanning}
            />
            <label
              htmlFor="qr-file-upload"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
            >
              Upload QR Code Image
            </label>
          </div>

          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            Position the QR code within the camera frame to scan automatically
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;