import {
  Yad2Manufacturer,
  Yad2Model,
  Yad2SearchParams,
  JsonMappings,
  QuickModelType,
} from "./yad2.types";
import yad2MappingsRaw from "@/../public/data/yad2-mappings.json";
import { transformManufacturerData } from "./aliasesUtils";

const yad2Mappings = yad2MappingsRaw as JsonMappings;

const manufacturers = transformManufacturerData(yad2Mappings);
// Fuzzy string matching using Levenshtein distance

// Fuzzy string matching using Levenshtein distance
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] =
          Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
      }
    }
  }

  return dp[m][n];
}

// Find best matching manufacturer
export function findManufacturer(
  quickModelDetails: QuickModelType,
): Yad2Manufacturer | null {
  // Create a list of manufacturer terms to search for
  const manufacturerTerms = [
    quickModelDetails.englishManufacturer.toLowerCase().trim(),
    quickModelDetails.hebrewManufacturer.toLowerCase().trim(),
    ...quickModelDetails.manufacturerAliases.map((alias) =>
      alias.toLowerCase().trim(),
    ),
  ].filter((term) => term.length > 0); // Remove empty strings

  // First try exact match on aliases
  for (const manufacturer of manufacturers) {
    for (const manufacturerTerm of manufacturerTerms) {
      if (
        manufacturer.aliases.some(
          (alias) =>
            alias.toLowerCase() === manufacturerTerm ||
            manufacturerTerm.includes(alias.toLowerCase()) ||
            alias.toLowerCase().includes(manufacturerTerm),
        )
      ) {
        return manufacturer;
      }
    }
  }

  // Fuzzy match with threshold
  let bestMatch: Yad2Manufacturer | null = null;
  let bestDistance = Infinity;

  for (const manufacturer of manufacturers) {
    for (const alias of manufacturer.aliases) {
      const aliasLower = alias.toLowerCase();

      for (const manufacturerTerm of manufacturerTerms) {
        const distance = levenshteinDistance(manufacturerTerm, aliasLower);
        if (distance < bestDistance && distance <= 3) {
          bestDistance = distance;
          bestMatch = manufacturer;
        }
      }
    }
  }

  return bestMatch;
}

// Find best matching model
export function findModel(
  manufacturer: Yad2Manufacturer,
  quickModelDetails: QuickModelType,
): Yad2Model | null {
  // create a list of all of the terms we want to search for
  const modelTerms = [
    quickModelDetails.englishModel.toLowerCase().trim(),
    quickModelDetails.hebrewModel.toLowerCase().trim(),
    ...quickModelDetails.modelAliases.map((alias) =>
      alias.toLowerCase().trim(),
    ),
  ].filter((term) => term.length > 0); // Remove empty strings

  // try exact match first
  for (const model of manufacturer.models) {
    if (
      model.aliases.some((alias) =>
        modelTerms.includes(alias.toLowerCase()),
      )
    ) {
      return model;
    }
  }

  // fuzzy match
  let bestMatch: Yad2Model | null = null;
  let bestDistance = Infinity;
  for (const model of manufacturer.models) {
    for (const alias of model.aliases) {
      // Find the minimum distance between any of our model terms and this alias
      let minDistanceForThisAlias = Infinity;
      for (const term of modelTerms) {
        const distance = levenshteinDistance(term, alias.toLowerCase());
        minDistanceForThisAlias = Math.min(
          minDistanceForThisAlias,
          distance,
        );
      }

      if (
        minDistanceForThisAlias < bestDistance &&
        minDistanceForThisAlias <= 2
      ) {
        bestDistance = minDistanceForThisAlias;
        bestMatch = model;
      }
    }
  }

  // Fuzzy match
  return bestMatch;
}

// Generate KM ranges based on car age
export function generateKmRanges(
  yearOfProduction: number,
): Array<{ from: number; to: number }> {
  const currentYear = new Date().getFullYear();
  const age = currentYear - yearOfProduction;

  const kmPerYear = 15000; // Israeli average
  const baseKm = age * kmPerYear;

  return [
    { from: Math.max(0, baseKm - 100_000), to: baseKm + 10000 }, // low km range
    { from: Math.max(0, baseKm - 80_000), to: baseKm + 22000 }, // medium km range
    { from: Math.max(0, baseKm - 60_000), to: baseKm + 35000 }, // high km range
  ];
}

