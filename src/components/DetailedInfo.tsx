import { Ship, Cpu, Store } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";

export const DetailedInfo = () => {
  const { t } = useTranslation();
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* iSolarSea Supply Chain */}
          <Card className="card-elevated border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-lg wave-gradient flex items-center justify-center">
                  <Ship className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-2xl md:text-3xl">
                  {t("landing.info.supplyChain.title")}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">{t("landing.info.supplyChain.supplyFleet.title")}</h4>
                  <p className="text-muted-foreground">
                    {t("landing.info.supplyChain.supplyFleet.description")}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">{t("landing.info.supplyChain.processing.title")}</h4>
                  <p className="text-muted-foreground">
                    {t("landing.info.supplyChain.processing.description")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* iTruckSea Platform */}
          <Card className="card-elevated border-accent/20">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-lg wave-gradient flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-2xl md:text-3xl">
                  {t("landing.info.platform.title")}
                </CardTitle>
              </div>
              <a 
                href="https://www.iTruckSea.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-glow font-semibold transition-colors"
              >
                {t("landing.info.platform.linkText")}
              </a>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
                  <h4 className="font-semibold text-foreground mb-2">
                    {t("landing.info.platform.apps.app1.title")}
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    {t("landing.info.platform.apps.app1.description")}
                  </p>
                </div>
                <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
                  <h4 className="font-semibold text-foreground mb-2">
                    {t("landing.info.platform.apps.app2.title")}
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    {t("landing.info.platform.apps.app2.description")}
                  </p>
                </div>
                <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
                  <h4 className="font-semibold text-foreground mb-2">
                    {t("landing.info.platform.apps.app3.title")}
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    {t("landing.info.platform.apps.app3.description")}
                  </p>
                </div>
                <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
                  <h4 className="font-semibold text-foreground mb-2">
                    {t("landing.info.platform.apps.app4.title")}
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    {t("landing.info.platform.apps.app4.description")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* iSolarFish Retail Network */}
          <Card className="card-elevated border-secondary/20">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-lg wave-gradient flex items-center justify-center">
                  <Store className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-2xl md:text-3xl">
                  {t("landing.info.retail.title")}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-secondary/5 rounded-lg border border-secondary/20">
                <h4 className="font-semibold text-foreground mb-3">{t("landing.info.retail.store.title")}</h4>
                <p className="text-muted-foreground mb-3">
                  {t("landing.info.retail.store.description")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Vietnam",
                    "Philippines",
                    "Cambodia",
                    "Thailand",
                    "Malaysia",
                    "Singapore",
                    "Turkey",
                    "Bangladesh",
                    "India",
                    "Taiwan",
                    "Japan",
                    "Korea",
                    "Canada",
                    "USA",
                  ].map((country) => (
                    <span key={country} className="px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm">
                      {t(`landing.info.retail.countries.${country}` as any)}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="p-4 bg-secondary/5 rounded-lg border border-secondary/20">
                <h4 className="font-semibold text-foreground mb-2">{t("landing.info.retail.distribution.title")}</h4>
                <p className="text-muted-foreground">
                  {t("landing.info.retail.distribution.description")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
