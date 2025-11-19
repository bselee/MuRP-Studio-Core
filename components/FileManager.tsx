import React, { useState } from 'react';
import { StoredFile } from '../types';
import { Button } from './Button';

interface FileManagerProps {
  files: StoredFile[];
  onDelete: (ids: string[]) => void;
  onDownloadBundle: (files: StoredFile[]) => void;
  onLoadFile: (file: StoredFile) => void;
}

export const FileManager: React.FC<FileManagerProps> = ({ files, onDelete, onDownloadBundle, onLoadFile }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const selectAll = () => {
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(files.map(f => f.id)));
    }
  };

  const handleDownloadSelected = () => {
    const selectedFiles = files.filter(f => selectedIds.has(f.id));
    onDownloadBundle(selectedFiles);
  };

  const handleDeleteSelected = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} files?`)) {
      onDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  if (files.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-800 border-dashed">
        <p className="text-gray-500">No saved assets yet. Generate and save your first design!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 p-2 bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer px-2">
            <input 
              type="checkbox" 
              checked={files.length > 0 && selectedIds.size === files.length}
              onChange={selectAll}
              className="rounded bg-gray-700 border-gray-600 text-yellow-500 focus:ring-yellow-500"
            />
            Select All ({files.length})
          </label>
          <span className="text-gray-600 text-sm">|</span>
          <span className="text-sm text-gray-400">
            {selectedIds.size} selected
          </span>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            onClick={handleDownloadSelected}
            disabled={selectedIds.size === 0}
            className="text-xs py-1 px-3 h-8"
          >
            Download ZIP
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0}
            className="text-xs py-1 px-3 h-8 text-red-400 border-red-900/50 hover:bg-red-900/20 hover:border-red-500"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-y-auto max-h-[500px] custom-scrollbar pr-2">
        {files.map((file) => (
          <div 
            key={file.id} 
            className={`
              relative group rounded-xl border overflow-hidden transition-all hover:shadow-lg
              ${selectedIds.has(file.id) ? 'border-yellow-500 ring-1 ring-yellow-500 bg-gray-800' : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'}
            `}
          >
            {/* Selection Overlay / Checkbox */}
            <div 
              className="absolute top-2 left-2 z-10"
              onClick={(e) => e.stopPropagation()}
            >
               <input 
                type="checkbox" 
                checked={selectedIds.has(file.id)}
                onChange={() => toggleSelection(file.id)}
                className="w-5 h-5 rounded bg-gray-900/80 border-gray-500 text-yellow-500 focus:ring-yellow-500 cursor-pointer backdrop-blur-sm"
              />
            </div>

            {/* Preview */}
            <div 
              className="aspect-square w-full bg-gray-900 p-2 cursor-pointer flex items-center justify-center"
              onClick={() => toggleSelection(file.id)}
            >
               {file.fileType === 'vector' ? (
                  <div 
                    className="w-full h-full [&>svg]:w-full [&>svg]:h-full text-gray-300"
                    dangerouslySetInnerHTML={{ __html: file.data }} 
                  />
               ) : (
                 <img 
                    src={file.data} 
                    alt={file.fileName} 
                    className="w-full h-full object-contain"
                    loading="lazy" 
                 />
               )}
            </div>

            {/* Metadata Footer */}
            <div className="p-3 border-t border-gray-700/50">
              <div className="flex justify-between items-start mb-1">
                <h4 className="text-xs font-medium text-gray-200 truncate pr-2" title={file.fileName}>
                  {file.projectName}
                </h4>
                <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider ${file.fileType === 'vector' ? 'bg-indigo-900 text-indigo-200' : 'bg-yellow-900 text-yellow-200'}`}>
                  {file.fileType === 'vector' ? 'SVG' : 'PNG'}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                <span>v{file.variant}</span>
                <span>{new Date(file.createdAt).toLocaleDateString()}</span>
              </div>
              
              <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                 <button 
                   onClick={(e) => { e.stopPropagation(); onLoadFile(file); }}
                   className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-[10px] py-1 rounded"
                 >
                   Load
                 </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};