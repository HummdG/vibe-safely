import type { Check, Finding, ScanContext } from "../types";
import { scanForSystemPrompt } from "../llm";

const KEY = "llm-system-prompt";
const TITLE = "System prompt in client code";

export const llmSystemPrompt: Check = {
  key: KEY,
  title: TITLE,
  requiresOwnership: false,
  async run(ctx: ScanContext): Promise<Finding> {
    const text = ctx.html + "\n" + ctx.bundles.map((b) => b.content).join("\n");
    const result = scanForSystemPrompt(text);

    if (!result.found) {
      return {
        checkKey: KEY,
        title: TITLE,
        severity: "pass",
        passed: true,
        detail: "No system prompt was found in the client bundle.",
        fix: "",
      };
    }

    return {
      checkKey: KEY,
      title: "Your system prompt is shipped to the browser",
      severity: "medium",
      passed: false,
      detail:
        "A system prompt or model-instruction block is present in your client JavaScript. Anyone can read it, copy your prompt, and craft prompt-injection attacks against it.",
      fix: "Keep the system prompt on the server and add it there. Never send it to the client. Escalate to critical if it embeds credentials or business rules.",
      evidence: result.evidence,
    };
  },
};
