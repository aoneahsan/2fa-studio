/**
 * Keyboard Shortcuts Service for Browser Extension
 * @module src/keyboard-shortcuts
 */

import { StorageService } from './storage.js';

class KeyboardShortcutsService {
  constructor() {
    this.shortcuts = new Map();
    this.customShortcuts = new Map();
    this.defaultShortcuts = {
      '_execute_action': {
        key: 'Ctrl+Shift+L',
        macKey: 'Command+Shift+L',
        description: 'Open 2FA Studio popup',
        customizable: false
      },
      'fill-code': {
        key: 'Ctrl+Shift+F',
        macKey: 'Command+Shift+F',
        description: 'Fill 2FA code in current field',
        customizable: true
      },
      'scan-qr': {
        key: 'Ctrl+Shift+Q',
        macKey: 'Command+Shift+Q',
        description: 'Scan QR code on page',
        customizable: true
      },
      'copy-code': {
        key: 'Ctrl+Shift+C',
        macKey: 'Command+Shift+C',
        description: 'Copy 2FA code to clipboard',
        customizable: true
      },
      'quick-fill': {
        key: 'Ctrl+Shift+Enter',
        macKey: 'Command+Shift+Enter',
        description: 'Quick fill with auto-detected account',
        customizable: true
      },
      'open-settings': {
        key: 'Ctrl+Shift+S',
        macKey: 'Command+Shift+S',
        description: 'Open extension settings',
        customizable: true
      },
      'toggle-auto-fill': {
        key: 'Ctrl+Shift+A',
        macKey: 'Command+Shift+A',
        description: 'Toggle auto-fill mode',
        customizable: true
      }
    };
    
    this.init();
  }

  async init() {
    await this.loadCustomShortcuts();
    this.setupShortcutListeners();
  }

  async loadCustomShortcuts() {
    try {
      const settings = await StorageService.getSettings();
      this.customShortcuts = new Map(Object.entries(settings.customShortcuts || {}));
    } catch (error) {
      console.error('Failed to load custom shortcuts:', error);
      this.customShortcuts = new Map();
    }
  }

  async saveCustomShortcuts() {
    try {
      const settings = await StorageService.getSettings() || {};
      settings.customShortcuts = Object.fromEntries(this.customShortcuts);
      await StorageService.setSettings(settings);
    } catch (error) {
      console.error('Failed to save custom shortcuts:', error);
    }
  }

  setupShortcutListeners() {
    // Content script keyboard listeners
    if (typeof document !== 'undefined') {
      this.setupContentShortcuts();
    }
  }

  setupContentShortcuts() {
    document.addEventListener('keydown', (event) => {
      const shortcut = this.getShortcutFromEvent(event);
      if (shortcut && this.shouldHandleShortcut(event)) {
        event.preventDefault();
        event.stopPropagation();
        this.handleShortcut(shortcut);
      }
    }, true);
  }

  getShortcutFromEvent(event) {
    const keys = [];
    
    if (event.ctrlKey || event.metaKey) {
      keys.push(navigator.platform.includes('Mac') ? 'Command' : 'Ctrl');
    }
    if (event.shiftKey) keys.push('Shift');
    if (event.altKey) keys.push('Alt');
    
    let keyName = event.key;
    if (keyName === 'Enter') keyName = 'Enter';
    else if (keyName.length === 1) keyName = keyName.toUpperCase();
    
    keys.push(keyName);
    return keys.join('+');
  }

  shouldHandleShortcut(event) {
    // Don't handle shortcuts in input fields unless it's a 2FA field
    const target = event.target;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    
    if (!isInput) return true;
    
    // Check if it's a potential 2FA field
    return this.is2FAField(target);
  }

  is2FAField(element) {
    const patterns = [
      /2fa|two.?factor|authenticator|verification/i,
      /otp|one.?time|token/i,
      /security.?code|auth.?code/i,
      /verify|confirm/i
    ];
    
    const attrs = [
      element.name || '',
      element.id || '',
      element.className || '',
      element.placeholder || '',
      element.autocomplete || ''
    ].join(' ').toLowerCase();
    
    return patterns.some(pattern => pattern.test(attrs));
  }

  async handleShortcut(shortcutKey) {
    const command = this.getCommandForShortcut(shortcutKey);
    if (!command) return;

    try {
      // Send message to background script to handle the command
      chrome.runtime.sendMessage({
        action: 'handleShortcut',
        command: command,
        shortcut: shortcutKey
      });
    } catch (error) {
      console.error('Failed to handle shortcut:', error);
    }
  }

  getCommandForShortcut(shortcutKey) {
    // Check custom shortcuts first
    for (const [command, customKey] of this.customShortcuts) {
      if (customKey === shortcutKey) {
        return command;
      }
    }
    
    // Check default shortcuts
    for (const [command, config] of Object.entries(this.defaultShortcuts)) {
      const isMac = navigator.platform.includes('Mac');
      const expectedKey = isMac ? config.macKey : config.key;
      if (expectedKey === shortcutKey) {
        return command;
      }
    }
    
    return null;
  }

