import { Hero } from "@/components/site/sections/Hero";
import { Services } from "@/components/site/sections/Services";
import { Credibility } from "@/components/site/sections/Credibility";
import { Process } from "@/components/site/sections/Process";
import { FinalCta } from "@/components/site/sections/FinalCta";

export default function SiteHome() {
  return (
    <>
      <Hero />
      <Services />
      <Credibility />
      <Process />
      <FinalCta />
    </>
  );
}
