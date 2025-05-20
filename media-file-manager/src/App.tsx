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
      labelFile: (filePath: string, label: string) => Promise<{ success: boolean, newPath?: string, newName?: string, error?: string }>;
    };
  }
}

export default function App() {
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSelectFolder = async () => {
    const selected = await window.electronAPI.selectFolder();
    if (selected) {
      setFolderPath(selected);
      const files = await window.electronAPI.readDirFiles(selected);
      setFiles(files);
      setLabels({}); // Reset label inputs
      setErrorMessage(null);
    }
  };

  const handleLabelChange = (filePath: string, label: string) => {
    setLabels(prev => ({ ...prev, [filePath]: label }));
  };

  const handleApplyLabel = async (filePath: string) => {
    const label = labels[filePath];
    if (!label) return;

    const result = await window.electronAPI.labelFile(filePath, label);
    if (result.success && folderPath) {
      const updatedFiles = await window.electronAPI.readDirFiles(folderPath);
      setFiles(updatedFiles);
      setErrorMessage(null);
    } else {
      setErrorMessage(result.error || 'Có lỗi xảy ra khi gắn nhãn.');
    }
  };

  return (
    <div>
      <button onClick={handleSelectFolder}>Chọn thư mục</button>
      <h3>Thư mục: {folderPath || 'Chưa chọn'}</h3>
      {errorMessage && (
        <div style={{ color: 'white', backgroundColor: '#f44336', padding: '8px', marginTop: '10px', borderRadius: '4px' }}>
          ⚠️ {errorMessage}
        </div>
      )}    
      <ul>
        {files.map(f => (
          <li key={f.path}>
            <strong>{f.name}</strong> - {Math.round(f.size / 1024)} KB - {new Date(f.mtime).toLocaleString()} <br />
            <input
              placeholder="Tên nhãn..."
              value={labels[f.path] || ''}
              onChange={e => handleLabelChange(f.path, e.target.value)}
            />
            <button onClick={() => handleApplyLabel(f.path)}>Gắn nhãn</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
