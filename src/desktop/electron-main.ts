/**
 * Electron Main Process for Desktop App
 */

import { app, BrowserWindow, Menu, Tray, globalShortcut, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';

class DesktopApp {
  private mainWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  
  constructor() {
    this.initializeApp();
  }
  
  private initializeApp(): void {
    app.whenReady().then(() => {
      this.createMainWindow();
      this.createTray();
      this.registerShortcuts();
      this.setupAutoUpdater();
      this.setupIPC();
    });
    
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
    
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });
  }
  
  private createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      titleBarStyle: 'hiddenInset',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      }
    });
    
    // Load the React app
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:5173');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
    }
  }
  
  private createTray(): void {
    const iconPath = path.join(__dirname, '../assets/tray-icon.png');
    this.tray = new Tray(iconPath);
    
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show App', click: () => this.showMainWindow() },
      { label: 'Copy Last Code', click: () => this.copyLastCode() },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ]);
    
    this.tray.setToolTip('2FA Studio');
    this.tray.setContextMenu(contextMenu);
    
    this.tray.on('click', () => {
      this.showMainWindow();
    });
  }
  
  private registerShortcuts(): void {
    // Global shortcut to show/hide app
    globalShortcut.register('CommandOrControl+Shift+2', () => {
      this.toggleMainWindow();
    });
    
    // Quick copy last code
    globalShortcut.register('CommandOrControl+Shift+C', () => {
      this.copyLastCode();
    });
  }
  
  private setupAutoUpdater(): void {
    autoUpdater.checkForUpdatesAndNotify();
    
    autoUpdater.on('update-available', () => {
      console.log('Update available');
    });
    
    autoUpdater.on('update-downloaded', () => {
      console.log('Update downloaded');
      autoUpdater.quitAndInstall();
    });
  }
  
  private setupIPC(): void {
    ipcMain.handle('get-totp-codes', async () => {
      // Get TOTP codes from storage
      return [];
    });
    
    ipcMain.handle('copy-to-clipboard', async (event, text) => {
      const { clipboard } = await import('electron');
      clipboard.writeText(text);
    });
  }
  
  private showMainWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }
  
  private toggleMainWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isVisible()) {
        this.mainWindow.hide();
      } else {
        this.showMainWindow();
      }
    }
  }
  
  private copyLastCode(): void {
    // Implementation to copy the most recent TOTP code
    console.log('Copying last TOTP code');
  }
}

new DesktopApp();