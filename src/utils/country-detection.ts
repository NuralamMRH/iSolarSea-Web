import { DEFAULT_COUNTRY, getCountryByCode, getCountryByUrlSlug, isCountrySupported, isUrlSlugSupported, getDefaultCountry } from '@/config/countries';

interface IPLocationResponse {
  country_code?: string;
  country?: string;
}

class CountryDetectionService {
  private detectedCountry: string | null = null;
  private ipDetectionCache: string | null = null;

  /**
   * Extract country code from URL path using URL slug
   * e.g., /vietnam/transportation/2share-loading -> 'vn'
   */
  getCountryFromURL(pathname: string = window.location.pathname): string | null {
    const pathSegments = pathname.split('/').filter(Boolean);
    
    if (pathSegments.length > 0) {
      const potentialUrlSlug = pathSegments[0].toLowerCase();
      
      if (isUrlSlugSupported(potentialUrlSlug)) {
        const country = getCountryByUrlSlug(potentialUrlSlug);
        return country?.code || null;
      }
    }
    
    return null;
  }

  /**
   * Remove country slug from URL path
   * e.g., /vietnam/transportation/2share-loading -> /transportation/2share-loading
   */
  removeCountryFromPath(pathname: string): string {
    const pathSegments = pathname.split('/').filter(Boolean);
    
    if (pathSegments.length > 0) {
      const potentialUrlSlug = pathSegments[0].toLowerCase();
      
      if (isUrlSlugSupported(potentialUrlSlug)) {
        return '/' + pathSegments.slice(1).join('/');
      }
    }
    
    return pathname;
  }

  /**
   * Add country slug to URL path
   * e.g., /transportation/2share-loading + 'vn' -> /vietnam/transportation/2share-loading
   */
  addCountryToPath(pathname: string, countryCode: string): string {
    const cleanPath = this.removeCountryFromPath(pathname);
    const country = getCountryByCode(countryCode);
    const urlSlug = country?.urlSlug || countryCode;
    
    // Handle root path specially
    if (cleanPath === '/' || cleanPath === '') {
      return `/${urlSlug}`;
    }
    
    const normalizedPath = cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath;
    return `/${urlSlug}${normalizedPath}`;
  }

  /**
   * Detect country from IP address using a free IP geolocation service
   */
  async detectCountryFromIP(): Promise<string> {
    if (this.ipDetectionCache) {
      return this.ipDetectionCache;
    }

    try {
      // Try multiple free IP geolocation services
      const services = [
        'https://ipapi.co/json/',
        'https://ip-api.com/json/',
        'https://ipinfo.io/json'
      ];

      for (const serviceUrl of services) {
        try {
          const response = await fetch(serviceUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });

          if (response.ok) {
            const data: IPLocationResponse = await response.json();
            const countryCode = (data.country_code || data.country || '').toLowerCase();
            
            if (countryCode && isCountrySupported(countryCode)) {
              this.ipDetectionCache = countryCode;
              return countryCode;
            }
          }
        } catch (error) {
          console.warn(`IP detection service ${serviceUrl} failed:`, error);
          continue;
        }
      }
    } catch (error) {
      console.warn('IP-based country detection failed:', error);
    }

    // Fallback to default country
    this.ipDetectionCache = DEFAULT_COUNTRY;
    return DEFAULT_COUNTRY;
  }

  /**
   * Get country from browser language settings
   */
  getCountryFromBrowserLanguage(): string | null {
    try {
      const language = navigator.language || navigator.languages?.[0];
      
      if (language) {
        // Extract country code from language tag (e.g., 'en-US' -> 'us')
        const parts = language.split('-');
        if (parts.length > 1) {
          const countryCode = parts[1].toLowerCase();
          if (isCountrySupported(countryCode)) {
            return countryCode;
          }
        }
      }
    } catch (error) {
      console.warn('Browser language detection failed:', error);
    }
    
    return null;
  }

  /**
   * Get country from localStorage
   */
  getCountryFromStorage(): string | null {
    try {
      const storedCountry = localStorage.getItem('selected-country');
      if (storedCountry && isCountrySupported(storedCountry)) {
        return storedCountry;
      }
    } catch (error) {
      console.warn('Storage country detection failed:', error);
    }
    
    return null;
  }

  /**
   * Save country to localStorage
   */
  saveCountryToStorage(countryCode: string): void {
    try {
      localStorage.setItem('selected-country', countryCode);
    } catch (error) {
      console.warn('Failed to save country to storage:', error);
    }
  }

  /**
   * Comprehensive country detection with priority order:
   * 1. URL path
   * 2. localStorage
   * 3. IP geolocation
   * 4. Browser language
   * 5. Default country
   */
  async detectCountry(pathname?: string): Promise<string> {
    if (this.detectedCountry) {
      return this.detectedCountry;
    }

    // 1. Check URL first
    const urlCountry = this.getCountryFromURL(pathname);
    if (urlCountry) {
      this.detectedCountry = urlCountry;
      this.saveCountryToStorage(urlCountry);
      return urlCountry;
    }

    // 2. Check IP geolocation
    const ipCountry = await this.detectCountryFromIP();
    if (ipCountry) {
      this.detectedCountry = ipCountry;
      this.saveCountryToStorage(ipCountry);
      return ipCountry;
    }

    // 3. Check localStorage
    const storedCountry = this.getCountryFromStorage();
    if (storedCountry) {
      this.detectedCountry = storedCountry;
      return storedCountry;
    }

    // 4. Check browser language
    const browserCountry = this.getCountryFromBrowserLanguage();
    if (browserCountry) {
      this.detectedCountry = browserCountry;
      this.saveCountryToStorage(browserCountry);
      return browserCountry;
    }

    // 5. Fallback to default country
    this.detectedCountry = DEFAULT_COUNTRY;
    this.saveCountryToStorage(DEFAULT_COUNTRY);
    return DEFAULT_COUNTRY;
  }

  /**
   * Reset detection cache
   */
  resetDetection(): void {
    this.detectedCountry = null;
    this.ipDetectionCache = null;
  }

  /**
   * Check if current URL has country code
   */
  hasCountryInURL(pathname: string = window.location.pathname): boolean {
    return this.getCountryFromURL(pathname) !== null;
  }
}

export const countryDetectionService = new CountryDetectionService();

// Utility functions
export const detectCountryFromURL = (pathname?: string) => 
  countryDetectionService.getCountryFromURL(pathname);

export const removeCountryFromPath = (pathname: string) => 
  countryDetectionService.removeCountryFromPath(pathname);

export const addCountryToPath = (pathname: string, countryCode: string) => 
  countryDetectionService.addCountryToPath(pathname, countryCode);

export const detectCountry = (pathname?: string) => 
  countryDetectionService.detectCountry(pathname);