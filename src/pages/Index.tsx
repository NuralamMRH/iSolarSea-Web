import { Hero } from "@/components/Hero";
import { CountrySelector } from "@/components/CountrySelector";
import { About } from "@/components/About";
import { Problem } from "@/components/Problem";
import { Platform } from "@/components/Platform";
import { ExamplesCarousel } from "@/components/ExamplesCarousel";
import { Benefits } from "@/components/Benefits";
import { VideoShowcase } from "@/components/VideoShowcase";
import { OurPlan } from "@/components/OurPlan";
import { DetailedInfo } from "@/components/DetailedInfo";
import { Footer } from "@/components/footer";
import { useTranslation } from "@/hooks/use-translation";

const Index = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen">
      <Hero />
      <CountrySelector />
      <About />
      <Problem />
      <Platform />
      <ExamplesCarousel />
      <Benefits />
      <VideoShowcase />
      <OurPlan />
      <DetailedInfo />
      <Footer />
    </div>
  );
};

export default Index;
