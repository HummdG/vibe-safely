import type { Metadata } from "next";
import Link from "next/link";
import { Bricolage_Grotesque, Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { LogoMark } from "@/components/icons";
import { SealingLock } from "@/components/ui/SealingLock";
import { AuroraBackground } from "@/components/AuroraBackground";
import "./globals.css";

// Display face: a warm, characterful grotesque with real personality, deliberately not
// Inter/Space Grotesk. Used for headlines and the grade letter.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

// Body face: a friendly, humanist grotesque, calm and highly legible.
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Mono is reserved for what's genuinely code or data: URLs, patches, .env, log lines.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://vibesafely.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "VibeSafely: is your AI-built app leaking its database?",
    template: "%s · VibeSafely",
  },
  description:
    "Scan your AI-built app for exposed secrets, open Supabase and Firebase databases, leaked .env / .git files, and missing security headers. Read-only, nothing stored.",
  openGraph: {
    title: "VibeSafely: security scanner for AI-built apps",
    description:
      "Find leaked secrets and open databases in your Lovable, Bolt or Cursor app before someone else does.",
    url: APP_URL,
    siteName: "VibeSafely",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VibeSafely: security scanner for AI-built apps",
    description: "Scan your AI-built app for exposed secrets and open databases in seconds.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${hanken.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AuroraBackground />

        <header className="sticky top-0 z-30 border-b border-hairline bg-canvas/60 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link href="/" className="group flex items-center gap-2.5" aria-label="VibeSafely home">
              <LogoMark />
              <span className="font-display text-body font-bold tracking-tight text-ink">
                VibeSafely
              </span>
            </Link>
            <nav className="flex items-center gap-7 text-meta font-medium text-ink-muted">
              <Link href="/" className="transition-colors hover:text-ink">
                Scan
              </Link>
              <Link href="/pricing" className="transition-colors hover:text-ink">
                Pricing
              </Link>
            </nav>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="relative mt-8 border-t border-hairline">
          <div className="relative mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-8 text-meta text-ink-dim sm:flex-row">
            <span className="inline-flex items-center gap-2">
              <SealingLock className="h-4 w-4 shrink-0 text-accent" />
              Read-only. Nothing stored. Scan apps you own.
            </span>
            <Link href="/pricing" className="transition-colors hover:text-ink-muted">
              Pricing
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
