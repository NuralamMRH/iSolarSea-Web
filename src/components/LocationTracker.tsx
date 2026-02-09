import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { LOCATION_CONFIG } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";
import { locationService } from "@/lib/location-service";
import { LocationPermissionGuide } from "./LocationPermissionGuide";

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
}

interface LocationTrackerProps {
  onLocationUpdate?: (location: UserLocation) => void;
  trackingInterval?: number; // in milliseconds
  storeInSupabase?: boolean;
  showToast?: boolean;
  children?: React.ReactNode;
}

export const LocationTracker: React.FC<LocationTrackerProps> = ({
  onLocationUpdate,
  trackingInterval = LOCATION_CONFIG.DEFAULT_TRACKING_INTERVAL,
  storeInSupabase = true,
  showToast = false,
  children,
}: LocationTrackerProps) => {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [showPermissionGuide, setShowPermissionGuide] = useState(false);
  const { toast } = useToast();
  // Minimal DOM Permission typings to avoid any casts
  type PermissionState = "granted" | "prompt" | "denied";
  interface PermissionStatus { state: PermissionState }
  interface GeolocationPermissionDescriptor { name: "geolocation" }
  interface Permissions {
    query(desc: GeolocationPermissionDescriptor): Promise<PermissionStatus>;
  }
  const { user } = useAuth();

  // Detect if we're on desktop
  const isDesktop = !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

  // Start online-aware tracking via the service
  const startTracking = () => {
    setIsLoading(true);
    locationService.startWatchingLocation(
      (loc) => {
        setUserLocation(loc);
        setIsLoading(false);
        if (onLocationUpdate) onLocationUpdate(loc);
        // store handled inside service when STORE_LOCATION_HISTORY is true
      },
      (err) => {
        const errorString = String(err);
        
        // Log more informative error messages instead of generic "Tracking error"
        if (errorString.includes("denied") || errorString.includes("code: 1")) {
          console.info("Location access denied by user - this is normal behavior");
        } else if (errorString.includes("timeout") || errorString.includes("code: 3")) {
          console.info("Location request timed out - falling back to IP location");
        } else if (errorString.includes("unavailable") || errorString.includes("code: 2")) {
          console.info("Location services unavailable - using IP fallback");
        } else {
          console.warn("Location tracking issue:", errorString);
        }
        
        // Check if it's a permission or timeout error that would benefit from the guide
        if (errorString.includes("denied") || errorString.includes("timeout") || errorString.includes("code: 1") || errorString.includes("code: 3")) {
          setShowPermissionGuide(true);
        }
        
        setError("Location access denied or unavailable.");
        setIsLoading(false);
        
        // Only show toast for unexpected errors, not common user denials
        if (showToast && !errorString.includes("denied") && !errorString.includes("code: 1")) {
          toast({
            title: "Location Notice",
            description: "Using approximate location based on IP address.",
            variant: "default",
          });
        }
      },
      trackingInterval
    );
    setIsTracking(true);
  };

  useEffect(() => {
    if (!user?.auth_id) {
      // Ensure any existing watch is stopped when unauthenticated
      locationService.stopWatchingLocation();
      setIsTracking(false);
      return;
    }

    // Inform user about permission status (non-blocking)
    if (showToast && typeof navigator !== "undefined" && "permissions" in navigator) {
      (async () => {
        try {
          const perms = (navigator as Navigator & { permissions: Permissions }).permissions;
          const status = await perms.query({ name: "geolocation" });
          if (status.state === "prompt") {
            toast({
              title: "Enable Location",
              description: "Please allow location access to enable tracking.",
            });
          } else if (status.state === "granted") {
            toast({
              title: "Location Tracking",
              description: "Tracking is enabled and running.",
            });
          } else if (status.state === "denied") {
            toast({
              title: "Location Denied",
              description: "Please enable location in browser settings.",
              variant: "destructive",
            });
          }
        } catch (e) {
          // Ignore permission API errors; proceed to start tracking
        }
      })();
    }

    startTracking();

    // Clean up watch on unmount or when dependencies change
    return () => {
      locationService.stopWatchingLocation();
      setIsTracking(false);
    };
  }, [user?.auth_id, trackingInterval]);

  const handleRetryLocation = () => {
    setShowPermissionGuide(false);
    setError(null);
    startTracking();
  };

  // Show permission guide if there's a location error
  if (showPermissionGuide) {
    return (
      <LocationPermissionGuide 
        isDesktop={isDesktop}
        onRetry={handleRetryLocation}
      />
    );
  }

  return <>{children}</>;
};

export default LocationTracker;
