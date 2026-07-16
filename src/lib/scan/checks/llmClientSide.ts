import type { Check, Finding, ScanContext } from "../types";
import { detectLlmClientUsage } from "../llm";

const KEY = "llm-client-side";
const TITLE = "Client-side LLM calls";

export const llmClientSide: Check = {
  key: KEY,
  title: TITLE,
  requiresOwnership: false,
  async run(ctx: ScanContext): Promise<Finding[]> {
    const text = ctx.html + "\n" + ctx.bundles.map((b) => b.content).join("\n");
    const usage = detectLlmClientUsage(text);
    const findings: Finding[] = [];

    if (usage.dangerouslyAllowBrowser) {
      findings.push({
        checkKey: KEY,
        title: "LLM SDK runs in the browser (dangerouslyAllowBrowser)",
        severity: "critical",
        passed: false,
        detail:
          "Your bundle initializes an LLM SDK with `dangerouslyAllowBrowser` enabled. That flag only works when the API key is shipped to the browser, so anyone can read it and spend on your account.",
        fix: "Remove `dangerouslyAllowBrowser` and move every model call to a server route or edge function. The browser should call your backend, which holds the key.",
      });
    }

    if (usage.hosts.length > 0) {
      const list = usage.hosts.join(", ");
      findings.push({
        checkKey: KEY,
        title: `App appears to call ${list} from the browser`,
        severity: "high",
        passed: false,
        detail: `A provider API host (${list}) is referenced in client code. If the API key is also in the bundle, anyone can call the provider on your budget (denial-of-wallet).`,
        fix: "Proxy every model call through your own server so the provider key never reaches the browser.",
      });
    }

    if (findings.length === 0) {
      return [
        {
          checkKey: KEY,
          title: TITLE,
          severity: "pass",
          passed: true,
          detail: "No direct client-side LLM API calls were detected.",
          fix: "",
        },
      ];
    }
    return findings;
  },
};