  getAllShortcuts() {
    const shortcuts = {};
    const isMac = navigator.platform.includes('Mac');
    
    for (const [command, config] of Object.entries(this.defaultShortcuts)) {
      shortcuts[command] = {
        ...config,
        currentKey: this.customShortcuts.get(command) || (isMac ? config.macKey : config.key),
        isCustom: this.customShortcuts.has(command)
      };
    }
    
    return shortcuts;
  }

  async setCustomShortcut(command, shortcutKey) {
    if (!this.defaultShortcuts[command]) {
      throw new Error(`Unknown command: ${command}`);
    }
    
    if (!this.defaultShortcuts[command].customizable) {
      throw new Error(`Command ${command} is not customizable`);
    }
    
    // Validate shortcut format
    if (!this.isValidShortcut(shortcutKey)) {
      throw new Error('Invalid shortcut format');
    }
    
    // Check for conflicts
    const conflict = this.findShortcutConflict(shortcutKey, command);
    if (conflict) {
      throw new Error(`Shortcut already used by: ${conflict}`);
    }
    
    this.customShortcuts.set(command, shortcutKey);
    await this.saveCustomShortcuts();
  }

  async resetShortcut(command) {
    if (this.customShortcuts.has(command)) {
      this.customShortcuts.delete(command);
      await this.saveCustomShortcuts();
    }
  }

  async resetAllShortcuts() {
    this.customShortcuts.clear();
    await this.saveCustomShortcuts();
  }

  isValidShortcut(shortcut) {
    // Must contain at least one modifier key
    const hasModifier = /(?:Ctrl|Command|Alt|Shift)\+/.test(shortcut);
    if (!hasModifier) return false;
    
    // Must end with a valid key
    const validKeyPattern = /(?:Ctrl|Command|Alt|Shift)\+(?:[A-Z]|F\d+|Enter|Space|Tab|Escape|Delete|Backspace|Arrow(?:Up|Down|Left|Right))$/;
    return validKeyPattern.test(shortcut);
  }

  findShortcutConflict(shortcutKey, excludeCommand = null) {
    // Check against current shortcuts
    for (const [command, currentKey] of this.customShortcuts) {
      if (command !== excludeCommand && currentKey === shortcutKey) {
        return this.defaultShortcuts[command]?.description || command;
      }
    }
    
    // Check against default shortcuts
    const isMac = navigator.platform.includes('Mac');
    for (const [command, config] of Object.entries(this.defaultShortcuts)) {
      if (command !== excludeCommand && !this.customShortcuts.has(command)) {
        const defaultKey = isMac ? config.macKey : config.key;
        if (defaultKey === shortcutKey) {
          return config.description;
        }
      }
    }
    
    return null;
  }

  getShortcutHelp() {
    const shortcuts = this.getAllShortcuts();
    const help = [];
    
    for (const [command, config] of Object.entries(shortcuts)) {
      help.push({
        command,
        shortcut: config.currentKey,
        description: config.description,
        customizable: config.customizable,
        isCustom: config.isCustom
      });
    }
    
    return help.sort((a, b) => a.description.localeCompare(b.description));
  }

  formatShortcutForDisplay(shortcut) {
    if (!shortcut) return '';
    
    // Replace platform-specific modifiers for display
    const isMac = navigator.platform.includes('Mac');
    if (isMac) {
      return shortcut
        .replace(/Command/g, '⌘')
        .replace(/Shift/g, '⇧')
        .replace(/Alt/g, '⌥')
        .replace(/Ctrl/g, '⌃');
    } else {
      return shortcut.replace(/\+/g, ' + ');
    }
  }

  parseShortcutInput(input) {
    // Convert display format back to internal format
    const isMac = navigator.platform.includes('Mac');
    let shortcut = input.trim();
    
    if (isMac) {
      shortcut = shortcut
        .replace(/⌘/g, 'Command')
        .replace(/⇧/g, 'Shift')
        .replace(/⌥/g, 'Alt')
        .replace(/⌃/g, 'Ctrl');
    }
    
    // Normalize spacing
    shortcut = shortcut.replace(/\s*\+\s*/g, '+');
    
    return shortcut;
  }

  // Export shortcuts configuration
  exportShortcuts() {
    return {
      customShortcuts: Object.fromEntries(this.customShortcuts),
      timestamp: Date.now(),
      version: '1.0'
    };
  }

  // Import shortcuts configuration
  async importShortcuts(config) {
    if (!config || !config.customShortcuts) {
      throw new Error('Invalid shortcuts configuration');
    }
    
    // Validate all shortcuts before importing
    for (const [command, shortcut] of Object.entries(config.customShortcuts)) {
      if (!this.defaultShortcuts[command]) {
        throw new Error(`Unknown command: ${command}`);
      }
      if (!this.isValidShortcut(shortcut)) {
        throw new Error(`Invalid shortcut for ${command}: ${shortcut}`);
      }
    }
    
    // Clear current custom shortcuts and apply new ones
    this.customShortcuts.clear();
    for (const [command, shortcut] of Object.entries(config.customShortcuts)) {
      this.customShortcuts.set(command, shortcut);
    }
    
    await this.saveCustomShortcuts();
  }
}

export { KeyboardShortcutsService };