import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { runScan, gateResult, UnreachableTargetError } from "@vibesafely/scan-core";
import { decideMcpScan, ensureScheme, formatReport } from "./scan";
import { reserve, refund, me } from "./api";

const API_URL = (process.env.VIBESAFELY_API_URL || "https://vibesafely.app").replace(/\/+$/, "");
const API_KEY = process.env.VIBESAFELY_API_KEY?.trim() || "";

type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

function text(body: string): ToolResult {
  return { content: [{ type: "text", text: body }] };
}
function fail(body: string): ToolResult {
  return { content: [{ type: "text", text: body }], isError: true };
}
function scanError(e: unknown): ToolResult {
  if (e instanceof UnreachableTargetError) return fail(e.message);
  return fail(e instanceof Error ? e.message : "Scan failed.");
}

const server = new McpServer({ name: "vibesafely", version: "0.1.0" });

server.registerTool(
  "scan_app",
  {
    title: "Scan an app for security issues",
    description:
      "Run a VibeSafely security scan on a URL — works on localhost / pre-deployment apps too. " +
      "mode 'surface' (default) returns a free locked report (issues by name + grade). " +
      "mode 'full' runs the deep checks (Supabase/Firebase/AI probes) and unlocks every fix; " +
      "it requires VIBESAFELY_API_KEY and spends 1 credit (unlimited while subscribed).",
    inputSchema: {
      url: z.string().describe("The app URL to scan, e.g. http://localhost:3000 or https://myapp.com"),
      mode: z.enum(["surface", "full"]).optional().describe("Scan depth. Defaults to 'surface'."),
    },
  },
  async ({ url, mode }): Promise<ToolResult> => {
    const target = ensureScheme(url);
    const { tier, note } = decideMcpScan({ mode, hasApiKey: Boolean(API_KEY) });

    // Surface (free, local, no metering).
    if (tier === "surface") {
      try {
        const result = await runScan({ url: target, ownerConfirmed: false });
        return text(formatReport(gateResult(result, "free"), { note }));
      } catch (e) {
        return scanError(e);
      }
    }

    // Full: reserve a credit against the hosted API, then run locally.
    const reserved = await reserve(API_URL, API_KEY, target);
    if (!reserved.ok) {
      if (reserved.status === 401) return fail("Your VIBESAFELY_API_KEY is invalid or revoked.");
      if (reserved.status === 402)
        return fail(`You're out of full-scan credits. Buy more at ${API_URL}/pricing`);
      return fail(`Could not authorize the full scan (${reserved.status}): ${reserved.error}`);
    }

    try {
      const result = await runScan({ url: target, ownerConfirmed: true });
      const footer = reserved.data.subscribed
        ? "Plan: unlimited full scans."
        : `Full-scan credits left: ${reserved.data.remainingCredits}.`;
      return text(formatReport(gateResult(result, "pro"), { footer }));
    } catch (e) {
      // The scan produced nothing — hand the credit back.
      await refund(API_URL, API_KEY);
      return scanError(e);
    }
  },
);

server.registerTool(
  "check_credits",
  {
    title: "Check VibeSafely credits",
    description: "Report how many full-scan credits your API key has left.",
    inputSchema: {},
  },
  async (): Promise<ToolResult> => {
    if (!API_KEY) return fail("No VIBESAFELY_API_KEY set. Add one from your VibeSafely account.");
    const info = await me(API_URL, API_KEY);
    if (!info) return fail("Could not read your account — the API key may be invalid or revoked.");
    return text(
      info.subscribed
        ? "Unlimited full scans (subscribed)."
        : `${info.credits} full-scan credit${info.credits === 1 ? "" : "s"} left.`,
    );
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Never log to stdout — it's the MCP transport. Diagnostics go to stderr.
  console.error(`vibesafely-mcp ready (API: ${API_URL}, key: ${API_KEY ? "set" : "none"})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
