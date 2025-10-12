// Core integration for AI functionality
import apiService from "@/lib/api";

export interface InvokeLLMRequest {
  prompt: string;
  add_context_from_internet?: boolean;
  response_json_schema?: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface InvokeLLMResponse {
  [key: string]: any; // Dynamic response based on schema
}

export async function InvokeLLM(
  request: InvokeLLMRequest,
): Promise<InvokeLLMResponse> {
  try {
    // For now, we'll create a mock response until the backend AI integration is ready
    // This simulates the AI car research response structure

    console.log("InvokeLLM called with:", request);

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mock response for car research
    if (
      request.prompt.includes("NextjsV1 AI") ||
      request.prompt.includes("car")
    ) {
      return {
        car_name: "Tesla Model Y 2024",
        market_analysis: {
          average_price: 280000,
          price_range_min: 250000,
          price_range_max: 320000,
          market_availability: "Good availability with multiple dealers",
          depreciation_reasoning:
            "Based on mock market analysis of electric vehicle depreciation patterns in Israel. Electric vehicles typically depreciate faster in early years due to technology advancement.",
          depreciation_data_source: "baseline_adjusted",
          car_purchase_age: 0,
        },
        current_listings: [
          {
            title: "Tesla Model Y Long Range 2024 - Like New",
            price: 285000,
            year: 2024,
            mileage: 5000,
            location: "Tel Aviv",
            seller_type: "dealer",
            link: "https://yad2.co.il/example",
            highlights:
              "Full autopilot, premium interior, supercharger included",
            condition_notes: "Excellent condition, single owner",
            age_category: "new",
          },
          {
            title: "Tesla Model Y Standard Range 2024",
            price: 260000,
            year: 2024,
            mileage: 12000,
            location: "Haifa",
            seller_type: "private",
            link: "https://yad2.co.il/example2",
            highlights: "Standard autopilot, clean interior",
            condition_notes: "Very good condition",
            age_category: "new",
          },
          {
            title: "Tesla Model Y 2023 - Full Options",
            price: 245000,
            year: 2023,
            mileage: 18000,
            location: "Jerusalem",
            seller_type: "dealer",
            link: "https://yad2.co.il/example3",
            highlights:
              "Full self-driving capability, premium sound system",
            condition_notes: "Excellent maintenance record",
            age_category: "1yr",
          },
          {
            title: "Tesla Model Y 2023 Performance",
            price: 255000,
            year: 2023,
            mileage: 22000,
            location: "Netanya",
            seller_type: "private",
            link: "https://yad2.co.il/example4",
            highlights: "Performance package, track mode, upgraded wheels",
            condition_notes: "Well maintained, garage kept",
            age_category: "1yr",
          },
          {
            title: "Tesla Model Y 2022 Long Range",
            price: 225000,
            year: 2022,
            mileage: 35000,
            location: "Ramat Gan",
            seller_type: "dealer",
            link: "https://yad2.co.il/example5",
            highlights: "Long range battery, autopilot, heated seats",
            condition_notes: "Good condition, regular service",
            age_category: "2yr",
          },
          {
            title: "Tesla Model Y 2022 Standard",
            price: 210000,
            year: 2022,
            mileage: 42000,
            location: "Beer Sheva",
            seller_type: "private",
            link: "https://yad2.co.il/example6",
            highlights: "Standard range, basic autopilot",
            condition_notes: "Fair condition, minor wear",
            age_category: "2yr",
          },
        ],
        fuel_type: "electric",
        fuel_consumption: 14.5,
        depreciation_percentages: [18, 15, 12, 10, 8, 7, 6],
        maintenance_costs: [1800, 2200, 2800, 3500, 4200, 5000, 5800],
        annual_insurance: 9500,
        registration_cost: 2500,
        annual_tax: 0,
        extended_warranty: 8000,
        market_insights:
          "Tesla Model Y is highly popular in Israel with strong resale value. Electric vehicle incentives make it attractive for new buyers. The charging infrastructure is rapidly expanding, supporting long-term value. Consider the full self-driving capability as a value-add feature.",
        research_confidence: "medium",
        yad2_data: {
          manufacturer_id: 62,
          manufacturer_name: "Tesla",
          manufacturer_name_hebrew: "טסלה",
          model_base_name: "Model Y",
          full_model_name: "Model Y Long Range",
        },
      };
    }

    // Generic mock response for other prompts
    return {
      response:
        "Mock AI response - actual implementation would call OpenAI or other LLM service",
      status: "success",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("InvokeLLM error:", error);
    throw new Error(
      "AI service temporarily unavailable. Please try again later.",
    );
  }
}

// Additional helper functions for AI integration
export async function invokeLLMSimple(prompt: string): Promise<string> {
  try {
    const response = await InvokeLLM({ prompt });
    return response.response || "No response generated";
  } catch (error) {
    console.error("Simple LLM invocation error:", error);
    return "Error generating response";
  }
}

export async function invokeLLMWithSchema<T>(
  prompt: string,
  schema: any,
  addContext: boolean = false,
): Promise<T> {
  try {
    const response = await InvokeLLM({
      prompt,
      response_json_schema: schema,
      add_context_from_internet: addContext,
    });
    return response as T;
  } catch (error) {
    console.error("Schema-based LLM invocation error:", error);
    throw error;
  }
}
