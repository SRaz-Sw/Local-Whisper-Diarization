// client/nextjs-v1/src/app/compare/features/marketResearch/webResearch/google-gemini.ts

import { GoogleGenAI } from "@google/genai";
import { QuickModelType } from "../yad2/yad2.types";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface GeminiSearchResult {
  text: string;
  sources?: Array<{
    url: string;
    title: string;
    snippet?: string;
  }>;
  finishReason: string;
  usage?: {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
  };
  webSearchQueries?: string[];
}

// ============================================================================
// GEMINI API INITIALIZATION
// ============================================================================

const ai = new GoogleGenAI({
  apiKey:
    process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
});

// ============================================================================
// PROMPT GENERATION
// ============================================================================
function getGeminiSystemPrompt(): string {
  return `
  You are NextjsV1 AI, an expert automotive researcher. I need you to search for current, up-to-date information about a specific car model in the Israeli market.
  Your resources should be official websites of the car manufacturer, and other websites like "Yad2", "Facebook Marketplace", ״https://www.opl.co.il/", "carwiz" ,  "carzone".
  Search the web thoroughly to get the most current and accurate information available.
  Respond shortly with, Structured and precise answer with 200 words or less (In total) - For each data point provide the number expected and a maximum 7 additional words - BE SHARP AND CONCISE.
  Please focus specifically on the Israeli market context.
  `;
}

/**
 * 
 Let's expolore this car: 
 - Manufacturer: Toyota / טויוטה
- Model: Corolla / קורולה
- Model Aliases: קורולה קרוס, קורולה הייבריד
- Year From: 2021
- Year To: 2023
- User Query: "מה המחיר של טויוטה קורולה 2021 בישראל?"

 ______________ REST OF THE PROMPT ______________
 */
function generateGeminiSearchPrompt(
  userQuery: string,
  quickModelDetails: QuickModelType,
): string {
  return ` Let's expolore this car: 
  
- Manufacturer: ${quickModelDetails.englishManufacturer} / ${quickModelDetails.hebrewManufacturer}
- Model: ${quickModelDetails.englishModel} / ${quickModelDetails.hebrewModel}
- Model Aliases: ${quickModelDetails.modelAliases.join(", ")}
- Year From: ${quickModelDetails.yearFrom} 
${quickModelDetails.yearTo ? `- Year To: ${quickModelDetails.yearTo}` : ""}
- User Query: "${userQuery}"


SEARCH FOR AND PROVIDE THE FOLLOWING INFORMATION:

1. ## **Current Market Data (Israel 2025):**
- New car price range (if still sold)
- Used car market prices by year (Year From - Year To) or (2019-2024)
- Market availability and popularity (rank from 1 to 10)

2. ## **Technical Specifications:**
- Fuel type (gasoline/hybrid/electric/diesel) - [IMPORTANT - triple check] (if not provided, default to hybrid [if the car has hybrid engine])
- Official fuel consumption (L/100KM or kWh/100KM) - [IMPORTANT - triple check]
Note: if there are several variants, the format should be:
- gasoline: _L/100KM
- hybrid: _L/100KM
- electric: _kWh/100KM
- diesel: _L/100KM

3. ## **Maintenance & Reliability:**
- Brand reputation for reliability (rank from 1 to 10)
- Common maintenance issues (rank from 1 to 10)
- Average annual maintenance costs < baseline is 3500 NIS for gasoline, 4000 NIS for hybrid, 1200 NIS for electric>

4. ## **Depreciation Insights:**
- How this model holds its value (Lower is better) < baseline 14% per year> - [IMPORTANT - triple check]
  Note that in general - the brand depreciation adjustments are:
  reliable: -1.5%, (Toyota, Hyundai, Kia, etc.)
	luxury: 2.5%, (Mercedes, BMW, Audi, etc.)
	chinese: 3.5%, (Chery, Geely, etc.)

5. ## **Market Insights:**
- Key insights about this model in the Israeli market (4 words max for each insight)

6. ## ** General Research :**
- Car class - 1 is cheapest, 10 is most expensive and luxurious
- Reliability - rank from 1 to 10 (how reliable the car is)
- Maintenance - rank from 1 to 10 (how expensive it is to fix it)

`;
}

// ============================================================================
// MAIN GEMINI SEARCH FUNCTIONS
// ============================================================================

