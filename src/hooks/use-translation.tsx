import { useCallback, useEffect, useState } from "react";
import { useLanguageStore } from "@/stores/language-store";
import { vi } from "@/translations/vietnamese";
import { en } from "@/translations/english";
import { id as idTranslations } from "@/translations/indonesia";
import { tl as tlTranslations } from "@/translations/timorleste";
import { googleTranslateService, getGoogleTranslateLanguageCode } from "@/utils/google-translate";

// Create a type for our translations structure
type TranslationsType = typeof vi;

// Helper type for creating dot notation path strings
type DotPrefix<T extends string> = T extends "" ? "" : `.${T}`;

type DotNestedKeys<T> = (
  T extends object
    ? {
        [K in Exclude<keyof T, symbol>]: `${K}${DotPrefix<
          DotNestedKeys<T[K]>
        >}`;
      }[Exclude<keyof T, symbol>]
    : ""
) extends infer D
  ? Extract<D, string>
  : never;

export const useTranslation = () => {
  const { language } = useLanguageStore();

  const baseTranslations: Record<string, TranslationsType> = {
    vi,
    en,
    id: idTranslations as TranslationsType,
    tl: tlTranslations as TranslationsType,
  };

  const [currentTranslations, setCurrentTranslations] = useState<TranslationsType>(
    baseTranslations[language] || en
  );

  useEffect(() => {
    let isMounted = true;

    const applyTranslations = async () => {
      const available = baseTranslations[language];
      if (available) {
        if (isMounted) setCurrentTranslations(available);
        return;
      }

      // Fallback to English immediately
      if (isMounted) setCurrentTranslations(en);

      // Optional: attempt auto-translation from English
      try {
        const targetLang = getGoogleTranslateLanguageCode(language);
        const translatedObj = await googleTranslateService.translateObject(en, targetLang);
        if (isMounted && translatedObj) {
          setCurrentTranslations(translatedObj as TranslationsType);
        }
      } catch (err) {
        console.warn("Auto-translation failed; using English fallback.", err);
      }
    };

    applyTranslations();

    return () => {
      isMounted = false;
    };
  }, [language]);

  const t = useCallback(
    (
      key: DotNestedKeys<TranslationsType>,
      params?: Record<string, string | number>
    ) => {
      const keys = key.split(".");
      let translation: any = currentTranslations;

      for (const k of keys) {
        if (
          !translation ||
          typeof translation !== "object" ||
          !(k in translation)
        ) {
          console.warn(`Translation key not found: ${key}`);
          return key;
        }

        translation = translation[k as keyof typeof translation];
      }

      let str = translation as string;
      if (params && typeof str === "string") {
        Object.keys(params).forEach((k) => {
          str = str.replace(new RegExp(`{{${k}}}`, "g"), String(params[k]));
        });
      }
      return str;
    },
    [currentTranslations]
  );

  return { t };
};
