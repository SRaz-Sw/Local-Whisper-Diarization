import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { generateObject, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import jwt from "jsonwebtoken";
import {
  findManufacturer,
  findModel,
  generateKmRanges,
  parseCarQuery,
} from "@/app/(compare)/features/marketResearch/yad2/localDbUtils";
import { yad2Client } from "@/app/(compare)/features/marketResearch/yad2/client";
import {
  QuickModelType,
  quickModelSchema,
  Yad2Listing,
  Yad2Model,
  Yad2CarData,
  DepreciationSource,
  CarResearchResponse,
  AuthResult,
  carResearchSchema,
  yad2CarListingSchemaSimplified,
  yad2CarListingSimplified,
} from "@/app/(compare)/features/marketResearch/yad2/yad2.types";
import e from "express";
import { convertYad2ListingToSimplified } from "@/app/(compare)/features/marketResearch/yad2/aliasesUtils";
import { performGeminiCarResearch } from "@/app/(compare)/features/marketResearch/webResearch/google-gemini";
import { performPerplexityCarResearch } from "@/app/(compare)/features/marketResearch/webResearch/perplexity";

// ============================================================================
// CONSTANTS
// ============================================================================

const DEPRECIATION_BASELINES = {
  new: [15, 15, 15, 13, 13, 13, 13],
  "1year": [15, 15, 13, 13, 13, 13, 13],
  "2year": [15, 13, 13, 13, 13, 13, 13],
  "3plus": [13, 13, 13, 13, 13, 13, 13],
} as const;

const CAR_REPAIR_COSTS_BASELINE = {
  electric: [500, 500, 1000, 1500, 2000, 2000, 2500],
  gasoline: [2000, 2500, 3000, 3500, 4000, 4500, 5000],
  hybrid: [1500, 2000, 2500, 3000, 3500, 4000, 4500],
} as const;

const BRAND_DEPRECIATION_ADJUSTMENTS = {
  luxury: 2.5,
  reliable: -1.5,
  electric: 4,
  chinese: 3.5,
} as const;

// ============================================================================
// YAD2 FETCHING FUNCTIONS
// ============================================================================

async function fetchYad2ListingsForDepreciation(
  query: string,
  quickModelDetails: QuickModelType,
): Promise<{
  listings: Yad2Listing[];
  source: DepreciationSource;
  yad2_data: Yad2CarData | null;
}> {
  const manufacturer = findManufacturer(quickModelDetails);
  if (!manufacturer) {
    console.log(`Manufacturer not found: ${quickModelDetails}`);
    return { listings: [], source: "baseline_adjusted", yad2_data: null };
  }

  const model: Yad2Model | null = findModel(
    manufacturer,
    quickModelDetails,
  );
  if (!model) {
    console.log(`Model not found: ${quickModelDetails.englishModel}`);
    return { listings: [], source: "baseline_adjusted", yad2_data: null };
  }
  // todo: assure it works
  const yad2_data: Yad2CarData = {
    manufacturer_id: manufacturer.id,
    modelIds: [model.id],
    manufacturer_name: quickModelDetails.englishManufacturer,
    manufacturer_name_hebrew: quickModelDetails.hebrewManufacturer,
    model_base_name: model.name,
    full_model_name: model.name,
    modelAliases: [
      ...model.aliases,
      ...quickModelDetails.modelAliases,
      quickModelDetails.englishModel,
      quickModelDetails.hebrewModel,
    ],
  };
  try {
    const currentYear = new Date().getFullYear();
    let targetYear = quickModelDetails.yearFrom || currentYear - 2; // Default to 2-year-old car

    // Fetch listings for multiple year ranges to calculate depreciation
    const listingsPromises = [];
    for (let yearOffset = 0; yearOffset <= 6; yearOffset += 2) {
      // 3 iterations +2, 0 ,-2
      const year = targetYear - yearOffset + 2; // Get years around the target
      if (year < currentYear - 10 || year > currentYear) continue; // Skip very old or future years

      const kmRanges = generateKmRanges(year);
      listingsPromises.push(
        yad2Client
          .fetchListings({
            manufacturer: manufacturer.id,
            model: model.id,
            yearFrom: year,
            yearTo: year + 1,
            kmFrom: kmRanges[1].from,
            kmTo: kmRanges[1].to,
            hand: "0-1",
          })
          .catch((error) => {
            console.error(`Failed to fetch year ${year}:`, error);
            return [];
          }),
      );
    }

    const allListingsByYear = await Promise.all(listingsPromises);
    const realListings = allListingsByYear.flat();

    // sort listings by price (cheapest first)
    realListings.sort((a, b) => a.price - b.price);

    if (realListings.length >= 6) {
      console.log(
        `Found ${realListings.length} real listings for ${manufacturer.name} ${model.name}`,
      );
      return {
        listings: realListings,
        source: "actual_listings",
        yad2_data,
      };
    } else if (realListings.length > 0) {
      console.log(
        `Found only ${realListings.length} listings, will mix with synthetic data`,
      );
      return { listings: realListings, source: "mixed", yad2_data };
    }
  } catch (error) {
    console.error("Failed to fetch Yad2 listings:", error);
  }

  return { listings: [], source: "baseline_adjusted", yad2_data };
}

// ============================================================================
// PROMPT GENERATION
// ============================================================================

function generateQuickModelPrompt(userQuery: string): string {
  return `Extract car details from this Israeli user query: ||<<< ${userQuery} >>> || " 
        
        INSTRUCTIONS:
        1. Identify the car manufacturer and model mentioned
        2. Provide Hebrew and English names as used in the Israeli market
        3. Extract year(s) - single year or range (if there isn't year mentioned, return 2025)
        4. Include ALL possible aliases, variations, and transliterations
        5. If the query is not clear, or not a car query, didIfentifyCarInQuery should be false

        CONTEXT:
        - Hebrew names may be transliterated differently (e.g., קורולה, קרולה)
        - English names may have local variations (e.g., Mazda CX-5, Mazda CX5)
        - Years: If single year mentioned, set yearFrom only. If range, set both.
        - Include common misspellings and informal names in aliases
        
        EXAMPLES:
        "טויוטה קורולה 2022" → Toyota Corolla 2022
        "מאזדה CX-5 היברידית" → Mazda CX-5 Hybrid
        "BMW X3 2020-2023" → BMW X3 2020 - 2023
        "טויוטה קאמרי 2020" - Toyota Camry 2020
        "Kia Niro Hybrid 2022" => English Model = Niro (Hybrid is not part of the model name, nor Gasoline or Electric)

        
        Return structured data only, no explanations,.`;
}

// ============================================================================
// POST-PROCESSING FUNCTIONS
// ============================================================================

function generateCarResearchPrompt(
  userQuery: string,
  realListings: Yad2Listing[] = [],
  quickModelDetails: QuickModelType,
  webSearchResults: string,
): string {
  const hasRealListings = realListings.length > 0;

  // Pre-calculate price insights for the AI (no need for AI to calculate)
  let priceContext = "";
  if (hasRealListings) {
    const prices = realListings.map((l) => l.price).filter((p) => p > 0);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = Math.round(
      prices.reduce((a, b) => a + b, 0) / prices.length,
    );
    // median price
    const medianPrice = prices.sort((a, b) => a - b)[
      Math.floor(prices.length / 2)
    ];
    const minYear = Math.max(quickModelDetails.yearFrom, 2019);
    const maxYear = Math.min(quickModelDetails.yearTo || 2025, 2025);

    priceContext = `
MARKET CONTEXT (pre-calculated):
- ${realListings.length} listings found (${minYear}-${maxYear})
- Price range: ${minPrice.toLocaleString()}-${maxPrice.toLocaleString()} NIS
- Average: ~${avgPrice.toLocaleString()} NIS
- Median: ~${medianPrice.toLocaleString()} NIS
- This gives you context for the current market situation`;
  }

  const currentYear = 2025;
  const carYear = parseInt(
    userQuery.match(/\d{4}/)?.[0] || currentYear.toString(),
  );
  const carAge = currentYear - carYear;

  return `You are NextjsV1 AI, an automotive market analyst for Israel.

TASK: Generate market research data for ${quickModelDetails.englishManufacturer} ${quickModelDetails.englishModel} (${carYear})

## AVAILABLE INFORMATION

1. **Car Identity**
   - Brand: ${quickModelDetails.englishManufacturer}
   - Model: ${quickModelDetails.englishModel}
   - Year: ${carYear} (${carAge} years old)

2. **Market Research (from web)**
${webSearchResults}

3. **Current Market Snapshot**
${hasRealListings ? priceContext : "No real listings available - use web research and standard estimates"}

## REFERENCE DATA

**Typical Depreciation Pattern (% per year from new):**
Year 1: 15% | Year 2: 13% | Year 3: 13% | Years 4-7: 13% each
Adjust by brand: Luxury +2-3% | Reliable -2-3% | Chinese +3-4%

**Typical Annual Maintenance (NIS):**
- Gasoline: Starts ~2000, increases ~500-1000/year
- Hybrid: 20-30% less than gasoline
- Electric: 60-70% less than gasoline
- Luxury brands: +50-100%

**Typical Annual Costs (NIS):**
- Insurance: 3000-5500 (standard), 8000+ (luxury)
- Registration: 1200 (standard)
- Road tax: 400-800
- Extended warranty: 0 (we ignore for now)

## YOUR RESPONSE

Generate realistic market data based on the context above. Return ONLY this JSON:

{
  "car_name": "${quickModelDetails.englishManufacturer} ${quickModelDetails.englishModel} ${carYear}",
  "market_analysis": {
    "average_price": <number based on market context>,
    "price_range_min": <realistic minimum>,
    "price_range_max": <realistic maximum>,
    "market_availability": "<high/moderate/low based on listing count>",
    "depreciation_reasoning": "<1 sentence explanation>",
    "depreciation_data_source": "${hasRealListings ? "actual_listings" : "baseline_adjusted"}",
    "car_purchase_age": ${carAge}
  },
  "fuel_type": "<from web research>",
  "fuel_consumption": <L/100km or kWh/100km>,
  "depreciation_percentages": [<7 numbers, each between 5-30, representing year 1-7 depreciation rates>],
  "maintenance_costs": [<7 numbers, 200-20000 each, representing year 1-7 maintenance costs>],
  "annual_insurance": <1000-100000>, (Mandatory + extended warrenty avg-8000 )
  "registration_cost": <1000-100000>,
  "annual_tax": <optional>,
  "extended_warranty": <0>,
  "market_insights": "<2-3 key insights about this specific model in Israel>"
}

CRITICAL DEPRECIATION RULES:
- First value represents Year 1 depreciation (not Year 0)
- MINIMUM 5% depreciation for any year (new cars lose value immediately when driven off the lot)
- If calculating for a new car, Year 1 should be at least 10-15%

RULES:
- Use the market context to inform realistic values
- Don't calculate averages - just estimate based on the context
- Arrays must have exactly 7 values
- All numbers must be within specified ranges
- Market insights should be specific and useful

Output only the JSON, no explanations.`;
}
function postProcessResponse(
  response: any,
  carQuery: string,
  realListings: Yad2Listing[],
  quickModelDetails: QuickModelType,
  yad2CarData: Yad2CarData | null,
): CarResearchResponse {
  // Ensure arrays have correct length
  if (
    !Array.isArray(response.depreciation_percentages) ||
    response.depreciation_percentages.length !== 7
  ) {
    console.warn("Invalid depreciation_percentages, using defaults");
    response.depreciation_percentages = DEPRECIATION_BASELINES.new;
  }

  if (
    !Array.isArray(response.maintenance_costs) ||
    response.maintenance_costs.length !== 7
  ) {
    console.warn("Invalid maintenance_costs, using defaults");
    response.maintenance_costs =
      CAR_REPAIR_COSTS_BASELINE[
        (response.fuel_type as keyof typeof CAR_REPAIR_COSTS_BASELINE) ||
          "hybrid"
      ];
  }

  // Set research confidence based on real listings
  if (!response.research_confidence) {
    response.research_confidence =
      realListings.length >= 8
        ? "high"
        : realListings.length >= 4
          ? "medium"
          : "low";
  }

  if (realListings.length === 0) {
    response.current_listings = Array(6)
      .fill(null)
      .map((_, i) => ({
        title: `Sample ${response.car_name} ${2024 - Math.floor(i / 2)}`,
        price: 200000 - i * 10000,
        year: 2025 - Math.floor(i / 2),
        mileage: 20000 + i * 15000,
        location: [
          "Tel Aviv",
          "Jerusalem",
          "Haifa",
          "Rishon LeZion",
          "Petah Tikva",
          "Netanya",
        ][i],
        seller_type: i % 2 === 0 ? "dealer" : "private",
        link: `mock-token-${i + 1}`,
        highlights: undefined,
        condition_notes: undefined,
        age_category: undefined,
        hand:
          i % 3 === 0 ? "מיבואן" : i % 3 === 1 ? "יד ראשונה" : "יד שנייה",
        extraData: undefined,
      }));
  } else {
    // there are actual listings
    const currentListings: yad2CarListingSimplified[] = realListings.map(
      (listing) => convertYad2ListingToSimplified(listing, false),
    );
    response.current_listings = currentListings;
  }

  // Ensure optional fields have defaults
  response.fuel_consumption = response.fuel_consumption || 10;
  response.annual_insurance = response.annual_insurance || 8000;
  response.registration_cost = response.registration_cost || 0;
  response.annual_tax = response.annual_tax || 800;
  response.extended_warranty = response.extended_warranty || 0;
  console.log("quickModelDetails = ", quickModelDetails);
  response.yad2_data = yad2CarData;
  response.quickModelDetails = quickModelDetails;
  return response as CarResearchResponse;
}

function createFallbackResponse(
  carQuery: string,
  quickModelDetails: QuickModelType,
): CarResearchResponse {
  const carDetails = parseCarQuery(carQuery, quickModelDetails);
  const carName =
    `${carDetails.manufacturer || "Unknown"} ${carDetails.model || "Car"} ${
      carDetails.year || ""
    }`.trim();

  return {
    car_name: carName,
    market_analysis: {
      average_price: 200000,
      price_range_min: 180000,
      price_range_max: 220000,
      market_availability: "Unable to determine - please search manually",
      depreciation_reasoning:
        "Using standard depreciation baseline due to data retrieval issues",
      depreciation_data_source: "baseline_adjusted",
      car_purchase_age: 0,
    },
    current_listings: Array(6)
      .fill(null)
      .map((_, i) => ({
        title: `Sample ${carName} Listing ${i + 1}`,
        price: 200000 - i * 10000,
        year: 2024 - Math.floor(i / 2),
        mileage: 20000 + i * 15000,
        location: [
          "Tel Aviv",
          "Jerusalem",
          "Haifa",
          "Rishon LeZion",
          "Petah Tikva",
          "Netanya",
        ][i],
        seller_type: i % 2 === 0 ? "dealer" : "private",
        age_category: `${Math.floor(i / 2)}yr`,
      })),
    fuel_type: "hybrid",
    fuel_consumption: 10,
    depreciation_percentages: DEPRECIATION_BASELINES.new.map((n) =>
      Number(n),
    ),
    maintenance_costs: CAR_REPAIR_COSTS_BASELINE["hybrid"].map((n) =>
      Number(n),
    ),

    annual_insurance: 8000,
    registration_cost: 1200,
    annual_tax: 800,
    extended_warranty: 0,
    market_insights:
      "Unable to retrieve current market data. Please verify prices with local dealers.",
    research_confidence: "low",
  };
}

// Add this helper function after your existing helper functions
function fixValidationErrors(
  rawObject: any,
  validationError: any,
  quickModelDetails: QuickModelType,
): any {
  const fixedObject = { ...rawObject };

  // Parse validation errors to understand what needs fixing
  const issues = validationError.issues || validationError.errors || [];

  console.log(
    "Fixing validation issues:",
    issues.map((issue: any) => ({
      path: issue.path,
      code: issue.code,
      message: issue.message,
    })),
  );

  for (const issue of issues) {
    const path = issue.path;
    const fieldName = path[0];

    switch (fieldName) {
      case "depreciation_percentages":
        console.log("Fixing depreciation_percentages...");
        if (
          !Array.isArray(fixedObject.depreciation_percentages) ||
          fixedObject.depreciation_percentages.length !== 7 ||
          fixedObject.depreciation_percentages.some(
            (val: number) => val < 5 || val > 30,
          )
        ) {
          // Use baseline and adjust for car age
          const carAge = quickModelDetails.yearFrom
            ? new Date().getFullYear() - quickModelDetails.yearFrom
            : 0;
          if (carAge <= 1) {
            fixedObject.depreciation_percentages = [
              ...DEPRECIATION_BASELINES.new,
            ];
          } else if (carAge <= 2) {
            fixedObject.depreciation_percentages = [
              ...DEPRECIATION_BASELINES["2year"],
            ];
          } else {
            fixedObject.depreciation_percentages = [
              ...DEPRECIATION_BASELINES["3plus"],
            ];
          }
        }
        // Always scan and fix any out-of-range values
        fixedObject.depreciation_percentages =
          fixedObject.depreciation_percentages.map((val: number) => {
            if (typeof val !== "number" || isNaN(val) || val < 5) return 5;
            if (val > 30) return 20;
            return val;
          });
        break;

      case "maintenance_costs":
        console.log("Fixing maintenance_costs...");
        if (
          !Array.isArray(fixedObject.maintenance_costs) ||
          fixedObject.maintenance_costs.length !== 7 ||
          fixedObject.maintenance_costs.some(
            (val: number) => val < 200 || val > 20000,
          )
        ) {
          // Use baseline based on fuel type
          const fuelType = fixedObject.fuel_type || "gasoline";
          const baseline =
            CAR_REPAIR_COSTS_BASELINE[
              fuelType as keyof typeof CAR_REPAIR_COSTS_BASELINE
            ] || CAR_REPAIR_COSTS_BASELINE.gasoline;
          fixedObject.maintenance_costs = [...baseline];
        } else if (path[1] !== undefined) {
          // Fix specific array element
          const index = path[1];
          if (fixedObject.maintenance_costs[index] < 200) {
            fixedObject.maintenance_costs[index] = 200;
          } else if (fixedObject.maintenance_costs[index] > 20000) {
            fixedObject.maintenance_costs[index] = 20000;
          }
        }
        break;

      case "annual_insurance":
        if (
          typeof fixedObject.annual_insurance !== "number" ||
          fixedObject.annual_insurance < 1000 ||
          fixedObject.annual_insurance > 100000
        ) {
          fixedObject.annual_insurance = 4000; // Reasonable default
        }
        break;

      case "registration_cost":
        if (
          typeof fixedObject.registration_cost !== "number" ||
          fixedObject.registration_cost < 1000 ||
          fixedObject.registration_cost > 100000
        ) {
          fixedObject.registration_cost = 1200; // Standard value
        }
        break;

      case "fuel_consumption":
        if (
          typeof fixedObject.fuel_consumption !== "number" ||
          fixedObject.fuel_consumption <= 0 ||
          fixedObject.fuel_consumption > 50
        ) {
          // Default based on fuel type
          const fuelType = fixedObject.fuel_type;
          if (fuelType === "electric") {
            fixedObject.fuel_consumption = 15; // kWh/100km
          } else if (fuelType === "hybrid") {
            fixedObject.fuel_consumption = 4.5; // L/100km
          } else {
            fixedObject.fuel_consumption = 7.5; // L/100km
          }
        }
        break;

      case "market_analysis":
        if (
          !fixedObject.market_analysis ||
          typeof fixedObject.market_analysis !== "object"
        ) {
          fixedObject.market_analysis = {
            average_price: 150000,
            price_range_min: 120000,
            price_range_max: 180000,
            market_availability: "moderate",
            depreciation_reasoning:
              "Using baseline depreciation due to data validation issues",
            depreciation_data_source: "baseline_adjusted",
            car_purchase_age: 0,
          };
        } else {
          // Fix specific market_analysis fields
          if (
            typeof fixedObject.market_analysis.average_price !==
              "number" ||
            fixedObject.market_analysis.average_price < 10000 ||
            fixedObject.market_analysis.average_price > 10000000
          ) {
            fixedObject.market_analysis.average_price = 150000;
          }
          if (
            typeof fixedObject.market_analysis.price_range_min !== "number"
          ) {
            fixedObject.market_analysis.price_range_min = Math.floor(
              fixedObject.market_analysis.average_price * 0.8,
            );
          }
          if (
            typeof fixedObject.market_analysis.price_range_max !== "number"
          ) {
            fixedObject.market_analysis.price_range_max = Math.floor(
              fixedObject.market_analysis.average_price * 1.2,
            );
          }
        }
        break;

      default:
        console.warn(`Unknown validation issue for field: ${fieldName}`);
    }
  }

  return fixedObject;
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

async function authenticateRequest(
  request: NextRequest,
): Promise<AuthResult> {
  try {
    const token =
      request.headers.get("x-access-token") ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      if (process.env.NODE_ENV === "development") {
        return { success: true, userId: "dev-user" };
      }
      return {
        success: false,
        error:
          "No access token provided. Please include x-access-token header.",
      };
    }
    const secret = process.env.JWT_SECRET!.trim();
    return new Promise((resolve) => {
      jwt.verify(token, secret, (err, decoded) => {
        if (err) {
          console.error("error on verify token = ", err);
          resolve({
            success: false,
            error:
              err.name === "TokenExpiredError"
                ? "Token expired"
                : "Invalid token",
          });
          return;
        }
        if (!decoded || typeof decoded === "string") {
          console.error("error on verify token = ", decoded);
          resolve({ success: false, error: "Invalid token structure." });
          return;
        }

        // Handle both token formats:
        // New format: { userId: "..." }
        // Legacy format: { user: { id: "..." } }
        let userId: string;
        const decodedObj = decoded as any;

        if (decodedObj.userId) {
          // New format
          userId = decodedObj.userId;
        } else if (decodedObj.user && decodedObj.user.id) {
          // Legacy format
          userId = decodedObj.user.id;
        } else {
          console.error("No userId found in token:", decoded);
          resolve({ success: false, error: "Invalid token structure." });
          return;
        }

        resolve({ success: true, userId });
      });
    });
  } catch (error) {
    return { success: false, error: "Authentication failed." };
  }
}

// ============================================================================
// AI PROVIDER CONFIGURATION
// ============================================================================

function getProvider(
  providerName?: string,
  modelSize: "large" | "small" = "small",
) {
  const provider = providerName || process.env.AI_PROVIDER || "openai";
  let modelSelected; // the model we'll use
  switch (provider.toLowerCase()) {
    case "google":
    case "gemini":
      modelSelected =
        modelSize === "small"
          ? process.env.SMALL_MODEL_GOOGLE || "gemini-2.5-flash"
          : process.env.LARGE_MODEL_GOOGLE || "gemini-2.5-pro";
      return {
        model: google(modelSelected),
        provider: "google",
      };
    case "openai":
    case "chatgpt":
    default:
      modelSelected =
        modelSize === "small"
          ? process.env.SMALL_MODEL_OPENAI || "gpt-5-nano"
          : process.env.LARGE_MODEL_OPENAI || "gpt-4.1";
      return {
        model: openai(modelSelected),
        provider: "openai",
      };
  }
}

// ============================================================================
// MAIN API HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // ------------------------------------------
    // STEP 0 - authenticate and validate data
    // ------------------------------------------
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { query, provider } = body;

    if (!query) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 },
      );
    }
    console.log(
      `User ${authResult.userId} requesting car research for: ${query}`,
    );
    // ------------------------------------------
    // STEP 1 - translate the query to searchable car details
    // ------------------------------------------
    // ask smaller AI mdoel to get the car details based on the query
    const identifiedCarDetailsFromQuery = await generateObject({
      model: openai("gpt-4.1-nano"),
      schema: quickModelSchema,
      // TODO: assure that we're dealing well with mellicious queries
      prompt: generateQuickModelPrompt(query),
    });
    console.log(
      "identifiedCarDetailsFromQuery = ",
      identifiedCarDetailsFromQuery.object,
    );
    if (!identifiedCarDetailsFromQuery.object.didIfentifyCarInQuery) {
      console.error(
        `AI did not identify a car in the query. Returning 400 error\
                    object = ${JSON.stringify(identifiedCarDetailsFromQuery.object, null, 2)}`,
      );
      return NextResponse.json(
        { error: "AI did not identify a car in the query." },
        { status: 400 },
      );
    }
    // ------------------------------------------
    // STEP 2 - extract market data (A. from yad2 | B. from web search) [in parallel]
    // ------------------------------------------
    const dataPrepPromises = [];
    // Add fetchYad2Listings to parallel execution
    dataPrepPromises.push(
      fetchYad2ListingsForDepreciation(
        query,
        identifiedCarDetailsFromQuery.object,
      ),
    );

    //  Add web search to parallel execution using Google Gemini
    dataPrepPromises.push(
      performPerplexityCarResearch(
        query,
        identifiedCarDetailsFromQuery.object,
      ),
    );

    // Execute both operations in parallel with proper typing
    const [yad2Result, searchResult] = (await Promise.all(
      dataPrepPromises,
    )) as [
      Awaited<ReturnType<typeof fetchYad2ListingsForDepreciation>>,
      Awaited<ReturnType<typeof performPerplexityCarResearch>>,
    ];
    // Extract results from parallel execution
    const {
      listings: realListings,
      source: depreciationSource,
      yad2_data: yad2CarData,
    } = yad2Result;
    const webSearchResults = searchResult.text;

    console.log(
      `Fetched ${realListings.length} listings, source: ${depreciationSource}`,
    );
    console.log(
      "first realListing = ",
      JSON.stringify(realListings.slice(0, 1), null, 2),
    );
    console.log(
      "___________________________________________________________",
    );
    console.log(
      "___________________________________________________________",
    );
    console.log(
      "___________________________________________________________",
    );
    console.log("Google Gemini web search completed successfully");
    console.log("Found sources:", searchResult.sources?.length || 0);
    console.log(
      "Web search queries used:",
      searchResult.webSearchQueries?.length || 0,
    );
    console.log("Token usage:", searchResult.usage);
    console.log(
      "___________________________________________________________",
    );
    console.log(
      "___________________________________________________________",
    );
    console.log(
      "___________________________________________________________",
    );

    // ------------------------------------------
    // STEP 3 - Run the car research main prompt
    // ------------------------------------------
    const prompt = generateCarResearchPrompt(
      query,
      realListings,
      identifiedCarDetailsFromQuery.object,
      webSearchResults,
    );

    console.log("prompt = \n", prompt);

    // Get AI provider and generate response
    const { model, provider: selectedProvider } = getProvider(
      provider,
      "large",
    );
    console.log(`Using ${selectedProvider} provider`);

    // Retry logic
    let attempts = 0;
    const maxAttempts = 1;
    let lastError: Error | null = null;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const result = await generateObject({
          model,
          // schema should be partial of carResearchSchema ( without the listings)
          schema: carResearchSchema
            .partial()
            .omit({ current_listings: true, yad2_data: true }),
          prompt,
          maxRetries: 1,
        });

        // Pre-validate and fix depreciation_percentages before post-processing
        if (result.object.depreciation_percentages) {
          result.object.depreciation_percentages =
            result.object.depreciation_percentages.map((val: any) => {
              const num = Number(val);
              if (isNaN(num) || num < 5) return 5;
              if (num > 30) return 20;
              return num;
            });
        }

        // Post-process and validate
        const processedResponse = postProcessResponse(
          result.object,
          query,
          realListings,
          identifiedCarDetailsFromQuery.object,
          yad2CarData,
        );

        if (
          processedResponse.depreciation_percentages?.length === 7 &&
          processedResponse.maintenance_costs?.length === 7
        ) {
          console.log(
            `Successfully generated response on attempt ${attempts}`,
          );
          return NextResponse.json(processedResponse);
        }

        throw new Error("Invalid response structure");
      } catch (error) {
        lastError = error as Error;
        console.error(`Attempt ${attempts} failed:`, error);

        // Check if this is a validation error that we can fix
        if (
          error instanceof Error &&
          (error.message.includes("Type validation failed") ||
            error.message.includes("ZodError") ||
            error.name === "AI_TypeValidationError")
        ) {
          console.log("Attempting to fix validation errors...");

          try {
            // Extract the raw object from the error if possible
            let rawObject = null;

            // Try to get the object from different error formats
            if (
              "cause" in error &&
              error.cause &&
              typeof error.cause === "object"
            ) {
              const cause = error.cause as any;
              if (cause.value) {
                rawObject = cause.value;
              }
            }

            // If we found a raw object, try to fix it
            if (rawObject) {
              console.log(
                "Found raw object, attempting to fix validation issues...",
              );

              // Extract validation errors
              let validationError = null;
              if (
                "cause" in error &&
                error.cause &&
                typeof error.cause === "object"
              ) {
                const cause = error.cause as any;
                validationError = cause;
              }

              const fixedObject = fixValidationErrors(
                rawObject,
                validationError,
                identifiedCarDetailsFromQuery.object,
              );

              // Try to validate the fixed object
              const validatedFixed = carResearchSchema
                .partial()
                .omit({ current_listings: true, yad2_data: true })
                .parse(fixedObject);

              console.log("Successfully fixed validation errors!");

              // Post-process the fixed response
              const processedResponse = postProcessResponse(
                validatedFixed,
                query,
                realListings,
                identifiedCarDetailsFromQuery.object,
                yad2CarData,
              );

              return NextResponse.json(processedResponse);
            }
          } catch (fixError) {
            console.error("Failed to fix validation errors:", fixError);
            // Continue to retry or fallback
          }
        }

        if (attempts < maxAttempts) {
          console.log(`Retrying... (${attempts}/${maxAttempts})`);
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * attempts),
          );
        }
      }
    }

    // All attempts failed
    console.error("All attempts failed, returning fallback response");
    return NextResponse.json(
      createFallbackResponse(query, identifiedCarDetailsFromQuery.object),
    );
  } catch (error) {
    console.error("AI API Error:", error);

    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return NextResponse.json(
          {
            error:
              "AI service configuration error. Please check API keys.",
          },
          { status: 500 },
        );
      }

      if (
        error.message.includes("rate limit") ||
        error.message.includes("quota")
      ) {
        return NextResponse.json(
          {
            error: "API quota exceeded. Please try again later.",
            suggestion: "Try using a different AI provider.",
          },
          { status: 429 },
        );
      }
    }

    return NextResponse.json(
      {
        error: "Failed to process AI request. Please try again.",
        details:
          process.env.NODE_ENV === "development"
            ? String(error)
            : undefined,
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

export async function GET() {
  return NextResponse.json({
    status: "ok",
    providers: ["openai", "google"],
    current_provider: process.env.AI_PROVIDER || "openai",
    version: "1.2.0",
    features: {
      yad2_integration: true,
      real_listings: true,
    },
  });
}
