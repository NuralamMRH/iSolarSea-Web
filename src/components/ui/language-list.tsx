import React from "react";
import { useLanguageStore } from "@/stores/language-store";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import type { Language } from "@/types/language";

export function LanguageList() {
  const { language, setLanguage } = useLanguageStore();
  const { toast } = useToast();

  const handleLanguageChange = (e: React.MouseEvent, lang: Language) => {
    e.preventDefault();
    e.stopPropagation();

    if (lang === language) return;
    setLanguage(lang);
    toast({
      title: lang === "en" ? "Language Changed" : "Đã thay đổi ngôn ngữ",
      description:
        lang === "en" ? "Switched to English" : "Đã chuyển sang Tiếng Việt",
      duration: 2000,
      variant: "default",
    });
  };

  return (
    <>
      <li className="header__right-subitem">
        <button
          className={`header__right-sublink header__right-sublink--lang ${
            language === "vi" ? "active" : ""
          }`}
          style={{ background: language === "vi" ? "#31b1d6" : "" }}
          onClick={(e) => handleLanguageChange(e, "vi")}
        >
          Tiếng Việt
        </button>
      </li>
      <li className="header__right-subitem">
        <button
          className={`header__right-sublink header__right-sublink--lang ${
            language === "en" ? "active" : ""
          }`}
          style={{ background: language === "en" ? "#31b1d6" : "" }}
          onClick={(e) => handleLanguageChange(e, "en")}
        >
          English
        </button>
      </li>
    </>
  );
}
