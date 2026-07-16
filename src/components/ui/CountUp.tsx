"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Counts up to `end` once it scrolls into view. Renders the final value on the server
// and for no-JS / reduced-motion, so the number is always correct without the count.
// Resets to 0 before paint (useIso) to avoid a flash of the final value.
export function CountUp({
  end,
  duration = 1100,
  className = "",
}: {
  end: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(end);

  useIso(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    setVal(0);
    let raf = 0;
    let start = 0;
    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          obs.disconnect();
          const tick = (t: number) => {
            if (!start) start = t;
            const p = Math.min((t - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setVal(Math.round(eased * end));
            if (p < 1) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
          break;
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [end, duration]);

  return (
    <span ref={ref} className={className}>
      {val}
    </span>
  );
}
