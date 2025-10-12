import React, { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { calculationExplanations } from "./calculationExplanations";

/**
 * Info button component that shows explanations in a popover
 * @param {string} field - The field name to show explanation for
 * @param {string} className - Optional CSS classes
 * @param {boolean} showDetailed - Whether to show detailed explanation
 */
export const InfoTooltip = ({
  field,
  className = "",
  showDetailed = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const explanation = calculationExplanations[field];

  if (!explanation) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`hover:bg-muted/50 h-6 w-6 p-0 ${className}`}
          aria-label={`Information about ${field}`}
        >
          <Info className="text-muted-foreground hover:text-foreground h-4 w-4 transition-colors" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" side="top" align="start">
        <div className="space-y-2">
          <p className="text-foreground leading-tight font-medium">
            {explanation.simple}
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {explanation.detailed}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/**
 * Simple inline explanation component
 * @param {string} fieldName - The field name to show explanation for
 * @param {any} value - The value to display
 * @param {boolean} showDetail - Whether to show detailed explanation
 */
export const FieldExplanation = ({
  fieldName,
  value,
  showDetail = false,
  className = "",
}) => {
  const explanation = calculationExplanations[fieldName];
  if (!explanation) return null;

  return (
    <div className={`explanation-container ${className}`}>
      <div className="flex items-center gap-2">
        <span className="value font-medium">{value}</span>
        <InfoTooltip field={fieldName} />
      </div>
      <p className="text-muted-foreground mt-1 text-sm">
        {showDetail ? explanation.detailed : explanation.simple}
      </p>
    </div>
  );
};

export default InfoTooltip;
