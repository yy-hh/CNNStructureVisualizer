import React, { useMemo, useState } from 'react';
import { KernelMatrix, PoolingMode } from '../types';
import { ArrowRight, Sigma, Calculator } from 'lucide-react';

interface StructureVisualizerProps {
  inputPatch: number[][]; // 4x4 grayscale values
  kernel: KernelMatrix;
  useReLU: boolean;
  poolingMode: PoolingMode;
}

const StructureVisualizer: React.FC<StructureVisualizerProps> = ({ inputPatch, kernel, useReLU, poolingMode }) => {
  
  // State to highlight which part of the 2x2 feature map we are explaining
  // 0 = top-left, 1 = top-right, 2 = bottom-left, 3 = bottom-right
  const [activeMapIndex, setActiveMapIndex] = useState(0);

  // Calculate indices for the 4x4 input based on the 2x2 output position
  // Output (0,0) uses Input (0,0) to (2,2)
  // Output (0,1) uses Input (0,1) to (2,3)
  // Output (1,0) uses Input (1,0) to (3,2)
  // Output (1,1) uses Input (1,1) to (3,3)
  const startY = Math.floor(activeMapIndex / 2);
  const startX = activeMapIndex % 2;

  // --------------------------------------------------------------------------
  // 1. CONVOLUTION (Real Calculation)
  // --------------------------------------------------------------------------
  const featureMap = useMemo(() => {
    const map = [[0, 0], [0, 0]];
    const rawMap = [[0, 0], [0, 0]];

    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        let sum = 0;
        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const val = inputPatch[y + ky]?.[x + kx] || 0; 
            const w = kernel[ky][kx];
            sum += val * w;
          }
        }
        rawMap[y][x] = sum;
        map[y][x] = useReLU ? Math.max(0, sum) : sum;
      }
    }
    return { map, rawMap };
  }, [inputPatch, kernel, useReLU]);

  // --------------------------------------------------------------------------
  // 2. POOLING (Real Calculation)
  // --------------------------------------------------------------------------
  const pooledValue = useMemo(() => {
    const vals = [
      featureMap.map[0][0], featureMap.map[0][1],
      featureMap.map[1][0], featureMap.map[1][1]
    ];
    if (poolingMode === 'max') return Math.max(...vals);
    if (poolingMode === 'average') return vals.reduce((a, b) => a + b, 0) / 4;
    return vals[0];
  }, [featureMap, poolingMode]);

  // --------------------------------------------------------------------------
  // 3. FLATTEN (Simulated Multi-Channel)
  // --------------------------------------------------------------------------
  const flatVector = useMemo(() => {
    const v1 = pooledValue; 
    const v2 = Math.abs(255 - pooledValue); 
    const v3 = (pooledValue * 1.5) % 255;   
    const v4 = (pooledValue / 2);           
    return [v1, v2, v3, v4];
  }, [pooledValue]);

  // --------------------------------------------------------------------------
  // 4. FULLY CONNECTED (Simulated Weights for 4 Classes)
  // --------------------------------------------------------------------------
  // 4 Inputs (rows) x 4 Outputs (columns)
  const fcWeights = [
    [ 0.8, -0.5,  0.2,  0.1], 
    [-0.4,  0.9, -0.1, -0.3], 
    [ 0.5, -0.2,  0.8,  0.2], 
    [ 0.1,  0.3,  0.1,  0.9]  
  ];
  const fcBiases = [10, -5, 0, 5];

  const logits = useMemo(() => {
    const result = [0, 0, 0, 0];
    for (let c = 0; c < 4; c++) { 
        let sum = fcBiases[c];
        for (let i = 0; i < 4; i++) { 
            sum += flatVector[i] * fcWeights[i][c];
        }
        result[c] = sum;
    }
    return result;
  }, [flatVector]);

  // --------------------------------------------------------------------------
  // 5. SOFTMAX
  // --------------------------------------------------------------------------
  const probabilities = useMemo(() => {
    const maxLogit = Math.max(...logits); 
    const exps = logits.map(l => Math.exp((l - maxLogit) / 100)); 
    const sumExps = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => (e / sumExps) * 100); 
  }, [logits]);

  const CLASSES = ["Vertical", "Horizontal", "Noise", "Diagonal"];

  // --------------------------------------------------------------------------
  // Helper Components
  // --------------------------------------------------------------------------

  const GridDisplay = ({ data, label, colorClass, isKernel = false, highlightIdx = -1 }: { data: number[][] | KernelMatrix, label: string, colorClass: string, isKernel?: boolean, highlightIdx?: number }) => (
    <div className={`flex flex-col items-center gap-2 transition-transform`}>
      <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">{label}</span>
      <div className={`grid gap-1 p-1.5 bg-gray-900 rounded border border-gray-800`}
           style={{ gridTemplateColumns: `repeat(${data[0].length}, minmax(0, 1fr))` }}
      >
        {data.map((row, i) => (
            <React.Fragment key={i}>
                {row.map((val, j) => {
                    // Calculate logic for highlighting the active receptive field in the 4x4 input
                    let isHighlighted = false;
                    if (label.includes("Input") && highlightIdx !== -1) {
                        const sY = Math.floor(highlightIdx / 2);
                        const sX = highlightIdx % 2;
                        if (i >= sY && i <= sY + 2 && j >= sX && j <= sX + 2) {
                            isHighlighted = true;
                        }
                    }
                    
                    // Highlight active pixel in output map
                    if (label.includes("Map") && highlightIdx !== -1) {
                        const idx = i * 2 + j;
                        if (idx === highlightIdx) isHighlighted = true;
                    }

                    const bgStyle = !isKernel 
                        ? { backgroundColor: `rgba(255, 255, 255, ${val / 255})`, color: val > 128 ? '#000' : '#fff' }
                        : { }; 
                    
                    const kernelColor = isKernel 
                         ? (val > 0 ? 'text-brand-400' : val < 0 ? 'text-red-400' : 'text-gray-600')
                         : '';
                    
                    const borderClass = isHighlighted ? 'ring-2 ring-brand-500 z-10' : 'border-gray-800';

                    return (
                        <button 
                            key={`${i}-${j}`} 
                            onClick={() => {
                                if (label.includes("Map")) setActiveMapIndex(i * 2 + j);
                            }}
                            className={`w-7 h-7 flex items-center justify-center text-[9px] font-mono border rounded ${colorClass} ${kernelColor} ${borderClass} transition-all`}
                            style={bgStyle}
                        >
                            {isKernel ? val : Math.round(val)}
                        </button>
                    );
                })}
            </React.Fragment>
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full bg-gray-950 border-b border-gray-800 animate-in fade-in duration-500">
      
      {/* ------------------------------------------------------------------------
          SECTION 1: LINEAR TRANSFORMATION DETAIL (Convolution Math)
      ------------------------------------------------------------------------- */}
      <div className="w-full bg-gray-900/30 border-b border-gray-800 p-4">
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-4 text-xs font-bold text-brand-400 uppercase tracking-widest">
                <Calculator className="w-4 h-4" /> Linear Transformation Detail
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-4 lg:gap-8">
                
                {/* 1. Input Slice */}
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-gray-500 mb-2">Receptive Field ($X$)</span>
                    <div className="grid grid-cols-3 gap-px bg-gray-800 p-1 rounded border border-gray-700">
                        {[0, 1, 2].map(y => (
                             [0, 1, 2].map(x => {
                                 const val = inputPatch[startY + y]?.[startX + x] || 0;
                                 return (
                                     <div key={`${y}-${x}`} className="w-8 h-8 flex items-center justify-center bg-gray-900 text-xs text-gray-200 font-mono">
                                         {val}
                                     </div>
                                 )
                             })
                        ))}
                    </div>
                </div>

                <div className="text-gray-600 font-bold text-xl">×</div>

                {/* 2. Kernel */}
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-gray-500 mb-2">Kernel ($W$)</span>
                    <div className="grid grid-cols-3 gap-px bg-gray-800 p-1 rounded border border-gray-700">
                        {kernel.map((row, y) => (
                             row.map((val, x) => (
                                 <div key={`${y}-${x}`} className={`w-8 h-8 flex items-center justify-center bg-gray-900 text-xs font-mono ${val!==0 ? 'text-brand-400' : 'text-gray-600'}`}>
                                     {val}
                                 </div>
                             ))
                        ))}
                    </div>
                </div>

                <div className="flex flex-col items-center px-2">
                     <ArrowRight className="text-gray-600 w-6 h-6" />
                     <span className="text-[9px] text-gray-500 mt-1">Dot Product</span>
                </div>

                {/* 3. Calculation Breakdown */}
                <div className="flex flex-col gap-2 bg-gray-900 p-4 rounded-lg border border-gray-800 min-w-[200px]">
                     <div className="text-[10px] text-gray-400 border-b border-gray-800 pb-1 mb-1">Linear Sum ($Z = \sum X_{"{ij}"} \cdot W_{"{ij}"}$)</div>
                     <div className="font-mono text-xs text-gray-300 leading-relaxed break-all max-w-[250px]">
                        {/* Show first few terms */}
                        <span className="opacity-75">
                            ({inputPatch[startY][startX]}×{kernel[0][0]}) + 
                            ({inputPatch[startY][startX+1]}×{kernel[0][1]}) + ...
                        </span>
                     </div>
                     <div className="flex items-center justify-between mt-2">
                         <span className="text-xs text-gray-400">Sum ($Z$):</span>
                         <span className="text-sm font-bold text-white">{featureMap.rawMap[startY][startX].toFixed(1)}</span>
                     </div>
                     <div className="flex items-center justify-between">
                         <span className="text-xs text-brand-400">ReLU ($A$):</span>
                         <span className="text-sm font-bold text-brand-400 border border-brand-500/50 px-1.5 rounded bg-brand-500/10">
                             {Math.round(featureMap.map[startY][startX])}
                         </span>
                     </div>
                </div>
            </div>
        </div>
      </div>


      {/* ------------------------------------------------------------------------
          SECTION 2: NETWORK STRUCTURE FLOW
      ------------------------------------------------------------------------- */}
      <div className="w-full p-6 overflow-x-auto">
        <div className="min-w-[1000px] max-w-[1400px] mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="h-px flex-1 bg-gray-800"></div>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Sigma className="w-4 h-4" /> Network Architecture
                </h2>
                <div className="h-px flex-1 bg-gray-800"></div>
            </div>

            {/* PIPELINE CONTAINER */}
            <div className="flex items-start justify-between gap-4 relative">
                
                {/* --- STAGE 1: INPUT --- */}
                <div className="flex flex-col items-center min-w-[100px]">
                    <div className="mb-2 text-xs font-bold text-gray-300">Input ($4 \times 4$)</div>
                    <GridDisplay 
                        data={inputPatch} 
                        label="Raw Pixels" 
                        colorClass="text-gray-200" 
                        highlightIdx={activeMapIndex} 
                    />
                </div>

                <ArrowRight className="text-gray-700 w-5 h-5 mt-16 shrink-0" />

                {/* --- STAGE 2: CONV --- */}
                <div className="flex flex-col items-center min-w-[120px]">
                    <div className="mb-2 text-xs font-bold text-brand-200">Conv Layer</div>
                    <div className="bg-gray-900 p-2 rounded border border-gray-800 scale-75 mb-2">
                        <GridDisplay data={kernel} label="Kernel (3x3)" colorClass="bg-gray-950" isKernel={true} />
                    </div>
                    <div className="relative cursor-pointer" title="Click cells to inspect math">
                        <GridDisplay 
                            data={featureMap.map} 
                            label="Feature Map" 
                            colorClass="text-gray-200" 
                            highlightIdx={activeMapIndex} 
                        />
                        <div className="absolute -bottom-6 left-0 right-0 text-center text-[9px] text-brand-500 animate-pulse">
                            Click to inspect
                        </div>
                    </div>
                </div>

                <ArrowRight className="text-gray-700 w-5 h-5 mt-16 shrink-0" />

                {/* --- STAGE 3: POOLING --- */}
                <div className="flex flex-col items-center min-w-[100px]">
                    <div className="mb-2 text-xs font-bold text-purple-200">Pooling</div>
                    <div className="mb-2 text-[10px] text-purple-400 font-mono">{poolingMode.toUpperCase()}</div>
                    <div className="w-12 h-12 flex items-center justify-center text-sm font-bold font-mono rounded-lg border-2 shadow-lg transition-all duration-300"
                            style={{
                                backgroundColor: `rgb(${Math.min(255, Math.max(0, pooledValue))}, ${Math.min(255, Math.max(0, pooledValue))}, ${Math.min(255, Math.max(0, pooledValue))})`,
                                color: pooledValue > 128 ? 'black' : 'white',
                                borderColor: '#a855f7'
                            }}
                    >
                        {Math.round(pooledValue)}
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center pt-12 shrink-0">
                    <div className="w-8 h-px bg-gray-700"></div>
                    <div className="text-[9px] text-gray-500 rotate-90 w-20 text-center my-4">FLATTEN</div>
                    <div className="w-8 h-px bg-gray-700"></div>
                </div>

                {/* --- STAGE 4: FLATTEN --- */}
                <div className="flex flex-col items-center min-w-[80px]">
                    <div className="mb-2 text-xs font-bold text-yellow-200">Flatten</div>
                    <div className="flex flex-col gap-1 p-2 bg-gray-900 border border-gray-800 rounded-lg">
                        {flatVector.map((v, i) => (
                            <div key={i} className="w-12 h-8 flex items-center justify-center bg-gray-800 text-[10px] font-mono border border-gray-700 rounded relative">
                                <span className="z-10 text-gray-300">{Math.round(v)}</span>
                                <div 
                                    className="absolute inset-0 bg-yellow-500/20 rounded" 
                                    style={{ width: `${Math.min(100, v/2.55)}%` }} 
                                />
                                {i === 0 && <div className="absolute -left-2 top-1/2 w-2 h-px bg-purple-500"></div>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- STAGE 5: FULLY CONNECTED --- */}
                <div className="flex flex-col items-center min-w-[140px] relative">
                    <div className="mb-2 text-xs font-bold text-orange-200">Dense Layer</div>
                    
                    <div className="flex items-center justify-between w-full gap-4">
                        {/* SVG Connections */}
                        <svg className="w-24 h-40 overflow-visible">
                            {/* Draw lines from 4 input nodes to 4 output nodes */}
                            {[0,1,2,3].map(inIdx => (
                                [0,1,2,3].map(outIdx => {
                                    const opacity = Math.abs(fcWeights[inIdx][outIdx]); // Visualize weight strength
                                    const color = fcWeights[inIdx][outIdx] > 0 ? '#fb923c' : '#64748b'; // Orange pos, Slate neg
                                    return (
                                        <line 
                                            key={`${inIdx}-${outIdx}`}
                                            x1="0" y1={16 + inIdx * 34} 
                                            x2="100%" y2={12 + outIdx * 36} 
                                            stroke={color} 
                                            strokeWidth={opacity * 2}
                                            strokeOpacity={0.6}
                                        />
                                    )
                                })
                            ))}
                        </svg>

                        {/* Logits */}
                        <div className="flex flex-col gap-6">
                            {logits.map((val, i) => (
                                <div key={i} className="w-10 h-10 rounded-full bg-gray-800 border border-orange-500/30 flex items-center justify-center text-[9px] text-orange-200 font-mono shadow-lg">
                                    {Math.round(val)}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <ArrowRight className="text-gray-700 w-5 h-5 mt-16 shrink-0" />

                {/* --- STAGE 6: SOFTMAX --- */}
                <div className="flex flex-col items-center min-w-[160px]">
                    <div className="mb-2 text-xs font-bold text-green-200">Softmax</div>
                    <div className="flex flex-col gap-3 w-full">
                        {probabilities.map((prob, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="w-full h-6 bg-gray-900 rounded-full overflow-hidden border border-gray-800 relative group">
                                    <div 
                                        className="h-full bg-gradient-to-r from-green-900 to-green-500 transition-all duration-300"
                                        style={{ width: `${prob}%` }}
                                    ></div>
                                    <div className="absolute inset-0 flex items-center justify-between px-2">
                                        <span className="text-[9px] font-bold text-white shadow-black drop-shadow-md z-10">{CLASSES[i]}</span>
                                        <span className="text-[9px] font-mono text-green-100 z-10">{prob.toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 bg-gray-900/50 p-2 rounded border border-gray-800 text-center">
                        <p className="text-[9px] text-gray-400">Class:</p>
                        <p className="text-xs font-bold text-green-400">
                            {CLASSES[probabilities.indexOf(Math.max(...probabilities))]}
                        </p>
                    </div>
                </div>

            </div>
        </div>
      </div>
    </div>
  );
};

export default StructureVisualizer;