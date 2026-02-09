import React from "react";
import { Button } from "@/components/ui/button";
import { useLanguageStore } from "@/stores/language-store";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguageStore();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={language === "vi" ? "default" : "outline"}
        size="sm"
        onClick={() => setLanguage("vi")}
        className={`w-20 h-9 p-0 text-sm ${
          language === "vi" ? " text-white" : "bg-white text-blue-800"
        }`}
      >
        VI
      </Button>
      <Button
        variant={language === "en" ? "default" : "outline"}
        size="sm"
        onClick={() => setLanguage("en")}
        className={`w-20 h-9 p-0 text-sm ${
          language === "en" ? " text-white" : "bg-white text-blue-800"
        }`}
      >
        EN
      </Button>
    </div>
  );
}
