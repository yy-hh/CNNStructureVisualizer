import React, { useEffect, useRef, useState } from 'react';

interface ImageDisplayProps {
  src?: string;
  imageData?: ImageData;
  title: string;
  showScanLine?: boolean;
  interactive?: boolean;
  onPatchSelect?: (patch: number[][]) => void;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({ 
  src, 
  imageData, 
  title, 
  showScanLine, 
  interactive,
  onPatchSelect 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

  // Draw main image
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Reset dimensions if src/imageData changes to avoid stale state
    const updateCanvas = (imgWidth: number, imgHeight: number, drawFn: () => void) => {
       canvas.width = imgWidth;
       canvas.height = imgHeight;
       drawFn();
       setDimensions({ w: imgWidth, h: imgHeight });
       
       if (overlayRef.current) {
         overlayRef.current.width = imgWidth;
         overlayRef.current.height = imgHeight;
       }
    };

    if (src) {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = src;
      img.onload = () => {
        // Max width constraint for display
        const MAX_W = 500;
        let w = img.width;
        let h = img.height;
        
        if (w > MAX_W) {
           const scale = MAX_W / w;
           w *= scale;
           h *= scale;
        }
        
        updateCanvas(w, h, () => ctx.drawImage(img, 0, 0, w, h));
      };
    } else if (imageData) {
      updateCanvas(imageData.width, imageData.height, () => ctx.putImageData(imageData, 0, 0));
    }
  }, [src, imageData]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive || !canvasRef.current || !overlayRef.current) return;

    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate scaling if CSS resizes the canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    // Boundary checks (keep 4x4 box inside)
    // We need x to x+3 and y to y+3 to be valid. 
    // Let's center the mouse on the top-left 2x2 of the 4x4 block roughly
    if (x < 1 || x >= canvas.width - 2 || y < 1 || y >= canvas.height - 2) return;

    // Draw Highlight Box on Overlay
    const ctxOverlay = overlay.getContext('2d');
    if (ctxOverlay) {
      ctxOverlay.clearRect(0, 0, overlay.width, overlay.height);
      ctxOverlay.strokeStyle = '#0ea5e9'; // brand-500
      ctxOverlay.lineWidth = 2;
      
      // Draw the 4x4 receptive field box (needed for 2x2 output after 3x3 conv)
      // Box from x-1 to x+3 (total 4 pixels)
      const startX = x - 1;
      const startY = y - 1;
      
      ctxOverlay.strokeRect(startX, startY, 4, 4);
      
      // Visual guide: dotted inner lines to show the 2x2 pooling regions could go here, 
      // but let's keep it simple.
    }

    // Extract Data
    const ctx = canvas.getContext('2d');
    if (ctx && onPatchSelect) {
      // Get 4x4 patch
      const startX = x - 1;
      const startY = y - 1;
      const pData = ctx.getImageData(startX, startY, 4, 4).data;
      const matrix: number[][] = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
      
      // Convert to grayscale matrix 0-255
      for (let i = 0; i < 4; i++) { // row
        for (let j = 0; j < 4; j++) { // col
          const idx = (i * 4 + j) * 4;
          const r = pData[idx];
          const g = pData[idx + 1];
          const b = pData[idx + 2];
          // Standard luminance or simple average
          matrix[i][j] = Math.round((r + g + b) / 3);
        }
      }
      onPatchSelect(matrix);
    }
  };

  const handleMouseLeave = () => {
    if (!interactive || !overlayRef.current) return;
    const ctx = overlayRef.current.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
  };

  return (
    <div className="flex flex-col items-center w-full">
      <h3 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
        {title}
        {interactive && <span className="text-[10px] bg-brand-900 text-brand-300 px-2 py-0.5 rounded-full animate-pulse">Hover to Inspect</span>}
      </h3>
      <div 
        ref={containerRef}
        className="relative group rounded-lg overflow-hidden border border-gray-800 bg-gray-950/50 shadow-2xl"
        style={{ minHeight: '100px' }}
      >
        <canvas ref={canvasRef} className="block max-w-full h-auto image-pixelated" />
        
        <canvas 
            ref={overlayRef}
            className="absolute inset-0 w-full h-full cursor-crosshair pointer-events-auto"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        />

        {showScanLine && (
          <div className="absolute top-0 left-0 w-full h-1 bg-brand-500 shadow-[0_0_15px_rgba(14,165,233,0.8)] opacity-50 animate-scan pointer-events-none"></div>
        )}
        
        {!src && !imageData && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600">
            <span className="text-sm">No Image Data</span>
          </div>
        )}
      </div>
      <style>{`
        .image-pixelated {
            image-rendering: pixelated; /* Essential for visualizing individual pixels clearly */
        }
      `}</style>
    </div>
  );
};

export default ImageDisplay;