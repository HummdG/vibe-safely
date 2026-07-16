"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// The WebGL shader library is imported ONLY inside LiveAurora, which we pull in through
// next/dynamic with ssr:false, so the shader code is code-split into its own async chunk and
// never enters the initial page bundle (it used to sit in every route's first-load JS). The
// ssr:false option isn't allowed in a Server Component, and layout.tsx (which mounts this) is
// one, so the dynamic() call has to live here, inside the client boundary, not in the layout.
const LiveAurora = dynamic(() => import("./LiveAurora"), { ssr: false });

// The dark scrim over the aurora, a gentle wash so the colour never fights the type. Kept
// constant whether the live shader is up or we're showing just the static base, so the swap
// between the two is invisible. Above the aurora, below all content.
const SCRIM =
  "radial-gradient(135% 105% at 50% 0%, rgba(11,10,20,0.16) 0%, rgba(11,10,20,0.40) 48%, rgba(11,10,20,0.60) 100%)";

// The signature. One soft, living dawn drifting behind the whole site, rendered as three
// fixed, full-viewport, click-through layers:
//   1. a static CSS gradient: server-rendered, so it's the very first paint (no flash) and
//      the look everyone gets before, and without, WebGL;
//   2. the live WebGL mesh: loaded lazily once the page is idle, then crossfaded in on top;
//   3. a dark scrim for legibility.
// The shader is kept off the critical path (deferred to idle) and skipped entirely under
// reduced-motion or when WebGL2 is unavailable. Those visitors keep the static dawn.
export function AuroraBackground() {
  const [enhance, setEnhance] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const cancel = () => {
      if (idleId !== undefined && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
        idleId = undefined;
      }
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    };

    const probeAndEnable = () => {
      // Only upgrade to the shader if the browser can actually run it; the library throws
      // without WebGL2, which would leave no background at all. The static base already looks
      // good, so a failed probe just means we stay on it.
      try {
        const canvas = document.createElement("canvas");
        if (canvas.getContext("webgl2")) setEnhance(true);
      } catch {
        /* no WebGL2, stay on the static gradient */
      }
    };

    const schedule = () => {
      if (mq.matches) return; // reduced-motion: the static gradient is the whole background
      // Defer the heavy shader init until the browser is idle so it never competes with first
      // paint or hydration. Fall back to a short timeout where requestIdleCallback is missing.
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(probeAndEnable, { timeout: 2500 });
      } else {
        timeoutId = setTimeout(probeAndEnable, 200);
      }
    };

    const onChange = () => {
      cancel();
      if (mq.matches) setEnhance(false); // toggled to reduced-motion → drop the live shader
      else schedule(); // toggled back → allow it again
    };

    schedule();
    mq.addEventListener("change", onChange);
    return () => {
      cancel();
      mq.removeEventListener("change", onChange);
    };
  }, []);

  return (
    <>
      {/* 1. Static dawn: server-rendered, instant, the universal base and crossfade floor. */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -20,
          pointerEvents: "none",
          backgroundImage: "var(--gradient-aurora-still)",
        }}
      />

      {/* 2. Live WebGL mesh: lazy, deferred, crossfaded in over the static base. */}
      {enhance && <LiveAurora />}

      {/* 3. Legibility scrim: constant across the static/live swap. */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -10,
          pointerEvents: "none",
          background: SCRIM,
        }}
      />
    </>
  );
}
