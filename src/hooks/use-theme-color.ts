import { useEffect } from "react";

export function useThemeColor(color: string) {
  useEffect(() => {
    // Update the meta theme-color tag
    let metaThemeColor = document.querySelector(
      'meta[property="og:theme-color"]'
    );

    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.setAttribute("property", "og:theme-color");
      document.head.appendChild(metaThemeColor);
    }

    metaThemeColor.setAttribute("content", color);

    // Also update the theme-color meta tag for mobile browsers
    let mobileThemeColor = document.querySelector('meta[name="theme-color"]');

    if (!mobileThemeColor) {
      mobileThemeColor = document.createElement("meta");
      mobileThemeColor.setAttribute("name", "theme-color");
      document.head.appendChild(mobileThemeColor);
    }

    mobileThemeColor.setAttribute("content", color);

    // Also update the msapplication-TileColor for Windows tiles
    let tileColor = document.querySelector(
      'meta[name="msapplication-TileColor"]'
    );

    if (!tileColor) {
      tileColor = document.createElement("meta");
      tileColor.setAttribute("name", "msapplication-TileColor");
      document.head.appendChild(tileColor);
    }

    tileColor.setAttribute("content", color);
  }, [color]);
}
