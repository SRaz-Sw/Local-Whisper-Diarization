import z from "zod";

export interface Yad2Manufacturer {
  id: number;
  name: string;
  nameHebrew: string;
  aliases: string[];
  models: Yad2Model[];
}

export interface Yad2Model {
  id: number;
  name: string;
  nameHebrew: string;
  aliases: string[];
}

export interface Yad2SearchParams {
  manufacturer: number;
  model: number;
  yearFrom: number;
  yearTo: number;
  kmFrom: number;
  kmTo: number;
  hand?: string; // "0-1" for first hand
}

export interface Yad2Listing {
  token: string; // ( www.yad2.co.il/vehicles/item/{token} )
  orderId: number;
  adType: string;
  categoryId: number;
  subcategoryId: number;
  priority: number;
  price: number;
  address: {
    area: {
      id: number;
      text: string;
    };
  };
  metaData?: {
    coverImage?: string;
    images?: string[];
  };
  commitment?: string[];
  tags?: {
    name: string;
    id: number;
    priority: number;
  }[];
  packages?: {
    isTradeInButton?: boolean;
  };
  customer?: {
    id?: number;
    agencyName?: string;
    agencyLogo?: string;
  };
  manufacturer: {
    id: number;
    text: string;
  };
  model: {
    id: number;
    text: string;
  };
  subModel?: {
    id: number;
    text: string;
  };
  vehicleDates: {
    yearOfProduction: number;
  };
  engineType: {
    id?: number;
    text: string;
  };
  hand: {
    id?: number;
    text: string;
  };
  paymentInstallments?: {
    advancePayment: number;
    monthlyPayment: number;
    numberOfPayment: number;
    balance: number;
  };
  konesSaleDateTime?: string;
  externalKonesUrl?: string;
}

export interface Yad2Response {
  pageProps: {
    dehydratedState: {
      queries: Array<{
        state: {
          data: {
            commercial: Yad2Listing[];
            private: Yad2Listing[];
          };
        };
      }>;
    };
  };
}

// Add these interfaces to match your JSON structure
export interface JsonManufacturer {
  id: number;
  name: string;
  nameHebrew: string;
  models: JsonModel[];
  totalModels: number;
  totalSubModels: number;
}

export interface JsonModel {
  id: number;
  name: string;
  nameHebrew: string;
}

export interface JsonMappings {
  lastUpdated: string;
  totalManufacturers: number;
  dataSource: string;
  manufacturers: JsonManufacturer[];
}

export const quickModelSchema = z.object({
  englishManufacturer: z
    .string()
    .describe("Manufacturer name in English as used in Israel"),
  hebrewManufacturer: z.string().describe("Manufacturer name in Hebrew"),
  englishModel: z
    .string()
    .describe("Model name in English as used in Israel"),
  hebrewModel: z.string().describe("Model name in Hebrew"),
  yearFrom: z.number().describe("Start year or single year if specific"),
  yearTo: z
    .number()
    .nullable()
    .optional()
    .describe("End year if range specified"),
  modelAliases: z
    .array(z.string())
    .describe("All possible names/spellings for this model"),
  manufacturerAliases: z
    .array(z.string())
    .describe("Alternative names for manufacturer"),
  didIfentifyCarInQuery: z
    .boolean()
    .describe("Whether the AI identified a car in the query"),
});

export type QuickModelType = z.infer<typeof quickModelSchema>;

// _______________________________________
// _______________________________________
// _______________________________________
export type DepreciationSource =
  | "actual_listings"
  | "baseline_adjusted"
  | "mixed";

export interface AuthResult {
  success: boolean;
  userId?: string;
  error?: string;
}

const yad2CarDataSchema = z.object({
  manufacturer_id: z.number(),
  modelIds: z.array(z.number()),
  manufacturer_name: z.string(),
  manufacturer_name_hebrew: z.string(),
  model_base_name: z.string().optional(),
  full_model_name: z.string(),
  modelAliases: z.array(z.string()).optional(),
});

export type Yad2CarData = z.infer<typeof yad2CarDataSchema>;

