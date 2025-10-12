import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Car } from "lucide-react";
import { InfoTooltip } from "./explanations";

export default function ComparisonSummary({
  results,
  findBestWorst,
  formatCurrency,
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {[3, 5, 7].map((years) => {
        const bestWorst = findBestWorst(years);
        const noCar = results.noCar[years];
        const bestVsNoCar = bestWorst.best.netWorth - noCar;
        const worstVsNoCar = bestWorst.worst.netWorth - noCar;

        return (
          <Card
            key={years}
            className="bg-card/70 hover:bg-card border-none shadow-lg backdrop-blur-sm transition-all duration-300"
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500">
                  <span className="text-sm font-bold text-white">
                    {years}Y
                  </span>
                </div>
                After {years} Years
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* No Car Baseline */}
              <div className="bg-secondary/50 flex items-center justify-between rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="text-secondary-foreground h-4 w-4" />
                  <span className="text-muted-foreground text-sm">
                    No Car (Investment Only)
                  </span>
                  <InfoTooltip field="investmentValue" />
                </div>
                <span className="text-foreground font-bold">
                  {formatCurrency(noCar)}
                </span>
              </div>

              {/* Best Option */}
              <div className="bg-gradient-success-subtle border-success/20 flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="text-success h-4 w-4" />
                    <span className="text-success text-sm font-medium">
                      Best Choice
                    </span>
                    <InfoTooltip field="bestChoice" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-card-foreground font-bold">
                    {formatCurrency(bestWorst.best.netWorth)}
                  </div>
                  <div className="text-success text-xs">
                    {bestWorst.best.name.split(" ").slice(0, 3).join(" ")}
                  </div>
                </div>
              </div>

              {/* Worst Option */}
              <div className="bg-gradient-destructive-subtle border-destructive/20 flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <TrendingDown className="text-destructive h-4 w-4" />
                    <span className="text-destructive text-sm font-medium">
                      Worst Choice
                    </span>
                    <InfoTooltip field="worstChoice" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-secondary-foreground font-bold">
                    {formatCurrency(bestWorst.worst.netWorth)}
                  </div>
                  <div className="text-destructive text-xs">
                    {bestWorst.worst.name.split(" ").slice(0, 3).join(" ")}
                  </div>
                </div>
              </div>

              {/* Impact Analysis */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Best vs No Car:
                  </span>
                  <span
                    className={`font-semibold ${
                      bestVsNoCar < 0 ? "text-destructive" : "text-success"
                    }`}
                  >
                    {formatCurrency(bestVsNoCar)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">
                      Choice Impact:
                    </span>
                    <InfoTooltip field="choiceImpact" />
                  </div>
                  <span className="text-info font-bold">
                    {formatCurrency(
                      bestWorst.best.netWorth - bestWorst.worst.netWorth,
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
