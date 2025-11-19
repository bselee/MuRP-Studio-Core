import React from 'react';
import { ComplianceReport, InventorySKU, GoogleUser } from '../types';
import { Button } from './Button';

interface CompliancePanelProps {
  report: ComplianceReport | null;
  sku: InventorySKU | null;
  isScanning: boolean;
  onScan: () => void;
  hasImage: boolean;
  onExportSheets: () => void;
  user: GoogleUser | null;
}

export const CompliancePanel: React.FC<CompliancePanelProps> = ({ 
  report, 
  sku, 
  isScanning, 
  onScan,
  hasImage,
  onExportSheets,
  user
}) => {
  
  if (!hasImage) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-800/30 rounded-2xl border border-dashed border-gray-700">
        <div className="text-gray-500 mb-4">No artwork selected to scan.</div>
      </div>
    );
  }

  if (!report && !isScanning) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-800/30 rounded-2xl border border-gray-700">
        <div className="w-16 h-16 bg-blue-900/30 text-blue-400 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Compliance Check</h3>
        <p className="text-gray-400 text-center max-w-md mb-6">
          Scan your artwork against {sku ? sku.category : 'industry'} regulations. 
          We check for required elements, ingredient deck validity, and prohibited claims.
        </p>
        <Button onClick={onScan}>
           Start Compliance Scan
        </Button>
      </div>
    );
  }

  if (isScanning) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-800/30 rounded-2xl border border-gray-700">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-blue-400 font-medium animate-pulse">Reviewing Regulations...</p>
        <p className="text-xs text-gray-500 mt-2">Checking FDA/USDA databases & OCR</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl overflow-hidden">
      {/* Header / Score */}
      <div className="p-6 border-b border-gray-700 bg-gray-900/50 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Compliance Report</h3>
          <p className="text-xs text-gray-400">Regulated by: <span className="text-gray-200">{report?.regulatoryBody}</span></p>
        </div>
        <div className="flex items-center gap-4">
            {/* Google Sheets Export Button */}
            <button 
              onClick={onExportSheets}
              disabled={!user}
              title={!user ? "Sign in with Google first" : "Export to Sheets"}
              className="flex items-center gap-2 text-sm font-medium text-green-400 hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
               <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                 <path d="M19,3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3z M19,19H5V5h14V19z M11,7h2v2h-2V7z M11,11h2v2h-2V11z M11,15h2v2h-2V15z M7,7h2v2H7V7z M7,11h2v2H7V11z M7,15h2v2H7V15z M15,7h2v2h-2V7z M15,11h2v2h-2V11z M15,15h2v2h-2V15z"/>
               </svg>
               Export to Sheets
            </button>

            <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${
            report?.score && report.score > 85 ? 'bg-green-900/20 border-green-800 text-green-400' : 
            report?.score && report.score > 50 ? 'bg-yellow-900/20 border-yellow-800 text-yellow-400' : 
            'bg-red-900/20 border-red-800 text-red-400'
            }`}>
            <span className="text-2xl font-bold">{report?.score}</span>
            <div className="text-xs leading-tight">
                <div className="font-bold uppercase">Safety Score</div>
                <div>{report?.status}</div>
            </div>
            </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Checks List */}
        <div className="space-y-4">
          <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold">Regulatory Checks</h4>
          <div className="space-y-2">
            {report?.checks.map((check, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${check.passed ? 'bg-green-500' : 'bg-red-500'}`}>
                  {check.passed ? (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">{check.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{check.details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deep Analysis */}
        <div className="space-y-6">
          
          {/* Ingredients */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">Ingredient Analysis</h4>
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50 text-sm">
              {report?.ingredientAnalysis.found ? (
                <>
                  <p className="text-gray-300 line-clamp-4 italic mb-2">"{report.ingredientAnalysis.text}"</p>
                  {report.ingredientAnalysis.flaggedIngredients.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {report.ingredientAnalysis.flaggedIngredients.map((ing, i) => (
                        <span key={i} className="px-2 py-0.5 bg-red-900/30 text-red-400 border border-red-800/50 rounded text-xs">
                          ⚠ {ing}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-green-500 text-xs flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      No prohibited ingredients found
                    </span>
                  )}
                </>
              ) : (
                <p className="text-gray-500">No ingredient list detected on artwork.</p>
              )}
            </div>
          </div>

          {/* Barcode & Claims */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
               <h5 className="text-xs text-gray-500 font-bold mb-1">Barcode</h5>
               {report?.barcodeAnalysis.found ? (
                 <div className="flex items-center gap-2 text-green-400 text-sm">
                    <span className="text-lg">║█║</span>
                    <span>Detected ({report.barcodeAnalysis.type || 'UPC'})</span>
                 </div>
               ) : (
                 <div className="text-red-400 text-sm flex items-center gap-2">
                   <span>Missing</span>
                 </div>
               )}
            </div>
            <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
               <h5 className="text-xs text-gray-500 font-bold mb-1">Invalid Claims</h5>
               <div className="text-sm font-bold text-white">
                 {report?.invalidStatements.length || 0} Found
               </div>
            </div>
          </div>

          {report && report.invalidStatements.length > 0 && (
             <div className="bg-red-900/10 border border-red-900/50 rounded-lg p-3">
               <p className="text-xs text-red-400 font-bold mb-1">Flagged Statements:</p>
               <ul className="list-disc list-inside text-xs text-red-300/80">
                 {report.invalidStatements.map((s, i) => <li key={i}>{s}</li>)}
               </ul>
             </div>
          )}

        </div>
      </div>
      
      <div className="p-4 border-t border-gray-700 bg-gray-900/30 flex justify-end">
         <Button variant="outline" onClick={onScan}>Re-Scan Artwork</Button>
      </div>
    </div>
  );
};