import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import fishingFleetImage from "@/assets/fishing-fleet.jpg";
import processingPlantImage from "@/assets/processing-plant.jpg";
import solarBoatImage from "@/assets/solar-boat.jpg";
import retailStoreImage from "@/assets/retail-store.jpg";
import { useTranslation } from "@/hooks/use-translation";

export const ExamplesCarousel = () => {
  const { t } = useTranslation();
  const examples = [
    {
      title: t("landing.examples.items.fleetOps.title"),
      description: t("landing.examples.items.fleetOps.description"),
      image: fishingFleetImage,
    },
    {
      title: t("landing.examples.items.processing.title"),
      description: t("landing.examples.items.processing.description"),
      image: processingPlantImage,
    },
    {
      title: t("landing.examples.items.solarBoats.title"),
      description: t("landing.examples.items.solarBoats.description"),
      image: solarBoatImage,
    },
    {
      title: t("landing.examples.items.retail.title"),
      description: t("landing.examples.items.retail.description"),
      image: retailStoreImage,
    },
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t("landing.examples.title")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("landing.examples.subtitle")}
          </p>
        </div>

        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="max-w-5xl mx-auto"
        >
          <CarouselContent>
            {examples.map((example, index) => (
              <CarouselItem key={index} className="md:basis-1/2">
                <div className="p-1">
                  <Card className="card-elevated border-border/50 h-full overflow-hidden">
                    <div className="relative h-64 overflow-hidden">
                      <img 
                        src={example.image} 
                        alt={example.title}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                    </div>
                    <CardContent className="p-6 -mt-16 relative z-10">
                      <h3 className="font-bold text-xl text-foreground mb-2">
                        {example.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {example.description}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex" />
          <CarouselNext className="hidden md:flex" />
        </Carousel>
      </div>
    </section>
  );
};
