import { useTranslation } from "@/hooks/use-translation";
import { Link } from "react-router-dom";

interface PageHeroHeaderProps {
  heading?: string;
  breadcrumbHome?: string;
  breadcrumbCurrent?: string;
}

export function PageHeroHeader({
  heading,
  breadcrumbHome,
  breadcrumbCurrent,
}: PageHeroHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="tt-page px-5">
      <div className="tt-page__wrap">
        <div className="tt-page__content">
          <h1 className="tt-page__heading">
            {heading || t("floatingMarketHeader.heading")}
          </h1>
          <div className="c-border"></div>
          <section className="c-breadcrumb">
            <ul className="c-breadcrumb__list">
              <li className="c-breadcrumb__item">
                <Link to="../" className="c-breadcrumb__link">
                  <span>
                    {breadcrumbHome ||
                      t("floatingMarketHeader.breadcrumb_home")}
                  </span>
                </Link>
              </li>
              <li className="c-breadcrumb__item">
                <span>
                  {breadcrumbCurrent ||
                    t("floatingMarketHeader.breadcrumb_current")}
                </span>
              </li>
            </ul>
          </section>
          <div className="c-border"></div>
        </div>
      </div>
    </div>
  );
}
