// electron-main.js
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import url from 'url';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the React app
  const startUrl =
    process.env.ELECTRON_START_URL ||
    url.pathToFileURL(path.join(__dirname, 'dist', 'index.html')).href;

  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

// IPC handlers for secure communication with renderer
ipcMain.handle('get-version', () => {
  return app.getVersion();
});

ipcMain.handle('show-message', (event, message) => {
  console.log('Message from renderer:', message);
  return `Received: ${message}`;
});
