import { KernelMatrix, ProcessingOptions } from "../types";

/**
 * Applies a 3x3 convolution kernel to image data.
 * This runs on the CPU (JavaScript main thread). For larger images, 
 * a WebGL or WebWorker approach would be better, but this is sufficient for educational visualization.
 */
export const applyConvolution = (
  imageData: ImageData,
  kernel: KernelMatrix,
  options: ProcessingOptions
): ImageData => {
  const width = imageData.width;
  const height = imageData.height;
  const input = imageData.data;
  const output = new Uint8ClampedArray(input.length);
  
  // Flat kernel for faster access
  const k = kernel.flat();
  const kSum = k.reduce((a, b) => a + b, 0);
  
  // Pre-calculate kernel weight normalization if needed (e.g. for blur)
  // Often in CNNs we don't normalize during the conv op, but for visualization,
  // if the sum > 1 (like blur), we might want to divide by sum to keep brightness.
  // However, the user might WANT the raw output. 
  // We'll stick to raw math and then optional post-processing.

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;

      // Apply 3x3 kernel
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          // Handle boundary (zero padding or extend edges - we use zero padding effectively by checking bounds)
          const py = y + ky;
          const px = x + kx;

          if (px >= 0 && px < width && py >= 0 && py < height) {
            const pixelIndex = (py * width + px) * 4;
            const weight = kernel[ky + 1][kx + 1];

            r += input[pixelIndex] * weight;
            g += input[pixelIndex + 1] * weight;
            b += input[pixelIndex + 2] * weight;
          }
        }
      }

      const outputIndex = (y * width + x) * 4;

      // Apply Processing Options
      
      // 1. ReLU-like behavior or Absolute value
      if (options.useReLU) {
        r = Math.max(0, r);
        g = Math.max(0, g);
        b = Math.max(0, b);
      } else {
        // Often visualizations use absolute value to show "strength" of feature regardless of direction
         r = Math.abs(r);
         g = Math.abs(g);
         b = Math.abs(b);
      }
      
      // 2. Grayscale conversion (simulating a single feature map channel)
      if (options.useGrayscale) {
        const avg = (r + g + b) / 3;
        r = avg;
        g = avg;
        b = avg;
      }

      output[outputIndex] = r;
      output[outputIndex + 1] = g;
      output[outputIndex + 2] = b;
      output[outputIndex + 3] = 255; // Alpha
    }
  }
  
  // 3. Normalize result to 0-255 if requested (useful if kernel produced very small or large values)
  if (options.normalize) {
      let min = 255, max = 0;
      for (let i = 0; i < output.length; i += 4) {
          min = Math.min(min, output[i], output[i+1], output[i+2]);
          max = Math.max(max, output[i], output[i+1], output[i+2]);
      }
      
      const range = max - min;
      if (range > 0) {
          for (let i = 0; i < output.length; i += 4) {
              output[i] = ((output[i] - min) / range) * 255;
              output[i+1] = ((output[i+1] - min) / range) * 255;
              output[i+2] = ((output[i+2] - min) / range) * 255;
          }
      }
  }

  return new ImageData(output, width, height);
};
