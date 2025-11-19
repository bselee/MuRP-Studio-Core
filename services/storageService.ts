import { StoredFile } from '../types';

const DB_NAME = 'NanoPackDB';
const STORE_NAME = 'assets';
const DB_VERSION = 1;

// Helper to open IndexedDB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject("Error opening database");

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('projectId', 'projectId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
};

// --- Public API (Simulates a Supabase Client) ---

export const storageService = {
  async saveFile(file: StoredFile): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(file);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getAllFiles(): Promise<StoredFile[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        // Sort by newest first
        const results = request.result as StoredFile[];
        resolve(results.sort((a, b) => b.createdAt - a.createdAt));
      };
      request.onerror = () => reject(request.error);
    });
  },

  async deleteFiles(ids: string[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      let completed = 0;
      let errors = 0;

      ids.forEach(id => {
        const request = store.delete(id);
        request.onsuccess = () => {
          completed++;
          if (completed + errors === ids.length) {
             if (errors > 0) reject("Some files failed to delete");
             else resolve();
          }
        };
        request.onerror = () => {
          errors++;
          if (completed + errors === ids.length) reject("Failed to delete files");
        };
      });
    });
  },
  
  // Generate a formatted filename: ProjectName_v01_Date_Resolution.ext
  generateFilename(projectName: string, variant: number, type: 'raster' | 'vector', width?: number, height?: number): string {
    const date = new Date().toISOString().split('T')[0];
    const ext = type === 'raster' ? 'png' : 'svg';
    const dims = width && height ? `_${width}x${height}` : '';
    const safeName = projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const variantStr = `v${variant.toString().padStart(3, '0')}`;
    
    return `${safeName}_${variantStr}_${date}${dims}.${ext}`;
  },

  // Bundle multiple files into a ZIP
  async downloadBundle(files: StoredFile[], zipName: string = 'bundle'): Promise<void> {
    if (!window.JSZip) {
      throw new Error("JSZip library not loaded");
    }

    const zip = new window.JSZip();

    files.forEach(file => {
      if (file.fileType === 'vector') {
        zip.file(file.fileName, file.data);
      } else {
        // Remove data URL prefix for binary files
        const base64Data = file.data.split(',')[1];
        zip.file(file.fileName, base64Data, { base64: true });
      }
    });

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${zipName}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};