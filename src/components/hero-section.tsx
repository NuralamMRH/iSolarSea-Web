import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(SplitText, ScrollTrigger);

export function HeroSection() {
  const { t } = useTranslation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const sat1Ref = useRef<HTMLImageElement>(null);
  const sat2Ref = useRef<HTMLImageElement>(null);

  // Mouse parallax effect for satellites

  return (
    <div className="mainvisual" ref={heroRef}>
      <video
        width="800"
        height="450"
        autoPlay
        muted
        loop
        playsInline
        className="tech"
        preload="metadata"
        onError={(e) => {
          console.error("Video loading error:", e);
          e.currentTarget.style.display = 'none';
        }}
      >
        <source src="/images/top/mv.mp4" type="video/mp4" />
        {t("video.browser_not_supported")}
      </video>

      <video
        width="800"
        height="450"
        autoPlay
        muted
        loop
        playsInline
        className="ship"
        preload="metadata"
        onError={(e) => {
          console.error("Video loading error:", e);
          e.currentTarget.style.display = 'none';
        }}
      >
        <source src="/images/top/ship.mp4" type="video/mp4" />
        {t("video.browser_not_supported")}
      </video>

      <div className="mainvisual__content">
        <img
          src="/images/top/satellite.svg"
          alt={t("alt.satellite")}
          className="mainvisual__move1"
          ref={sat1Ref}
        />
        <img
          src="/images/top/satellite.svg"
          alt={t("alt.satellite")}
          className="mainvisual__move2"
          ref={sat2Ref}
        />
        <h1 className="mainvisual__heading" ref={headingRef}>
          {t("hero.title")}
          <br />
          <span className="mainvisual__heading-sub" ref={subRef}>
            {t("hero.subtitle")}
          </span>
        </h1>
        <p className="mainvisual__text" ref={textRef}>
          {t("hero.starlink_app")}
          <br />
          {t("hero.boatshare_description")}
        </p>
      </div>
    </div>
  );
}
