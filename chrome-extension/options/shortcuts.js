/**
 * Keyboard Shortcuts Settings Page
 * @module options/shortcuts
 */

class ShortcutsManager {
  constructor() {
    this.shortcuts = {};
    this.currentCommand = null;
    this.isListening = false;
    
    this.init();
  }

  async init() {
    this.bindEvents();
    await this.loadShortcuts();
    this.renderShortcuts();
  }

  bindEvents() {
    // Modal controls
    document.getElementById('closeModal').addEventListener('click', () => {
      this.closeModal();
    });

    document.getElementById('closeImportModal').addEventListener('click', () => {
      this.closeImportModal();
    });

    document.getElementById('cancelEdit').addEventListener('click', () => {
      this.closeModal();
    });

    document.getElementById('cancelImport').addEventListener('click', () => {
      this.closeImportModal();
    });

    document.getElementById('saveShortcut').addEventListener('click', () => {
      this.saveCurrentShortcut();
    });

    document.getElementById('resetShortcut').addEventListener('click', () => {
      this.resetCurrentShortcut();
    });

    document.getElementById('confirmImport').addEventListener('click', () => {
      this.importShortcuts();
    });

    // Header actions
    document.getElementById('resetAllBtn').addEventListener('click', () => {
      this.resetAllShortcuts();
    });

    document.getElementById('exportBtn').addEventListener('click', () => {
      this.exportShortcuts();
    });

    document.getElementById('importBtn').addEventListener('click', () => {
      this.openImportModal();
    });

    // Shortcut input
    const shortcutInput = document.getElementById('shortcutInput');
    shortcutInput.addEventListener('keydown', (e) => {
      if (this.isListening) {
        this.handleShortcutInput(e);
      }
    });

    shortcutInput.addEventListener('focus', () => {
      this.isListening = true;
      shortcutInput.placeholder = 'Press keys...';
    });

    shortcutInput.addEventListener('blur', () => {
      this.isListening = false;
      shortcutInput.placeholder = 'Click to set shortcut';
    });

    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.closeModal();
        this.closeImportModal();
      }
    });

    // Handle escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
        this.closeImportModal();
      }
    });
  }

  async loadShortcuts() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getShortcuts'
      });

      if (response.success) {
        this.shortcuts = response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Failed to load shortcuts:', error);
      this.showStatus('Failed to load shortcuts', 'error');
    }
  }

  renderShortcuts() {
    const container = document.getElementById('shortcutsList');
    container.innerHTML = '';

    Object.entries(this.shortcuts).forEach(([command, config]) => {
      const shortcutItem = this.createShortcutItem(command, config);
      container.appendChild(shortcutItem);
    });
  }

  createShortcutItem(command, config) {
    const item = document.createElement('div');
    item.className = `shortcut-item ${!config.customizable ? 'non-customizable' : ''}`;
    
    if (config.customizable) {
      item.addEventListener('click', () => {
        this.editShortcut(command, config);
      });
    }

    const keys = this.parseShortcutKeys(config.currentKey);
    const statusClass = config.isCustom ? 'custom' : 
                       !config.customizable ? 'non-customizable' : 'default';
    const statusText = config.isCustom ? 'Custom' : 
                      !config.customizable ? 'System' : 'Default';

    item.innerHTML = `
      <div class="shortcut-info">
        <div class="shortcut-command">${this.formatCommandName(command)}</div>
        <div class="shortcut-description">${config.description}</div>
      </div>
      <div class="shortcut-keys">
        ${keys.map(key => `
          <span class="shortcut-key ${this.isModifierKey(key) ? 'modifier' : ''}">${key}</span>
        `).join('')}
        <span class="shortcut-status ${statusClass}">${statusText}</span>
      </div>
    `;

    return item;
  }

  formatCommandName(command) {
    return command
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .replace('_execute_action', 'Open Popup');
  }

  parseShortcutKeys(shortcut) {
    if (!shortcut) return ['None'];
    
    const isMac = navigator.platform.includes('Mac');
    let keys = shortcut.split('+');
    
    // Replace platform-specific modifiers for display
    keys = keys.map(key => {
      if (isMac) {
        switch (key) {
          case 'Command': return '⌘';
          case 'Shift': return '⇧';
          case 'Alt': return '⌥';
          case 'Ctrl': return '⌃';
          default: return key;
        }
      } else {
        return key;
      }
    });
    
    return keys;
  }

  isModifierKey(key) {
    return ['Ctrl', 'Command', 'Shift', 'Alt', '⌘', '⇧', '⌥', '⌃'].includes(key);
  }

  editShortcut(command, config) {
    this.currentCommand = command;
    
    document.getElementById('modalTitle').textContent = `Edit ${this.formatCommandName(command)}`;
    document.getElementById('shortcutInput').value = this.formatShortcutForInput(config.currentKey);
    document.getElementById('conflictWarning').style.display = 'none';
    
    this.openModal();
  }

  formatShortcutForInput(shortcut) {
    const isMac = navigator.platform.includes('Mac');
    if (isMac) {
      return shortcut
        .replace(/Command/g, '⌘')
        .replace(/Shift/g, '⇧')
        .replace(/Alt/g, '⌥')
        .replace(/Ctrl/g, '⌃');
    }
    return shortcut.replace(/\+/g, ' + ');
  }

  handleShortcutInput(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const keys = [];
    
    if (event.ctrlKey || event.metaKey) {
      keys.push(navigator.platform.includes('Mac') ? 'Command' : 'Ctrl');
    }
    if (event.shiftKey) keys.push('Shift');
    if (event.altKey) keys.push('Alt');
    
    let keyName = event.key;
    if (keyName === 'Control' || keyName === 'Shift' || keyName === 'Alt' || keyName === 'Meta') {
      // Don't add modifier keys as the main key
      return;
    }
    
    if (keyName === 'Enter') keyName = 'Enter';
    else if (keyName === ' ') keyName = 'Space';
    else if (keyName === 'Escape') keyName = 'Escape';
    else if (keyName.startsWith('F') && keyName.length <= 3) keyName = keyName; // Function keys
    else if (keyName.length === 1) keyName = keyName.toUpperCase();
    else return; // Invalid key
    
    keys.push(keyName);
    const shortcut = keys.join('+');
    
    // Check if shortcut is valid
    if (keys.length < 2) {
      return; // Must have at least one modifier
    }
    
    // Update input display
    const input = document.getElementById('shortcutInput');
    input.value = this.formatShortcutForInput(shortcut);
    
    // Check for conflicts
    this.checkShortcutConflict(shortcut);
  }

  async checkShortcutConflict(shortcut) {
    const conflictWarning = document.getElementById('conflictWarning');
    const conflictText = document.getElementById('conflictText');
    
    // Check against other shortcuts
    let conflictFound = false;
    let conflictCommand = '';
    
    for (const [command, config] of Object.entries(this.shortcuts)) {
      if (command !== this.currentCommand && config.currentKey === shortcut) {
        conflictFound = true;
        conflictCommand = this.formatCommandName(command);
        break;
      }
    }
    
    if (conflictFound) {
      conflictWarning.style.display = 'flex';
      conflictText.textContent = `This shortcut is already used by: ${conflictCommand}`;
      document.getElementById('saveShortcut').disabled = true;
    } else {
      conflictWarning.style.display = 'none';
      document.getElementById('saveShortcut').disabled = false;
    }
  }

  async saveCurrentShortcut() {
    if (!this.currentCommand) return;
    
    const input = document.getElementById('shortcutInput');
    const shortcut = this.parseShortcutFromInput(input.value);
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'setCustomShortcut',
        command: this.currentCommand,
        shortcut: shortcut
      });
      
      if (response.success) {
        this.showStatus('Shortcut updated successfully', 'success');
        await this.loadShortcuts();
        this.renderShortcuts();
        this.closeModal();
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Failed to save shortcut:', error);
      this.showStatus(`Failed to save shortcut: ${error.message}`, 'error');
    }
  }

  parseShortcutFromInput(input) {
    const isMac = navigator.platform.includes('Mac');
    if (isMac) {
      return input
        .replace(/⌘/g, 'Command')
        .replace(/⇧/g, 'Shift')
        .replace(/⌥/g, 'Alt')
        .replace(/⌃/g, 'Ctrl');
    }
    return input.replace(/\s*\+\s*/g, '+');
  }

  async resetCurrentShortcut() {
    if (!this.currentCommand) return;
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'resetShortcut',
        command: this.currentCommand
      });
      
      if (response.success) {
        this.showStatus('Shortcut reset to default', 'success');
        await this.loadShortcuts();
        this.renderShortcuts();
        this.closeModal();
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Failed to reset shortcut:', error);
      this.showStatus(`Failed to reset shortcut: ${error.message}`, 'error');
    }
  }

  async resetAllShortcuts() {
    if (!confirm('Are you sure you want to reset all shortcuts to their defaults?')) {
      return;
    }
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'resetAllShortcuts'
      });
      
      if (response.success) {
        this.showStatus('All shortcuts reset to defaults', 'success');
        await this.loadShortcuts();
        this.renderShortcuts();
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Failed to reset all shortcuts:', error);
      this.showStatus(`Failed to reset shortcuts: ${error.message}`, 'error');
    }
  }

  async exportShortcuts() {
    try {
      // Get custom shortcuts only
      const customShortcuts = {};
      Object.entries(this.shortcuts).forEach(([command, config]) => {
        if (config.isCustom) {
          customShortcuts[command] = config.currentKey;
        }
      });
      
      const exportData = {
        customShortcuts,
        timestamp: Date.now(),
        version: '1.0'
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `2fa-studio-shortcuts-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      this.showStatus('Shortcuts exported successfully', 'success');
    } catch (error) {
      console.error('Failed to export shortcuts:', error);
      this.showStatus('Failed to export shortcuts', 'error');
    }
  }

  openImportModal() {
    document.getElementById('importModal').classList.add('show');
    document.getElementById('importData').value = '';
  }

  closeImportModal() {
    document.getElementById('importModal').classList.remove('show');
  }

  async importShortcuts() {
    const importData = document.getElementById('importData').value.trim();
    
    if (!importData) {
      this.showStatus('Please paste shortcuts configuration', 'error');
      return;
    }
    
    try {
      const config = JSON.parse(importData);
      
      if (!config.customShortcuts || typeof config.customShortcuts !== 'object') {
        throw new Error('Invalid configuration format');
      }
      
      // Import shortcuts one by one
      let imported = 0;
      for (const [command, shortcut] of Object.entries(config.customShortcuts)) {
        try {
          const response = await chrome.runtime.sendMessage({
            action: 'setCustomShortcut',
            command: command,
            shortcut: shortcut
          });
          
          if (response.success) {
            imported++;
          }
        } catch (error) {
          console.warn(`Failed to import shortcut for ${command}:`, error);
        }
      }
      
      if (imported > 0) {
        this.showStatus(`Successfully imported ${imported} shortcuts`, 'success');
        await this.loadShortcuts();
        this.renderShortcuts();
      } else {
        this.showStatus('No shortcuts were imported', 'error');
      }
      
      this.closeImportModal();
    } catch (error) {
      console.error('Failed to import shortcuts:', error);
      this.showStatus('Failed to import shortcuts: Invalid format', 'error');
    }
  }

  openModal() {
    document.getElementById('shortcutModal').classList.add('show');
    setTimeout(() => {
      document.getElementById('shortcutInput').focus();
    }, 100);
  }

  closeModal() {
    document.getElementById('shortcutModal').classList.remove('show');
    this.currentCommand = null;
    this.isListening = false;
  }

  showStatus(message, type = 'info') {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type} show`;
    
    setTimeout(() => {
      statusEl.classList.remove('show');
    }, 4000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ShortcutsManager();
});