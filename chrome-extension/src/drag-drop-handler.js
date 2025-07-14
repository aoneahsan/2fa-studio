/**
 * Drag and Drop Handler for Account Organization
 */

import categoriesService from './categories-service.js';

class DragDropHandler {
  constructor() {
    this.draggedElement = null;
    this.draggedAccountId = null;
    this.dropTargets = new Set();
    this.placeholder = null;
    this.callbacks = {
      onDragStart: null,
      onDragEnd: null,
      onDrop: null,
      onReorder: null
    };
  }

  /**
   * Initialize drag and drop for a container
   */
  initialize(container, options = {}) {
    this.container = container;
    this.options = {
      draggableSelector: '.account-item',
      handleSelector: '.drag-handle',
      dropZoneSelector: '.category-drop-zone',
      placeholderClass: 'drag-placeholder',
      draggingClass: 'dragging',
      dragOverClass: 'drag-over',
      ...options
    };

    // Set callbacks
    if (options.callbacks) {
      Object.assign(this.callbacks, options.callbacks);
    }

    this.attachEventListeners();
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Delegate events to container
    this.container.addEventListener('dragstart', this.handleDragStart.bind(this));
    this.container.addEventListener('dragend', this.handleDragEnd.bind(this));
    this.container.addEventListener('dragover', this.handleDragOver.bind(this));
    this.container.addEventListener('drop', this.handleDrop.bind(this));
    this.container.addEventListener('dragenter', this.handleDragEnter.bind(this));
    this.container.addEventListener('dragleave', this.handleDragLeave.bind(this));

    // Touch support
    if ('ontouchstart' in window) {
      this.initializeTouchSupport();
    }
  }

  /**
   * Make elements draggable
   */
  makeDraggable(elements) {
    elements.forEach(element => {
      element.draggable = true;
      element.classList.add('draggable');
      
      // Add drag handle if specified
      if (this.options.handleSelector) {
        const handle = element.querySelector(this.options.handleSelector);
        if (handle) {
          handle.classList.add('drag-handle-active');
        }
      }
    });
  }

  /**
   * Handle drag start
   */
  handleDragStart(e) {
    const draggable = e.target.closest(this.options.draggableSelector);
    if (!draggable) return;

    // Check if dragging from handle
    if (this.options.handleSelector) {
      const handle = e.target.closest(this.options.handleSelector);
      if (!handle) {
        e.preventDefault();
        return;
      }
    }

    this.draggedElement = draggable;
    this.draggedAccountId = draggable.dataset.accountId;
    
    // Add dragging class
    draggable.classList.add(this.options.draggingClass);
    
    // Set drag data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', draggable.innerHTML);
    e.dataTransfer.setData('accountId', this.draggedAccountId);
    
    // Create custom drag image
    this.createDragImage(e, draggable);
    
    // Create placeholder
    this.createPlaceholder(draggable);
    
    // Callback
    if (this.callbacks.onDragStart) {
      this.callbacks.onDragStart(this.draggedAccountId, draggable);
    }
  }

  /**
   * Handle drag end
   */
  handleDragEnd() {
    if (!this.draggedElement) return;
    
    // Remove dragging class
    this.draggedElement.classList.remove(this.options.draggingClass);
    
    // Remove placeholder
    if (this.placeholder) {
      this.placeholder.remove();
      this.placeholder = null;
    }
    
    // Remove drag over states
    this.container.querySelectorAll(`.${this.options.dragOverClass}`).forEach(el => {
      el.classList.remove(this.options.dragOverClass);
    });
    
    // Callback
    if (this.callbacks.onDragEnd) {
      this.callbacks.onDragEnd(this.draggedAccountId, this.draggedElement);
    }
    
    // Reset
    this.draggedElement = null;
    this.draggedAccountId = null;
  }

  /**
   * Handle drag over
   */
  handleDragOver(e) {
    if (!this.draggedElement) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Check if over a draggable item (for reordering)
    const overElement = e.target.closest(this.options.draggableSelector);
    if (overElement && overElement !== this.draggedElement) {
      this.handleReorder(e, overElement);
    }
  }

  /**
   * Handle drop
   */
  async handleDrop(e) {
    if (!this.draggedElement) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Check if dropped on a category drop zone
    const dropZone = e.target.closest(this.options.dropZoneSelector);
    if (dropZone) {
      const categoryId = dropZone.dataset.categoryId;
      await this.handleCategoryDrop(categoryId);
    }
    
    // Remove placeholder
    if (this.placeholder && this.placeholder.parentNode) {
      this.placeholder.parentNode.replaceChild(this.draggedElement, this.placeholder);
    }
    
    // Callback
    if (this.callbacks.onDrop) {
      this.callbacks.onDrop(this.draggedAccountId, dropZone);
    }
  }

  /**
   * Handle drag enter
   */
  handleDragEnter(e) {
    const dropZone = e.target.closest(this.options.dropZoneSelector);
    if (dropZone) {
      dropZone.classList.add(this.options.dragOverClass);
    }
  }

  /**
   * Handle drag leave
   */
  handleDragLeave(e) {
    const dropZone = e.target.closest(this.options.dropZoneSelector);
    if (dropZone && !dropZone.contains(e.relatedTarget)) {
      dropZone.classList.remove(this.options.dragOverClass);
    }
  }

  /**
   * Handle reordering
   */
  handleReorder(e, overElement) {
    const rect = overElement.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const placeholder = this.placeholder;
    
    if (e.clientY < midpoint) {
      // Insert before
      if (overElement.previousSibling !== placeholder) {
        overElement.parentNode.insertBefore(placeholder, overElement);
      }
    } else {
      // Insert after
      if (overElement.nextSibling !== placeholder) {
        overElement.parentNode.insertBefore(placeholder, overElement.nextSibling);
      }
    }
    
    // Callback for reorder
    if (this.callbacks.onReorder) {
      const newIndex = Array.from(placeholder.parentNode.children).indexOf(placeholder);
      this.callbacks.onReorder(this.draggedAccountId, newIndex);
    }
  }

