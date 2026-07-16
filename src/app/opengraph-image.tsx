import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "VibeSafely: is your AI-built app leaking its database?";

// Satori renders flexbox only (no grid) and no external fonts here, keep it to
// coloured boxes and system sans.
const BARS = [
  { c: "#f2554d", h: 46 },
  { c: "#f5893d", h: 38 },
  { c: "#f0b03a", h: 30 },
  { c: "#e3cf5a", h: 22 },
  { c: "#47c98b", h: 14 },
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          // Calm dusk: indigo → plum settling into the canvas near-black (Satori-safe
          // single linear-gradient; no grid/mask/sun-radial, which Satori can't render).
          background: "linear-gradient(160deg, #2a1a47 0%, #3b1c39 30%, #150f1b 62%, #0b0a0a 100%)",
          color: "#eeece8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 46 }}>
            {BARS.map((b, i) => (
              <div key={i} style={{ width: 9, height: b.h, background: b.c, borderRadius: 2 }} />
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, marginLeft: 16 }}>
            VibeSafely
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontSize: 70,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -1.5,
            }}
          >
            <span style={{ display: "flex" }}>Your AI-built app is&nbsp;</span>
            <span style={{ display: "flex", color: "#f2554d" }}>leaking its database.</span>
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#a9a29b", marginTop: 28 }}>
            Leaked keys, open databases, public .env files. Found in seconds.
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 22, color: "#766e67" }}>
          read-only · secrets masked · nothing stored
        </div>
      </div>
    ),
    { ...size },
  );
}
