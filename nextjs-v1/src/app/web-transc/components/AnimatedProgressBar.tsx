"use client";

import { motion } from "framer-motion";

export interface AnimatedProgressBarProps {
  value: number; // 0-100
  label?: string;
  color?: string;
  className?: string;
  barClassName?: string;
  labelClassName?: string;
}

const SPRING = {
  type: "spring" as const,
  damping: 10,
  mass: 0.75,
  stiffness: 100,
};

export default function AnimatedProgressBar({
  value,
  label,
  color = "#6366f1",
  className = "",
  barClassName = "",
  labelClassName = "",
}: AnimatedProgressBarProps) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className={`mb-1 text-sm font-medium ${labelClassName}`}>
          {label}
        </div>
      )}
      <div className="relative h-3 w-full overflow-hidden rounded border bg-background">
        <motion.div
          className={`h-full rounded bg-background ${barClassName}`}
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
          transition={SPRING}
        />
      </div>
    </div>
  );
}
