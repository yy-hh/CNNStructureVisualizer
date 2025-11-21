import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Brain, Sparkles, Wand2, Activity, Info, Layers, Grid3X3 } from 'lucide-react';
import KernelGrid from './components/KernelGrid';
import ImageDisplay from './components/ImageDisplay';
import StructureVisualizer from './components/StructureVisualizer';
import { KernelMatrix, ProcessingOptions, PoolingMode } from './types';
import { DEFAULT_IMAGE_URL, PRESET_KERNELS } from './constants';
import { applyConvolution } from './utils/imageProcessing';
import { explainKernel, generateKernelFromPrompt } from './services/geminiService';

// Default processing options
const DEFAULT_OPTIONS: ProcessingOptions = {
  useGrayscale: true,
  useReLU: true,
  normalize: false
};

const App: React.FC = () => {
  // State
  const [imageSrc, setImageSrc] = useState<string>(DEFAULT_IMAGE_URL);
  const [kernel, setKernel] = useState<KernelMatrix>(PRESET_KERNELS[0].matrix);
  const [processedImageData, setProcessedImageData] = useState<ImageData | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState(false);
  const [options, setOptions] = useState<ProcessingOptions>(DEFAULT_OPTIONS);
  const [poolingMode, setPoolingMode] = useState<PoolingMode>('max');
  
  // Visualization State
  // Initialize as 4x4 for the structure visualizer
  const [selectedPatch, setSelectedPatch] = useState<number[][]>([
      [0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]
  ]);
  const [viewMode, setViewMode] = useState<'structure' | 'preview'>('structure');

  // AI State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [explanation, setExplanation] = useState<string>(PRESET_KERNELS[0].description);
  const [showAiPanel, setShowAiPanel] = useState(false);

  const sourceCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePresetChange = (presetName: string) => {
    const preset = PRESET_KERNELS.find(p => p.name === presetName);
    if (preset) {
      setKernel(preset.matrix);
      setExplanation(preset.description);
    }
  };

  const handleKernelChange = (newKernel: KernelMatrix) => {
    setKernel(newKernel);
    setExplanation("Custom kernel configuration.");
  };

  const handlePatchSelect = (patch: number[][]) => {
    setSelectedPatch(patch);
  };

  // --------------------------------------------------------------------------
  // AI Functions
  // --------------------------------------------------------------------------

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setExplanation("Generating kernel...");
    
    const result = await generateKernelFromPrompt(aiPrompt);
    if (result) {
      setKernel(result.matrix);
      setExplanation(result.explanation);
    } else {
      setExplanation("Failed to generate kernel. Please try a different description.");
    }
    setAiLoading(false);
  };

  const handleAiExplain = async () => {
    setAiLoading(true);
    const text = await explainKernel(kernel);
    setExplanation(text);
    setAiLoading(false);
  };

  // --------------------------------------------------------------------------
  // Processing Effect
  // --------------------------------------------------------------------------

  useEffect(() => {
    const processImage = () => {
      setIsProcessing(true);
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = imageSrc;
      
      img.onload = () => {
        const MAX_SIZE = 400; // Smaller for performance
        let w = img.width;
        let h = img.height;
        
        if (w > MAX_SIZE || h > MAX_SIZE) {
          const ratio = Math.min(MAX_SIZE / w, MAX_SIZE / h);
          w *= ratio;
          h *= ratio;
        }

        sourceCanvasRef.current.width = w;
        sourceCanvasRef.current.height = h;
        const ctx = sourceCanvasRef.current.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);
          
          setTimeout(() => {
             const result = applyConvolution(imageData, kernel, options);
             setProcessedImageData(result);
             setIsProcessing(false);
             
             // Set initial patch from center (4x4)
             const cx = Math.floor(w/2);
             const cy = Math.floor(h/2);
             const pData = ctx.getImageData(cx-1, cy-1, 4, 4).data;
             const initPatch: number[][] = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
             for(let i=0; i<4; i++) {
                 for(let j=0; j<4; j++) {
                     const idx = (i*4+j)*4;
                     initPatch[i][j] = Math.round((pData[idx] + pData[idx+1] + pData[idx+2])/3);
                 }
             }
             setSelectedPatch(initPatch);
          }, 10);
        }
      };
    };

    const timer = setTimeout(processImage, 50);
    return () => clearTimeout(timer);

  }, [imageSrc, kernel, options]);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-200 font-sans selection:bg-brand-500 selection:text-white">
      
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-500/10 rounded-lg border border-brand-500/20">
            <Brain className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">NeuroLens</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">CNN Visualizer</p>
          </div>
        </div>
        
        {/* View Switcher */}
        <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
            <button 
                onClick={() => setViewMode('structure')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-all ${viewMode === 'structure' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
            >
                <Layers className="w-3.5 h-3.5" /> Structure & Math
            </button>
            <button 
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-all ${viewMode === 'preview' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
            >
                <Grid3X3 className="w-3.5 h-3.5" /> Full Feature Map
            </button>
        </div>

        <div className="flex items-center gap-4">
           <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 rounded-full cursor-pointer transition-colors border border-gray-700">
             <Upload className="w-3.5 h-3.5" />
             <span>Upload</span>
             <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
           </label>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Section: Structure Visualization (Conditional or Always Visible based on mode) */}
        {viewMode === 'structure' && (
           <div className="flex-shrink-0">
              <StructureVisualizer 
                inputPatch={selectedPatch} 
                kernel={kernel} 
                useReLU={options.useReLU}
                poolingMode={poolingMode}
              />
           </div>
        )}

        {/* Main Work Area */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            
            {/* LEFT: Input & Controls */}
            <div className="lg:col-span-5 flex flex-col gap-4">
               
               {/* Input Image */}
               <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-xl flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Camera className="w-4 h-4 text-brand-400" /> Input Source
                    </h2>
                    <span className="text-[10px] text-brand-300 animate-pulse">
                        {viewMode === 'structure' ? "HOVER TO INSPECT" : "RAW IMAGE"}
                    </span>
                  </div>
                  
                  <div className="flex justify-center bg-black/20 rounded-lg p-2">
                    <ImageDisplay 
                        src={imageSrc} 
                        title="" 
                        interactive={true} // Always interactive to select patch
                        onPatchSelect={handlePatchSelect}
                        showScanLine={false}
                    />
                  </div>
               </div>

               {/* Kernel Editor */}
               <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex-1">
                   <div className="flex justify-between items-center mb-4">
                        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                            <Activity className="w-4 h-4 text-purple-400" /> Filter Weights
                        </h2>
                        <button 
                            onClick={() => setShowAiPanel(!showAiPanel)}
                            className={`p-1.5 rounded transition-colors ${showAiPanel ? 'bg-brand-500/20 text-brand-400' : 'bg-gray-800 text-gray-400'}`}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                        </button>
                   </div>

                   {/* AI Panel */}
                   {showAiPanel && (
                        <div className="mb-4 p-3 bg-gray-800/80 rounded-lg border border-gray-700">
                            <div className="flex gap-2 mb-2">
                                <input 
                                    type="text" 
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder="Find vertical edges..." 
                                    className="flex-1 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-xs focus:border-brand-500 outline-none"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
                                />
                                <button onClick={handleAiGenerate} disabled={aiLoading} className="bg-brand-600 px-2 rounded text-white disabled:opacity-50">
                                    <Wand2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <button onClick={handleAiExplain} className="text-[10px] text-brand-400 hover:underline flex items-center gap-1">
                                <Info className="w-3 h-3" /> Explain this kernel
                            </button>
                        </div>
                    )}

                    <div className="flex gap-6 items-start justify-center">
                        <KernelGrid kernel={kernel} onChange={handleKernelChange} />
                        <div className="flex flex-col gap-2 max-w-[120px]">
                             <label className="text-[10px] text-gray-500 font-bold">PRESETS</label>
                             <div className="flex flex-wrap gap-1.5">
                                {PRESET_KERNELS.map(p => (
                                    <button
                                    key={p.name}
                                    onClick={() => handlePresetChange(p.name)}
                                    className="px-2 py-1 text-[10px] bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 hover:border-gray-500 text-left truncate w-full"
                                    title={p.name}
                                    >
                                    {p.name.split('(')[0]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                         <p className="text-xs text-gray-400 leading-relaxed italic">
                            "{aiLoading ? "Analyzing..." : explanation}"
                         </p>
                    </div>
               </div>
            </div>

            {/* RIGHT: Output & Options */}
            <div className="lg:col-span-7 flex flex-col gap-4">
                
                {/* Options */}
                <div className="grid grid-cols-3 gap-3">
                    <div 
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${options.useGrayscale ? 'bg-brand-900/20 border-brand-500/50' : 'bg-gray-900 border-gray-800'}`}
                        onClick={() => setOptions(o => ({...o, useGrayscale: !o.useGrayscale}))}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-300">Grayscale</span>
                            <div className={`w-2 h-2 rounded-full ${options.useGrayscale ? 'bg-brand-400' : 'bg-gray-600'}`} />
                        </div>
                        <p className="text-[10px] text-gray-500">Single-channel output.</p>
                    </div>
                    <div 
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${options.useReLU ? 'bg-brand-900/20 border-brand-500/50' : 'bg-gray-900 border-gray-800'}`}
                        onClick={() => setOptions(o => ({...o, useReLU: !o.useReLU}))}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-300">ReLU</span>
                            <div className={`w-2 h-2 rounded-full ${options.useReLU ? 'bg-brand-400' : 'bg-gray-600'}`} />
                        </div>
                        <p className="text-[10px] text-gray-500">Clamp negatives to 0.</p>
                    </div>
                     <div 
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${viewMode === 'structure' ? 'bg-purple-900/20 border-purple-500/50' : 'bg-gray-900 border-gray-800'}`}
                        onClick={() => setPoolingMode(p => p === 'max' ? 'average' : 'max')}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-purple-300">Pooling: {poolingMode === 'max' ? 'Max' : 'Avg'}</span>
                            <div className="w-2 h-2 rounded-full bg-purple-400" />
                        </div>
                        <p className="text-[10px] text-gray-500">Click to toggle type.</p>
                    </div>
                </div>

                {/* Output Preview */}
                <div className="flex-1 bg-gray-900/50 border border-gray-800 p-4 rounded-xl flex flex-col">
                     <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-brand-400" /> Feature Map Output
                        </h2>
                        {isProcessing && <span className="text-xs text-brand-400 animate-pulse">Convolving...</span>}
                     </div>
                     
                     <div className="flex-1 flex items-center justify-center bg-black/20 rounded-lg min-h-[300px]">
                        <ImageDisplay 
                            imageData={processedImageData} 
                            title="" 
                            showScanLine={false} 
                        />
                     </div>
                     
                     <div className="mt-2 text-[10px] text-gray-500 text-center font-mono">
                        Visualizing the convolution output map (Pooling is shown in Structure View only).
                     </div>
                </div>

            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default App;