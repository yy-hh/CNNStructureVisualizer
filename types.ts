export type KernelMatrix = [
  [number, number, number],
  [number, number, number],
  [number, number, number]
];

export interface PresetKernel {
  name: string;
  matrix: KernelMatrix;
  description: string;
}

export interface ProcessingOptions {
  useGrayscale: boolean;
  useReLU: boolean; // Clamp negative values to 0
  normalize: boolean; // Normalize values to 0-255 range based on min/max
}

export type PoolingMode = 'max' | 'average';