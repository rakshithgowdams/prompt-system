import { MarketingShell } from '../../components/landing/MarketingShell';
import { HeroSection } from '../../components/landing/HeroSection';
import { TrustMarquee } from '../../components/landing/TrustMarquee';
import { StatsRow } from '../../components/landing/StatsRow';
import { FeatureGrid } from '../../components/landing/FeatureGrid';
import { ProductShowcase } from '../../components/landing/ProductShowcase';
import { CoursesPreview } from '../../components/landing/CoursesPreview';
import { TestimonialsWall } from '../../components/landing/TestimonialsWall';
import { BeforeAfterToggle } from '../../components/landing/BeforeAfterToggle';
import { PricingTeaser } from '../../components/landing/PricingTeaser';
import { FAQ } from '../../components/landing/FAQ';
import { FinalCTA } from '../../components/landing/FinalCTA';

export default function LandingPage() {
  return (
    <MarketingShell>
      <HeroSection />
      <TrustMarquee />
      <StatsRow />
      <FeatureGrid />
      <ProductShowcase />
      <CoursesPreview />
      <TestimonialsWall />
      <BeforeAfterToggle />
      <PricingTeaser />
      <FAQ />
      <FinalCTA />
    </MarketingShell>
  );
}
