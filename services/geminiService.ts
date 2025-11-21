import { GoogleGenAI, Type } from "@google/genai";
import { KernelMatrix } from "../types";

const apiKey = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });

const MODEL_NAME = "gemini-2.5-flash";

export const explainKernel = async (kernel: KernelMatrix): Promise<string> => {
  if (!apiKey) return "Please configure your API_KEY to get AI explanations.";

  try {
    const matrixString = kernel.map(row => row.join(", ")).join("\n");
    const prompt = `
      You are an expert in Deep Learning and Computer Vision.
      Analyze the following 3x3 Convolutional Kernel matrix:
      ${matrixString}

      Explain concisely (in Chinese):
      1. What visual features this kernel typically extracts (e.g., vertical edges, blur, sharpening).
      2. How the mathematical values contribute to this effect.
      Keep the explanation under 150 words and easy to understand.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    return response.text || "Unable to generate explanation.";
  } catch (error) {
    console.error("Gemini explanation error:", error);
    return "AI explanation unavailable. Please check your API key.";
  }
};

export const generateKernelFromPrompt = async (userPrompt: string): Promise<{ matrix: KernelMatrix; explanation: string } | null> => {
  if (!apiKey) return null;

  try {
    const prompt = `
      Generate a 3x3 Convolutional Kernel matrix based on the user's description.
      User Description: "${userPrompt}"

      Output a JSON object with:
      1. 'matrix': A 3x3 array of numbers (e.g., [[0,0,0],[0,1,0],[0,0,0]]).
      2. 'explanation': A short sentence explaining what this kernel does.

      Common requests might involve edge detection, blurring, sharpening, or custom directional gradients.
      Ensure the matrix values are reasonable for image processing (usually between -10 and 10, or fractions for blur).
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matrix: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.NUMBER }
              }
            },
            explanation: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return null;

    const result = JSON.parse(text);
    
    // Validate structure
    if (result.matrix && result.matrix.length === 3 && result.matrix[0].length === 3) {
        return {
            matrix: result.matrix as KernelMatrix,
            explanation: result.explanation
        };
    }
    return null;

  } catch (error) {
    console.error("Gemini generation error:", error);
    return null;
  }
};
