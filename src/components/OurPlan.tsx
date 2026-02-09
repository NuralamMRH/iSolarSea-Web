import { Target, Building2, FileCheck, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";

export const OurPlan = () => {
  const { t } = useTranslation();
  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-4 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              {t("landing.plan.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {t("landing.plan.description")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Licenses & Operations */}
            <Card className="card-elevated border-primary/20 hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">
                    {t("landing.plan.licenses.title")}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground mb-4">
                  {t("landing.plan.licenses.intro")}
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <p className="text-sm">{t("landing.plan.licenses.items.iceFactory")}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <p className="text-sm">{t("landing.plan.licenses.items.processingPlant")}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <p className="text-sm">{t("landing.plan.licenses.items.solarBoatPlant")}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <p className="text-sm">{t("landing.plan.licenses.items.fleetOperation")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Government Coordination */}
            <Card className="card-elevated border-accent/20 hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Target className="w-6 h-6 text-accent" />
                  </div>
                  <CardTitle className="text-xl">
                    {t("landing.plan.government.title")}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground">
                  {t("landing.plan.government.intro")}
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent mt-2" />
                    <p className="text-sm">{t("landing.plan.government.items.findAgencies")}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent mt-2" />
                    <p className="text-sm">{t("landing.plan.government.items.buildRelationships")}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent mt-2" />
                    <p className="text-sm">{t("landing.plan.government.items.presentBenefits")}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent mt-2" />
                    <p className="text-sm">{t("landing.plan.government.items.alleviateRisks")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fishing Licenses */}
            <Card className="card-elevated border-secondary/20 hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <FileCheck className="w-6 h-6 text-secondary" />
                  </div>
                  <CardTitle className="text-xl">
                    {t("landing.plan.fishingLicenses.title")}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground mb-3">
                  {t("landing.plan.fishingLicenses.intro")}
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-secondary mt-2" />
                    <p className="text-sm">{t("landing.plan.fishingLicenses.items.areaLicenses")}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-secondary mt-2" />
                    <p className="text-sm">{t("landing.plan.fishingLicenses.items.transferCoordination")}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-secondary mt-2" />
                    <p className="text-sm">{t("landing.plan.fishingLicenses.items.workforceLaw")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ongoing Support */}
            <Card className="card-elevated border-primary/20 hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Wrench className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">
                    {t("landing.plan.support.title")}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground mb-3">
                  {t("landing.plan.support.intro")}
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <p className="text-sm">{t("landing.plan.support.items.answerQuestions")}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <p className="text-sm">{t("landing.plan.support.items.troubleshootIssues")}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <p className="text-sm">{t("landing.plan.support.items.ensureCompliance")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center p-8 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl border border-primary/20">
            <p className="text-lg text-foreground font-medium mb-2">
              {t("landing.plan.cta.title")}
            </p>
            <p className="text-muted-foreground max-w-3xl mx-auto">
              {t("landing.plan.cta.description")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
