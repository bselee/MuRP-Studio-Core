import React, { useState, useCallback, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { Button } from './components/Button';
import { FileManager } from './components/FileManager';
import { CompliancePanel } from './components/CompliancePanel';
import { TechSheet } from './components/TechSheet';
import { ImageState, AppStatus, StoredFile, InventorySKU, ComplianceReport, PackagingTemplate } from './types';
import { generatePackagingModification } from './services/geminiService';
import { storageService } from './services/storageService';
import { inventoryService } from './services/inventoryService';
import { complianceService } from './services/complianceService';
import { templateService } from './services/templateService';

const App: React.FC = () => {
  // Core State
  const [inputImage, setInputImage] = useState<ImageState>({
    file: null,
    previewUrl: null,
    base64: null
  });
  
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Project Metadata State
  const [projectName, setProjectName] = useState('Untitled-Project');
  const [variantNumber, setVariantNumber] = useState(1);

  // Templates
  const [selectedTemplate, setSelectedTemplate] = useState<PackagingTemplate | null>(null);
  const [templates] = useState(templateService.getTemplates());

  // Vector State
  const [viewMode, setViewMode] = useState<'raster' | 'vector'>('raster');
  const [vectorSvg, setVectorSvg] = useState<string | null>(null);
  const [isVectorizing, setIsVectorizing] = useState(false);

  // File Manager State
  const [savedFiles, setSavedFiles] = useState<StoredFile[]>([]);
  const [activeTab, setActiveTab] = useState<'studio' | 'compliance' | 'datasheet' | 'library'>('studio');

  // Inventory & Compliance State
  const [linkedSku, setLinkedSku] = useState<InventorySKU | null>(null);
  const [isSearchingSku, setIsSearchingSku] = useState(false);
  const [skuSearchQuery, setSkuSearchQuery] = useState('');
  const [skuSearchResults, setSkuSearchResults] = useState<InventorySKU[]>([]);
  const [showSkuSearch, setShowSkuSearch] = useState(false);
  
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [isScanningCompliance, setIsScanningCompliance] = useState(false);

  // Load files on mount
  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const files = await storageService.getAllFiles();
      setSavedFiles(files);
    } catch (e) {
      console.error("Failed to load gallery", e);
    }
  };

  const handleGenerate = async () => {
    if (!inputImage.base64 || !prompt.trim()) return;

    setStatus(AppStatus.PROCESSING);
    setErrorMessage(null);
    setResultImage(null);
    setVectorSvg(null);
    setComplianceReport(null); // Reset compliance on new gen
    setViewMode('raster');

    try {
      // Inject Template Context if selected
      let finalPrompt = prompt;
      if (selectedTemplate) {
        finalPrompt = `${prompt}. Apply this design to a ${selectedTemplate.promptContext}. Maintain the aspect ratio suitable for ${selectedTemplate.dimensions}.`;
      }

      const generatedImageBase64 = await generatePackagingModification(
        inputImage.base64,
        finalPrompt
      );
      setResultImage(generatedImageBase64);
      setStatus(AppStatus.SUCCESS);
      setVariantNumber(prev => prev + 1);
    } catch (error: any) {
      setErrorMessage(error.message || "An unexpected error occurred.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleVectorize = () => {
    if (!resultImage) return;
    
    setIsVectorizing(true);
    setViewMode('vector');

    setTimeout(() => {
      try {
        window.ImageTracer.imageToSVG(
          resultImage,
          (svgString) => {
            setVectorSvg(svgString);
            setIsVectorizing(false);
          },
          {
            ltrs: 0.1, 
            qtrs: 1, 
            scale: 1, 
            colorsampling: 2, 
            numberofcolors: 64, 
            mincolorratio: 0.02
          }
        );
      } catch (e) {
        console.error(e);
        setErrorMessage("Failed to vectorize image.");
        setIsVectorizing(false);
        setViewMode('raster');
      }
    }, 100);
  };

  const handleSaveToGallery = async () => {
    if (!resultImage) return;
    
    const isVector = viewMode === 'vector';
    const data = isVector && vectorSvg ? vectorSvg : resultImage;
    
    if (!data) return;

    let width = 1024; 
    let height = 1024;

    // Append Template Name to project if active
    const finalProjectName = selectedTemplate 
      ? `${projectName}_${selectedTemplate.name.split(' ')[0]}`
      : projectName;

    const fileName = storageService.generateFilename(finalProjectName, variantNumber, isVector ? 'vector' : 'raster', width, height);
    
    const newFile: StoredFile = {
      id: crypto.randomUUID(),
      projectId: projectName,
      projectName: finalProjectName,
      variant: variantNumber,
      fileName: fileName,
      fileType: isVector ? 'vector' : 'raster',
      data: data,
      createdAt: Date.now(),
      width,
      height
    };

    try {
      await storageService.saveFile(newFile);
      if (linkedSku) {
        await inventoryService.syncArtworkToSKU(linkedSku.id, fileName);
      }
      await loadFiles();
      alert(`Saved ${fileName} to Library!`);
    } catch (e) {
      console.error(e);
      setErrorMessage("Failed to save to local library.");
    }
  };

  const handleDownload = useCallback(() => {
    if (viewMode === 'raster' && resultImage) {
      const link = document.createElement('a');
      link.href = resultImage;
      link.download = storageService.generateFilename(projectName, variantNumber, 'raster');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (viewMode === 'vector' && vectorSvg) {
      const blob = new Blob([vectorSvg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = storageService.generateFilename(projectName, variantNumber, 'vector');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, [resultImage, vectorSvg, viewMode, projectName, variantNumber]);

  const handleDeleteFiles = async (ids: string[]) => {
    await storageService.deleteFiles(ids);
    loadFiles();
  };

  const handleDownloadBundle = async (files: StoredFile[]) => {
    try {
       await storageService.downloadBundle(files, `${projectName}_Bundle`);
    } catch (e: any) {
      setErrorMessage(e.message);
    }
  };

  const handleLoadFile = (file: StoredFile) => {
    setActiveTab('studio');
    if (file.fileType === 'vector') {
       setVectorSvg(file.data);
       setViewMode('vector');
       setResultImage(null); 
    } else {
       setResultImage(file.data);
       setViewMode('raster');
       setVectorSvg(null);
    }
    setProjectName(file.projectName);
    setStatus(AppStatus.SUCCESS);
  };

  // --- Inventory Logic ---
  const handleSkuSearch = async (query: string) => {
    setSkuSearchQuery(query);
    if (query.length > 2) {
      setIsSearchingSku(true);
      const results = await inventoryService.searchSKUs(query);
      setSkuSearchResults(results);
      setIsSearchingSku(false);
    } else {
      setSkuSearchResults([]);
    }
  };

  const selectSku = (sku: InventorySKU) => {
    setLinkedSku(sku);
    setProjectName(sku.name.replace(/[^a-z0-9]/gi, '-'));
    setShowSkuSearch(false);
    setSkuSearchQuery('');
    setComplianceReport(null);
  };

  // --- Compliance Logic ---
  const handleScanCompliance = async () => {
    const targetImage = resultImage || inputImage.base64;
    if (!targetImage) {
        alert("Please generate or upload an image first.");
        return;
    }
    
    setIsScanningCompliance(true);
    try {
        const industry = linkedSku ? linkedSku.category : 'Food';
        const report = await complianceService.analyzeCompliance(targetImage, industry);
        setComplianceReport(report);
    } catch (e: any) {
        setErrorMessage("Compliance Scan Error: " + e.message);
    } finally {
        setIsScanningCompliance(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center shadow-lg shadow-yellow-900/20">
              <span className="font-bold text-gray-900 text-lg">N</span>
            </div>
            
            <div className="flex flex-col">
                <h1 className="text-lg font-bold tracking-tight text-white leading-none">NanoPack Studio</h1>
                
                <div className="relative mt-1">
                    {linkedSku ? (
                        <div 
                            onClick={() => setShowSkuSearch(!showSkuSearch)}
                            className="flex items-center gap-1 text-xs text-indigo-400 cursor-pointer hover:text-indigo-300 bg-indigo-900/20 px-2 py-0.5 rounded border border-indigo-900/50"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            {linkedSku.sku}
                            <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    ) : (
                        <div 
                            onClick={() => setShowSkuSearch(!showSkuSearch)}
                            className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer hover:text-gray-300"
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            Link SKU
                        </div>
                    )}

                    {showSkuSearch && (
                        <div className="absolute top-full left-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-2 z-50">
                            <input 
                                type="text" 
                                placeholder="Search SKUs..." 
                                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm mb-2 focus:outline-none focus:border-yellow-500"
                                value={skuSearchQuery}
                                onChange={(e) => handleSkuSearch(e.target.value)}
                                autoFocus
                            />
                            <div className="max-h-40 overflow-y-auto">
                                {isSearchingSku ? (
                                    <div className="text-center py-2 text-xs text-gray-500">Searching inventory...</div>
                                ) : skuSearchResults.length > 0 ? (
                                    skuSearchResults.map(item => (
                                        <div 
                                            key={item.id} 
                                            onClick={() => selectSku(item)}
                                            className="text-sm p-2 hover:bg-gray-700 rounded cursor-pointer flex flex-col"
                                        >
                                            <span className="text-gray-200 font-medium">{item.sku}</span>
                                            <span className="text-xs text-gray-500 truncate">{item.name}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-2 text-xs text-gray-500">No SKUs found</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="h-6 w-px bg-gray-700 mx-2"></div>
            
            <div className="flex items-center gap-2">
               <input 
                 type="text" 
                 value={projectName}
                 onChange={(e) => setProjectName(e.target.value)}
                 className="bg-transparent border border-transparent hover:border-gray-700 focus:border-yellow-500 rounded px-2 py-1 text-sm text-gray-200 font-medium focus:outline-none transition-colors w-32 lg:w-48 truncate"
                 placeholder="Project Name"
               />
               <span className="text-gray-500 text-sm">v</span>
               <input 
                 type="number" 
                 value={variantNumber}
                 onChange={(e) => setVariantNumber(parseInt(e.target.value) || 1)}
                 className="bg-transparent border border-transparent hover:border-gray-700 focus:border-yellow-500 rounded px-1 py-1 text-sm text-gray-200 font-mono w-12 text-center focus:outline-none transition-colors"
               />
            </div>
          </div>

          <nav className="flex items-center gap-1 bg-gray-800/50 p-1 rounded-lg border border-gray-700">
            <button 
              onClick={() => setActiveTab('studio')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'studio' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Studio
            </button>
            <button 
              onClick={() => setActiveTab('compliance')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'compliance' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Compliance
              {complianceReport && (
                <span className={`w-2 h-2 rounded-full ${complianceReport.score > 85 ? 'bg-green-500' : 'bg-red-500'}`}></span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('datasheet')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'datasheet' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
            >
               Spec Sheet
               {complianceReport && <span className="text-[10px] bg-blue-900 text-blue-200 px-1 rounded">NEW</span>}
            </button>
             <button 
              onClick={() => setActiveTab('library')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'library' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Library 
              <span className="bg-gray-800 px-1.5 rounded-full text-[10px] border border-gray-600">{savedFiles.length}</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        
        {/* STUDIO TAB */}
        {activeTab === 'studio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
            
            {/* Left Column: Inputs (Span 5) */}
            <div className="lg:col-span-5 space-y-6">
               <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-6">
                <h3 className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"></span>
                  Source Asset
                </h3>
                <ImageUploader 
                  imageState={inputImage} 
                  onImageSelect={(state) => {
                      setInputImage(state);
                      setResultImage(null);
                      setVectorSvg(null);
                      setStatus(AppStatus.IDLE);
                  }} 
                />
              </div>

              {/* Template Selection */}
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-6">
                <h3 className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
                  Target Format
                </h3>
                <select 
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={selectedTemplate?.id || ''}
                  onChange={(e) => setSelectedTemplate(templates.find(t => t.id === e.target.value) || null)}
                >
                  <option value="">Custom / No Template</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.dimensions})
                    </option>
                  ))}
                </select>
                {selectedTemplate && (
                   <p className="text-xs text-gray-500 mt-2 italic">
                     Context: will apply artwork to a {selectedTemplate.dimensions} {selectedTemplate.category.toLowerCase()}.
                   </p>
                )}
              </div>

              <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-6">
                <h3 className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"></span>
                  Modification Prompt
                </h3>
                <div className="space-y-4">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the changes naturally... e.g. 'Add a winter holiday theme'"
                    className="w-full h-32 bg-gray-900 border border-gray-700 rounded-xl p-4 text-gray-100 placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 resize-none transition-all font-light"
                  />
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleGenerate}
                      disabled={!inputImage.base64 || !prompt.trim()}
                      isLoading={status === AppStatus.PROCESSING}
                      className="w-full sm:w-auto shadow-lg shadow-yellow-500/20"
                    >
                      Generate Variant
                    </Button>
                  </div>
                </div>
              </div>
              
               {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">{errorMessage}</p>
                </div>
              )}
            </div>

            {/* Right Column: Output (Span 7) */}
            <div className="lg:col-span-7 lg:sticky lg:top-24 space-y-6">
              <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-6 min-h-[600px] flex flex-col relative overflow-hidden">
                
                {/* Output Header */}
                <div className="flex items-center justify-between mb-4 z-10">
                  <h3 className="text-xs uppercase tracking-wider text-gray-400 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></span>
                    Generated Output
                  </h3>
                  
                  {resultImage && (
                    <div className="bg-gray-900 p-1 rounded-lg border border-gray-700 flex shadow-sm">
                      <button 
                        onClick={() => setViewMode('raster')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${viewMode === 'raster' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-300'}`}
                      >
                        Raster (HQ)
                      </button>
                      <button 
                        onClick={() => {
                          setViewMode('vector');
                          if (!vectorSvg) handleVectorize();
                        }}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${viewMode === 'vector' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-300'}`}
                      >
                        Vector (Trace)
                      </button>
                    </div>
                  )}
                </div>

                {/* Canvas Area */}
                <div className="flex-1 bg-gray-900/50 rounded-xl border border-gray-800 flex items-center justify-center overflow-hidden relative group">
                  <div className="absolute inset-0 opacity-20 pointer-events-none" 
                       style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                  </div>

                  {status === AppStatus.PROCESSING && (
                    <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-md z-20 flex flex-col items-center justify-center">
                      <div className="w-16 h-16 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin mb-4"></div>
                      <p className="text-yellow-500 font-medium animate-pulse tracking-wide">Generating Modification...</p>
                      <p className="text-xs text-gray-500 mt-2">Using Gemini 2.5 Flash Image</p>
                    </div>
                  )}

                  {isVectorizing && (
                     <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-md z-20 flex flex-col items-center justify-center">
                      <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                      <p className="text-indigo-400 font-medium animate-pulse">Tracing Vectors...</p>
                    </div>
                  )}

                  {resultImage ? (
                    <div className="relative w-full h-full p-4 flex items-center justify-center">
                      <img 
                        src={resultImage} 
                        alt="Generated packaging" 
                        className={`max-w-full max-h-full object-contain shadow-2xl ${viewMode === 'vector' ? 'hidden' : ''}`}
                      />
                      {viewMode === 'vector' && vectorSvg && (
                        <div 
                          className="w-full h-full [&>svg]:w-full [&>svg]:h-full drop-shadow-lg"
                          dangerouslySetInnerHTML={{ __html: vectorSvg }}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="text-center p-8 max-w-xs opacity-50">
                      <div className="w-20 h-20 mx-auto mb-4 border-2 border-dashed border-gray-700 rounded-2xl flex items-center justify-center">
                         <span className="text-4xl">✨</span>
                      </div>
                      <p className="text-gray-400 font-light">Ready to generate.</p>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                {resultImage && (
                   <div className="mt-6 flex flex-col gap-3 animate-in slide-in-from-bottom-4 fade-in duration-500">
                      <div className="grid grid-cols-2 gap-3">
                        <Button 
                          variant="primary"
                          onClick={handleSaveToGallery} 
                          className="flex items-center gap-2"
                        >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                           </svg>
                           Save to Library
                        </Button>
                        <Button 
                          variant="secondary" 
                          onClick={handleDownload} 
                          className={`${viewMode === 'vector' ? 'bg-indigo-600 hover:bg-indigo-500' : ''}`}
                        >
                           Download {viewMode === 'vector' ? 'SVG' : 'PNG'}
                        </Button>
                      </div>
                   </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* COMPLIANCE TAB */}
        {activeTab === 'compliance' && (
           <div className="animate-in fade-in duration-300 max-w-4xl mx-auto">
              <CompliancePanel 
                report={complianceReport} 
                sku={linkedSku}
                isScanning={isScanningCompliance}
                onScan={handleScanCompliance}
                hasImage={!!(resultImage || inputImage.base64)}
              />
           </div>
        )}

        {/* DATA SHEET TAB */}
        {activeTab === 'datasheet' && (
          <div className="animate-in fade-in duration-300">
            <TechSheet 
              image={resultImage || inputImage.base64}
              report={complianceReport}
              sku={linkedSku}
              projectName={projectName}
              templateDimensions={selectedTemplate?.dimensions}
            />
          </div>
        )}

        {/* LIBRARY TAB */}
        {activeTab === 'library' && (
          <div className="animate-in fade-in duration-300 h-[calc(100vh-8rem)]">
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-6 h-full flex flex-col">
               <div className="mb-6">
                 <h2 className="text-2xl font-bold text-white">Asset Library</h2>
                 <p className="text-gray-400 text-sm mt-1">Manage and organize your generated packaging variants.</p>
               </div>
               <div className="flex-1 min-h-0">
                  <FileManager 
                    files={savedFiles} 
                    onDelete={handleDeleteFiles}
                    onDownloadBundle={handleDownloadBundle}
                    onLoadFile={handleLoadFile}
                  />
               </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;