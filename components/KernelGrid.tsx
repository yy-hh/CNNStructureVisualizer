import React from 'react';
import { KernelMatrix } from '../types';

interface KernelGridProps {
  kernel: KernelMatrix;
  onChange: (newKernel: KernelMatrix) => void;
  disabled?: boolean;
}

const KernelGrid: React.FC<KernelGridProps> = ({ kernel, onChange, disabled }) => {
  const handleChange = (row: number, col: number, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return; // Allow typing handling could be better, but sufficient for now

    // Create a deep copy of the kernel to avoid mutation and satisfy tuple types
    const newKernel: KernelMatrix = [
      [...kernel[0]] as [number, number, number],
      [...kernel[1]] as [number, number, number],
      [...kernel[2]] as [number, number, number]
    ];
    newKernel[row][col] = numValue;
    onChange(newKernel);
  };

  return (
    <div className="grid grid-rows-3 gap-2 p-4 bg-gray-900 rounded-xl border border-gray-800 shadow-inner w-fit mx-auto">
      {kernel.map((row, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-3 gap-2">
          {row.map((val, colIndex) => (
            <input
              key={`${rowIndex}-${colIndex}`}
              type="number"
              step="0.1"
              value={val}
              disabled={disabled}
              onChange={(e) => handleChange(rowIndex, colIndex, e.target.value)}
              className="w-14 h-14 text-center bg-gray-800 text-brand-400 font-mono font-bold text-lg rounded-md border border-gray-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default KernelGrid;