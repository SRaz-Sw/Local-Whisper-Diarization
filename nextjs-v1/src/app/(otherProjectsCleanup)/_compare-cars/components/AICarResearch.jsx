import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useCurrentUser } from "@/hooks/useAuth";
import { usePathname, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import {
  Loader2,
  Search,
  Sparkles,
  AlertCircle,
  Mic,
  ArrowLeft,
  ExternalLink,
  Globe,
  MapPin,
  DollarSign,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import VoiceInputModal from "./VoiceInputModal";
import { CarResearchResponse } from "../features/marketResearch/yad2/yad2.types";
import { toast } from "sonner";
import { getToken } from "@/lib/token";
import { client } from "@/lib/oRPC_node_server/clients/orpc";

export default function AICarResearch({ onCarFound, onCancel }) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [error, setError] = useState("");
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const { user: currentUser } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogin = () => {
    const returnUrl = encodeURIComponent(pathname);
    router.push(`/login?returnUrl=${returnUrl}`);
  };

  const handleVoiceTranscript = (transcript) => {
    setQuery(transcript);
    setShowVoiceModal(false);
    handleSearch(transcript);
  };

  const handleSearch = async (searchQuery = query) => {
    if (!searchQuery.trim()) return;

    // Check if user is authenticated for AI research
    localStorage.setItem("nextjsv1_pending_ai_query", searchQuery.trim());
    if (!currentUser) {
      setShowLoginPrompt(true);
      return;
    }

    setIsSearching(true);
    setError("");
    setSearchResults(null);

    try {
      // NEW: Using oRPC client (using 'google' provider to avoid OpenAI quota issues)
      const response = await client.marketResearch.researchCar({
        query: searchQuery,
        provider: "openai",
      });

      // // OLD: REST API approach (keeping for reference)
      // const token = getToken();
      // const headers = {
      //   "Content-Type": "application/json",
      // };

      // if (token) {
      //   headers["x-access-token"] = token;
      // }

      // const apiResponse = await fetch("/api/AI/research-car", {
      //   method: "POST",
      //   headers,
      //   body: JSON.stringify({
      //     query: searchQuery,
      //     provider: "openai",
      //   }),
      // });

      // if (!apiResponse.ok) {
      //   const errorData = await apiResponse.json();
      //   throw new Error(
      //     errorData.error ||
      //       `API request failed with status ${apiResponse.status}`,
      //   );
      // }

      // const response = await apiResponse.json();
      console.log("AI Response:", response);
      setSearchResults(response);

      // AUTO-ADD TO COMPARISON - START
      try {
        const carData = buildCarData(response); // Extract the logic to a separate function

        // Check confidence and auto-add
        if (response.research_confidence === "low") {
          toast.warning(
            `Added "${response.car_name}" with limited data - estimates may not be fully accurate`,
            { duration: 5000 },
          );
        } else {
          toast.success(`"${response.car_name}" added to comparison!`, {
            duration: 3000,
          });
        }

        onCarFound(carData);
      } catch (addError) {
        console.error("Failed to add car to comparison:", addError);
        toast.error(
          "Failed to add car to comparison. Please try manually.",
          {
            duration: 4000,
          },
        );
        // Still show results even if auto-add failed
      }
      // AUTO-ADD TO COMPARISON - END
    } catch (err) {
      setError("Failed to research car information. Please try again.");
      console.error("AI search error:", err);
      toast.error(
        "Failed to research car information. Please try again.",
        {
          duration: 4000,
        },
      );
    } finally {
      setIsSearching(false);
    }
  };

  // Check for saved query from localStorage on component mount
  useEffect(() => {
    const savedQuery = localStorage.getItem("nextjsv1_pending_ai_query");
    if (savedQuery && currentUser) {
      setQuery(savedQuery);
      localStorage.removeItem("nextjsv1_pending_ai_query");
      // Automatically execute the saved query
      // handleSearch(savedQuery);
    }
  }, [currentUser]);

  const buildCarData = (searchResults) => {
    const validateArray = (arr, defaultArr, name) => {
      if (!Array.isArray(arr)) {
        console.warn(`${name} is not an array, using defaults`);
        return defaultArr;
      }

      if (arr.length !== 7) {
        console.warn(
          `${name} has ${arr.length} elements instead of 7, padding/truncating`,
        );
        const result = [];
        for (let i = 0; i < 7; i++) {
          if (i < arr.length) {
            result.push(Number(arr[i]) || defaultArr[i]);
          } else {
            result.push(arr[arr.length - 1] || defaultArr[i]);
          }
        }
        return result;
      }

      return arr.map((val, idx) => {
        const num = Number(val);
        if (isNaN(num) || num <= 0) {
          console.warn(
            `Invalid value at index ${idx} in ${name}, using default`,
          );
          return defaultArr[idx];
        }
        return num;
      });
    };

    const defaultMaintenance = [2000, 2500, 3000, 3500, 4000, 4500, 5000];
    const defaultDepreciation = [15, 12, 10, 10, 10, 9, 9];

    const maintenancePerYear = validateArray(
      searchResults.maintenance_costs,
      defaultMaintenance,
      "maintenance_costs",
    );

    const depreciationPercentage = validateArray(
      searchResults.depreciation_percentages,
      defaultDepreciation,
      "depreciation_percentages",
    );

    const averagePrice =
      searchResults.market_analysis?.average_price ||
      (searchResults.current_listings &&
      searchResults.current_listings.length > 0
        ? Math.round(
            searchResults.current_listings
              .filter((listing) => listing.price && listing.price > 0)
              .reduce((sum, listing) => sum + listing.price, 0) /
              Math.max(
                1,
                searchResults.current_listings.filter(
                  (listing) => listing.price && listing.price > 0,
                ).length,
              ),
          )
        : 200000);

    const carYear = (() => {
      if (
        searchResults.quickModelDetails &&
        searchResults.quickModelDetails.yearFrom
      ) {
        return searchResults.quickModelDetails.yearFrom;
      }
      if (
        searchResults.current_listings &&
        searchResults.current_listings.length > 0
      ) {
        const validListings = searchResults.current_listings.filter(
          (listing) => listing.year && listing.year > 2000,
        );
        if (validListings.length > 0) {
          const yearCounts = validListings.reduce((acc, listing) => {
            acc[listing.year] = (acc[listing.year] || 0) + 1;
            return acc;
          }, {});

          const mostCommonYear = Object.entries(yearCounts).reduce(
            (max, [year, count]) =>
              count > max.count ? { year: parseInt(year), count } : max,
            { year: new Date().getFullYear() - 1, count: 0 },
          ).year;

          return mostCommonYear;
        }
      }

      if (searchResults.market_analysis?.car_purchase_age) {
        return (
          new Date().getFullYear() -
          searchResults.market_analysis.car_purchase_age
        );
      }

      return new Date().getFullYear() - 1;
    })();

    let listingsFound = [];
    if (
      searchResults.current_listings &&
      !searchResults.current_listings[0].title.includes("Sample")
    ) {
      listingsFound = searchResults.current_listings;
    }

    return {
      name: searchResults.car_name || "AI Research Car",
      customName: "",
      details:
        `query = \"${localStorage.getItem("nextjsv1_pending_ai_query")}\"` +
        `\nResearch confidence = ${searchResults.research_confidence || ""}` +
        `\nMarket insights = ${searchResults.market_insights || "No market insights available"}` +
        `\nResearch metadata = ${searchResults.research_metadata || "No research metadata available"}` +
        `\nMarket Analysis Summary = ${JSON.stringify(searchResults.market_analysis, 2, null) || "No market analysis available"}`,

      carPrice: Number(averagePrice) || 200000,
      year: carYear,
      loanDetails: {
        loanType: "cash",
        downPayment: Number(averagePrice) || 200000,
        months: 48,
        finalPayment: 0,
        monthlyPayment: 0,
        totalInterest: 0,
        effectiveRate: 0,
      },
      fuelType: searchResults.fuel_type || "gasoline",
      fuelConsumption: Number(searchResults.fuel_consumption) || 10,
      depreciationPercentage: depreciationPercentage,
      maintenancePerYear: maintenancePerYear,
      annualInsurance: Number(searchResults.annual_insurance) || 6500,
      registrationCost: Number(searchResults.registration_cost) || 1200,
      annualTax: Number(searchResults.annual_tax) || 800,
      extendedWarranty: Number(searchResults.extended_warranty) || 0,
      yad2Data: searchResults.yad2_data
        ? {
            manufacturerId: searchResults.yad2_data.manufacturer_id || 0,
            manufacturerName:
              searchResults.yad2_data.manufacturer_name || "Unknown",
            manufacturerNameHebrew:
              searchResults.yad2_data.manufacturer_name_hebrew ||
              "לא ידוע",
            modelBaseName:
              searchResults.yad2_data.model_base_name || "Unknown",
            fullModelName:
              searchResults.yad2_data.full_model_name ||
              searchResults.car_name ||
              "Unknown",
            modelIds: searchResults.yad2_data.modelIds || [],
            modelAliases: searchResults.yad2_data.modelAliases || [],
          }
        : null,
      researchMetadata: {
        confidence: searchResults.research_confidence || "medium",
        dataSource:
          searchResults.market_analysis?.depreciation_data_source ||
          "unknown",
        listingsFound: listingsFound,
        timestamp: new Date().toISOString(),
        carPurchaseAge:
          searchResults.market_analysis?.car_purchase_age || 0,
        deprecationReasoning:
          searchResults.market_analysis?.depreciation_reasoning ||
          "No reasoning provided",
        priceRange: {
          min: searchResults.market_analysis?.price_range_min,
          max: searchResults.market_analysis?.price_range_max,
        },
        marketAvailability:
          searchResults.market_analysis?.market_availability || "Unknown",
      },
    };
  };

  const handleCreateCar = () => {
    if (!searchResults) return;

    try {
      const carData = buildCarData(searchResults);

      if (searchResults.research_confidence === "low") {
        if (
          window.confirm(
            "The AI had limited data for this car model. The estimates may not be fully accurate. " +
              "Would you still like to add it to the comparison?",
          )
        ) {
          onCarFound(carData);
          toast.success(
            `"${searchResults.car_name}" added to comparison!`,
          );
          localStorage.removeItem("nextjsv1_pending_ai_query");
        }
      } else {
        onCarFound(carData);
        toast.success(`"${searchResults.car_name}" added to comparison!`);
        localStorage.removeItem("nextjsv1_pending_ai_query");
      }
    } catch (error) {
      console.error("Failed to create car data:", error);
      toast.error("Failed to add car to comparison");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Overview
        </Button>
        <div>
          <h1 className="text-foreground text-3xl font-bold">
            AI Car Research
          </h1>
          <p className="text-muted-foreground">
            AI-powered market research with real listings and pricing
          </p>
        </div>
      </div>

      <Card className="from-accent/10 to-primary/10 border-primary/20 bg-gradient-to-r">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Smart Car Research
          </CardTitle>
          <p className="text-primary/90 text-sm">
            Get real-time market data, current listings, and comprehensive
            financial analysis for any car in Israel.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="car-query">
              What car are you researching?
            </Label>
            <div className="mt-1 flex gap-2">
              <Input
                id="car-query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., Tesla Model Y 2024, Toyota Camry Hybrid, BMW X3 2023"
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                // onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button
                variant="outline"
                onClick={() => setShowVoiceModal(true)}
                className="from-accent/20 to-primary/20 hover:bg-primary/30 border-primary/30 text-primary bg-gradient-to-r"
              >
                <Mic className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => handleSearch()}
                disabled={isSearching || !query.trim()}
                className="from-primary to-primary/90 hover:bg-primary/80 bg-gradient-to-r"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {error && (
            <Alert className="border-destructive/20 bg-destructive/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-destructive">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Login Required Prompt */}
          {showLoginPrompt && (
            <Alert className="border-warning/20 bg-warning/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-warning-foreground">
                <div className="space-y-3">
                  <p>
                    <strong>Login Required</strong> - AI Car Research
                    requires an account to access real-time market data and
                    advanced features.
                  </p>
                  <p className="text-sm">
                    Your search "{query}" has been saved. After logging in,
                    you'll be brought back here and your research will
                    start automatically.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleLogin}
                      size="sm"
                      className="bg-warning text-warning-foreground hover:bg-warning/90"
                    >
                      Login to Continue
                    </Button>
                    <Button
                      onClick={() => {
                        setShowLoginPrompt(false);
                        localStorage.removeItem(
                          "nextjsv1_pending_ai_query",
                        );
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {searchResults && (
            <div className="space-y-6">
              {/* Main Car Info */}
              <div className="bg-background border-border rounded-xl border p-6 shadow-sm">
                <div className="mb-4 flex items-start justify-between">
                  <h3 className="text-foreground text-xl font-bold">
                    {searchResults.car_name}
                  </h3>
                  {searchResults.research_confidence && (
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        searchResults.research_confidence === "high"
                          ? "bg-success/20 text-success"
                          : searchResults.research_confidence === "medium"
                            ? "bg-warning/20 text-warning"
                            : "bg-destructive/20 text-destructive"
                      }`}
                    >
                      {searchResults.research_confidence} confidence
                    </span>
                  )}
                </div>

                {/* Market Analysis */}
                {searchResults.market_analysis && (
                  <div className="bg-secondary mb-4 grid grid-cols-1 gap-4 rounded-lg p-4 md:grid-cols-4">
                    <div className="text-center">
                      <div className="text-muted-foreground text-sm">
                        Average Price
                      </div>
                      <div className="text-success text-lg font-bold">
                        ₪
                        {searchResults.market_analysis.average_price?.toLocaleString() ||
                          "N/A"}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground text-sm">
                        Price Range
                      </div>
                      <div className="text-lg font-bold">
                        ₪
                        {searchResults.market_analysis.price_range_min?.toLocaleString() ||
                          "N/A"}{" "}
                        - ₪
                        {searchResults.market_analysis.price_range_max?.toLocaleString() ||
                          "N/A"}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground text-sm">
                        Fuel Consumption
                      </div>
                      <div className="text-lg font-bold">
                        {searchResults.fuel_consumption || "N/A"}{" "}
                        {searchResults.fuel_type === "electric"
                          ? "kWh"
                          : "L"}
                        /100km
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground text-sm">
                        Availability
                      </div>
                      <div className="text-sm font-semibold">
                        {searchResults.market_analysis
                          .market_availability || "N/A"}
                      </div>
                    </div>
                  </div>
                )}

                {/* Depreciation Reasoning */}
                {searchResults.market_analysis?.depreciation_reasoning && (
                  <div className="bg-warning/10 mb-4 rounded-lg p-4">
                    <h4 className="text-warning-foreground mb-2 font-semibold">
                      Depreciation Insights
                    </h4>
                    <p className="text-warning text-sm">
                      {
                        searchResults.market_analysis
                          .depreciation_reasoning
                      }
                    </p>
                  </div>
                )}

                {/* Market Insights */}
                {searchResults.market_insights && (
                  <div className="bg-info/10 mb-4 rounded-lg p-4">
                    <h4 className="text-info-foreground mb-2 font-semibold">
                      Market Insights
                    </h4>
                    <p className="text-info text-sm">
                      {searchResults.market_insights}
                    </p>
                  </div>
                )}
              </div>

              {/* Financial Breakdown */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Maintenance costs breakdown */}
                {searchResults.maintenance_costs &&
                  Array.isArray(searchResults.maintenance_costs) && (
                    <Card className="from-success/10 to-success/20 border-success/20 bg-gradient-to-r">
                      <CardHeader>
                        <CardTitle className="text-success-foreground text-lg">
                          Annual Maintenance Costs
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-7 gap-2 text-xs">
                          {searchResults.maintenance_costs.map(
                            (cost, index) => (
                              <div
                                key={index}
                                className="bg-background border-success/20 rounded border p-2 text-center"
                              >
                                <div className="text-foreground/90 font-medium">
                                  Y{index + 1}
                                </div>
                                <div className="text-success font-bold">
                                  ₪{Number(cost).toLocaleString()}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                {/* Depreciation breakdown */}
                {searchResults.depreciation_percentages &&
                  Array.isArray(
                    searchResults.depreciation_percentages,
                  ) && (
                    <Card className="from-destructive/10 to-destructive/20 border-destructive/20 bg-gradient-to-r">
                      <CardHeader>
                        <CardTitle className="text-foreground text-lg">
                          Annual Depreciation
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-7 gap-2 text-xs">
                          {searchResults.depreciation_percentages.map(
                            (dep, index) => (
                              <div
                                key={index}
                                className="bg-background border-destructive/20 rounded border p-2 text-center"
                              >
                                <div className="text-foreground/90 font-medium">
                                  Y{index + 1}
                                </div>
                                <div className="text-destructive font-bold">
                                  {Number(dep)}%
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleCreateCar}
                  className="from-success to-success/90 hover:bg-success/80 flex-1 bg-gradient-to-r"
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Add to Comparison
                </Button>
                <Button
                  onClick={onCancel}
                  variant="outline"
                  className="flex-1"
                >
                  Back to Overview
                </Button>
              </div>

              {/* Current Listings */}
              {searchResults.current_listings &&
                searchResults.current_listings.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="flex items-center gap-2 text-lg font-bold">
                      <Globe className="text-info h-5 w-5" />
                      Current Market Listings (
                      {searchResults.current_listings.length} found)
                    </h4>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                      {searchResults.current_listings.map(
                        (listing, index) => (
                          <Card
                            key={index}
                            className="bg-background border-border border transition-all duration-200 hover:shadow-lg"
                          >
                            <CardContent className="p-4">
                              <div className="mb-3 flex items-start justify-between">
                                <div className="min-w-0 flex-1">
                                  <h5 className="text-foreground mb-2 line-clamp-2 text-sm leading-tight font-semibold">
                                    {listing.title}
                                  </h5>
                                  <div className="text-muted-foreground mb-2 flex flex-wrap items-center gap-2 text-xs">
                                    <div className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {listing.location}
                                    </div>
                                    {listing.age_category && (
                                      <span className="bg-info/20 text-info rounded-full px-2 py-0.5 text-xs font-medium">
                                        {listing.age_category}
                                      </span>
                                    )}
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                        listing.seller_type === "dealer"
                                          ? "bg-primary/20 text-primary"
                                          : "bg-success/20 text-success"
                                      }`}
                                    >
                                      {listing.seller_type === "dealer"
                                        ? "🏪 Dealer"
                                        : "👤 Private"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="mb-3 text-center">
                                <div className="text-success text-xl font-bold">
                                  ₪
                                  {listing.price?.toLocaleString() ||
                                    "N/A"}
                                </div>
                              </div>

                              <div className="bg-secondary mb-3 grid grid-cols-2 gap-3 rounded p-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">
                                    Year:
                                  </span>
                                  <span className="ml-1 font-medium">
                                    {listing.year || "N/A"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">
                                    Mileage:
                                  </span>
                                  <span className="ml-1 font-medium">
                                    {listing.mileage?.toLocaleString() ||
                                      "N/A"}{" "}
                                    km
                                  </span>
                                </div>
                              </div>

                              {listing.highlights && (
                                <div className="mb-3">
                                  <p className="text-foreground/90 bg-info/10 line-clamp-2 rounded p-2 text-xs">
                                    <strong>💎</strong>{" "}
                                    {listing.highlights}
                                  </p>
                                </div>
                              )}

                              {listing.condition_notes && (
                                <div className="mb-3">
                                  <p className="text-muted-foreground line-clamp-1 text-xs">
                                    <strong>🔧</strong>{" "}
                                    {listing.condition_notes}
                                  </p>
                                </div>
                              )}

                              {listing.link && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="from-accent/10 to-primary/10 hover:bg-accent/30 border-info/20 text-info w-full bg-gradient-to-r"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    window.open(
                                      `https://www.yad2.co.il/vehicles/item/${listing.link}`,
                                      "_blank",
                                    );
                                  }}
                                >
                                  <ExternalLink className="mr-2 h-3 w-3" />
                                  View Listing
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        ),
                      )}
                    </div>

                    {/* Second Add to Comparison Button */}
                    <div className="flex gap-3">
                      <Button
                        onClick={handleCreateCar}
                        className="from-success to-success/90 hover:bg-success/80 flex-1 bg-gradient-to-r"
                      >
                        <DollarSign className="mr-2 h-4 w-4" />
                        Add to Comparison
                      </Button>
                    </div>
                  </div>
                )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Voice Input Modal */}
      <VoiceInputModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onTranscriptReady={handleVoiceTranscript}
      />
    </div>
  );
}
