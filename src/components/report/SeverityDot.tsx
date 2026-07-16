import type { Severity } from "@/lib/scan/types";
import { SEV } from "./severity";

export function SeverityDot({
  severity,
  className = "h-2 w-2",
}: {
  severity: Severity;
  className?: string;
}) {
  return (
    <span className={`inline-block shrink-0 rounded-full ${SEV[severity].dot} ${className}`} aria-hidden />
  );
}
