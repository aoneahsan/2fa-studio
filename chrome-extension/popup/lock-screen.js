/**
 * Lock Screen Script
 * @module lock-screen
 */

class LockScreen {
  constructor() {
    this.elements = {
      form: document.getElementById('unlockForm'),
      pinInput: document.getElementById('pinInput'),
      errorMessage: document.getElementById('errorMessage'),
      lockoutMessage: document.getElementById('lockoutMessage'),
      lockoutTimer: document.getElementById('lockoutTimer'),
      forgotPinBtn: document.getElementById('forgotPinBtn')
    };
    
    this.lockoutInterval = null;
    this.init();
  }

  init() {
    // Set up event listeners
    this.elements.form.addEventListener('submit', (e) => this.handleSubmit(e));
    this.elements.forgotPinBtn.addEventListener('click', () => this.handleForgotPin());
    
    // Focus on PIN input
    this.elements.pinInput.focus();
    
    // Check if locked out
    this.checkLockout();
  }

  async handleSubmit(e) {
    e.preventDefault();
    
    const pin = this.elements.pinInput.value.trim();
    if (!pin) {
      this.showError('Please enter your PIN');
      return;
    }
    
    // Disable form while verifying
    this.setLoading(true);
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'verifyExtensionPin',
        pin: pin
      });
      
      if (response.success) {
        // Successfully unlocked - close this window and open main popup
        window.close();
        chrome.action.openPopup();
      } else {
        // Clear input
        this.elements.pinInput.value = '';
        
        if (response.lockedOut) {
          // Show lockout screen
          this.showLockout(response.remainingTime);
        } else {
          // Show error
          this.showError(response.error || 'Invalid PIN');
          
          // Shake animation
          this.elements.pinInput.classList.add('shake');
          setTimeout(() => {
            this.elements.pinInput.classList.remove('shake');
          }, 500);
        }
      }
    } catch (error) {
      console.error('Failed to verify PIN:', error);
      this.showError('Failed to verify PIN');
    } finally {
      this.setLoading(false);
    }
  }

  showError(message) {
    this.elements.errorMessage.textContent = message;
    this.elements.errorMessage.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.elements.errorMessage.classList.add('hidden');
    }, 5000);
  }

  showLockout(remainingSeconds = 300) {
    // Hide form, show lockout message
    this.elements.form.classList.add('hidden');
    this.elements.lockoutMessage.classList.remove('hidden');
    
    // Update timer
    this.updateLockoutTimer(remainingSeconds);
    
    // Start countdown
    this.lockoutInterval = setInterval(() => {
      remainingSeconds--;
      this.updateLockoutTimer(remainingSeconds);
      
      if (remainingSeconds <= 0) {
        this.clearLockout();
      }
    }, 1000);
  }

  updateLockoutTimer(seconds) {
    this.elements.lockoutTimer.textContent = seconds;
  }

  clearLockout() {
    if (this.lockoutInterval) {
      clearInterval(this.lockoutInterval);
      this.lockoutInterval = null;
    }
    
    // Show form, hide lockout message
    this.elements.form.classList.remove('hidden');
    this.elements.lockoutMessage.classList.add('hidden');
    
    // Clear and focus input
    this.elements.pinInput.value = '';
    this.elements.pinInput.focus();
  }

  async checkLockout() {
    try {
      const lockState = await chrome.storage.local.get(['lockoutEndTime']);
      if (lockState.lockoutEndTime) {
        const remaining = Math.ceil((lockState.lockoutEndTime - Date.now()) / 1000);
        if (remaining > 0) {
          this.showLockout(remaining);
        }
      }
    } catch (error) {
      console.error('Failed to check lockout state:', error);
    }
  }

  setLoading(loading) {
    this.elements.pinInput.disabled = loading;
    const submitBtn = this.elements.form.querySelector('button[type="submit"]');
    submitBtn.disabled = loading;
    
    if (loading) {
      submitBtn.classList.add('loading');
    } else {
      submitBtn.classList.remove('loading');
    }
  }

  async handleForgotPin() {
    const confirmed = confirm(
      'Removing your PIN will require you to set a new one.\n\n' +
      'Note: This will NOT delete your 2FA accounts.\n\n' +
      'Continue?'
    );
    
    if (confirmed) {
      try {
        // Remove PIN through background
        const response = await chrome.runtime.sendMessage({
          action: 'removeExtensionPin'
        });
        
        if (response.success) {
          // Close lock screen and open settings
          window.close();
          chrome.tabs.create({ 
            url: chrome.runtime.getURL('options/options.html#security') 
          });
        }
      } catch (error) {
        console.error('Failed to remove PIN:', error);
        this.showError('Failed to remove PIN');
      }
    }
  }
}

// Add shake animation
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
  }
  
  .shake {
    animation: shake 0.5s;
  }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new LockScreen();
});