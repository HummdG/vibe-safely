"use client";

import { useEffect, useState } from "react";
import { MeshGradient } from "@paper-design/shaders-react";

// The living dawn. This is the ONLY module that imports the WebGL shader library, so it's
// code-split into its own async chunk, kept out of the initial page bundle and loaded
// lazily (see AuroraBackground). The look is unchanged from the original; what's tuned here
// is the cost: a far lower render resolution (the mesh is a blurred, low-frequency gradient
// sitting behind a dark scrim, so upscaling from a small buffer is invisible) and a
// low-power WebGL context so laptops don't spin up a discrete GPU for ambient atmosphere.
const DAWN = [
  "#0b0a14", // indigo night: lets the field melt into the canvas at the edges
  "#2a1a5e", // deep violet
  "#7c3aed", // violet
  "#e879f9", // magenta
  "#ff9d8a", // warm peach: the horizon
  "#56d6e6", // cyan: the cool counter-note
];

export default function LiveAurora() {
  const [shown, setShown] = useState(false);

  // Fade in only after the shader has actually painted a frame, so we crossfade over the
  // static gradient beneath us instead of flashing a blank canvas. Two rAFs: the first lets
  // the MeshGradient mount and draw, the second flips opacity on the next paint.
  useEffect(() => {
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setShown(true));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, []);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -19, // just above the static base (-20), below the dark scrim (-10)
        pointerEvents: "none",
        opacity: shown ? 1 : 0,
        transition: "opacity 700ms ease",
      }}
    >
      <MeshGradient
        style={{ width: "100%", height: "100%" }}
        colors={DAWN}
        distortion={0.9}
        swirl={0.55}
        speed={0.28}
        grainOverlay={0.035}
        // Per-frame GPU cost is ~= maxPixelCount fragments (the library renders that many
        // every rAF, with no fps cap). This is ambient atmosphere, not detail; 640×360
        // upscaled is indistinguishable behind the scrim and ~75% cheaper than 1280×720.
        // Bump toward 854×480 / 960×540 only if band edges look soft on a large 4K display.
        maxPixelCount={640 * 360}
        // The library oversamples 2× by default (for AA); a blurred gradient doesn't need it.
        minPixelRatio={1}
        // A full-screen quad has no internal edges to antialias, so dropping MSAA is free;
        // low-power keeps integrated GPUs asleep; depth/stencil buffers go unused.
        webGlContextAttributes={{
          antialias: false,
          powerPreference: "low-power",
          depth: false,
          stencil: false,
        }}
      />
    </div>
  );
}
