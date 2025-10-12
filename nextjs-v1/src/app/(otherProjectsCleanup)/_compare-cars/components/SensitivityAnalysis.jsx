import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { AlertCircle, Clock, CheckCircle } from "lucide-react";
import { InfoTooltip } from "./explanations";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function SensitivityAnalysis({
  globalParams,
  setGlobalParams,
  cars,
  calculateNetWorth,
  calculateNoCarNetWorth,
  formatCurrency,
}) {
  // Local state for immediate UI feedback
  const [localParams, setLocalParams] = useState({
    stockMarketReturn: globalParams.stockMarketReturn,
    gasPrice: globalParams.gasPrice,
    annualKm: globalParams.annualKm,
  });

  // Debounce state
  const [isPending, setIsPending] = useState(false);
  const debounceTimeoutRef = useRef(null);

  // Sync local state when global params change externally
  useEffect(() => {
    setLocalParams({
      stockMarketReturn: globalParams.stockMarketReturn,
      gasPrice: globalParams.gasPrice,
      annualKm: globalParams.annualKm,
    });
  }, [
    globalParams.stockMarketReturn,
    globalParams.gasPrice,
    globalParams.annualKm,
  ]);

  // Debounced update function
  const debouncedUpdateGlobal = useCallback(
    (newParams) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      setIsPending(true);

      debounceTimeoutRef.current = setTimeout(() => {
        setGlobalParams(newParams);
        setIsPending(false);
      }, 800); // 800ms debounce
    },
    [setGlobalParams],
  );

  // Parameter change handlers - update local state immediately, debounce global updates
  const handleStockReturnChange = useCallback(
    (value) => {
      const newValue = value[0];
      setLocalParams((prev) => ({ ...prev, stockMarketReturn: newValue }));
      debouncedUpdateGlobal({ stockMarketReturn: newValue });
    },
    [debouncedUpdateGlobal],
  );

  const handleGasPriceChange = useCallback(
    (value) => {
      const newValue = value[0];
      setLocalParams((prev) => ({ ...prev, gasPrice: newValue }));
      debouncedUpdateGlobal({ gasPrice: newValue });
    },
    [debouncedUpdateGlobal],
  );

  const handleAnnualKmChange = useCallback(
    (value) => {
      const newValue = value[0];
      setLocalParams((prev) => ({ ...prev, annualKm: newValue }));
      debouncedUpdateGlobal({ annualKm: newValue });
    },
    [debouncedUpdateGlobal],
  );

  // Helper function to create params for calculations (uses local params for immediate feedback)
  const createCalculationParams = useCallback(
    (overrides = {}) => {
      return { ...globalParams, ...localParams, ...overrides };
    },
    [globalParams, localParams],
  );

  // Calculate sensitivity data using local params for immediate feedback
  const stockReturnSensitivityData = useMemo(() => {
    const returns = [
      5,
      8,
      10,
      12,
      localParams.stockMarketReturn,
      18,
      20,
    ].sort((a, b) => a - b);
    const uniqueReturns = [...new Set(returns)];

    return uniqueReturns.map((returnRate) => {
      const calcParams = createCalculationParams({
        stockMarketReturn: returnRate,
      });

      // Calculate no-car scenario
      let noCarInvestment = calcParams.initialInvestment;
      for (let i = 0; i < 5; i++) {
        noCarInvestment *= 1 + returnRate / 100;
      }

      const carResults = {};
      cars.slice(0, 3).forEach((car) => {
        // Parse registration cost to ensure it's a number
        const registrationCost = parseFloat(car.registrationCost) || 0;

        let remainingInvestment =
          calcParams.initialInvestment -
          car.loanDetails.downPayment -
          registrationCost;
        let carValue = car.carPrice;

        for (let year = 1; year <= 5; year++) {
          remainingInvestment *= 1 + returnRate / 100;

          const depRate =
            car.depreciationPercentage[year - 1] ||
            car.depreciationPercentage[
              car.depreciationPercentage.length - 1
            ];
          carValue *= 1 - depRate / 100;

          const inflationMultiplier = Math.pow(
            1 + calcParams.inflationRate / 100,
            year - 1,
          );
          let annualCosts = 0;

          let annualFuelCost = 0;
          if (car.fuelType === "electric") {
            annualFuelCost =
              (calcParams.annualKm / 100) *
              car.fuelConsumption *
              calcParams.electricityPrice;
          } else {
            annualFuelCost =
              (calcParams.annualKm / 100) *
              car.fuelConsumption *
              calcParams.gasPrice;
          }

          annualCosts += annualFuelCost * inflationMultiplier;
          const maintenanceCost =
            car.maintenancePerYear[year - 1] ||
            car.maintenancePerYear[car.maintenancePerYear.length - 1];
          annualCosts += maintenanceCost * inflationMultiplier;
          annualCosts += car.annualInsurance * inflationMultiplier;
          annualCosts += car.annualTax * inflationMultiplier;

          if (year <= car.loanDetails.months / 12) {
            annualCosts += car.loanDetails.monthlyPayment * 12;
          }

          if (
            year === Math.ceil(car.loanDetails.months / 12) &&
            car.loanDetails.finalPayment > 0
          ) {
            annualCosts += car.loanDetails.finalPayment;
          }

          if (year <= 3 && car.extendedWarranty > 0) {
            annualCosts += car.extendedWarranty / 3;
          }

          remainingInvestment -= annualCosts;
        }

        carResults[car.name] = remainingInvestment + carValue;
      });

      return {
        stockReturn: returnRate,
        "No Car": noCarInvestment,
        ...carResults,
      };
    });
  }, [cars, createCalculationParams, localParams.stockMarketReturn]);

  // Calculate gas price sensitivity using local params
  const gasPriceSensitivityData = useMemo(() => {
    const prices = [5, 6, 7, localParams.gasPrice, 8, 9, 10].sort(
      (a, b) => a - b,
    );
    const uniquePrices = [...new Set(prices)];

    return uniquePrices.map((price) => {
      const calcParams = createCalculationParams({ gasPrice: price });

      const results = {
        gasPrice: price,
        "No Car": calculateNoCarNetWorth(5),
      };

      cars.slice(0, 3).forEach((car) => {
        // Parse registration cost to ensure it's a number
        const registrationCost = parseFloat(car.registrationCost) || 0;

        let remainingInvestment =
          calcParams.initialInvestment -
          car.loanDetails.downPayment -
          registrationCost;
        let carValue = car.carPrice;

        for (let year = 1; year <= 5; year++) {
          remainingInvestment *= 1 + calcParams.stockMarketReturn / 100;

          const depRate =
            car.depreciationPercentage[year - 1] ||
            car.depreciationPercentage[
              car.depreciationPercentage.length - 1
            ];
          carValue *= 1 - depRate / 100;

          const inflationMultiplier = Math.pow(
            1 + calcParams.inflationRate / 100,
            year - 1,
          );
          let annualCosts = 0;

          let annualFuelCost = 0;
          if (car.fuelType === "electric") {
            annualFuelCost =
              (calcParams.annualKm / 100) *
              car.fuelConsumption *
              calcParams.electricityPrice;
          } else {
            annualFuelCost =
              (calcParams.annualKm / 100) * car.fuelConsumption * price;
          }

          annualCosts += annualFuelCost * inflationMultiplier;
          const maintenanceCost =
            car.maintenancePerYear[year - 1] ||
            car.maintenancePerYear[car.maintenancePerYear.length - 1];
          annualCosts += maintenanceCost * inflationMultiplier;
          annualCosts += car.annualInsurance * inflationMultiplier;
          annualCosts += car.annualTax * inflationMultiplier;

          if (year <= car.loanDetails.months / 12) {
            annualCosts += car.loanDetails.monthlyPayment * 12;
          }

          if (
            year === Math.ceil(car.loanDetails.months / 12) &&
            car.loanDetails.finalPayment > 0
          ) {
            annualCosts += car.loanDetails.finalPayment;
          }

          if (year <= 3 && car.extendedWarranty > 0) {
            annualCosts += car.extendedWarranty / 3;
          }

          remainingInvestment -= annualCosts;
        }

        results[car.name] = remainingInvestment + carValue;
      });

      return results;
    });
  }, [
    cars,
    createCalculationParams,
    calculateNoCarNetWorth,
    localParams.gasPrice,
  ]);

  // Calculate driving distance sensitivity using local params
  const drivingSensitivityData = useMemo(() => {
    const distances = [
      8000,
      12000,
      15000,
      localParams.annualKm,
      22000,
      26000,
      30000,
    ].sort((a, b) => a - b);
    const uniqueDistances = [...new Set(distances)];

    return uniqueDistances.map((distance) => {
      const calcParams = createCalculationParams({ annualKm: distance });

      const results = {
        annualKm: distance,
        "No Car": calculateNoCarNetWorth(5),
      };

      cars.slice(0, 3).forEach((car) => {
        // Parse registration cost to ensure it's a number
        const registrationCost = parseFloat(car.registrationCost) || 0;

        let remainingInvestment =
          calcParams.initialInvestment -
          car.loanDetails.downPayment -
          registrationCost;
        let carValue = car.carPrice;

        for (let year = 1; year <= 5; year++) {
          remainingInvestment *= 1 + calcParams.stockMarketReturn / 100;

          const depRate =
            car.depreciationPercentage[year - 1] ||
            car.depreciationPercentage[
              car.depreciationPercentage.length - 1
            ];
          carValue *= 1 - depRate / 100;

          const inflationMultiplier = Math.pow(
            1 + calcParams.inflationRate / 100,
            year - 1,
          );
          let annualCosts = 0;

          let annualFuelCost = 0;
          if (car.fuelType === "electric") {
            annualFuelCost =
              (distance / 100) *
              car.fuelConsumption *
              calcParams.electricityPrice;
          } else {
            annualFuelCost =
              (distance / 100) * car.fuelConsumption * calcParams.gasPrice;
          }

          annualCosts += annualFuelCost * inflationMultiplier;
          const maintenanceCost =
            car.maintenancePerYear[year - 1] ||
            car.maintenancePerYear[car.maintenancePerYear.length - 1];
          annualCosts += maintenanceCost * inflationMultiplier;
          annualCosts += car.annualInsurance * inflationMultiplier;
          annualCosts += car.annualTax * inflationMultiplier;

          if (year <= car.loanDetails.months / 12) {
            annualCosts += car.loanDetails.monthlyPayment * 12;
          }

          if (
            year === Math.ceil(car.loanDetails.months / 12) &&
            car.loanDetails.finalPayment > 0
          ) {
            annualCosts += car.loanDetails.finalPayment;
          }

          if (year <= 3 && car.extendedWarranty > 0) {
            annualCosts += car.extendedWarranty / 3;
          }

          remainingInvestment -= annualCosts;
        }

        results[car.name] = remainingInvestment + carValue;
      });

      return results;
    });
  }, [
    cars,
    createCalculationParams,
    calculateNoCarNetWorth,
    localParams.annualKm,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const colors = [
    "#6b7280",
    "#3b82f6",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border-border rounded-lg border p-3 shadow-lg">
          <p className="mb-2 font-semibold">{`${
            payload[0]?.payload?.stockReturn
              ? "Stock Return"
              : payload[0]?.payload?.gasPrice
                ? "Gas Price"
                : "Annual Distance"
          }: ${label}${
            payload[0]?.payload?.stockReturn
              ? "%"
              : payload[0]?.payload?.gasPrice
                ? "/L"
                : "km"
          }`}</p>
          {payload.map((entry, index) => (
            <p
              key={index}
              style={{ color: entry.color }}
              className="text-sm"
            >
              {`${entry.name}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Pending state indicator
  const PendingIndicator = () => {
    if (isPending) {
      return (
        <div className="bg-info/10 border-info/20 flex items-center gap-2 rounded-lg border px-3 py-2">
          <Clock className="text-info h-4 w-4 animate-pulse" />
          <span className="text-info text-sm">
            Updating main calculations...
          </span>
        </div>
      );
    }
    return (
      <div className="bg-success/10 border-success/20 flex items-center gap-2 rounded-lg border px-3 py-2">
        <CheckCircle className="text-success h-4 w-4" />
        <span className="text-success text-sm">
          All calculations synchronized
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="bg-background/60 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Sensitivity Analysis</CardTitle>
              <InfoTooltip field="sensitivityAnalysis" />
            </div>
            <PendingIndicator />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Adjust your parameters below and see immediate impacts in the
            sensitivity charts. Changes will update all calculations
            throughout the app after you finish adjusting.
          </p>

          <Tabs defaultValue="driving" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="driving">Driving Patterns</TabsTrigger>
              <TabsTrigger value="gas-price">Fuel Prices</TabsTrigger>
              <TabsTrigger value="stock-return">Stock Returns</TabsTrigger>
            </TabsList>

            <TabsContent value="driving" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    Driving Pattern Impact
                    <InfoTooltip field="annualKm" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-muted-foreground text-sm">
                        Annual Driving:{" "}
                        {localParams.annualKm.toLocaleString()} km
                      </p>
                    </div>
                    <Slider
                      value={[localParams.annualKm]}
                      onValueChange={handleAnnualKmChange}
                      max={30000}
                      min={8000}
                      step={1000}
                      className="w-full"
                    />
                  </div>

                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={drivingSensitivityData}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 60,
                          bottom: 70,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="annualKm"
                          label={{
                            value: "Annual Driving (km)",
                            position: "insideBottom",
                            offset: -35,
                          }}
                          tickFormatter={(value) => `${value / 1000}K`}
                        />
                        <YAxis
                          tickFormatter={(value) =>
                            `₪${(value / 1000).toFixed(0)}K`
                          }
                          domain={["dataMin - 50000", "dataMax + 50000"]} // Dynamic with padding
                          label={{
                            value: "Net Worth (₪)",
                            angle: -90,
                            position: "insideLeft",
                            textAnchor: "middle",
                          }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="No Car"
                          stroke={colors[0]}
                          strokeWidth={3}
                          strokeDasharray="5 5"
                          name="No Car"
                        />
                        {cars.slice(0, 3).map((car, index) => (
                          <Line
                            key={car.id}
                            type="monotone"
                            dataKey={car.name}
                            stroke={colors[index + 1]}
                            strokeWidth={2}
                            name={car.customName
                              ? car.customName.split(" ").slice(0, 3).join(" ")
                              : car.name.split(" ").slice(0, 3).join(" ")}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="bg-secondary rounded-lg p-4">
                      <h4 className="mb-2 font-semibold">
                        Low Mileage (≤12,000 km/year)
                      </h4>
                      <ul className="space-y-1 text-sm">
                        <li>• Fuel costs matter less</li>
                        <li>• Depreciation is main cost factor</li>
                        <li>• Consider used cars or lower-end models</li>
                      </ul>
                    </div>
                    <div className="bg-secondary rounded-lg p-4">
                      <h4 className="mb-2 font-semibold">
                        High Mileage (≥20,000 km/year)
                      </h4>
                      <ul className="space-y-1 text-sm">
                        <li>• Fuel efficiency becomes crucial</li>
                        <li>• Electric/hybrid advantage increases</li>
                        <li>• Higher maintenance costs</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stock-return" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    Stock Market Return Impact
                    <InfoTooltip field="stockMarketReturn" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-muted-foreground text-sm">
                        Return Rate: {localParams.stockMarketReturn}%
                      </p>
                    </div>
                    <Slider
                      value={[localParams.stockMarketReturn]}
                      onValueChange={handleStockReturnChange}
                      max={25}
                      min={5}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={stockReturnSensitivityData}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 60,
                          bottom: 70,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="stockReturn"
                          label={{
                            value: "Stock Return (%)",
                            position: "insideBottom",
                            offset: -35,
                          }}
                        />
                        <YAxis
                          domain={["dataMin - 50000", "dataMax + 50000"]} // Dynamic with padding
                          tickFormatter={(value) =>
                            `₪${(value / 1000).toFixed(0)}K`
                          }
                          label={{
                            value: "Net Worth (₪)",
                            angle: -90,
                            position: "insideLeft",
                            textAnchor: "middle",
                          }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="No Car"
                          stroke={colors[0]}
                          strokeWidth={3}
                          strokeDasharray="5 5"
                          name="No Car"
                        />
                        {cars.slice(0, 3).map((car, index) => (
                          <Line
                            key={car.id}
                            type="monotone"
                            dataKey={car.name}
                            stroke={colors[index + 1]}
                            strokeWidth={2}
                            name={car.customName
                              ? car.customName.split(" ").slice(0, 3).join(" ")
                              : car.name.split(" ").slice(0, 3).join(" ")}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-info/10 mt-4 rounded-lg p-4">
                    <p className="text-info-foreground text-sm">
                      <strong>Key Insight:</strong> Higher stock returns
                      favor not buying a car or choosing the cheapest
                      option, as the opportunity cost of tying up money in
                      a depreciating asset increases.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="gas-price" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    Fuel Price Impact
                    <InfoTooltip field="gasPrice" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-muted-foreground text-sm">
                        Gas Price: ₪{localParams.gasPrice}/L
                      </p>
                    </div>
                    <Slider
                      value={[localParams.gasPrice]}
                      onValueChange={handleGasPriceChange}
                      max={12}
                      min={5}
                      step={0.5}
                      className="w-full"
                    />
                  </div>

                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={gasPriceSensitivityData}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 60,
                          bottom: 70,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="gasPrice"
                          label={{
                            value: "Gas Price (₪/L)",
                            position: "insideBottom",
                            offset: -35,
                          }}
                        />
                        <YAxis
                          domain={["dataMin - 50000", "dataMax + 50000"]} // Dynamic with padding
                          tickFormatter={(value) =>
                            `₪${(value / 1000).toFixed(0)}K`
                          }
                          label={{
                            value: "Net Worth (₪)",
                            angle: -90,
                            position: "insideLeft",
                            textAnchor: "middle",
                          }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="No Car"
                          stroke={colors[0]}
                          strokeWidth={3}
                          strokeDasharray="5 5"
                          name="No Car"
                        />
                        {cars.slice(0, 3).map((car, index) => (
                          <Line
                            key={car.id}
                            type="monotone"
                            dataKey={car.name}
                            stroke={colors[index + 1]}
                            strokeWidth={2}
                            name={car.customName
                              ? car.customName.split(" ").slice(0, 3).join(" ")
                              : car.name.split(" ").slice(0, 3).join(" ")}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-success/10 mt-4 rounded-lg p-4">
                    <p className="text-success-foreground text-sm">
                      <strong>Key Insight:</strong> Electric and hybrid
                      vehicles become more attractive as fuel prices rise.
                      Higher fuel prices widen the gap between efficient
                      and inefficient vehicles.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Break-even Analysis */}
      <Card className="bg-background/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Break-Even Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h4 className="mb-3 font-semibold">
                When Electric Becomes Best Choice:
              </h4>
              <ul className="space-y-2 text-sm">
                <li>• Gas price above ₪8.5/L</li>
                <li>• Annual driving over 20,000 km</li>
                <li>• Stock returns below 12%</li>
                <li>• Planning to keep car 5+ years</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-semibold">
                When Lower-Cost Option Wins:
              </h4>
              <ul className="space-y-2 text-sm">
                <li>• Stock returns above 18%</li>
                <li>• Annual driving under 12,000 km</li>
                <li>• Planning to replace within 3 years</li>
                <li>• Low maintenance requirements</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
