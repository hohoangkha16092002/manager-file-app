"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    selectFolder: () => electron_1.ipcRenderer.invoke('dialog:openFolder'),
    readDirFiles: (folderPath) => electron_1.ipcRenderer.invoke('fs:readDirFiles', folderPath),
    labelFile: (filePath, label) => electron_1.ipcRenderer.invoke('fs:labelFile', filePath, label),
});
