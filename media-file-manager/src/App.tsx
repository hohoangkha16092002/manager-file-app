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
      labelFile: (
        filePath: string,
        label: string
      ) => Promise<{
        success: boolean;
        newPath?: string;
        newName?: string;
        error?: string;
      }>;
    };
  }
}

function extractLabelFromName(fileName: string): string | null {
  const match = fileName.match(/^(.+?)!_/);
  return match ? match[1] : null;
}

export default function App() {
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [tabs, setTabs] = useState<string[]>([]);
  const [currentTab, setCurrentTab] = useState<string>('All');
  const [newLabel, setNewLabel] = useState('');
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());

  const handleSelectFolder = async () => {
    const selected = await window.electronAPI.selectFolder();
    if (!selected) return;

    setFolderPath(selected);
    const result = await window.electronAPI.readDirFiles(selected);

    const initialLabels: Record<string, string> = {};
    const detectedLabels = new Set<string>();

    result.forEach((file) => {
      const label = extractLabelFromName(file.name);
      if (label) {
        initialLabels[file.path] = label;
        detectedLabels.add(label);
      }
    });

    setLabels(initialLabels);
    setTabs([...detectedLabels]);
    setFiles(result);
    setCurrentTab('All');
  };

  const applyLabel = async (filePath: string, newLabel: string) => {
    setLoadingPaths((prev) => new Set(prev).add(filePath));
    setLabels((prev) => ({ ...prev, [filePath]: newLabel }));

    try {
      const res = await window.electronAPI.labelFile(filePath, newLabel);

      setLoadingPaths((prev) => {
        const newSet = new Set(prev);
        newSet.delete(filePath);
        return newSet;
      });

      if (res.success && res.newPath && res.newName) {
        setFiles((prev) =>
          prev.map((f) =>
            f.path === filePath
              ? { ...f, path: res.newPath!, name: res.newName! }
              : f
          )
        );

        setLabels((prev) => {
          const updated = { ...prev };
          delete updated[filePath];
          updated[res.newPath!] = newLabel;
          return updated;
        });

        if (newLabel && !tabs.includes(newLabel)) {
          setTabs((prev) => [...prev, newLabel]);
        }
      } else {
        alert(res.error || 'Gắn/bỏ nhãn thất bại.');
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi gắn nhãn.');
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
      : files.filter((f) => extractLabelFromName(f.name) === currentTab);

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
            {new Date(f.mtime).toLocaleString()}
            <select
              disabled={loadingPaths.has(f.path)}
              value={labels[f.path] || ''}
              onChange={(e) => applyLabel(f.path, e.target.value)}
            >
              <option value="">-- Bỏ nhãn --</option>
              {tabs
                .filter((tab) => tab !== 'All')
                .map((tab) => (
                  <option key={tab} value={tab}>
                    {tab}
                  </option>
                ))}
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
}
