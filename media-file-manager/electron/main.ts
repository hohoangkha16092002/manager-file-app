import { app, BrowserWindow, dialog, ipcMain } from "electron";
import fs from "fs";
import path from "path";
import isDev from "electron-is-dev";
let win: BrowserWindow | null = null;

interface FileItem {
  name: string;
  path: string;
  size: number;
  mtime: number;
  ctime: number;
  isDirectory: boolean;
  children?: FileItem[]; // Chỉ dùng nếu là thư mục
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "../dist-electron/preload.js"),
      contextIsolation: true,
    },
  });

  // Load URL hoặc file html
  win.loadURL(
    isDev
      ? "http://localhost:5173"
      : `file://${path.join(__dirname, "../dist/index.html")}`
  );

  // Mở devtools cho debug
  win.webContents.openDevTools();

  win.on("closed", () => {
    win = null;
  });
}

ipcMain.handle("dialog:openFolder", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle(
  "fs:readDirFiles",
  async (event, folderPath: string, asTree: boolean) => {
    async function readRecursive(dirPath: string): Promise<FileItem[]> {
      const entries = await fs.promises.readdir(dirPath, {
        withFileTypes: true,
      });
      const results: FileItem[] = [];

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const stats = await fs.promises.stat(fullPath);

        if (entry.isDirectory()) {
          const children = await readRecursive(fullPath);
          results.push({
            name: entry.name,
            path: fullPath,
            size: stats.size,
            mtime: stats.mtimeMs,
            ctime: stats.ctimeMs,
            isDirectory: true,
            children,
          });
        } else {
          results.push({
            name: entry.name,
            path: fullPath,
            size: stats.size,
            mtime: stats.mtimeMs,
            ctime: stats.ctimeMs,
            isDirectory: false,
          });
        }
      }

      return results;
    }

    // Thay đổi đoạn này:
    try {
      if (asTree) {
        return await readRecursive(folderPath);
      } else {
        // Trả về tất cả file phẳng (bao gồm cả trong folder con)
        const flattenFiles = async (dirPath: string): Promise<FileItem[]> => {
          const entries = await fs.promises.readdir(dirPath, {
            withFileTypes: true,
          });
          let files: FileItem[] = [];
          for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            const stats = await fs.promises.stat(fullPath);
            if (entry.isDirectory()) {
              files = files.concat(await flattenFiles(fullPath));
            } else {
              files.push({
                name: entry.name,
                path: fullPath,
                size: stats.size,
                mtime: stats.mtimeMs,
                ctime: stats.ctimeMs,
                isDirectory: false,
              });
            }
          }
          return files;
        };
        return await flattenFiles(folderPath);
      }
    } catch (error) {
      console.error(error);
      return [];
    }
  }
);

ipcMain.handle(
  "fs:labelFile",
  async (event, filePath: string, label: string) => {
    try {
      const dir = path.dirname(filePath);
      const ext = path.extname(filePath);
      const base = path.basename(filePath, ext);

      let newBase: string;
      console.log(`Label: ${label}, Base: ${base}, Ext: ${ext}`);

      if (label) {
        // Đổi sang nhãn mới, xoá nhãn cũ nếu có
        const oldLabelMatch = base.match(/^(.+?)!_(.+)$/);
        const originalName = oldLabelMatch ? oldLabelMatch[2] : base;
        newBase = `${label}!_${originalName}`;
      } else {
        // Bỏ nhãn, lấy lại tên gốc
        const oldLabelMatch = base.match(/^(.+?)!_(.+)$/);
        if (!oldLabelMatch) {
          return { success: false, error: "File không có nhãn để bỏ." };
        }
        newBase = oldLabelMatch[2]; // tên gốc
      }

      const newName = `${newBase}${ext}`;
      const newPath = path.join(dir, newName);

      if (fs.existsSync(newPath)) {
        return { success: false, error: "File đã tồn tại sau khi đổi nhãn." };
      }

      await fs.promises.rename(filePath, newPath);
      return { success: true, newPath, newName };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
);

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
