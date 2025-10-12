import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Eye, EyeOff } from "lucide-react";
import {
  calculationExplanations,
  getContextualInsights,
} from "./calculationExplanations";
import { InfoTooltip } from "./InfoTooltip";

/**
 * Enhanced display for calculation results with explanations
 * @param {Object} results - Calculation results object
 * @param {Function} formatCurrency - Currency formatting function
 * @param {string} detailLevel - 'simple' or 'detailed' initial view
 * @param {string} carName - Name of the car these results are for
 * @param {number} years - Number of years for the calculation
 */
export const ResultsWithExplanations = ({
  results,
  formatCurrency,
  detailLevel = "simple",
  carName = "Vehicle",
  years = 5,
}) => {
  const [showDetailed, setShowDetailed] = useState(
    detailLevel === "detailed",
  );

  // Get contextual insights
  const insights = getContextualInsights(results, formatCurrency);

  return (
    <Card className="bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="text-primary h-5 w-5" />
            <span>Financial Impact Analysis - {carName}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetailed(!showDetailed)}
            className="gap-2"
          >
            {showDetailed ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {showDetailed ? "Simple View" : "Detailed View"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contextual Insights */}
        {insights.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-muted-foreground text-sm font-semibold">
              Key Insights
            </h4>
            {insights.map((insight, index) => (
              <Alert
                key={index}
                className={`${
                  insight.type === "success"
                    ? "border-success/20 bg-success/5"
                    : insight.type === "warning"
                      ? "border-warning/20 bg-warning/5"
                      : "border-info/20 bg-info/5"
                }`}
              >
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>{insight.title}:</strong> {insight.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Total Net Worth - The main metric */}
        <div className="bg-primary/5 border-primary/20 rounded-lg border-2 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-primary text-lg font-bold">
                Total Net Worth
              </span>
              <InfoTooltip field="totalNetWorth" />
            </div>
            <span className="text-primary text-xl font-bold">
              {formatCurrency(results.totalNetWorth)}
            </span>
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            {showDetailed
              ? calculationExplanations.totalNetWorth.detailed
              : calculationExplanations.totalNetWorth.simple}
          </p>
        </div>

        {/* Component breakdown */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h4 className="flex items-center gap-2 font-semibold">
              Assets
              <div className="bg-border h-px flex-1"></div>
            </h4>

            <div className="space-y-4 pl-2">
              {/* Investment Value */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Investment Value</span>
                    <InfoTooltip field="investmentValue" />
                  </div>
                  <span className="text-success font-bold">
                    {formatCurrency(results.investmentValue)}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {showDetailed
                    ? calculationExplanations.investmentValue.detailed
                    : calculationExplanations.investmentValue.simple}
                </p>
              </div>

              {/* Car Value */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Car Value</span>
                    <InfoTooltip field="carValue" />
                  </div>
                  <span className="font-bold text-blue-600">
                    {formatCurrency(results.carValue)}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {showDetailed
                    ? calculationExplanations.carValue.detailed
                    : calculationExplanations.carValue.simple}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="flex items-center gap-2 font-semibold">
              Costs & Impact
              <div className="bg-border h-px flex-1"></div>
            </h4>

            <div className="space-y-4 pl-2">
              {/* Total Cash Outflow */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Total Spent</span>
                    <InfoTooltip field="totalCashOutflow" />
                  </div>
                  <span className="text-destructive font-bold">
                    {formatCurrency(results.totalCashOutflow)}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {showDetailed
                    ? calculationExplanations.totalCashOutflow.detailed
                    : calculationExplanations.totalCashOutflow.simple}
                </p>
              </div>

              {/* Total Cost of Ownership */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">True Cost</span>
                    <InfoTooltip field="totalCostOfOwnership" />
                  </div>
                  <span className="font-bold text-orange-600">
                    {formatCurrency(results.totalCostOfOwnership)}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {showDetailed
                    ? calculationExplanations.totalCostOfOwnership.detailed
                    : calculationExplanations.totalCostOfOwnership.simple}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Financial Details */}
        {showDetailed && (
          <div className="space-y-4">
            <h4 className="flex items-center gap-2 font-semibold">
              Financial Details
              <div className="bg-border h-px flex-1"></div>
            </h4>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Annual Fuel Cost */}
              {results.annualFuelCost && (
                <div className="bg-muted/30 flex items-center justify-between rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      Annual Fuel Cost
                    </span>
                    <InfoTooltip field="annualFuelCost" />
                  </div>
                  <span className="font-semibold">
                    {formatCurrency(results.annualFuelCost)}
                  </span>
                </div>
              )}

              {/* Total Interest */}
              {results.totalInterest !== undefined && (
                <div className="bg-muted/30 flex items-center justify-between rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {results.totalInterest < 0
                        ? "Financing Savings"
                        : "Total Interest"}
                    </span>
                    <InfoTooltip field="totalInterest" />
                  </div>
                  <span
                    className={`font-semibold ${
                      results.totalInterest < 0
                        ? "text-success"
                        : "text-destructive"
                    }`}
                  >
                    {formatCurrency(results.totalInterest)}
                  </span>
                </div>
              )}

              {/* Effective Rate */}
              {results.effectiveRate !== undefined && (
                <div className="bg-muted/30 flex items-center justify-between rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      Effective Interest Rate
                    </span>
                    <InfoTooltip field="effectiveRate" />
                  </div>
                  <span className="font-semibold">
                    {results.effectiveRate.toFixed(2)}%
                  </span>
                </div>
              )}

              {/* Principal */}
              {results.principal !== undefined && (
                <div className="bg-muted/30 flex items-center justify-between rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      Loan Principal
                    </span>
                    <InfoTooltip field="principal" />
                  </div>
                  <span className="font-semibold">
                    {formatCurrency(results.principal)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Monthly perspective */}
        <div className="from-muted/20 to-muted/30 rounded-lg border bg-gradient-to-r p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Monthly True Cost</span>
              <InfoTooltip field="monthlyTrueCost" />
            </div>
            <span className="text-primary text-xl font-bold">
              {formatCurrency(results.totalCostOfOwnership / (years * 12))}
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            {showDetailed
              ? "The real monthly cost when you factor in everything - depreciation, interest, fuel, insurance, and maintenance - then subtract what you'll get back when selling. This is what the car truly costs you each month, not just the loan payment."
              : "What you really pay per month when counting everything"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResultsWithExplanations;
