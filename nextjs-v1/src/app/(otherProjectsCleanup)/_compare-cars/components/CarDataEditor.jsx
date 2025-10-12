import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  Car,
  Wrench,
  Trash2,
  Calculator,
  AlertTriangle,
  FileText,
  Edit3,
  Loader2,
  CheckCircle,
  Clock,
  Search,
} from "lucide-react";
import {
  generateYad2SearchUrl,
  generateYad2SearchUrlFromName,
} from "../features/marketResearch/yad2/localDbUtils";
import { FormattedNumberInput } from "./FormattedNumberInput";
import { InfoTooltip } from "./explanations";

// app / compare / components / CarDataEditor.jsx
// Stable input component to prevent re-renders
const StableInput = React.memo(({ value, onChange, ...props }) => {
  return (
    <Input
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  );
});

// Stable textarea component
const StableTextarea = React.memo(({ value, onChange, ...props }) => {
  return (
    <Textarea
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  );
});

// Stable select component
const StableSelect = React.memo(
  ({ value, onValueChange, children, ...props }) => {
    return (
      <Select value={value} onValueChange={onValueChange} {...props}>
        {children}
      </Select>
    );
  },
);

// Memoized summary row component
const SummaryRow = React.memo(
  ({ label, value, isBold = false, tooltipField }) => (
    <div
      className={`flex items-center justify-between ${isBold ? "font-bold" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{label}</span>
        {tooltipField && <InfoTooltip field={tooltipField} />}
      </div>
      <span
        className={
          isBold
            ? "text-popover-foreground text-lg"
            : "text-secondary-foreground font-medium"
        }
      >
        {value}
      </span>
    </div>
  ),
);

export default function CarDataEditor({
  car,
  updateCarData,
  results,
  formatCurrency,
  removeCar,
  calculateEffectiveRate,
  globalParams,
}) {
  // Use local state for editing - this never gets overwritten by parent updates
  const [localCarData, setLocalCarData] = useState(car);
  const [syncStatus, setSyncStatus] = useState("synced"); // 'synced', 'pending', 'syncing', 'error'

  // Use refs to track sync state without causing re-renders or stale closures
  const syncTimeoutRef = useRef(null);
  const lastSyncedDataRef = useRef(car);
  const isInitializedRef = useRef(false);

  // Initialize local state only once when component mounts or when car ID changes (new car selected/loaded)
  useEffect(() => {
    // If localCarData is not initialized or the car ID changes (meaning a different car is selected/loaded)
    // or if the car prop itself has significantly changed (e.g. initial load where localCarData is empty)
    // then re-initialize localCarData from the car prop.
    if (
      !isInitializedRef.current ||
      !localCarData ||
      car?.id !== localCarData?.id
    ) {
      if (car) {
        // Ensure loanType is set, defaulting to 'regular' if not present in the incoming car data
        const initialCarData = {
          ...car,
          loanDetails: {
            loanType: car.loanDetails?.loanType || "regular", // Default to 'regular' if not present
            downPayment: car.loanDetails?.downPayment || 0,
            monthlyPayment: car.loanDetails?.monthlyPayment || 0,
            months: car.loanDetails?.months || 0,
            finalPayment: car.loanDetails?.finalPayment || 0,
            effectiveRate: car.loanDetails?.effectiveRate || 0,
            totalInterest: car.loanDetails?.totalInterest || 0,
            // ... any other loanDetails fields
          },
        };
        setLocalCarData(initialCarData);
        lastSyncedDataRef.current = initialCarData; // Also update the ref with the clean data
        isInitializedRef.current = true;
        setSyncStatus("synced"); // Reset status on new car load
      }
    }
  }, [car?.id, car]); // Depend on car.id and car itself for complete initialization

  // Background sync function that doesn't affect local state immediately
  const backgroundSync = useCallback(
    async (dataToSync) => {
      try {
        setSyncStatus("syncing");

        // Call the parent update function but don't await it directly in this function.
        // This prevents the parent state update from affecting local editing focus.
        // The parent will re-render independently, but our local state remains stable.
        updateCarData(car.id, dataToSync);

        // Update last synced reference for comparison
        lastSyncedDataRef.current = { ...dataToSync };

        setSyncStatus("synced"); // Directly set to synced as the updateCarData call is effectively "sent"
      } catch (error) {
        console.error("Background sync failed:", error);
        setSyncStatus("error");

        // Optionally, retry after a delay or show a persistent error
        setTimeout(() => {
          // Only retry if still in error state for this specific data
          if (
            JSON.stringify(lastSyncedDataRef.current) !==
            JSON.stringify(dataToSync)
          ) {
            backgroundSync(dataToSync);
          }
        }, 5000);
      }
    },
    [car.id, updateCarData],
  );

  // Debounced background sync - only sync when user stops typing
  useEffect(() => {
    // Only proceed if localCarData is initialized and we have a car prop
    if (!localCarData || !car || !isInitializedRef.current) {
      return;
    }

    // Check if local data is different from last synced data
    const hasChanges =
      JSON.stringify(localCarData) !==
      JSON.stringify(lastSyncedDataRef.current);

    if (!hasChanges) {
      // If no changes, ensure status is synced and clear any pending timeout
      setSyncStatus("synced");
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      return;
    }

    // Clear existing timeout if any
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    setSyncStatus("pending"); // Indicate changes are awaiting sync

    // Set new timeout for background sync
    syncTimeoutRef.current = setTimeout(() => {
      backgroundSync(localCarData);
    }, 2000); // Longer delay (2 seconds) to give user time to finish typing

    // Cleanup function for the effect
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [localCarData, backgroundSync, car]); // Include 'car' as dependency to re-evaluate on car prop change

  // Memoized input change handlers - these only update local state
  const handleInputChange = useCallback(
    (field) => (value) => {
      setLocalCarData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleLoanChange = useCallback(
    (field) => (value) => {
      const numValue =
        field === "loanCalculationMode" ? value : parseFloat(value) || 0;
      setLocalCarData((prev) => ({
        ...prev,
        loanDetails: { ...prev.loanDetails, [field]: numValue },
      }));
    },
    [],
  );

  const handleListChange = useCallback(
    (field, index) => (value) => {
      const numValue = parseFloat(value) || 0;
      setLocalCarData((prev) => {
        const newList = [...(prev[field] || [])];
        newList[index] = numValue;
        return { ...prev, [field]: newList };
      });
    },
    [],
  );

  // Memoized effective rate calculation based on local data
  const effectiveRateData = useMemo(() => {
    if (!localCarData?.loanDetails) return { rate: 0, totalInterest: 0 };

    // If cash purchase, effective rate is 0
    if (localCarData.loanDetails.loanType === "cash") {
      return { rate: 0, totalInterest: 0 };
    }

    const principal =
      localCarData.carPrice - localCarData.loanDetails.downPayment;
    const effectiveRate =
      principal > 0 && localCarData.loanDetails.monthlyPayment > 0
        ? calculateEffectiveRate(
            principal,
            localCarData.loanDetails.monthlyPayment,
            localCarData.loanDetails.months,
            localCarData.loanDetails.finalPayment,
          )
        : 0;

    const totalInterest =
      localCarData.loanDetails.monthlyPayment *
        localCarData.loanDetails.months +
      localCarData.loanDetails.finalPayment -
      principal;

    return { rate: effectiveRate, totalInterest };
  }, [
    localCarData?.carPrice,
    localCarData?.loanDetails?.downPayment,
    localCarData?.loanDetails?.monthlyPayment,
    localCarData?.loanDetails?.months,
    localCarData?.loanDetails?.finalPayment,
    localCarData?.loanDetails?.loanType,
    calculateEffectiveRate,
  ]);

  // Update local car data with calculated values (this will trigger debounced sync)
  useEffect(() => {
    if (!localCarData?.loanDetails || !effectiveRateData) return;

    // Check if the calculated values are significantly different before updating state
    const needsUpdate =
      Math.abs(
        localCarData.loanDetails.effectiveRate - effectiveRateData.rate,
      ) > 0.01 ||
      Math.abs(
        localCarData.loanDetails.totalInterest -
          effectiveRateData.totalInterest,
      ) > 1;

    if (needsUpdate) {
      setLocalCarData((prev) => ({
        ...prev,
        loanDetails: {
          ...prev.loanDetails,
          effectiveRate: effectiveRateData.rate,
          totalInterest: effectiveRateData.totalInterest,
        },
      }));
    }
  }, [
    effectiveRateData.rate,
    effectiveRateData.totalInterest,
    localCarData?.loanDetails?.effectiveRate,
    localCarData?.loanDetails?.totalInterest,
    localCarData?.loanDetails,
  ]); // Added localCarData?.loanDetails as dependency for full check

  // Memoized calculations for the summary based on local data
  const calculations = useMemo(() => {
    if (!localCarData) return null;

    const principal =
      localCarData.carPrice - localCarData.loanDetails.downPayment;
    const totalPaid =
      localCarData.loanDetails.downPayment +
      localCarData.loanDetails.monthlyPayment *
        localCarData.loanDetails.months +
      localCarData.loanDetails.finalPayment;
    const financingImpact = totalPaid - localCarData.carPrice;
    const isDiscounted = financingImpact < 0;

    return {
      principal,
      totalPaid,
      financingImpact,
      isDiscounted,
    };
  }, [localCarData?.carPrice, localCarData?.loanDetails]);

  // Memoized annual operating costs calculation
  const annualOperatingCosts = useMemo(() => {
    if (!localCarData || !globalParams) return 0;

    // Fixed annual costs
    const registrationCost =
      parseFloat(localCarData.registrationCost) || 0;
    const annualInsurance = parseFloat(localCarData.annualInsurance) || 0;
    const annualTax = parseFloat(localCarData.annualTax) || 0;
    const extendedWarranty =
      parseFloat(localCarData.extendedWarranty) || 0;

    // Calculate fuel/electricity costs based on consumption and annual KM
    const fuelConsumption = parseFloat(localCarData.fuelConsumption) || 0;
    const annualKm = globalParams.annualKm || 0;

    let annualFuelCost = 0;
    if (fuelConsumption > 0 && annualKm > 0) {
      if (localCarData.fuelType === "electric") {
        // Electric: kWh/100km * annual_km / 100 * electricity_price
        const electricityPrice = globalParams.electricityPrice || 0;
        annualFuelCost =
          ((fuelConsumption * annualKm) / 100) * electricityPrice;
      } else {
        // Gasoline/Hybrid: L/100km * annual_km / 100 * gas_price
        const gasPrice = globalParams.gasPrice || 0;
        annualFuelCost = ((fuelConsumption * annualKm) / 100) * gasPrice;
      }
    }

    return (
      registrationCost +
      annualInsurance +
      annualTax +
      extendedWarranty +
      annualFuelCost
    );
  }, [
    localCarData?.registrationCost,
    localCarData?.annualInsurance,
    localCarData?.annualTax,
    localCarData?.extendedWarranty,
    localCarData?.fuelConsumption,
    localCarData?.fuelType,
    globalParams?.annualKm,
    globalParams?.gasPrice,
    globalParams?.electricityPrice,
  ]);
  // Memoized depreciation calculations
  const depreciationData = useMemo(() => {
    if (!localCarData?.carPrice || !localCarData?.depreciationPercentage)
      return [];

    const carPrice = parseFloat(localCarData.carPrice) || 0;
    const depreciationPercentages =
      localCarData.depreciationPercentage || [];

    let currentValue = carPrice;
    const yearlyData = [];

    for (let i = 0; i < depreciationPercentages.length; i++) {
      const percentage = parseFloat(depreciationPercentages[i]) || 0;
      const depreciationAmount = (currentValue * percentage) / 100;
      const newValue = currentValue - depreciationAmount;

      yearlyData.push({
        year: i + 1,
        percentage: percentage,
        depreciationAmount: depreciationAmount,
        carValueBefore: currentValue,
        carValueAfter: newValue,
        totalDepreciation: carPrice - newValue,
      });

      currentValue = newValue;
    }

    return yearlyData;
  }, [localCarData?.carPrice, localCarData?.depreciationPercentage]);

  // Sync status indicator component
  const SyncStatusIndicator = useMemo(() => {
    switch (syncStatus) {
      case "pending":
        return (
          <div className="flex items-center gap-2">
            <span className="text-xs text-yellow-600">
              Changes pending...
            </span>
            <Clock className="h-5 w-5 animate-pulse text-yellow-600" />
          </div>
        );
      case "syncing":
        return (
          <div className="flex items-center gap-2">
            <span className="text-info text-xs">Syncing...</span>
            <Loader2 className="text-info h-5 w-5 animate-spin" />
          </div>
        );
      case "synced":
        return (
          <div className="flex items-center gap-2">
            <span className="text-success text-xs">Changes saved</span>
            <CheckCircle className="text-success h-5 w-5" />
          </div>
        );
      case "error":
        return (
          <div className="flex items-center gap-2">
            <span className="text-destructive text-xs">
              Sync error - retrying...
            </span>
            <AlertTriangle className="text-destructive h-5 w-5" />
          </div>
        );
      default:
        return null;
    }
  }, [syncStatus]);

  if (!localCarData) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="text-info h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex w-full min-w-48 flex-1 items-center gap-3">
          <StableInput
            value={localCarData.name}
            onChange={handleInputChange("name")}
            className="-ml-3 w-full border-0 bg-transparent p-2 text-2xl font-bold shadow-none focus-visible:ring-2 focus-visible:ring-blue-500 md:text-3xl"
            placeholder="e.g., Toyota Camry 2024"
          />
        </div>
        <div className="flex gap-3">
          {SyncStatusIndicator}
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              try {
                // Extract car year from researchMetadata or estimate from current year
                const carYear = localCarData.researchMetadata
                  ?.carPurchaseAge
                  ? new Date().getFullYear() -
                    localCarData.researchMetadata.carPurchaseAge
                  : localCarData.year || 2020;

                // Use new Yad2 URL generator with proper data structure
                if (
                  localCarData.yad2Data &&
                  localCarData.yad2Data.manufacturerId
                ) {
                  // Use enhanced Yad2 data for precise search
                  const url = generateYad2SearchUrl({
                    yad2Data: {
                      manufacturerId: localCarData.yad2Data.manufacturerId,
                      modelIds: localCarData.yad2Data.modelIds || [],
                      modelBaseName: localCarData.yad2Data.modelBaseName,
                      fullModelName: localCarData.yad2Data.fullModelName,
                    },
                    carPrice: localCarData.carPrice,
                    year: carYear,
                    name: localCarData.name,
                  });
                  window.open(url, "_blank");
                } else {
                  // Fallback: try to parse car name to find manufacturer/model
                  const url = generateYad2SearchUrlFromName(
                    localCarData.name,
                    localCarData.carPrice,
                    carYear,
                  );
                  window.open(url, "_blank");
                }
              } catch (error) {
                console.error("Failed to generate Yad2 URL:", error);
                // Ultimate fallback to basic Yad2 search with car name
                const basicUrl = `https://www.yad2.co.il/vehicles/cars?info=${encodeURIComponent(
                  localCarData.name,
                )}`;
                window.open(basicUrl, "_blank");
              }
            }}
            //
            className="border-orange-400 bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 hover:from-orange-200 hover:to-red-200"
          >
            <Search className="mr-0 h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Find on Yad2</span>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => removeCar(car.id)}
          >
            <Trash2 className="mr-0 h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Remove</span>
          </Button>
        </div>
      </div>

      {/* Custom Name & Details Section */}
      <Card className="bg-card/60 hover:bg-card border-success/20 transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-success-foreground flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Personal Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="custom-name">Custom Name (Optional)</Label>
            <StableInput
              id="custom-name"
              value={localCarData.customName}
              onChange={handleInputChange("customName")}
              className="mt-1"
              placeholder="e.g., Dad's Car, Weekend Deal, Best Option"
            />
          </div>
          <div>
            <Label htmlFor="details">Deal Details & Notes</Label>
            <StableTextarea
              id="details"
              value={localCarData.details}
              onChange={handleInputChange("details")}
              className="mt-1 h-24"
              placeholder="Add notes about the dealership, special terms, contact info, links, or anything else relevant to this deal..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Loan Details Section */}
      <Card className="bg-card/60 hover:bg-card border-info/20 transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-info-foreground flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Dealership Deal Input
          </CardTitle>
          <p className="text-info text-sm">
            Enter the numbers from your quote. The app calculates the true
            cost and effective interest rate.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Car Price - Always shown */}
          <div className="bg-card border-info/20-100 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="car-price"
                className="text-foreground text-base font-semibold"
              >
                Car Price
              </Label>
              <InfoTooltip field="carPrice" />
            </div>
            <div className="relative mt-2">
              <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 transform text-lg">
                ₪
              </span>
              <FormattedNumberInput
                id="car-price"
                value={localCarData.carPrice}
                onChange={handleInputChange("carPrice")}
                className="h-14 pl-8 text-center text-2xl font-bold"
                placeholder="200000"
              />
            </div>
          </div>

          {/* Loan Type Selection */}
          <div className="bg-card rounded-lg p-4">
            <Label className="text-foreground mb-3 block text-base font-semibold">
              How are you paying for this car?
            </Label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <button
                type="button"
                onClick={() => {
                  setLocalCarData((prev) => ({
                    ...prev,
                    loanDetails: {
                      ...prev.loanDetails,
                      loanType: "cash",
                      downPayment: prev.carPrice, // Set down payment to car price for cash
                      monthlyPayment: 0,
                      months: 0,
                      finalPayment: 0,
                    },
                  }));
                }}
                className={`rounded-lg border-2 p-4 text-left transition-all duration-200 ${
                  localCarData.loanDetails.loanType === "cash"
                    ? "border-success bg-success/10 text-success-foreground"
                    : "border-border bg-background hover:border-success/30 hover:bg-success/5"
                }`}
              >
                <div className="font-semibold">💰 Cash Purchase</div>
                <div className="mt-1 text-sm opacity-70">
                  Pay full amount upfront
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLocalCarData((prev) => ({
                    ...prev,
                    loanDetails: {
                      ...prev.loanDetails,
                      loanType: "regular",
                      downPayment:
                        prev.carPrice > 0
                          ? Math.round(prev.carPrice * 0.2)
                          : 0, // 20% default
                      monthlyPayment: 3000,
                      months: 48,
                      finalPayment: 0, // Explicitly zero out final payment for regular loan
                    },
                  }));
                }}
                className={`rounded-lg border-2 p-4 text-left transition-all duration-200 ${
                  localCarData.loanDetails.loanType === "regular"
                    ? "border-accent-foreground bg-info/10 text-info-foreground"
                    : "border-border bg-background hover:border-info/30 hover:bg-info/5"
                }`}
              >
                <div className="font-semibold">🏦 Regular Loan</div>
                <div className="mt-1 text-sm opacity-70">
                  Fixed monthly payments
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLocalCarData((prev) => ({
                    ...prev,
                    loanDetails: {
                      ...prev.loanDetails,
                      loanType: "balloon",
                      downPayment:
                        prev.carPrice > 0
                          ? Math.round(prev.carPrice * 0.2)
                          : 0, // 20% default
                      monthlyPayment: 2000,
                      months: 48,
                      finalPayment:
                        prev.carPrice > 0
                          ? Math.round(prev.carPrice * 0.4)
                          : 0, // 40% default
                    },
                  }));
                }}
                className={`rounded-lg border-2 p-4 text-left transition-all duration-200 ${
                  localCarData.loanDetails.loanType === "balloon"
                    ? "border-primary bg-primary/5 text-info-foreground"
                    : "border-border bg-background hover:border-primary/30 hover:bg-primary/5"
                }`}
              >
                <div className="font-semibold">🎈 Balloon Loan</div>
                <div className="mt-1 text-sm opacity-70">
                  Lower monthly + final payment
                </div>
              </button>
            </div>
          </div>

          {/* Dynamic Loan Fields based on type */}
          {localCarData.loanDetails.loanType === "regular" && (
            <div className="bg-background border-info/20 space-y-4 rounded-lg border p-4">
              <h4 className="text-info-foreground mb-3 font-semibold">
                Regular Loan Details
              </h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="down-payment">Down Payment</Label>
                    <InfoTooltip field="downPayment" />
                  </div>
                  <div className="relative mt-1">
                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 transform">
                      ₪
                    </span>
                    <StableInput
                      id="down-payment"
                      value={localCarData.loanDetails.downPayment}
                      onChange={handleLoanChange("downPayment")}
                      className="pl-8 font-semibold"
                      placeholder="40,000"
                      type="number"
                    />
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {localCarData.carPrice > 0
                      ? `${Math.round(
                          (localCarData.loanDetails.downPayment /
                            localCarData.carPrice) *
                            100,
                        )}% of car price`
                      : ""}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="monthly-payment">
                      Monthly Payment
                    </Label>
                    <InfoTooltip field="monthlyPayment" />
                  </div>
                  <div className="relative mt-1">
                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 transform">
                      ₪
                    </span>
                    <StableInput
                      id="monthly-payment"
                      value={localCarData.loanDetails.monthlyPayment}
                      onChange={handleLoanChange("monthlyPayment")}
                      className="pl-8 font-semibold"
                      placeholder="3,000"
                      type="number"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="loan-months">Loan Term</Label>
                  <div className="relative mt-1">
                    <StableInput
                      id="loan-months"
                      value={localCarData.loanDetails.months}
                      onChange={handleLoanChange("months")}
                      className="pr-16 font-semibold"
                      placeholder="48"
                      type="number"
                    />
                    <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 transform">
                      months
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {localCarData.loanDetails.months > 0
                      ? `${Math.round((localCarData.loanDetails.months / 12) * 10) / 10} years`
                      : ""}
                  </p>
                </div>
              </div>
            </div>
          )}

          {localCarData.loanDetails.loanType === "balloon" && (
            <div className="bg-background space-y-4 rounded-lg border border-purple-100 p-4">
              <h4 className="text-primary mb-3 font-semibold">
                Balloon Loan Details
              </h4>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="down-payment-balloon">
                      Down Payment
                    </Label>
                    <InfoTooltip field="downPayment" />
                  </div>
                  <div className="relative mt-1">
                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 transform">
                      ₪
                    </span>
                    <StableInput
                      id="down-payment-balloon"
                      value={localCarData.loanDetails.downPayment}
                      onChange={handleLoanChange("downPayment")}
                      className="pl-8 font-semibold"
                      placeholder="40,000"
                      type="number"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="monthly-payment-balloon">
                      Monthly Payment
                    </Label>
                    <InfoTooltip field="monthlyPayment" />
                  </div>
                  <div className="relative mt-1">
                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 transform">
                      ₪
                    </span>
                    <StableInput
                      id="monthly-payment-balloon"
                      value={localCarData.loanDetails.monthlyPayment}
                      onChange={handleLoanChange("monthlyPayment")}
                      className="pl-8 font-semibold"
                      placeholder="2,000"
                      type="number"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="loan-months-balloon">Loan Term</Label>
                  <div className="relative mt-1">
                    <StableInput
                      id="loan-months-balloon"
                      value={localCarData.loanDetails.months}
                      onChange={handleLoanChange("months")}
                      className="pr-16 font-semibold"
                      placeholder="48"
                      type="number"
                    />
                    <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 transform text-xs">
                      months
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="balloon-payment">Final Payment</Label>
                    <InfoTooltip field="finalPayment" />
                  </div>
                  <div className="relative mt-1">
                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 transform">
                      ₪
                    </span>
                    <StableInput
                      id="balloon-payment"
                      value={localCarData.loanDetails.finalPayment}
                      onChange={handleLoanChange("finalPayment")}
                      className="pl-8 font-semibold"
                      placeholder="80,000"
                      type="number"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 rounded-lg p-3">
                <p className="text-primary text-sm">
                  <strong>💡 Balloon Loan:</strong> Lower monthly payments
                  with a large final payment. At the end, you can pay the
                  balloon, refinance it, or return the car (if lease).
                </p>
              </div>
            </div>
          )}

          {/* True Cost Display - Always show */}
          {calculations && (
            <div className="bg-card border-border rounded-lg border-2 p-4">
              <h4 className="text-foreground mb-3 flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                True Cost of This Deal
              </h4>

              {localCarData.loanDetails.loanType === "cash" ? (
                <div className="text-center">
                  <div className="text-muted-foreground text-sm">
                    Total Cost
                  </div>
                  <div className="text-success text-2xl font-bold">
                    {formatCurrency(localCarData.carPrice)}
                  </div>
                  <div className="text-success mt-1 text-sm">
                    ✅ No financing costs
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 text-center md:grid-cols-4 md:text-left">
                  <div>
                    <div className="text-muted-foreground text-sm">
                      Car Sticker Price
                    </div>
                    <div className="text-lg font-bold">
                      {formatCurrency(localCarData.carPrice)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-sm">
                      Total You Will Pay
                    </div>
                    <div className="text-lg font-bold">
                      {formatCurrency(calculations.totalPaid)}
                    </div>
                  </div>
                  <div
                    className={`${
                      calculations.financingImpact >= 0
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-sm">
                        {calculations.financingImpact >= 0
                          ? "Financing Cost"
                          : "Effective Discount"}
                      </div>
                      <InfoTooltip field="financingImpact" />
                    </div>
                    <div className="text-lg font-bold">
                      {formatCurrency(
                        Math.abs(calculations.financingImpact),
                      )}
                    </div>
                    {calculations.isDiscounted && (
                      <div className="text-success text-xs">
                        You pay less than sticker!
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-muted-foreground text-sm">
                        Interest Rate
                      </div>
                      <InfoTooltip field="effectiveRate" />
                    </div>
                    <div className="text-destructive text-lg font-bold">
                      {effectiveRateData.rate.toFixed(1)}%
                    </div>
                    <div className="text-muted-foreground text-xs">
                      per year
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Details & Financial Impact */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Vehicle Details */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="bg-background/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Car className="h-4 w-4" />
                Vehicle Details & Operating Costs
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="font-semibold">Fuel & Efficiency</h3>
                <div>
                  <Label>Fuel Type</Label>
                  <StableSelect
                    value={localCarData.fuelType}
                    onValueChange={handleInputChange("fuelType")}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select fuel type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gasoline">Gasoline</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="electric">Electric</SelectItem>
                    </SelectContent>
                  </StableSelect>
                </div>
                <div>
                  <Label>{`Consumption (${
                    localCarData.fuelType === "electric" ? "kWh" : "L"
                  }/100km)`}</Label>
                  <StableInput
                    value={localCarData.fuelConsumption}
                    onChange={handleInputChange("fuelConsumption")}
                    className="mt-1"
                    placeholder="6.0"
                    type="number"
                    step="0.1"
                  />
                  <p className="text-muted-foreground mt-1 text-xs">
                    price for 100km:{" "}
                    {formatCurrency(
                      localCarData.fuelType === "electric"
                        ? (localCarData.fuelConsumption || 0) *
                            (globalParams?.electricityPrice || 0)
                        : (localCarData.fuelConsumption || 0) *
                            (globalParams?.gasPrice || 0),
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Annual Costs</h3>
                {/* <div>
                  <div className="flex items-center gap-2">
                    <Label>Registration & Licensing (₪) - one time </Label>
                    <InfoTooltip field="registrationCost" />
                  </div>
                  <StableInput
                    value={localCarData.registrationCost}
                    onChange={handleInputChange("registrationCost")}
                    className="mt-1"
                    placeholder="1200"
                    type="number"
                  />
                </div> */}
                <div>
                  <div className="flex items-center gap-2">
                    <Label>Annual Insurance (₪)</Label>
                    <InfoTooltip field="annualInsurance" />
                  </div>
                  <StableInput
                    value={localCarData.annualInsurance}
                    onChange={handleInputChange("annualInsurance")}
                    className="mt-1"
                    placeholder="6500"
                    type="number"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label>Annual Tax (₪)</Label>
                    <InfoTooltip field="annualTax" />
                  </div>
                  <StableInput
                    value={localCarData.annualTax}
                    onChange={handleInputChange("annualTax")}
                    className="mt-1"
                    placeholder="800"
                    type="number"
                  />
                </div>
              </div>

              {/* Annual Operating Costs Summary */}
              <div className="from-primary/5 to-primary/10 border-primary/20 mt-6 rounded-lg border bg-gradient-to-r p-4 md:col-span-2">
                <div className="text-center">
                  <div className="text-muted-foreground mb-1 text-sm font-medium">
                    Total Annual Operating Costs
                  </div>
                  <div className="text-primary text-2xl font-bold">
                    {formatCurrency(annualOperatingCosts)}
                  </div>
                  <div className="text-secondary-foreground mt-1 text-sm font-semibold">
                    (when driving{" "}
                    {globalParams?.annualKm
                      ? globalParams.annualKm.toLocaleString()
                      : "0"}{" "}
                    km/year and{" "}
                    {localCarData.fuelType === "gasoline" ||
                    localCarData.fuelType === "hybrid"
                      ? `gas price of ${
                          globalParams?.gasPrice
                            ? globalParams.gasPrice.toLocaleString()
                            : "0"
                        }`
                      : `electricity price of ${
                          globalParams?.electricityPrice
                            ? globalParams.electricityPrice.toLocaleString()
                            : "0"
                        }`}
                    )
                  </div>
                  {annualOperatingCosts > 0 && (
                    <div className="text-muted-foreground mt-2 text-xs">
                      Includes registration, insurance, tax, warranty, and
                      fuel costs
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Impact Summary */}
        <div className="space-y-6">
          <Card className="bg-background/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Financial Impact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h4 className="text-md border-b pb-2 font-bold">
                After 1 Year
              </h4>
              {results && results[1] ? (
                <div className="text-primary space-y-3 text-sm">
                  <SummaryRow
                    label="Total Net Worth"
                    value={formatCurrency(results[1].totalNetWorth)}
                    isBold={true}
                    tooltipField="totalNetWorth"
                  />
                  {/* <SummaryRow
                    label="Investment Value"
                    value={formatCurrency(results[1].investmentValue)}
                    tooltipField="investmentValue"
                  /> */}
                  <SummaryRow
                    label="Total Cash Outflow"
                    value={formatCurrency(results[1].totalCashOutflow)}
                    tooltipField="totalCashOutflow"
                  />
                  {/* <SummaryRow
                    label="Total Cost of Ownership"
                    value={formatCurrency(results[1].totalCostOfOwnership)}
                    tooltipField="totalCostOfOwnership"
                  /> */}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">""</p>
              )}
              <h4 className="text-md border-b pb-2 font-bold">
                After 3 Years
              </h4>
              {results && results[3] ? (
                <div className="text-primary space-y-3 text-sm">
                  <SummaryRow
                    label="Total Net Worth"
                    value={formatCurrency(results[3].totalNetWorth)}
                    isBold={true}
                    tooltipField="totalNetWorth"
                  />
                  {/* <SummaryRow
                    label="Investment Value"
                    value={formatCurrency(results[3].investmentValue)}
                    tooltipField="investmentValue"
                  /> */}
                  <SummaryRow
                    label="Total Cash Outflow"
                    value={formatCurrency(results[3].totalCashOutflow)}
                    tooltipField="totalCashOutflow"
                  />
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">""</p>
              )}
              <h4 className="text-md border-b pb-2 font-bold">
                After 7 Years
              </h4>
              {results && results[7] ? (
                <div className="text-primary space-y-3 text-sm">
                  <SummaryRow
                    label="Total Net Worth"
                    value={formatCurrency(results[7].totalNetWorth)}
                    isBold={true}
                    tooltipField="totalNetWorth"
                  />
                  <SummaryRow
                    label="Investment Value"
                    value={formatCurrency(results[7].investmentValue)}
                    tooltipField="investmentValue"
                  />
                  <SummaryRow
                    label="Car Resale Value"
                    value={formatCurrency(results[7].carValue)}
                    tooltipField="carValue"
                  />
                  <SummaryRow
                    label="Total Cost of Ownership"
                    value={formatCurrency(results[7].totalCostOfOwnership)}
                    tooltipField="totalCostOfOwnership"
                  />
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Calculating...
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Depreciation & Maintenance */}
      <Card className="bg-background/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wrench className="h-4 w-4" />
            Depreciation & Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Depreciation Section with Enhanced Display */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <Label className="font-semibold">
                Annual Depreciation (%)
              </Label>
              {localCarData.carPrice > 0 && (
                <span className="text-muted-foreground text-sm">
                  Starting value: {formatCurrency(localCarData.carPrice)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
              {(localCarData.depreciationPercentage || []).map(
                (value, index) => {
                  const yearData = depreciationData[index];
                  const hasValidData =
                    yearData && yearData.depreciationAmount > 0;

                  return (
                    <div key={`dep-${index}`} className="space-y-2">
                      <Label className="text-muted-foreground text-xs font-medium">
                        Year {index + 1}
                      </Label>

                      <div className="space-y-1">
                        <div className="relative">
                          <StableInput
                            value={value}
                            onChange={handleListChange(
                              "depreciationPercentage",
                              index,
                            )}
                            className="mt-1 pr-8"
                            placeholder="10"
                            type="number"
                            step="0.1"
                          />
                          <span className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 transform text-sm">
                            %
                          </span>
                        </div>

                        {hasValidData && (
                          <div className="bg-muted/30 border-border/50 space-y-1 rounded-md border p-2">
                            <div className="text-destructive text-xs font-medium">
                              -
                              {formatCurrency(yearData.depreciationAmount)}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {formatCurrency(yearData.carValueAfter)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>

            {/* Depreciation Summary */}
            {depreciationData.length > 0 && localCarData.carPrice > 0 && (
              <div className="from-destructive/5 to-destructive/10 border-destructive/20 mt-4 rounded-lg border bg-gradient-to-r p-4">
                <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
                  <div>
                    <div className="text-muted-foreground text-xs">
                      After 3 Years
                    </div>
                    <div className="text-sm font-semibold">
                      {depreciationData[2] ? (
                        <>
                          <div className="text-destructive">
                            -
                            {formatCurrency(
                              depreciationData[2].totalDepreciation,
                            )}
                          </div>
                          <div className="text-muted-foreground mt-1 text-xs">
                            {formatCurrency(
                              depreciationData[2].carValueAfter,
                            )}{" "}
                            value
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-muted-foreground text-xs">
                      After 5 Years
                    </div>
                    <div className="text-sm font-semibold">
                      {depreciationData[4] ? (
                        <>
                          <div className="text-destructive">
                            -
                            {formatCurrency(
                              depreciationData[4].totalDepreciation,
                            )}
                          </div>
                          <div className="text-muted-foreground mt-1 text-xs">
                            {formatCurrency(
                              depreciationData[4].carValueAfter,
                            )}{" "}
                            value
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-muted-foreground text-xs">
                      After 7 Years
                    </div>
                    <div className="text-sm font-semibold">
                      {depreciationData[6] ? (
                        <>
                          <div className="text-destructive">
                            -
                            {formatCurrency(
                              depreciationData[6].totalDepreciation,
                            )}
                          </div>
                          <div className="text-muted-foreground mt-1 text-xs">
                            {formatCurrency(
                              depreciationData[6].carValueAfter,
                            )}{" "}
                            value
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-muted-foreground text-xs">
                      Total Loss %
                    </div>
                    <div className="text-destructive text-sm font-semibold">
                      {depreciationData[6] ? (
                        <>
                          {Math.round(
                            (depreciationData[6].totalDepreciation /
                              localCarData.carPrice) *
                              100,
                          )}
                          %
                          <div className="text-muted-foreground mt-1 text-xs">
                            of original value
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Maintenance Section - Keep as is */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Label className="font-semibold">
                Annual Maintenance (₪)
              </Label>
              <InfoTooltip field="maintenancePerYear" />
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-7">
              {(localCarData.maintenancePerYear || []).map(
                (value, index) => (
                  <div key={`maint-${index}`}>
                    <Label className="text-muted-foreground text-xs">
                      Yr {index + 1}
                    </Label>
                    <StableInput
                      value={value}
                      onChange={handleListChange(
                        "maintenancePerYear",
                        index,
                      )}
                      className="mt-1"
                      placeholder="3000"
                      type="number"
                    />
                  </div>
                ),
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Listings */}
      {car.researchMetadata &&
        car.researchMetadata.listingsFound &&
        car.researchMetadata.listingsFound.length > 0 && (
          <div className="min-w-full space-y-4">
            <Card className="bg-background/60 w- backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Search className="text-info h-5 w-5" />
                  Market Listings (
                  {car.researchMetadata.listingsFound.length} found)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {car.researchMetadata.listingsFound.map(
                    (listing, index) => (
                      <Card
                        key={index}
                        className="bg-background border-border flex h-full flex-col border py-2 transition-all duration-200 hover:shadow-lg"
                      >
                        <CardContent className="flex h-full flex-col p-4">
                          {/* Car Image */}
                          {listing.extraData?.coverImage ? (
                            <div className="relative mb-3 h-48 overflow-hidden rounded-lg bg-gray-100">
                              <img
                                src={`/api/proxy-image?url=${encodeURIComponent(listing.extraData.coverImage)}`}
                                alt={listing.title}
                                className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
                                loading="lazy"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  window.open(
                                    `https://www.yad2.co.il/vehicles/item/${listing.link}`,
                                    "_blank",
                                  );
                                }}
                                onLoad={(e) => {
                                  e.target.style.opacity = "1";
                                  const placeholder =
                                    e.target.parentElement.querySelector(
                                      ".image-placeholder",
                                    );
                                  if (placeholder)
                                    placeholder.style.display = "none";
                                }}
                                onError={(e) => {
                                  // Retry with direct URL as fallback (for development/testing)
                                  const currentSrc = e.target.src;
                                  if (
                                    currentSrc.includes("/api/proxy-image")
                                  ) {
                                    console.warn(
                                      "Proxy failed, attempting direct image load:",
                                      listing.extraData.coverImage,
                                    );
                                    e.target.src =
                                      listing.extraData.coverImage;
                                    e.target.crossOrigin = "anonymous";
                                  } else {
                                    // Both proxy and direct failed, show fallback
                                    const placeholder =
                                      e.target.parentElement.querySelector(
                                        ".image-placeholder",
                                      );
                                    if (placeholder) {
                                      placeholder.innerHTML =
                                        '<div class="text-gray-500 text-sm">📷 Image unavailable</div>';
                                      placeholder.style.display = "flex";
                                    }
                                    e.target.style.display = "none";
                                  }
                                }}
                                style={{
                                  opacity: "0",
                                  transition: "opacity 0.3s ease-in-out",
                                }}
                              />
                              {/* Loading/Error placeholder */}
                              <div className="image-placeholder absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                <div className="animate-pulse text-sm text-gray-400">
                                  Loading...
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="mb-3 flex h-48 items-center justify-center rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 text-sm text-gray-500">
                              📷 No image available
                            </div>
                          )}
                          <div className="mb-3 flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <h5 className="text-foreground mb-2 line-clamp-2 text-sm leading-tight font-semibold">
                                {listing.title}
                              </h5>
                              <div className="text-muted-foreground mb-2 flex flex-wrap items-center gap-2 text-xs">
                                <div className="flex items-center gap-1">
                                  <span>📍</span>
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
                              ₪{listing.price?.toLocaleString() || "N/A"}
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
                          {/* Flexible content area that grows */}
                          <div className="flex-grow">
                            {listing.highlights && (
                              <div className="mb-3">
                                <p className="text-foreground/90 bg-info/10 line-clamp-2 rounded p-2 text-xs">
                                  <strong>💎</strong> {listing.highlights}
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
                          </div>
                          {/* Button always at bottom */}
                          {listing.link && (
                            <div className="mt-auto">
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
                                <span className="mr-2">🔗</span>
                                View Listing
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
    </div>
  );
}
