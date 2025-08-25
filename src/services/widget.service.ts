/**
 * Widget Service for managing home screen widgets
 */

import { Capacitor } from '@capacitor/core';

export interface WidgetConfiguration {
  id: string;
  accountId: string;
  size: 'small' | 'medium' | 'large';
  refreshInterval: number;
  showIcon: boolean;
  theme: 'light' | 'dark' | 'auto';
}

export class WidgetService {
  private static instance: WidgetService;
  
  static getInstance(): WidgetService {
    if (!WidgetService.instance) {
      WidgetService.instance = new WidgetService();
    }
    return WidgetService.instance;
  }
  
  /**
   * Configure widget for current platform
   */
  async configureWidget(config: WidgetConfiguration): Promise<void> {
    const platform = Capacitor.getPlatform();
    
    if (platform === 'android') {
      await this.configureAndroidWidget(config);
    } else if (platform === 'ios') {
      await this.configureiOSWidget(config);
    }
  }
  
  /**
   * Configure Android App Widget
   */
  private async configureAndroidWidget(config: WidgetConfiguration): Promise<void> {
    try {
      // Store widget configuration
      await this.storeWidgetConfig(config);
      
      // Update widget data
      await this.updateWidgetData(config.accountId);
      
    } catch (error) {
      console.error('Android widget configuration failed:', error);
      throw error;
    }
  }
  
  /**
   * Configure iOS Widget
   */
  private async configureiOSWidget(config: WidgetConfiguration): Promise<void> {
    try {
      // Store widget configuration for iOS Widget Extension
      await this.storeWidgetConfig(config);
      
      // Reload widget timeline
      await this.reloadWidgetTimeline();
      
    } catch (error) {
      console.error('iOS widget configuration failed:', error);
      throw error;
    }
  }
  
  /**
   * Update widget data for all configured widgets
   */
  async updateAllWidgets(): Promise<void> {
    const configs = await this.getAllWidgetConfigs();
    
    for (const config of configs) {
      await this.updateWidgetData(config.accountId);
    }
  }
  
  private async storeWidgetConfig(config: WidgetConfiguration): Promise<void> {
    const configs = await this.getAllWidgetConfigs();
    const updatedConfigs = [...configs.filter(c => c.id !== config.id), config];
    
    localStorage.setItem('widget-configs', JSON.stringify(updatedConfigs));
  }
  
  private async getAllWidgetConfigs(): Promise<WidgetConfiguration[]> {
    const stored = localStorage.getItem('widget-configs');
    return stored ? JSON.parse(stored) : [];
  }
  
  private async updateWidgetData(accountId: string): Promise<void> {
    // Widget data will be read by native widget implementations
    const data = {
      accountId,
      timestamp: Date.now(),
      // Additional widget data
    };
    
    localStorage.setItem(`widget-data-${accountId}`, JSON.stringify(data));
  }
  
  private async reloadWidgetTimeline(): Promise<void> {
    // iOS specific widget timeline reload
    if (Capacitor.getPlatform() === 'ios') {
      // Trigger iOS Widget Kit timeline reload
      // This would typically be handled by native iOS code
    }
  }
}