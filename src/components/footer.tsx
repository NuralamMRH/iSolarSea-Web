import { Anchor, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "@/hooks/use-translation";

export const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer className="ocean-gradient text-white py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Anchor className="w-8 h-8" />
              <div>
                <h3 className="text-xl font-bold">{t("landing.footer.brand.name")}</h3>
                <p className="text-white/80 text-sm">{t("landing.footer.brand.by")}</p>
              </div>
            </div>
            <p className="text-white/70 leading-relaxed">
              {t("landing.footer.description")}
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-lg font-bold">{t("landing.footer.platform.title")}</h4>
            <ul className="space-y-2 text-white/80">
              <li>{t("landing.footer.platform.items.fleet")}</li>
              <li>{t("landing.footer.platform.items.oceanLogistics")}</li>
              <li>{t("landing.footer.platform.items.traceability")}</li>
              <li>{t("landing.footer.platform.items.auction")}</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-lg font-bold">{t("landing.footer.regions.title")}</h4>
            <ul className="space-y-2 text-white/80">
              <li>{t("landing.footer.regions.items.indonesia")}</li>
              <li>{t("landing.footer.regions.items.timor")}</li>
              <li>{t("landing.footer.regions.items.vietnam")}</li>
              <li>{t("landing.footer.regions.items.philippines")}</li>
              <li>{t("landing.footer.regions.items.cambodia")}</li>
              <li>{t("landing.footer.regions.items.australia")}</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-lg font-bold">{t("landing.footer.contact.title")}</h4>
            <div className="space-y-3 text-white/80">
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>{t("landing.footer.contact.address")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 flex-shrink-0" />
                <a href="mailto:info@isolarsea.com" className="hover:text-white transition-colors">
                  {t("landing.footer.contact.email")}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 flex-shrink-0" />
                <span>{t("landing.footer.contact.via")}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 pt-8 text-center text-white/70">
          <p>{t("landing.footer.copyright", { year: new Date().getFullYear() })}</p>
          <div className="mt-2">
            <Link to="/privacy-policy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
          </div>
          <p className="mt-2">
            {t("landing.footer.visit.prefix")} {" "}
            <a
              href="https://www.iTruckSea.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:underline font-semibold"
            >
              {t("landing.footer.visit.linkText")}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};
