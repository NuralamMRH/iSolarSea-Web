import { Globe2, Factory, Leaf } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";

export const About = () => {
  const { t } = useTranslation();
  const highlights = [
    {
      icon: Globe2,
      title: t("landing.about.highlights.globalReach.title"),
      description: t("landing.about.highlights.globalReach.description"),
    },
    {
      icon: Factory,
      title: t("landing.about.highlights.manufacturingExcellence.title"),
      description: t("landing.about.highlights.manufacturingExcellence.description"),
    },
    {
      icon: Leaf,
      title: t("landing.about.highlights.sustainableInnovation.title"),
      description: t("landing.about.highlights.sustainableInnovation.description"),
    }
  ];

  return (
    <section className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            {t("landing.about.title")}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            {t("landing.about.description")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {highlights.map((item, index) => (
            <Card 
              key={index} 
              className="card-elevated border-border/50 hover:border-primary/30 transition-all duration-300 hover:scale-105"
            >
              <CardContent className="pt-8 pb-6 text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl wave-gradient text-white">
                  <item.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  {item.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
