import { PresetKernel, KernelMatrix } from './types';

export const DEFAULT_IMAGE_URL = "https://picsum.photos/id/175/500/500?grayscale"; // Static ID (Clock/Architecture) to ensure consistency

export const IDENTITY_KERNEL: KernelMatrix = [
  [0, 0, 0],
  [0, 1, 0],
  [0, 0, 0]
];

export const PRESET_KERNELS: PresetKernel[] = [
  {
    name: "Edge Detection (Sobel Horizontal)",
    matrix: [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1]
    ],
    description: "Detects horizontal edges by calculating the gradient in the Y direction."
  },
  {
    name: "Edge Detection (Sobel Vertical)",
    matrix: [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1]
    ],
    description: "Detects vertical edges by calculating the gradient in the X direction."
  },
  {
    name: "Edge Detection (Laplacian)",
    matrix: [
      [0, 1, 0],
      [1, -4, 1],
      [0, 1, 0]
    ],
    description: "Detects edges in all directions by approximating the second derivative."
  },
  {
    name: "Sharpen",
    matrix: [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0]
    ],
    description: "Enhances the differences between adjacent pixels."
  },
  {
    name: "Box Blur",
    matrix: [
      [1/9, 1/9, 1/9],
      [1/9, 1/9, 1/9],
      [1/9, 1/9, 1/9]
    ],
    description: "Averages neighboring pixels to reduce noise and detail."
  },
  {
    name: "Emboss",
    matrix: [
      [-2, -1, 0],
      [-1, 1, 1],
      [0, 1, 2]
    ],
    description: "Creates a 3D shadow effect."
  }
];