  /**
   * Handle category drop
   */
  async handleCategoryDrop(categoryId) {
    try {
      await categoriesService.assignAccountToCategory(this.draggedAccountId, categoryId);
      
      // Show success notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('assets/icon-48.png'),
        title: 'Account Moved',
        message: `Account moved to category`
      });
    } catch (error) {
      console.error('Failed to assign category:', error);
    }
  }

  /**
   * Create custom drag image
   */
  createDragImage(e, element) {
    const dragImage = element.cloneNode(true);
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.style.opacity = '0.8';
    dragImage.style.transform = 'rotate(2deg)';
    dragImage.classList.add('drag-image');
    
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, e.offsetX, e.offsetY);
    
    // Remove after a moment
    setTimeout(() => dragImage.remove(), 0);
  }

  /**
   * Create placeholder
   */
  createPlaceholder(element) {
    this.placeholder = document.createElement('div');
    this.placeholder.className = this.options.placeholderClass;
    this.placeholder.style.height = element.offsetHeight + 'px';
    this.placeholder.innerHTML = '<div class="placeholder-text">Drop here</div>';
    
    element.parentNode.insertBefore(this.placeholder, element);
  }

  /**
   * Initialize touch support
   */
  initializeTouchSupport() {
    let touchItem = null;
    let touchOffset = { x: 0, y: 0 };
    let touchClone = null;

    this.container.addEventListener('touchstart', (e) => {
      const draggable = e.target.closest(this.options.draggableSelector);
      if (!draggable) return;
      
      // Check handle
      if (this.options.handleSelector) {
        const handle = e.target.closest(this.options.handleSelector);
        if (!handle) return;
      }
      
      touchItem = draggable;
      const touch = e.touches[0];
      const rect = draggable.getBoundingClientRect();
      
      touchOffset.x = touch.clientX - rect.left;
      touchOffset.y = touch.clientY - rect.top;
      
      // Create clone for visual feedback
      touchClone = draggable.cloneNode(true);
      touchClone.style.position = 'fixed';
      touchClone.style.opacity = '0.8';
      touchClone.style.pointerEvents = 'none';
      touchClone.style.zIndex = '9999';
      touchClone.style.transform = 'rotate(2deg) scale(1.05)';
      touchClone.classList.add('touch-dragging');
      
      document.body.appendChild(touchClone);
      
      // Trigger drag start
      this.draggedElement = draggable;
      this.draggedAccountId = draggable.dataset.accountId;
      this.createPlaceholder(draggable);
      draggable.style.opacity = '0.4';
    });

    this.container.addEventListener('touchmove', (e) => {
      if (!touchItem || !touchClone) return;
      
      e.preventDefault();
      const touch = e.touches[0];
      
      // Move clone
      touchClone.style.left = (touch.clientX - touchOffset.x) + 'px';
      touchClone.style.top = (touch.clientY - touchOffset.y) + 'px';
      
      // Find element under touch
      touchClone.style.display = 'none';
      const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
      touchClone.style.display = '';
      
      if (!elementBelow) return;
      
      // Check for drop zones
      const dropZone = elementBelow.closest(this.options.dropZoneSelector);
      if (dropZone) {
        dropZone.classList.add(this.options.dragOverClass);
      }
      
      // Check for reorder
      const overElement = elementBelow.closest(this.options.draggableSelector);
      if (overElement && overElement !== touchItem) {
        const rect = overElement.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        
        if (touch.clientY < midpoint) {
          overElement.parentNode.insertBefore(this.placeholder, overElement);
        } else {
          overElement.parentNode.insertBefore(this.placeholder, overElement.nextSibling);
        }
      }
    });

    this.container.addEventListener('touchend', async (e) => {
      if (!touchItem || !touchClone) return;
      
      const touch = e.changedTouches[0];
      
      // Find drop target
      touchClone.style.display = 'none';
      const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
      touchClone.style.display = '';
      
      if (elementBelow) {
        const dropZone = elementBelow.closest(this.options.dropZoneSelector);
        if (dropZone) {
          const categoryId = dropZone.dataset.categoryId;
          await this.handleCategoryDrop(categoryId);
        }
      }
      
      // Clean up
      if (touchClone) {
        touchClone.remove();
        touchClone = null;
      }
      
      if (this.placeholder && this.placeholder.parentNode) {
        this.placeholder.parentNode.replaceChild(touchItem, this.placeholder);
      }
      
      touchItem.style.opacity = '';
      touchItem = null;
      this.draggedElement = null;
      this.draggedAccountId = null;
      
      // Remove drag over states
      this.container.querySelectorAll(`.${this.options.dragOverClass}`).forEach(el => {
        el.classList.remove(this.options.dragOverClass);
      });
    });
  }

  /**
   * Destroy drag and drop
   */
  destroy() {
    // Remove event listeners
    this.container.removeEventListener('dragstart', this.handleDragStart);
    this.container.removeEventListener('dragend', this.handleDragEnd);
    this.container.removeEventListener('dragover', this.handleDragOver);
    this.container.removeEventListener('drop', this.handleDrop);
    this.container.removeEventListener('dragenter', this.handleDragEnter);
    this.container.removeEventListener('dragleave', this.handleDragLeave);
    
    // Reset
    this.draggedElement = null;
    this.draggedAccountId = null;
    this.callbacks = {};
  }
}

export default new DragDropHandler();