import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import TopButtons from "@/components/top-buttons";
import { useEffect, useState, useMemo, useRef } from "react";
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
import { QRCodeCanvas } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Ship,
} from "lucide-react";
import { Link } from "react-router-dom";
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
import { useCartStore } from "@/stores/cart-store";
import { CartSummaryPopup } from "@/components/cart-summary-popup";

// Utility function to convert shorthand price to real price
const convertShorthandPrice = (value: string): number => {
  if (!value) return 0;

  const cleanValue = value.trim().toLowerCase();

  // Handle different shorthand formats
  if (cleanValue.endsWith("m")) {
    const num = parseFloat(cleanValue.slice(0, -1));
    return num * 1000000; // 1m = 1,000,000
  } else if (cleanValue.endsWith("b")) {
    const num = parseFloat(cleanValue.slice(0, -1));
    return num * 1000000000; // 1b = 1,000,000,000
  } else if (cleanValue.endsWith("k")) {
    const num = parseFloat(cleanValue.slice(0, -1));
    return num * 1000; // 1k = 1,000
  } else {
    // Handle decimal numbers like 1.3 (1.3 million)
    const num = parseFloat(cleanValue);
    if (num >= 1 && num < 1000) {
      return num * 1000000; // Assume millions if between 1-999
    }
    return num;
  }
};

// Utility function to format number with commas
const formatNumberWithCommas = (value: string | number): string => {
  if (!value) return "";

  // If it's already a number, format with commas
  if (typeof value === "number" || !isNaN(Number(value))) {
    return Number(value).toLocaleString();
  }

  // If it's a string with shorthand, convert and format
  const cleanValue = String(value).replace(/,/g, "");
  const realPrice = convertShorthandPrice(cleanValue);
  return realPrice.toLocaleString();
};

// Utility function to check if input should be converted (has shorthand suffix)
const shouldConvertShorthand = (value: string): boolean => {
  if (!value) return false;
  const cleanValue = value.trim().toLowerCase();
  return (
    cleanValue.endsWith("m") ||
    cleanValue.endsWith("b") ||
    cleanValue.endsWith("k")
  );
};

// Utility function to parse input value (only convert if shorthand detected)
const parseInputValue = (value: string): string => {
  if (!value) return "";

  // Remove commas first
  const cleanValue = value.replace(/,/g, "");

  // Only convert if it has shorthand suffix
  if (shouldConvertShorthand(cleanValue)) {
    const realPrice = convertShorthandPrice(cleanValue);
    return realPrice.toString();
  }

  // Otherwise, just return the cleaned value
  return cleanValue;
};

// Type for a seaport row
const initialForm = {
  vessel_id: "",
  owner: "",
  address: "",
  crew_count: "",
  vessel_type: "",
  departure_port: "",
  zone_dept: "",
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
  to_port: "",
};

