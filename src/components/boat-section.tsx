import { Satellite } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";

export function BoatSection() {
  const { t } = useTranslation();

  return (
    <div className="boat">
      <div className="container">
        <div className="boat__content">
          <div className="boat__left">
            <h2 className="c-title-1">
              <span className="c-title-1__stroke">
                {t("boat.title_part1")}{" "}
              </span>
              <br />
              <span className="c-title-1__gradient">
                {t("boat.title_part2")}
              </span>
            </h2>
            <h2 className="c-title-2">
              <span className="c-title-2__sub">{t("boat.subtitle")}</span>
            </h2>
            <div className="c-border"></div>
            <h3 className="c-title-3">{t("boat.heading")}</h3>
            <p className="marine__text">
              {t("boat.description_1")}
              <br />
              <br />
              {t("boat.description_2")}
              <br />
              <br />
              {t("boat.description_3")}
            </p>
            <ul className="check__list check__list--center">
              <li className="check__item">
                <a
                  href="/transportation/4share-loading"
                  className="check__link check__link--number5"
                >
                  <div className="check__photo">
                    <img
                      src="/images/top/icon1.svg"
                      alt={t("alt.transport_icon")}
                    />
                  </div>
                  <span className="check__text">
                    {t("boat.transport_link")}
                  </span>
                </a>
              </li>
            </ul>
            <ul className="c-list-1">
              <li>{t("boat.features.income")}</li>
              <li>{t("boat.features.cost_reduction")}</li>
              <li>{t("boat.features.freezing")}</li>
              <li>{t("boat.features.solar_energy")}</li>
              <li>{t("boat.features.qr_tracking")}</li>
            </ul>
            <div className="c-border"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
