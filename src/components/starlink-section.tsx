import { Satellite } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";

export function StarlinkSection() {
  const { t } = useTranslation();

  return (
    <div className="starlink c-bg1">
      <div className="starlink__wrap">
        <div className="starlink__left">
          <div className="starlink__inner">
            <h2 className="c-title-1 c-title-1--small">
              <span className="c-title-1__stroke">{t("starlink.brand")}</span>
              <br />
              <span className="c-title-1__gradient">{t("starlink.title")}</span>
            </h2>
            <div className="c-border"></div>
            <h3 className="c-title-3">
              {t("starlink.subtitle_1")}
              <br />
              {t("starlink.subtitle_2")}
            </h3>
            <p className="starlink__text">
              {t("starlink.description_1")}
              <br />
              <br />
              {t("starlink.description_2")} <br />
              <br />
              {t("starlink.description_3")}
            </p>
            <div className="c-border"></div>
            <div className="c-btn-1 c-btn-1--center">
              <Link to="/register" className="c-btn-1__button">
                {t("common.register")}
              </Link>
            </div>
          </div>
        </div>
        <div className="starlink__right">
          <div className="starlink__right-item starlink__right-item--img1"></div>
          <div className="starlink__right-item starlink__right-item--img2"></div>
          <div className="starlink__right-item starlink__right-item--img3"></div>
        </div>
      </div>
    </div>
  );
}
