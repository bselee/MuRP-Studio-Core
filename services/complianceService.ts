import { GoogleGenAI, Type } from "@google/genai";
import { ComplianceReport, RegulatoryEntity } from "../types";

const API_KEY = process.env.API_KEY || '';

// Static Regulatory Database
export const REGULATORY_DATABASE: RegulatoryEntity[] = [
  {
    id: 'FDA',
    name: 'U.S. Food and Drug Administration',
    industry: 'Food',
    requiredElements: ['Nutrition Facts', 'Net Quantity', 'Ingredient List', 'Manufacturer Address', 'Allergen Declaration'],
    restrictedTerms: ['Cures', 'Heals', 'Therapeutic', 'Treatment']
  },
  {
    id: 'USDA',
    name: 'U.S. Department of Agriculture',
    industry: 'Agriculture',
    requiredElements: ['USDA Seal (if organic)', 'Country of Origin', 'Grade Shield'],
    restrictedTerms: ['Organic (without certification)', '100% Natural (unverified)']
  },
  {
    id: 'EPA',
    name: 'Environmental Protection Agency',
    industry: 'Chemicals',
    requiredElements: ['Signal Word (Danger/Warning)', 'Precautionary Statements', 'First Aid Instructions', 'EPA Reg. No.'],
    restrictedTerms: ['Safe', 'Harmless', 'Non-toxic']
  }
];

export const complianceService = {
  
  getRegulationsForCategory: (category: string): RegulatoryEntity | undefined => {
    // Simple mapping
    if (category === 'Food') return REGULATORY_DATABASE.find(r => r.id === 'FDA');
    if (category === 'Agriculture') return REGULATORY_DATABASE.find(r => r.id === 'USDA');
    return REGULATORY_DATABASE[0]; // Default to FDA for demo
  },

  analyzeCompliance: async (
    base64Image: string, 
    industry: string
  ): Promise<ComplianceReport> => {
    if (!API_KEY) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const model = "gemini-2.5-flash"; // Using Flash for fast multimodal analysis

    // Extract base64 data
    const match = base64Image.match(/^data:(.+);base64,(.+)$/);
    if (!match) throw new Error("Invalid image");
    const mimeType = match[1];
    const data = match[2];

    const regulations = complianceService.getRegulationsForCategory(industry);
    
    const prompt = `
      Act as a strict Regulatory Compliance Officer AND a Product Data Specialist for the ${industry} industry.
      Analyze the packaging artwork in this image.
      
      1. Compliance Checks:
      - Check for required elements: ${regulations?.requiredElements.join(', ')}.
      - Check for prohibited claims: ${regulations?.restrictedTerms.join(', ')}.
      - OCR the Ingredient List accurately.
      - Check for Barcode/UPC visibility.

      2. Data Extraction (for Tech Sheet):
      - Extract the main marketing headline.
      - Extract key feature claims (e.g. "Gluten Free", "Non-GMO").
      - Describe the Flavor Profile or Scent Profile if applicable.
      
      Return a JSON object with the specified schema.
    `;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: {
            parts: [
                { inlineData: { data, mimeType } },
                { text: prompt }
            ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.INTEGER, description: "0 to 100 compliance safety score" },
              status: { type: Type.STRING, enum: ["compliant", "warning", "non-compliant"] },
              detectedIndustry: { type: Type.STRING },
              regulatoryBody: { type: Type.STRING },
              checks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    passed: { type: Type.BOOLEAN },
                    details: { type: Type.STRING }
                  }
                }
              },
              ingredientAnalysis: {
                type: Type.OBJECT,
                properties: {
                  found: { type: Type.BOOLEAN },
                  text: { type: Type.STRING },
                  flaggedIngredients: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              },
              barcodeAnalysis: {
                type: Type.OBJECT,
                properties: {
                  found: { type: Type.BOOLEAN },
                  readable: { type: Type.BOOLEAN },
                  type: { type: Type.STRING }
                }
              },
              invalidStatements: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              marketingCopy: {
                type: Type.OBJECT,
                properties: {
                  headline: { type: Type.STRING },
                  claims: { type: Type.ARRAY, items: { type: Type.STRING } },
                  flavorProfile: { type: Type.STRING }
                }
              }
            }
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");
      
      return JSON.parse(text) as ComplianceReport;

    } catch (e) {
      console.error("Compliance Scan Failed", e);
      throw new Error("Failed to scan artwork for compliance.");
    }
  }
};