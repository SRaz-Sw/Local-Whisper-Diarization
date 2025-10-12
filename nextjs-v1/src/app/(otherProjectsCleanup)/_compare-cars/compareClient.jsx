"use client";
// app / compare / compareClient.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Car as CarEntity } from "@/entities/Car";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  Car,
  TrendingUp,
  Calculator,
  DollarSign,
  Fuel,
  Zap,
  AlertCircle,
  Info,
  Loader2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePathname, useRouter } from "next/navigation";

import AppLayout from "./components/layout/AppLayout";
import CarDataEditor from "./components/CarDataEditor";
import NetWorthChart from "./components/NetWorthChart";
import SensitivityAnalysis from "./components/SensitivityAnalysis";
import ComparisonSummary from "./components/ComparisonSummary";
import AICarResearch from "./components/AICarResearch";
import UnifiedProfileSection from "./profile/UnifiedProfileSection";
import {
  LocalStateProvider,
  useLocalState,
} from "./components/LocalStateManager";
import { defaultCarsForNewUsers } from "./components/LocalStateManager";
import { ResultsWithExplanations } from "./components/explanations";
import { useMainAppStateStore } from "./hooks/useMainAppStateStore";
const calculateLoanDetails = ({
  price,
  downPayment,
  months,
  finalPayment,
  annualRate,
}) => {
  if (months === 0) {
    return { monthlyPayment: 0, totalInterest: 0 };
  }

  const principal = price - downPayment;
  const monthlyRate = annualRate / 100 / 12;

  if (monthlyRate === 0) {
    const monthlyPayment = (principal - finalPayment) / months;
    return { monthlyPayment, totalInterest: 0 };
  }

  const r = monthlyRate;
  const n = months;
  const P = principal;
  const B = finalPayment;

  const numerator = P * r * Math.pow(1 + r, n) - B * r;
  const denominator = Math.pow(1 + r, n) - 1;

  if (denominator === 0) {
    return { monthlyPayment: 0, totalInterest: 0 };
  }

  const monthlyPayment = numerator / denominator;
  const calculatedTotalInterest =
    monthlyPayment * months + finalPayment - P;

  return {
    monthlyPayment: Math.round(monthlyPayment),
    totalInterest: Math.round(calculatedTotalInterest),
  };
};

const calculateEffectiveRate = (
  principal,
  monthlyPayment,
  months,
  finalPayment,
) => {
  if (months === 0 || monthlyPayment === 0) return 0;

  let low = 0,
    high = 50;
  const tolerance = 0.01;

  for (let i = 0; i < 100; i++) {
    const rate = (low + high) / 2;
    const monthlyRate = rate / 100 / 12;

    let calculatedPayment;
    if (monthlyRate === 0) {
      calculatedPayment = (principal - finalPayment) / months;
    } else {
      const r = monthlyRate;
      const n = months;
      const P = principal;
      const B = finalPayment;

      const numerator = P * r * Math.pow(1 + r, n) - B * r;
      const denominator = Math.pow(1 + r, n) - 1;
      calculatedPayment = denominator === 0 ? 0 : numerator / denominator;
    }

    if (Math.abs(calculatedPayment - monthlyPayment) < tolerance) {
      return rate;
    }

    if (calculatedPayment > monthlyPayment) {
      high = rate;
    } else {
      low = rate;
    }
  }

  return (low + high) / 2;
};

const createCarData = (config) => ({
  name: config.name || "New Car",
  customName: config.customName || "",
  details: config.details || "",
  carPrice: config.carPrice || 0,
  loanDetails: {
    downPayment: 0,
    months: 48,
    finalPayment: 0,
    monthlyPayment: 0,
    totalInterest: 0,
    effectiveRate: 0,
    ...config.loanDetails,
  },
  fuelType: config.fuelType || "hybrid",
  fuelConsumption: config.fuelConsumption || 6,
  depreciationPercentage: config.depreciationPercentage || [
    18, 14, 13, 12, 11, 11, 10,
  ],
  maintenancePerYear: [3000, 3500, 4000, 4500, 5000, 5500, 6000], // Default values for 7 years
  annualInsurance: config.annualInsurance || 7500,
  registrationCost: config.registrationCost || 0,
  annualTax: config.annualTax || 800,
  extendedWarranty: config.extendedWarranty || 0,
});

