import React, { useState, useRef } from 'react';
import QRCode from 'qrcode';
import { Button } from '@components/ui/button';
import { 
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  ArrowsPointingOutIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  logo?: string;
  logoSize?: number;
  showDownload?: boolean;
  showCopy?: boolean;
  showFullscreen?: boolean;
  className?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  label?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 200,
  errorCorrectionLevel = 'M',
  logo,
  logoSize = 40,
  showDownload = true,
  showCopy = true,
  showFullscreen = false,
  className = '',
  backgroundColor = '#FFFFFF',
  foregroundColor = '#000000',
  label
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate QR code
  React.useEffect(() => {
    const generateQR = async () => {
      try {
        if (!value) {
          setError('No value provided for QR code');
          return;
        }

        const url = await QRCode.toDataURL(value, {
          width: size,
          errorCorrectionLevel,
          color: {
            dark: foregroundColor,
            light: backgroundColor
          },
          margin: 2
        });
        
        setQrCodeUrl(url);
        setError('');
      } catch (err) {
        setError('Failed to generate QR code');
        console.error('QR Code generation error:', err);
      }
    };

    generateQR();
  }, [value, size, errorCorrectionLevel, backgroundColor, foregroundColor]);

  // Download QR code as image
  const handleDownload = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `qrcode-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy QR code value to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Toggle fullscreen
  const handleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 bg-red-50 rounded-lg ${className}`}>
        <ExclamationTriangleIcon className="w-8 h-8 text-red-500 mb-2" />
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col items-center gap-4 ${className}`}
    >
      {label && (
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      )}
      
      <div className="relative bg-white p-4 rounded-lg shadow-sm border">
        {qrCodeUrl ? (
          <>
            <img 
              src={qrCodeUrl} 
              alt="QR Code" 
              className="block"
              style={{ width: size, height: size }}
            />
            {logo && (
              <div 
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-1 rounded"
                style={{ width: logoSize, height: logoSize }}
              >
                <img 
                  src={logo} 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </>
        ) : (
          <div 
            className="bg-muted animate-pulse rounded"
            style={{ width: size, height: size }}
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        {showCopy && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!value}
          >
            {copied ? (
              <>
                <CheckIcon className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <ClipboardDocumentIcon className="w-4 h-4 mr-2" />
                Copy Value
              </>
            )}
          </Button>
        )}
        
        {showDownload && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={!qrCodeUrl}
          >
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            Download
          </Button>
        )}
        
        {showFullscreen && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleFullscreen}
          >
            <ArrowsPointingOutIcon className="w-4 h-4 mr-2" />
            {isFullscreen ? 'Exit' : 'Fullscreen'}
          </Button>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

// QR Code Scanner component placeholder
interface QRCodeScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({
  onScan,
  onError,
  className = ''
}) => {
  // This is a placeholder for QR code scanning functionality
  // Actual implementation would use camera access and QR scanning library
  return (
    <div className={`flex flex-col items-center justify-center p-8 bg-muted rounded-lg ${className}`}>
      <div className="w-64 h-64 bg-black/10 rounded-lg flex items-center justify-center mb-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">QR Scanner</p>
          <p className="text-xs text-muted-foreground">Camera integration required</p>
        </div>
      </div>
      <Button onClick={() => onScan('otpauth://totp/Example:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example')}>
        Simulate Scan
      </Button>
    </div>
  );
};

// Animated QR Code (for dynamic values like OTP)
interface AnimatedQRCodeProps {
  getValue: () => string;
  updateInterval?: number;
  size?: number;
  className?: string;
}

export const AnimatedQRCode: React.FC<AnimatedQRCodeProps> = ({
  getValue,
  updateInterval = 1000,
  size = 200,
  className = ''
}) => {
  const [currentValue, setCurrentValue] = useState(getValue());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentValue(getValue());
    }, updateInterval);

    return () => clearInterval(interval);
  }, [getValue, updateInterval]);

  return (
    <QRCodeDisplay
      value={currentValue}
      size={size}
      showDownload={false}
      showCopy={false}
      className={className}
    />
  );
};

// Mini QR Code for inline display
export const MiniQRCode: React.FC<{
  value: string;
  size?: number;
}> = ({ value, size = 80 }) => {
  return (
    <QRCodeDisplay
      value={value}
      size={size}
      showDownload={false}
      showCopy={false}
      showFullscreen={false}
      className="inline-block"
    />
  );
};