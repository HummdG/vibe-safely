import type { Check, Finding, Severity, ScanContext } from "../types";

const KEY = "dependency-scan";
const TITLE = "Vulnerable dependencies";

interface VulnLib {
  fixed: string; // first safe version
  cve: string;
  severity: Severity;
  note: string;
}

// Small curated table, versions detectable from CDN URLs / inline markers.
const KNOWN: Record<string, VulnLib> = {
  jquery: {
    fixed: "3.5.0",
    cve: "CVE-2020-11022",
    severity: "medium",
    note: "jQuery before 3.5 is vulnerable to XSS via HTML manipulation",
  },
  lodash: {
    fixed: "4.17.21",
    cve: "CVE-2021-23337",
    severity: "high",
    note: "lodash before 4.17.21 is vulnerable to prototype pollution / command injection",
  },
  moment: {
    fixed: "2.29.4",
    cve: "CVE-2022-31129",
    severity: "low",
    note: "moment before 2.29.4 has a ReDoS vulnerability",
  },
  axios: {
    fixed: "0.21.2",
    cve: "CVE-2021-3749",
    severity: "medium",
    note: "axios before 0.21.2 has a ReDoS / SSRF issue",
  },
  bootstrap: {
    fixed: "4.3.1",
    cve: "CVE-2019-8331",
    severity: "medium",
    note: "bootstrap before 4.3.1 is vulnerable to XSS",
  },
};

function versionLt(a: string, b: string): boolean {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x < y) return true;
    if (x > y) return false;
  }
  return false;
}

function detectLibs(text: string): { name: string; version: string }[] {
  const found = new Map<string, string>();
  const libs = Object.keys(KNOWN).join("|");
  const patterns = [
    new RegExp(`(?:ajax/libs|npm|packages)/(${libs})[/@](\\d+\\.\\d+\\.\\d+)`, "gi"),
    new RegExp(`(?:unpkg\\.com|jsdelivr|cdnjs)[^"'\\s]*?(${libs})[@/](\\d+\\.\\d+\\.\\d+)`, "gi"),
    new RegExp(`\\b(${libs})[@-](\\d+\\.\\d+\\.\\d+)`, "gi"),
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const name = m[1].toLowerCase();
      if (!found.has(name)) found.set(name, m[2]);
    }
  }
  const jq =
    text.match(/jquery["']?\s*[:=]\s*["'](\d+\.\d+\.\d+)/i) ||
    text.match(/jQuery\.fn\.jquery\s*=\s*["'](\d+\.\d+\.\d+)/);
  if (jq && !found.has("jquery")) found.set("jquery", jq[1]);

  return [...found.entries()].map(([name, version]) => ({ name, version }));
}

export const dependencyScan: Check = {
  key: KEY,
  title: TITLE,
  requiresOwnership: false,
  async run(ctx: ScanContext): Promise<Finding[]> {
    const text = ctx.html + "\n" + ctx.bundles.map((b) => b.url + " " + b.content).join("\n");
    const vulnerable = detectLibs(text).filter(
      (l) => KNOWN[l.name] && versionLt(l.version, KNOWN[l.name].fixed),
    );

    if (vulnerable.length === 0) {
      return [
        {
          checkKey: KEY,
          title: TITLE,
          severity: "pass",
          passed: true,
          detail: "No known-vulnerable library versions were detected in your bundles.",
          fix: "",
        },
      ];
    }
    return vulnerable.map((l) => {
      const k = KNOWN[l.name];
      return {
        checkKey: KEY,
        title: `${l.name} ${l.version} has a known vulnerability`,
        severity: k.severity,
        category: "vulnerability" as const,
        passed: false,
        detail: `${k.note} (${k.cve}). You ship ${l.name} ${l.version}; ${k.fixed} or later fixes it.`,
        fix: `Upgrade ${l.name} to ${k.fixed} or later.`,
        evidence: `${l.name}@${l.version}`,
      };
    });
  },
};
