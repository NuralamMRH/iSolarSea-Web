import { AlertCircle, TrendingDown, FileQuestion } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";

export const Problem = () => {
  const { t } = useTranslation();
  const challenges = [
    {
      icon: AlertCircle,
      title: t("landing.problem.items.crossBorder.title"),
      description: t("landing.problem.items.crossBorder.description"),
    },
    {
      icon: TrendingDown,
      title: t("landing.problem.items.resourceProtection.title"),
      description: t("landing.problem.items.resourceProtection.description"),
    },
    {
      icon: FileQuestion,
      title: t("landing.problem.items.lackTraceability.title"),
      description: t("landing.problem.items.lackTraceability.description"),
    }
  ];

  return (
    <section className="py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            {t("landing.problem.title")}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            {t("landing.problem.description")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {challenges.map((challenge, index) => (
            <Card key={index} className="border-destructive/20 bg-card">
              <CardContent className="pt-8 pb-6 space-y-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-destructive/10 text-destructive">
                  <challenge.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  {challenge.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {challenge.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
