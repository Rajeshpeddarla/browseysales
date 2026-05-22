import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { DemoSection } from "@/components/landing/DemoSection";
import { PricingPreview } from "@/components/landing/PricingPreview";
import { SecuritySection } from "@/components/landing/SecuritySection";
import { Testimonials } from "@/components/landing/Testimonials";
import { FAQ } from "@/components/landing/FAQ";
import { CTASection } from "@/components/landing/CTASection";

export default function LandingPage() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <Features />
        <DemoSection />
        <SecuritySection />
        <Testimonials />
        <PricingPreview />
        <FAQ />
        <CTASection />
      </main>
      <SiteFooter />
    </>
  );
}
