import React, { useState } from 'react';

type FileItem = {
  name: string;
  path: string;
  size: number;
  mtime: number;
  ctime: number;
};

declare global {
  interface Window {
    electronAPI: {
      selectFolder: () => Promise<string | null>;
      readDirFiles: (folderPath: string) => Promise<FileItem[]>;
    };
  }
}

export default function App() {
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);

  const handleSelectFolder = async () => {
    const selected = await window.electronAPI.selectFolder();
    if (selected) {
      setFolderPath(selected);
      const files = await window.electronAPI.readDirFiles(selected);
      setFiles(files);
    }
  };

  return (
    <div>
      <button onClick={handleSelectFolder}>Chọn thư mục</button>
      <h3>Thư mục: {folderPath || 'Chưa chọn'}</h3>
      <ul>
        {files.map(f => (
          <li key={f.path}>
            {f.name} - {Math.round(f.size / 1024)} KB - {new Date(f.mtime).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}
