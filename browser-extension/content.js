/**
 * Content Script
 * Detects 2FA input fields and enables auto-fill
 */

// State
let matchingAccounts = [];
let isInjected = false;

// Common 2FA field selectors
const OTP_SELECTORS = [
  'input[type="text"][name*="otp"]',
  'input[type="text"][name*="code"]',
  'input[type="text"][name*="token"]',
  'input[type="text"][name*="2fa"]',
  'input[type="text"][name*="mfa"]',
  'input[type="text"][name*="totp"]',
  'input[type="text"][name*="verification"]',
  'input[type="text"][id*="otp"]',
  'input[type="text"][id*="code"]',
  'input[type="text"][id*="token"]',
  'input[type="text"][placeholder*="code"]',
  'input[type="text"][placeholder*="otp"]',
  'input[type="text"][placeholder*="token"]',
  'input[type="number"][maxlength="6"]',
  'input[type="tel"][maxlength="6"]'
];

// Initialize
initialize();

function initialize() {
  // Detect 2FA fields on page load
  detectOTPFields();
  
  // Watch for DOM changes
  observeDOM();
  
  // Listen for messages
  chrome.runtime.onMessage.addListener(handleMessage);
}

// Detect OTP fields
function detectOTPFields() {
  const fields = findOTPFields();
  
  if (fields.length > 0) {
    console.log('2FA fields detected:', fields.length);
    
    // Notify background script
    chrome.runtime.sendMessage({
      type: 'OTP_FIELDS_DETECTED',
      count: fields.length,
      url: window.location.href
    });
    
    // Add indicators to fields
    fields.forEach(field => {
      addFieldIndicator(field);
    });
  }
}

// Find OTP fields
function findOTPFields() {
  const fields = [];
  
  OTP_SELECTORS.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      if (!fields.includes(el) && isVisible(el)) {
        fields.push(el);
      }
    });
  });
  
  return fields;
}

// Check if element is visible
function isVisible(element) {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         element.offsetParent !== null;
}

// Add field indicator
function addFieldIndicator(field) {
  if (field.dataset.twoFaStudio) return;
  
  field.dataset.twoFaStudio = 'true';
  field.style.position = 'relative';
  
  // Add subtle border
  field.addEventListener('focus', () => {
    if (matchingAccounts.length > 0) {
      field.style.borderColor = '#3b82f6';
      showAutoFillButton(field);
    }
  });
  
  field.addEventListener('blur', () => {
    field.style.borderColor = '';
    hideAutoFillButton();
  });
}

// Show auto-fill button
function showAutoFillButton(field) {
  hideAutoFillButton();
  
  const button = document.createElement('button');
  button.id = '2fa-studio-autofill';
  button.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 2V8L11 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
    </svg>
    <span>Fill 2FA Code</span>
  `;
  
  // Style the button
  Object.assign(button.style, {
    position: 'absolute',
    top: `${field.offsetTop}px`,
    left: `${field.offsetLeft + field.offsetWidth + 10}px`,
    padding: '6px 12px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    zIndex: '9999'
  });
  
  button.addEventListener('click', (e) => {
    e.preventDefault();
    requestAutoFill(field);
  });
  
  document.body.appendChild(button);
}

// Hide auto-fill button
function hideAutoFillButton() {
  const button = document.getElementById('2fa-studio-autofill');
  if (button) {
    button.remove();
  }
}

// Request auto-fill
async function requestAutoFill(field) {
  if (matchingAccounts.length === 0) return;
  
  // For now, use the first matching account
  const account = matchingAccounts[0];
  
  chrome.runtime.sendMessage({
    type: 'AUTO_FILL',
    accountId: account.id
  });
}

// Handle messages
function handleMessage(request, sender, sendResponse) {
  switch (request.type) {
    case 'MATCHING_ACCOUNTS':
      matchingAccounts = request.accounts;
      break;
      
    case 'FILL_CODE':
      fillCode(request.code);
      break;
  }
}

// Fill code into field
function fillCode(code) {
  const fields = findOTPFields();
  
  if (fields.length > 0) {
    const field = fields[0];
    field.value = code;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Visual feedback
    field.style.backgroundColor = '#d1fae5';
    setTimeout(() => {
      field.style.backgroundColor = '';
    }, 2000);
  }
}

// Observe DOM changes
function observeDOM() {
  const observer = new MutationObserver(() => {
    detectOTPFields();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Inject styles
if (!isInjected) {
  const style = document.createElement('style');
  style.textContent = `
    input[data-two-fa-studio]:focus {
      outline: 2px solid #3b82f6 !important;
      outline-offset: 2px;
    }
  `;
  document.head.appendChild(style);
  isInjected = true;
}