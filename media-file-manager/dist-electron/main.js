"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const electron_is_dev_1 = __importDefault(require("electron-is-dev"));
let win = null;
function createWindow() {
    win = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path_1.default.join(__dirname, '../dist-electron/preload.js'),
            contextIsolation: true,
        },
    });
    // Load URL hoặc file html
    win.loadURL(electron_is_dev_1.default
        ? 'http://localhost:5173'
        : `file://${path_1.default.join(__dirname, '../dist/index.html')}`);
    // Mở devtools cho debug
    // win.webContents.openDevTools();
    win.on('closed', () => {
        win = null;
    });
}
electron_1.ipcMain.handle('dialog:openFolder', async () => {
    const result = await electron_1.dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (result.canceled)
        return null;
    return result.filePaths[0];
});
electron_1.ipcMain.handle('fs:readDirFiles', async (event, folderPath) => {
    try {
        const files = await fs_1.default.promises.readdir(folderPath, { withFileTypes: true });
        const fileList = files
            .filter(f => f.isFile())
            .map(f => {
            const filePath = path_1.default.join(folderPath, f.name);
            const stats = fs_1.default.statSync(filePath);
            return {
                name: f.name,
                path: filePath,
                size: stats.size,
                mtime: stats.mtimeMs,
                ctime: stats.ctimeMs,
            };
        });
        return fileList;
    }
    catch (error) {
        console.error(error);
        return [];
    }
});
electron_1.ipcMain.handle('fs:labelFile', async (event, filePath, label) => {
    try {
        const dir = path_1.default.dirname(filePath);
        const ext = path_1.default.extname(filePath);
        const originalBase = path_1.default.basename(filePath, ext);
        // Nếu file đã có label, loại bỏ nó
        const baseWithoutLabel = originalBase.includes('!_')
            ? originalBase.split('!_').slice(1).join('!_') // bỏ phần nhãn cũ
            : originalBase;
        const newBase = `${label}!_${baseWithoutLabel}`;
        const newName = `${newBase}${ext}`;
        const newPath = path_1.default.join(dir, newName);
        // Nếu đã đúng nhãn rồi thì không cần rename
        if (filePath === newPath) {
            return { success: true, newPath, newName };
        }
        // Nếu file đích đã tồn tại, báo lỗi
        if (fs_1.default.existsSync(newPath)) {
            return { success: false, error: 'File đã tồn tại sau khi gắn nhãn.' };
        }
        await fs_1.default.promises.rename(filePath, newPath);
        return { success: true, newPath, newName };
    }
    catch (error) {
        console.error('Lỗi khi gắn nhãn:', error);
        return { success: false, error: String(error) };
    }
});
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
