import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import isDev from 'electron-is-dev'
let win: BrowserWindow | null = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../dist-electron/preload.js'),
      contextIsolation: true,
    },
  });

  // Load URL hoặc file html
  win.loadURL(
    isDev
      ? 'http://localhost:5173'
      : `file://${path.join(__dirname, '../dist/index.html')}`
  )

  // Mở devtools cho debug
  win.webContents.openDevTools();

  win.on('closed', () => {
    win = null;
  });
}

ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('fs:readDirFiles', async (event, folderPath: string) => {
  try {
    const files = await fs.promises.readdir(folderPath, { withFileTypes: true });
    const fileList = files
      .filter(f => f.isFile())
      .map(f => {
        const filePath = path.join(folderPath, f.name);
        const stats = fs.statSync(filePath);
        return {
          name: f.name,
          path: filePath,
          size: stats.size,
          mtime: stats.mtimeMs,
          ctime: stats.ctimeMs,
        };
      });
    return fileList;
  } catch (error) {
    console.error(error);
    return [];
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
