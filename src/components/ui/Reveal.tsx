"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

// Client components are server-rendered, so guard useLayoutEffect for SSR.
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Reveals its children as they scroll into view. Renders visible by default so no-JS
// and SEO get the full page; a motion-friendly client hides it (before paint) and
// animates it back in on intersection.
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useIso(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    setVisible(false);
    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`reveal-on-scroll ${visible ? "is-visible" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
