/**
 * EXAMPLE USAGE of the Explanation System
 *
 * This file shows how to use the new explanation components in your NextjsV1 app.
 * You can integrate these components into your existing UI or use them as inspiration.
 */

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// Import the explanation system components
import {
  ResultsWithExplanations,
  InfoTooltip,
  ComparisonInsights,
  calculationExplanations,
} from "./index";

/**
 * Example of using ResultsWithExplanations component
 * Replace this with your actual calculation results
 */
const ExampleResultsDisplay = ({ formatCurrency }) => {
  // Mock calculation results - replace with your actual results
  const sampleResults = {
    totalNetWorth: 580000,
    investmentValue: 420000,
    carValue: 160000,
    totalCashOutflow: 320000,
    totalCostOfOwnership: 160000,
    annualFuelCost: 8500,
    totalInterest: 15000,
    effectiveRate: 4.2,
    principal: 180000,
    monthlyTrueCost: 2667,
  };

  return (
    <div className="space-y-6">
      {/* Example 1: Full Results with Explanations */}
      <ResultsWithExplanations
        results={sampleResults}
        formatCurrency={formatCurrency}
        carName="Tesla Model Y"
        years={5}
        detailLevel="simple"
      />

      {/* Example 2: Comparison Insights */}
      <ComparisonInsights
        bestCar={sampleResults}
        worstCar={{ ...sampleResults, totalNetWorth: 520000 }}
        noCar={600000}
        formatCurrency={formatCurrency}
        years={5}
      />
    </div>
  );
};

/**
 * Example of using InfoTooltip in custom components
 */
const ExampleCustomDisplay = ({ formatCurrency }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Financial Display with Tooltips</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Example of using InfoTooltip in a custom metric display */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="bg-primary/5 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Monthly True Cost</span>
                <InfoTooltip field="monthlyTrueCost" />
              </div>
              <span className="text-xl font-bold">₪2,667</span>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              {calculationExplanations.monthlyTrueCost.simple}
            </p>
          </div>

          <div className="bg-success/5 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Investment Value</span>
                <InfoTooltip field="investmentValue" />
              </div>
              <span className="text-xl font-bold">₪420,000</span>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              {calculationExplanations.investmentValue.simple}
            </p>
          </div>
        </div>

        {/* Example of adding tooltips to table headers */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-secondary">
                <th className="border p-3 text-left">Car</th>
                <th className="border p-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    Net Worth
                    <InfoTooltip field="totalNetWorth" />
                  </div>
                </th>
                <th className="border p-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    True Cost
                    <InfoTooltip field="totalCostOfOwnership" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border p-3">Tesla Model Y</td>
                <td className="border p-3 text-right">₪580,000</td>
                <td className="border p-3 text-right">₪160,000</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Main example component showing different usage patterns
 */
export const ExplanationSystemDemo = () => {
  const [activeTab, setActiveTab] = useState("full");

  // Your existing formatCurrency function
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(amount)
      .replace("ILS", "₪");
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">
          NextjsV1 Explanation System Demo
        </h1>
        <p className="text-muted-foreground">
          Examples of how to use the new explanation components in your
          app.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="full">Full Results Display</TabsTrigger>
          <TabsTrigger value="custom">Custom Components</TabsTrigger>
          <TabsTrigger value="integration">Integration Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="full" className="space-y-6">
          <ExampleResultsDisplay formatCurrency={formatCurrency} />
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <ExampleCustomDisplay formatCurrency={formatCurrency} />
        </TabsContent>

        <TabsContent value="integration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                How to Integrate the Explanation System
              </CardTitle>
            </CardHeader>
            <CardContent className="prose max-w-none">
              <h3>1. Import Components</h3>
              <pre className="bg-muted rounded-lg p-4">
                <code>{`import { 
  ResultsWithExplanations, 
  InfoTooltip, 
  ComparisonInsights,
  calculationExplanations 
} from "./components/explanations";`}</code>
              </pre>

              <h3>2. Use ResultsWithExplanations</h3>
              <p>Replace or enhance your existing results display:</p>
              <pre className="bg-muted rounded-lg p-4">
                <code>{`<ResultsWithExplanations
  results={calculationResults}
  formatCurrency={formatCurrency}
  carName={car.name}
  years={5}
  detailLevel="simple" // or "detailed"
/>`}</code>
              </pre>

              <h3>3. Add InfoTooltips to Existing UI</h3>
              <p>Add contextual help to any financial metric:</p>
              <pre className="bg-muted rounded-lg p-4">
                <code>{`<div className="flex items-center gap-2">
  <span>Net Worth</span>
  <InfoTooltip field="totalNetWorth" />
</div>`}</code>
              </pre>

              <h3>4. Available Explanation Fields</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.keys(calculationExplanations).map((field) => (
                  <div key={field} className="bg-muted/50 rounded p-2">
                    <code>{field}</code>
                  </div>
                ))}
              </div>

              <h3>5. Custom Explanations</h3>
              <p>
                You can extend the explanation system by adding new fields
                to calculationExplanations.js
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExplanationSystemDemo;
