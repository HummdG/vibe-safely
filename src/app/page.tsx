import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ChecksShowcase } from "@/components/landing/ChecksShowcase";
import { AiChecksSpotlight } from "@/components/landing/AiChecksSpotlight";
import { HonestySection } from "@/components/landing/HonestySection";
import { CtaSection } from "@/components/landing/CtaSection";

export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-6">
      <Hero />
      <HowItWorks />
      <ChecksShowcase />
      <AiChecksSpotlight />
      <HonestySection />
      <CtaSection />
    </main>
  );
}
