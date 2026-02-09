import { useLanguageStore } from "@/stores/language-store";
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getCountryByCode } from "@/config/countries";


export default function TopButtons() {
  const { language, country } = useLanguageStore();
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const countrySlug = getCountryByCode(country)?.urlSlug ?? country;

  // Helper to check if current path matches a section (handles country-based routing)
  const isActive = (base: string) => {
    const countryBasedPath = `/${countrySlug}${base}`;
    return path === countryBasedPath || path.startsWith(countryBasedPath + "/") || 
           path === base || path.startsWith(base + "/");
  };

  return (
    <div className="flex w-full gap-2 md:gap-4 pt-4 pb-8 items-center justify-center rounded mb-6 px-3 bg-blue-50">
      <button
        className={`flex flex-col items-center justify-center w-[calc(100vw/6)] h-[calc(100vw/6)] md:w-auto md:h-auto md:min-w-[120px] md:px-4 md:py-3 rounded focus:outline-none relative`}
        onClick={() => navigate(`/${countrySlug}/vessel-management/data`)}
      >
        <div
          className={`p-2 md:p-6 rounded mb-2 w-full h-full flex items-center justify-center ${
            isActive("/vessel-management")
              ? "bg-[#1306ad] text-white font-bold"
              : " bg-[#1306ad2e]  text-black"
          }`}
        >
          <img
            src="/images/icons/boat-icon.png"
            alt="vessel-management"
            className="w-10 h-10 md:w-12 md:h-12"
            style={{
              filter: isActive("/vessel-management")
                ? "invert(1)"
                : "invert(0)",
            }}
          />
        </div>
        <span className="text-[8.5px] md:text-sm absolute bottom-[-20px] ">
          Vessel Management
        </span>
      </button>
      <button
        className={`flex flex-col items-center justify-center w-[calc(100vw/6)] h-[calc(100vw/6)] md:w-auto md:h-auto md:min-w-[120px] md:px-4 md:py-3 rounded focus:outline-none relative`}
        onClick={() => navigate(`/${countrySlug}/request-to-dock`)}
      >
        <div
          className={`p-2 md:p-6 rounded mb-2 w-full h-full flex items-center justify-center ${
            isActive("/request-to-dock")
              ? "bg-[#1306ad] text-white font-bold"
              : " bg-[#1306ad2e]  text-white"
          }`}
        >
          <img
            src="/images/icons/free-anchor.webp"
            alt="request-to-dock"
            className="w-10 h-10 md:w-12 md:h-12"
            style={{
              filter: isActive("/request-to-dock") ? "invert(1)" : "invert(0)",
            }}
          />
        </div>
        <span className="text-[8.5px] md:text-sm absolute bottom-[-20px] ">
          Request
          <br />
          to Dock
        </span>
      </button>
      <button
        className={`flex flex-col items-center justify-center w-[calc(100vw/6)] h-[calc(100vw/6)] md:w-auto md:h-auto md:min-w-[120px] md:px-4 md:py-3 rounded focus:outline-none relative`}
        onClick={() => navigate(`/${countrySlug}/fishing-log`)}
      >
        <div
          className={`p-2 md:p-6 rounded mb-2 w-full h-full flex items-center justify-center ${
            isActive("/fishing-log")
              ? "bg-[#1306ad] text-white font-bold"
              : " bg-[#1306ad2e]  text-white"
          }`}
        >
          <img
            src="/images/icons/note.png"
            alt="fishing-log"
            className="w-10 h-10 md:w-12 md:h-12"
            style={{
              filter: isActive("/fishing-log") ? "invert(1)" : "invert(0)",
            }}
          />
        </div>
        <span className="text-[8.5px] md:text-sm absolute bottom-[-20px] ">
          Nhật Ký
          <br />
          Khai Thác
        </span>
      </button>
      <button
        className={`flex flex-col items-center justify-center w-[calc(100vw/6)] h-[calc(100vw/6)] md:w-auto md:h-auto md:min-w-[120px] md:px-4 md:py-3 rounded focus:outline-none relative`}
        onClick={() => navigate(`/${countrySlug}/auction-market`)}
      >
        <div
          className={`p-2 md:p-6 rounded mb-2 w-full h-full flex items-center justify-center ${
            isActive("/auction-market")
              ? "bg-[#1306ad] text-white font-bold"
              : " bg-[#1306ad2e]  text-white"
          }`}
        >
          <img
            src="/images/icons/gavel.png"
            alt="auction-market"
            className="w-10 h-10 md:w-12 md:h-12"
            style={{
              filter: isActive("/auction-market") ? "invert(1)" : "invert(0)",
            }}
          />
        </div>
        <span className="text-[8.5px] md:text-sm absolute bottom-[-20px] ">
          Chợ Nổi
          <br />
          Auction
        </span>
      </button>
      <button
        className={`flex flex-col items-center justify-center w-[calc(100vw/6)] h-[calc(100vw/6)] md:w-auto md:h-auto md:min-w-[120px] md:px-4 md:py-3 rounded focus:outline-none relative`}
        onClick={() => navigate(`/${countrySlug}/transportation`)}
      >
        <div
          className={`p-2 md:p-6 rounded mb-2 w-full h-full flex items-center justify-center ${
            isActive("/transportation")
              ? "bg-[#1306ad] text-white font-bold"
              : " bg-[#1306ad2e]  text-white"
          }`}
        >
          <img
            src="/images/icons/3118007.png"
            alt="transportation"
            className="w-10 h-10 md:w-12 md:h-12"
            style={{
              filter: isActive("/transportation") ? "invert(1)" : "invert(0)",
            }}
          />
        </div>
        <span className="text-[8.5px] md:text-sm absolute bottom-[-20px] ">
          Chành Vận
          <br />
          Chuyển
        </span>
      </button>
      <button
        className={`flex flex-col items-center justify-center w-[calc(100vw/6)] h-[calc(100vw/6)] md:w-auto md:h-auto md:min-w-[120px] md:px-4 md:py-3 rounded focus:outline-none relative`}
        onClick={() => navigate(`/${countrySlug}/processing-plant`)}
      >
        <div
          className={`p-2 md:p-6 rounded mb-2 w-full h-full flex items-center justify-center ${
            isActive("/processing-plant")
              ? "bg-[#1306ad] text-white font-bold"
              : " bg-[#1306ad2e]  text-white"
          }`}
        >
          <img
            src="/images/icons/manufacturing-plant-icon-29.jpg"
            alt="transportation"
            className="w-10 h-10 md:w-12 md:h-12"
            style={{
              filter: isActive("/processing-plant") ? "invert(1)" : "invert(0)",
            }}
          />
        </div>
        <span className="text-[8.5px] md:text-sm absolute bottom-[-20px] ">
          Nhà Máy
          <br />
          Chế Biến
        </span>
      </button>
    </div>
  );
}
