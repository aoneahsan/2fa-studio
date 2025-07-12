---
sidebar_position: 3
---

# QRScanner

Component for scanning QR codes to import 2FA accounts using the device camera.

## Overview

The `QRScanner` component provides a camera-based QR code scanner for importing 2FA accounts. It supports both native camera access (mobile) and webcam access (web).

```typescript
import { QRScanner } from '@/components/accounts/QRScanner';
```

## Props

### onScan

**Type:** `(data: string) => void`  
**Required:** Yes

Callback function triggered when a QR code is successfully scanned.

### onError

**Type:** `(error: Error) => void`  
**Required:** No

Callback function triggered when an error occurs during scanning.

### onClose

**Type:** `() => void`  
**Required:** Yes

Callback function triggered when the scanner should be closed.

### className

**Type:** `string`  
**Required:** No

Additional CSS classes to apply to the scanner container.

## Usage

```typescript
function AddAccountModal() {
  const [showScanner, setShowScanner] = useState(false);

  const handleScan = (data: string) => {
    try {
      // Parse OTP URI
      const account = OTPService.parseURI(data);
      
      // Add the account
      addAccount(account);
      
      // Close scanner
      setShowScanner(false);
      
      showToast('Account added successfully');
    } catch (error) {
      showToast('Invalid QR code');
    }
  };

  const handleError = (error: Error) => {
    console.error('Scanner error:', error);
    showToast('Camera access denied');
  };

  return (
    <>
      <button onClick={() => setShowScanner(true)}>
        Scan QR Code
      </button>

      {showScanner && (
        <QRScanner
          onScan={handleScan}
          onError={handleError}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
}
```

## Features

### Camera Selection

On devices with multiple cameras:
- Automatically selects rear camera on mobile
- Provides camera switcher on devices with multiple cameras
- Falls back to front camera if rear unavailable

### QR Code Detection

- Real-time QR code detection
- Visual feedback when QR code detected
- Automatic parsing of otpauth:// URIs
- Validates QR code format before triggering callback

### UI Elements

```jsx
<div className="qr-scanner">
  {/* Camera Preview */}
  <div className="scanner-viewport">
    <video ref={videoRef} />
    <div className="scanner-overlay">
      <div className="scanner-frame" />
    </div>
  </div>

  {/* Controls */}
  <div className="scanner-controls">
    <button onClick={switchCamera}>Switch Camera</button>
    <button onClick={onClose}>Cancel</button>
  </div>

  {/* Status */}
  <div className="scanner-status">
    {status === 'scanning' && 'Position QR code within frame'}
    {status === 'processing' && 'Processing...'}
  </div>
</div>
```

## Platform-Specific Implementation

### Mobile (Capacitor)

```typescript
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';

const startScan = async () => {
  // Request permissions
  const status = await BarcodeScanner.checkPermission({ force: true });
  
  if (status.granted) {
    // Make background transparent
    document.body.classList.add('scanner-active');
    
    // Start scanning
    const result = await BarcodeScanner.startScan();
    
    if (result.hasContent) {
      onScan(result.content);
    }
  }
};
```

### Web (WebRTC)

```typescript
const startWebScan = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'environment', // Rear camera
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  });
  
  videoRef.current.srcObject = stream;
  
  // Use QR code detection library
  const detector = new QRCodeDetector();
  scanFrame();
};
```

## States

The component manages several states:

```typescript
type ScannerStatus = 'idle' | 'requesting' | 'scanning' | 'processing' | 'error';

const [status, setStatus] = useState<ScannerStatus>('idle');
const [error, setError] = useState<string | null>(null);
const [hasPermission, setHasPermission] = useState<boolean | null>(null);
```

## Error Handling

Common errors and their handling:

```typescript
const handleError = (error: Error) => {
  if (error.name === 'NotAllowedError') {
    setError('Camera permission denied');
  } else if (error.name === 'NotFoundError') {
    setError('No camera found');
  } else if (error.name === 'NotReadableError') {
    setError('Camera is already in use');
  } else {
    setError('Failed to access camera');
  }
  
  onError?.(error);
};
```

## Permissions

### Mobile Permissions

```xml
<!-- Android (AndroidManifest.xml) -->
<uses-permission android:name="android.permission.CAMERA" />

<!-- iOS (Info.plist) -->
<key>NSCameraUsageDescription</key>
<string>2FA Studio needs camera access to scan QR codes</string>
```

### Web Permissions

- Requests camera permission via getUserMedia
- Shows browser's permission prompt
- Handles permission denial gracefully

## Complete Example

```typescript
import React, { useState } from 'react';
import { QRScanner } from '@/components/accounts/QRScanner';
import { OTPService } from '@/services/otp.service';
import { useAccounts } from '@/hooks/useAccounts';

function ImportAccountFlow() {
  const [step, setStep] = useState<'choose' | 'scan' | 'confirm'>('choose');
  const [scannedData, setScannedData] = useState<any>(null);
  const { addAccount } = useAccounts();

  const handleScan = async (data: string) => {
    try {
      // Parse QR code
      const parsed = OTPService.parseURI(data);
      
      // Validate required fields
      if (!parsed.secret || !parsed.issuer) {
        throw new Error('Invalid QR code');
      }
      
      // Get service icon
      parsed.iconUrl = OTPService.getServiceIcon(parsed.issuer);
      
      // Show confirmation
      setScannedData(parsed);
      setStep('confirm');
      
    } catch (error) {
      showToast('Invalid QR code format');
      setStep('choose');
    }
  };

  const handleConfirm = async () => {
    try {
      await addAccount({
        ...scannedData,
        tags: ['imported'],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      showToast('Account imported successfully');
      onClose();
      
    } catch (error) {
      showToast('Failed to add account');
    }
  };

  return (
    <Modal>
      {step === 'choose' && (
        <div>
          <h2>Import Account</h2>
          <button onClick={() => setStep('scan')}>
            Scan QR Code
          </button>
          <button onClick={() => setShowManual(true)}>
            Enter Manually
          </button>
        </div>
      )}

      {step === 'scan' && (
        <QRScanner
          onScan={handleScan}
          onError={(error) => {
            console.error(error);
            setStep('choose');
          }}
          onClose={() => setStep('choose')}
        />
      )}

      {step === 'confirm' && scannedData && (
        <div>
          <h2>Confirm Import</h2>
          <div className="account-preview">
            <img src={scannedData.iconUrl} alt="" />
            <div>
              <h3>{scannedData.issuer}</h3>
              <p>{scannedData.label}</p>
            </div>
          </div>
          <button onClick={handleConfirm}>Import</button>
          <button onClick={() => setStep('choose')}>Cancel</button>
        </div>
      )}
    </Modal>
  );
}
```

## Styling

The component uses CSS modules for scoped styling:

```css
.scanner-viewport {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  max-width: 400px;
  margin: 0 auto;
}

.scanner-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

.scanner-frame {
  position: absolute;
  inset: 20%;
  border: 2px solid white;
  border-radius: 8px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
}

/* Scanning animation */
.scanner-frame::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: #00ff00;
  animation: scan 2s linear infinite;
}

@keyframes scan {
  to { transform: translateY(100%); }
}
```

## Accessibility

- Provides text alternatives for camera status
- Keyboard navigation for controls
- Screen reader announcements for scan results
- High contrast mode support

## Performance Considerations

1. **Frame Rate**: Limit scanning to 10-15 FPS
2. **Resolution**: Use appropriate camera resolution
3. **Memory**: Clean up camera stream on unmount
4. **CPU**: Debounce QR detection processing