// Parse car query to extract details
export function parseCarQuery(
  query: string,
  quickModelDetails: QuickModelType,
): {
  manufacturer?: string;
  model?: string;
  year?: number;
} {
  // Extract year (4 digits)
  console.log("query = ", query);

  const yearMatch = query.match(/\b(20\d{2})\b/);
  const year = yearMatch ? parseInt(yearMatch[1]) : undefined;
  console.log("year = ", year);
  // Clean query for manufacturer/model extraction
  let cleanQuery = query;
  if (year) {
    cleanQuery = cleanQuery.replace(year.toString(), "").trim();
  }
  console.log("cleanQuery = ", cleanQuery);

  const manufacturer = findManufacturer(quickModelDetails);
  let model = null;
  console.log("manufacturer = ", manufacturer);
  if (manufacturer) {
    model = findModel(manufacturer, quickModelDetails);
  }
  console.log("model = ", model);
  return {
    manufacturer: manufacturer?.name,
    model: model?.name,
    year,
  };
}

// Generate Yad2 search URL with proper parameters
export function generateYad2SearchUrl(carData: {
  yad2Data?: {
    manufacturerId?: number;
    modelIds?: number[];
    modelBaseName?: string;
    fullModelName?: string;
  };
  carPrice?: number;
  year?: number;
  name?: string;
}): string {
  const baseUrl = "https://www.yad2.co.il/vehicles/cars";
  const params = new URLSearchParams();

  if (!carData.yad2Data || !carData.yad2Data.manufacturerId) {
    return generateYad2SearchUrlFromName(
      carData.name!,
      carData.carPrice,
      carData.year,
    );
  }

  // Add manufacturer ID if available
  if (carData.yad2Data?.manufacturerId) {
    params.append(
      "manufacturer",
      carData.yad2Data.manufacturerId.toString(),
    );
  }

  // Add model ID - find the best match based on car name
  if (carData.yad2Data?.modelIds && carData.yad2Data.modelIds.length > 0) {
    let selectedModelId = carData.yad2Data.modelIds[0]; // Default to first

    // If we have a car name and multiple model IDs, try to find the best match
    if (carData.name && carData.yad2Data.modelIds.length > 1) {
      const carNameLower = carData.name.toLowerCase();

      // Find manufacturer to get model aliases
      const manufacturer = manufacturers.find(
        (m) => m.id === carData.yad2Data!.manufacturerId,
      );
      if (manufacturer) {
        // Check each model ID to see which one best matches the car name
        for (const modelId of carData.yad2Data.modelIds) {
          const model = manufacturer.models.find((m) => m.id === modelId);
          if (model) {
            // Check if any of the model's aliases match the car name
            const hasMatch = model.aliases.some(
              (alias) =>
                carNameLower.includes(alias.toLowerCase()) ||
                alias
                  .toLowerCase()
                  .includes(carNameLower.split(" ").pop() || ""),
            );
            if (hasMatch) {
              selectedModelId = modelId;
              break;
            }
          }
        }
      }
    }

    params.append("model", selectedModelId.toString());
  }

  // Calculate year range
  if (carData.year) {
    // Search from the car's year to infinity (-1)
    params.append("year", `${carData.year}--1`);
  }

  // Calculate price range (±30% of car price)
  if (carData.carPrice) {
    const minPrice = Math.max(Math.round(carData.carPrice * 0.5), 1000);
    const maxPrice = Math.round(carData.carPrice * 1.2);
    params.append("price", `${minPrice}-${maxPrice}`);
  }

  // Calculate KM range based on car age
  if (carData.year) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - carData.year;
    const maxKm = Math.max(age * 20000, 20000); // 25k km per year, minimum 20k
    params.append("km", `0-${maxKm}`);
  }

  // Add hand filter for newer cars (0-1 means first or second hand)
  if (carData.year && carData.year >= 2020) {
    params.append("hand", "0-1");
  }

  // If no yad2Data available, try a text search
  if (!carData.yad2Data?.manufacturerId && carData.name) {
    params.append("info", carData.name);
  }

  return `${baseUrl}?${params.toString()}`;
}

