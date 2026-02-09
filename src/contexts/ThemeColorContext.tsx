import React, { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useThemeColor } from "@/hooks/use-theme-color";

type ThemeColorContextType = {
  setThemeColor: (color: string) => void;
  currentThemeColor: string;
};

const ThemeColorContext = createContext<ThemeColorContextType | undefined>(
  undefined
);

export function ThemeColorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentThemeColor, setCurrentThemeColor] = useState("#001c5c");
  const location = useLocation();

  // Auto-detect theme color based on route
  useEffect(() => {
    const path = location.pathname;

    // Dashboard routes use dark blue theme
    if (
      path.startsWith("/dashboard") ||
      path.startsWith("/request-to-dock") ||
      path.startsWith("/fishing-log") ||
      path.startsWith("/vessel-management") ||
      path.startsWith("/processing-plant") ||
      path.startsWith("/vessel-invitation") ||
      path.startsWith("/auction-market")
    ) {
      setCurrentThemeColor("#001c5c");
    } else {
      // Public routes use light theme
      setCurrentThemeColor("#005a74");
    }
  }, [location.pathname]);

  // Apply the theme color
  useThemeColor(currentThemeColor);

  const setThemeColor = (color: string) => {
    setCurrentThemeColor(color);
  };

  return (
    <ThemeColorContext.Provider value={{ setThemeColor, currentThemeColor }}>
      {children}
    </ThemeColorContext.Provider>
  );
}

export function useThemeColorContext() {
  const context = useContext(ThemeColorContext);
  if (context === undefined) {
    throw new Error(
      "useThemeColorContext must be used within a ThemeColorProvider"
    );
  }
  return context;
}
