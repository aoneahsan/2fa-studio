/**
 * QR Code Detection Module
 * @module src/qr-detector
 */

class QRDetector {
  constructor() {
    this.isScanning = false;
    this.scanButton = null;
    this.overlay = null;
  }

  /**
   * Detect QR codes in images on the page
   */
  async detectQRCodesInPage() {
    const images = Array.from(document.querySelectorAll('img, canvas'));
    const qrCodes = [];

    for (const element of images) {
      try {
        // Skip small images
        if (element.width < 100 || element.height < 100) continue;

        // Check if image contains QR code pattern
        const qrData = await this.scanElement(element);
        if (qrData && this.isOTPAuthURL(qrData)) {
          qrCodes.push({
            element,
            data: qrData,
            bounds: element.getBoundingClientRect()
          });
        }
      } catch (error) {
        console.debug('Failed to scan element:', error);
      }
    }

    return qrCodes;
  }

  /**
   * Scan an element for QR code
   */
  async scanElement(element) {
    try {
      // Get image data
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      let img;
      if (element.tagName === 'IMG') {
        img = element;
      } else if (element.tagName === 'CANVAS') {
        img = new Image();
        img.src = element.toDataURL();
        await new Promise(resolve => img.onload = resolve);
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Send to background script for processing
      const response = await chrome.runtime.sendMessage({
        action: 'scanQRCode',
        imageData: {
          data: Array.from(imageData.data),
          width: imageData.width,
          height: imageData.height
        }
      });

      return response?.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if URL is an OTP auth URL
   */
  isOTPAuthURL(url) {
    return url && url.startsWith('otpauth://');
  }

  /**
   * Create floating scan button for QR codes
   */
  createScanButton(qrCode) {
    const button = document.createElement('button');
    button.className = 'tfa-studio-qr-scan-button';
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3z"></path>
        <path d="M21 21h-3v-3M15 12h3v3M12 3v6M12 15v6M3 12h6"></path>
      </svg>
      <span>Add to 2FA Studio</span>
    `;

    // Position near the QR code
    const { top, left, width, height } = qrCode.bounds;
    button.style.position = 'absolute';
    button.style.top = `${top + window.scrollY + height - 40}px`;
    button.style.left = `${left + window.scrollX + (width / 2) - 80}px`;
    button.style.zIndex = '9999';

    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'addOTPFromURL',
          url: qrCode.data
        });

        if (response.success) {
          this.showNotification('Account added successfully!', 'success');
          button.remove();
        } else {
          this.showNotification('Failed to add account', 'error');
        }
      } catch (error) {
        this.showNotification('Error adding account', 'error');
      }
    });

    document.body.appendChild(button);
    
    // Remove button after 10 seconds
    setTimeout(() => button.remove(), 10000);

    return button;
  }

  /**
   * Enable manual QR code selection mode
   */
  enableManualSelection() {
    if (this.isScanning) return;
    
    this.isScanning = true;
    
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'tfa-studio-qr-overlay';
    this.overlay.innerHTML = `
      <div class="tfa-studio-qr-instructions">
        Click on a QR code image to scan it
        <button class="tfa-studio-qr-cancel">Cancel</button>
      </div>
    `;
    
    document.body.appendChild(this.overlay);
    
    // Handle clicks on images
    const handleImageClick = async (e) => {
      const target = e.target;
      if (target.tagName === 'IMG' || target.tagName === 'CANVAS') {
        e.preventDefault();
        e.stopPropagation();
        
        // Show loading state
        this.showNotification('Scanning QR code...', 'info');
        
        const qrData = await this.scanElement(target);
        if (qrData && this.isOTPAuthURL(qrData)) {
          const response = await chrome.runtime.sendMessage({
            action: 'addOTPFromURL',
            url: qrData
          });
          
          if (response.success) {
            this.showNotification('Account added successfully!', 'success');
          } else {
            this.showNotification('Failed to add account', 'error');
          }
        } else {
          this.showNotification('No valid QR code found', 'error');
        }
        
        this.disableManualSelection();
      }
    };
    
    // Handle cancel
    this.overlay.querySelector('.tfa-studio-qr-cancel').addEventListener('click', () => {
      this.disableManualSelection();
    });
    
    // Add click listeners
    document.addEventListener('click', handleImageClick, true);
    this.imageClickHandler = handleImageClick;
    
    // Add hover effect
    document.addEventListener('mouseover', this.handleImageHover);
    document.addEventListener('mouseout', this.handleImageHoverOut);
  }

  /**
   * Disable manual selection mode
   */
  disableManualSelection() {
    if (!this.isScanning) return;
    
    this.isScanning = false;
    
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    
    if (this.imageClickHandler) {
      document.removeEventListener('click', this.imageClickHandler, true);
      this.imageClickHandler = null;
    }
    
    document.removeEventListener('mouseover', this.handleImageHover);
    document.removeEventListener('mouseout', this.handleImageHoverOut);
    
    // Remove hover effects
    document.querySelectorAll('.tfa-studio-qr-hover').forEach(el => {
      el.classList.remove('tfa-studio-qr-hover');
    });
  }

  /**
   * Handle image hover during selection
   */
  handleImageHover = (e) => {
    if (!this.isScanning) return;
    
    if (e.target.tagName === 'IMG' || e.target.tagName === 'CANVAS') {
      e.target.classList.add('tfa-studio-qr-hover');
    }
  };

  /**
   * Handle image hover out
   */
  handleImageHoverOut = (e) => {
    if (!this.isScanning) return;
    
    if (e.target.tagName === 'IMG' || e.target.tagName === 'CANVAS') {
      e.target.classList.remove('tfa-studio-qr-hover');
    }
  };

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `tfa-studio-notification tfa-studio-notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('tfa-studio-notification-show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.remove('tfa-studio-notification-show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Auto-detect and enhance QR codes on page
   */
  async autoDetectAndEnhance() {
    // Skip if already scanning
    if (this.isScanning) return;
    
    try {
      const qrCodes = await this.detectQRCodesInPage();
      
      // Add scan buttons for detected QR codes
      qrCodes.forEach(qrCode => {
        this.createScanButton(qrCode);
      });
      
      return qrCodes.length;
    } catch (error) {
      console.error('QR detection failed:', error);
      return 0;
    }
  }
}

// Export for use in content script
window.QRDetector = QRDetector;