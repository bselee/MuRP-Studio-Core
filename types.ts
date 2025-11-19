export interface ImageState {
  file: File | null;
  previewUrl: string | null;
  base64: string | null;
}

export interface GenerationResult {
  imageUrl: string | null;
  error: string | null;
}

export enum AppStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface StoredFile {
  id: string;
  projectId: string;
  projectName: string;
  variant: number;
  fileName: string;
  fileType: 'raster' | 'vector';
  data: string; // Base64 or SVG string
  createdAt: number;
  width?: number;
  height?: number;
}

// --- Templates ---
export interface PackagingTemplate {
  id: string;
  name: string;
  category: 'Flexible' | 'Rigid' | 'Carton' | 'Label';
  dimensions: string; // e.g., "6x9 in"
  promptContext: string; // "on a stand-up pouch with matte finish"
  aspectRatio: string; // "3:4"
}

// --- Inventory Types ---
export interface InventorySKU {
  id: string;
  sku: string;
  name: string;
  category: 'Food' | 'Agriculture' | 'Cosmetics' | 'General';
  dimensions: string;
  status: 'Active' | 'Discontinued' | 'Draft';
}

// --- Compliance Types ---
export interface ComplianceReport {
  score: number; // 0-100
  status: 'compliant' | 'warning' | 'non-compliant';
  detectedIndustry: string;
  regulatoryBody: string;
  checks: {
    name: string;
    passed: boolean;
    details: string;
  }[];
  ingredientAnalysis: {
    found: boolean;
    text: string;
    flaggedIngredients: string[];
  };
  barcodeAnalysis: {
    found: boolean;
    readable: boolean;
    type: string;
  };
  invalidStatements: string[];
  // New fields for Data Sheets
  marketingCopy?: {
    headline: string;
    claims: string[];
    flavorProfile: string;
  };
}

export interface RegulatoryEntity {
  id: string;
  name: string; // e.g., FDA, USDA
  industry: string;
  requiredElements: string[];
  restrictedTerms: string[];
}

export type EditorTool = 'brush' | 'text' | 'eraser';

// --- Google Integration ---
export interface GoogleUser {
  id: string;
  name: string;
  email: string;
  picture: string;
  accessToken?: string;
}

// Declare globals from CDN scripts
declare global {
  var ImageTracer: {
    imageToSVG: (
      url: string,
      callback: (svgString: string) => void,
      options?: any
    ) => void;
  };
  var JSZip: any;
  var google: any;
  var gapi: any;
}