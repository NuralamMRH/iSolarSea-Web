export interface CountryConfig {
  code: string;
  name: string;
  urlSlug: string; // URL path segment
  language: string;
  flag: string;
  enabled: boolean;
}

export const SUPPORTED_COUNTRIES: CountryConfig[] = [
  {
    code: 'id',
    name: 'Indonesia',
    urlSlug: 'indo',
    language: 'id',
    flag: '🇮🇩',
    enabled: true
  },
  {
    code: 'tl',
    name: 'Timor-Leste',
    urlSlug: 'timo',
    language: 'tl',
    flag: '🇹🇱',
    enabled: true
  },
  {
    code: 'vn',
    name: 'Vietnam',
    urlSlug: 'viet',
    language: 'vi',
    flag: '🇻🇳',
    enabled: true
  },
  // {
  //   code: 'ph',
  //   name: 'Philippines',
  //   urlSlug: 'philippines',
  //   language: 'tl',
  //   flag: '🇵🇭',
  //   enabled: true
  // },
  // {
  //   code: 'kh',
  //   name: 'Cambodia',
  //   urlSlug: 'cambodia',
  //   language: 'km',
  //   flag: '🇰🇭',
  //   enabled: true
  // },
  // {
  //   code: 'th',
  //   name: 'Thailand',
  //   urlSlug: 'thailand',
  //   language: 'th',
  //   flag: '🇹🇭',
  //   enabled: true
  // },
  // {
  //   code: 'sg',
  //   name: 'Singapore',
  //   urlSlug: 'singapore',
  //   language: 'en',
  //   flag: '🇸🇬',
  //   enabled: true
  // }
];

export const DEFAULT_COUNTRY = 'id';
export const DEFAULT_LANGUAGE = 'id';

export const getCountryByCode = (code: string): CountryConfig | undefined => {
  return SUPPORTED_COUNTRIES.find(country => country.code === code && country.enabled);
};

export const getCountryByUrlSlug = (urlSlug: string): CountryConfig | undefined => {
  return SUPPORTED_COUNTRIES.find(country => country.urlSlug === urlSlug && country.enabled);
};

export const getCountryByLanguage = (language: string): CountryConfig | undefined => {
  return SUPPORTED_COUNTRIES.find(country => country.language === language && country.enabled);
};

export const isCountrySupported = (code: string): boolean => {
  return SUPPORTED_COUNTRIES.some(country => country.code === code && country.enabled);
};

export const isUrlSlugSupported = (urlSlug: string): boolean => {
  return SUPPORTED_COUNTRIES.some(country => country.urlSlug === urlSlug && country.enabled);
};

export const getEnabledCountries = (): CountryConfig[] => {
  return SUPPORTED_COUNTRIES.filter(country => country.enabled);
};

export const getDefaultCountry = (): CountryConfig => {
  return getCountryByCode(DEFAULT_COUNTRY)!;
};