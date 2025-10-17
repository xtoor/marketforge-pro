/**
 * MarketForge Pro - Electron Main Process
 *
 * Manages the application window, backend server, and system integration
 *
 * Copyright 2025 MarketForge Pro Team
 * Licensed under the Apache License, Version 2.0
 */

const { app, BrowserWindow, ipcMain, Tray, Menu, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const Store = require('electron-store');

// Configuration store (encrypted)
const store = new Store({
  encryptionKey: 'marketforge-pro-encryption-key-change-in-production'
});

let mainWindow = null;
let backendProcess = null;
let tray = null;
const isDev = process.env.NODE_ENV === 'development';

// Paths
const BACKEND_PATH = isDev
  ? path.join(__dirname, '..', 'backend')
  : path.join(process.resourcesPath, 'backend');

const PYTHON_PATH = isDev
  ? 'python3'
  : path.join(process.resourcesPath, 'python', 'python.exe');

const FRONTEND_URL = isDev
  ? 'http://localhost:3000'
  : `file://${path.join(__dirname, '..', 'dist', 'index.html')}`;

/**
 * Create the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'MarketForge Pro',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
      webSecurity: true
    },
    backgroundColor: '#1a1a1a',
    show: false // Show after ready-to-show event
  });

  // Load the app
  mainWindow.loadURL(FRONTEND_URL);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // Open DevTools in development
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window close
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // External links open in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

/**
 * Create system tray icon and menu
 */
function createTray() {
  const trayIcon = path.join(__dirname, 'assets', 'tray-icon.png');
  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show MarketForge Pro',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: 'Settings',
      click: () => {
        mainWindow.webContents.send('open-settings');
        mainWindow.show();
      }
    },
    { type: 'separator' },
    {
      label: 'Backend Status',
      sublabel: backendProcess ? 'Running' : 'Stopped',
      enabled: false
    },
    {
      label: 'Restart Backend',
      click: async () => {
        await stopBackend();
        await startBackend();
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('MarketForge Pro');

  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

/**
 * Start the FastAPI backend server
 */
async function startBackend() {
  return new Promise((resolve, reject) => {
    console.log('[Backend] Starting backend server...');

    const env = {
      ...process.env,
      PYTHONUNBUFFERED: '1',
      ...store.get('environment', {})
    };

    const args = ['-m', 'uvicorn', 'api.main:app', '--host', '0.0.0.0', '--port', '8000'];

    backendProcess = spawn(PYTHON_PATH, args, {
      cwd: BACKEND_PATH,
      env: env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    backendProcess.stdout.on('data', (data) => {
      console.log(`[Backend] ${data.toString().trim()}`);
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`[Backend Error] ${data.toString().trim()}`);
    });

    backendProcess.on('error', (error) => {
      console.error('[Backend] Failed to start:', error);
      reject(error);
    });

    backendProcess.on('exit', (code) => {
      console.log(`[Backend] Exited with code ${code}`);
      backendProcess = null;
    });

    // Wait for server to be ready
    setTimeout(() => {
      console.log('[Backend] Server should be ready');
      resolve();
    }, 3000);
  });
}

/**
 * Stop the backend server
 */
async function stopBackend() {
  if (backendProcess) {
    console.log('[Backend] Stopping backend server...');
    backendProcess.kill();
    backendProcess = null;

    return new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  }
}

/**
 * Check if this is the first run (show setup wizard)
 */
function isFirstRun() {
  return !store.get('setupCompleted', false);
}

/**
 * Show first-run setup wizard
 */
async function showSetupWizard() {
  const setupWindow = new BrowserWindow({
    width: 800,
    height: 600,
    resizable: false,
    frame: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  setupWindow.loadFile(path.join(__dirname, 'wizard', 'setup.html'));

  return new Promise((resolve) => {
    ipcMain.once('setup-completed', (event, config) => {
      store.set('setupCompleted', true);
      store.set('environment', config);
      setupWindow.close();
      resolve();
    });
  });
}

// IPC Handlers

/**
 * Get configuration from store
 */
ipcMain.handle('get-config', async (event, key) => {
  return store.get(key);
});

/**
 * Set configuration in store
 */
ipcMain.handle('set-config', async (event, key, value) => {
  store.set(key, value);
  return true;
});

/**
 * Test API connection
 */
ipcMain.handle('test-api-connection', async (event, apiType, credentials) => {
  // This would test the actual API connection
  // For now, return a mock response
  return {
    success: true,
    message: `${apiType} connection successful`
  };
});

/**
 * Open external link
 */
ipcMain.handle('open-external', async (event, url) => {
  shell.openExternal(url);
});

/**
 * Show native dialog
 */
ipcMain.handle('show-dialog', async (event, options) => {
  return await dialog.showMessageBox(mainWindow, options);
});

/**
 * Get app version
 */
ipcMain.handle('get-version', async () => {
  return app.getVersion();
});

/**
 * Restart backend
 */
ipcMain.handle('restart-backend', async () => {
  await stopBackend();
  await startBackend();
  return { success: true };
});

/**
 * Get backend status
 */
ipcMain.handle('get-backend-status', async () => {
  return {
    running: backendProcess !== null,
    pid: backendProcess?.pid
  };
});

// App lifecycle

app.whenReady().then(async () => {
  console.log('[App] Application ready');

  // Check for first run
  if (isFirstRun()) {
    console.log('[App] First run detected, showing setup wizard');
    await showSetupWizard();
  }

  // Start backend
  try {
    await startBackend();
  } catch (error) {
    console.error('[App] Failed to start backend:', error);
    dialog.showErrorBox(
      'Backend Error',
      'Failed to start the backend server. Please check the logs.'
    );
  }

  // Create window and tray
  createWindow();
  createTray();

  // Auto-updater (future implementation)
  if (!isDev) {
    // checkForUpdates();
  }
});

app.on('window-all-closed', () => {
  // On macOS, keep app running in background
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', async () => {
  console.log('[App] Application quitting...');
  await stopBackend();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[App] Uncaught exception:', error);
  dialog.showErrorBox('Unexpected Error', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[App] Unhandled rejection at:', promise, 'reason:', reason);
});
