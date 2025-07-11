/**
 * Chrome Extension Content Script
 * @module src/content-script
 */

class ContentScript {
  constructor() {
    this.init();
    this.setupStyles();
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
      
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1 && (node.matches('form') || node.querySelector('form'))) {
            shouldEnhance = true;
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
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Initialize content script
new ContentScript();