// Function to calculate distance between two coordinates in meters
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in meters
  return distance;
}
async function getCoordinatesFromAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&key=${process.env.GOOGLE_API_KEY}`
    );
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
    return null;
  } catch (error) {
    console.error("Error getting coordinates from address:", error);
    return null;
  }
}
function getDaysBetween(start: string, end: string) {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.max(0, Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24)));
}
// Type for joined catch record with haul info
interface CatchRecordWithHaul
  extends Omit<
    Database["public"]["Tables"]["catch_records"]["Row"],
    "haul_id"
  > {
  haul_id: { id: string; haul_number: number; qr_code: string } | string;
  tank: string;
  species: string;
  fish_size: string;
  quantity: number;
  id: string;
  image_url: string;
  net_kg_per_case: string;
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
  const selectedTankKeyRef = useRef<string | null>(null);
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
  const [submitted, setSubmitted] = useState<Record<string, string> | null>(
    null
  );

  // Pagination and search
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [dockQrUrl, setDockQrUrl] = useState<string | undefined>();
  const [vesselSearchTerm, setVesselSearchTerm] = useState<string>("");
  const [showVesselDropdown, setShowVesselDropdown] = useState<boolean>(false);
  const [tripSearchTerm, setTripSearchTerm] = useState<string>("");
  const [showTripDropdown, setShowTripDropdown] = useState<boolean>(false);
  const [portSearchTerm, setPortSearchTerm] = useState<string>("");
  const [showPortDropdown, setShowPortDropdown] = useState<boolean>(false);
  const [tripQrUrl, setTripQrUrl] = useState<string | undefined>();

  const [catchRecords, setCatchRecords] = useState<CatchRecordWithHaul[]>([]);

  const { user, isAuthenticated } = useAuthStore();
  const userId = user?.auth_id;

  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(null);
  // --- Tank-based Product/Order Section ---
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [zoneDept, setZoneDept] = useState<string | null>(null);
  const [zoneCode, setZoneCode] = useState<string | null>(null);
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const [productType, setProductType] = useState<string>("2ShareLoading");
  const [orderForms, setOrderForms] = useState<
    Record<
      string,
      {
        quantity_load?: string;
        bid_price?: string;
        price?: string;
        departure_date?: string;
        arrival_date?: string;
        departure_port?: string;
        to_port?: string;
      }
    >
  >({});
  const cartStore = useCartStore();
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Set cart type to 2ShareLoading when component mounts
  useEffect(() => {
    cartStore.setCartType("2ShareLoading");
  }, []);

  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState<ProductOrder | null>(null);
  const [successDialog, setSuccessDialog] = useState<{
    isOpen: boolean;
    successQr: string | null;
  }>({ isOpen: false, successQr: null });

  useEffect(() => {
    if (vessels.length > 0 && !selectedVesselId) {
      const latestVessel = vessels.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      setSelectedVesselId(latestVessel.id);
    }
  }, [vessels, selectedVesselId]);

  useEffect(() => {
    if (trips.length > 0 && selectedVesselId && !selectedTripId) {
      const vesselTrips = trips.filter(
        (trip) => trip.vessel_id === selectedVesselId
      );
      if (vesselTrips.length > 0) {
        const latestTrip = vesselTrips.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        setSelectedTripId(latestTrip.id);
      }
    }
  }, [trips, selectedVesselId, selectedTripId]);

  useEffect(() => {
    if (!selectedTripId) return;

    if (selectedTripId) {
      const selectedTrip = trips.find((t) => t.id === selectedTripId);
      // Get the seaport information for this trip
      const tripSeaport = ports.find(
        (p) => p.id === selectedTrip.departure_port
      );

      // Use the location service instead of direct navigator.geolocation
      import("@/lib/location-service").then(({ locationService }) => {
        locationService
          .getCurrentLocation()
          .then(async (pos) => {
            const userLat = pos.latitude;
            const userLon = pos.longitude;
            setUserLat(userLat);
            setUserLon(userLon);

            // Calculate distance from seaport to user location
            let distanceFromSeaport = null;
            if (tripSeaport) {
              // Use seaport coordinates if available, otherwise geocode the address
              let seaportLat = tripSeaport.latitude;
              let seaportLon = tripSeaport.longitude;

              if (!seaportLat || !seaportLon) {
                // If coordinates not available, geocode the address
                const coords = await getCoordinatesFromAddress(
                  tripSeaport.address
                );
                if (coords) {
                  seaportLat = coords.lat;
                  seaportLon = coords.lng;
                }
              }

              if (seaportLat && seaportLon) {
                distanceFromSeaport = calculateDistance(
                  seaportLat,
                  seaportLon,
                  userLat,
                  userLon
                );
                console.log(
                  `Distance from seaport "${
                    tripSeaport.address
                  }": ${distanceFromSeaport.toFixed(0)}m`
                );
              }
            }

            // Store as a human-readable string (e.g., "1234 m")
            setZoneDept(
              typeof distanceFromSeaport === "number"
                ? `${distanceFromSeaport.toFixed(0)} m`
                : null
            );

            // Compute and set user's zone based on nearest seaport
            try {
              const { computeZoneByNearestSeaport } = await import(
                "@/lib/zone-utils"
              );
              const zoneInfo = await computeZoneByNearestSeaport(
                userLat,
                userLon
              );
              setZoneCode(zoneInfo.zoneCode);
              setZoneId(zoneInfo.zoneName);
              // Refresh ports list filtered by zone
              await fetchPorts(zoneInfo.zoneCode || undefined);
            } catch (e) {
              console.warn("Failed to compute zone:", e);
            }
          })
          .catch((err) => {
            // If location is not available, still create the form
            toast({
              title: "Location Error",
              description:
                "Could not determine your location. You can still create the haul manually.",
              variant: "destructive",
            });
          });
      });
    }
  }, [selectedTripId]);

  // Fetch orders for the selected trip
  useEffect(() => {
    if (!selectedTripId) return;
    const fetchOrders = async () => {
      setOrderLoading(true);
      setOrderError(null);
      try {
        const { data, error } = await supabase
          .from("product_orders")
          .select("*")
          .eq("trip_id", selectedTripId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setOrders(data || []);
      } catch (e: unknown) {
        setOrderError(e instanceof Error ? e.message : String(e));
      } finally {
        setOrderLoading(false);
      }
    };
    fetchOrders();
    fetchPorts();
  }, [selectedTripId]);

  useEffect(() => {
    fetchVessels();
    fetchPorts();
  }, []);

  useEffect(() => {
    fetchTrips();
    // eslint-disable-next-line
  }, [page, perPage]);

  useEffect(() => {
    if (successDialog) setDialogOpen(false);
  }, [successDialog]);

  async function fetchVessels() {
    try {
      // Get user's auth ID
      const userId = user?.auth_id;
      if (!userId) {
        console.error("User not authenticated");
        return;
      }

      // Fetch vessels that the user owns
      const { data: ownedVessels, error: ownedError } = await supabase
        .from("vessels")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (ownedError) {
        console.error("Error fetching owned vessels:", ownedError);
      }

      // Fetch vessels that the user has access to through vessel access control
      const { data: accessData, error: accessError } = await supabase
        .from("vessel_access_control")
        .select("vessel_id")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (accessError) {
        console.error("Error fetching vessel access:", accessError);
      }

      // Get vessel IDs that user has access to
      const accessibleVesselIds =
        accessData?.map((item) => item.vessel_id) || [];

      // Fetch accessible vessels
      let accessibleVessels: Database["public"]["Tables"]["vessels"]["Row"][] =
        [];
      if (accessibleVesselIds.length > 0) {
        const { data: accessibleData, error: accessibleError } = await supabase
          .from("vessels")
          .select("*")
          .in("id", accessibleVesselIds)
          .order("created_at", { ascending: false });

        if (accessibleError) {
          console.error("Error fetching accessible vessels:", accessibleError);
        } else {
          accessibleVessels = accessibleData || [];
        }
      }

      // Combine owned and accessible vessels, removing duplicates
      const allVessels = [...(ownedVessels || []), ...accessibleVessels];
      const uniqueVessels = allVessels.filter(
        (vessel, index, self) =>
          index === self.findIndex((v) => v.id === vessel.id)
      );

      console.log("Owned vessels:", ownedVessels?.length || 0);
      console.log("Accessible vessels:", accessibleVessels.length);
      console.log("Total unique vessels:", uniqueVessels.length);

      setVessels(uniqueVessels);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function fetchPorts(filterZone?: string) {
    const { data } = await supabase.from("seaports").select("*");
    const list = data || [];
    const filtered = filterZone
      ? list.filter(
          (p: Database["public"]["Tables"]["seaports"]["Row"]) =>
            String(p.classification) === String(filterZone)
        )
      : list;
    setPorts(filtered);
  }
  function handleDeparturePortChange(e: React.ChangeEvent<HTMLSelectElement>) {
    console.log("🎯 To Port selected:", e.target.value);
    setForm((f) => ({
      ...f,
      to_port: e.target.value,
    }));
  }

  async function fetchTrips(searchTerm = search) {
    setLoading(true);
    setError(null);
    try {
      // Get user's auth ID
      const userId = user?.auth_id;
      if (!userId) {
        console.error("User not authenticated");
        return;
      }

      // Get vessel IDs that user owns
      const { data: ownedVessels, error: ownedError } = await supabase
        .from("vessels")
        .select("id")
        .eq("user_id", userId);

      if (ownedError) {
        console.error("Error fetching owned vessels:", ownedError);
      }

      // Get vessel IDs that user has access to through vessel access control
      const { data: accessData, error: accessError } = await supabase
        .from("vessel_access_control")
        .select("vessel_id")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (accessError) {
        console.error("Error fetching vessel access:", accessError);
      }

      // Combine owned and accessible vessel IDs
      const ownedVesselIds = ownedVessels?.map((v) => v.id) || [];
      const accessibleVesselIds =
        accessData?.map((item) => item.vessel_id) || [];
      const allVesselIds = [...ownedVesselIds, ...accessibleVesselIds];

      console.log("Owned vessel IDs:", ownedVesselIds);
      console.log("Accessible vessel IDs:", accessibleVesselIds);
      console.log("Total vessel IDs:", allVesselIds);

      if (allVesselIds.length === 0) {
        setTrips([]);
        setTotal(0);
        return;
      }

      const baseQuery = supabase
        .from("fishing_trips")
        .select(
          `
          *,
          vessels!inner (
            id,
            name,
            registration_number
          )
        `,
          { count: "exact" }
        )
        .in("vessel_id", allVesselIds)
        .order("created_at", { ascending: false });

      const finalQuery = searchTerm
        ? baseQuery.or(
            `trip_code.ilike.%${searchTerm}%,departure_port.ilike.%${searchTerm}%`
          )
        : baseQuery;

      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      const { data, error, count } = await finalQuery
        .order("created_at", { ascending: false })
        .range(from, to);
      const lastCachingTrip = data?.find((trip) => trip.status === "Catching");
      setTrips(data || []);
      setTotal(count || 0);
      if (lastCachingTrip) {
        setSelectedTripId(lastCachingTrip.id);
      }
      setTotal(count || 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function formatDateDDMMYY(dateString: string) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    return `${day}${month}${year}`;
  }

  // Helper function to extract number from fish_size
  function extractNumberFromFishSize(fishSize: string | null): number {
    if (!fishSize) return 0;
    const match = fishSize.match(/\d+/);
    return match ? Number(match[0]) : 0;
  }

  useEffect(() => {
    async function generateQr() {
      if (submitted?.dock_code) {
        const dockQr = await toDataURL(submitted.dock_code, { width: 80 });
        setDockQrUrl(dockQr);
      }
      if (submitted?.trip_code) {
        const tripQr = await toDataURL(submitted.trip_code, { width: 80 });
        setTripQrUrl(tripQr);
      }
    }
    generateQr();
    console.log("submitted?.trip_code ", submitted?.trip_code);
    console.log("submitted?.dock_code ", submitted?.dock_code);
    console.log("dockQrUrl ", dockQrUrl);
    console.log("tripQrUrl ", tripQrUrl);
  }, [submitted]);

  // Fetch catch records for the selected trip (matching declaration.tsx logic)
  useEffect(() => {
    if (!selectedTripId) {
      setCatchRecords([]);
      return;
    }
    const fetchCatchRecordsForTrip = async () => {
      // 1. Fetch all hauls for the trip
      const { data: hauls, error: haulsError } = await supabase
        .from("fishing_hauls")
        .select("id")
        .eq("trip_id", selectedTripId);
      if (haulsError) {
        setCatchRecords([]);
        return;
      }
      const haulIds = (hauls as { id: string }[]).map((h) => h.id);
      if (haulIds.length === 0) {
        setCatchRecords([]);
        return;
      }
      // 2. Fetch all catch_records for those hauls, including haul_number and qr_code from fishing_hauls
      const { data: catchData, error: catchError } = await supabase
        .from("catch_records")
        .select("*, haul_id(id, haul_number, qr_code)")
        .in("haul_id", haulIds)
        .order("created_at", { ascending: false });
      if (catchError) {
        setCatchRecords([]);
        return;
      }

      setCatchRecords(catchData || []);
    };
    fetchCatchRecordsForTrip();
  }, [selectedTripId, supabase]);

  // Build aggregated tank view: one card per tank number, using last record's details
  const aggregatedTanks = useMemo(() => {
    const byTank = new Map<number, CatchRecordWithHaul[]>();
    for (const cr of catchRecords) {
      const t = Number(cr.tank);
      if (Number.isNaN(t)) continue;
      const arr = byTank.get(t) || [];
      arr.push(cr);
      byTank.set(t, arr);
    }
    const result: {
      tank: number;
      lastRecord: CatchRecordWithHaul;
      aggregatedStock: number;
      sourceRecordIds: string[];
    }[] = [];
    for (const [tank, records] of byTank.entries()) {
      const positive = records.filter((r) => Number(r.case_quantity || 0) > 0);
      if (positive.length === 0) continue;
      // Sort by created_at ascending to take the last as the latest in chronological order
      const sorted = [...positive].sort((a, b) => {
        const at = new Date(a.created_at || 0).getTime();
        const bt = new Date(b.created_at || 0).getTime();
        return at - bt;
      });
      const lastRecord = sorted[sorted.length - 1];
      const aggregatedStock = positive.reduce(
        (sum, r) => sum + Number(r.case_quantity || 0),
        0
      );
      result.push({
        tank,
        lastRecord,
        aggregatedStock,
        sourceRecordIds: positive.map((r) => r.id),
      });
    }
    return result;
  }, [catchRecords]);

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

          <div className="col-span-2 md:col-span-1">
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
          </div>
        </div>

        <div className="grid col-span-1 gap-2">
          {/* Zone Dept input  */}
          <div className="col-span-2 md:col-span-1">
            <label className="font-bold mr-2">Zone Dept:</label>
            <input
              type="text"
              value={zoneDept ?? ""}
              onChange={(e) => setZoneDept(e.target.value)}
              className="bg-gray-200 p-2 mt-2 rounded-md"
              placeholder="Zone dept (e.g., 1.2 km)"
            />
          </div>

          {/* <div className="col-span-2 md:col-span-1">
            <label className="font-bold mr-2">Zone:</label>
            <span className="bg-gray-200 p-2 mt-2 rounded-md inline-block">
              {(() => {
                const namePart = zoneId ?? "Unknown";
                const result = `${namePart}`;
                return result || "Unknown";
              })()}
            </span>
          </div> */}

          <div className="col-span-2 md:col-span-1">
            <label className="font-bold mr-2">To Seaport:</label>
            <div className="relative port-search-container">
              <input
                type="text"
                required
                className={`bg-gray-200 px-2 py-3 mt-2 w-full p-2 border ${
                  !form.to_port ? "border-red-500 bg-red-50" : "border-gray-300"
                } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                value={
                  form.to_port
                    ? ports.find((p) => p.id === form.to_port)?.name || ""
                    : portSearchTerm || ""
                }
                onChange={(e) => {
                  setPortSearchTerm(e.target.value);
                  setShowPortDropdown(true);
                  // Clear selection when typing
                  if (form.to_port) {
                    const updatedForm = { ...form, to_port: "" };
                    setForm(updatedForm);
                  }
                }}
                onFocus={() => setShowPortDropdown(true)}
                placeholder="Search port by name"
              />

              {showPortDropdown && ports.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {(portSearchTerm
                    ? ports.filter((port) =>
                        port.name
                          ?.toLowerCase()
                          .includes(portSearchTerm.toLowerCase())
                      )
                    : ports
                  ).map((port) => (
                    <div
                      key={port.id}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                      onClick={() => {
                        const updatedForm = { ...form, to_port: port.id };
                        setForm(updatedForm);
                        handleDeparturePortChange({
                          target: { value: port.id },
                        } as React.ChangeEvent<HTMLSelectElement>);
                        setShowPortDropdown(false);
                        setPortSearchTerm("");
                      }}
                    >
                      <div className="font-medium">{port.name}</div>
                      <div className="text-sm text-gray-600">
                        {port.address
                          ? `Address: ${port.address}`
                          : port.latitude && port.longitude
                          ? `Coords: ${port.latitude}, ${port.longitude}`
                          : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {catchRecords.length === 0 && (
        <div className="border rounded-lg p-3 md:p-4 mb-4 md:mb-6 bg-white shadow flex flex-col md:flex-row">
          {/* Carousel of images */}
          <div className="mb-3 md:mb-5 md:mb-0 md:mr-4 flex flex-col items-center min-w-[100px] md:min-w-[120px]">
            <div className="font-bold mb-2 text-sm md:text-base">Tank #</div>
            <div className="w-32 h-32 md:w-40 md:h-40 overflow-x-auto flex gap-2">
              <div className="w-32 h-32 md:w-40 md:h-40 bg-gray-200 flex items-center justify-center rounded text-gray-400 text-xs md:text-sm">
                No Image
              </div>
            </div>
          </div>
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
              <div className="text-xs md:text-sm font-medium">
                Product name:
              </div>
              <Input
                value={""}
                readOnly
                className="bg-red-100 px-2 text-xs md:text-sm h-8 md:h-9"
              />
              <div className="text-xs md:text-sm font-medium">Size:</div>

              <div className="flex items-center gap-2 bg-gray-100 pr-2 rounded-md">
                <Input
                  type="number"
                  value={""}
                  required
                  className="flex-1 bg-red-100 p-0 text-xs md:text-sm h-8 md:h-9"
                />
                <span className="text-red-500 text-xs md:text-sm font-medium">
                  Pcs/kg
                </span>
              </div>
              <div className="text-xs md:text-sm font-medium">Product ID:</div>
              <Input
                value={""}
                readOnly
                className="bg-red-100 px-2 text-xs md:text-sm h-8 md:h-9"
              />
              <div className="text-xs md:text-sm font-medium">Stock:</div>
              <Input
                value={""}
                readOnly
                className="bg-red-100 px-2 text-xs md:text-sm h-8 md:h-9"
              />
            </div>
            {productType === "2ShareLoading" && (
              <form className="flex flex-col gap-2">
                <Label className="text-xs md:text-sm">Quantity Load:</Label>
                <Input
                  type="number"
                  value={""}
                  max={0}
                  required
                  className="text-xs md:text-sm h-8 md:h-9"
                />
                <Label className="text-xs md:text-sm">Price:</Label>

                <div className="flex items-center gap-2 bg-gray-100 px-2 rounded-md">
                  <Input
                    type="number"
                    value={""}
                    required
                    className="flex-1 bg-gray-100 p-0 text-xs md:text-sm h-8 md:h-9"
                  />
                  <span className="text-gray-500 text-xs md:text-sm font-medium">
                    VND/kg
                  </span>
                </div>
                <Button
                  type="submit"
                  className="bg-red-500 text-white rounded px-3 md:px-4 py-1 mt-2 w-16 md:w-20 text-xs md:text-sm h-8 md:h-9"
                  disabled={true}
                >
                  Submit
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Only show tank cards and orders if a trip is selected */}
      {selectedTripId ? (
        <div className="mb-10">
          {/* Tank Cards */}
          {aggregatedTanks.length > 0 &&
            aggregatedTanks.map(
              ({ tank, lastRecord, aggregatedStock, sourceRecordIds }) => (
                <div
                  key={`tank-${tank}`}
                  className={`border rounded-lg p-3 md:p-4 mb-4 md:mb-6 bg-white shadow flex flex-col md:flex-row relative ${
                    cartStore.isItemInCart(`tank-${tank}`)
                      ? "ring-2 ring-red-500"
                      : ""
                  }`}
                >
                  {/* Selection indicator */}
                  {cartStore.isItemInCart(`tank-${tank}`) && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-red-500 rounded-full p-1 shadow-md">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-white"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}

                  {/* Carousel of images */}
                  <div className="mb-3 md:mb-5 md:mb-0 md:mr-4 flex flex-col items-center min-w-[100px] md:min-w-[120px]">
                    <div className="font-bold mb-2 text-sm md:text-base">
                      Tank {tank}
                    </div>
                    <div className="w-32 h-32 md:w-40 md:h-40 overflow-x-auto flex gap-2">
                      {lastRecord.image_url ? (
                        <img
                          src={lastRecord.image_url}
                          alt="Catch"
                          className="w-[100%] h-[100%] object-cover rounded border"
                        />
                      ) : (
                        <div className="w-32 h-32 md:w-40 md:h-40 bg-gray-200 flex items-center justify-center rounded text-gray-400 text-xs md:text-sm">
                          No Image
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                      <div className="text-xs md:text-sm font-medium">
                        Product name:
                      </div>
                      <Input
                        value={
                          lastRecord.fish_name ||
                          lastRecord.species ||
                          "Unknown"
                        }
                        readOnly
                        className="bg-red-100 px-2 text-xs md:text-sm h-8 md:h-9"
                      />
                      <div className="text-xs md:text-sm font-medium">
                        Size:
                      </div>

                      <div className="flex items-center gap-2 bg-gray-100 pr-2 rounded-md">
                        <Input
                          type="number"
                          value={extractNumberFromFishSize(
                            lastRecord.fish_size
                          )}
                          required
                          className="flex-1 bg-red-100 p-0 text-xs md:text-sm h-8 md:h-9"
                        />
                        <span className="text-red-500 text-xs md:text-sm font-medium">
                          Pcs/kg
                        </span>
                      </div>
                      <div className="text-xs md:text-sm font-medium">
                        Product ID:
                      </div>
                      <Input
                        value={
                          lastRecord.qr_code
                            ? lastRecord.qr_code
                            : typeof lastRecord.haul_id === "object" &&
                              lastRecord.haul_id !== null
                            ? (lastRecord.haul_id as { qr_code: string })
                                .qr_code
                            : lastRecord.id
                        }
                        readOnly
                        className="bg-red-100 px-2 text-xs md:text-sm h-8 md:h-9"
                      />
                      <div className="text-xs md:text-sm font-medium">
                        Stock:
                      </div>
                      <Input
                        value={aggregatedStock}
                        readOnly
                        className="bg-red-100 px-2 text-xs md:text-sm h-8 md:h-9"
                      />
                    </div>
                    {productType === "2ShareLoading" && (
                      <form
                        className="flex flex-col gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!form.to_port) return;

                          const tankKey = `tank-${tank}`;
                          const quantityLoad =
                            orderForms[tankKey]?.quantity_load;
                          const bidPrice = orderForms[tankKey]?.bid_price;

                          if (!quantityLoad || !bidPrice) return;

                          const requestedLoad = Number(quantityLoad);
                          const pricePerKg = Number(bidPrice);

                          // Ensure requested load does not exceed aggregated stock
                          if (requestedLoad > aggregatedStock) {
                            toast({
                              title: "Insufficient stock",
                              description: `Requested ${requestedLoad} exceeds available ${aggregatedStock} for tank ${tank}`,
                              variant: "destructive",
                            });
                            return;
                          }

                          // Deduct from catch_records across the tank, starting from last then others
                          setOrderLoading(true);
                          setOrderError(null);
                          (async () => {
                            try {
                              let remaining = requestedLoad;
                              // Build deduction order: last first, then previous
                              const groupRecords = catchRecords
                                .filter(
                                  (cr) =>
                                    Number(cr.tank) === tank &&
                                    Number(cr.case_quantity || 0) > 0
                                )
                                .sort((a, b) => {
                                  const at = new Date(
                                    a.created_at || 0
                                  ).getTime();
                                  const bt = new Date(
                                    b.created_at || 0
                                  ).getTime();
                                  return at - bt;
                                });
                              const deductionOrder = [
                                ...groupRecords,
                              ].reverse();
                              const deductions: {
                                id: string;
                                deducted: number;
                              }[] = [];

                              for (const rec of deductionOrder) {
                                if (remaining <= 0) break;
                                const available = Number(
                                  rec.case_quantity || 0
                                );
                                if (available <= 0) continue;
                                const take = Math.min(available, remaining);
                                // Do NOT mutate DB stock here; we only record intended deductions
                                deductions.push({ id: rec.id, deducted: take });
                                remaining -= take;
                              }

                              if (remaining > 0) {
                                throw new Error(
                                  "Failed to deduct full requested load"
                                );
                              }

                              // Do NOT update local catch_records stock; defer until confirmation

                              // Add item to cart with aggregated stock and source ids
                              cartStore.addItem({
                                id: `tank-${tank}`,
                                tank: tank,
                                productName:
                                  lastRecord.fish_name ||
                                  lastRecord.species ||
                                  "Unknown",
                                productId:
                                  typeof lastRecord.haul_id === "object" &&
                                  lastRecord.haul_id !== null
                                    ? (
                                        lastRecord.haul_id as {
                                          qr_code: string;
                                        }
                                      ).qr_code
                                    : lastRecord.qr_code || lastRecord.id,
                                size: extractNumberFromFishSize(
                                  lastRecord.fish_size
                                ),
                                // Keep displayed stock as aggregatedStock; server will adjust upon confirm
                                stock: aggregatedStock,
                                quantityLoad: requestedLoad,
                                price: pricePerKg,
                                imageUrl: lastRecord.image_url,
                                fishSize: lastRecord.fish_size,
                                sourceRecordIds: deductions.map((d) => d.id),
                                // capture per-record deductions to restore on cart clear
                                deductions: deductions.map((d) => ({
                                  id: d.id,
                                  amount: d.deducted,
                                })),
                                // Attach trip, vessel, and to-port metadata
                                tripId: selectedTripId || undefined,
                                vesselId:
                                  trips.find((t) => t.id === selectedTripId)
                                    ?.vessel_id || undefined,
                                toPortId: form.to_port || undefined,
                              });

                              toast({
                                title: "Added to cart",
                                description: `Tank ${tank} added. Left stock: ${
                                  aggregatedStock - requestedLoad
                                }`,
                                variant: "default",
                              });
                            } catch (err) {
                              setOrderError(
                                err instanceof Error ? err.message : String(err)
                              );
                              toast({
                                title: "Stock update failed",
                                description:
                                  err instanceof Error
                                    ? err.message
                                    : String(err),
                                variant: "destructive",
                              });
                            } finally {
                              setOrderLoading(false);
                            }
                          })();
                        }}
                      >
                        <Label className="text-xs md:text-sm">
                          Quantity Load:
                        </Label>
                        <Input
                          type="number"
                          value={
                            orderForms[`tank-${tank}`]?.quantity_load || ""
                          }
                          onFocus={() => {
                            selectedTankKeyRef.current = `tank-${tank}`;
                          }}
                          onChange={(e) =>
                            setOrderForms((f) => ({
                              ...f,
                              [`tank-${tank}`]: {
                                ...f[`tank-${tank}`],
                                quantity_load: e.target.value,
                              },
                            }))
                          }
                          max={Number(aggregatedStock || 0)}
                          required
                          className="text-xs md:text-sm h-8 md:h-9"
                        />
                        <Label className="text-xs md:text-sm">Price:</Label>

                        <div className="flex items-center gap-2 bg-gray-100 px-2 rounded-md">
                          <Input
                            type="text"
                            value={
                              orderForms[`tank-${tank}`]?.bid_price
                                ? formatNumberWithCommas(
                                    orderForms[`tank-${tank}`].bid_price
                                  )
                                : ""
                            }
                            onFocus={() => {
                              selectedTankKeyRef.current = `tank-${tank}`;
                            }}
                            onChange={(e) => {
                              const inputValue = e.target.value;

                              // Allow clearing by checking if input is empty
                              if (!inputValue.trim()) {
                                setOrderForms((f) => ({
                                  ...f,
                                  [`tank-${tank}`]: {
                                    ...f[`tank-${tank}`],
                                    bid_price: "",
                                  },
                                }));
                                return;
                              }

                              // Remove commas for processing
                              const cleanInput = inputValue.replace(/,/g, "");
                              const processedValue =
                                parseInputValue(cleanInput);

                              setOrderForms((f) => ({
                                ...f,
                                [`tank-${tank}`]: {
                                  ...f[`tank-${tank}`],
                                  bid_price: processedValue,
                                },
                              }));
                            }}
                            placeholder="e.g., 45,000,000 or 1m, 2M, 1b"
                            required
                            className="flex-1 bg-gray-100 p-0 text-xs md:text-sm h-8 md:h-9"
                          />
                          <span className="text-gray-500 text-xs md:text-sm font-medium">
                            VND/kg
                          </span>
                        </div>

                        <Button
                          type="submit"
                          className="bg-red-500 text-white rounded px-3 md:px-4 py-1 mt-2 w-16 md:w-20 text-xs md:text-sm h-8 md:h-9"
                          disabled={
                            orderLoading ||
                            Number(aggregatedStock || 0) <= 0 ||
                            !form.to_port // Disable if to_port is not selected
                          }
                        >
                          {orderLoading ? "Submitting..." : "Submit"}
                        </Button>
                        {!form.to_port && (
                          <div className="text-red-500 text-xs md:text-sm">
                            ⚠️ Please select a "To Port" before submitting
                          </div>
                        )}
                        {orderError && (
                          <div className="text-red-500 text-xs md:text-sm">
                            {orderError}
                          </div>
                        )}
                      </form>
                    )}
                  </div>
                </div>
              )
            )}
        </div>
      ) : (
        <div className="text-center text-gray-500 mt-8">
          Please select a trip to view and manage tank products.
        </div>
      )}

      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-lg">
          <h2 className="text-xl font-bold text-blue-800 mb-2">
            LISTING RECEIPT
          </h2>
          <div>
            <QRCode value={lastOrder?.product_id} size={100} />
          </div>
          <div className="mb-2 flex flex-wrap gap-4 items-center">
            <div>
              <span className="font-bold">Receipt #:</span>
              <span className="ml-2 border-2 border-red-400 bg-white px-2 py-1 font-bold">
                {lastOrder?.product_id}
              </span>
            </div>
            <div>
              <span className="font-bold">Vessel ID:</span>
              <span className="ml-2 border-2 border-red-400 bg-white px-2 py-1 font-bold">
                {(() => {
                  const trip = trips.find((t) => t.id === selectedTripId);
                  const vessel = vessels.find((v) => v.id === trip?.vessel_id);
                  return vessel?.registration_number || trip?.vessel_id;
                })()}
              </span>
            </div>
            <div>
              <span className="font-bold">Trip ID:</span>
              <span className="ml-2 border-2 border-red-400 bg-white px-2 py-1 font-bold">
                {trips.find((t) => t.id === selectedTripId)?.trip_code}
              </span>
            </div>
            {/* Add Zone Dept and To Seaport as needed */}
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-blue-100">
                <TableHead>Tank#</TableHead>
                <TableHead>Available Load (kg)</TableHead>
                <TableHead>Price (VND/Kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>{lastOrder?.tank_number}</TableCell>
                <TableCell>{lastOrder?.quantity_load}</TableCell>
                <TableCell>
                  {lastOrder?.price || lastOrder?.bid_price
                    ? (
                        lastOrder?.price || lastOrder?.bid_price
                      )?.toLocaleString("vi-VN")
                    : "-"}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Button
            className="bg-red-500 text-white mt-4 w-full"
            onClick={() => setShowReceipt(false)}
          >
            Confirm
          </Button>
        </DialogContent>
      </Dialog>
      {/* Cart Summary Popup moved here to access local state */}
      <CartSummaryPopup
        selectedTripId={selectedTripId}
        tripCode={
          selectedTripId
            ? trips.find((t) => t.id === selectedTripId)?.trip_code || null
            : null
        }
        toPortId={form.to_port || null}
        ports={ports}
        onChangeToPort={(portId) => {
          const updatedForm = { ...form, to_port: portId };
          setForm(updatedForm);
          handleDeparturePortChange({
            target: { value: portId },
          } as React.ChangeEvent<HTMLSelectElement>);
        }}
        onCartCleared={async () => {
          // Refresh catch records and aggregated stocks after cart clear restores stock
          try {
            if (!selectedTripId) return;
            // 1. Fetch all hauls for the trip
            const { data: hauls, error: haulsError } = await supabase
              .from("fishing_hauls")
              .select("id")
              .eq("trip_id", selectedTripId);
            if (haulsError) return;
            const haulIds = (hauls as { id: string }[]).map((h) => h.id);
            if (haulIds.length === 0) {
              setCatchRecords([]);
              return;
            }
            // 2. Fetch all catch_records for those hauls
            const { data: catchData, error: catchError } = await supabase
              .from("catch_records")
              .select("*, haul_id(id, haul_number, qr_code)")
              .in("haul_id", haulIds)
              .order("created_at", { ascending: false });
            if (catchError) return;
            setCatchRecords((catchData as any) || []);
          } catch (e) {
            // swallow
          }
        }}
        onSuccess={(qr) => {
          // Open success dialog, show QR, and clear inputs
          setSuccessDialog({ isOpen: true, successQr: qr });
          // Clear Quantity and Price inputs for current tank selection
          const tankKey = selectedTankKeyRef?.current || null;
          if (tankKey) {
            setOrderForms((f) => ({
              ...f,
              [tankKey]: {
                ...f[tankKey],
                quantity_load: "",
                bid_price: "",
                price: "",
              },
            }));
          }
        }}
      />

      {/* Success Dialog */}
      <Dialog
        open={successDialog.isOpen}
        onOpenChange={(open) =>
          setSuccessDialog((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit 2Share</DialogTitle>
          </DialogHeader>
          {successDialog.successQr ? (
            <div className="flex flex-col items-center">
              <div id="success-qr" className="flex flex-col items-center">
                <p className="mb-2">Chuyển tải thành công!</p>
                <QRCodeCanvas value={successDialog.successQr} size={180} />
                <p className="mt-2 break-all">{successDialog.successQr}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  onClick={() => {
                    const canvas = document.querySelector(
                      "#success-qr canvas"
                    ) as HTMLCanvasElement | null;
                    if (canvas) {
                      const link = document.createElement("a");
                      link.href = canvas.toDataURL("image/png");
                      link.download = "2share-qr.png";
                      link.click();
                    }
                  }}
                >
                  Download QR
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    // Navigate to transactions page filtered by this QR or ID
                    const url = `/processing-plant/transaction?qr=${encodeURIComponent(
                      successDialog.successQr || ""
                    )}`;
                    window.location.href = url;
                  }}
                >
                  Track your 2Share
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TwoShareLoading() {
  const { language } = useLanguageStore();
  const isMobile = useIsMobile();
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader
          title={language === "en" ? "2Share Loading" : "Chuyển tải"}
        />
        <TopButtons />

        <div className="px-3 flex gap-2 md:gap-3 lg:gap-4 overflow-x-auto">
          <Link to="/transportation/2share-loading" className="flex-shrink-0">
            <button
              className={`
                bg-gradient-to-r from-black to-[#1306ad] text-[#f8f603] rounded-md px-4 md:px-5
                h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                text-xs md:text-base
                w-32 md:w-36 lg:w-40
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
                bg-gradient-to-r from-[#a8a8a8] to-[#fdfdfd] text-black  rounded-md px-4 md:px-5
                h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                text-xs md:text-base
                w-32 md:w-36 lg:w-40 shadow-lg hover:shadow-xl transition-all duration-300
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
