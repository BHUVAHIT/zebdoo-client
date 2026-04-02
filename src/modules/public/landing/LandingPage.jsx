import HeroSection from "./components/HeroSection";
import FeaturesSection from "./components/FeaturesSection";
import HowItWorksSection from "./components/HowItWorksSection";
import BenefitsSection from "./components/BenefitsSection";
import ProductPreviewSection from "./components/ProductPreviewSection";
import TestimonialsSection from "./components/TestimonialsSection";
import CtaSection from "./components/CtaSection";
import LandingFooter from "./components/LandingFooter";
import "./LandingPage.css";

const LandingPage = () => {
  return (
    <main className="landing-page">
      <div className="landing-page__aurora" aria-hidden="true" />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <BenefitsSection />
      <ProductPreviewSection />
      <TestimonialsSection />
      <CtaSection />
      <LandingFooter />
    </main>
  );
};

export default LandingPage;
