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
      labelFile: (filePath: string, label: string) => Promise<{
        success: boolean;
        newPath?: string;
        newName?: string;
        error?: string;
      }>;
    };
  }
}

function extractLabel(fileName: string): string | null {
  const match = fileName.match(/^(.+?)!_/);
  return match ? match[1] : null;
}

export default function App() {
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [tabs, setTabs] = useState<string[]>([]); // ['label1', 'label2']
  const [currentTab, setCurrentTab] = useState<string>('All');
  const [newLabel, setNewLabel] = useState('');

const handleSelectFolder = async () => {
  const selected = await window.electronAPI.selectFolder();
  if (selected) {
    setFolderPath(selected);
    const files = await window.electronAPI.readDirFiles(selected);

    // Tự động trích xuất các label từ tên file
    const detectedLabels = new Set<string>();
    files.forEach((f) => {
      const match = f.name.match(/^(.+?)!_/);
      if (match) detectedLabels.add(match[1]);
    });

    setTabs([...detectedLabels]);
    setFiles(files);
    setCurrentTab('All'); // reset tab hiện tại
  }
};

  const handleLabelChange = (filePath: string, value: string) => {
    setLabels((prev) => ({ ...prev, [filePath]: value }));
  };

  const handleApplyLabel = async (filePath: string) => {
    const label = labels[filePath];
    if (!label) return;

    const result = await window.electronAPI.labelFile(filePath, label);
    if (result.success && result.newPath) {
      setFiles((prev) =>
        prev.map((f) =>
          f.path === filePath
            ? {
                ...f,
                path: result.newPath!,
                name: result.newName!,
              }
            : f
        )
      );
    } else {
      alert(result.error || 'Gắn nhãn thất bại');
    }
  };

  const handleAddTab = () => {
    const trimmed = newLabel.trim();
    if (trimmed && !tabs.includes(trimmed)) {
      setTabs((prev) => [...prev, trimmed]);
    }
    setNewLabel('');
  };

  const filteredFiles =
    currentTab === 'All'
      ? files
      : files.filter((f) => extractLabel(f.name) === currentTab);

  return (
    <div>
      <button onClick={handleSelectFolder}>Chọn thư mục</button>
      <h3>Thư mục: {folderPath || 'Chưa chọn'}</h3>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <button
          onClick={() => setCurrentTab('All')}
          style={{ fontWeight: currentTab === 'All' ? 'bold' : 'normal' }}
        >
          All
        </button>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setCurrentTab(tab)}
            style={{ fontWeight: currentTab === tab ? 'bold' : 'normal' }}
          >
            {tab}
          </button>
        ))}
        <input
          placeholder="Tên nhãn mới"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
        />
        <button onClick={handleAddTab}>+ Thêm nhãn</button>
      </div>

      {/* File list */}
      <ul>
        {filteredFiles.map((f) => (
          <li key={f.path}>
            <strong>{f.name}</strong> - {Math.round(f.size / 1024)} KB -{' '}
            {new Date(f.mtime).toLocaleString()} <br />
            <input
              placeholder="Tên nhãn..."
              value={labels[f.path] || ''}
              onChange={(e) => handleLabelChange(f.path, e.target.value)}
            />
            <button onClick={() => handleApplyLabel(f.path)}>Gắn nhãn</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
