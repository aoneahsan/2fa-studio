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
    const elements = this.getAllImageElements();
    const qrCodes = [];
    const processedUrls = new Set();

    for (const element of elements) {
      try {
        // Skip duplicate images
        const imageKey = this.getImageKey(element);
        if (processedUrls.has(imageKey)) continue;
        processedUrls.add(imageKey);

        // Skip small or hidden images
        if (!this.isValidImage(element)) continue;

        // Quick pattern check before full scan
        if (!await this.hasQRPattern(element)) continue;

        // Check if image contains QR code pattern
        const qrData = await this.scanElement(element);
        if (qrData && this.isOTPAuthURL(qrData)) {
          qrCodes.push({
            element,
            data: qrData,
            bounds: element.getBoundingClientRect(),
            confidence: this.calculateConfidence(element, qrData)
          });
        }
      } catch (error) {
        console.debug('Failed to scan element:', error);
      }
    }

    // Sort by confidence
    qrCodes.sort((a, b) => b.confidence - a.confidence);
    return qrCodes;
  }

  getAllImageElements() {
    const elements = [];
    
    // Standard images and canvases
    elements.push(...document.querySelectorAll('img, canvas'));
    
    // Background images in CSS
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      const style = window.getComputedStyle(el);
      const backgroundImage = style.backgroundImage;
      if (backgroundImage && backgroundImage !== 'none' && 
          backgroundImage.includes('url(')) {
        // Create a virtual image element for background images
        const img = document.createElement('img');
        img.src = backgroundImage.match(/url\(['"]?([^'"]*)/)?.[1];
        img.style.width = style.width;
        img.style.height = style.height;
        img._isBackgroundImage = true;
        img._originalElement = el;
        elements.push(img);
      }
    });

    // SVG images
    elements.push(...document.querySelectorAll('svg image'));
    
    // Picture elements
    document.querySelectorAll('picture').forEach(picture => {
      const img = picture.querySelector('img');
      if (img) elements.push(img);
    });

    return elements;
  }

  getImageKey(element) {
    if (element.src) return element.src;
    if (element.tagName === 'CANVAS') {
      return `canvas:${element.width}x${element.height}:${Date.now()}`;
    }
    return `unknown:${Math.random()}`;
  }

  isValidImage(element) {
    // Check dimensions
    const rect = element.getBoundingClientRect();
    if (rect.width < 50 || rect.height < 50) return false;
    
    // Check if visible
    if (rect.width === 0 || rect.height === 0) return false;
    
    // Check if in viewport or reasonably close
    if (rect.bottom < -100 || rect.top > window.innerHeight + 100) return false;
    
    // Check if element is hidden
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || 
        style.opacity === '0') return false;
    
    return true;
  }

  async hasQRPattern(element) {
    try {
      // Quick canvas-based pattern detection
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Use smaller canvas for quick check
      canvas.width = 100;
      canvas.height = 100;
      
      let img = element;
      if (element.tagName === 'CANVAS') {
        img = new Image();
        img.src = element.toDataURL();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          setTimeout(reject, 1000); // Timeout after 1 second
        });
      }
      
      ctx.drawImage(img, 0, 0, 100, 100);
      const imageData = ctx.getImageData(0, 0, 100, 100);
      
      // Look for QR code patterns (finder patterns)
      return this.detectFinderPatterns(imageData);
    } catch (_error) {
      return true; // If pattern detection fails, assume it might be a QR code
    }
  }

  detectFinderPatterns(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Convert to grayscale and find patterns
    const grayscale = new Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      grayscale[i / 4] = gray < 128 ? 0 : 1; // Binary threshold
    }
    
    // Look for finder pattern ratios (1:1:3:1:1)
    let finderPatterns = 0;
    
    // Check rows
    for (let y = 0; y < height; y++) {
      let runLengths = [];
      let currentRun = 1;
      let currentColor = grayscale[y * width];
      
      for (let x = 1; x < width; x++) {
        const pixel = grayscale[y * width + x];
        if (pixel === currentColor) {
          currentRun++;
        } else {
          runLengths.push(currentRun);
          currentRun = 1;
          currentColor = pixel;
        }
      }
      runLengths.push(currentRun);
      
      // Check for finder pattern ratio
      if (this.hasFinderRatio(runLengths)) {
        finderPatterns++;
      }
    }
    
    // Check columns
    for (let x = 0; x < width; x++) {
      let runLengths = [];
      let currentRun = 1;
      let currentColor = grayscale[x];
      
      for (let y = 1; y < height; y++) {
        const pixel = grayscale[y * width + x];
        if (pixel === currentColor) {
          currentRun++;
        } else {
          runLengths.push(currentRun);
          currentRun = 1;
          currentColor = pixel;
        }
      }
      runLengths.push(currentRun);
      
      if (this.hasFinderRatio(runLengths)) {
        finderPatterns++;
      }
    }
    
    // If we found multiple finder patterns, it's likely a QR code
    return finderPatterns >= 2;
  }

  hasFinderRatio(runLengths) {
    if (runLengths.length < 5) return false;
    
    for (let i = 0; i <= runLengths.length - 5; i++) {
      const runs = runLengths.slice(i, i + 5);
      const total = runs.reduce((a, b) => a + b, 0);
      
      if (total < 7) continue; // Too small
      
      const unit = total / 7;
      const tolerance = unit * 0.5;
      
      // Check if runs match 1:1:3:1:1 ratio
      if (Math.abs(runs[0] - unit) < tolerance &&
          Math.abs(runs[1] - unit) < tolerance &&
          Math.abs(runs[2] - 3 * unit) < tolerance &&
          Math.abs(runs[3] - unit) < tolerance &&
          Math.abs(runs[4] - unit) < tolerance) {
        return true;
      }
    }
    
    return false;
  }

  calculateConfidence(element, qrData) {
    let confidence = 0.5; // Base confidence
    
    // Size factor
    const rect = element.getBoundingClientRect();
    if (rect.width >= 200 && rect.height >= 200) confidence += 0.3;
    else if (rect.width >= 150 && rect.height >= 150) confidence += 0.2;
    else if (rect.width >= 100 && rect.height >= 100) confidence += 0.1;
    
    // QR data quality
    if (qrData && qrData.length > 50) confidence += 0.2;
    
    // Position - center of page is more likely
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const distance = Math.sqrt(
      Math.pow(rect.left + rect.width / 2 - centerX, 2) +
      Math.pow(rect.top + rect.height / 2 - centerY, 2)
    );
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
    const proximityFactor = 1 - (distance / maxDistance);
    confidence += proximityFactor * 0.2;
    
    return Math.min(confidence, 1.0);
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
    // Check if button already exists for this QR code
    const existingButton = document.querySelector(`[data-qr-id="${qrCode.element.id || 'unknown'}"]`);
    if (existingButton) return existingButton;

    const button = document.createElement('button');
    button.className = 'tfa-studio-qr-scan-button';
    button.dataset.qrId = qrCode.element.id || `qr-${Date.now()}`;
    
    // Enhanced button with confidence indicator
    const confidenceClass = qrCode.confidence > 0.8 ? 'high' : qrCode.confidence > 0.6 ? 'medium' : 'low';
    button.classList.add(`confidence-${confidenceClass}`);
    
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3z"></path>
        <path d="M21 21h-3v-3M15 12h3v3M12 3v6M12 15v6M3 12h6"></path>
      </svg>
      <span>Add to 2FA Studio</span>
      <div class="confidence-indicator" title="Detection confidence: ${Math.round(qrCode.confidence * 100)}%">
        ${Math.round(qrCode.confidence * 100)}%
      </div>
    `;

    // Enhanced positioning algorithm
    const position = this.calculateOptimalPosition(qrCode);
    button.style.position = 'fixed';
    button.style.top = `${position.top}px`;
    button.style.left = `${position.left}px`;
    button.style.zIndex = '10001';

    // Add hover effect to highlight QR code
    button.addEventListener('mouseenter', () => {
      qrCode.element.classList.add('tfa-studio-qr-highlighted');
    });

    button.addEventListener('mouseleave', () => {
      qrCode.element.classList.remove('tfa-studio-qr-highlighted');
    });

    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Show loading state
      button.innerHTML = `
        <div class="loading-spinner"></div>
        <span>Adding...</span>
      `;
      button.disabled = true;
      
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'addOTPFromURL',
          url: qrCode.data
        });

        if (response.success) {
          this.showNotification('Account added successfully!', 'success');
          button.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12l2 2 4-4"></path>
              <circle cx="12" cy="12" r="10"></circle>
            </svg>
            <span>Added!</span>
          `;
          button.classList.add('success');
          setTimeout(() => button.remove(), 2000);
        } else {
          this.showNotification('Failed to add account', 'error');
          this.resetButton(button);
        }
      } catch (error) {
        this.showNotification('Error adding account', 'error');
        this.resetButton(button);
      }
    });

    // Add dismissal functionality
    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'tfa-studio-qr-dismiss';
    dismissBtn.innerHTML = '×';
    dismissBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      button.remove();
    });
    button.appendChild(dismissBtn);

    document.body.appendChild(button);
    
    // Enhanced auto-removal with user interaction tracking
    let interactionTimeout = setTimeout(() => {
      if (!button.matches(':hover')) {
        button.remove();
      }
    }, 15000);

    // Extend timeout on hover
    button.addEventListener('mouseenter', () => {
      clearTimeout(interactionTimeout);
    });

    button.addEventListener('mouseleave', () => {
      interactionTimeout = setTimeout(() => button.remove(), 5000);
    });

    return button;
  }

  calculateOptimalPosition(qrCode) {
    const { top, left, width, height } = qrCode.bounds;
    const buttonWidth = 180;
    const buttonHeight = 50;
    const margin = 10;
    
    // Try positions in order of preference
    const positions = [
      // Below QR code
      {
        top: top + height + margin,
        left: left + (width / 2) - (buttonWidth / 2)
      },
      // Above QR code
      {
        top: top - buttonHeight - margin,
        left: left + (width / 2) - (buttonWidth / 2)
      },
      // To the right
      {
        top: top + (height / 2) - (buttonHeight / 2),
        left: left + width + margin
      },
      // To the left
      {
        top: top + (height / 2) - (buttonHeight / 2),
        left: left - buttonWidth - margin
      }
    ];
    
    // Find first position that fits in viewport
    for (const pos of positions) {
      if (pos.top >= 0 && 
          pos.left >= 0 && 
          pos.top + buttonHeight <= window.innerHeight &&
          pos.left + buttonWidth <= window.innerWidth) {
        return pos;
      }
    }
    
    // Fallback to bottom-right corner of QR code
    return {
      top: Math.min(top + height - buttonHeight, window.innerHeight - buttonHeight - margin),
      left: Math.min(left + width - buttonWidth, window.innerWidth - buttonWidth - margin)
    };
  }

  resetButton(button) {
    button.disabled = false;
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3z"></path>
        <path d="M21 21h-3v-3M15 12h3v3M12 3v6M12 15v6M3 12h6"></path>
      </svg>
      <span>Try Again</span>
    `;
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