import React, { useState, useEffect, useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { useTranslation } from "@/hooks/use-translation";
import { Menu, Search, User } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { ThemeToggle } from "./ui/theme-toggle";
import { LanguageList } from "./ui/language-list";

export function DashboardHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();

  const handleSubmenuClick = (menuId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveSubmenu(activeSubmenu === menuId ? null : menuId);
  };

  const handleClickOutside = () => {
    setActiveSubmenu(null);
  };

  // Add event listener for clicks outside submenu
  useLayoutEffect(() => {
    // Reset active submenu on mount
    setActiveSubmenu(null);

    // Initialize click handlers
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  return (
    <>
      <header id="header" className="header">
        <div className="header__right">
          <div className="header__side-logo--click">
            <Link to="/">
              <img
                src="/images/common_img/logo_blue.svg"
                alt="iTruckSea"
                className=""
                width="218"
                height="218"
              />
            </Link>
          </div>

          <ul className="header__right-list">
            <li className="header__right-item">
              <button
                type="button"
                className="header__right-link header__right-link--shop"
                onClick={(e) => handleSubmenuClick("language", e)}
              >
                <img
                  src="/images/common_img/lang.svg"
                  alt="language"
                  width="20"
                  height="18"
                />
              </button>

              <ul
                className={`header__right-submenu ${
                  activeSubmenu === "language" ? "open" : ""
                }`}
              >
                <LanguageList />
              </ul>
            </li>
            <li
              className="header__right-item header__right-item--click"
              onClick={(e) => e.stopPropagation()}
            >
              <Link
                to="#"
                className="header__right-link header__right-link--shop"
                onClick={(e) => handleSubmenuClick("search", e)}
              >
                <img
                  src="/images/common_img/zoom.svg"
                  alt="shop"
                  width="20"
                  height="18"
                />
              </Link>
              <form
                action=""
                className={`header__right-submenu ${
                  activeSubmenu === "search" ? "open" : ""
                }`}
              >
                <input type="text" name="search" />
                <button>Tìm</button>
              </form>
            </li>

            <li
              className="header__right-item header__right-item--click"
              onClick={(e) => e.stopPropagation()}
            >
              <Link
                to="#"
                className="header__right-link header__right-link--shop"
                onClick={(e) => handleSubmenuClick("login", e)}
              >
                <img
                  src="/images/common_img/login.svg"
                  alt="shop"
                  width="20"
                  height="18"
                />
              </Link>
              {user ? (
                <ul
                  className={`header__right-submenu ${
                    activeSubmenu === "login" ? "open" : ""
                  }`}
                >
                  <li className="header__right-subitem">
                    <Link
                      className="header__right-sublink header__right-sublink--user header__right-sublink--login"
                      to="/dashboard/"
                    >
                      {t("header.dashboard")}
                    </Link>
                  </li>
                  <li className="header__right-subitem">
                    <Link
                      to="#"
                      className="header__right-sublink header__right-sublink--user header__right-sublink--register"
                      onClick={() => {
                        logout();
                        setIsMenuOpen(false);
                      }}
                    >
                      {t("header.logout")}
                    </Link>
                  </li>
                </ul>
              ) : (
                <ul className="header__right-submenu">
                  <li className="header__right-subitem">
                    <Link
                      className="header__right-sublink header__right-sublink--user header__right-sublink--login"
                      to="/login/"
                    >
                      {t("header.login")}
                    </Link>
                  </li>
                  <li className="header__right-subitem">
                    <Link
                      className="header__right-sublink header__right-sublink--user header__right-sublink--register"
                      to="/register/"
                    >
                      {t("header.register")}
                    </Link>
                  </li>
                </ul>
              )}
            </li>
            <li className="header__right-item">
              <div className="menu menu--menuright menu--close5">
                <div className="menu__icon">
                  <div className="menu__line menu__line--1"></div>
                  <div className="menu__line menu__line--2"></div>
                  <div className="menu__line menu__line--3"></div>
                  <div className="menu__line menu__line--4"></div>
                  <div className="menu__line menu__line--5"></div>
                </div>
              </div>
            </li>
          </ul>
        </div>
        <div className="header__side2">
          <div className="header__side2-menu">
            <ul className="header__side2-list">
              <li className="header__side2-item">
                <Link to="/" className="header__side2-link">
                  {t("nav.home")}
                </Link>
              </li>
            </ul>
            <h2 className="header__side2-title">
              {t("header.side_menu.floating_market")}
            </h2>
            <ul className="header__side2-list">
              <li className="header__side2-item">
                <Link to="/chonoi/" className="header__side2-link">
                  {t("header.side_menu.floating_market_link")}
                </Link>
              </li>
              <li className="header__side2-item">
                <Link to="/thumua/" className="header__side2-link">
                  {t("header.side_menu.marketing_procurement")}
                </Link>
              </li>
            </ul>
            <h2 className="header__side2-title">
              {t("header.side_menu.sea_transport")}
            </h2>
            <ul className="header__side2-list">
              <li className="header__side2-item">
                <Link to="/chanhvantai/" className="header__side2-link">
                  {t("header.side_menu.transport_handler")}
                </Link>
              </li>
              <li className="header__side2-item">
                <Link to="/chuyentai/" className="header__side2-link">
                  {t("header.side_menu.transport_needs")}
                </Link>
              </li>
            </ul>
            <h2 className="header__side2-title">
              {t("header.side_menu.vms_iuu")}
            </h2>
            <ul className="header__side2-list">
              <li className="header__side2-item">
                <Link
                  to="/dashboard/?page=request-to-dock#port-info"
                  className="header__side2-link"
                >
                  {t("header.side_menu.request_dock")}
                </Link>
              </li>
              <li className="header__side2-item">
                <Link
                  to="/dashboard/?page=fishing-log#BatchLog"
                  className="header__side2-link"
                >
                  {t("header.side_menu.fishing_log")}
                </Link>
              </li>
              <li className="header__side2-item">
                <Link
                  to="/dashboard/?page=vessel-setting#add-new"
                  className="header__side2-link"
                >
                  {t("header.side_menu.vessel_management")}
                </Link>
              </li>
              <li className="header__side2-item">
                <Link
                  to="/dashboard/?page=nha-may-che-bien"
                  className="header__side2-link"
                >
                  {t("header.side_menu.processing_factory")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </header>
    </>
  );
}
