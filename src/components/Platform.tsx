import { Ship, Share2, CheckCircle2, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/use-translation";

export const Platform = () => {
  const { t } = useTranslation();
  const apps = [
    {
      icon: Ship,
      number: "01",
      title: t("landing.platform.apps.fleet.title"),
      description: t("landing.platform.apps.fleet.description"),
    },
    {
      icon: Share2,
      number: "02",
      title: t("landing.platform.apps.boatshare.title"),
      description: t("landing.platform.apps.boatshare.description"),
    },
    {
      icon: CheckCircle2,
      number: "03",
      title: t("landing.platform.apps.traceability.title"),
      description: t("landing.platform.apps.traceability.description"),
    },
    {
      icon: ShoppingCart,
      number: "04",
      title: t("landing.platform.apps.auction.title"),
      description: t("landing.platform.apps.auction.description"),
    }
  ];

  return (
    <section className="py-20 md:py-32 bg-background relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <Badge variant="secondary" className="mb-4 text-sm px-4 py-2">
            {t("landing.platform.badge")}
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            {t("landing.platform.title")}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            {t("landing.platform.description")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {apps.map((app, index) => (
            <Card 
              key={index} 
              className="card-elevated border-border/50 hover:border-primary/50 transition-all duration-300 group"
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center justify-center w-14 h-14 rounded-xl wave-gradient text-white group-hover:scale-110 transition-transform duration-300">
                    <app.icon className="w-7 h-7" />
                  </div>
                  <span className="text-4xl font-bold text-primary/10 group-hover:text-primary/20 transition-colors">
                    {app.number}
                  </span>
                </div>
                <CardTitle className="text-xl md:text-2xl text-foreground">
                  {app.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {app.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <a 
            href="https://www.iTruckSea.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:text-primary-glow font-semibold text-lg transition-colors"
          >
            {t("landing.platform.visitLink")}
            <span className="text-2xl">→</span>
          </a>
        </div>
      </div>
    </section>
  );
};
