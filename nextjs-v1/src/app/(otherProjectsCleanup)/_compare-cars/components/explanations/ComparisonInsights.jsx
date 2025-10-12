import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, Info, Lightbulb } from "lucide-react";
import { getComparisonInsight } from "./calculationExplanations";

/**
 * Component to display comparison insights between different car options
 * @param {Object} bestCar - Results for the best car option
 * @param {Object} worstCar - Results for the worst car option
 * @param {number} noCar - No car investment value
 * @param {Function} formatCurrency - Currency formatting function
 * @param {number} years - Time period for comparison
 */
export const ComparisonInsights = ({
  bestCar,
  worstCar,
  noCar,
  formatCurrency,
  years = 5,
}) => {
  const bestInsight = getComparisonInsight(
    bestCar,
    worstCar,
    noCar,
    formatCurrency,
  );
  const diff = bestCar.totalNetWorth - worstCar.totalNetWorth;
  const bestVsNoCar = bestCar.totalNetWorth - noCar;
  const worstVsNoCar = worstCar.totalNetWorth - noCar;

  return (
    <Card className="bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="text-primary h-5 w-5" />
          Smart Decision Insights ({years} Years)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main comparison insight */}
        <Alert className="border-primary/20 bg-primary/5">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Key Insight:</strong> {bestInsight.simple}
          </AlertDescription>
        </Alert>

        {/* Detailed breakdown */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Best option vs no car */}
          <div className="from-success/5 to-success/10 rounded-lg border bg-gradient-to-r p-4">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp
                className={`h-4 w-4 ${bestVsNoCar >= 0 ? "text-success" : "text-destructive"}`}
              />
              <span className="font-semibold">Best Choice Impact</span>
            </div>
            <p className="text-muted-foreground text-sm">
              vs. No Car:{" "}
              <span
                className={`font-bold ${bestVsNoCar >= 0 ? "text-success" : "text-destructive"}`}
              >
                {bestVsNoCar >= 0 ? "+" : ""}
                {formatCurrency(bestVsNoCar)}
              </span>
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {bestVsNoCar >= 0
                ? "This car choice actually increases your net worth compared to just investing."
                : "This car costs you money compared to pure investment, but may provide transportation value."}
            </p>
          </div>

          {/* Choice impact */}
          <div className="from-info/5 to-info/10 rounded-lg border bg-gradient-to-r p-4">
            <div className="mb-2 flex items-center gap-2">
              <TrendingDown className="text-info h-4 w-4" />
              <span className="font-semibold">Choice Matters</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Best vs Worst:{" "}
              <span className="text-info font-bold">
                {formatCurrency(diff)}
              </span>
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Choosing the right car can save you this much over {years}{" "}
              years.
            </p>
          </div>
        </div>

        {/* Strategic insights */}
        <div className="bg-muted/30 rounded-lg p-4">
          <h4 className="mb-2 flex items-center gap-2 font-semibold">
            <Info className="h-4 w-4" />
            Strategic Considerations
          </h4>
          <div className="space-y-2 text-sm">
            {bestVsNoCar < 0 && (
              <p className="text-muted-foreground">
                • All car options reduce your net worth vs. pure
                investment. Consider if the transportation value justifies
                the cost.
              </p>
            )}
            {diff > 50000 && (
              <p className="text-muted-foreground">
                • The difference between car choices is significant (
                {formatCurrency(diff)}). Choose carefully.
              </p>
            )}
            {Math.abs(bestVsNoCar) < 20000 && (
              <p className="text-muted-foreground">
                • The best car option is close to break-even with pure
                investment. Good financial choice!
              </p>
            )}
            <p className="text-muted-foreground">
              • Remember to factor in your transportation needs,
              reliability preferences, and lifestyle considerations.
            </p>
          </div>
        </div>

        {/* Detailed explanation */}
        <div className="text-muted-foreground text-sm leading-relaxed">
          {bestInsight.detailed}
        </div>
      </CardContent>
    </Card>
  );
};

export default ComparisonInsights;
