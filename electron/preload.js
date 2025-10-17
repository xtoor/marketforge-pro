/**
 * MarketForge Pro - Electron Preload Script
 *
 * Provides secure IPC bridge between renderer and main process
 *
 * Copyright 2025 MarketForge Pro Team
 * Licensed under the Apache License, Version 2.0
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Exposed API for renderer process
 * All functions use IPC for secure communication
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Configuration management
   */
  config: {
    get: (key) => ipcRenderer.invoke('get-config', key),
    set: (key, value) => ipcRenderer.invoke('set-config', key, value),
  },

  /**
   * API connection testing
   */
  testAPIConnection: (apiType, credentials) =>
    ipcRenderer.invoke('test-api-connection', apiType, credentials),

  /**
   * System operations
   */
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  showDialog: (options) => ipcRenderer.invoke('show-dialog', options),
  getVersion: () => ipcRenderer.invoke('get-version'),

  /**
   * Backend management
   */
  backend: {
    restart: () => ipcRenderer.invoke('restart-backend'),
    getStatus: () => ipcRenderer.invoke('get-backend-status'),
  },

  /**
   * Event listeners
   */
  on: (channel, callback) => {
    const validChannels = [
      'open-settings',
      'backend-status-changed',
      'notification',
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },

  /**
   * Remove event listener
   */
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },

  /**
   * Send event to main process
   */
  send: (channel, data) => {
    const validChannels = ['setup-completed', 'setup-cancelled'];

    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
});

/**
 * Platform information
 */
contextBridge.exposeInMainWorld('platform', {
  name: process.platform,
  isWindows: process.platform === 'win32',
  isMac: process.platform === 'darwin',
  isLinux: process.platform === 'linux',
});

console.log('[Preload] Electron API bridge initialized');
