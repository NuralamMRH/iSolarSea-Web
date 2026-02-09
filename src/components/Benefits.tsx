import { DollarSign, Users, Leaf, TrendingUp, Shield, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";

export const Benefits = () => {
  const { t } = useTranslation();
  const benefits = [
    {
      icon: DollarSign,
      title: t("landing.benefits.items.economicGrowth.title"),
      description: t("landing.benefits.items.economicGrowth.description"),
    },
    {
      icon: Users,
      title: t("landing.benefits.items.jobCreation.title"),
      description: t("landing.benefits.items.jobCreation.description"),
    },
    {
      icon: TrendingUp,
      title: t("landing.benefits.items.foreignCurrency.title"),
      description: t("landing.benefits.items.foreignCurrency.description"),
    },
    {
      icon: Leaf,
      title: t("landing.benefits.items.sustainability.title"),
      description: t("landing.benefits.items.sustainability.description"),
    },
    {
      icon: Shield,
      title: t("landing.benefits.items.resourceProtection.title"),
      description: t("landing.benefits.items.resourceProtection.description"),
    },
    {
      icon: Globe,
      title: t("landing.benefits.items.marketAccess.title"),
      description: t("landing.benefits.items.marketAccess.description"),
    }
  ];

  return (
    <section className="py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            {t("landing.benefits.title")}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            {t("landing.benefits.description")}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => (
            <Card 
              key={index} 
              className="card-elevated border-border/50 hover:border-accent/50 transition-all duration-300 hover:-translate-y-1"
            >
              <CardContent className="pt-8 pb-6 space-y-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-accent/10 text-accent">
                  <benefit.icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  {benefit.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {benefit.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
