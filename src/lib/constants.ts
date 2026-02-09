// Global application constants
export const APP_CONFIG = {
  // API Configuration - Fixed for Ubuntu server deployment
  API_URL:
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? "http://localhost:5173" : "https://itrucksea.com"),
  APP_NAME: import.meta.env.VITE_APP_NAME || "iTruckSea",

  // Server Configuration
  SERVER_PORT: import.meta.env.VITE_SERVER_PORT || "8080",

  // Feature Flags
  ENABLE_EMAIL_VERIFICATION:
    import.meta.env.VITE_ENABLE_EMAIL_VERIFICATION === "true",
  ENABLE_PHONE_VERIFICATION:
    import.meta.env.VITE_ENABLE_PHONE_VERIFICATION === "true",

  // Supabase Configuration
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  FILE_UPLOAD: "/api/file-upload",
  TESSERACT_OCR: "/api/tesseract-ocr",
  FILE_DELETE: "/api/file-delete",
} as const;

// Application Routes
export const ROUTES = {
  HOME: "/",
  DASHBOARD: "/dashboard",
  VESSEL_MANAGEMENT: "/vessel-management",
  FISHING_LOG: "/fishing-log",
} as const;

// File Upload Configuration
export const FILE_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/jpg", "image/png", "image/gif"],
  ALLOWED_DOCUMENT_TYPES: [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
  ],
} as const;

export const GOOGLE_API_KEY = "AIzaSyC0ZgDjbyrwSMvf-8uniK8eKzgNYXL9LfQ";

// Location Tracking Configuration
export const LOCATION_CONFIG = {
  DEFAULT_TRACKING_INTERVAL: 30000, // 30 seconds
  LOCATION_ACCURACY_HIGH: true,
  LOCATION_TIMEOUT: 8000, // Reduced from 30 seconds to 8 seconds for faster fallback
  STORE_LOCATION_HISTORY: true,
  MAX_RETRY_ATTEMPTS: 2, // Reduced from 3 to 2 for faster fallback
  RETRY_DELAY: 2000, // Reduced from 5 seconds to 2 seconds
} as const;
