/**
 * QR Scanner component for adding 2FA accounts
 * @module components/accounts/QRScanner
 */

import React, { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { XMarkIcon, CameraIcon } from '@heroicons/react/24/outline';
import { OTPService } from '../../services/otp.service';

interface QRScannerProps {
  onScanSuccess: (data: any) => void;
  onClose: () => void;
}

/**
 * QR Scanner component using camera for scanning 2FA QR codes
 */
const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<QrScanner | null>(null);

  useEffect(() => {
    const initScanner = async () => {
      if (!videoRef.current) return;

      try {
        // Check if camera is available
        const hasCamera = await QrScanner.hasCamera();
        if (!hasCamera) {
          setError('No camera found on this device');
          return;
        }

        // Create scanner instance
        const scanner = new QrScanner(
          videoRef.current,
          (result) => {
            handleScanResult(result.data);
          },
          {
            preferredCamera: 'environment',
            highlightScanRegion: true,
            highlightCodeOutline: true,
            maxScansPerSecond: 5,
          }
        );

        scannerRef.current = scanner;

        // Start scanning
        await scanner.start();
        setIsScanning(true);
      } catch (err) {
        console.error('Scanner initialization error:', err);
        setError('Failed to access camera. Please check permissions.');
      }
    };

    initScanner();

    // Cleanup
    return () => {
      if (scannerRef.current) {
        scannerRef.current.destroy();
      }
    };
  }, []);

  const handleScanResult = (data: string) => {
    try {
      // Check if it's an OTP URI
      if (!data.startsWith('otpauth://')) {
        setError('Invalid QR code. Please scan a 2FA QR code.');
        return;
      }

      // Parse the OTP URI
      const parsed = OTPService.parseURI(data);
      
      // Stop scanner
      if (scannerRef.current) {
        scannerRef.current.stop();
      }

      // Pass parsed data to parent
      onScanSuccess({
        ...parsed,
        uri: data
      });
    } catch (err) {
      console.error('QR parsing error:', err);
      setError('Failed to parse QR code. Please try manual entry.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="relative h-full">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white text-lg font-semibold">Scan QR Code</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Video Element */}
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
        />

        {/* Scan Region Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Scan frame */}
            <div className="w-64 h-64 border-2 border-white rounded-lg shadow-lg">
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
            </div>

            {/* Scanning indicator */}
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-0.5 bg-primary animate-pulse"></div>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
          <div className="text-center text-white">
            {error ? (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4">
                <p className="text-sm">{error}</p>
              </div>
            ) : (
              <>
                <CameraIcon className="w-8 h-8 mx-auto mb-2 text-white/70" />
                <p className="text-sm mb-2">Position QR code within the frame</p>
                <p className="text-xs text-white/70">
                  The code will be scanned automatically
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;