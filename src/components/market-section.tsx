import { Satellite } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";

export function MarketSection() {
  const { t } = useTranslation();

  return (
    <>
      <div className="c-bg1">
        <div className="container">
          <div className="boat__content">
            <div className="boat__left">
              <h2 className="c-title-1">
                <span className="c-title-1__stroke">
                  {t("marketSection.fleet_management.title_stroke")}
                </span>
                <br />
                <span className="c-title-1__gradient">
                  {t("marketSection.fleet_management.title_gradient")}
                </span>
              </h2>
              <div className="boat__photo">
                <img
                  src="/_images/top/app.png"
                  alt={t("marketSection.fleet_management.img_alt")}
                />
              </div>
              <div className="c-border"></div>
              <h3 className="c-title-3">
                {t("marketSection.fleet_management.subtitle")}
              </h3>
              <p className="marine__text">
                {t("marketSection.fleet_management.description_1")}
                <br />
                <br />
                {t("marketSection.fleet_management.description_2")}
              </p>
              <ul className="check__list check__list--center">
                <li className="check__item">
                  <a
                    href="/vessel-management/data"
                    className="check__link check__link--number3"
                  >
                    <div className="check__photo">
                      <img src="/images/top/icon3.svg" alt="icon1" />
                    </div>
                    <span className="check__text">
                      {t("marketSection.fleet_management.manage_fleet")}
                    </span>
                  </a>
                </li>
              </ul>
              <ul className="c-list-1">
                <li>{t("marketSection.fleet_management.feature_1")}</li>
                <li>{t("marketSection.fleet_management.feature_2")}</li>
                <li>{t("marketSection.fleet_management.feature_3")}</li>
                <li>{t("marketSection.fleet_management.feature_4")}</li>
                <li>{t("marketSection.fleet_management.feature_5")}</li>
                <li>{t("marketSection.fleet_management.feature_6")}</li>
                <li>{t("marketSection.fleet_management.feature_7")}</li>
              </ul>
              <div className="c-border"></div>
            </div>
          </div>
        </div>
      </div>
      <div className="market">
        <div className="container">
          <div className="boat__content">
            <div className="boat__left">
              <h2 className="c-title-1">
                <span className="c-title-1__stroke">
                  {t("marketSection.market.title_stroke")}
                </span>
                <br />
                <span className="c-title-1__gradient">
                  {t("marketSection.market.title_gradient")}
                </span>
              </h2>
              <div className="boat__photo">
                <img
                  src="/_images/top/market.png"
                  alt={t("marketSection.market.img_alt")}
                />
              </div>
              <div className="c-border"></div>
              <h2 className="c-title-1">
                <span className="c-title-1__gradient">
                  {t("marketSection.market.quality_title")}
                  <br className="show_sp" />
                  {t("marketSection.market.quality_subtitle")}
                </span>
              </h2>
              <h3 className="c-title-3">
                {t("marketSection.market.supply_solution")}
                <br />
                {t("marketSection.market.supply_connect")}
              </h3>
              <p className="marine__text">
                {t("marketSection.market.description_1")}
                <br />
                <br />
                {t("marketSection.market.description_2")}
                <br />
                {t("marketSection.market.description_3")}
              </p>
              <ul className="check__list check__list--center">
                <li className="check__item">
                  <a
                    href="/thumua"
                    className="check__link check__link--number6"
                  >
                    <div className="check__photo">
                      <img src="/images/top/money.svg" alt="icon1" />
                    </div>
                    <span className="check__text">
                      {t("marketSection.market.marketing_procurement")}
                    </span>
                  </a>
                </li>
              </ul>
              <ul className="c-list-1">
                <li>{t("marketSection.market.feature_1")}</li>
                <li>{t("marketSection.market.feature_2")}</li>
                <li>{t("marketSection.market.feature_3")}</li>
                <li>{t("marketSection.market.feature_4")}</li>
                <li>{t("marketSection.market.feature_5")}</li>
                <li>{t("marketSection.market.feature_6")}</li>
              </ul>
              <div className="c-border"></div>
            </div>
          </div>
          <div className="c-btn-1 c-btn-1--center">
            <Link to="/register" className="c-btn-1__button">
              {t("marketSection.market.register")}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
