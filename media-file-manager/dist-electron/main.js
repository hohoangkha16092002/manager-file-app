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
    win.webContents.openDevTools();
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