const CarComparisonInner = () => {
  const {
    cars,
    globalParams,
    syncStatus,
    setCars,
    addCar,
    updateCar,
    removeCar,
    setGlobalParams,
    importCars,
  } = useLocalState();
  const { user: currentUser, isLoadingUser } = useCurrentUser();

  const {
    activeView,
    lastLoadTime,
    IsLoadingCars,
    showAIResearch,
    setActiveView,
    setLastLoadTime,
    setIsLoadingCars,
    setShowAIResearch,
  } = useMainAppStateStore();
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname(); // Get current path
  // Handle hydration mismatch by ensuring consistent rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const loadCars = useCallback(async () => {
    const now = Date.now();
    if (now - lastLoadTime < 30000) {
      setIsLoadingCars(false);
      return;
    }

    setIsLoadingCars(true);
    let userCars = [];

    try {
      // If user is logged in, try to load from backend
      if (currentUser) {
        userCars = await CarEntity.filter({
          created_by: currentUser.email,
        });

        if (!Array.isArray(userCars)) {
          userCars = [];
        }

        if (userCars.length === 0) {
          const carsToCreate = defaultCarsForNewUsers.map((config) => {
            const car = createCarData(config);
            const principal = car.carPrice - car.loanDetails.downPayment;
            const totalPaid =
              car.loanDetails.monthlyPayment * car.loanDetails.months +
              car.loanDetails.finalPayment;
            car.loanDetails.totalInterest = totalPaid - principal;

            if (principal > 0 && car.loanDetails.monthlyPayment > 0) {
              car.loanDetails.effectiveRate = calculateEffectiveRate(
                principal,
                car.loanDetails.monthlyPayment,
                car.loanDetails.months,
                car.loanDetails.finalPayment,
              );
            } else {
              car.loanDetails.effectiveRate = 0;
            }
            return car;
          });

          for (let i = 0; i < carsToCreate.length; i++) {
            try {
              const newCar = await CarEntity.create(carsToCreate[i]);
              userCars.push(newCar);

              if (i < carsToCreate.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
            } catch (error) {
              console.error(`Failed to create car ${i}:`, error);
              const tempCar = {
                ...carsToCreate[i],
                id: `temp-${Date.now()}-${i}`,
              };
              userCars.push(tempCar);
            }
          }
        }
      } else {
        // Anonymous user - load from localStorage or use default cars
        const cachedState = localStorage.getItem("nextjsv1_local_state");
        if (cachedState) {
          try {
            const parsedState = JSON.parse(cachedState);
            if (
              parsedState.cars &&
              Array.isArray(parsedState.cars) &&
              parsedState.cars.length > 0
            ) {
              userCars = parsedState.cars;
            } else {
              // No cached cars, create default cars locally
              userCars = defaultCarsForNewUsers.map((config) => {
                const car = createCarData(config);
                const principal =
                  car.carPrice - car.loanDetails.downPayment;
                const totalPaid =
                  car.loanDetails.monthlyPayment * car.loanDetails.months +
                  car.loanDetails.finalPayment;
                car.loanDetails.totalInterest = totalPaid - principal;

                if (principal > 0 && car.loanDetails.monthlyPayment > 0) {
                  car.loanDetails.effectiveRate = calculateEffectiveRate(
                    principal,
                    car.loanDetails.monthlyPayment,
                    car.loanDetails.months,
                    car.loanDetails.finalPayment,
                  );
                } else {
                  car.loanDetails.effectiveRate = 0;
                }
                return {
                  ...car,
                  id: `temp-${Date.now()}-${Math.random()}`,
                };
              });
            }
          } catch (parseError) {
            console.error("Failed to parse cached state:", parseError);
            // Create default cars as fallback
            userCars = defaultCarsForNewUsers.map((config) => {
              const car = createCarData(config);
              const principal = car.carPrice - car.loanDetails.downPayment;
              const totalPaid =
                car.loanDetails.monthlyPayment * car.loanDetails.months +
                car.loanDetails.finalPayment;
              car.loanDetails.totalInterest = totalPaid - principal;

              if (principal > 0 && car.loanDetails.monthlyPayment > 0) {
                car.loanDetails.effectiveRate = calculateEffectiveRate(
                  principal,
                  car.loanDetails.monthlyPayment,
                  car.loanDetails.months,
                  car.loanDetails.finalPayment,
                );
              } else {
                car.loanDetails.effectiveRate = 0;
              }
              return { ...car, id: `temp-${Date.now()}-${Math.random()}` };
            });
          }
        } else {
          // No cached data, create default cars for anonymous user
          userCars = defaultCarsForNewUsers.map((config) => {
            const car = createCarData(config);
            const principal = car.carPrice - car.loanDetails.downPayment;
            const totalPaid =
              car.loanDetails.monthlyPayment * car.loanDetails.months +
              car.loanDetails.finalPayment;
            car.loanDetails.totalInterest = totalPaid - principal;

            if (principal > 0 && car.loanDetails.monthlyPayment > 0) {
              car.loanDetails.effectiveRate = calculateEffectiveRate(
                principal,
                car.loanDetails.monthlyPayment,
                car.loanDetails.months,
                car.loanDetails.finalPayment,
              );
            } else {
              car.loanDetails.effectiveRate = 0;
            }
            return { ...car, id: `temp-${Date.now()}-${Math.random()}` };
          });
        }
      }

      setCars(userCars);
      setLastLoadTime(now);
    } catch (error) {
      console.error("Failed to load cars:", error);
      // Fallback to localStorage
      const cachedState = localStorage.getItem("nextjsv1_local_state");
      if (cachedState) {
        try {
          const parsedState = JSON.parse(cachedState);
          if (
            parsedState.cars &&
            Array.isArray(parsedState.cars) &&
            parsedState.cars.length > 0
          ) {
            setCars(parsedState.cars);
          }
        } catch (parseError) {
          console.error("Failed to parse cached state:", parseError);
        }
      }
    } finally {
      setIsLoadingCars(false);
    }
  }, [setCars, currentUser, lastLoadTime]);

  useEffect(() => {
    // Load cars for both authenticated and anonymous users
    loadCars();
  }, [loadCars, currentUser]);

  // Enhanced setActiveView that also closes AI research
  const handleSetActiveView = useCallback(
    (view) => {
      setActiveView(view);
      // Always close AI research when navigating to a different view
      if (showAIResearch) {
        setShowAIResearch(false);
      }
    },
    [showAIResearch], // setActiveView, setShowAIResearch],
  );

  const reorderCars = useCallback(
    async (newCarsOrder) => {
      // Update local state immediately for responsive UI
      setCars(newCarsOrder);

      // Optional: Persist the order to backend if needed
      // This could be done by adding an 'order' field to each car entity
      // For now, the order is maintained in local state and localStorage
    },
    [setCars],
  );

  const duplicateCar = useCallback(
    async (originalCar) => {
      const duplicatedCarData = {
        ...originalCar,
        name: `${originalCar.name} (Copy)`,
        customName: originalCar.customName
          ? `${originalCar.customName} (Copy)`
          : "",
        details: originalCar.details || "",
        // Remove the ID so it gets a new one
        id: undefined,
        created_date: undefined,
        updated_date: undefined,
        created_by: undefined,
      };

      // Create temporary car for immediate UI feedback
      const tempCar = { ...duplicatedCarData, id: `temp-${Date.now()}` };
      addCar(tempCar);
      handleSetActiveView(tempCar.id);

      try {
        const newCar = await CarEntity.create(duplicatedCarData);
        updateCar(tempCar.id, { ...newCar, id: newCar.id });
      } catch (error) {
        console.error("Failed to duplicate car:", error);
        if (
          error.message &&
          (error.message.includes("429") ||
            error.message.includes("Rate limit"))
        ) {
          console.warn(
            "Rate limited - car saved locally and will sync when possible",
          );
        }
      }
    },
    [addCar, updateCar, handleSetActiveView],
  );

  const handleRemoveCarFromSidebar = useCallback(
    async (carId) => {
      try {
        await CarEntity.delete(carId);
        removeCar(carId);
        // If we're currently viewing the deleted car, switch to overview
        if (activeView === carId) {
          handleSetActiveView("overview");
        }
      } catch (error) {
        console.error("Failed to remove car:", error);
        removeCar(carId);
        if (activeView === carId) {
          handleSetActiveView("overview");
        }
      }
    },
    [removeCar, activeView, handleSetActiveView],
  );

  const updateCarData = useCallback(
    async (carId, updatedCarData) => {
      updateCar(carId, updatedCarData);

      if (navigator.onLine) {
        try {
          setTimeout(async () => {
            try {
              const {
                id,
                created_date,
                updated_date,
                created_by,
                ...saveData
              } = updatedCarData;
              await CarEntity.update(carId, saveData);
            } catch (e) {
              if (
                e.message &&
                (e.message.includes("429") ||
                  e.message.includes("Rate limit"))
              ) {
                console.warn(
                  "Rate limited - data saved locally and will sync later",
                );
              } else {
                console.error("Failed to save car data:", e);
              }
            }
          }, 2000);
        } catch (error) {
          console.error("Update error:", error);
        }
      }
    },
    [updateCar],
  );

  const addNewCar = useCallback(async () => {
    const newCarData = createCarData({
      name: `Car Deal ${cars.length + 1}`,
      customName: "",
      details: "",
      carPrice: 160_000,
      loanDetails: {
        downPayment: 32_000,
        months: 48,
        monthlyPayment: 3100,
        finalPayment: 0,
      },
    });

    const principal =
      newCarData.carPrice - newCarData.loanDetails.downPayment;
    const totalPaid =
      newCarData.loanDetails.monthlyPayment *
        newCarData.loanDetails.months +
      newCarData.loanDetails.finalPayment;
    newCarData.loanDetails.totalInterest = totalPaid - principal;

    if (principal > 0 && newCarData.loanDetails.monthlyPayment > 0) {
      newCarData.loanDetails.effectiveRate = calculateEffectiveRate(
        principal,
        newCarData.loanDetails.monthlyPayment,
        newCarData.loanDetails.months,
        newCarData.loanDetails.finalPayment,
      );
    } else {
      newCarData.loanDetails.effectiveRate = 0;
    }

    const tempCar = { ...newCarData, id: `temp-${Date.now()}` };
    addCar(tempCar);

    try {
      const newCar = await CarEntity.create(newCarData);
      handleSetActiveView(newCar.id);
      updateCar(tempCar.id, { ...newCar, id: newCar.id });
    } catch (error) {
      console.error("Failed to create car:", error);
      if (
        error.message &&
        (error.message.includes("429") ||
          error.message.includes("Rate limit"))
      ) {
        console.warn(
          "Rate limited - car saved locally and will sync when possible",
        );
      }
    }
  }, [cars, addCar, updateCar, handleSetActiveView]);

  const handleAICarFound = useCallback(
    async (carData) => {
      try {
        const newCar = await CarEntity.create(carData);
        addCar(newCar);
        handleSetActiveView(newCar.id);
        setShowAIResearch(false);
      } catch (error) {
        console.error("Failed to create AI car:", error);
        const tempCar = { ...carData, id: `temp-${Date.now()}` };
        addCar(tempCar);
        handleSetActiveView(tempCar.id);
        setShowAIResearch(false);
      }
    },
    [addCar, handleSetActiveView],
  );

  // Original handleRemoveCar used by CarDataEditor
  const handleRemoveCar = useCallback(
    async (carId) => {
      try {
        await CarEntity.delete(carId);
        removeCar(carId);
        handleSetActiveView("overview");
      } catch (error) {
        console.error("Failed to remove car:", error);
        removeCar(carId);
        handleSetActiveView("overview");
      }
    },
    [removeCar, handleSetActiveView],
  );

  const calculateNetWorth = useCallback(
    (car, years, isAdvancedMode = false) => {
      if (!car) return {};
      /*  8 Sep 2025 - Note  
      we've zeroed out the 
      - inflationMultiplier [ They caused too much noise in the results, and wasn't significant enough to justify the noise]
      - extendedWarranty [ works only on the first 3 years, and is confusing ]
      - registrationCost [ one time which is negligible and distracts the user ]
      */
      // Parse registration cost - zero it out if not in advanced mode
      const registrationCost = isAdvancedMode
        ? parseFloat(car.registrationCost) || 0
        : 0;

      let remainingInvestment =
        globalParams.initialInvestment -
        car.loanDetails.downPayment -
        registrationCost;
      let carValue = car.carPrice;
      let totalCashOutflow =
        car.loanDetails.downPayment + registrationCost;
      let annualFuelCost = 0;
      if (car.fuelType === "electric") {
        annualFuelCost =
          (globalParams.annualKm / 100) *
          car.fuelConsumption *
          globalParams.electricityPrice;
      } else {
        annualFuelCost =
          (globalParams.annualKm / 100) *
          car.fuelConsumption *
          globalParams.gasPrice;
      }
      for (let year = 1; year <= years; year++) {
        remainingInvestment *= 1 + globalParams.stockMarketReturn / 100;
        const depRate =
          car.depreciationPercentage[year - 1] ||
          car.depreciationPercentage[
            car.depreciationPercentage.length - 1
          ];
        carValue *= 1 - depRate / 100;

        // Apply inflation only in advanced mode
        const inflationMultiplier = isAdvancedMode
          ? Math.pow(1 + globalParams.inflationRate / 100, year - 1)
          : 1;

        let annualCosts = 0;
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

        // Apply extended warranty only in advanced mode
        if (isAdvancedMode && year <= 3 && car.extendedWarranty > 0) {
          annualCosts += car.extendedWarranty / 3;
        }

        remainingInvestment -= annualCosts;
        totalCashOutflow += annualCosts;
      }
      return {
        investmentValue: remainingInvestment,
        carValue: carValue,
        totalNetWorth: remainingInvestment + carValue,
        totalCashOutflow: totalCashOutflow,
        annualFuelCost: annualFuelCost,
        totalCostOfOwnership: totalCashOutflow - carValue,
      };
    },
    [globalParams],
  );

  const calculateNoCarNetWorth = useCallback(
    (years) => {
      let investment = globalParams.initialInvestment;
      for (let i = 0; i < years; i++) {
        investment *= 1 + globalParams.stockMarketReturn / 100;
      }
      return investment;
    },
    [globalParams],
  );

  const formatCurrency = useCallback((value) => {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

  const results = useMemo(() => {
    const carsArray = Array.isArray(cars) ? cars : [];
    return {
      noCar: {
        1: calculateNoCarNetWorth(1),
        3: calculateNoCarNetWorth(3),
        5: calculateNoCarNetWorth(5),
        7: calculateNoCarNetWorth(7),
      },
      cars: carsArray.reduce((acc, car) => {
        if (car && car.id) {
          acc[car.id] = {
            1: calculateNetWorth(car, 1),
            3: calculateNetWorth(car, 3),
            5: calculateNetWorth(car, 5),
            7: calculateNetWorth(car, 7),
          };
        }
        return acc;
      }, {}),
    };
  }, [cars, globalParams, calculateNoCarNetWorth, calculateNetWorth]);

  const findBestWorst = useCallback(
    (years) => {
      const carsArray = Array.isArray(cars) ? cars : [];
      const carResults = carsArray
        .filter((car) => car && car.id && results.cars[car.id])
        .map((car) => ({
          name: car.name || "Unknown Car",
          netWorth: results.cars[car.id]?.[years]?.totalNetWorth || 0,
          costOfOwnership:
            results.cars[car.id]?.[years]?.totalCostOfOwnership || 0,
        }));

      if (carResults.length === 0) {
        return {
          best: { netWorth: 0, name: "N/A" },
          worst: { netWorth: 0, name: "N/A" },
        };
      }
      carResults.sort((a, b) => b.netWorth - a.netWorth);
      return {
        best: carResults[0],
        worst: carResults[carResults.length - 1],
      };
    },
    [results, cars],
  );

  // Memoize the navigation callback
  const handleLogin = useCallback(() => {
    const returnUrl = encodeURIComponent(pathname);
    router.push(`/login?returnUrl=${returnUrl}`);
  }, [pathname, router]);

  // Memoize the login prompt render output
  const loginPrompt = useMemo(
    () => (
      <div className="flex h-screen flex-col items-center justify-center">
        <h3>Please log in</h3>
        <Button onClick={handleLogin}>Login</Button>
      </div>
    ),
    [handleLogin],
  );

  // Show loading state until mounted
  if (!isMounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="text-info h-12 w-12 animate-spin" />
        <span className="text-muted-foreground ml-3 text-lg">
          Loading your car comparison...
        </span>
      </div>
    );
  }

  const MainContent = () => {
    if (IsLoadingCars) {
      return (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="text-info h-12 w-12 animate-spin" />
        </div>
      );
    }

    if (showAIResearch) {
      return (
        <AICarResearch
          onCarFound={handleAICarFound}
          onCancel={() => setShowAIResearch(false)}
        />
      );
    }

    if (activeView === "profile") {
      // Profile requires authentication
      if (!currentUser) {
        return loginPrompt;
      }
      return (
        <UnifiedProfileSection
          globalParams={globalParams}
          setGlobalParams={setGlobalParams}
          onClose={() => handleSetActiveView("overview")}
        />
      );
    }

    if (activeView === "overview") {
      return (
        <div className="space-y-8">
          <div id="summary">
            <ComparisonSummary
              results={results}
              findBestWorst={findBestWorst}
              formatCurrency={formatCurrency}
            />
          </div>
          <div id="charts">
            <NetWorthChart
              results={results}
              formatCurrency={formatCurrency}
              cars={cars}
            />
          </div>
          <div id="analysis">
            <SensitivityAnalysis
              globalParams={globalParams}
              setGlobalParams={setGlobalParams}
              cars={cars}
              calculateNetWorth={(car, years) =>
                calculateNetWorth(car, years)
              }
              calculateNoCarNetWorth={calculateNoCarNetWorth}
              formatCurrency={formatCurrency}
            />
          </div>
        </div>
      );
    }

    const carToEdit = cars.find((c) => c.id === activeView);
    if (carToEdit) {
      return (
        <CarDataEditor
          key={carToEdit.id}
          car={carToEdit}
          updateCarData={updateCarData}
          results={results.cars[carToEdit.id]}
          formatCurrency={formatCurrency}
          removeCar={handleRemoveCar} // Uses the original handleRemoveCar
          calculateEffectiveRate={calculateEffectiveRate}
          globalParams={globalParams}
        />
      );
    }

    return null;
  };

  return (
    <AppLayout
      cars={cars}
      activeView={activeView}
      setActiveView={handleSetActiveView}
      addNewCar={addNewCar}
      showAIResearch={() => setShowAIResearch(true)}
      syncStatus={syncStatus}
      reorderCars={reorderCars}
      duplicateCar={duplicateCar}
      removeCar={handleRemoveCarFromSidebar} // Uses the new handleRemoveCarFromSidebar
      currentUser={currentUser}
      importCars={importCars}
    >
      <MainContent />
    </AppLayout>
  );
};

const CompareClient = () => {
  return (
    <LocalStateProvider>
      <CarComparisonInner />
    </LocalStateProvider>
  );
};

export default CompareClient;
