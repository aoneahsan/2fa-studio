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

// Load keyboard shortcuts service
import { KeyboardShortcutsService } from './keyboard-shortcuts.js';

class ContentScript {
  constructor() {
    this.qrDetector = null;
    this.keyboardShortcuts = new KeyboardShortcutsService();
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
        case 'detectFields': {
          const fields = this.detectOTPFields();
          sendResponse({ fields });
          break;
        }
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
        case 'showSecurityWarning':
          this.showSecurityWarning(request.warning);
          break;
        case 'copyToClipboard':
          this.copyToClipboard(request.text);
          break;
        case 'fillLoginForm':
          this.handleFillLoginForm(request.passwordId, sendResponse);
          return true;
        case 'detectLoginForm':
          this.handleDetectLoginForm(sendResponse);
          return true;
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
        padding: 12px 16px;
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
        z-index: 10001;
        min-width: 180px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .tfa-studio-qr-scan-button:hover {
        background: #0052a3;
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(0, 102, 204, 0.4);
      }

      .tfa-studio-qr-scan-button:disabled {
        opacity: 0.7;
        cursor: not-allowed;
        transform: none;
      }

      .tfa-studio-qr-scan-button.confidence-high {
        border-left: 4px solid #28a745;
      }

      .tfa-studio-qr-scan-button.confidence-medium {
        border-left: 4px solid #ffc107;
      }

      .tfa-studio-qr-scan-button.confidence-low {
        border-left: 4px solid #dc3545;
      }

      .tfa-studio-qr-scan-button.success {
        background: #28a745;
        border-left-color: #ffffff;
      }

      .confidence-indicator {
        position: absolute;
        top: -8px;
        right: -8px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: bold;
      }

      .tfa-studio-qr-dismiss {
        position: absolute;
        top: -8px;
        right: 8px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: rgba(220, 53, 69, 0.9);
        color: white;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: bold;
        transition: all 0.2s;
      }

      .tfa-studio-qr-dismiss:hover {
        background: #dc3545;
        transform: scale(1.1);
      }

      .tfa-studio-qr-highlighted {
        outline: 3px solid #0066cc !important;
        outline-offset: 3px;
        box-shadow: 0 0 0 6px rgba(0, 102, 204, 0.2) !important;
        border-radius: 8px;
        animation: qr-pulse 2s infinite;
      }

      @keyframes qr-pulse {
        0%, 100% {
          box-shadow: 0 0 0 6px rgba(0, 102, 204, 0.2);
        }
        50% {
          box-shadow: 0 0 0 12px rgba(0, 102, 204, 0.1);
        }
      }

      .loading-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      /* Security Warning Styles */
      .tfa-studio-security-warning {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        z-index: 10002;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease-out;
      }

      .security-warning-content {
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
        animation: slideUp 0.3s ease-out;
      }

      .security-warning-content.danger {
        border-top: 4px solid #dc3545;
      }

      .security-warning-content.warning {
        border-top: 4px solid #ffc107;
      }

      .warning-header {
        display: flex;
        align-items: center;
        padding: 20px 24px 16px;
        background: #f8f9fa;
        border-bottom: 1px solid #e9ecef;
      }

      .warning-icon {
        font-size: 24px;
        margin-right: 12px;
      }

      .warning-header h3 {
        flex: 1;
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #212529;
      }

      .warning-close {
        background: none;
        border: none;
        font-size: 24px;
        color: #6c757d;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .warning-close:hover {
        background: #e9ecef;
        color: #495057;
      }

      .warning-body {
        padding: 20px 24px 24px;
      }

      .warning-body p {
        margin: 0 0 20px;
        font-size: 16px;
        line-height: 1.5;
        color: #495057;
      }

      .domain-verification-section {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 16px;
        margin: 16px 0;
        border: 1px solid #e9ecef;
      }

      .trust-score-display {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
        padding: 12px;
        background: white;
        border-radius: 6px;
        border: 1px solid #dee2e6;
      }

      .trust-score-label {
        font-weight: 600;
        color: #495057;
      }

      .trust-score-value {
        font-size: 24px;
        font-weight: 700;
      }

      .trust-score-value.high {
        color: #28a745;
      }

      .trust-score-value.medium {
        color: #ffc107;
      }

      .trust-score-value.low {
        color: #dc3545;
      }

      .verification-checks-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin: 12px 0;
      }

