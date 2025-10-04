// electron-main.js
import { app, BrowserWindow } from 'electron';
import path from 'path';
import url from 'url';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
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
