"use client";

import { useEffect, useRef } from "react";
import type { CheckGroup } from "./checksCatalog";

// "Your app, from the outside in." The four fronts aren't an abstract list; they're the
// layers of an app, in the order an attacker works through them: the browser bundle first,
// then the network, then the database, then the AI endpoint.
//
// A glowing scan beam rides the depth axis from the FIRST node to the LAST and loops. Because
// the layers are different heights, the node positions are measured at runtime; the beam then
// moves between them and fires each node's ping exactly as it arrives, its bulge thickening
// the line as it rides. All of it is decorative and JS-driven, so no-JS / reduced-motion get
// a clean static map with every check still in the HTML.
const WHERE: Record<string, string> = {
  secrets: "Browser bundle",
  transport: "Network & transport",
  backend: "Database",
  ai: "AI endpoint",
};

export function AttackSurfaceMap({ groups }: { groups: CheckGroup[] }) {
  const axisRef = useRef<HTMLDivElement>(null);
  const beamRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    const axis = axisRef.current;
    const beam = beamRef.current;
    if (!axis || !beam) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const TRAVEL = 3200; // ms, first node → last node
    const HOLD = 1200; // ms, rest at the bottom before the next pass
    const PERIOD = TRAVEL + HOLD;
    const FADE = 0.06; // fraction of the travel spent fading in / out

    let ys: number[] = [];
    const measure = () => {
      const top = axis.getBoundingClientRect().top;
      ys = nodeRefs.current.map((n) => {
        if (!n) return 0;
        const r = n.getBoundingClientRect();
        return r.top - top + r.height / 2;
      });
    };

    let raf = 0;
    let startT = 0;
    let lastLoop = 0;
    let pinged: boolean[] = [];
    let running = false;

    const firePing = (i: number) => {
      const n = nodeRefs.current[i];
      if (!n) return;
      n.classList.remove("is-ping");
      void n.offsetWidth; // reflow so the one-shot animation restarts each pass
      n.classList.add("is-ping");
    };

    const frame = (t: number) => {
      if (!startT) {
        startT = t;
        measure();
        pinged = ys.map(() => false);
      }
      const loopT = (t - startT) % PERIOD;
      if (loopT < lastLoop) {
        // a fresh pass began: re-measure (layout/fonts may have shifted) and re-arm pings
        measure();
        pinged = ys.map(() => false);
      }
      lastLoop = loopT;

      const y0 = ys[0] ?? 0;
      const yN = ys[ys.length - 1] ?? 0;

      if (loopT < TRAVEL && ys.length > 1) {
        const p = loopT / TRAVEL;
        const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        const y = y0 + (yN - y0) * eased;
        const op = p < FADE ? p / FADE : p > 1 - FADE ? (1 - p) / FADE : 1;
        beam.style.transform = `translate(-50%, -50%) translateY(${y}px)`;
        beam.style.opacity = String(op);
        for (let i = 0; i < ys.length; i++) {
          if (!pinged[i] && y >= ys[i] - 1.5) {
            pinged[i] = true;
            firePing(i);
          }
        }
      } else {
        beam.style.opacity = "0";
      }
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running) return;
      running = true;
      startT = 0;
      lastLoop = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
      beam.style.opacity = "0";
    };

    // only run while the map is on screen
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) start();
          else stop();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(axis);

    const onResize = () => measure();
    window.addEventListener("resize", onResize);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [groups.length]);

  return (
    <div className="relative isolate">
      {/* a soft legibility veil: no border, fades to nothing at the edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 -inset-y-8 -z-10"
        style={{
          background:
            "radial-gradient(80% 66% at 34% 26%, rgba(9,8,16,0.58), rgba(9,8,16,0.30) 56%, transparent 84%)",
        }}
      />

      {/* the two ends of the axis, named */}
      <div className="mb-5 flex items-center gap-2.5 text-meta font-semibold">
        <span className="text-live">Outside</span>
        <span aria-hidden className="h-px w-10 bg-gradient-to-r from-live via-accent-2 to-accent" />
        <span className="text-accent">the way in</span>
      </div>

      <div ref={axisRef} className="relative">
        {/* the beam that rides the axis, first node to last */}
        <div ref={beamRef} aria-hidden className="scan-beam">
          <span className="scan-beam-bulge" />
          <span className="scan-beam-core" />
        </div>

        <ul>
          {groups.map((g, i) => {
            const first = i === 0;
            const last = i === groups.length - 1;
            const segment = first ? "top-8 bottom-0" : last ? "top-0 h-8" : "inset-y-0";
            const manyChecks = g.items.length > 4;
            return (
              <li key={g.key} className={first ? "" : "border-t border-hairline/70"}>
                <div className="group relative flex gap-4 rounded-xl py-7 transition-colors hover:bg-accent-2/[0.04] sm:gap-6">
                  {/* this layer's segment of the depth axis */}
                  <span
                    aria-hidden
                    className={`absolute left-2 w-px -translate-x-1/2 bg-accent-2/30 ${segment}`}
                  />
                  {/* the layer's node: one dawn dot for all four; the beam lights it on arrival */}
                  <div className="flex w-4 shrink-0 justify-center">
                    <span
                      ref={(el) => {
                        nodeRefs.current[i] = el;
                      }}
                      aria-hidden
                      className="axis-node mt-1 h-3 w-3 rounded-full bg-[image:var(--gradient-dawn)] transition-transform duration-300 group-hover:scale-125"
                    />
                  </div>

                  <div className="grid flex-1 gap-x-8 gap-y-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
                    {/* which layer, and what it's called */}
                    <div>
                      <div className="text-meta font-semibold text-live">{WHERE[g.key]}</div>
                      <h3 className="mt-1 font-display text-heading font-bold leading-tight text-ink">
                        {g.label}
                      </h3>
                      <div className="mt-2.5">
                        {g.tag ? (
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-label font-semibold ${
                              g.tagTone === "accent"
                                ? "border-accent/40 bg-accent/10 text-accent"
                                : "border-medium/40 bg-medium/10 text-medium"
                            }`}
                          >
                            {g.tag}
                          </span>
                        ) : (
                          <span className="rounded-full border border-live/30 bg-live/10 px-2.5 py-0.5 text-label font-semibold text-live">
                            Always on
                          </span>
                        )}
                      </div>
                    </div>

                    {/* what we check on this layer: two columns when there are many */}
                    <ul className={manyChecks ? "grid gap-x-6 gap-y-2.5 sm:grid-cols-2" : "space-y-2.5"}>
                      {g.items.map((it) => (
                        <li key={it.name} className="flex items-start gap-2.5" title={it.blurb}>
                          <span
                            aria-hidden
                            className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[image:var(--gradient-dawn)]"
                          />
                          <span className="text-meta text-ink">{it.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
