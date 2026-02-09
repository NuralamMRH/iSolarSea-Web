import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import gsap from "gsap";
import { useEffect, useRef } from "react";

export function CheckSection() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    if (sectionRef.current) {
      gsap.from(sectionRef.current, {
        opacity: 0,
        y: 60,
        duration: 1,
        ease: "power2.out",
      });
    }
    if (itemRefs.current) {
      gsap.from(itemRefs.current, {
        opacity: 0,
        y: 40,
        stagger: 0.15,
        duration: 0.8,
        delay: 0.3,
        ease: "power2.out",
      });
    }
  }, []);

  // Hover effect for each item
  useEffect(() => {
    itemRefs.current.forEach((el) => {
      if (!el) return;
      const onEnter = () => {
        gsap.to(el, {
          scale: 1.07,
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          zIndex: 2,
          duration: 0.3,
          ease: "power2.out",
        });
      };
      const onLeave = () => {
        gsap.to(el, {
          scale: 1,
          boxShadow: "none",
          zIndex: 1,
          duration: 0.4,
          ease: "power2.out",
        });
      };
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
      return () => {
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
      };
    });
  }, []);

  return (
    <div className="check bg-white" ref={sectionRef}>
      <div className="container">
        <h2 className="c-title-1">
          <span className="c-title-1__stroke">
            {t("services.title_part1")}{" "}
          </span>
          <span className="c-title-1__gradient">
            {t("services.title_part2")}
          </span>
        </h2>
        <h2 className="c-title-2">
          <span className="c-title-2__sub">{t("services.subtitle")}</span>
        </h2>
        <ul className="check__list">
          {[0, 1, 2, 3].map((idx) => (
            <li
              className="check__item"
              key={idx}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
            >
              {idx === 0 && (
                <Link
                  to="/request-to-dock/port-info"
                  className="check__link check__link--number1"
                >
                  <div className="check__photo">
                    <img
                      src="/images/common_img/anchor.svg"
                      alt={t("alt.port_icon")}
                    />
                  </div>
                  <span className="check__text">
                    {t("services.port_requirements.title")}
                  </span>
                </Link>
              )}
              {idx === 1 && (
                <Link
                  to="/fishing-log/batch"
                  className="check__link check__link--number2"
                >
                  <div className="check__photo">
                    <img
                      src="/images/top/icon2.svg"
                      alt={t("alt.mining_icon")}
                    />
                  </div>
                  <span className="check__text">
                    {t("services.mining_log.title")}
                  </span>
                </Link>
              )}
              {idx === 2 && (
                <Link
                  to="/vessel-management/data"
                  className="check__link check__link--number3"
                >
                  <div className="check__photo">
                    <img
                      src="/images/top/icon3.svg"
                      alt={t("alt.fleet_icon")}
                    />
                  </div>
                  <span className="check__text">
                    {t("services.fleet_management.title")}
                  </span>
                </Link>
              )}
              {idx === 3 && (
                <Link
                  to="/processing-plant/company-profile"
                  className="check__link check__link--number4"
                >
                  <div className="check__photo">
                    <img
                      src="/images/top/icon4.svg"
                      alt={t("alt.factory_icon")}
                    />
                  </div>
                  <span className="check__text">
                    {t("services.seafood_factory.title")}
                  </span>
                </Link>
              )}
            </li>
          ))}
        </ul>
        <div className="marine__content">
          <div className="marine__left">
            <h3 className="c-title-3">{t("marine.title")}</h3>
            <p className="marine__text">
              {t("marine.description_1")}
              <br />
              <br />
              {t("marine.description_2")}
            </p>
            <ul className="c-list-1">
              <li>{t("marine.features.traceability")}</li>
              <li>{t("marine.features.blockchain")}</li>
              <li>{t("marine.features.iuu_standards")}</li>
              <li>{t("marine.features.online_records")}</li>
              <li>{t("marine.features.ai_scan")}</li>
              <li>{t("marine.features.starlink")}</li>
            </ul>
          </div>
        </div>
        <div className="c-border"></div>
      </div>
    </div>
  );
}
