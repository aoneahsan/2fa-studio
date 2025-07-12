/**
 * Chrome Extension Content Script
 * @module src/content-script
 */

// Load QR detector
const script = document.createElement('script');
script.src = chrome.runtime.getURL('src/qr-detector.js');
script.onload = function() {
  this.remove();
};
document.head.appendChild(script);

class ContentScript {
  constructor() {
    this.qrDetector = null;
    this.init();
    this.setupStyles();
    this.initQRDetector();
  }

  init() {
    // Listen for messages from popup/background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'fillCode':
          this.fillCode(request.code);
          break;
        case 'detectFields':
          const fields = this.detectOTPFields();
          sendResponse({ fields });
          break;
        case 'getPageInfo':
          sendResponse({
            title: document.title,
            url: window.location.href,
            domain: window.location.hostname
          });
          break;
        case 'scanQRCodes':
          this.scanPageForQRCodes().then(count => {
            sendResponse({ count });
          });
          return true; // Will respond asynchronously
        case 'enableQRSelection':
          if (this.qrDetector) {
            this.qrDetector.enableManualSelection();
          }
          break;
      }
    });

    // Auto-detect OTP fields on page load
    this.autoDetectAndEnhance();

    // Watch for dynamically added forms
    this.observePageChanges();
  }

  setupStyles() {
    // Inject styles for our UI elements
    const style = document.createElement('style');
    style.textContent = `
      .tfa-studio-field {
        position: relative;
      }

      .tfa-studio-button {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        width: 32px;
        height: 32px;
        border: none;
        background: #0066cc;
        color: white;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        z-index: 10;
      }

      .tfa-studio-button:hover {
        background: #0052a3;
        transform: translateY(-50%) scale(1.05);
      }

      .tfa-studio-button svg {
        width: 18px;
        height: 18px;
      }

      .tfa-studio-tooltip {
        position: absolute;
        bottom: 100%;
        right: 0;
        margin-bottom: 8px;
        padding: 8px 12px;
        background: #333;
        color: white;
        font-size: 12px;
        border-radius: 4px;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s;
      }

      .tfa-studio-button:hover + .tfa-studio-tooltip {
        opacity: 1;
      }

      .tfa-studio-filled {
        animation: tfa-studio-success 0.5s ease-out;
      }

      @keyframes tfa-studio-success {
        0% {
          background-color: #4caf50;
          transform: scale(1);
        }
        50% {
          transform: scale(1.05);
        }
        100% {
          background-color: inherit;
          transform: scale(1);
        }
      }

      /* QR Detection Styles */
      .tfa-studio-qr-scan-button {
        position: fixed;
        padding: 8px 16px;
        background: #0066cc;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
        transition: all 0.2s;
        z-index: 9999;
      }

      .tfa-studio-qr-scan-button:hover {
        background: #0052a3;
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(0, 102, 204, 0.4);
      }

      .tfa-studio-qr-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        z-index: 9998;
        cursor: crosshair;
      }

      .tfa-studio-qr-instructions {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        padding: 16px 24px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 500;
        color: #333;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        display: flex;
        align-items: center;
        gap: 16px;
        z-index: 9999;
      }

      .tfa-studio-qr-cancel {
        padding: 6px 12px;
        background: #dc3545;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 14px;
        cursor: pointer;
        transition: background 0.2s;
      }

      .tfa-studio-qr-cancel:hover {
        background: #c82333;
      }

      .tfa-studio-qr-hover {
        outline: 3px solid #0066cc !important;
        outline-offset: 2px;
        cursor: pointer !important;
      }

      .tfa-studio-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        color: white;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s;
        z-index: 10000;
      }

      .tfa-studio-notification-show {
        opacity: 1;
        transform: translateX(0);
      }

      .tfa-studio-notification-info {
        background: #0066cc;
      }

      .tfa-studio-notification-success {
        background: #28a745;
      }

      .tfa-studio-notification-error {
        background: #dc3545;
      }
    `;
    document.head.appendChild(style);
  }

  autoDetectAndEnhance() {
    // Wait for page to load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.enhanceOTPFields());
    } else {
      this.enhanceOTPFields();
    }
  }

  enhanceOTPFields() {
    const fields = this.detectOTPFields();
    
    fields.forEach(field => {
      if (field.dataset.tfaStudioEnhanced) return;
      
      // Mark as enhanced
      field.dataset.tfaStudioEnhanced = 'true';
      
      // Create wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'tfa-studio-field';
      field.parentNode.insertBefore(wrapper, field);
      wrapper.appendChild(field);
      
      // Add fill button
      const button = document.createElement('button');
      button.className = 'tfa-studio-button';
      button.type = 'button';
      button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"></path>
          <path d="M12 11v4m0 4h.01"></path>
        </svg>
      `;
      
      // Add tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'tfa-studio-tooltip';
      tooltip.textContent = 'Fill 2FA code';
      
      wrapper.appendChild(button);
      wrapper.appendChild(tooltip);
      
      // Handle click
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        try {
          // Request code from extension
          const response = await chrome.runtime.sendMessage({
            action: 'requestCode',
            pageInfo: {
              url: window.location.href,
              domain: window.location.hostname
            }
          });
          
          if (response && response.code) {
            this.fillField(field, response.code);
          } else {
            // Open popup if no automatic match
            chrome.runtime.sendMessage({ action: 'openPopup' });
          }
        } catch (error) {
          console.error('Failed to get code:', error);
        }
      });
    });
  }

  detectOTPFields() {
    const fields = [];
    const selectors = [
      // Common OTP field patterns
      'input[name*="otp"]',
      'input[name*="code"]',
      'input[name*="token"]',
      'input[name*="verify"]',
      'input[name*="tfa"]',
      'input[name*="2fa"]',
      'input[name*="mfa"]',
      'input[id*="otp"]',
      'input[id*="code"]',
      'input[id*="token"]',
      'input[id*="verify"]',
      'input[placeholder*="code"]',
      'input[placeholder*="token"]',
      'input[placeholder*="OTP"]',
      'input[placeholder*="2FA"]',
      'input[aria-label*="code"]',
      'input[aria-label*="token"]',
      // Specific patterns for popular services
      'input[autocomplete="one-time-code"]',
      'input[inputmode="numeric"][maxlength="6"]',
      'input[inputmode="numeric"][maxlength="7"]',
      'input[inputmode="numeric"][maxlength="8"]'
    ];

    // Find fields by selectors
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(field => {
        if (this.isOTPField(field) && !fields.includes(field)) {
          fields.push(field);
        }
      });
    });

    // Also check by context
    document.querySelectorAll('input[type="text"], input[type="number"], input[type="tel"]').forEach(field => {
      if (this.isOTPFieldByContext(field) && !fields.includes(field)) {
        fields.push(field);
      }
    });

    return fields;
  }

  isOTPField(field) {
    // Skip hidden or disabled fields
    if (field.type === 'hidden' || field.disabled) return false;
    
    // Skip fields that are too long for OTP
    if (field.maxLength && field.maxLength > 10) return false;
    
    // Skip email/password fields
    if (field.type === 'email' || field.type === 'password') return false;
    
    return true;
  }

  isOTPFieldByContext(field) {
    // Check surrounding text for OTP-related keywords
    const parent = field.closest('form, div, section');
    if (!parent) return false;
    
    const text = parent.textContent.toLowerCase();
    const keywords = [
      'verification code',
      'verify code',
      'authentication code',
      'one-time',
      'otp',
      '2fa',
      'two-factor',
      'two factor',
      'authenticator',
      '6-digit',
      '6 digit',
      'security code'
    ];
    
    return keywords.some(keyword => text.includes(keyword));
  }

  fillCode(code) {
    // Try to find the active field first
    const activeElement = document.activeElement;
    if (activeElement && activeElement.tagName === 'INPUT' && this.isOTPField(activeElement)) {
      this.fillField(activeElement, code);
      return;
    }

    // Otherwise, find OTP fields and fill the first one
    const fields = this.detectOTPFields();
    if (fields.length > 0) {
      this.fillField(fields[0], code);
    }
  }

  fillField(field, code) {
    // Focus the field
    field.focus();
    
    // Clear existing value
    field.value = '';
    
    // Set the new value
    field.value = code;
    
    // Trigger input events
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Add success animation
    field.classList.add('tfa-studio-filled');
    setTimeout(() => {
      field.classList.remove('tfa-studio-filled');
    }, 500);
    
    // Try to submit form if it's the last field
    this.tryAutoSubmit(field);
  }

  tryAutoSubmit(field) {
    const form = field.closest('form');
    if (!form) return;
    
    // Check if all required fields are filled
    const requiredFields = form.querySelectorAll('input[required]');
    const allFilled = Array.from(requiredFields).every(f => f.value.trim() !== '');
    
    if (allFilled) {
      // Look for submit button
      const submitButton = form.querySelector(
        'button[type="submit"], input[type="submit"], button:not([type="button"])'
      );
      
      if (submitButton && !submitButton.disabled) {
        // Give a small delay for any validators to run
        setTimeout(() => {
          submitButton.click();
        }, 100);
      }
    }
  }

  observePageChanges() {
    // Watch for dynamically added forms
    const observer = new MutationObserver((mutations) => {
      let shouldEnhance = false;
      let shouldScanQR = false;
      
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            if (node.matches('form') || node.querySelector('form')) {
              shouldEnhance = true;
            }
            if (node.matches('img, canvas') || node.querySelector('img, canvas')) {
              shouldScanQR = true;
            }
          }
        });
      });
      
      if (shouldEnhance) {
        // Debounce to avoid multiple calls
        clearTimeout(this.enhanceTimeout);
        this.enhanceTimeout = setTimeout(() => {
          this.enhanceOTPFields();
        }, 500);
      }
      
      if (shouldScanQR && this.qrDetector) {
        // Debounce QR scanning
        clearTimeout(this.qrScanTimeout);
        this.qrScanTimeout = setTimeout(() => {
          this.scanPageForQRCodes();
        }, 1000);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Initialize QR detector
   */
  initQRDetector() {
    // Wait for QRDetector to be available
    setTimeout(() => {
      if (window.QRDetector) {
        this.qrDetector = new window.QRDetector();
        // Auto-scan on page load
        if (document.readyState === 'complete') {
          this.scanPageForQRCodes();
        } else {
          window.addEventListener('load', () => this.scanPageForQRCodes());
        }
      }
    }, 100);
  }

  /**
   * Scan page for QR codes
   */
  async scanPageForQRCodes() {
    if (!this.qrDetector) return 0;
    
    try {
      const count = await this.qrDetector.autoDetectAndEnhance();
      
      // Notify extension if QR codes found
      if (count > 0) {
        chrome.runtime.sendMessage({
          action: 'qrCodesDetected',
          count: count
        });
      }
      
      return count;
    } catch (error) {
      console.error('Failed to scan for QR codes:', error);
      return 0;
    }
  }

  /**
   * Enhanced auto-fill with smart field matching
   */
  fillCode(code) {
    // Try to find the active field first
    const activeElement = document.activeElement;
    if (activeElement && activeElement.tagName === 'INPUT' && this.isOTPField(activeElement)) {
      this.fillField(activeElement, code);
      return;
    }

    // Otherwise, find OTP fields and fill the most likely one
    const fields = this.detectOTPFields();
    if (fields.length > 0) {
      // Prioritize visible fields
      const visibleFields = fields.filter(field => {
        const rect = field.getBoundingClientRect();
        return rect.top >= 0 && rect.left >= 0 && 
               rect.bottom <= window.innerHeight && 
               rect.right <= window.innerWidth &&
               field.offsetWidth > 0 && field.offsetHeight > 0;
      });
      
      const targetField = visibleFields.length > 0 ? visibleFields[0] : fields[0];
      this.fillField(targetField, code);
    }
  }

  /**
   * Smart submit detection
   */
  tryAutoSubmit(field) {
    const form = field.closest('form');
    if (!form) return;
    
    // Check if all required fields are filled
    const requiredFields = form.querySelectorAll('input[required]');
    const allFilled = Array.from(requiredFields).every(f => f.value.trim() !== '');
    
    if (allFilled) {
      // Look for submit button
      const submitButton = form.querySelector(
        'button[type="submit"], input[type="submit"], button:not([type="button"])'
      );
      
      if (submitButton && !submitButton.disabled) {
        // Check for user preference
        chrome.storage.sync.get(['autoSubmit'], (result) => {
          if (result.autoSubmit !== false) {
            // Give a small delay for any validators to run
            setTimeout(() => {
              submitButton.click();
            }, 100);
          }
        });
      }
    }
  }
}

// Initialize content script
new ContentScript();