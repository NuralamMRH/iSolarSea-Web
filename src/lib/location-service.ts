import { supabase } from "@/integrations/supabase/client";
import { GOOGLE_API_KEY, LOCATION_CONFIG } from "./constants";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { APP_CONFIG } from "@/lib/constants";
// Add Google Maps types
declare global {
  interface Window {
    google?: {
      maps?: {
        Map: unknown;
        Marker: unknown;
        LatLng: unknown;
        places: unknown;
        Geocoder: unknown;
      };
    };
  }
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp?: string;
}

// Define the database schema for user_locations table
interface UserLocationRecord {
  id?: string;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: string;
  zone?: string | null;
}

export class LocationService {
  private static instance: LocationService;
  private currentLocation: UserLocation | null = null;
  private locationWatchId: number | null = null;
  private googleMapsLoaded = false;
  private offlineQueue: UserLocationRecord[] = [];
  private onlineHandler: ((e: Event) => void) | null = null;
  private offlineHandler: ((e: Event) => void) | null = null;
  private lastSubmittedKey: string | null = null;

  private constructor() {}

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Check the status of location services
   * This helps diagnose issues with geolocation
   */
  public async checkLocationStatus(): Promise<{
    browserSupport: boolean;
    permissionStatus: string;
    highAccuracy: boolean;
    errors: string[];
  }> {
    const result = {
      browserSupport: false,
      permissionStatus: "unknown",
      highAccuracy: false,
      errors: [] as string[],
    };

    // Check if browser supports geolocation
    if (!navigator.geolocation) {
      result.errors.push("Browser does not support geolocation");
      return result;
    }

    result.browserSupport = true;

    // Check permission status
    try {
      if (navigator.permissions) {
        const permissionStatus = await navigator.permissions.query({
          name: "geolocation" as PermissionName,
        });
        result.permissionStatus = permissionStatus.state;

        if (permissionStatus.state === "denied") {
          result.errors.push(
            "Location permission is denied. Please enable location access in your browser settings."
          );
        } else if (permissionStatus.state === "prompt") {
          result.errors.push(
            "Location permission has not been granted yet. You will be prompted when getting location."
          );
        }
      } else {
        result.errors.push("Permissions API not available in this browser");
      }
    } catch (error) {
      console.error("Error checking location permissions:", error);
      result.errors.push(`Error checking permissions: ${String(error)}`);
    }

    // Check if high accuracy is available
    // This is a best-effort check, as there's no direct API to check this
    try {
      // Try to get location with high accuracy to see if it works
      const highAccuracyPromise = new Promise<boolean>((resolve) => {
        const options = {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        };

        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          (error) => {
            if (
              error.code === error.POSITION_UNAVAILABLE &&
              error.message.includes("kCLErrorLocationUnknown")
            ) {
              // This is a common iOS error when location services are initializing
              // It doesn't necessarily mean high accuracy is unavailable
              resolve(true);
            } else {
              resolve(false);
            }
          },
          options
        );
      });

      result.highAccuracy = await highAccuracyPromise;
      if (!result.highAccuracy) {
        result.errors.push(
          "High accuracy mode may not be available. Location might be less precise."
        );
      }
    } catch (error) {
      console.error("Error checking high accuracy:", error);
    }