export async function performGeminiCarResearch(
  userQuery: string,
  quickModelDetails: QuickModelType,
  model: "flash" | "pro" = "flash",
): Promise<GeminiSearchResult> {
  try {
    const prompt = generateGeminiSearchPrompt(
      userQuery,
      quickModelDetails,
    );

    const modelConfig = {
      flash: {
        modelName: "gemini-2.5-flash",
        maxTokens: 2048,
        description: "gemini-2.5-flash",
      },
      pro: {
        modelName: "gemini-2.5-pro",
        maxTokens: 2048,
        description: "gemini-2.5-pro",
      },
    };

    const config = modelConfig[model];
    console.log(
      `Sending request to Gemini ${config.description} API with Google Search grounding...`,
    );

    const response = await ai.models.generateContent({
      model: config.modelName,
      contents: prompt,
      config: {
        thinkingConfig: {
          includeThoughts: false,
          thinkingBudget: 0,
        },
        systemInstruction: {
          parts: [
            {
              text: getGeminiSystemPrompt(),
            },
          ],
        },
        tools: [{ googleSearch: {} }],
        temperature: 0.05, // what's that? filter for the most likely tokens
        topK: 20, // what's that? filter for the most likely tokens
        topP: 0.99, // what's that? filter for the most likely tokens
        toolConfig: {},
        maxOutputTokens: config.maxTokens,
      },
    });

    const text = response.text || "";
    const sources: Array<{
      url: string;
      title: string;
      snippet?: string;
    }> = [];
    const webSearchQueries: string[] = [];

    // Extract grounding metadata
    const candidate = response.candidates?.[0];
    if (candidate?.groundingMetadata) {
      if (candidate.groundingMetadata.webSearchQueries) {
        webSearchQueries.push(
          ...candidate.groundingMetadata.webSearchQueries,
        );
        console.log(
          "Gemini web search queries used:",
          candidate.groundingMetadata.webSearchQueries,
        );
      }

      if (candidate.groundingMetadata.groundingChunks) {
        candidate.groundingMetadata.groundingChunks.forEach(
          (chunk: any) => {
            if (chunk.web) {
              sources.push({
                url: chunk.web.uri || "",
                title: chunk.web.title || "Unknown Title",
                snippet: chunk.web.snippet || undefined,
              });
            }
          },
        );
      }
    }

    const usage = response.usageMetadata
      ? {
          promptTokens: response.usageMetadata.promptTokenCount || 0,
          candidatesTokens:
            response.usageMetadata.candidatesTokenCount || 0,
          toolUsePromptTokenCount:
            response.usageMetadata.toolUsePromptTokenCount || 0,
          totalTokens: response.usageMetadata.totalTokenCount || 0,
        }
      : undefined;

    const finishReason = candidate?.finishReason || "STOP";

    console.log(`Gemini ${config.description} API completed successfully`);
    console.log(`Token usage:`, usage);
    console.log(`Found ${sources.length} grounding sources`);
    console.log(`Used ${webSearchQueries.length} search queries`);
    console.log(`Text:`, text);

    return {
      text,
      sources,
      finishReason,
      usage,
      webSearchQueries,
    };
  } catch (error) {
    console.error(`Gemini ${model} API Error:`, error);
    throw handleGeminiError(error);
  }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

function handleGeminiError(error: unknown): Error {
  if (error instanceof Error) {
    if (
      error.message.includes("API key") ||
      error.message.includes("invalid_key")
    ) {
      return new Error("Invalid or missing Google Generative AI API key");
    } else if (
      error.message.includes("quota") ||
      error.message.includes("exceeded")
    ) {
      return new Error("Google Generative AI API quota exceeded");
    } else if (
      error.message.includes("rate limit") ||
      error.message.includes("rate_limit")
    ) {
      return new Error("Google Generative AI API rate limit exceeded");
    } else if (
      error.message.includes("network") ||
      error.message.includes("timeout")
    ) {
      return new Error(
        "Network error connecting to Google Generative AI API",
      );
    }
  }

  return new Error(
    `Gemini API request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if Gemini API is properly configured
 */
export function isGeminiConfigured(): boolean {
  return !!(
    process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY
  );
}

/**
 * Test function to validate API connectivity
 */
export async function testGeminiConnection(): Promise<boolean> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-001",
      contents:
        "Hello, respond with 'API connected' if you receive this message.",
    });

    return response.text?.includes("API connected") || false;
  } catch (error) {
    console.error("Gemini API connection test failed:", error);
    return false;
  }
}
