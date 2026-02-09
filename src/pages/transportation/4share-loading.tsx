import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import TopButtons from "@/components/top-buttons";
import { useEffect, useState, useMemo } from "react";
import { getCurrentUser, supabase } from "@/lib/supabase";
import { toDataURL } from "qrcode";
import type { Database } from "@/integrations/supabase/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import QRCode from "react-qr-code";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Fix Leaflet default markers in Vite
const leafletProto = L.Icon.Default.prototype as unknown as Record<
  string,
  unknown
>;
delete (leafletProto as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL(
    "leaflet/dist/images/marker-icon-2x.png",
    import.meta.url
  ).toString(),
  iconUrl: new URL(
    "leaflet/dist/images/marker-icon.png",
    import.meta.url
  ).toString(),
  shadowUrl: new URL(
    "leaflet/dist/images/marker-shadow.png",
    import.meta.url
  ).toString(),
});

import { useLanguageStore } from "@/stores/language-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { PDFDownloadLink, pdf } from "@react-pdf/renderer";
import { DeparturePDF } from "@/components/dashboard/DeparturePDF"; // adjust path as needed
import { useTranslation } from "@/hooks/use-translation";
import { useAuthStore } from "@/stores/auth-store";
import { useVesselAccess } from "@/hooks/use-vessel-access";
import { Toast } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import transaction from "../processing-plant/transaction";
import { Link } from "react-router-dom";

// Utility functions for price conversion
const convertShorthandPrice = (value: string): number => {
  const lowerValue = value.toLowerCase();
  if (lowerValue.includes("k")) {
    return parseFloat(lowerValue.replace("k", "")) * 1000;
  } else if (lowerValue.includes("m")) {
    return parseFloat(lowerValue.replace("m", "")) * 1000000;
  } else if (lowerValue.includes("b")) {
    return parseFloat(lowerValue.replace("b", "")) * 1000000000;
  } else {
    return parseFloat(value) || 0;
  }
};

// Format number with commas
const formatNumberWithCommas = (value: string | number): string => {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) return "";
  return numValue.toLocaleString();
};

// Check if value should be converted from shorthand
const shouldConvertShorthand = (value: string): boolean => {
  return (
    value.toLowerCase().includes("k") ||
    value.toLowerCase().includes("m") ||
    value.toLowerCase().includes("b")
  );
};

// Parse input value and handle shorthand conversion
const parseInputValue = (value: string): string => {
  if (shouldConvertShorthand(value)) {
    const converted = convertShorthandPrice(value);
    return converted.toString();
  }
  return value;
};

// Initial form state
const initialForm = {
  vessel_id: "",
  owner: "",
  address: "",
  crew_count: "",
  vessel_type: "",
  departure_port: "",
  departure_province: "",
  to_region: "",
  place_of_departure: "",
  departure_date: "",
  trip_period: "",
  status: "Docking",
  number_of_crew: 0,
  vessel_registration_number: "",
  dock_province: "",
  place_of_dock: "",
  docking_date: "",
  total_trip_period: 0,
  zone_dept: "",
  to_port: "",
};

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