export const yad2CarListingSchemaSimplified = z.object({
  title: z.string().describe("Listing title"),
  price: z.number().describe("Asking price in NIS"),
  year: z.number().describe("Car year"),
  mileage: z.number().optional().describe("Mileage in KM"),
  location: z.string().optional().describe("City/area in Israel"),
  seller_type: z
    .enum(["dealer", "private"])
    .optional()
    .describe("Type of seller"),
  link: z.string().optional().describe("URL to the listing"), // TODO: Switch to item id, and retrieve with yad2.co.il/vehicles/item/{item_id}
  highlights: z.string().optional().describe("Key features"),
  condition_notes: z.string().optional().describe("Condition details"),
  age_category: z.string().optional().describe("Age category"),
  hand: z.string().optional().describe("Hand"),
  extraData: z
    .object({
      coverImage: z.string().optional().describe("Cover image URL"),
      images: z.array(z.string()).optional().describe("Images URLs"),
    })
    .optional()
    .describe("extra data for the listing"),
});

export type yad2CarListingSimplified = z.infer<
  typeof yad2CarListingSchemaSimplified
>;

export const carResearchSchema = z.object({
  car_name: z
    .string()
    .describe("Full car name including year, model, and trim"),
  market_analysis: z.object({
    average_price: z.number().describe("Average market price in NIS"),
    price_range_min: z.number().describe("Lowest price found in NIS"),
    price_range_max: z.number().describe("Highest price found in NIS"),
    market_availability: z
      .string()
      .describe("How readily available this model is"),
    depreciation_reasoning: z
      .string()
      .describe("Explanation of how depreciation was calculated"),
    depreciation_data_source: z
      .enum(["actual_listings", "baseline_adjusted", "mixed"])
      .describe("Source of depreciation data"),
    car_purchase_age: z
      .number()
      .optional()
      .describe("Age of car at purchase (0 for new)"),
  }),
  current_listings: z
    .array(yad2CarListingSchemaSimplified)
    .min(6)
    .max(100)
    .describe("Current listings"),
  fuel_type: z.enum(["gasoline", "hybrid", "electric", "diesel"]),
  fuel_consumption: z
    .number()
    .optional()
    .describe("Fuel consumption in L/100KM / KWh/100KM for electric"),
  depreciation_percentages: z
    .array(z.number().min(5).max(30))
    .length(7)
    .describe(
      "Depreciation percentages year by year arr[0] = new car, arr[1] = 1 year old...",
    ),
  maintenance_costs: z
    .array(z.number().min(200).max(20_000))
    .length(7)
    .describe("Maintenance costs year year by year"),
  annual_insurance: z
    .number()
    .min(1000)
    .max(100_000)
    .describe("Annual insurance cost (avg 8000 NIS)"), // (Mandatory + extended warrenty avg-8000 )
  registration_cost: z
    .number()
    .min(1000)
    .max(100_000)
    .describe("Registration cost (avg 1200 NIS)"),
  annual_tax: z.number().optional(),
  extended_warranty: z
    .number()
    .min(0)
    .max(100_000)
    .describe("Extended warranty cost (avg 3500 NIS)"),
  market_insights: z
    .string()
    .describe("Key insights about this model in the Israeli market"),
  research_confidence: z
    .enum(["high", "medium", "low"])
    .optional()
    .default("medium"),
  yad2_data: yad2CarDataSchema
    .optional()
    .describe("Yad2 data for the car"),
});
export type CarResearchResponse = z.infer<typeof carResearchSchema>;

// export interface CarResearchResponse {
// 	car_name: string;
// 	market_analysis: {
// 		average_price: number;
// 		price_range_min: number;
// 		price_range_max: number;
// 		market_availability: string;
// 		depreciation_reasoning: string;
// 		depreciation_data_source: DepreciationSource;
// 		car_purchase_age?: number;
// 	};
// 	current_listings: Array<{
// 		title: string;
// 		price: number;
// 		year: number;
// 		mileage?: number;
// 		location?: string;
// 		seller_type?: 'dealer' | 'private';
// 		link?: string;
// 		highlights?: string;
// 		condition_notes?: string;
// 		age_category?: string;
// 	}>;
// 	fuel_type: 'gasoline' | 'hybrid' | 'electric' | 'diesel';
// 	fuel_consumption?: number;
// 	depreciation_percentages: number[];
// 	maintenance_costs: number[];
// 	annual_insurance?: number;
// 	registration_cost?: number;
// 	annual_tax?: number;
// 	extended_warranty?: number;
// 	market_insights: string;
// 	research_confidence?: 'high' | 'medium' | 'low';
// 	yad2_data?: Yad2CarData;
// }
