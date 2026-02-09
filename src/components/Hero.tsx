import { Button } from "@/components/ui/button";
import { ArrowRight, Anchor } from "lucide-react";
import iSolarSea from "@/assets/iSolarSea.jpg";
import { useTranslation } from "@/hooks/use-translation";
export const Hero = () => {
  const { t } = useTranslation();
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center ocean-gradient overflow-hidden">
      {/* Animated background elements - soft dim lights */}
      <div className="absolute inset-0 opacity-20">
        <img src={iSolarSea} alt="iSolarSea" className="w-full h-full object-cover" />
      </div>
      
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 text-white mb-4">
            <Anchor className="w-4 h-4" />
            <span className="text-sm font-medium">{t("landing.hero.badgeBy")}</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white text-balance leading-tight">
            {t("landing.hero.project")}
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 font-medium text-balance">
            {t("landing.hero.subtitle")}
          </p>
          
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            {t("landing.hero.description")}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              onClick={() => window.open("https://itrucksea.com/")}
              size="lg" 
              variant="secondary"
              className="text-lg px-8 py-6 bg-white text-primary hover:bg-white/90 shadow-xl"
            >
              {t("landing.hero.ctaExplore")}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              onClick={() => window.scrollTo({ top: document.getElementById("video-showcase")?.offsetTop || 0, behavior: 'smooth' })}
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6 border-2 border-white text-primary hover:text-white hover:bg-white/10 backdrop-blur-sm"
            >
              {t("landing.hero.ctaWatch")}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Wave decoration */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path 
            d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" 
            fill="hsl(210 100% 97%)"
          />
        </svg>
      </div>
    </section>
  );
};
