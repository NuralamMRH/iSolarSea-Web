interface TranslationCache {
  [key: string]: string;
}

class GoogleTranslateService {
  private cache: TranslationCache = {};
  private apiKey: string | null = null;
  private baseUrl = 'https://translate.googleapis.com/translate_a/single';

  constructor() {
    // Try to get API key from environment variables
    this.apiKey = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY || null;
  }

  private getCacheKey(text: string, targetLang: string): string {
    return `${text}_${targetLang}`;
  }

  private async translateWithFreeAPI(text: string, targetLang: string): Promise<string> {
    try {
      const url = `${this.baseUrl}?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data[0] && data[0][0] && data[0][0][0]) {
        return data[0][0][0];
      }
      
      throw new Error('Invalid translation response');
    } catch (error) {
      console.warn('Free translation failed:', error);
      return text; // Return original text if translation fails
    }
  }

  private async translateWithPaidAPI(text: string, targetLang: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Google Translate API key not found');
    }

    try {
      const url = `https://translation.googleapis.com/language/translate/v2?key=${this.apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: 'en',
          target: targetLang,
          format: 'text'
        })
      });

      if (!response.ok) {
        throw new Error(`Translation API failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.data && data.data.translations && data.data.translations[0]) {
        return data.data.translations[0].translatedText;
      }
      
      throw new Error('Invalid API translation response');
    } catch (error) {
      console.warn('Paid translation failed:', error);
      throw error;
    }
  }

  async translate(text: string, targetLang: string): Promise<string> {
    if (!text || targetLang === 'en') {
      return text;
    }

    const cacheKey = this.getCacheKey(text, targetLang);
    
    // Check cache first
    if (this.cache[cacheKey]) {
      return this.cache[cacheKey];
    }

    try {
      let translatedText: string;
      
      // Try paid API first if available, then fall back to free API
      if (this.apiKey) {
        try {
          translatedText = await this.translateWithPaidAPI(text, targetLang);
        } catch {
          translatedText = await this.translateWithFreeAPI(text, targetLang);
        }
      } else {
        translatedText = await this.translateWithFreeAPI(text, targetLang);
      }

      // Cache the result
      this.cache[cacheKey] = translatedText;
      
      return translatedText;
    } catch (error) {
      console.error('Translation failed:', error);
      return text; // Return original text if all translation methods fail
    }
  }

  async translateObject(obj: any, targetLang: string): Promise<any> {
    if (typeof obj === 'string') {
      return await this.translate(obj, targetLang);
    }
    
    if (Array.isArray(obj)) {
      const translatedArray = [];
      for (const item of obj) {
        translatedArray.push(await this.translateObject(item, targetLang));
      }
      return translatedArray;
    }
    
    if (obj && typeof obj === 'object') {
      const translatedObj: any = {};
      for (const [key, value] of Object.entries(obj)) {
        translatedObj[key] = await this.translateObject(value, targetLang);
      }
      return translatedObj;
    }
    
    return obj;
  }

  clearCache(): void {
    this.cache = {};
  }

  getCacheSize(): number {
    return Object.keys(this.cache).length;
  }
}

export const googleTranslateService = new GoogleTranslateService();

// Language code mapping for Google Translate
export const GOOGLE_TRANSLATE_LANGUAGE_MAP: Record<string, string> = {
  'bn': 'bn', // Bengali
  'vi': 'vi', // Vietnamese
  'en': 'en', // English
  'hi': 'hi', // Hindi
  'th': 'th', // Thai
  'ms': 'ms', // Malay
  'id': 'id', // Indonesian
  'tl': 'tl', // Filipino
  'my': 'my', // Myanmar
  'pt': 'pt', // Portuguese (Timor-Leste)
};

export const getGoogleTranslateLanguageCode = (languageCode: string): string => {
  return GOOGLE_TRANSLATE_LANGUAGE_MAP[languageCode] || 'en';
};