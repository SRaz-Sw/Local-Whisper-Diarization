// client/nextjs-v1/src/app/compare/features/marketResearch/webResearch/perplexity.ts

import { QuickModelType } from "../yad2/yad2.types";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PerplexitySearchResult {
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

interface PerplexityMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface PerplexityRequest {
  model: string;
  messages: PerplexityMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  search_domain_filter?: string[];
  return_images?: boolean;
  return_related_questions?: boolean;
  search_recency_filter?: "month" | "week" | "day" | "hour";
}

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
    delta?: {
      content?: string;
      role?: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  object: string;
  created: number;
  id: string;
}

// ============================================================================
// PERPLEXITY API CONFIGURATION
// ============================================================================

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

function getApiKey(): string {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY environment variable is not set");
  }
  return apiKey;
}

// ============================================================================
// PROMPT GENERATION
// ============================================================================

function getPerplexitySystemPrompt(): string {
  return `
You are NextjsV1 AI, an expert automotive researcher. I need you to search for current, up-to-date information about a specific car model in the Israeli market.
Your resources should be official websites of the car manufacturer, and other websites like "Yad2", "Facebook Marketplace", ״https://www.opl.co.il/", "carwiz" ,  "carzone".
Search the web thoroughly to get the most current and accurate information available.
Respond shortly with, Structured and precise answer with 200 words or less (In total) - For each data point provide the number expected and a maximum 7 additional words - BE SHARP AND CONCISE.
Please focus specifically on the Israeli market context.
`;
}

/**
 * Generate search prompt for Perplexity similar to Gemini implementation
 */
function generatePerplexitySearchPrompt(
  userQuery: string,
  quickModelDetails: QuickModelType,
): string {
  return ` Let's explore this car: 
  
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
// MAIN PERPLEXITY SEARCH FUNCTIONS
// ============================================================================

export async function performPerplexityCarResearch(
  userQuery: string,
  quickModelDetails: QuickModelType,
  model: "sonar" | "sonar-pro" | "sonar-medium" = "sonar",
): Promise<PerplexitySearchResult> {
  try {
    const prompt = generatePerplexitySearchPrompt(
      userQuery,
      quickModelDetails,
    );

    const modelConfig = {
      sonar: {
        modelName: "sonar",
        maxTokens: 2048,
        description: "Perplexity Sonar (Fast)",
      },
      "sonar-pro": {
        modelName: "sonar-pro",
        maxTokens: 2048,
        description: "Perplexity Sonar Pro (Advanced)",
      },
      "sonar-medium": {
        modelName: "sonar-medium",
        maxTokens: 2048,
        description: "Perplexity Sonar Medium (Balanced)",
      },
    };

    const config = modelConfig[model];
    console.log(
      `Sending request to ${config.description} API with web search...`,
    );

    const requestData: PerplexityRequest = {
      model: config.modelName,
      messages: [
        {
          role: "system",
          content: getPerplexitySystemPrompt(),
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.05,
      max_tokens: config.maxTokens,
      top_p: 0.99,
      search_recency_filter: "month",
      return_related_questions: false,
      return_images: false,
    };

    const response = await fetch(PERPLEXITY_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(
        `HTTP error! Status: ${response.status}, Message: ${response.statusText}`,
      );
    }

    const data: PerplexityResponse = await response.json();

    const text = data.choices[0]?.message?.content || "";
    const finishReason = data.choices[0]?.finish_reason || "stop";

    // Extract sources from citations in the text (Perplexity includes citations)
    const sources = extractSourcesFromText(text);

    const usage = data.usage
      ? {
          promptTokens: data.usage.prompt_tokens || 0,
          candidatesTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
        }
      : undefined;

    console.log(`${config.description} API completed successfully`);
    console.log(`Token usage:`, usage);
    console.log(`Found ${sources.length} potential sources`);
    console.log(`Text:`, text);

    return {
      text,
      sources,
      finishReason,
      usage,
      webSearchQueries: [], // Perplexity doesn't expose the search queries used
    };
  } catch (error) {
    console.error(`Perplexity ${model} API Error:`, error);
    throw handlePerplexityError(error);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract sources from Perplexity response text (citations are usually in brackets)
 */
function extractSourcesFromText(
  text: string,
): Array<{ url: string; title: string; snippet?: string }> {
  const sources: Array<{ url: string; title: string; snippet?: string }> =
    [];

  // Perplexity often includes citations in the format [1], [2], etc.
  // We'll look for URLs in the text as a fallback
  const urlRegex = /https?:\/\/[^\s\]]+/g;
  const urls = text.match(urlRegex) || [];

  urls.forEach((url, index) => {
    sources.push({
      url: url.replace(/[)\]]$/, ""), // Remove trailing ) or ]
      title: `Source ${index + 1}`,
      snippet: undefined,
    });
  });

  return sources;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

function handlePerplexityError(error: unknown): Error {
  if (error instanceof Error) {
    if (
      error.message.includes("API key") ||
      error.message.includes("invalid_key") ||
      error.message.includes("401")
    ) {
      return new Error("Invalid or missing Perplexity API key");
    } else if (
      error.message.includes("quota") ||
      error.message.includes("exceeded") ||
      error.message.includes("429")
    ) {
      return new Error("Perplexity API quota exceeded");
    } else if (
      error.message.includes("rate limit") ||
      error.message.includes("rate_limit")
    ) {
      return new Error("Perplexity API rate limit exceeded");
    } else if (
      error.message.includes("network") ||
      error.message.includes("timeout")
    ) {
      return new Error("Network error connecting to Perplexity API");
    }
  }

  return new Error(
    `Perplexity API request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
  );
}

// ============================================================================
// CONFIGURATION AND TESTING
// ============================================================================

/**
 * Check if Perplexity API is properly configured
 */
export function isPerplexityConfigured(): boolean {
  return !!process.env.PERPLEXITY_API_KEY;
}

/**
 * Test function to validate API connectivity
 */
export async function testPerplexityConnection(): Promise<boolean> {
  try {
    const response = await fetch(PERPLEXITY_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "user",
            content:
              "Hello, respond with 'API connected' if you receive this message.",
          },
        ],
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      return false;
    }

    const data: PerplexityResponse = await response.json();
    return (
      data.choices[0]?.message?.content?.includes("API connected") || false
    );
  } catch (error) {
    console.error("Perplexity API connection test failed:", error);
    return false;
  }
}
