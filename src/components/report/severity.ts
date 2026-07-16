import type { Severity } from "@/lib/scan/types";

export type Fail = Exclude<Severity, "pass">;

export const SEV_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  pass: "Pass",
};

// Class fragments per severity, built on the design tokens. Full literal strings so
// Tailwind's source scanner emits every utility. This replaces the old 5×3 meta map.
export const SEV: Record<
  Severity,
  { text: string; border: string; bg: string; dot: string }
> = {
  critical: { text: "text-critical", border: "border-critical/40", bg: "bg-critical/10", dot: "bg-critical" },
  high: { text: "text-high", border: "border-high/40", bg: "bg-high/10", dot: "bg-high" },
  medium: { text: "text-medium", border: "border-medium/40", bg: "bg-medium/10", dot: "bg-medium" },
  low: { text: "text-low", border: "border-low/30", bg: "bg-low/10", dot: "bg-low" },
  pass: { text: "text-pass", border: "border-pass/40", bg: "bg-pass/10", dot: "bg-pass" },
};

export const RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, pass: 4 };
export const ORDER: Fail[] = ["critical", "high", "medium", "low"];

// A letter grade shares the severity palette so the whole report speaks one language.
export function gradeToSeverity(grade: string): Severity {
  if (grade === "A" || grade === "B") return "pass";
  if (grade === "C") return "medium";
  if (grade === "D") return "high";
  return "critical";
}
