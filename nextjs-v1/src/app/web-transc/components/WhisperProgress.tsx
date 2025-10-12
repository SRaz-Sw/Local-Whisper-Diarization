import { Progress } from "@/components/ui/progress";
import type { WhisperProgressProps } from "../types";

function formatBytes(size: number): string {
  if (size === 0) return "0 B";
  const i = Math.floor(Math.log(size) / Math.log(1024));
  return (
    (size / Math.pow(1024, i)).toFixed(2) +
    " " +
    ["B", "kB", "MB", "GB", "TB"][i]
  );
}

function formatTimeRemaining(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "Calculating...";
  if (seconds < 60) return `${Math.round(seconds)}s remaining`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s remaining`;
}

export default function WhisperProgress({
  text,
  percentage,
  total,
  estimatedTimeRemaining,
}: WhisperProgressProps & { estimatedTimeRemaining?: number | null }) {
  const displayPercentage = percentage ?? 0;

  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium">{text}</span>
        <span className="font-semibold">
          {displayPercentage.toFixed(0)}%
        </span>
      </div>
      <Progress value={displayPercentage} className="h-2.5" />
      <div className="mt-2 flex justify-between text-xs">
        {estimatedTimeRemaining !== undefined &&
        estimatedTimeRemaining !== null ? (
          <span className="text-muted-foreground">
            {formatTimeRemaining(estimatedTimeRemaining)}
          </span>
        ) : total && !isNaN(total) ? (
          <span className="text-muted-foreground">
            {formatBytes(total)}
          </span>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
