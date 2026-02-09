import React, { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2 } from "lucide-react";
import { useLanguageStore } from "@/stores/language-store";

interface LocationState {
  latitude: number;
  longitude: number;
  address: string;
  loading: boolean;
  error: string | null;
  permissionGranted: boolean;
  accuracy?: number;
}

// Add cache interface
interface AddressCache {
  [key: string]: {
    address: string;
    timestamp: number;
  };
}

interface OpenSeaMapViewProps {
  onLocationUpdate?: (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
}

interface NominatimAddress {
  water?: string;
  bay?: string;
  harbour?: string;
  coast?: string;
  sea?: string;
  road?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  country?: string;
  display_name?: string;
  address?: {
    water?: string;
    bay?: string;
    harbour?: string;
    coast?: string;
    sea?: string;
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

// Translations
const translations = {
  en: {
    locationAccessRequired: "Location Access Required",
    enableLocationServices:
      "Please enable location services in your browser to use this feature. This helps us accurately record your catch location.",
    gettingLocation: "Getting your location...",
    currentLocation: "Current Location",
    accuracy: "Accuracy",
    meters: "m",
    tryAgain: "Try Again",
    cancel: "Cancel",
    useDefaultLocation: "Use Default Location",
    locationDenied:
      "Location access was denied. Please enable it in your browser settings.",
    locationUnavailable:
      "Location information is unavailable. Please try again.",
    locationTimeout: "Location request timed out after 30 seconds. Please ensure GPS is enabled and try again, or move to an area with better signal reception.",
    retryingLocation: "Trying to get your location...",
    usingDefaultLocation:
      "Could not get your current location. Using default location.",
    browserNotSupported: "Geolocation is not supported by your browser.",
  },
  vi: {
    locationAccessRequired: "Yêu Cầu Truy Cập Vị Trí",
    enableLocationServices:
      "Vui lòng bật dịch vụ vị trí trong trình duyệt của bạn để sử dụng tính năng này. Điều này giúp chúng tôi ghi lại chính xác vị trí đánh bắt của bạn.",
    gettingLocation: "Đang lấy vị trí của bạn...",
    currentLocation: "Vị Trí Hiện Tại",
    accuracy: "Độ Chính Xác",
    meters: "m",
    tryAgain: "Thử Lại",
    cancel: "Hủy",
    useDefaultLocation: "Sử Dụng Vị Trí Mặc Định",
    locationDenied:
      "Quyền truy cập vị trí bị từ chối. Vui lòng bật trong cài đặt trình duyệt.",
    locationUnavailable: "Không thể lấy thông tin vị trí. Vui lòng thử lại.",
    locationTimeout: "Yêu cầu vị trí đã hết thời gian sau 30 giây. Vui lòng đảm bảo GPS được bật và thử lại, hoặc di chuyển đến khu vực có tín hiệu tốt hơn.",
    retryingLocation: "Đang thử lấy vị trí của bạn...",
    usingDefaultLocation:
      "Không thể lấy vị trí hiện tại. Đang sử dụng vị trí mặc định.",
    browserNotSupported: "Trình duyệt của bạn không hỗ trợ định vị.",
  },
};

// Custom marker icon
const customIcon = new L.Icon({
  iconUrl: "/images/icons/fishing.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32], // Point of the icon which will correspond to marker's location
  popupAnchor: [0, -32], // Point from which the popup should open relative to the iconAnchor
  className: "custom-marker-icon", // Add a custom class for styling if needed
});

// Default location (fallback)
const DEFAULT_LOCATION = {
  latitude: 13.7563, // Bangkok
  longitude: 100.5018,
  address: "Default Location",
};

// Component to handle map updates
function MapUpdater({
  location,
}: {
  location: { latitude: number; longitude: number };
}) {
  const map = useMap();
  const hasSetInitialView = useRef(false);

  useEffect(() => {
    // Only set view on initial render or when location significantly changes
    if (!hasSetInitialView.current) {
      map.setView([location.latitude, location.longitude], 13);
      hasSetInitialView.current = true;
    } else {
      // If location changes by more than 0.0001 degrees (roughly 10 meters)
      const currentCenter = map.getCenter();
      const locationChanged =
        Math.abs(currentCenter.lat - location.latitude) > 0.0001 ||
        Math.abs(currentCenter.lng - location.longitude) > 0.0001;

      if (locationChanged) {
        // Animate to new location without resetting zoom
        map.panTo([location.latitude, location.longitude], {
          animate: true,
          duration: 1,
        });
      }
    }
  }, [location, map]);

  return null;
}

const OpenSeaMapView: React.FC<OpenSeaMapViewProps> = ({
  onLocationUpdate,
}) => {
  const { language } = useLanguageStore();
  const t =
    translations[language as keyof typeof translations] || translations.en;

  // Add cache and rate limiting refs
  const addressCache = useRef<AddressCache>({});
  const lastRequestTime = useRef<number>(0);
  const requestQueue = useRef<Array<() => void>>([]);
  const isProcessingQueue = useRef<boolean>(false);
  const geolocationRetryCount = useRef<number>(0);
  const MAX_GEOLOCATION_RETRIES = 3;

  const [location, setLocation] = useState<LocationState>({
    latitude: DEFAULT_LOCATION.latitude,
    longitude: DEFAULT_LOCATION.longitude,
    address: DEFAULT_LOCATION.address,
    loading: true,
    error: null,
    permissionGranted: false,
  });

  const [showAlert, setShowAlert] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const [watchId, setWatchId] = useState<number | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  const MIN_UPDATE_INTERVAL = 2000; // Minimum 2 seconds between updates

  const checkLocationPermission = async (): Promise<PermissionState> => {
    try {
      const result = await navigator.permissions.query({ name: "geolocation" });
      return result.state;
    } catch (error) {
      console.error("Error checking location permission:", error);
      return "denied";
    }
  };

  // Add rate limiting function
  const processRequestQueue = useCallback(async () => {
    if (isProcessingQueue.current || requestQueue.current.length === 0) {
      return;
    }

    isProcessingQueue.current = true;
    while (requestQueue.current.length > 0) {
      const request = requestQueue.current.shift();
      if (request) {
        await request();
        // Wait 1 second between requests to respect Nominatim's rate limit
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    isProcessingQueue.current = false;
  }, []);

  // Add a function to handle failed requests
  const handleFailedRequest = (
    lat: number,
    lon: number,
    cacheKey: string
  ): string => {
    const fallbackAddress = `${lat.toFixed(6)}, ${lon.toFixed(6)} (${
      t.currentLocation
    })`;
    addressCache.current[cacheKey] = {
      address: fallbackAddress,
      timestamp: Date.now(),
    };
    return fallbackAddress;
  };

  const getAddressFromCoordinates = async (lat: number, lon: number) => {
    // Check cache first
    const cacheKey = `${lat.toFixed(6)},${lon.toFixed(6)}`;

    try {
      const cachedResult = addressCache.current[cacheKey];
      const now = Date.now();

      // Return cached result if it's less than 5 minutes old
      if (cachedResult && now - cachedResult.timestamp < 5 * 60 * 1000) {
        return cachedResult.address;
      }

      // Create a promise that will be resolved when it's our turn to make the request
      return new Promise<string>((resolve) => {
        const makeRequest = async () => {
          try {
            // Add timeout promise
            const timeoutPromise = new Promise<Response>((_, reject) => {
              setTimeout(() => reject(new Error("Request timeout")), 5000);
            });

            // Try with different zoom levels
            for (const zoom of [18, 16, 14, 12]) {
              try {
                const now = Date.now();
                const timeSinceLastRequest = now - lastRequestTime.current;

                // Ensure at least 1 second between requests
                if (timeSinceLastRequest < 1000) {
                  await new Promise((resolve) =>
                    setTimeout(resolve, 1000 - timeSinceLastRequest)
                  );
                }

                // Create fetch promise
                const fetchPromise = fetch(
                  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=${language}&zoom=${zoom}&addressdetails=1`,
                  {
                    headers: {
                      "User-Agent": "itrucksea-trace-link/1.0",
                    },
                    // Add signal for timeout
                    signal: AbortSignal.timeout(5000),
                  }
                );

                // Race between fetch and timeout
                const response = await fetchPromise;
                lastRequestTime.current = Date.now();

                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                if (!data.error) {
                  const address = formatAddress(data);
                  if (address) {
                    // Cache the successful result
                    addressCache.current[cacheKey] = {
                      address,
                      timestamp: Date.now(),
                    };
                    resolve(address);
                    return;
                  }
                }
              } catch (error) {
                // Silently continue to next zoom level
                if (zoom === 12) {
                  // Only resolve with fallback if we've tried all zoom levels
                  resolve(handleFailedRequest(lat, lon, cacheKey));
                }
                continue;
              }
            }

            // If no address found or all requests failed, return coordinates
            resolve(handleFailedRequest(lat, lon, cacheKey));
          } catch (error) {
            // Resolve with fallback address instead of rejecting
            resolve(handleFailedRequest(lat, lon, cacheKey));
          }
        };

        requestQueue.current.push(makeRequest);
        processRequestQueue();
      });
    } catch (error) {
      // Final fallback
      return handleFailedRequest(lat, lon, cacheKey);
    }
  };

  const formatAddress = (data: NominatimAddress) => {
    if (!data.address) {
      return data.display_name || null;
    }

    const addr = data.address;
    const parts = [];

    // Add water-related locations first
    if (addr.water) parts.push(addr.water);
    if (addr.bay) parts.push(addr.bay);
    if (addr.harbour) parts.push(addr.harbour);
    if (addr.coast) parts.push(addr.coast);
    if (addr.sea) parts.push(addr.sea);

    // Then add land locations
    if (addr.road) parts.push(addr.road);
    if (addr.suburb) parts.push(addr.suburb);
    if (addr.city || addr.town || addr.village)
      parts.push(addr.city || addr.town || addr.village);
    if (addr.state) parts.push(addr.state);
    if (addr.country) parts.push(addr.country);

    return parts.length > 0 ? parts.join(", ") : null;
  };

  const handleLocationSuccess = async (position: GeolocationPosition) => {
    try {
      const now = Date.now();
      if (now - lastUpdateTime < MIN_UPDATE_INTERVAL) {
        return;
      }
      setLastUpdateTime(now);

      const { latitude, longitude, accuracy } = position.coords;

      // Reset retry count on success
      geolocationRetryCount.current = 0;

      // First update with coordinates only
      const initialUpdate = {
        latitude,
        longitude,
        address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        loading: true,
        error: null,
        permissionGranted: true,
        accuracy,
      };

      setLocation(initialUpdate);
      onLocationUpdate?.(initialUpdate);

      // Then fetch address
      const address = await getAddressFromCoordinates(latitude, longitude);

      const finalUpdate = {
        ...initialUpdate,
        address,
        loading: false,
      };

      setLocation(finalUpdate);
      setShowAlert(false);
      setRetryCount(0);
      onLocationUpdate?.(finalUpdate);
    } catch (error) {
      console.error("Error handling location success:", error);
      handleLocationError({
        code: 2,
        message: "Failed to process location data",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      });
    }
  };

  const handleLocationError = (error: GeolocationPositionError) => {
    let errorMessage = t.enableLocationServices;

    if (error.code === 1) {
      // PERMISSION_DENIED
      errorMessage = t.locationDenied;
      setLocation((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
        permissionGranted: false,
      }));
      setShowAlert(true);
    } else if (error.code === 2 || error.code === 3) {
      // POSITION_UNAVAILABLE or TIMEOUT
      if (geolocationRetryCount.current < MAX_GEOLOCATION_RETRIES) {
        // Increment retry count
        geolocationRetryCount.current++;

        // Exponential backoff for retries (2s, 4s, 8s)
        const retryDelay = Math.pow(2, geolocationRetryCount.current) * 1000;

        setTimeout(() => {
          getCurrentLocation();
        }, retryDelay);

        errorMessage = t.retryingLocation;
        setLocation((prev) => ({
          ...prev,
          loading: true,
          error: errorMessage,
          permissionGranted: true,
        }));
      } else {
        // Max retries reached, use default location
        errorMessage = t.usingDefaultLocation;
        handleLocationSuccess({
          coords: {
            latitude: DEFAULT_LOCATION.latitude,
            longitude: DEFAULT_LOCATION.longitude,
            accuracy: 1000,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          } as GeolocationCoordinates,
          timestamp: Date.now(),
        } as GeolocationPosition);
        setShowAlert(false);
      }
    }
  };

  const getCurrentLocation = useCallback(() => {
    if ("geolocation" in navigator) {
      // Clear existing watch
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }

      // Get initial position with increased timeout
      navigator.geolocation.getCurrentPosition(
        handleLocationSuccess,
        handleLocationError,
        {
          enableHighAccuracy: true,
          timeout: 15000, // Increased to 15 seconds
          maximumAge: 0,
        }
      );

      // Start watching with a longer timeout
      const id = navigator.geolocation.watchPosition(
        handleLocationSuccess,
        handleLocationError,
        {
          enableHighAccuracy: true,
          timeout: 30000, // Increased to 30 seconds
          maximumAge: 5000, // Allow 5 seconds old cached positions
        }
      );

      setWatchId(id);
    } else {
      setLocation((prev) => ({
        ...prev,
        loading: false,
        error: t.browserNotSupported,
        permissionGranted: false,
      }));
      setShowAlert(true);
    }
  }, [watchId, t]);

  useEffect(() => {
    const initLocation = async () => {
      const permissionStatus = await checkLocationPermission();
      if (permissionStatus === "granted" || permissionStatus === "prompt") {
        getCurrentLocation();
      } else {
        setShowAlert(true);
        setLocation((prev) => ({
          ...prev,
          loading: false,
          error: t.locationDenied,
          permissionGranted: false,
        }));
      }
    };

    initLocation();

    // Cleanup function
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [getCurrentLocation, t]);

  // Only show loading when we have no coordinates
  if (location.loading && !location.latitude && !location.longitude) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-gray-100">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">{t.gettingLocation}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {showAlert && !location.permissionGranted && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm mx-4">
            <h3 className="text-lg font-bold mb-2">
              {t.locationAccessRequired}
            </h3>
            <p className="text-gray-600 mb-4">
              {location.error || t.enableLocationServices}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAlert(false);
                  if (retryCount >= MAX_RETRIES) {
                    onLocationUpdate?.({
                      latitude: DEFAULT_LOCATION.latitude,
                      longitude: DEFAULT_LOCATION.longitude,
                      address: DEFAULT_LOCATION.address,
                    });
                  }
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                {retryCount >= MAX_RETRIES ? t.useDefaultLocation : t.cancel}
              </button>
              {retryCount < MAX_RETRIES && (
                <button
                  onClick={() => {
                    setShowAlert(false);
                    setRetryCount(0);
                    getCurrentLocation();
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {t.tryAgain}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={`w-full h-[300px] rounded-lg overflow-hidden`}>
        {location.latitude !== 0 && location.longitude !== 0 && (
          <MapContainer
            center={[location.latitude, location.longitude]}
            zoom={13}
            style={{ height: "100%", width: "100%", zIndex: 0 }}
            zoomControl={true}
            scrollWheelZoom={true}
            doubleClickZoom={true}
            dragging={true}
          >
            <TileLayer
              url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
              attribution='&copy; <a href="http://www.openseamap.org">OpenSeaMap</a> contributors'
            />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <Marker
              position={[location.latitude, location.longitude]}
              icon={customIcon}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{t.currentLocation}</p>
                  <p className="text-gray-600">{location.address}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {location.latitude.toFixed(6)},{" "}
                    {location.longitude.toFixed(6)}
                  </p>
                  {location.accuracy && (
                    <p className="text-gray-500 text-xs mt-1">
                      {t.accuracy}: ±{Math.round(location.accuracy)}
                      {t.meters}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
            <MapUpdater location={location} />
          </MapContainer>
        )}
      </div>
    </div>
  );
};

export default OpenSeaMapView;
