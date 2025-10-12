import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { TrendingUp, BarChart3 } from "lucide-react";
import { InfoTooltip } from "./explanations";

export default function NetWorthChart({ results, formatCurrency, cars }) {
  // Prepare data for the line chart
  const chartData = [
    {
      year: 0,
      "No Car": results.noCar[3] / Math.pow(1.15, 3), // Initial investment
      ...cars.reduce((acc, car) => {
        acc[car.name] = results.noCar[3] / Math.pow(1.15, 3);
        return acc;
      }, {}),
    },
    {
      year: 3,
      "No Car": results.noCar[3],
      ...cars.reduce((acc, car) => {
        acc[car.name] = results.cars[car.id]?.[3]?.totalNetWorth || 0;
        return acc;
      }, {}),
    },
    {
      year: 5,
      "No Car": results.noCar[5],
      ...cars.reduce((acc, car) => {
        acc[car.name] = results.cars[car.id]?.[5]?.totalNetWorth || 0;
        return acc;
      }, {}),
    },
    {
      year: 7,
      "No Car": results.noCar[7],
      ...cars.reduce((acc, car) => {
        acc[car.name] = results.cars[car.id]?.[7]?.totalNetWorth || 0;
        return acc;
      }, {}),
    },
  ];

  // Prepare data for total cost comparison
  const costData = cars.map((car) => ({
    // If car has custom name - use it
    name: car.customName
      ? car.customName.split(" ").slice(0, 3).join(" ")
      : car.name.split(" ").slice(0, 3).join(" "),
    fullName: car.name,
    cost1: results.cars[car.id]?.[1]?.totalCostOfOwnership || 0,
    cost3: results.cars[car.id]?.[3]?.totalCostOfOwnership || 0,
    cost5: results.cars[car.id]?.[5]?.totalCostOfOwnership || 0,
    cost7: results.cars[car.id]?.[7]?.totalCostOfOwnership || 0,
  }));

  // Find the maximum net worth for each time period (excluding "No Car")
  const maxNetWorth3Y = Math.max(
    ...cars.map((car) => results.cars[car.id]?.[3]?.totalNetWorth || 0),
  );
  const maxNetWorth5Y = Math.max(
    ...cars.map((car) => results.cars[car.id]?.[5]?.totalNetWorth || 0),
  );
  const maxNetWorth7Y = Math.max(
    ...cars.map((car) => results.cars[car.id]?.[7]?.totalNetWorth || 0),
  );

  const colors = [
    "#3b82f6",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#06b6d4",
    "#84cc16",
    "#f97316",
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border-border rounded-lg border p-3 shadow-lg">
          <p className="font-semibold">{`Year ${label}`}</p>
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

  return (
    <div className="space-y-6">
      {/* Net Worth Over Time Chart */}
      <Card className="bg-card/60 hover:bg-card backdrop-blur-sm transition-all duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Net Worth Projection Over Time
            <InfoTooltip field="netWorthProjection" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 60, bottom: 70 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="opacity-30"
                />
                <XAxis
                  dataKey="year"
                  className="text-sm"
                  label={{
                    value: "Years",
                    position: "insideBottom",
                    offset: -35,
                  }}
                />
                <YAxis
                  className="text-sm"
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
                  stroke="#6b7280"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ fill: "#6b7280", strokeWidth: 2, r: 4 }}
                />
                {cars.map((car, index) => (
                  <Line
                    key={car.id}
                    type="monotone"
                    dataKey={car.name}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    dot={{
                      fill: colors[index % colors.length],
                      strokeWidth: 2,
                      r: 4,
                    }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Total Cost of Ownership Comparison */}
      <Card className="bg-card/60 hover:bg-card backdrop-blur-sm transition-all duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Total Cost of Ownership
            <InfoTooltip field="totalCostComparison" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={costData}
                margin={{ top: 20, right: 30, left: 60, bottom: 70 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="opacity-30"
                />
                <XAxis
                  dataKey="name"
                  className="text-sm"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  label={{
                    value: "Vehicle",
                    position: "insideBottom",
                    offset: -35,
                  }}
                />
                <YAxis
                  className="text-sm"
                  domain={["dataMin - 5000", "dataMax + 50000"]} // Dynamic with padding
                  tickFormatter={(value) =>
                    `₪${(value / 1000).toFixed(0)}K`
                  }
                  label={{
                    value: "Total Cost (₪)",
                    angle: -90,
                    position: "insideLeft",
                    textAnchor: "middle",
                  }}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatCurrency(value),
                    name,
                  ]}
                  labelFormatter={(label) =>
                    `${costData.find((item) => item.name === label)?.fullName || label}`
                  }
                  contentStyle={{
                    // For OKLCH with opacity, use color-mix or direct alpha
                    backgroundColor:
                      "color-mix(in oklch, var(--popover-foreground), transparent 50%)", // 30% opacity
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    boxShadow: "var(--shadow-md)",
                    color: "var(--popover)",
                    backdropFilter: "blur(4px)",
                  }}
                  labelStyle={{
                    color: "var(--popover)",
                    fontWeight: "500",
                    marginBottom: "4px",
                  }}
                  itemStyle={{
                    color: "var(--popover)",
                  }}
                  cursor={{
                    fill: "var(--muted)",
                    opacity: 0.1,
                  }}
                />
                {/* use the colors from the colors array */}
                <Bar
                  dataKey="cost3"
                  fill="var(--chart-1)"
                  name="3 Years"
                  className="chart-1"
                />
                <Bar
                  dataKey="cost5"
                  fill="var(--chart-3)"
                  name="5 Years"
                  className="chart-2"
                />
                <Bar
                  dataKey="cost7"
                  fill="var(--chart-2)"
                  name="7 Years"
                  className="chart-3"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Comparison Table */}
      <Card className="bg-card/60 hover:bg-card backdrop-blur-sm transition-all duration-200">
        <CardHeader>
          <CardTitle>Detailed Financial Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-secondary hover:bg-secondary/80">
                  <th className="border p-3 text-left">Vehicle</th>
                  <th className="border p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      Purchase Price
                    </div>
                  </th>
                  <th className="border p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      Annual Fuel Cost
                      <InfoTooltip field="annualFuelCost" />
                    </div>
                  </th>
                  <th className="border p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      Net Worth (3Y)
                      <InfoTooltip field="totalNetWorth" />
                    </div>
                  </th>
                  <th className="border p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      Net Worth (5Y)
                      <InfoTooltip field="totalNetWorth" />
                    </div>
                  </th>
                  <th className="border p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      Net Worth (7Y)
                      <InfoTooltip field="totalNetWorth" />
                    </div>
                  </th>
                  <th className="border p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      Total Cost (7Y)
                      <InfoTooltip field="totalCostOfOwnership" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-info/10 font-medium">
                  <td className="border p-3">No Car (Pure Investment)</td>
                  <td className="border p-3 text-right">-</td>
                  <td className="border p-3 text-right">-</td>
                  <td className="border p-3 text-right">
                    {formatCurrency(results.noCar[3])}
                  </td>
                  <td className="border p-3 text-right">
                    {formatCurrency(results.noCar[5])}
                  </td>
                  <td className="border p-3 text-right">
                    {formatCurrency(results.noCar[7])}
                  </td>
                  <td className="border p-3 text-right">-</td>
                </tr>
                {cars.map((car) => {
                  const data = results.cars[car.id];
                  const netWorth3Y = data?.[3]?.totalNetWorth || 0;
                  const netWorth5Y = data?.[5]?.totalNetWorth || 0;
                  const netWorth7Y = data?.[7]?.totalNetWorth || 0;

                  const isTop3Y =
                    netWorth3Y === maxNetWorth3Y && netWorth3Y > 0;
                  const isTop5Y =
                    netWorth5Y === maxNetWorth5Y && netWorth5Y > 0;
                  const isTop7Y =
                    netWorth7Y === maxNetWorth7Y && netWorth7Y > 0;

                  return (
                    <tr key={car.id} className="hover:bg-primary/10">
                      <td className="border p-3 font-medium">
                        {car.name}
                      </td>
                      <td className="border p-3 text-right">
                        {formatCurrency(car.carPrice)}
                      </td>
                      <td className="border p-3 text-right">
                        {formatCurrency(data?.[3]?.annualFuelCost || 0)}
                      </td>
                      <td
                        className={`border p-3 text-right ${
                          isTop3Y
                            ? "bg-green-100 font-bold text-green-800 dark:bg-green-900/30 dark:text-green-200"
                            : ""
                        }`}
                      >
                        {formatCurrency(netWorth3Y)}
                        {isTop3Y && <span className="ml-1 text-xs"></span>}
                      </td>
                      <td
                        className={`border p-3 text-right ${
                          isTop5Y
                            ? "bg-green-100 font-bold text-green-800 dark:bg-green-900/30 dark:text-green-200"
                            : ""
                        }`}
                      >
                        {formatCurrency(netWorth5Y)}
                        {isTop5Y && <span className="ml-1 text-xs"></span>}
                      </td>
                      <td
                        className={`border p-3 text-right ${
                          isTop7Y
                            ? "bg-green-100 font-bold text-green-800 dark:bg-green-900/30 dark:text-green-200"
                            : ""
                        }`}
                      >
                        {formatCurrency(netWorth7Y)}
                        {isTop7Y && <span className="ml-1 text-xs"></span>}
                      </td>
                      <td className="border p-3 text-right">
                        {formatCurrency(
                          data?.[7]?.totalCostOfOwnership || 0,
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
