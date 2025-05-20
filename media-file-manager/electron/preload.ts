import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  readDirFiles: (folderPath: string) => ipcRenderer.invoke('fs:readDirFiles', folderPath),
  labelFile: (filePath: string, label: string) => ipcRenderer.invoke('fs:labelFile', filePath, label),
});
