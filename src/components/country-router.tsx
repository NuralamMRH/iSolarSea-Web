import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguageStore } from '@/stores/language-store';
import { countryDetectionService } from '@/utils/country-detection';
import { getCountryByCode, DEFAULT_COUNTRY } from '@/config/countries';

interface CountryRouterProps {
  children: React.ReactNode;
}

export const CountryRouter: React.FC<CountryRouterProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setCountry, country } = useLanguageStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const initializeCountryRouting = async () => {
      if (isInitialized || isRedirecting) return;

      setIsRedirecting(true);
      
      try {
        const currentPath = location.pathname;
        const urlCountry = countryDetectionService.getCountryFromURL(currentPath);
        
        if (urlCountry) {
          // URL already has a valid country code
          const countryConfig = getCountryByCode(urlCountry);
          if (countryConfig && countryConfig.enabled) {
            setCountry(urlCountry);
            setIsInitialized(true);
            setIsRedirecting(false);
            return;
          }
        }

        // No valid country in URL, detect and redirect
        const detectedCountry = await countryDetectionService.detectCountry(currentPath);
        const countryConfig = getCountryByCode(detectedCountry);
        
        if (countryConfig && countryConfig.enabled) {
          // Update store
          setCountry(detectedCountry);
          
          // Redirect to country-specific URL
          const newPath = countryDetectionService.addCountryToPath(currentPath, detectedCountry);
          
          // Only redirect if the path actually changes
          if (newPath !== currentPath) {
            navigate(newPath, { replace: true });
          }
        } else {
          // Fallback to default country
          setCountry(DEFAULT_COUNTRY);
          const newPath = countryDetectionService.addCountryToPath(currentPath, DEFAULT_COUNTRY);
          
          if (newPath !== currentPath) {
            navigate(newPath, { replace: true });
          }
        }
      } catch (error) {
        // Fallback to default country
        setCountry(DEFAULT_COUNTRY);
        const newPath = countryDetectionService.addCountryToPath(location.pathname, DEFAULT_COUNTRY);
        
        if (newPath !== location.pathname) {
          navigate(newPath, { replace: true });
        }
      } finally {
        setIsInitialized(true);
        setIsRedirecting(false);
      }
    };

    initializeCountryRouting();
  }, [location.pathname, navigate, setCountry, isInitialized, isRedirecting]);

  // Handle country changes from other parts of the app
  useEffect(() => {
    if (!isInitialized || isRedirecting) return;

    const currentPath = location.pathname;
    const urlCountry = countryDetectionService.getCountryFromURL(currentPath);
    
    // If URL country doesn't match store country, update URL
    if (urlCountry !== country) {
      const pathWithoutCountry = countryDetectionService.removeCountryFromPath(currentPath);
      const newPath = countryDetectionService.addCountryToPath(pathWithoutCountry, country);
      
      if (newPath !== currentPath) {
        navigate(newPath, { replace: true });
      }
    }
  }, [country, location.pathname, navigate, isInitialized, isRedirecting]);

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Initializing...</span>
      </div>
    );
  }

  return <>{children}</>;
};

export default CountryRouter;