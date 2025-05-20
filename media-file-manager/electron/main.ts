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
  // win.webContents.openDevTools();

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

ipcMain.handle('fs:labelFile', async (event, filePath: string, label: string) => {
  try {
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const originalBase = path.basename(filePath, ext);

    // Nếu file đã có label, loại bỏ nó
    const baseWithoutLabel = originalBase.includes('!_')
      ? originalBase.split('!_').slice(1).join('!_') // bỏ phần nhãn cũ
      : originalBase;

    const newBase = `${label}!_${baseWithoutLabel}`;
    const newName = `${newBase}${ext}`;
    const newPath = path.join(dir, newName);

    // Nếu đã đúng nhãn rồi thì không cần rename
    if (filePath === newPath) {
      return { success: true, newPath, newName };
    }

    // Nếu file đích đã tồn tại, báo lỗi
    if (fs.existsSync(newPath)) {
      return { success: false, error: 'File đã tồn tại sau khi gắn nhãn.' };
    }

    await fs.promises.rename(filePath, newPath);
    return { success: true, newPath, newName };

  } catch (error) {
    console.error('Lỗi khi gắn nhãn:', error);
    return { success: false, error: String(error) };
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
