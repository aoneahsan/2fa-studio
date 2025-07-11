/**
 * Message Service for Chrome Extension
 * @module src/message
 */

export class MessageService {
  /**
   * Send message to background script
   */
  static async sendToBackground(action, data = {}) {
    try {
      const response = await chrome.runtime.sendMessage({
        action,
        ...data
      });
      
      if (response && response.error) {
        throw new Error(response.error);
      }
      
      return response;
    } catch (error) {
      console.error('Failed to send message to background:', error);
      throw error;
    }
  }

  /**
   * Send message to content script
   */
  static async sendToContent(tabId, action, data = {}) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        action,
        ...data
      });
      
      if (response && response.error) {
        throw new Error(response.error);
      }
      
      return response;
    } catch (error) {
      console.error('Failed to send message to content:', error);
      throw error;
    }
  }

  /**
   * Send message to all tabs
   */
  static async broadcast(action, data = {}) {
    try {
      const tabs = await chrome.tabs.query({});
      const promises = tabs.map(tab => 
        this.sendToContent(tab.id, action, data).catch(() => null)
      );
      
      return Promise.all(promises);
    } catch (error) {
      console.error('Failed to broadcast message:', error);
      throw error;
    }
  }

  /**
   * Send message to active tab
   */
  static async sendToActiveTab(action, data = {}) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error('No active tab found');
      }
      
      return this.sendToContent(tab.id, action, data);
    } catch (error) {
      console.error('Failed to send message to active tab:', error);
      throw error;
    }
  }

  /**
   * Listen for messages
   */
  static listen(handlers) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      const handler = handlers[request.action];
      
      if (handler) {
        // Handle async handlers
        const result = handler(request, sender);
        
        if (result instanceof Promise) {
          result
            .then(response => sendResponse({ success: true, data: response }))
            .catch(error => sendResponse({ success: false, error: error.message }));
          
          return true; // Keep channel open for async response
        } else {
          sendResponse({ success: true, data: result });
        }
      } else {
        sendResponse({ success: false, error: 'Unknown action' });
      }
    });
  }

  /**
   * Create a message channel for persistent communication
   */
  static createChannel(name) {
    const port = chrome.runtime.connect({ name });
    
    return {
      send: (action, data) => {
        port.postMessage({ action, ...data });
      },
      
      listen: (handlers) => {
        port.onMessage.addListener((request) => {
          const handler = handlers[request.action];
          if (handler) {
            handler(request);
          }
        });
      },
      
      disconnect: () => {
        port.disconnect();
      }
    };
  }
}