    // Check if we can connect to our server API
    try {
      // Use relative URL to leverage the Vite proxy
      const apiUrl = "/api/get-location";
      console.log(`Trying server API endpoint: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: "HEAD",
        cache: "no-cache",
      });

      if (!response.ok) {
        result.errors.push(
          `Server API endpoint is not responding correctly (status: ${response.status})`
        );
      }
    } catch (error) {
      console.error(
        "Error connecting to server API:",
        error instanceof Error ? error.message : String(error)
      );
      result.errors.push(
        "Cannot connect to server API endpoint. Fallback services will be used."
      );
    }

    return result;
  }

  /**
   * Initialize Google Maps API
   */
  public async initGoogleMaps(): Promise<boolean> {
    if (this.googleMapsLoaded) return true;

    try {
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        this.googleMapsLoaded = true;
        return true;
      }

      // Initialize Google Maps API via functional API with proper error handling
      setOptions({ 
        key: GOOGLE_API_KEY, 
        v: "weekly", 
        libraries: ["places", "geometry"] // Add geometry library for better location calculations
      });
      
      // Load the core maps library
      await importLibrary("maps");
      console.log("Google Maps core library loaded successfully");
      
      // Load additional libraries with error handling
      try {
        await importLibrary("places");
        console.log("Google Places library loaded successfully");
      } catch (placesError) {
        console.warn("Google Places library failed to load:", placesError);
      }

      try {
        await importLibrary("geometry");
        console.log("Google Geometry library loaded successfully");
      } catch (geometryError) {
        console.warn("Google Geometry library failed to load:", geometryError);
      }

      // Verify that Google Maps is properly initialized
      if (window.google && window.google.maps) {
        this.googleMapsLoaded = true;
        console.log("Google Maps API initialized successfully");
        return true;
      } else {
        throw new Error("Google Maps API failed to initialize properly");
      }
    } catch (error) {
      console.error("Error loading Google Maps:", error);
      this.googleMapsLoaded = false;
      return false;
    }
  }

  /**
   * Get user's current location using browser geolocation with Google Maps enhancement
   */
  public async getCurrentLocation(retryCount: number = 0): Promise<UserLocation> {
    // Try to initialize Google Maps first
    await this.initGoogleMaps();

    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        // Detect if we're on a desktop device
        const isDesktop = !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
        
        // Use more aggressive settings for faster response
        const options = {
          enableHighAccuracy: false, // Use network location for all devices for faster response
          timeout: 8000, // Reduced timeout to 8 seconds for faster fallback
          maximumAge: 60000, // Allow cached location up to 1 minute
        };

        // Log that we're attempting to get location
        console.log(`Attempting to get geolocation (attempt ${retryCount + 1}/${LOCATION_CONFIG.MAX_RETRY_ATTEMPTS + 1}) on ${isDesktop ? 'desktop' : 'mobile'} with options:`, options);

        // Set up a race condition between geolocation and IP fallback
        const geolocationPromise = new Promise<UserLocation>((geoResolve, geoReject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log("Geolocation success:", position.coords);
              const location: UserLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                heading: position.coords.heading || undefined,
                speed: position.coords.speed || undefined,
                timestamp: new Date().toISOString(),
              };
              geoResolve(location);
            },
            (error) => {
              geoReject(error);
            },
            options
          );
        });

        // Set up IP-based fallback with shorter timeout
        const ipFallbackPromise = new Promise<UserLocation>((ipResolve, ipReject) => {
          setTimeout(async () => {
            try {
              console.log("Attempting IP-based location fallback");
              const ipLocation = await this.getIPBasedLocation();
              ipResolve(ipLocation);
            } catch (error) {
              ipReject(error);
            }
          }, 5000); // Start IP fallback after 5 seconds
        });

        // Race between geolocation and IP fallback
        Promise.race([geolocationPromise, ipFallbackPromise])
          .then((location) => {
            this.currentLocation = location;
            resolve(location);
          })
          .catch(async (error) => {
            // More detailed error logging
            console.error("Geolocation error code:", error.code);
            console.error("Geolocation error message:", error.message);

            // Provide more specific error messages based on error code
            let errorMessage = "Unknown geolocation error";
            switch (error.code) {
              case 1:
                errorMessage = isDesktop 
                  ? "Location access denied. Please click the location icon in your browser's address bar and allow location access, then refresh the page."
                  : "Location access denied. Please check your browser settings and ensure location access is allowed.";
                break;
              case 2:
                errorMessage = isDesktop
                  ? "Location unavailable. Desktop browsers rely on network-based location. Please ensure you have a stable internet connection."
                  : "Location unavailable. Please ensure location services are enabled on your device.";
                break;
              case 3:
                errorMessage = isDesktop
                  ? "Location timeout. Desktop browsers may take longer to determine location. Please ensure you have a stable internet connection and try again."
                  : "Location timeout. Please ensure location services are enabled and try again.";
                break;
            }

            // Retry logic for timeout errors (code 3)
            if (error.code === 3 && retryCount < LOCATION_CONFIG.MAX_RETRY_ATTEMPTS) {
              console.log(`Retrying geolocation (attempt ${retryCount + 2}/${LOCATION_CONFIG.MAX_RETRY_ATTEMPTS + 1}) after ${LOCATION_CONFIG.RETRY_DELAY}ms delay`);
              setTimeout(() => {
                this.getCurrentLocation(retryCount + 1)
                  .then(resolve)
                  .catch(reject);
              }, LOCATION_CONFIG.RETRY_DELAY);
              return;
            }

            // If all retries failed or it's not a timeout error, try IP-based fallback
            try {
              console.log("Falling back to IP-based geolocation");
              const ipLocation = await this.getIPBasedLocation();
              console.log("IP-based location obtained:", ipLocation);
              this.currentLocation = ipLocation;
              resolve(ipLocation);
            } catch (ipError) {
              console.error("IP geolocation fallback failed:", ipError);
              reject(
                new Error(`${errorMessage}. All fallback methods failed.`)
              );
            }
          });
      } else {
        console.warn("Browser doesn't support geolocation API");
        // Browser doesn't support geolocation, try IP-based
        this.getIPBasedLocation()
          .then((location) => {
            console.log(
              "IP-based location obtained as primary source:",
              location
            );
            this.currentLocation = location;
            resolve(location);
          })
          .catch((error) => {
            console.error("IP geolocation failed as primary source:", error);
            reject(
              new Error(
                "Geolocation not supported and IP-based location failed"
              )
            );
          });
      }
    });
  }

  /**
   * Get location using Google Maps Geolocation API
   */
  private async getGoogleMapsLocation(): Promise<UserLocation> {
    // Check if we have the Google Maps API loaded
    if (!window.google || !window.google.maps) {
      await this.initGoogleMaps();
      if (!window.google || !window.google.maps) {
        throw new Error("Google Maps API not available");
      }
    }

    return new Promise((resolve, reject) => {
      try {
        // Use Google Maps Geolocation API for better accuracy and reliability
        const map = new window.google.maps.Map(document.createElement('div'));
        
        // Try to get user's location using Google Maps geolocation
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              try {
                // Use Google Maps to enhance the location data
                const geocoder = new window.google.maps.Geocoder();
                const latLng = new window.google.maps.LatLng(
                  position.coords.latitude,
                  position.coords.longitude
                );

                // Validate the location using Google Maps
                geocoder.geocode({ location: latLng }, (results, status) => {
                  if (status === 'OK' && results && results[0]) {
                    console.log("Google Maps location validation successful");
                    resolve({
                      latitude: position.coords.latitude,
                      longitude: position.coords.longitude,
                      accuracy: position.coords.accuracy,
                      timestamp: new Date().toISOString(),
                    });
                  } else {
                    // Even if geocoding fails, return the position
                    console.warn("Google Maps geocoding failed, but returning position:", status);
                    resolve({
                      latitude: position.coords.latitude,
                      longitude: position.coords.longitude,
                      accuracy: position.coords.accuracy,
                      timestamp: new Date().toISOString(),
                    });
                  }
                });
              } catch (geocodeError) {
                console.warn("Google Maps geocoding error:", geocodeError);
                // Return the basic position even if geocoding fails
                resolve({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                  timestamp: new Date().toISOString(),
                });
              }
            },
            (error) => {
              console.error("Google Maps enhanced geolocation failed:", error);
              reject(error);
            },
            {
              enableHighAccuracy: false, // Use network location for faster response
              timeout: 8000, // Shorter timeout for faster fallback
              maximumAge: 60000, // Allow cached location up to 1 minute
            }
          );
        } else {
          reject(new Error("Geolocation not supported"));
        }
      } catch (error) {
        console.error("Google Maps location error:", error);
        reject(error);
      }
    });
  }

  /**
   * Start watching user's location with specified interval
   */
  public startWatchingLocation(
    callback: (location: UserLocation) => void,
    errorCallback?: (error: unknown) => void,
    interval: number = LOCATION_CONFIG.DEFAULT_TRACKING_INTERVAL
  ): void {
    // Clear any existing watch
    this.stopWatchingLocation();

    // Set up online/offline listeners
    this.onlineHandler = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (authUser) {
          await this.flushOfflineQueue(authUser.id);
        }
      } catch (e) {
        console.error("Error flushing offline queue on online:", e);
      }
    };
    this.offlineHandler = () => {
      // No-op; we keep collecting locations and queue them
    };
    window.addEventListener("online", this.onlineHandler);
    window.addEventListener("offline", this.offlineHandler);

    // Prefer browser geolocation continuous watch when available
    if (
      navigator.geolocation &&
      typeof navigator.geolocation.watchPosition === "function"
    ) {
      const id = navigator.geolocation.watchPosition(
        async (position) => {
          const location: UserLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
          };
          this.currentLocation = location;
          callback(location);
          if (LOCATION_CONFIG.STORE_LOCATION_HISTORY) {
            await this.storeLocationInSupabase(location);
          }
        },
        async (error) => {
          if (errorCallback) errorCallback(error);
          // Fallback: try a one-off current location with our robust chain
          if (error && (error.code === 2 || error.code === 3)) {
            try {
              const location = await this.getCurrentLocation();
              this.currentLocation = location;
              callback(location);
              if (LOCATION_CONFIG.STORE_LOCATION_HISTORY) {
                await this.storeLocationInSupabase(location);
              }
            } catch (e) {
              // If even fallback fails, keep letting the watch retry
              console.warn(
                "Fallback getCurrentLocation failed after watch error:",
                e
              );
            }
          }
        },
        {
          enableHighAccuracy: LOCATION_CONFIG.LOCATION_ACCURACY_HIGH,
          timeout: LOCATION_CONFIG.LOCATION_TIMEOUT,
          maximumAge: 0,
        }
      );
      this.locationWatchId = id as unknown as number; // DOM watch id is number
    } else {
      // Fallback: poll at interval using getCurrentLocation
      this.getCurrentLocation()
        .then(async (location) => {
          this.currentLocation = location;
          callback(location);
          if (LOCATION_CONFIG.STORE_LOCATION_HISTORY) {
            await this.storeLocationInSupabase(location);
          }
        })
        .catch((error) => {
          if (errorCallback) errorCallback(error);
        });

      this.locationWatchId = window.setInterval(async () => {
        try {
          const location = await this.getCurrentLocation();
          this.currentLocation = location;
          callback(location);
          if (LOCATION_CONFIG.STORE_LOCATION_HISTORY) {
            await this.storeLocationInSupabase(location);
          }
        } catch (error) {
          if (errorCallback) errorCallback(error);
        }
      }, interval);
    }
  }

  /**
   * Stop watching user's location
   */
  public stopWatchingLocation(): void {
    if (this.locationWatchId !== null) {
      try {
        // Attempt to clear geolocation watch if applicable
        if (
          navigator.geolocation &&
          typeof navigator.geolocation.clearWatch === "function"
        ) {
          navigator.geolocation.clearWatch(this.locationWatchId);
        } else {
          window.clearInterval(this.locationWatchId);
        }
      } catch {
        window.clearInterval(this.locationWatchId);
      }
      this.locationWatchId = null;
    }
    if (this.onlineHandler) {
      window.removeEventListener("online", this.onlineHandler);
      this.onlineHandler = null;
    }
    if (this.offlineHandler) {
      window.removeEventListener("offline", this.offlineHandler);
      this.offlineHandler = null;
    }
  }

  /**
   * Get location based on IP address (fallback method)
   */
  private async getIPBasedLocation(): Promise<UserLocation> {
    try {
      console.log("Attempting IP geolocation with multiple fallback options");

      // Try the server API endpoint with correct port (8080 instead of 5173)
      try {
        // Use absolute URL with correct port for Express server
        const apiUrl = `/api/get-location`;
        console.log(`Trying server API endpoint: ${apiUrl}`);

        const response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        console.log(`IP API status: ${response.status}`);
        const data = await response.json();
        console.log("IP API response:", data);

        if (
          response.ok &&
          data &&
          typeof data.latitude === "number" &&
          typeof data.longitude === "number"
        ) {
          return {
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: 1000, // IP geolocation is typically not very accurate (1km)
            timestamp: new Date().toISOString(),
          };
        } else {
          console.warn(
            "Server API returned invalid location data, trying fallbacks"
          );
        }
      } catch (error) {
        console.error(
          "Server API geolocation failed:",
          error instanceof Error ? error.message : String(error)
        );
      }

      // First fallback - try ipinfo.io which has good CORS support
      try {
        console.log("Trying ipinfo.io as fallback");
        const response = await fetch("https://ipinfo.io/json", {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log("IP location data from ipinfo.io:", data);

          if (data.loc) {
            const [latitude, longitude] = data.loc.split(",").map(Number);
            return {
              latitude,
              longitude,
              accuracy: 1000, // IP geolocation is typically not very accurate (1km)
              timestamp: new Date().toISOString(),
            };
          }
        }
      } catch (ipinfoError) {
        console.error(
          "ipinfo.io geolocation failed:",
          ipinfoError instanceof Error
            ? ipinfoError.message
            : String(ipinfoError)
        );
      }

      // Second fallback - try geolocation-db.com
      try {
        const response = await fetch("https://geolocation-db.com/json/", {
          method: "GET",
        });

        if (response.ok) {
          const data = await response.json();
          console.log("IP location data from geolocation-db:", data);

          if (data.latitude && data.longitude) {
            return {
              latitude: parseFloat(data.latitude),
              longitude: parseFloat(data.longitude),
              accuracy: 1000,
              timestamp: new Date().toISOString(),
            };
          }
        }
      } catch (error) {
        console.error(
          "geolocation-db.com geolocation failed:",
          error instanceof Error ? error.message : String(error)
        );
      }

      // If all services fail, throw error to use default location
      throw new Error("All IP geolocation services failed");
    } catch (error) {
      console.error(
        "IP geolocation error:",
        error instanceof Error ? error.message : String(error)
      );
      // Return a default location as last resort
      return {
        latitude: 0,
        longitude: 0,
        accuracy: 10000,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Store location in Supabase
   */
  public async storeLocationInSupabase(location: UserLocation): Promise<void> {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error(
          "Location submission failed: authentication error",
          authError
        );
        return;
      }

      // Compute zone label by nearest seaport (EC30-style label)
      let computedZone: string | null = null;
      try {
        const { computeZoneByNearestSeaport } = await import(
          "@/lib/zone-utils"
        );
        const zoneInfo = await computeZoneByNearestSeaport(
          location.latitude,
          location.longitude
        );
        computedZone = zoneInfo.zoneName;
      } catch (e) {
        console.warn("Zone computation failed; proceeding without zone:", e);
      }

      const locationRecord: UserLocationRecord = {
        user_id: user.id,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        heading: location.heading,
        speed: location.speed,
        timestamp: location.timestamp || new Date().toISOString(),
        zone: computedZone,
      };

      // Deduplicate identical consecutive submissions within same second
      const key = `${Math.round(locationRecord.latitude * 1e6)}:${Math.round(
        locationRecord.longitude * 1e6
      )}:${new Date(locationRecord.timestamp).getSeconds()}`;
      if (this.lastSubmittedKey === key) {
        console.log("Skipping duplicate location submission", {
          latitude: locationRecord.latitude,
          longitude: locationRecord.longitude,
          timestamp: locationRecord.timestamp,
        });
        return;
      }
      if (!navigator.onLine) {
        // Queue while offline
        this.offlineQueue.push(locationRecord);
        console.log("Offline: queued location for later submission", {
          latitude: locationRecord.latitude,
          longitude: locationRecord.longitude,
          timestamp: locationRecord.timestamp,
        });
        return;
      }

      const { error } = await supabase
        .from("user_locations")
        .insert(locationRecord as unknown as never);
      if (error) {
        console.error("Location submission failed:", error);
      } else {
        console.log("Location submitted successfully", {
          latitude: locationRecord.latitude,
          longitude: locationRecord.longitude,
          timestamp: locationRecord.timestamp,
        });
        this.lastSubmittedKey = key;
        await this.updateDefaultVesselPosition({
          ...location,
          timestamp: locationRecord.timestamp,
        });
        await this.storeVesselLocationIfDefault(location);
      }
    } catch (error) {
      console.error("Location submission unexpected error:", error);
    }
  }

  private async flushOfflineQueue(authUserId: string): Promise<void> {
    if (this.offlineQueue.length === 0) return;
    try {
      const batch = this.offlineQueue.splice(0, this.offlineQueue.length);
      // Ensure user_id matches current auth user
      const normalized = batch.map((r) => ({ ...r, user_id: authUserId }));
      const { error } = await supabase
        .from("user_locations")
        .insert(normalized as unknown as never[]);
      if (error) {
        console.error("Error flushing offline locations:", error);
      } else if (normalized.length > 0) {
        console.log("Flushed offline locations successfully", {
          count: normalized.length,
          lastTimestamp: normalized[normalized.length - 1].timestamp,
        });
        const last = normalized[normalized.length - 1];
        await this.updateDefaultVesselPosition({
          latitude: last.latitude,
          longitude: last.longitude,
          accuracy: last.accuracy,
          timestamp: last.timestamp,
        });
      }
    } catch (e) {
      console.error("Error during offline queue flush:", e);
    }
  }

  private async updateDefaultVesselPosition(
    location: UserLocation
  ): Promise<void> {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      // Fetch the application user profile to get default_vessel
      const { data: appUser, error: userError } = await supabase
        .from("users")
        .select("default_vessel")
        .eq("auth_id", authUser.id)
        .single();

      if (userError) {
        // Some projects might not have default_vessel in types or row
        console.warn("Unable to fetch default vessel:", userError);
        return;
      }

      type UsersDefaultVesselRow = { default_vessel: string | null };
      const defaultVesselId =
        (appUser as UsersDefaultVesselRow)?.default_vessel ?? null;
      if (!defaultVesselId) return;

      // Compute zone label for vessel current position (EC30-style)
      let currentZone: string | null = null;
      try {
        const { computeZoneByNearestSeaport } = await import(
          "@/lib/zone-utils"
        );
        const zoneInfo = await computeZoneByNearestSeaport(
          location.latitude,
          location.longitude
        );
        currentZone = zoneInfo.zoneName;
      } catch (e) {
        console.warn("Vessel zone computation failed:", e);
      }

      const { error: vesselErr } = await supabase
        .from("vessels")
        .update({
          latitude: String(location.latitude),
          longitude: String(location.longitude),
          current_zone: currentZone,
        } as unknown as never)
        .eq("id", defaultVesselId);

      if (vesselErr) {
        console.error("Failed to update vessel position:", vesselErr);
      }
    } catch (e) {
      console.error("Error updating default vessel position:", e);
    }
  }

  private async storeVesselLocationIfDefault(
    location: UserLocation
  ): Promise<void> {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      // Fetch default vessel id
      const { data: appUser, error: userError } = await supabase
        .from("users")
        .select("default_vessel")
        .eq("auth_id", authUser.id)
        .single();

      if (userError) {
        console.warn(
          "Unable to fetch default vessel for vessel locations:",
          userError
        );
        return;
      }

      const defaultVesselId = (appUser as { default_vessel: string | null })
        ?.default_vessel;
      if (!defaultVesselId) return;
    } catch (e) {
      console.error("Error inserting vessel location:", e);
    }
  }

  /**
   * Get user's location history from Supabase
   */
  public async getLocationHistory(
    userId: string,
    limit: number = 10,
    startDate?: Date,
    endDate?: Date
  ): Promise<UserLocation[]> {
    let query = supabase
      .from("user_locations")
      .select("*")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (startDate) {
      query = query.gte("timestamp", startDate.toISOString());
    }

    if (endDate) {
      query = query.lte("timestamp", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching location history:", error);
      return [];
    }

    return data as UserLocation[];
  }
}

// Export singleton instance
export const locationService = LocationService.getInstance();
