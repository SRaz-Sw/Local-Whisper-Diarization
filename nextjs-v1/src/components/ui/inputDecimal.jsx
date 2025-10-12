import React, { useCallback } from "react";
import { Input } from "@/components/ui/input";

const DecimalInput = ({
  defaultValue,
  onValueChange,
  disabled,
  ...props
}) => {
  const handleChange = useCallback(
    (e) => {
      const value = e.target.value;

      // Only update if it's a complete valid number (not ending with decimal point)
      if (value && !value.endsWith(".") && !isNaN(parseFloat(value))) {
        const numValue = parseFloat(value) || 0;
        onValueChange?.(numValue);
      }
    },
    [onValueChange],
  );

  const handleBlur = useCallback(
    (e) => {
      // Always update on blur to catch final value
      const value = e.target.value;
      const numValue = parseFloat(value) || 0;
      onValueChange?.(numValue);
    },
    [onValueChange],
  );

  return (
    <Input
      {...props}
      disabled={disabled}
      defaultValue={defaultValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};

export default DecimalInput;
