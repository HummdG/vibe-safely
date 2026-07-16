import { NextResponse } from "next/server";
import { runScan, UnreachableTargetError } from "@/lib/scan";
import { gateResult } from "@/lib/scan/gating";
import { assertPublicUrl } from "@/lib/scan/safety";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { url?: string; ownerConfirmed?: boolean; plan?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const raw = (body.url || "").trim();
  if (!raw) return NextResponse.json({ error: "Enter a URL to scan." }, { status: 400 });

  let target: URL;
  try {
    target = assertPublicUrl(raw);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid URL." },
      { status: 400 },
    );
  }

  try {
    const result = await runScan({
      url: target.toString(),
      ownerConfirmed: Boolean(body.ownerConfirmed),
    });
    // TODO: resolve plan from the authenticated user's subscription (Supabase + Stripe).
    // Dev-only: honor a `plan: "pro"` in the request so the Pro fix panel is previewable
    // locally. Ignored in production, where everyone is "free" until billing is wired.
    const plan =
      process.env.NODE_ENV !== "production" && body.plan === "pro" ? "pro" : "free";
    return NextResponse.json(gateResult(result, plan));
  } catch (e) {
    // The target isn't a reachable website, that's a user-fixable input error, not
    // a server fault, so return 400 with the specific reason.
    if (e instanceof UnreachableTargetError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Scan failed. The site may be unreachable." },
      { status: 502 },
    );
  }
}