async function getCoordinatesFromAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&key=YOUR_API_KEY`
    );
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
  } catch (error) {
    console.error("Error geocoding address:", error);
  }
  return null;
}

function getDaysBetween(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const timeDiff = endDate.getTime() - startDate.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

// Type for vessel transaction
interface VesselTransaction {
  id: string;
  seller_vessel_id: string;
  buyer_vessel_id: string;
  catch_record_id?: string;
  quantity: number;
  unit: string;
  price: number;
  currency: string;
  status: string;
  qr_code?: string;
  transaction_date: string;
  created_at: string;
  trip_id?: string;
  type: string;
  items?: Record<string, unknown>;
  seller_vessel?: {
    id: string;
    name: string;
    registration_number: string;
    current_zone?: string;
  };
  buyer_vessel?: {
    id: string;
    name: string;
    registration_number: string;
    current_zone?: string;
  };
  trip?: {
    id: string;
    trip_code: string;
    departure_port_name?: string;
  };
}

// Type for product order (define locally if not in types)
interface ProductOrder {
  id: string;
  trip_id: string;
  tank_number: number;
  product_name: string;
  product_id: string;
  size: number;
  stock: number;
  type: string;
  quantity_load?: number;
  available_load?: number;
  price?: number;
  bid_price?: number;
  departure_date?: string;
  arrival_date?: string;
  created_at?: string;
  departure_port?: string; // Add this line
  zone_dept?: string; // Add this line
  catch_id?: string;
  to_port?: string;
}

function ShareContainer() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [trips, setTrips] = useState<
    Database["public"]["Tables"]["fishing_trips"]["Row"][]
  >([]);
  const [vessels, setVessels] = useState<
    Database["public"]["Tables"]["vessels"]["Row"][]
  >([]);
  const [vesselLoading, setVesselLoading] = useState(false);
  const [vesselError, setVesselError] = useState<string | null>(null);
  const [ports, setPorts] = useState<
    Database["public"]["Tables"]["seaports"]["Row"][]
  >([]);

  const [portNumber, setPortNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [successDialog, setSuccessDialog] = useState(false);
  const [submitted, setSubmitted] = useState<Record<string, string> | null>(
    null
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Pagination and search
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [dockQrUrl, setDockQrUrl] = useState<string | undefined>();

  // Map and tracking states
  const [trackedVesselId, setTrackedVesselId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState<Record<string, boolean>>({});
  const [showMapDialog, setShowMapDialog] = useState<Record<string, boolean>>(
    {}
  );
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [vesselLocations, setVesselLocations] = useState<
    Record<
      string,
      {
        current?: [number, number];
        departure?: [number, number];
        destination?: [number, number];
        route?: [number, number][];
        vesselId?: string;
        buyerVesselId?: string;
        distance?: number;
        speed?: number;
        duration?: number;
        eta?: Date;
        sellerVessel?: VesselTransaction["seller_vessel"];
        buyerVessel?: VesselTransaction["buyer_vessel"];
        lat?: number;
        lng?: number;
      }
    >
  >({});
  const [isLoadingMap, setIsLoadingMap] = useState<Record<string, boolean>>({});

  // QR Code dialog states
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | null
  >(null);
  const [tripQrUrl, setTripQrUrl] = useState<string | undefined>();
  const [vesselSearchTerm, setVesselSearchTerm] = useState<string>("");
  const [showVesselDropdown, setShowVesselDropdown] = useState<boolean>(false);
  const [tripSearchTerm, setTripSearchTerm] = useState<string>("");
  const [showTripDropdown, setShowTripDropdown] = useState<boolean>(false);
  const [portSearchTerm, setPortSearchTerm] = useState<string>("");
  const [showPortDropdown, setShowPortDropdown] = useState<boolean>(false);
  const [zoneCode, setZoneCode] = useState<string | null>(null);
  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const [vesselTransactions, setVesselTransactions] = useState<
    VesselTransaction[]
  >([]);
  const [userProfile, setUserProfile] = useState<
    Database["public"]["Tables"]["users"]["Row"] | null
  >(null);

  const { user, isAuthenticated } = useAuthStore();
  const userId = user?.auth_id;

  // Fetch user profile data from users table
  const fetchUserProfile = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", userId)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);
        return;
      }

      setUserProfile(data);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  // Track vessel functionality
  const handleTrackVessel = async (transactionId: string, vesselId: string) => {
    console.log("Track Vessel clicked:", { transactionId, vesselId });
    setShowMapDialog((prev) => ({ ...prev, [transactionId]: true }));
    setIsLoadingMap((prev) => ({ ...prev, [transactionId]: true }));

    // Find the transaction to get both vessel IDs
    const transaction = vesselTransactions.find((t) => t.id === transactionId);
    if (!transaction) {
      setIsLoadingMap((prev) => ({ ...prev, [transactionId]: false }));
      return;
    }

    try {
      // Get user location with better error handling
      if (navigator.geolocation) {
        const options = {
          enableHighAccuracy: true,
          timeout: 10000, // 10 seconds timeout
          maximumAge: 300000, // 5 minutes cache
        };

        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          (error) => {
            console.error("Geolocation error:", error);
            // Use fallback location (Manila, Philippines)
            setUserLocation({ lat: 14.5995, lng: 120.9842 });
          },
          options
        );
      } else {
        // Fallback if geolocation is not available
        setUserLocation({ lat: 14.5995, lng: 120.9842 });
      }

      // Fetch real vessel coordinates from database
      const getVesselLocation = async (vesselId: string) => {
        // First try to get latest location from vessel_locations table
        const { data: vesselLocationData, error: locationError } =
          await supabase
            .from("vessel_locations")
            .select("latitude, longitude, speed, heading, timestamp")
            .eq("vessel_id", vesselId)
            .order("timestamp", { ascending: false })
            .limit(1);

        if (
          !locationError &&
          vesselLocationData &&
          vesselLocationData.length > 0
        ) {
          const location = vesselLocationData[0];
          return {
            lat: parseFloat(String(location.latitude)),
            lng: parseFloat(String(location.longitude)),
            speed: location.speed ? parseFloat(String(location.speed)) : null,
            heading: location.heading
              ? parseFloat(String(location.heading))
              : null,
            timestamp: location.timestamp,
          };
        }

        // Fallback to vessel table coordinates
        const { data: vesselData, error: vesselError } = await supabase
          .from("vessels")
          .select("latitude, longitude")
          .eq("id", vesselId)
          .single();

        if (
          !vesselError &&
          vesselData &&
          vesselData.latitude &&
          vesselData.longitude
        ) {
          return {
            lat: parseFloat(String(vesselData.latitude)),
            lng: parseFloat(String(vesselData.longitude)),
            speed: null,
            heading: null,
            timestamp: null,
          };
        }

        // If no coordinates found, try user_locations based on vessel's user_id
        const { data: vesselUserData, error: vesselUserError } = await supabase
          .from("vessels")
          .select("user_id")
          .eq("id", vesselId)
          .single();

        if (!vesselUserError && vesselUserData && vesselUserData.user_id) {
          const { data: userLocationData, error: userLocationError } =
            await supabase
              .from("user_locations")
              .select("latitude, longitude, speed, heading, timestamp")
              .eq("user_id", vesselUserData.user_id)
              .order("timestamp", { ascending: false })
              .limit(1);

          if (
            !userLocationError &&
            userLocationData &&
            userLocationData.length > 0
          ) {
            const location = userLocationData[0];
            return {
              lat: parseFloat(String(location.latitude)),
              lng: parseFloat(String(location.longitude)),
              speed: location.speed ? parseFloat(String(location.speed)) : null,
              heading: location.heading
                ? parseFloat(String(location.heading))
                : null,
              timestamp: location.timestamp,
            };
          }
        }

        // Final fallback to Manila area with slight randomization
        return {
          lat: 14.5995 + (Math.random() - 0.5) * 0.2,
          lng: 120.9842 + (Math.random() - 0.5) * 0.2,
          speed: null,
          heading: null,
          timestamp: null,
        };
      };

      // Get locations for both vessels
      const [sellerLocationData, buyerLocationData] = await Promise.all([
        getVesselLocation(transaction.seller_vessel_id),
        getVesselLocation(transaction.buyer_vessel_id),
      ]);

      const sellerLocation = {
        lat: sellerLocationData.lat,
        lng: sellerLocationData.lng,
      };

      const buyerLocation = {
        lat: buyerLocationData.lat,
        lng: buyerLocationData.lng,
      };

      // Calculate distance between vessels
      const distance = calculateDistance(
        sellerLocation.lat,
        sellerLocation.lng,
        buyerLocation.lat,
        buyerLocation.lng
      );

      // Use real speed if available, otherwise estimate
      const sellerSpeed =
        sellerLocationData.speed || Math.floor(Math.random() * 20) + 5; // 5-25 knots
      const buyerSpeed =
        buyerLocationData.speed || Math.floor(Math.random() * 20) + 5; // 5-25 knots
      const averageSpeed = (sellerSpeed + buyerSpeed) / 2;

      const duration = distance / averageSpeed; // hours
      const eta = new Date(Date.now() + duration * 60 * 60 * 1000); // ETA

      // Set vessel locations data structure for the map
      setVesselLocations((prev) => ({
        ...prev,
        [transactionId]: {
          current: [sellerLocation.lat, sellerLocation.lng],
          departure: [sellerLocation.lat, sellerLocation.lng],
          destination: [buyerLocation.lat, buyerLocation.lng],
          route: [
            [sellerLocation.lat, sellerLocation.lng],
            [buyerLocation.lat, buyerLocation.lng],
          ],
          vesselId: transaction.seller_vessel_id,
          buyerVesselId: transaction.buyer_vessel_id,
          distance: distance,
          speed: averageSpeed,
          duration: duration,
          eta: eta,
          sellerVessel: transaction.seller_vessel,
          buyerVessel: transaction.buyer_vessel,
        },
      }));

      console.log("Vessel locations loaded:", {
        seller: sellerLocationData,
        buyer: buyerLocationData,
        distance: distance.toFixed(2) + " km",
        averageSpeed: averageSpeed.toFixed(1) + " knots",
      });
    } catch (error) {
      console.error("Error fetching vessel locations:", error);

      // Fallback to simulated data if database fetch fails
      const sellerLocation = {
        lat: 14.5995 + (Math.random() - 0.5) * 0.2,
        lng: 120.9842 + (Math.random() - 0.5) * 0.2,
      };

      const buyerLocation = {
        lat: 14.5995 + (Math.random() - 0.5) * 0.2,
        lng: 120.9842 + (Math.random() - 0.5) * 0.2,
      };

      const distance = calculateDistance(
        sellerLocation.lat,
        sellerLocation.lng,
        buyerLocation.lat,
        buyerLocation.lng
      );

      const speed = Math.floor(Math.random() * 20) + 5;
      const duration = distance / speed;
      const eta = new Date(Date.now() + duration * 60 * 60 * 1000);

      setVesselLocations((prev) => ({
        ...prev,
        [transactionId]: {
          current: [sellerLocation.lat, sellerLocation.lng],
          departure: [sellerLocation.lat, sellerLocation.lng],
          destination: [buyerLocation.lat, buyerLocation.lng],
          route: [
            [sellerLocation.lat, sellerLocation.lng],
            [buyerLocation.lat, buyerLocation.lng],
          ],
          vesselId: transaction.seller_vessel_id,
          buyerVesselId: transaction.buyer_vessel_id,
          distance: distance,
          speed: speed,
          duration: duration,
          eta: eta,
          sellerVessel: transaction.seller_vessel,
          buyerVessel: transaction.buyer_vessel,
        },
      }));
    } finally {
      // Stop loading after data is set
      setTimeout(() => {
        setIsLoadingMap((prev) => ({ ...prev, [transactionId]: false }));
      }, 1000);
    }
  };

  // QR Code functionality
  const handleScanToComplete = (transactionId: string) => {
    setSelectedTransactionId(transactionId);
    setQrCodeData(`transaction:${transactionId}:${Date.now()}`);
    setShowQRDialog(true);
  };

  // Handle QR Complete button with animated dialog close
  const handleQRComplete = (transactionId: string) => {
    // First, animate close the map dialog
    setShowMapDialog((prev) => ({
      ...prev,
      [transactionId]: false,
    }));
    setIsLoadingMap((prev) => ({
      ...prev,
      [transactionId]: false,
    }));

    // After a short delay, show the QR dialog
    setTimeout(() => {
      handleScanToComplete(transactionId);
    }, 300); // 300ms delay for smooth transition
  };

  // Calculate ride duration (mock calculation)
  const calculateRideDuration = (vesselId: string): string => {
    const vesselData = vesselLocations[vesselId];
    if (!vesselData || !vesselData.distance || !vesselData.speed) return "N/A";

    const hours = vesselData.distance / vesselData.speed;
    const wholeHours = Math.floor(hours);
    const minutes = Math.floor((hours - wholeHours) * 60);

    return `${wholeHours}h ${minutes}m`;
  };

  // Fetch user profile when userId is available
  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  // Fetch vessels and trips when user is available
  useEffect(() => {
    if (userId) {
      fetchVessels();
      fetchTrips();
    }
  }, [userId]);

  // Set initial vessel filter to userProfile.default_vessel when user profile and vessels are loaded
  useEffect(() => {
    if (
      userProfile?.default_vessel &&
      vessels.length > 0 &&
      !selectedVesselId
    ) {
      const defaultVessel = vessels.find(
        (v) => v.id === userProfile.default_vessel
      );
      if (defaultVessel) {
        setSelectedVesselId(userProfile.default_vessel);
      }
    }
  }, [userProfile?.default_vessel, vessels, selectedVesselId]);

  // Fetch vessel transactions with 4ShareLoading status
  const fetchVesselTransactions = async () => {
    console.log("Fetching vessel transactions...");
    try {
      let query = supabase
        .from("vessel_transactions")
        .select(
          `
          *,
          seller_vessel:vessels!seller_vessel_id(id, name, registration_number, current_zone),
          buyer_vessel:vessels!buyer_vessel_id(id, name, registration_number, current_zone),
          trip:fishing_trips(id, trip_code, departure_port_name)
        `
        )
        .eq("status", "4ShareLoading");

      // Filter by selected vessel if one is selected
      if (selectedVesselId) {
        query = query.or(
          `seller_vessel_id.eq.${selectedVesselId},buyer_vessel_id.eq.${selectedVesselId}`
        );
      }

      // Note: Trip filtering removed - trip selection is only needed for transaction completion

      const { data: transactions, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) {
        console.error("Error fetching vessel transactions:", error);
        setVesselTransactions([]);
        return;
      }

      console.log("Fetched vessel transactions:", transactions);
      setVesselTransactions(transactions || []);
    } catch (error) {
      console.error("Error fetching vessel transactions:", error);
      setVesselTransactions([]);
    }
  };

  // Fetch vessel transactions when component mounts or when vessel selection changes
  useEffect(() => {
    fetchVesselTransactions();
  }, [selectedVesselId]);

  // Fetch vessels function
  const fetchVessels = async () => {
    setVesselLoading(true);
    setVesselError(null);
    try {
      const { data, error } = await supabase
        .from("vessels")
        .select("*")
        .eq("user_id", userId)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching vessels:", error);
        setVesselError("Failed to fetch vessels");
        setVessels([]);
      } else {
        setVessels(data || []);
      }
    } catch (error) {
      console.error("Error fetching vessels:", error);
      setVesselError("Failed to fetch vessels");
      setVessels([]);
    } finally {
      setVesselLoading(false);
    }
  };

  // Fetch trips function
  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from("fishing_trips")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching trips:", error);
        setTrips([]);
      } else {
        setTrips(data || []);
      }
    } catch (error) {
      console.error("Error fetching trips:", error);
      setTrips([]);
    }
  };

  return (
    <div className="flex flex-col gap-4 px-3 py-4 md:gap-6 md:py-6">
      <div className="grid  md:grid-cols-2 gap-2">
        <div className="grid col-span-1 gap-2">
          <div className="col-span-2 md:col-span-1">
            <label className="font-bold mr-2"> Select Vessel:</label>
            <div className="relative vessel-search-container">
              <input
                type="text"
                className="bg-gray-200 px-2 mt-2 rounded-md"
                value={
                  selectedVesselId
                    ? vessels.find((v) => v.id === selectedVesselId)
                        ?.registration_number || ""
                    : vesselSearchTerm || ""
                }
                onChange={(e) => {
                  setVesselSearchTerm(e.target.value);
                  setSelectedVesselId(null); // Clear selection when typing
                  setShowVesselDropdown(true);
                }}
                onFocus={() => setShowVesselDropdown(true)}
                placeholder="Search vessel by name or registration number"
              />

              {showVesselDropdown && vessels.length > 0 && !loading && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {(vesselSearchTerm
                    ? vessels.filter(
                        (vessel) =>
                          vessel.name
                            ?.toLowerCase()
                            .includes(vesselSearchTerm.toLowerCase()) ||
                          vessel.registration_number
                            ?.toLowerCase()
                            .includes(vesselSearchTerm.toLowerCase())
                      )
                    : vessels
                  ).map((vessel) => (
                    <div
                      key={vessel.id}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                      onClick={() => {
                        setSelectedVesselId(vessel.id);
                        setSelectedTripId(null); // Clear trip when vessel changes
                        setShowVesselDropdown(false);
                        setVesselSearchTerm("");
                      }}
                    >
                      <div className="font-medium">{vessel.name}</div>
                      <div className="text-sm text-gray-600">
                        Reg #: {vessel.registration_number}
                        {vessel.type &&
                          ` | Type: ${
                            vessel.type === "mining" ? "Fishing" : vessel.type
                          }`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Trip Selection Cards */}
          {/* <div className="col-span-2 md:col-span-1">
            <label className="font-bold mr-2"> Select Trip:</label>
            <div className="relative trip-search-container">
              <input
                type="text"
                className="bg-gray-200 px-2 mt-2 rounded-md"
                value={
                  selectedTripId
                    ? trips.find((t) => t.id === selectedTripId)?.trip_code ||
                      ""
                    : tripSearchTerm || ""
                }
                onChange={(e) => {
                  setTripSearchTerm(e.target.value);
                  setSelectedTripId(null); // Clear selection when typing
                  setShowTripDropdown(true);
                }}
                onFocus={() => setShowTripDropdown(true)}
                placeholder="Search trip by code or status"
              />

              {showTripDropdown &&
                trips.length > 0 &&
                !loading &&
                selectedVesselId && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {(tripSearchTerm
                      ? trips.filter(
                          (trip) =>
                            trip.vessel_id === selectedVesselId &&
                            (trip.trip_code
                              ?.toLowerCase()
                              .includes(tripSearchTerm.toLowerCase()) ||
                              trip.status
                                ?.toLowerCase()
                                .includes(tripSearchTerm.toLowerCase()))
                        )
                      : trips.filter(
                          (trip) => trip.vessel_id === selectedVesselId
                        )
                    ).map((trip) => (
                      <div
                        key={trip.id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                        onClick={() => {
                          setSelectedTripId(trip.id);
                          setShowTripDropdown(false);
                          setTripSearchTerm("");
                        }}
                      >
                        <div className="font-medium">
                          Trip Code: {trip.trip_code}
                        </div>
                        <div className="text-sm text-gray-600">
                          Status: {trip.status}
                          {trip.created_at &&
                            ` | Date: ${new Date(
                              trip.created_at
                            ).toLocaleDateString()}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div> */}
        </div>
      </div>

      {/* Display 4ShareLoading Vessel Transactions */}
      <div className="mb-10">
        <h2 className="text-lg font-bold mb-4">4ShareLoading Transactions</h2>
        {vesselTransactions.length === 0 ? (
          <div className="border rounded-lg p-4 bg-white shadow text-center text-gray-500">
            No 4ShareLoading transactions found.
          </div>
        ) : (
          vesselTransactions.map((transaction) => {
            console.log("Rendering transaction:", transaction);
            return (
              <div
                key={transaction.id}
                className="border rounded-lg p-4 mb-4 bg-white shadow"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Transaction Details */}
                  <div>
                    <h3 className="font-bold text-lg mb-2">
                      Transaction Details
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Transaction ID:</strong> {transaction.id}
                      </div>
                      <div>
                        <strong>Type:</strong> {transaction.type}
                      </div>
                      <div>
                        <strong>Status:</strong> {transaction.status}
                      </div>
                      <div>
                        <strong>Quantity:</strong> {transaction.quantity}{" "}
                        {transaction.unit}
                      </div>
                      <div>
                        <strong>Price:</strong>{" "}
                        {transaction.price.toLocaleString()}{" "}
                        {transaction.currency}
                      </div>
                      <div>
                        <strong>Transaction Date:</strong>{" "}
                        {new Date(
                          transaction.transaction_date
                        ).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Vessel Information */}
                  <div>
                    <h3 className="font-bold text-lg mb-2">
                      Vessel Information
                    </h3>
                    <div className="space-y-3 text-sm">
                      {/* Seller Vessel */}
                      <div className="bg-blue-50 p-3 rounded">
                        <div className="font-semibold text-blue-800 mb-1">
                          Seller Vessel
                        </div>
                        <div>
                          <strong>Name:</strong>{" "}
                          {transaction.seller_vessel?.name || "N/A"}
                        </div>
                        <div>
                          <strong>Registration:</strong>{" "}
                          {transaction.seller_vessel?.registration_number ||
                            "N/A"}
                        </div>
                        <div>
                          <strong>Zone:</strong>{" "}
                          {transaction.seller_vessel?.current_zone || "N/A"}
                        </div>
                      </div>

                      {/* Buyer Vessel */}
                      <div className="bg-green-50 p-3 rounded">
                        <div className="font-semibold text-green-800 mb-1">
                          Buyer Vessel
                        </div>
                        <div>
                          <strong>Name:</strong>{" "}
                          {transaction.buyer_vessel?.name || "N/A"}
                        </div>
                        <div>
                          <strong>Registration:</strong>{" "}
                          {transaction.buyer_vessel?.registration_number ||
                            "N/A"}
                        </div>
                        <div>
                          <strong>Zone:</strong>{" "}
                          {transaction.buyer_vessel?.current_zone || "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trip Information */}
                {transaction.trip && (
                  <div className="space-y-1 text-sm">
                    <div>
                      <strong>To SeaPort:</strong>{" "}
                      {transaction.trip.departure_port_name || "N/A"}
                    </div>
                  </div>
                )}

                {/* Track Vessel */}
                <div className="mt-4 border-t pt-4 flex justify-between items-center">
                  <button
                    onClick={() =>
                      handleTrackVessel(
                        transaction.id,
                        transaction.seller_vessel?.id ||
                          transaction.buyer_vessel?.id ||
                          ""
                      )
                    }
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                  >
                    Track Vessel
                  </button>
                  <button
                    onClick={() => handleScanToComplete(transaction.id)}
                    className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
                  >
                    Scan To Complete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan to Complete Transaction</DialogTitle>
            <DialogDescription>
              Scan this QR code to complete the transaction process.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 p-4">
            {qrCodeData && (
              <div className="bg-white p-4 rounded-lg border">
                <QRCode value={qrCodeData} size={200} level="M" />
              </div>
            )}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Transaction ID:</p>
              <p className="font-mono text-xs bg-gray-100 p-2 rounded">
                {selectedTransactionId}
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => {
                  if (qrCodeData) {
                    navigator.clipboard.writeText(qrCodeData);
                    toast({
                      title: "Copied!",
                      description: "QR code data copied to clipboard",
                    });
                  }
                }}
                variant="outline"
                size="sm"
              >
                Copy Data
              </Button>
              <Button
                onClick={() => setShowQRDialog(false)}
                variant="default"
                size="sm"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Map Dialog */}
      {Object.entries(showMapDialog).map(
        ([transactionId, isOpen]) =>
          isOpen && (
            <Dialog
              key={transactionId}
              open={isOpen}
              onOpenChange={(open) => {
                if (!open) {
                  setShowMapDialog((prev) => ({
                    ...prev,
                    [transactionId]: false,
                  }));
                  setIsLoadingMap((prev) => ({
                    ...prev,
                    [transactionId]: false,
                  }));
                }
              }}
            >
              <DialogContent className="max-w-[100vw] max-h-[100vh] w-full h-full">
                <DialogHeader>
                  <DialogTitle>Vessel Tracking Map</DialogTitle>
                  <DialogDescription>
                    Real-time vessel location and route tracking
                  </DialogDescription>
                </DialogHeader>
                <div className="h-[calc(100vh-120px)] w-full relative">
                  {isLoadingMap[transactionId] ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p>Loading map...</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <MapContainer
                        center={
                          vesselLocations[transactionId]?.current || [
                            14.5995, 120.9842,
                          ]
                        }
                        zoom={10}
                        style={{ height: "100%", width: "100%" }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />

                        {/* Seller vessel location (current) */}
                        {vesselLocations[transactionId]?.current && (
                          <Marker
                            position={vesselLocations[transactionId].current}
                            icon={L.icon({
                              iconUrl: "/images/icons/isolar.png",
                              iconSize: [40, 80],
                              iconAnchor: [20, 80],
                            })}
                          >
                            <Popup>
                              <div>
                                <h3 className="font-semibold">Seller Vessel</h3>
                                <p>
                                  Name:{" "}
                                  {vesselLocations[transactionId]?.sellerVessel
                                    ?.name || "Unknown"}
                                </p>
                                <p>
                                  Registration:{" "}
                                  {vesselLocations[transactionId]?.sellerVessel
                                    ?.registration_number || "N/A"}
                                </p>
                                <p>
                                  Lat:{" "}
                                  {vesselLocations[
                                    transactionId
                                  ].current[0].toFixed(6)}
                                </p>
                                <p>
                                  Lng:{" "}
                                  {vesselLocations[
                                    transactionId
                                  ].current[1].toFixed(6)}
                                </p>
                              </div>
                            </Popup>
                          </Marker>
                        )}

                        {/* Buyer vessel location (destination) */}
                        {vesselLocations[transactionId]?.destination && (
                          <Marker
                            position={
                              vesselLocations[transactionId].destination
                            }
                            icon={L.icon({
                              iconUrl: "/images/icons/itruck.png",
                              iconSize: [60, 120],
                              iconAnchor: [30, 120],
                            })}
                          >
                            <Popup>
                              <div>
                                <h3 className="font-semibold">Buyer Vessel</h3>
                                <p>
                                  Name:{" "}
                                  {vesselLocations[transactionId]?.buyerVessel
                                    ?.name || "Unknown"}
                                </p>
                                <p>
                                  Registration:{" "}
                                  {vesselLocations[transactionId]?.buyerVessel
                                    ?.registration_number || "N/A"}
                                </p>
                                <p>
                                  Lat:{" "}
                                  {vesselLocations[
                                    transactionId
                                  ].destination[0].toFixed(6)}
                                </p>
                                <p>
                                  Lng:{" "}
                                  {vesselLocations[
                                    transactionId
                                  ].destination[1].toFixed(6)}
                                </p>
                              </div>
                            </Popup>
                          </Marker>
                        )}

                        {/* Route line between vessels (black color when distance > 0) */}
                        {vesselLocations[transactionId]?.route &&
                          vesselLocations[transactionId].route.length > 1 &&
                          vesselLocations[transactionId]?.distance &&
                          vesselLocations[transactionId].distance > 0 && (
                            <Polyline
                              positions={vesselLocations[transactionId].route}
                              color="black"
                              weight={3}
                              opacity={0.8}
                            />
                          )}
                      </MapContainer>

                      {/* Ride Info Display (bottom center) */}
                      {vesselLocations[transactionId] && (
                        <div className="absolute z-[10000] bottom-[50px] left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-4 border min-w-[250px]">
                          <div className="text-center">
                            <h4 className="font-semibold text-lg mb-2">
                              4Share Information
                            </h4>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">Distance</p>
                                <p className="font-semibold">
                                  {vesselLocations[
                                    transactionId
                                  ]?.distance?.toFixed(2)}{" "}
                                  km
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Duration</p>
                                <p className="font-semibold">
                                  {vesselLocations[transactionId]?.duration
                                    ? `${Math.floor(
                                        vesselLocations[transactionId].duration!
                                      )}h ${Math.floor(
                                        (vesselLocations[transactionId]
                                          .duration! %
                                          1) *
                                          60
                                      )}m`
                                    : "N/A"}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">ETA</p>
                                <p className="font-semibold">
                                  {vesselLocations[transactionId]?.eta
                                    ? vesselLocations[
                                        transactionId
                                      ].eta!.toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "N/A"}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 pt-2 border-t">
                              <p className="text-xs text-gray-500">
                                Speed: {vesselLocations[transactionId]?.speed}{" "}
                                knots
                              </p>
                            </div>
                          </div>

                          <div className="flex justify-center space-x-2 mt-4">
                            <button
                              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
                              onClick={() => {
                                setShowMapDialog((prev) => ({
                                  ...prev,
                                  [transactionId]: false,
                                }));
                                setIsLoadingMap((prev) => ({
                                  ...prev,
                                  [transactionId]: false,
                                }));
                              }}
                              variant="default"
                            >
                              Close
                            </button>
                            <button
                              onClick={() => handleQRComplete(transactionId)}
                              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
                            >
                              QR Complete
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )
      )}
    </div>
  );
}

export default function ShareLoading() {
  const isMobile = useIsMobile();
  const { language } = useLanguageStore();

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="4Share Loading" />
        <TopButtons />
        <div className="px-3 flex gap-2 md:gap-3 lg:gap-4 overflow-x-auto">
          <Link to="/transportation/2share-loading" className="flex-shrink-0">
            <button
              className={`
                  bg-gradient-to-r from-[#a8a8a8] to-[#fdfdfd] text-black  rounded-md px-4 md:px-5
                  h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                  text-xs md:text-base
                  w-32 md:w-36 lg:w-40 shadow-lg hover:shadow-xl transition-all duration-300
                `}
            >
              <span className="truncate">
                {language === "en" ? "2Share Loading" : "Chuyển tải"}
              </span>
            </button>
          </Link>
          <Link to="/transportation/4share-loading" className="flex-shrink-0">
            <button
              className={`
                bg-gradient-to-r from-black to-[#1306ad] text-[#f8f603] rounded-md px-4 md:px-5
                h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                text-xs md:text-base
                w-32 md:w-36 lg:w-40
              `}
            >
              <span className="truncate">
                {language === "en" ? "4Share Loading" : "Nhận Tải"}
              </span>
            </button>
          </Link>
        </div>
        <ShareContainer />
      </SidebarInset>
    </SidebarProvider>
  );
}
