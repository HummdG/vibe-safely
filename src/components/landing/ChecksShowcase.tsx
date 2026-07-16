import { Section } from "@/components/ui/Section";
import { CHECK_GROUPS } from "./checksCatalog";
import { AttackSurfaceMap } from "./AttackSurfaceMap";

export function ChecksShowcase() {
  return (
    <Section
      id="checks"
      eyebrow="Coverage"
      eyebrowTick="bg-medium"
      title="Nineteen checks, from the outside in."
      intro="The four layers an attacker works through: browser, network, database, AI. The outer two run on every scan; the inner two once you confirm the app is yours."
    >
      <AttackSurfaceMap groups={CHECK_GROUPS} />
    </Section>
  );
}
