import { describe, it, expect } from "vitest";
import { robotsSitemap } from "../checks/robotsSitemap";
import { errorDisclosure } from "../checks/errorDisclosure";
import { httpMethods } from "../checks/httpMethods";
import { dependencyScan } from "../checks/dependencyScan";
import { corsConfig } from "../checks/corsConfig";
import { contentTypeConfusion } from "../checks/contentTypeConfusion";
import { openRedirect } from "../checks/openRedirect";
import type { ScanContext, FetchLike, Check, Finding } from "../types";

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
async function run(check: Check, c: ScanContext): Promise<Finding[]> {
  const r = await check.run(c);
  return Array.isArray(r) ? r : [r];
}

describe("robotsSitemap", () => {
  it("flags sensitive Disallow paths", async () => {
    const fetchImpl: FetchLike = async (u) =>
      u.toString().endsWith("/robots.txt")
        ? new Response("User-agent: *\nDisallow: /admin\nDisallow: /api/internal\n", {
            status: 200,
            headers: { "content-type": "text/plain" },
          })
        : new Response("", { status: 404 });
    const f = await run(robotsSitemap, ctx({ fetchImpl }));
    expect(f.some((x) => !x.passed && x.category === "hardening")).toBe(true);
  });

  it("passes when robots.txt has nothing sensitive", async () => {
    const fetchImpl: FetchLike = async (u) =>
      u.toString().endsWith("/robots.txt")
        ? new Response("User-agent: *\nDisallow: /search\n", {
            status: 200,
            headers: { "content-type": "text/plain" },
          })
        : new Response("", { status: 404 });
    const f = await run(robotsSitemap, ctx({ fetchImpl }));
    expect(f.every((x) => x.passed)).toBe(true);
  });
});

describe("errorDisclosure", () => {
  it("flags version-disclosing headers", async () => {
    const f = await run(errorDisclosure, ctx({ headers: { "x-powered-by": "Express" } }));
    expect(f.some((x) => /version disclosed/i.test(x.title))).toBe(true);
  });

  it("flags a leaked stack trace", async () => {
    const f = await run(errorDisclosure, ctx({ html: "Traceback (most recent call last):\n  File x" }));
    expect(f.some((x) => /stack trace/i.test(x.title))).toBe(true);
  });

  it("passes a clean response", async () => {
    const f = await run(errorDisclosure, ctx({ html: "<html>ok</html>" }));
    expect(f.every((x) => x.passed)).toBe(true);
  });
});

describe("httpMethods", () => {
  it("flags advertised write methods", async () => {
    const fetchImpl: FetchLike = async () =>
      new Response("", { status: 200, headers: { allow: "GET, POST, PUT, DELETE" } });
    const f = await run(httpMethods, ctx({ fetchImpl }));
    expect(f.some((x) => /Write HTTP methods/i.test(x.title))).toBe(true);
  });

  it("passes when only safe methods are advertised", async () => {
    const fetchImpl: FetchLike = async () =>
      new Response("", { status: 200, headers: { allow: "GET, HEAD, POST" } });
    const f = await run(httpMethods, ctx({ fetchImpl }));
    expect(f.every((x) => x.passed)).toBe(true);
  });
});

describe("dependencyScan", () => {
  it("flags a known-vulnerable library version from a CDN url", async () => {
    const html = '<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.4.1/jquery.min.js"></script>';
    const f = await run(dependencyScan, ctx({ html }));
    expect(f.some((x) => !x.passed && /jquery/i.test(x.title) && x.category === "vulnerability")).toBe(true);
  });

  it("passes a patched version", async () => {
    const html = '<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>';
    const f = await run(dependencyScan, ctx({ html }));
    expect(f.every((x) => x.passed)).toBe(true);
  });
});

describe("corsConfig", () => {
  it("flags reflected origin with credentials as a high vuln", async () => {
    const fetchImpl: FetchLike = async (_u, init) => {
      const origin = (init?.headers as Record<string, string>)?.origin ?? "";
      return new Response("", {
        status: 200,
        headers: {
          "access-control-allow-origin": origin,
          "access-control-allow-credentials": "true",
        },
      });
    };
    const f = await run(corsConfig, ctx({ fetchImpl }));
    expect(f.some((x) => x.severity === "high" && x.category === "vulnerability")).toBe(true);
  });

  it("passes a non-reflecting server", async () => {
    const fetchImpl: FetchLike = async () => new Response("", { status: 200 });
    const f = await run(corsConfig, ctx({ fetchImpl }));
    expect(f.every((x) => x.passed)).toBe(true);
  });
});

describe("contentTypeConfusion (active)", () => {
  it("is not applicable when no API endpoint is found", async () => {
    const f = await run(contentTypeConfusion, ctx({ html: "<html>no api</html>" }));
    expect(f[0].applicable).toBe(false);
    expect(f[0].passed).toBe(true);
  });

  it("flags XXE when the entity resolves (canary without the DOCTYPE)", async () => {
    const html = '<script>fetch("/api/parse")</script>';
    const fetchImpl: FetchLike = async () => new Response("<r>VSAFEXXE7Q2X</r>", { status: 200 });
    const f = await run(contentTypeConfusion, ctx({ html, fetchImpl }));
    expect(f.some((x) => /XML external entities/i.test(x.title))).toBe(true);
  });

  it("flags an endpoint that accepts a text/plain body", async () => {
    const html = '<script>fetch("/api/data")</script>';
    const fetchImpl: FetchLike = async (_u, init) => {
      const ct = (init?.headers as Record<string, string>)?.["content-type"] || "";
      return ct.includes("xml") ? new Response("", { status: 415 }) : new Response("ok", { status: 200 });
    };
    const f = await run(contentTypeConfusion, ctx({ html, fetchImpl }));
    expect(f.some((x) => /unexpected content types/i.test(x.title))).toBe(true);
  });
});

describe("openRedirect (active)", () => {
  it("is not applicable when no redirect param is present", async () => {
    const f = await run(openRedirect, ctx({ html: "<html>nothing</html>" }));
    expect(f[0].applicable).toBe(false);
  });

  it("flags an off-domain redirect via a param", async () => {
    const html = '<a href="/login?next=/dashboard">login</a>';
    const fetchImpl: FetchLike = async (u) =>
      u.toString().includes("next=")
        ? new Response("", {
            status: 302,
            headers: { location: "https://vibesafely-redirect-probe.example/x" },
          })
        : new Response("", { status: 200 });
    const f = await run(openRedirect, ctx({ html, fetchImpl }));
    expect(f.some((x) => /open redirect/i.test(x.title))).toBe(true);
  });
});
