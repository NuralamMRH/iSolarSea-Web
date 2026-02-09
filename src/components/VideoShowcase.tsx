import { Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";
import { useState } from "react";

export const VideoShowcase = () => {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const videoId = "9Uziqbg4ZIg";

  return (
    <section className="py-20 md:py-32 bg-background" id="video-showcase">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            {t("landing.video.title")}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            {t("landing.video.description")}
          </p>
        </div>

        <Card className="max-w-4xl mx-auto card-elevated overflow-hidden">
          <div className="relative aspect-video">
            {isPlaying ? (
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                title="Video showcase"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary">
                <button
                  type="button"
                  onClick={() => setIsPlaying(true)}
                  className="absolute inset-0 flex items-center justify-center group"
                  aria-label="Play video"
                >
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-2xl">
                    <Play className="w-10 h-10 md:w-12 md:h-12 text-primary ml-2" fill="currentColor" />
                  </div>
                  {/* Decorative rings */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-2 border-white/30 animate-ping" />
                  </div>
                </button>
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl" />
                  <div className="absolute bottom-10 right-10 w-60 h-60 bg-white rounded-full blur-3xl" />
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
};
