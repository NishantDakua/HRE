import { DayInMumbai } from "@/components/hero/DayInMumbai";
import { BusinessMarquee } from "@/components/landing/BusinessMarquee";
import { CategoryExchange } from "@/components/landing/CategoryExchange";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { RoleSplit } from "@/components/landing/RoleSplit";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Testimonials } from "@/components/landing/Testimonials";

export default function LandingPage() {
  return (
    <>
      <DayInMumbai />
      <CategoryExchange />
      <HowItWorks />
      <RoleSplit />
      <BusinessMarquee />
      <Testimonials />
      <SiteFooter />
    </>
  );
}
