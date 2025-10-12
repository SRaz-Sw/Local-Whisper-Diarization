import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";

// Create context
const LocalStateContext = createContext(null);

// Initial state
const initialGlobalParams = {
  initialInvestment: 500000,
  stockMarketReturn: 15,
  annualKm: 15000,
  gasPrice: 7.5,
  electricityPrice: 0.63,
  inflationRate: 0,
};

// Default cars for new users
export const defaultCarsForNewUsers = [
  {
    name: "Tesla Model Y Juniper (Balloon)",
    customName: "Tesla Y (Balloon)",
    details: "",
    carPrice: 248_000,
    loanDetails: {
      downPayment: 32647,
      months: 48,
      loanType: "balloon",
      finalPayment: 123819,
      monthlyPayment: 1899,
    },
    fuelType: "electric",
    fuelConsumption: 13.9,
    depreciationPercentage: [18, 15, 12, 10, 10, 10, 10],
    maintenancePerYear: [400, 400, 700, 700, 1300, 2000, 2500],
    annualInsurance: 8500,
    registrationCost: 0,
    annualTax: 0,
    extendedWarranty: 0,
  },
  {
    name: "Tesla Model 3 (Balloon)",
    customName: "Tesla 3 (Balloon)",
    details: "",
    carPrice: 213_816,
    loanDetails: {
      downPayment: 30099,
      months: 48,
      monthlyPayment: 1599,
      loanType: "balloon",
      finalPayment: 140000,
    },
    fuelType: "electric",
    fuelConsumption: 13.5,
    depreciationPercentage: [18, 15, 12, 10, 10, 10, 10],
    maintenancePerYear: [400, 400, 700, 700, 1300, 2000, 2500],
    annualInsurance: 8500,
    registrationCost: 0,
    annualTax: 0,
    extendedWarranty: 0,
  },
  {
    name: "Toyota Corolla Cross (Loan)",
    customName: "Corolla (Loan)",
    details: "",
    carPrice: 182_384,
    loanDetails: {
      downPayment: 36477,
      loanType: "balloon",
      months: 48,
      finalPayment: 65000,
      monthlyPayment: 2500,
    },
    fuelType: "hybrid",
    fuelConsumption: 5.0,
    depreciationPercentage: [13, 11, 10, 8, 8, 8, 8],
    maintenancePerYear: [1200, 1200, 1200, 2500, 3500, 3500, 4000],
    annualInsurance: 7500,
    registrationCost: 0,
    annualTax: 0,
    extendedWarranty: 0,
  },
  {
    name: "Toyota Corolla Cross (Cash)",
    customName: "Corolla (Cash)",
    details: "",
    carPrice: 182_384,
    loanDetails: {
      downPayment: 182_384,
      loanType: "cash",
      months: 0,
      finalPayment: 0,
      monthlyPayment: 0,
    },
    fuelType: "hybrid",
    fuelConsumption: 5.0,
    depreciationPercentage: [13, 11, 10, 8, 8, 8, 8],
    maintenancePerYear: [1200, 1200, 1200, 2500, 3500, 3500, 4000],
    annualInsurance: 7500,
    registrationCost: 0,
    annualTax: 0,
    extendedWarranty: 0,
  },
  {
    name: "Toyota RAV4 Hybrid (Loan)",
    customName: "RAV4 (Loan)",
    details: "",
    carPrice: 212_712,
    loanDetails: {
      downPayment: 46000,
      loanType: "regular",
      months: 48,
      finalPayment: 0,
      monthlyPayment: 3920,
    },
    fuelType: "hybrid",
    fuelConsumption: 6,
    depreciationPercentage: [14, 12, 10, 10, 10, 9, 9],
    maintenancePerYear: [1500, 1500, 1500, 3000, 4000, 4000, 4500],
    annualInsurance: 7500,
    registrationCost: 0,
    annualTax: 0,
    extendedWarranty: 0,
  },
];

// Helper functions
const safeArray = (value) => (Array.isArray(value) ? value : []);
const safeObject = (value, defaultObj = {}) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value
    : defaultObj;

// Process default cars with IDs
const getDefaultCarsWithIds = () => {
  return defaultCarsForNewUsers.map((car, index) => ({
    ...car,
    id: `default-${Date.now()}-${index}`,
  }));
};

// Load from localStorage safely
const loadFromStorage = (key, defaultValue) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

