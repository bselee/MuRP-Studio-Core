import { GoogleGenAI, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY || '';

export const generatePackagingModification = async (
  base64Image: string,
  prompt: string
): Promise<string> => {
  if (!API_KEY) {
    throw new Error("API Key is missing. Please check your environment.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  // Extract the actual base64 data and mime type from the data URL
  // Format: data:image/png;base64,iVBORw0KGgo...
  const match = base64Image.match(/^data:(.+);base64,(.+)$/);
  
  if (!match) {
    throw new Error("Invalid image format.");
  }

  const mimeType = match[1];
  const data = match[2];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // "Nano Banana"
      contents: {
        parts: [
          {
            inlineData: {
              data: data,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        // Nano Banana only supports responseModalities config for editing
        responseModalities: [Modality.IMAGE],
      },
    });

    // Extract the generated image
    const part = response.candidates?.[0]?.content?.parts?.[0];
    
    if (part && part.inlineData && part.inlineData.data) {
      return `data:image/png;base64,${part.inlineData.data}`;
    } else {
      throw new Error("No image data returned from the model.");
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to generate image modification.");
  }
};