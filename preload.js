// preload.js
// This file runs in the renderer process with access to Node.js APIs
// but in an isolated context for security

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Example: Expose a method to get app version
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  // Example: Expose a method to show a message
  showMessage: (message) => ipcRenderer.invoke('show-message', message),
  
  // Add more secure APIs here as needed
  // For example: file operations, system info, etc.
});

// Handle any initialization that needs to happen in the preload script
console.log('Preload script loaded successfully');