// Multi-word model patterns for different manufacturers
const MULTI_WORD_MODEL_PATTERNS: Record<string, RegExp[]> = {
  tesla: [/^(model [sxy3])/i, /^(cybertruck)/i],
  mercedes: [/^([a-z]-class)/i, /^(g-class)/i, /^(gl[a-z])/i, /^(ml[a-z])/i],
  bmw: [/^(\d+ series)/i, /^([xi]\d+)/i],
  audi: [/^([aq]\d+)/i, /^(e-tron)/i],
  "land rover": [/^(range rover)/i, /^(discovery)/i],
  "alfa romeo": [/^(giulia)/i, /^(stelvio)/i],
};

// Extract manufacturer and model from car name with intelligent parsing
function parseCarNameIntelligently(carName: string): {
  manufacturer: string;
  model: string;
  modelAliases: string[];
} {
  const carNameLower = carName.toLowerCase().trim();
  const words = carNameLower.split(/\s+/);
  
  if (words.length < 2) {
    return { manufacturer: "", model: "", modelAliases: [] };
  }

  // Try to identify manufacturer (could be multi-word like "Land Rover")
  let manufacturer = "";
  let remainingWords = words;
  
  // Check for multi-word manufacturers first
  const twoWordManufacturer = `${words[0]} ${words[1]}`;
  if (MULTI_WORD_MODEL_PATTERNS[twoWordManufacturer]) {
    manufacturer = twoWordManufacturer;
    remainingWords = words.slice(2);
  } else {
    manufacturer = words[0];
    remainingWords = words.slice(1);
  }

  if (remainingWords.length === 0) {
    return { manufacturer, model: "", modelAliases: [] };
  }

  // Try to match multi-word model patterns for this manufacturer
  const patterns = MULTI_WORD_MODEL_PATTERNS[manufacturer] || [];
  const remainingText = remainingWords.join(" ");
  
  for (const pattern of patterns) {
    const match = remainingText.match(pattern);
    if (match) {
      const model = match[1];
      const modelAliases = [
        model,
        model.replace(/\s+/g, ""), // Remove spaces: "model y" -> "modely"
        model.replace(/\s+/g, "-"), // Hyphenated: "model y" -> "model-y"
      ];
      return { manufacturer, model, modelAliases };
    }
  }

  // Fallback: use first word as model
  const model = remainingWords[0];
  return { 
    manufacturer, 
    model, 
    modelAliases: [model] 
  };
}

// Alternative function that tries to find manufacturer/model from car name
export function generateYad2SearchUrlFromName(
  carName: string,
  carPrice?: number,
  year?: number,
): string {
  const { manufacturer, model, modelAliases } = parseCarNameIntelligently(carName);
  
  if (!manufacturer || !model) {
    // Fallback to basic search if parsing fails
    return generateYad2SearchUrl({
      carPrice,
      year,
      name: carName,
    });
  }

  // Create QuickModelType for matching
  const quickModelDetails: QuickModelType = {
    englishManufacturer: manufacturer,
    hebrewManufacturer: "",
    englishModel: model,
    hebrewModel: "",
    yearFrom: year || 2020,
    yearTo: null,
    modelAliases,
    manufacturerAliases: [],
    didIfentifyCarInQuery: true,
  };

  // Try to find manufacturer and model
  const foundManufacturer = findManufacturer(quickModelDetails);
  let foundModel = null;
  if (foundManufacturer) {
    foundModel = findModel(foundManufacturer, quickModelDetails);
  }

  // Generate URL with found data or fallback
  if (foundManufacturer && foundModel) {
    return generateYad2SearchUrl({
      yad2Data: {
        manufacturerId: foundManufacturer.id,
        modelIds: [foundModel.id],
      },
      carPrice,
      year,
      name: carName,
    });
  }

  // Fallback to basic search
  return generateYad2SearchUrl({
    carPrice,
    year,
    name: carName,
  });
}
