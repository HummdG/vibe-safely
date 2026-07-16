import type { Check, Finding, ScanContext } from "../types";
import { scanForSecrets } from "../secrets";

const KEY = "bundle-secrets";
const TITLE = "Exposed secrets in client code";

export const bundleSecrets: Check = {
  key: KEY,
  title: TITLE,
  requiresOwnership: false,
  async run(ctx: ScanContext): Promise<Finding[]> {
    const text = ctx.html + "\n" + ctx.bundles.map((b) => b.content).join("\n");
    const hits = scanForSecrets(text);

    if (hits.length === 0) {
      return [
        {
          checkKey: KEY,
          title: TITLE,
          severity: "pass",
          passed: true,
          detail:
            "No dangerous secrets (server API keys, service-role keys, private keys) were found in your HTML or JavaScript bundles.",
          fix: "",
        },
      ];
    }

    return hits.map((h) => ({
      checkKey: KEY,
      title: `${h.type} exposed in client bundle`,
      severity: h.severity,
      passed: false,
      detail: `A ${h.type} (\`${h.evidence}\`) is present in code shipped to the browser. Anyone can read it straight from your site's source.`,
      fix: h.fix,
      evidence: h.evidence,
      secretType: h.type,
    }));
  },
};
