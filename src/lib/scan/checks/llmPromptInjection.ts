import type { Check, Finding, ScanContext } from "../types";
import { discoverChatEndpoints, injectionProbeBodies, INJECTION_CANARY } from "../llm";

const KEY = "llm-prompt-injection";
const TITLE = "Prompt injection";

// Active check: spends the owner's tokens, so it is ownership-gated and the
// total probe count is hard-capped. Benign canary only, never harmful content.
const MAX_REQUESTS = 10;

export const llmPromptInjection: Check = {
  key: KEY,
  title: TITLE,
  requiresOwnership: true,
  async run(ctx: ScanContext): Promise<Finding[]> {
    const text = ctx.html + "\n" + ctx.bundles.map((b) => b.content).join("\n");
    const endpoints = discoverChatEndpoints(text, ctx.origin);

    if (endpoints.length === 0) {
      return [
        {
          checkKey: KEY,
          title: TITLE,
          severity: "pass",
          passed: true,
          applicable: false,
          detail: "No AI chat endpoint was detected in the app, so there was nothing to test.",
          fix: "",
        },
      ];
    }

    const bodies = injectionProbeBodies();
    let requests = 0;

    for (const ep of endpoints) {
      for (const body of bodies) {
        if (requests >= MAX_REQUESTS) break;
        requests++;
        try {
          const res = await ctx.fetchImpl(ep, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          });
          if (res.status < 200 || res.status >= 300) continue;
          const out = await res.text();
          if (!out) continue;

          if (out.includes(INJECTION_CANARY)) {
            const path = ep.replace(ctx.origin, "");
            return [
              {
                checkKey: KEY,
                title: `Chat endpoint ${path} is vulnerable to prompt injection`,
                severity: "high",
                passed: false,
                detail:
                  "A crafted user message overrode the app's instructions and made the model echo our canary token. Untrusted input can hijack the model's behaviour.",
                fix: "Separate system instructions from user content, treat all model input as untrusted, add instruction and output guards, and never let model output trigger privileged actions.",
              },
            ];
          }

          // A real (non-error) response with no echo means this shape works and
          // the model resisted the injection: move on to the next endpoint.
          if (out.length > 20 && !/error|invalid|required|bad request|not found/i.test(out.slice(0, 200))) {
            break;
          }
        } catch {
          /* skip unreachable shape */
        }
      }
    }

    return [
      {
        checkKey: KEY,
        title: "No prompt injection detected",
        severity: "pass",
        passed: true,
        detail: "The detected AI endpoint did not echo an injected instruction.",
        fix: "",
      },
    ];
  },
};