      .verification-check-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        background: white;
        border-radius: 4px;
        font-size: 13px;
        border: 1px solid #e9ecef;
      }

      .check-status-icon {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        color: white;
      }

      .check-status-icon.pass {
        background: #28a745;
      }

      .check-status-icon.fail {
        background: #dc3545;
      }

      .check-status-icon.warn {
        background: #ffc107;
        color: #333;
      }

      .security-recommendations {
        margin: 16px 0;
      }

      .security-recommendations h4 {
        margin: 0 0 8px 0;
        font-size: 14px;
        font-weight: 600;
        color: #495057;
      }

      .recommendations-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .recommendations-list li {
        padding: 6px 0;
        font-size: 13px;
        color: #6c757d;
        display: flex;
        align-items: flex-start;
        gap: 8px;
      }

      .warning-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .warning-actions button {
        padding: 10px 18px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        min-width: 80px;
      }

      .btn-warning-dismiss {
        background: #6c757d;
        color: white;
      }

      .btn-warning-dismiss:hover {
        background: #5a6268;
      }

      .btn-report-site {
        background: #dc3545;
        color: white;
      }

      .btn-report-site:hover {
        background: #c82333;
      }

      .btn-learn-more {
        background: #0066cc;
        color: white;
      }

      .btn-learn-more:hover {
        background: #0052a3;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes slideUp {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
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

      .tfa-studio-group-button {
        background: #0066cc;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 8px rgba(0, 102, 204, 0.3);
      }

      .tfa-studio-group-button:hover {
        background: #0052a3;
        box-shadow: 0 4px 12px rgba(0, 102, 204, 0.4);
      }

      .tfa-studio-group-highlight {
        outline: 2px solid #0066cc !important;
        outline-offset: 1px;
        background-color: rgba(0, 102, 204, 0.05) !important;
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
    const multiDigitGroups = this.detectMultiDigitOTPGroups();
    const processedFields = new Set();
    
    // Enhance multi-digit groups first
    multiDigitGroups.forEach(group => {
      this.enhanceMultiDigitGroup(group);
      group.forEach(field => processedFields.add(field));
    });
    
    // Enhance remaining single fields
    fields.forEach(field => {
      if (field.dataset.tfaStudioEnhanced || processedFields.has(field)) return;
      
      this.enhanceSingleField(field);
    });
  }

  enhanceMultiDigitGroup(group) {
    // Find a suitable position for the group button (usually after the last field)
    const lastField = group[group.length - 1];
    const _container = lastField.closest('div, form, fieldset') || lastField.parentElement;
    
    // Mark all fields as enhanced
    group.forEach(field => {
      field.dataset.tfaStudioEnhanced = 'true';
      field.dataset.tfaStudioGroup = 'true';
    });
    
    // Create group button
    const button = document.createElement('button');
    button.className = 'tfa-studio-button tfa-studio-group-button';
    button.type = 'button';
    button.style.cssText = `
      position: absolute;
      right: -40px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 1000;
    `;
    button.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"></path>
        <path d="M9 12l2 2 4-4"></path>
      </svg>
    `;
    
    // Add tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'tfa-studio-tooltip';
    tooltip.textContent = 'Fill 2FA code across fields';
    
    // Position button relative to the group
    const groupRect = this.getGroupBoundingRect(group);
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      position: absolute;
      left: ${groupRect.right + 5}px;
      top: ${groupRect.top + (groupRect.height / 2) - 16}px;
      z-index: 1000;
    `;
    
    buttonContainer.appendChild(button);
    buttonContainer.appendChild(tooltip);
    document.body.appendChild(buttonContainer);
    
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
          this.fillDigitGroup(group, response.code);
        } else {
          // Open popup if no automatic match
          chrome.runtime.sendMessage({ action: 'openPopup' });
        }
      } catch (error) {
        console.error('Failed to get code:', error);
      }
    });
  }

  enhanceSingleField(field) {
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
  }

  getGroupBoundingRect(group) {
    const rects = group.map(field => field.getBoundingClientRect());
    const left = Math.min(...rects.map(r => r.left));
    const top = Math.min(...rects.map(r => r.top));
    const right = Math.max(...rects.map(r => r.right));
    const bottom = Math.max(...rects.map(r => r.bottom));
    
    return {
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top
    };
  }

  detectOTPFields() {
    const fields = [];
    const selectors = [
      // Common OTP field patterns (case insensitive)
      'input[name*="otp" i]',
      'input[name*="code" i]',
      'input[name*="token" i]',
      'input[name*="verify" i]',
      'input[name*="tfa" i]',
      'input[name*="2fa" i]',
      'input[name*="mfa" i]',
      'input[name*="auth" i]',
      'input[name*="sms" i]',
      'input[name*="pin" i]',
      'input[id*="otp" i]',
      'input[id*="code" i]',
      'input[id*="token" i]',
      'input[id*="verify" i]',
      'input[id*="auth" i]',
      'input[id*="sms" i]',
      'input[id*="pin" i]',
      'input[placeholder*="code" i]',
      'input[placeholder*="token" i]',
      'input[placeholder*="OTP" i]',
      'input[placeholder*="2FA" i]',
      'input[placeholder*="verify" i]',
      'input[placeholder*="auth" i]',
      'input[placeholder*="sms" i]',
      'input[placeholder*="pin" i]',
      'input[aria-label*="code" i]',
      'input[aria-label*="token" i]',
      'input[aria-label*="verify" i]',
      'input[aria-label*="auth" i]',
      // HTML5 autocomplete attributes
      'input[autocomplete="one-time-code"]',
      'input[autocomplete="sms-otp"]',
      // Common numeric patterns for OTP
      'input[inputmode="numeric"][maxlength="4"]',
      'input[inputmode="numeric"][maxlength="5"]',
      'input[inputmode="numeric"][maxlength="6"]',
      'input[inputmode="numeric"][maxlength="7"]',
      'input[inputmode="numeric"][maxlength="8"]',
      'input[inputmode="numeric"][maxlength="9"]',
      'input[inputmode="numeric"][maxlength="10"]',
      // Class-based selectors for common frameworks
      'input[class*="otp" i]',
      'input[class*="code" i]',
      'input[class*="verify" i]',
      'input[class*="auth" i]',
      'input[class*="token" i]',
      // Data attributes
      'input[data-type*="otp" i]',
      'input[data-purpose*="verification" i]',
      'input[data-field*="code" i]'
    ];

    // Find fields by selectors
    selectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(field => {
          if (this.isOTPField(field) && !fields.includes(field)) {
            fields.push(field);
          }
        });
      } catch (e) {
        // Skip invalid selectors
        console.debug('Invalid selector:', selector, e);
      }
    });

    // Also check by context and patterns
    document.querySelectorAll('input[type="text"], input[type="number"], input[type="tel"], input:not([type])').forEach(field => {
      if (this.isOTPFieldByContext(field) && !fields.includes(field)) {
        fields.push(field);
      }
    });

    // Check for multiple single-digit inputs (common pattern)
    const multiDigitGroups = this.detectMultiDigitOTPGroups();
    multiDigitGroups.forEach(group => {
      group.forEach(field => {
        if (!fields.includes(field)) {
          fields.push(field);
        }
      });
    });

    return fields;
  }

  isOTPField(field) {
    // Skip hidden or disabled fields
    if (field.type === 'hidden' || field.disabled) return false;
    
    // Skip invisible fields
    if (field.offsetWidth === 0 && field.offsetHeight === 0) return false;
    
    // Skip fields that are too long for OTP (but allow reasonable ranges)
    if (field.maxLength && field.maxLength > 12) return false;
    
    // Skip email/password fields
    if (field.type === 'email' || field.type === 'password') return false;
    
    // Skip search fields
    if (field.type === 'search') return false;
    
    // Allow specific input types that could be OTP
    const allowedTypes = ['text', 'number', 'tel', 'password', undefined, ''];
    if (field.type && !allowedTypes.includes(field.type)) return false;
    
    return true;
  }

  isOTPFieldByContext(field) {
    // Check surrounding text for OTP-related keywords
    const contexts = [
      field.closest('form'),
      field.closest('div'),
      field.closest('section'),
      field.closest('[class*="otp" i]'),
      field.closest('[class*="verify" i]'),
      field.closest('[class*="auth" i]'),
      field.closest('[class*="code" i]'),
      field.closest('[data-testid*="otp" i]'),
      field.closest('[data-testid*="code" i]'),
      field.closest('label'),
      field.parentElement
    ].filter(Boolean);

    const keywords = [
      'verification code',
      'verify code',
      'authentication code',
      'authenticator code',
      'one-time',
      'one time',
      'otp',
      '2fa',
      'two-factor',
      'two factor',
      'authenticator',
      '6-digit',
      '6 digit',
      '4-digit',
      '4 digit',
      '8-digit',
      '8 digit',
      'security code',
      'sms code',
      'text code',
      'phone code',
      'mobile code',
      'confirmation code',
      'access code',
      'login code',
      'passcode',
      'pin code',
      'verification pin',
      'auth token',
      'backup code',
      'recovery code'
    ];

    for (const context of contexts) {
      if (!context) continue;
      
      const text = context.textContent.toLowerCase();
      const innerHTML = context.innerHTML.toLowerCase();
      
      if (keywords.some(keyword => text.includes(keyword) || innerHTML.includes(keyword))) {
        return true;
      }
    }

    // Check for numeric patterns that suggest OTP
    if (this.hasOTPNumericPattern(field)) {
      return true;
    }

    // Check if field is part of a multi-digit group
    if (this.isPartOfMultiDigitGroup(field)) {
      return true;
    }

    return false;
  }

  hasOTPNumericPattern(field) {
    // Check if field has numeric input mode or pattern
    if (field.inputMode === 'numeric' || field.pattern) {
      return true;
    }

    // Check if field is number type with reasonable maxlength
    if (field.type === 'number' && (!field.maxLength || field.maxLength <= 10)) {
      return true;
    }

    // Check if field has autocomplete for OTP
    if (field.autocomplete && 
        (field.autocomplete.includes('one-time') || 
         field.autocomplete.includes('otp') || 
         field.autocomplete.includes('sms'))) {
      return true;
    }

    return false;
  }

  detectMultiDigitOTPGroups() {
    const groups = [];
    const containers = document.querySelectorAll('form, div, section, fieldset');

    containers.forEach(container => {
      const inputs = Array.from(container.querySelectorAll('input')).filter(input => {
        // Look for single-character or small numeric inputs
        return (
          this.isOTPField(input) &&
          (input.maxLength === 1 || 
           input.maxLength === 2 ||
           (input.type === 'number' && (!input.maxLength || input.maxLength <= 2))) &&
          input.offsetWidth > 0 && 
          input.offsetHeight > 0
        );
      });

      // Group inputs that are close to each other
      if (inputs.length >= 4 && inputs.length <= 10) {
        const positions = inputs.map(input => {
          const rect = input.getBoundingClientRect();
          return { input, x: rect.left, y: rect.top };
        });

        // Sort by position (left to right, top to bottom)
        positions.sort((a, b) => {
          const yDiff = Math.abs(a.y - b.y);
          if (yDiff < 10) { // Same row
            return a.x - b.x;
          }
          return a.y - b.y;
        });

        // Check if inputs are in a reasonable sequence
        let isValidGroup = true;
        for (let i = 1; i < positions.length; i++) {
          const curr = positions[i];
          const prev = positions[i - 1];
          const distance = Math.sqrt(
            Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
          );
          
          // If distance is too large, it's probably not a grouped OTP input
          if (distance > 200) {
            isValidGroup = false;
            break;
          }
        }

        if (isValidGroup) {
          groups.push(positions.map(p => p.input));
        }
      }
    });

    return groups;
  }

  isPartOfMultiDigitGroup(field) {
    const groups = this.detectMultiDigitOTPGroups();
    return groups.some(group => group.includes(field));
  }

  // Removed duplicate fillCode method - using enhanced version below

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

  // Removed duplicate tryAutoSubmit method - using enhanced version below

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
      this.fillMultipleFields([activeElement], code);
      return;
    }

    // Otherwise, find OTP fields and fill the most likely one
    const fields = this.detectOTPFields();
    if (fields.length > 0) {
      // Check if we have multi-digit groups
      const multiDigitGroups = this.detectMultiDigitOTPGroups();
      
      // Prioritize visible fields
      const visibleFields = fields.filter(field => {
        const rect = field.getBoundingClientRect();
        return rect.top >= 0 && rect.left >= 0 && 
               rect.bottom <= window.innerHeight && 
               rect.right <= window.innerWidth &&
               field.offsetWidth > 0 && field.offsetHeight > 0;
      });
      
      // If we have multi-digit groups, try to fill them first
      for (const group of multiDigitGroups) {
        if (group.some(field => visibleFields.includes(field))) {
          this.fillMultipleFields(group, code);
          return;
        }
      }
      
      // Otherwise fill single field
      const targetField = visibleFields.length > 0 ? visibleFields[0] : fields[0];
      this.fillMultipleFields([targetField], code);
    }
  }

  fillMultipleFields(fields, code) {
    if (fields.length === 1) {
      // Single field - fill normally
      this.fillField(fields[0], code);
    } else {
      // Multiple fields - distribute code across them
      this.fillDigitGroup(fields, code);
    }
  }

  fillDigitGroup(fields, code) {
    // Clean the code and convert to string
    const cleanCode = code.toString().replace(/\D/g, '');
    
    // Sort fields by position (left to right, top to bottom)
    const sortedFields = fields.slice().sort((a, b) => {
      const rectA = a.getBoundingClientRect();
      const rectB = b.getBoundingClientRect();
      
      const yDiff = Math.abs(rectA.top - rectB.top);
      if (yDiff < 10) { // Same row
        return rectA.left - rectB.left;
      }
      return rectA.top - rectB.top;
    });

    // Fill each field with a digit
    for (let i = 0; i < Math.min(sortedFields.length, cleanCode.length); i++) {
      const field = sortedFields[i];
      const digit = cleanCode[i];
      
      // Focus the field
      field.focus();
      
      // Clear existing value
      field.value = '';
      
      // Set the digit
      field.value = digit;
      
      // Trigger events
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      field.dispatchEvent(new KeyboardEvent('keyup', { 
        key: digit, 
        bubbles: true 
      }));
      
      // Add success animation
      field.classList.add('tfa-studio-filled');
      setTimeout(() => {
        field.classList.remove('tfa-studio-filled');
      }, 500);
    }

    // Focus the last filled field or next empty field
    const lastFilledIndex = Math.min(sortedFields.length, cleanCode.length) - 1;
    if (lastFilledIndex >= 0 && lastFilledIndex < sortedFields.length - 1) {
      // Focus next field if available
      sortedFields[lastFilledIndex + 1].focus();
    } else if (lastFilledIndex >= 0) {
      // Focus last field
      sortedFields[lastFilledIndex].focus();
    }

    // Try to auto-submit if all fields are filled
    this.tryAutoSubmit(sortedFields[0]);
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

  /**
   * Show security warning overlay
   */
  showSecurityWarning(warning) {
    // Don't show multiple warnings
    if (document.querySelector('.tfa-studio-security-warning')) return;

    const overlay = document.createElement('div');
    overlay.className = 'tfa-studio-security-warning';
    
    // Build domain verification section if available
    let domainVerificationHtml = '';
    if (warning.verification) {
      const verification = warning.verification;
      const trustScore = Math.round(verification.trustScore * 100);
      const trustClass = trustScore >= 70 ? 'high' : trustScore >= 40 ? 'medium' : 'low';
      
      domainVerificationHtml = `
        <div class="domain-verification-section">
          <div class="trust-score-display">
            <span class="trust-score-label">Domain Trust Score:</span>
            <span class="trust-score-value ${trustClass}">${trustScore}%</span>
          </div>
          
          ${this.buildVerificationChecksHtml(verification.checks)}
          
          <div class="security-recommendations">
            <h4>Security Recommendations:</h4>
            <ul class="recommendations-list">
              ${verification.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
          </div>
        </div>
      `;
    }

    overlay.innerHTML = `
      <div class="security-warning-content ${warning.type}">
        <div class="warning-header">
          <div class="warning-icon">
            ${warning.type === 'danger' ? '🛡️' : '⚠️'}
          </div>
          <h3>${warning.title}</h3>
          <button class="warning-close">×</button>
        </div>
        <div class="warning-body">
          <p>${warning.message}</p>
          ${domainVerificationHtml}
          <div class="warning-actions">
            <button class="btn-warning-dismiss">Dismiss</button>
            <button class="btn-report-site">Report This Site</button>
            ${warning.verification ? '<button class="btn-view-details">View Details</button>' : ''}
            <button class="btn-learn-more">Learn More</button>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    overlay.querySelector('.warning-close').addEventListener('click', () => {
      overlay.remove();
    });

    overlay.querySelector('.btn-warning-dismiss').addEventListener('click', () => {
      overlay.remove();
    });

    overlay.querySelector('.btn-report-site').addEventListener('click', () => {
      this.reportPhishingSite();
      overlay.remove();
    });

    if (warning.verification) {
      overlay.querySelector('.btn-view-details')?.addEventListener('click', () => {
        this.showDetailedVerificationInfo(warning.verification);
      });
    }

    overlay.querySelector('.btn-learn-more').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openApp' });
      overlay.remove();
    });

    document.body.appendChild(overlay);

    // Auto-remove after 45 seconds for detailed warnings (more time to read)
    const timeout = warning.verification ? 45000 : 30000;
    setTimeout(() => {
      if (overlay.parentNode && !overlay.querySelector(':hover')) {
        overlay.remove();
      }
    }, timeout);
  }

  buildVerificationChecksHtml(checks) {
    if (!checks) return '';

    const checkItems = [
      { name: 'Safety Check', data: checks.safety },
      { name: 'Ownership', data: checks.ownership },
      { name: 'Threat Intel', data: checks.threat },
      { name: 'Authenticity', data: checks.authenticity }
    ];

    return `
      <div class="verification-checks-grid">
        ${checkItems.map(item => {
          let status = 'fail';
          let icon = '✗';
          
          if (item.data) {
            if ((item.name === 'Safety Check' && item.data.safe) ||
                (item.name === 'Ownership' && item.data.valid) ||
                (item.name === 'Threat Intel' && item.data.clean) ||
                (item.name === 'Authenticity' && item.data.authentic)) {
              status = 'pass';
              icon = '✓';
            } else if (item.data.warning || 
                      (item.name === 'Threat Intel' && item.data.threatLevel === 'medium')) {
              status = 'warn';
              icon = '!';
            }
          }
          
          return `
            <div class="verification-check-item">
              <div class="check-status-icon ${status}">${icon}</div>
              <span>${item.name}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  showDetailedVerificationInfo(verification) {
    const detailsOverlay = document.createElement('div');
    detailsOverlay.className = 'tfa-studio-security-warning';
    detailsOverlay.innerHTML = `
      <div class="security-warning-content">
        <div class="warning-header">
          <div class="warning-icon">🔍</div>
          <h3>Domain Verification Details</h3>
          <button class="warning-close">×</button>
        </div>
        <div class="warning-body">
          <div class="domain-verification-section">
            <h4>Domain: ${verification.domain}</h4>
            <div class="trust-score-display">
              <span class="trust-score-label">Trust Score:</span>
              <span class="trust-score-value ${verification.trustScore >= 0.7 ? 'high' : verification.trustScore >= 0.4 ? 'medium' : 'low'}">
                ${Math.round(verification.trustScore * 100)}%
              </span>
            </div>
            
            <div style="margin: 16px 0;">
              <h4>Detailed Check Results:</h4>
              ${this.buildDetailedChecksHtml(verification.checks)}
            </div>
            
            <div class="security-recommendations">
              <h4>All Recommendations:</h4>
              <ul class="recommendations-list">
                ${verification.recommendations.map(rec => `<li>${rec}</li>`).join('')}
              </ul>
            </div>
          </div>
          
          <div class="warning-actions">
            <button class="btn-warning-dismiss">Close</button>
            <button class="btn-report-site">Report Issue</button>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    detailsOverlay.querySelector('.warning-close').addEventListener('click', () => {
      detailsOverlay.remove();
    });

    detailsOverlay.querySelector('.btn-warning-dismiss').addEventListener('click', () => {
      detailsOverlay.remove();
    });

    detailsOverlay.querySelector('.btn-report-site').addEventListener('click', () => {
      this.reportPhishingSite();
      detailsOverlay.remove();
    });

    document.body.appendChild(detailsOverlay);
  }

  buildDetailedChecksHtml(checks) {
    let html = '<div style="font-size: 13px; line-height: 1.4;">';
    
    if (checks.safety) {
      html += `<div style="margin-bottom: 12px;"><strong>Safety:</strong> ${checks.safety.reason || 'Check completed'}</div>`;
    }
    
    if (checks.ownership) {
      html += `<div style="margin-bottom: 12px;"><strong>Ownership:</strong> Confidence ${Math.round((checks.ownership.confidence || 0) * 100)}%</div>`;
    }
    
    if (checks.threat) {
      html += `<div style="margin-bottom: 12px;"><strong>Threat Level:</strong> ${checks.threat.threatLevel || 'Unknown'}</div>`;
    }
    
    if (checks.authenticity) {
      html += `<div style="margin-bottom: 12px;"><strong>Authenticity:</strong> Confidence ${Math.round((checks.authenticity.confidence || 0) * 100)}%</div>`;
    }
    
    html += '</div>';
    return html;
  }

  /**
   * Report phishing site
   */
  async reportPhishingSite() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'reportPhishing',
        domain: window.location.hostname,
        reason: 'User reported suspicious activity'
      });

      if (response.success) {
        this.showNotification('Site reported successfully', 'success');
      } else {
        this.showNotification('Failed to report site', 'error');
      }
    } catch (error) {
      console.error('Failed to report phishing site:', error);
      this.showNotification('Error reporting site', 'error');
    }
  }

  /**
   * Enhanced request code with security validation
   */
  async requestCodeWithSecurity() {
    try {
      // Check security first
      const securityResponse = await chrome.runtime.sendMessage({
        action: 'checkSecurity',
        url: window.location.href
      });

      if (!securityResponse.success || !securityResponse.data.valid) {
        this.showSecurityWarning({
          type: 'danger',
          title: 'Security Warning',
          message: securityResponse.data.reason || 'This site may not be safe for 2FA operations'
        });
        return null;
      }

      // Proceed with normal code request
      const response = await chrome.runtime.sendMessage({
        action: 'requestCode',
        pageInfo: {
          url: window.location.href,
          domain: window.location.hostname
        }
      });

      if (response.securityWarning) {
        this.showSecurityWarning({
          type: 'warning',
          title: 'Security Notice',
          message: response.reason
        });
        return null;
      }

      return response;
    } catch (error) {
      console.error('Failed to request code with security:', error);
      return null;
    }
  }

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showNotification('Code copied to clipboard', 'success');
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        this.showNotification('Code copied to clipboard', 'success');
      } catch (fallbackError) {
        console.error('Failed to copy to clipboard:', fallbackError);
        this.showNotification('Failed to copy to clipboard', 'error');
      } finally {
        document.body.removeChild(textArea);
      }
    }
  }

  /**
   * Handle fill login form request
   */
  async handleFillLoginForm(passwordId, sendResponse) {
    try {
      // Get password data from background
      const passwordResponse = await chrome.runtime.sendMessage({
        action: 'getPassword',
        id: passwordId
      });

      if (!passwordResponse.success) {
        sendResponse({ success: false, error: passwordResponse.error });
        return;
      }

      const password = passwordResponse.password;
      
      // Detect login form
      const forms = this.detectLoginForms();
      if (forms.length === 0) {
        sendResponse({ success: false, error: 'No login form detected' });
        return;
      }

      const loginForm = forms[0]; // Use the best match

      // Fill the form
      if (loginForm.usernameField) {
        this.fillFormField(loginForm.usernameField, password.username);
      }

      if (loginForm.passwordField) {
        this.fillFormField(loginForm.passwordField, password.password);
      }

      this.showNotification('Login credentials filled', 'success');
      sendResponse({ success: true });
    } catch (_error) {
      console.error('Failed to fill login form:', _error);
      sendResponse({ success: false, error: _error.message });
    }
  }

  /**
   * Handle detect login form request
   */
  handleDetectLoginForm(sendResponse) {
    try {
      const forms = this.detectLoginForms();
      sendResponse({ success: true, forms: forms });
    } catch (_error) {
      console.error('Failed to detect login form:', _error);
      sendResponse({ success: false, error: _error.message });
    }
  }

  /**
   * Detect login forms on the page
   */
  detectLoginForms() {
    const forms = document.querySelectorAll('form');
    const results = [];

    for (const form of forms) {
      const usernameField = this.findUsernameField(form);
      const passwordField = this.findPasswordField(form);

      if (usernameField && passwordField) {
        results.push({
          form: form,
          usernameField: usernameField,
          passwordField: passwordField,
          confidence: this.calculateFormConfidence(form, usernameField, passwordField)
        });
      }
    }

    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);
    return results;
  }

  /**
   * Find username field in form
   */
  findUsernameField(form) {
    const selectors = [
      'input[type="email"]',
      'input[type="text"][name*="user"]',
      'input[type="text"][name*="email"]',
      'input[type="text"][name*="login"]',
      'input[type="text"][id*="user"]',
      'input[type="text"][id*="email"]',
      'input[type="text"][id*="login"]',
      'input[autocomplete="username"]',
      'input[autocomplete="email"]'
    ];

    for (const selector of selectors) {
      const field = form.querySelector(selector);
      if (field && this.isVisibleFormField(field)) {
        return field;
      }
    }

    // Fallback: first visible text input
    const textInputs = form.querySelectorAll('input[type="text"]');
    for (const input of textInputs) {
      if (this.isVisibleFormField(input)) {
        return input;
      }
    }

    return null;
  }

  /**
   * Find password field in form
   */
  findPasswordField(form) {
    const passwordFields = form.querySelectorAll('input[type="password"]');
    
    for (const field of passwordFields) {
      if (this.isVisibleFormField(field)) {
        return field;
      }
    }

    return null;
  }

  /**
   * Check if form field is visible
   */
  isVisibleFormField(field) {
    const rect = field.getBoundingClientRect();
    const style = window.getComputedStyle(field);
    
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0'
    );
  }

  /**
   * Calculate form confidence score
   */
  calculateFormConfidence(form, usernameField, passwordField) {
    let confidence = 0.5;

    // Check for login-related keywords
    const formText = form.textContent.toLowerCase();
    const loginKeywords = ['login', 'sign in', 'log in', 'authenticate'];
    
    for (const keyword of loginKeywords) {
      if (formText.includes(keyword)) {
        confidence += 0.2;
        break;
      }
    }

    // Check field attributes
    if (usernameField.autocomplete === 'username' || usernameField.autocomplete === 'email') {
      confidence += 0.1;
    }

    if (passwordField.autocomplete === 'current-password') {
      confidence += 0.1;
    }

    // Check for submit button
    const submitButton = form.querySelector('input[type="submit"], button[type="submit"], button:not([type])');
    if (submitButton) {
      const buttonText = submitButton.textContent.toLowerCase();
      if (buttonText.includes('login') || buttonText.includes('sign in')) {
        confidence += 0.1;
      }
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Fill a form field with value
   */
  fillFormField(field, value) {
    // Focus field
    field.focus();
    
    // Clear existing value
    field.value = '';
    
    // Set new value
    field.value = value;
    
    // Trigger events
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  /**
   * Show security notification
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
}

// Initialize content script
new ContentScript();