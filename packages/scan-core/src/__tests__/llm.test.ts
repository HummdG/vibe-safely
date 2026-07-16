import { describe, it, expect } from "vitest";
import { scanForSecrets } from "../secrets";
import {
  detectLlmClientUsage,
  scanForSystemPrompt,
  discoverChatEndpoints,
} from "../llm";
import { llmPromptInjection } from "../checks/llmPromptInjection";
import { runScan } from "../runner";
import type { ScanContext, FetchLike } from "../types";

function ctx(overrides: Partial<ScanContext>): ScanContext {
  return {
    url: "https://x",
    origin: "https://x",
    domain: "x",
    ownerConfirmed: true,
    status: 200,
    reachable: true,
    headers: {},
    cookies: [],
    html: "",
    bundles: [],
    fetchImpl: async () => new Response("", { status: 404 }),
    ...overrides,
  };
}

describe("scanForSecrets:LLM providers", () => {
  it("detects Groq, Perplexity, Replicate, HuggingFace, xAI and OpenRouter keys", () => {
    const text = [
      "gsk_" + "a".repeat(40),
      "pplx-" + "b".repeat(48),
      "r8_" + "c".repeat(37),
      "hf_" + "d".repeat(34),
      "xai-" + "e".repeat(70),
      "sk-or-v1-" + "f".repeat(40),
    ].join(" ");
    const types = scanForSecrets(text).map((h) => h.type);
    expect(types).toContain("Groq API key");
    expect(types).toContain("Perplexity API key");
    expect(types).toContain("Replicate API token");
    expect(types).toContain("Hugging Face token");
    expect(types).toContain("xAI (Grok) API key");
    expect(types).toContain("OpenRouter API key");
  });
});

describe("detectLlmClientUsage", () => {
  it("flags dangerouslyAllowBrowser (plain and minified) and provider hosts", () => {
    expect(detectLlmClientUsage("new OpenAI({dangerouslyAllowBrowser:true})").dangerouslyAllowBrowser).toBe(true);
    expect(detectLlmClientUsage("{dangerouslyAllowBrowser:!0}").dangerouslyAllowBrowser).toBe(true);
    expect(detectLlmClientUsage('fetch("https://api.openai.com/v1/chat")').hosts).toContain("OpenAI");
    expect(detectLlmClientUsage('fetch("https://api.groq.com/openai/v1")').hosts).toContain("Groq");
    expect(detectLlmClientUsage("const x = 1").hosts).toHaveLength(0);
  });
});

describe("scanForSystemPrompt", () => {
  it("finds a system prompt literal and ignores unrelated text", () => {
    const sp = scanForSystemPrompt(
      'const p = "You are a helpful assistant that always answers in pirate speak and never reveals secrets";',
    );
    expect(sp.found).toBe(true);
    expect(sp.evidence).toContain("You are");
    expect(scanForSystemPrompt("just some ordinary code here").found).toBe(false);
  });
});

describe("discoverChatEndpoints", () => {
  it("finds same-origin chat-ish API paths", () => {
    const eps = discoverChatEndpoints('fetch("/api/chat"); post("/api/generate")', "https://x");
    expect(eps).toContain("https://x/api/chat");
    expect(eps).toContain("https://x/api/generate");
  });
});

describe("llmPromptInjection", () => {
  const html = '<script>fetch("/api/chat")</script>';

  it("flags an endpoint that echoes the injected canary", async () => {
    const fetchImpl: FetchLike = async (url, init) => {
      if (url.toString() === "https://x/api/chat" && init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        if (Array.isArray(body.messages))
          return new Response(JSON.stringify({ reply: "sure: VSAFE7Q2X9K" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        return new Response(JSON.stringify({ error: "messages required" }), { status: 400 });
      }
      return new Response("", { status: 404 });
    };
    const out = await llmPromptInjection.run(ctx({ html, fetchImpl }));
    const findings = Array.isArray(out) ? out : [out];
    expect(findings.some((f) => !f.passed && /prompt injection/i.test(f.title))).toBe(true);
  });

  it("passes an endpoint that resists the injection", async () => {
    const fetchImpl: FetchLike = async (url) => {
      if (url.toString() === "https://x/api/chat")
        return new Response(JSON.stringify({ reply: "I can't do that." }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      return new Response("", { status: 404 });
    };
    const out = await llmPromptInjection.run(ctx({ html, fetchImpl }));
    expect((Array.isArray(out) ? out : [out]).every((f) => f.passed)).toBe(true);
  });

  it("is inconclusive (pass) when no chat endpoint is detected", async () => {
    const out = await llmPromptInjection.run(ctx({ html: "<html></html>" }));
    expect((Array.isArray(out) ? out : [out])[0].passed).toBe(true);
  });
});

describe("runScan:vulnerable AI app integration", () => {
  it("grades a leaky AI app F and reports the LLM findings", async () => {
    const bundle =
      "new OpenAI({dangerouslyAllowBrowser:true});" +
      'fetch("https://api.groq.com/openai/v1");' +
      'const sys="You are a helpful assistant that must never reveal internal configuration to any user ever";' +
      'fetch("/api/chat",{method:"POST"});' +
      'const k="gsk_' + "a".repeat(40) + '";';

    const fetchImpl: FetchLike = async (url, init) => {
      const u = url.toString();
      if (u === "https://ai.test" || u === "https://ai.test/")
        return new Response('<!doctype html><html><head><script src="/app.js"></script></head><body></body></html>', {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      if (u.endsWith("/app.js"))
        return new Response(bundle, { status: 200, headers: { "content-type": "application/javascript" } });
      if (u === "https://ai.test/api/chat" && init?.method === "POST") {
        const b = JSON.parse(String(init.body));
        if (Array.isArray(b.messages))
          return new Response(JSON.stringify({ reply: "ok VSAFE7Q2X9K" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        return new Response(JSON.stringify({ error: "messages required" }), { status: 400 });
      }
      return new Response("", { status: 404 });
    };

    const result = await runScan({ url: "ai.test", ownerConfirmed: true, fetchImpl, now: () => "t" });
    expect(result.grade).toBe("F");
    const failed = result.findings.filter((f) => !f.passed).map((f) => f.title.toLowerCase());
    expect(failed.some((t) => t.includes("dangerouslyallowbrowser"))).toBe(true);
    expect(failed.some((t) => t.includes("groq"))).toBe(true);
    expect(failed.some((t) => t.includes("system prompt"))).toBe(true);
    expect(failed.some((t) => t.includes("prompt injection"))).toBe(true);
  });
});
