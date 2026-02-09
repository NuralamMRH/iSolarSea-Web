import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getCountryByCode, DEFAULT_COUNTRY, DEFAULT_LANGUAGE } from "@/config/countries";
import { countryDetectionService } from "@/utils/country-detection";

type Language = "vi" | "en" | "bn" | "hi" | "th" | "ms" | "id" | "tl" | "my" | "pt";

interface LanguageState {
  language: Language;
  country: string;
  setLanguage: (language: Language) => void;
  setCountry: (country: string) => void;
  setCountryAndLanguage: (country: string) => void;
}

const storage = {
  getItem: async (name: string): Promise<string | null> => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(name);
  },
};

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: DEFAULT_LANGUAGE as Language,
      country: DEFAULT_COUNTRY,
      setLanguage: (language) => set({ language }),
      setCountry: (country) => {
        // Preserve current language; only update country
        set({ country });
        // Reset country detection cache and save to storage
        countryDetectionService.resetDetection();
        try {
          localStorage.setItem('selected-country', country);
        } catch (error) {
          console.warn('Failed to save country to localStorage:', error);
        }
      },
      setCountryAndLanguage: (country) => {
        const countryConfig = getCountryByCode(country);
        if (countryConfig) {
          set({ 
            country, 
            language: countryConfig.language as Language 
          });
          // Reset country detection cache and save to storage
          countryDetectionService.resetDetection();
          try {
            localStorage.setItem('selected-country', country);
          } catch (error) {
            console.warn('Failed to save country to localStorage:', error);
          }
        } else {
          // If unknown, still set country without changing language
          set({ country });
        }
      },
    }),
    {
      name: "language-storage",
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({ 
        language: state.language, 
        country: state.country 
      }),
    }
  )
);
