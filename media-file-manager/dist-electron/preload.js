"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    selectFolder: () => electron_1.ipcRenderer.invoke('dialog:openFolder'),
    readDirFiles: (folderPath, asTree) => electron_1.ipcRenderer.invoke('fs:readDirFiles', folderPath, asTree),
    labelFile: (filePath, label) => electron_1.ipcRenderer.invoke('fs:labelFile', filePath, label),
});