// Save to localStorage safely
const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to save ${key}:`, error);
  }
};

export function LocalStateProvider({ children }) {
  // Initialize state from localStorage
  const [cars, setCarsState] = useState(() => {
    const storedCars = safeArray(loadFromStorage("nextjsv1_cars", []));
    return storedCars.length > 0 ? storedCars : getDefaultCarsWithIds();
  });
  const [globalParams, setGlobalParamsState] = useState(() =>
    safeObject(
      loadFromStorage("nextjsv1_params", initialGlobalParams),
      initialGlobalParams,
    ),
  );
  const [syncStatus, setSyncStatusState] = useState("synced");

  // Wrapped setState functions that also save to localStorage
  const setCars = useCallback((newCars) => {
    const carsArray = safeArray(newCars);
    setCarsState(carsArray);
    saveToStorage("nextjsv1_cars", carsArray);
  }, []);

  const addCar = useCallback((car) => {
    if (!car || !car.id) {
      console.error("Invalid car data provided to addCar");
      return;
    }
    setCarsState((prev) => {
      const prevArray = safeArray(prev);
      const newArray = [...prevArray, car];
      saveToStorage("nextjsv1_cars", newArray);
      return newArray;
    });
  }, []);

  const updateCar = useCallback((id, data) => {
    if (!id || !data) {
      console.error("Invalid parameters provided to updateCar");
      return;
    }
    setCarsState((prev) => {
      console.log("setCarsState: new Data", data);
      const prevArray = safeArray(prev);
      const newArray = prevArray.map((car) =>
        car && car.id === id ? { ...car, ...data } : car,
      );
      saveToStorage("nextjsv1_cars", newArray);
      return newArray;
    });
  }, []);

  const removeCar = useCallback((id) => {
    if (!id) {
      console.error("Invalid id provided to removeCar");
      return;
    }
    setCarsState((prev) => {
      const prevArray = safeArray(prev);
      const newArray = prevArray.filter((car) => car && car.id !== id);
      saveToStorage("nextjsv1_cars", newArray);
      return newArray;
    });
  }, []);

  const setGlobalParams = useCallback((params) => {
    if (!params || typeof params !== "object") {
      console.error("Invalid params provided to setGlobalParams");
      return;
    }
    setGlobalParamsState((prev) => {
      const newParams = {
        ...initialGlobalParams,
        ...safeObject(prev, initialGlobalParams),
        ...params,
      };
      saveToStorage("nextjsv1_params", newParams);
      return newParams;
    });
  }, []);

  const importCars = useCallback((carsToImport) => {
    if (!Array.isArray(carsToImport) || carsToImport.length === 0) {
      console.error("Invalid cars array provided to importCars");
      return;
    }

    // Validate each car has required properties
    const validCars = carsToImport.filter((car) => {
      if (!car || typeof car !== "object") {
        console.warn("Skipping invalid car object:", car);
        return false;
      }

      // Ensure each car has an ID (generate if missing)
      if (!car.id) {
        car.id = `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      return true;
    });

    if (validCars.length === 0) {
      console.error("No valid cars to import");
      return;
    }

    setCarsState((prev) => {
      const prevArray = safeArray(prev);
      const newArray = [...prevArray, ...validCars];
      saveToStorage("nextjsv1_cars", newArray);
      console.log(`Successfully imported ${validCars.length} cars`);
      return newArray;
    });
  }, []);

  const setSyncStatus = useCallback((status) => {
    setSyncStatusState(status || "synced");
  }, []);

  // Context value
  const contextValue = useMemo(
    () => ({
      cars: safeArray(cars),
      globalParams: safeObject(globalParams, initialGlobalParams),
      syncStatus,
      setCars,
      addCar,
      updateCar,
      removeCar,
      setGlobalParams,
      setSyncStatus,
      importCars,
      isLoading: false,
    }),
    [
      cars,
      globalParams,
      syncStatus,
      setCars,
      addCar,
      updateCar,
      removeCar,
      setGlobalParams,
      setSyncStatus,
      importCars,
    ],
  );

  return (
    <LocalStateContext.Provider value={contextValue}>
      {children}
    </LocalStateContext.Provider>
  );
}

export function useLocalState() {
  const context = useContext(LocalStateContext);
  if (!context) {
    throw new Error(
      "useLocalState must be used within a LocalStateProvider",
    );
  }
  return context;
}
