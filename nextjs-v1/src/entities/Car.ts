// Car entity class for frontend CRUD operations
import apiService from "@/lib/api";

export interface CarLoanDetails {
  loanType?: string;
  downPayment: number;
  months: number;
  finalPayment: number;
  monthlyPayment: number;
  totalInterest: number;
  effectiveRate: number;
}

export interface CarData {
  id?: string;
  name: string;
  customName?: string;
  details?: string;
  carPrice: number;
  loanDetails: CarLoanDetails;
  fuelType: "gasoline" | "hybrid" | "electric" | "diesel";
  fuelConsumption: number;
  depreciationPercentage: number[];
  maintenancePerYear: number[];
  annualInsurance: number;
  registrationCost: number;
  annualTax: number;
  extendedWarranty: number;
  yad2Data?: {
    manufacturerId?: number;
    manufacturerName?: string;
    manufacturerNameHebrew?: string;
    modelBaseName?: string;
    fullModelName?: string;
  };
  created_by?: string;
  created_date?: string;
  updated_date?: string;
}

export class Car {
  static async create(carData: Omit<CarData, "id">): Promise<CarData> {
    try {
      // For now, simulate API call with localStorage until backend is ready
      const cars = JSON.parse(
        localStorage.getItem("nextjsv1_cars") || "[]",
      );
      const newCar: CarData = {
        ...carData,
        id: `car-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      };

      cars.push(newCar);
      localStorage.setItem("nextjsv1_cars", JSON.stringify(cars));

      return newCar;
    } catch (error) {
      console.error("Failed to create car:", error);
      throw error;
    }
  }

  static async filter(filters: {
    created_by?: string;
  }): Promise<CarData[]> {
    try {
      // For now, simulate API call with localStorage until backend is ready
      const cars = JSON.parse(
        localStorage.getItem("nextjsv1_cars") || "[]",
      );

      if (filters.created_by) {
        return cars.filter(
          (car: CarData) => car.created_by === filters.created_by,
        );
      }

      return cars;
    } catch (error) {
      console.error("Failed to filter cars:", error);
      return [];
    }
  }

  static async update(
    id: string,
    carData: Partial<CarData>,
  ): Promise<CarData> {
    try {
      // For now, simulate API call with localStorage until backend is ready
      const cars = JSON.parse(
        localStorage.getItem("nextjsv1_cars") || "[]",
      );
      const carIndex = cars.findIndex((car: CarData) => car.id === id);

      if (carIndex === -1) {
        throw new Error("Car not found");
      }

      const updatedCar = {
        ...cars[carIndex],
        ...carData,
        updated_date: new Date().toISOString(),
      };

      cars[carIndex] = updatedCar;
      localStorage.setItem("nextjsv1_cars", JSON.stringify(cars));

      return updatedCar;
    } catch (error) {
      console.error("Failed to update car:", error);
      throw error;
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      // For now, simulate API call with localStorage until backend is ready
      const cars = JSON.parse(
        localStorage.getItem("nextjsv1_cars") || "[]",
      );
      const filteredCars = cars.filter((car: CarData) => car.id !== id);
      localStorage.setItem("nextjsv1_cars", JSON.stringify(filteredCars));
    } catch (error) {
      console.error("Failed to delete car:", error);
      throw error;
    }
  }

  static async findById(id: string): Promise<CarData | null> {
    try {
      // For now, simulate API call with localStorage until backend is ready
      const cars = JSON.parse(
        localStorage.getItem("nextjsv1_cars") || "[]",
      );
      const car = cars.find((car: CarData) => car.id === id);
      return car || null;
    } catch (error) {
      console.error("Failed to find car by id:", error);
      return null;
    }
  }

  static async findAll(): Promise<CarData[]> {
    try {
      // For now, simulate API call with localStorage until backend is ready
      const cars = JSON.parse(
        localStorage.getItem("nextjsv1_cars") || "[]",
      );
      return cars;
    } catch (error) {
      console.error("Failed to find all cars:", error);
      return [];
    }
  }
}
