import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import TopButtons from "@/components/top-buttons";
import { useEffect, useState } from "react";
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
  LucideClockFading,
  Loader2,
  SplinePointer,
  Camera,
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
import { API_ENDPOINTS, APP_CONFIG } from "@/lib/constants";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import FishScanComponent from "@/components/dashboard/FishScanComponent";
import { computeZoneByNearestSeaport } from "@/lib/zone-utils";

// Type for a seaport row
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
};
function getDaysBetween(start: string, end: string) {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.max(0, Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24)));
}

// Function to get coordinates from address using Google Maps Geocoding API
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

// Add proper interfaces for type safety
interface ScannedFishData {
  success: boolean;
  processor: string;
  timestamp: string;
  analysis: {
    en: {
      common_name: string;
      species: string;
      total_number_of_fish: string;
      average_fish_size: string;
      estimated_weight_per_fish: string;
      total_estimated_weight: string;
    };
    vi: {
      common_name: string;
      species: string;
      total_number_of_fish: string;
      average_fish_size: string;
      estimated_weight_per_fish: string;
      total_estimated_weight: string;
    };
  };
}

interface HaulFormData {
  trip_id: string;
  haul_number: number;
  latitude: number | null;
  longitude: number | null;
  depth: number | null;
  notes: string | null;
  start_time: string | null;
  end_time: string | null;
  qr_code: string;
  catch_records: CatchRecordData[];
}

interface CatchFormData {
  haul_id: string;
  species: string;
  fish_name: string;
  quantity: number;
  capture_zone: string;
  image_url?: string;
  qr_code: string;
  fish_specie?: string;
  three_a_code?: string;
  capture_date?: string;
  capture_time?: string;
  tank?: string;
  case_size?: string;
  net_kg_per_case?: string;
  region?: string;
  latitude?: string;
  longitude?: string;
  catching_location?: string;
  fish_size?: string;
  case_quantity?: string;
  fish_species?: string;
  coordinates?: {
    lat: string;
    lng: string;
  };
}

interface HaulData {
  id: string;
  trip_id: string;
  haul_number: number;
  latitude: number | null;
  longitude: number | null;
  depth: number | null;
  notes: string | null;
  start_time: string | null;
  end_time: string | null;
  qr_code: string;
  created_at: string;
  region?: string;
  catch_records?: CatchRecord[];
}

interface CatchRecord {
  id?: string; // Make id optional for new records
  haul_id: string;
  species: string;
  quantity: number; // Changed from string to number to match numeric type
  unit: string;
  quality: string | null;
  processing_method: string | null;
  catching_location: string | null;
  fish_name: string | null;
  fish_specie: string | null;
  fish_size: string | null;
  tank: string | null;
  case_size: string | null;
  net_kg_per_case: string | null;
  capture_date: string | null;
  capture_time: string | null;
  capture_zone: string | null;
  region: string | null;
  three_a_code: string | null;
  qr_code: string;
  farmer_id: string | null;
  image_url: string | null;
  latitude: string | null;
  longitude: string | null;
  fish_product_id?: string;
  created_at?: string;
  updated_at?: string | null;
}
interface CatchRecordData {
  id: string;
  haul_id: string;
  species: string;
  fish_name: string;
  quantity: number;
  capture_location: string;
  catching_location: string;
  capture_zone: string;
  notes: string;
  image_url?: string;
  qr_code: string;
  created_at: string;
  fish_specie?: string;
  three_a_code?: string;
  fish_size?: string;
  capture_time?: string;
  case_size?: string;
  case_quantity?: string;
  net_kg_per_case?: string;
  tank?: string;
}

interface HaulTotals {
  total_quantity: number;
  unique_tanks: number;
  total_net_kg: number;
  catch_records: CatchRecord[];
}

// Traditional Coastal Regions (A-D) - Administrative zones
function getTraditionalCoastalRegion(
  latitude: number,
  longitude: number
): {
  code: string;
  name: string;
  description: string;
} {
  const coastalRegions = {
    A: {
      name: "Cà Mau – Kiên Giang",
      description:
        "Southwest coast of Vietnam, near Gulf of Thailand. A major nearshore fishing area.",
      bounds: { minLat: 8.5, maxLat: 10.5, minLng: 104.0, maxLng: 105.5 },
    },
    B: {
      name: "Đà Nẵng – Thanh Hóa",
      description:
        "Central-north coast, covering mid to upper central Vietnam.",
      bounds: { minLat: 15.5, maxLat: 17.5, minLng: 107.5, maxLng: 109.0 },
    },
    C: {
      name: "Hải Phòng – Vũng Tàu",
      description:
        "A long stretch from the north (Hải Phòng) to south (Vũng Tàu), includes diverse ecosystems.",
      bounds: { minLat: 20.0, maxLat: 22.0, minLng: 106.0, maxLng: 107.5 },
    },
    D: {
      name: "Hải Dương – Thái Bình",
      description: "Smaller northern coast zone near Red River delta.",
      bounds: { minLat: 20.5, maxLat: 21.5, minLng: 106.5, maxLng: 107.0 },
    },
  };

  // Find which traditional coastal region the coordinates belong to
  for (const [code, region] of Object.entries(coastalRegions)) {
    const { bounds } = region;
    if (
      latitude >= bounds.minLat &&
      latitude <= bounds.maxLat &&
      longitude >= bounds.minLng &&
      longitude <= bounds.maxLng
    ) {
      return {
        code,
        name: region.name,
        description: region.description,
      };
    }
  }

  return {
    code: "X",
    name: "Outside Traditional Coastal Regions",
    description:
      "Coordinates outside Vietnam's traditional coastal regions A-D.",
  };
}

// Ngư Trường (EC30 zones) - Technical grid reference
function calculateEC30Zone(
  latitude: number,
  longitude: number
): {
  zone: string;
  ec30Code: string;
  region: string;
  coordinates: { lat: number; lng: number };
  ngutruong: string;
  area_km2: number;
} {
  // Vietnam's 4 major Ngư Trường (fishing grounds) with their EC30 zone boundaries
  const vietnamNgutruong = {
    "Ngư Trường Vinh Bắc Bộ (Tonkin Gulf)": {
      bounds: { minLat: 20.0, maxLat: 22.0, minLng: 106.0, maxLng: 108.0 },
      ec30Zones: 20, // 20 EC30 zones in this region (10 long × 2 wide)
      startEC30: "V01",
      area_km2: 18000, // 20 × 900 km²
    },
    "Ngư Trường Trung Bộ (Central Coast)": {
      bounds: { minLat: 15.0, maxLat: 17.5, minLng: 107.5, maxLng: 109.5 },
      ec30Zones: 15, // 15 EC30 zones in this region
      startEC30: "T01",
      area_km2: 13500, // 15 × 900 km²
    },
    "Ngư Trường Đông Nam Bộ (South-East Sea)": {
      bounds: { minLat: 9.0, maxLat: 11.5, minLng: 105.5, maxLng: 107.5 },
      ec30Zones: 25, // 25 EC30 zones in this region (5 long × 5 wide)
      startEC30: "D01",
      area_km2: 22500, // 25 × 900 km²
    },
    "Ngư Trường Trường Sa (Spratly Islands)": {
      bounds: { minLat: 7.0, maxLat: 12.0, minLng: 110.0, maxLng: 115.0 },
      ec30Zones: 60, // 60 EC30 zones in this region (10 long × 6 wide)
      startEC30: "S01",
      area_km2: 54000, // 60 × 900 km²
    },
  };

  // Find which Ngư Trường the coordinates belong to
  let selectedNgutruong = null;
  let ngutruongName = "";

  for (const [ngutruong, data] of Object.entries(vietnamNgutruong)) {
    const { bounds } = data;
    if (
      latitude >= bounds.minLat &&
      latitude <= bounds.maxLat &&
      longitude >= bounds.minLng &&
      longitude <= bounds.maxLng
    ) {
      selectedNgutruong = data;
      ngutruongName = ngutruong;
      break;
    }
  }

  if (!selectedNgutruong) {
    return {
      zone: "Outside Vietnam Waters",
      ec30Code: "XX00",
      region: "International Waters",
      coordinates: { lat: latitude, lng: longitude },
      ngutruong: "Outside Ngư Trường",
      area_km2: 0,
    };
  }

  // Calculate EC30 zone within the Ngư Trường
  const { bounds, ec30Zones, startEC30, area_km2 } = selectedNgutruong;

  // Calculate relative position within the region (0-1)
  const latRatio = (latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat);
  const lngRatio =
    (longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng);

  // Calculate zone number within the Ngư Trường
  const gridSize = Math.sqrt(ec30Zones);
  const latGrid = Math.floor(latRatio * gridSize);
  const lngGrid = Math.floor(lngRatio * gridSize);

  // Calculate zone number (1 to ec30Zones)
  const zoneNumber = latGrid * gridSize + lngGrid + 1;

  // Ensure zone number is within valid range
  const validZoneNumber = Math.min(Math.max(zoneNumber, 1), ec30Zones);

  // Create EC30 code (e.g., V01, T05, D12, S25, etc.)
  const regionPrefix = startEC30.charAt(0);
  const ec30Code = `${regionPrefix}${validZoneNumber
    .toString()
    .padStart(2, "0")}`;

  // Get the short name for the Ngư Trường
  const shortName = ngutruongName.split(" (")[0].split("Ngư Trường ")[1];

  return {
    zone: `${ngutruongName} - EC30 ${ec30Code}`,
    ec30Code: ec30Code,
    region: shortName,
    coordinates: { lat: latitude, lng: longitude },
    ngutruong: ngutruongName,
    area_km2: area_km2,
  };
}

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

function BatchContainer() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [trips, setTrips] = useState<
    Database["public"]["Tables"]["fishing_trips"]["Row"][]
  >([]);
  const [vessels, setVessels] = useState<
    Database["public"]["Tables"]["vessels"]["Row"][]
  >([]);
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
  const [tripQrUrl, setTripQrUrl] = useState<string | undefined>();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [haulsByTripId, setHaulsByTripId] = useState<
    Record<string, HaulData[]>
  >({});
  const [showHaulDialog, setShowHaulDialog] = useState(false);
  const [haulForm, setHaulForm] = useState<HaulFormData | null>(null);
  const [haulLoading, setHaulLoading] = useState(false);
  const [haulError, setHaulError] = useState<string | null>(null);
  const [showCatchDialog, setShowCatchDialog] = useState(false);
  const [selectedHaul, setSelectedHaul] = useState<HaulData | null>(null);
  const [catchRecords, setCatchRecords] = useState<CatchRecordData[]>([]);
  const [catchLoading, setCatchLoading] = useState(false);
  const [catchForm, setCatchForm] = useState<CatchFormData | null>(null);
  const [catchError, setCatchError] = useState<string | null>(null);
  const [catchImage, setCatchImage] = useState<File | null>(null);
  const [catchImageUrl, setCatchImageUrl] = useState<string | null>(null);
  const [showGlobalHaulDialog, setShowGlobalHaulDialog] = useState(false);
  const [globalHaulTripId, setGlobalHaulTripId] = useState<string | null>(null);
  const [globalHaulForm, setGlobalHaulForm] = useState<HaulFormData | null>(
    null
  );
  const [globalHaulLoading, setGlobalHaulLoading] = useState(false);
  const [globalHaulError, setGlobalHaulError] = useState<string | null>(null);
  const [createdGlobalHaul, setCreatedGlobalHaul] = useState<HaulData | null>(
    null
  );
  const [locationDenied, setLocationDenied] = useState(false);
  const [showGlobalCatchDialog, setShowGlobalCatchDialog] = useState(false);
  const [globalCatchTripId, setGlobalCatchTripId] = useState<string | null>(
    null
  );
  const [globalCatchHauls, setGlobalCatchHauls] = useState<HaulData[]>([]);
  const [globalCatchHaulId, setGlobalCatchHaulId] = useState<string | null>(
    null
  );
  const [globalCatchForm, setGlobalCatchForm] = useState<CatchFormData | null>(
    null
  );
  const [globalCatchLoading, setGlobalCatchLoading] = useState(false);
  const [globalCatchError, setGlobalCatchError] = useState<string | null>(null);
  const [createdGlobalCatch, setCreatedGlobalCatch] =
    useState<CatchRecord | null>(null);

  const [haulTotals, setHaulTotals] = useState<Record<string, HaulTotals>>({});

  // AI Fish Scan states
  const [showFishScan, setShowFishScan] = useState(false);
  const [scannedFishData, setScannedFishData] =
    useState<ScannedFishData | null>(null);
  const [capturedFishImage, setCapturedFishImage] = useState<string | null>(
    null
  );
  const [generatedQRCode, setGeneratedQRCode] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);

  const [showAddOtherFish, setShowAddOtherFish] = useState(false);

  // Loading state for fish scanning process
  const [isLoadingFormData, setIsLoadingFormData] = useState(false);

  const { user, isAuthenticated } = useAuthStore();

  // Form filling with loading indicator
  const animateFormFilling = async (formData: CatchFormData) => {
    // Show loading state in input fields
    setIsLoadingFormData(true);

    // Fill the form data immediately, but preserve existing user-entered values
    setGlobalCatchForm((prev) => ({
      ...prev,
      fish_name: formData.fish_name,
      fish_specie: formData.fish_specie || "",
      three_a_code: formData.three_a_code || "",
      fish_size: formData.fish_size || "",
      // Only update capture_zone if it's empty or not manually entered by user
      capture_zone:
        prev?.capture_zone && prev.capture_zone.trim() !== ""
          ? prev.capture_zone
          : formData.capture_zone || "",
      capture_time: formData.capture_time || "",
    }));

    // Hide loading state after data is filled
    setIsLoadingFormData(false);
  };

  useEffect(() => {
    fetchVessels();
    fetchPorts();
  }, []);

  useEffect(() => {
    fetchTrips();
    // eslint-disable-next-line
  }, [selectedTripId]);

  useEffect(() => {
    if (successDialog) setDialogOpen(false);
  }, [successDialog]);

  // Auto-select the latest trip with Catching status
  useEffect(() => {
    if (!selectedTripId && trips.length > 0) {
      const latestCatchingTrip = trips.find(
        (trip) => trip.status === "Catching"
      );
      console.log("latestCatchingTrip ", latestCatchingTrip);
      if (latestCatchingTrip) {
        setSelectedTripId(latestCatchingTrip.id);

        fetchHaulsForTrip(latestCatchingTrip.id);
      }
    }
  }, [selectedTripId, trips]);

  async function fetchHaulTotals(haulId: string) {
    try {
      const { data: catchRecords, error } = await supabase
        .from("catch_records")
        .select("*")
        .eq("haul_id", haulId);

      if (error) {
        console.error("Error fetching catch records:", error);
        return null;
      }

      // Map the fetched data to match CatchRecord interface
      const mappedCatchRecords: CatchRecord[] = catchRecords.map(
        (record: Record<string, unknown>) => ({
          id: record.id as string,
          haul_id: record.haul_id as string,
          species: record.species as string,
          quantity: record.quantity as number,
          unit: record.unit as string,
          quality: record.quality as string | null,
          processing_method: record.processing_method as string | null,
          catching_location: record.catching_location as string | null,
          fish_name: record.fish_name as string | null,
          fish_specie: record.fish_specie as string | null,
          fish_size: record.fish_size as string | null,
          tank: record.tank as string | null,
          case_size: record.case_size as string | null,
          net_kg_per_case: record.net_kg_per_case as string | null,
          capture_date: record.capture_date as string | null,
          capture_time: record.capture_time as string | null,
          capture_zone: record.capture_zone as string | null,
          region: record.region as string | null,
          three_a_code: record.three_a_code as string | null,
          qr_code: record.qr_code as string,
          farmer_id: record.farmer_id as string | null,
          image_url: record.image_url as string | null,
          latitude: record.latitude as string | null,
          longitude: record.longitude as string | null,
          fish_product_id: record.fish_product_id as string | undefined,
          created_at: record.created_at as string | undefined,
          updated_at: record.updated_at as string | null,
        })
      );

      const totals: HaulTotals = {
        total_quantity: mappedCatchRecords.reduce(
          (sum, rec) => sum + Number(rec.quantity || 0),
          0
        ),
        unique_tanks: Array.from(
          new Set(mappedCatchRecords.map((rec) => rec.tank).filter(Boolean))
        ).length,
        total_net_kg: mappedCatchRecords.reduce(
          (sum, rec) => sum + Number(rec?.net_kg_per_case || 0),
          0
        ),
        catch_records: mappedCatchRecords || [],
      };

      return totals;
    } catch (error) {
      console.error("Error in fetchHaulTotals:", error);
      return null;
    }
  }

  const fetchAndUpdateHaulTotals = async (haulId: string) => {
    const totals = await fetchHaulTotals(haulId);
    if (totals) {
      setHaulTotals((prev) => ({ ...prev, [haulId]: totals }));
    }
  };

  // Add useEffect to fetch totals when globalCatchHaulId changes
  useEffect(() => {
    if (globalCatchHaulId) {
      fetchAndUpdateHaulTotals(globalCatchHaulId);
    }
  }, [globalCatchHaulId]);

  // Add useEffect to fetch totals for all hauls in globalCatchHauls
  useEffect(() => {
    const fetchAllHaulTotals = async () => {
      for (const haul of globalCatchHauls) {
        await fetchAndUpdateHaulTotals(haul.id);
      }
    };

    if (globalCatchHauls.length > 0) {
      fetchAllHaulTotals();
    }
  }, [globalCatchHauls.length]); // Use length instead of the entire array to prevent infinite loops

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
        .eq("user_id", userId);

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
      let accessibleVessels: Record<string, unknown>[] = [];
      if (accessibleVesselIds.length > 0) {
        const { data: accessibleData, error: accessibleError } = await supabase
          .from("vessels")
          .select("*")
          .in("id", accessibleVesselIds);

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
    } catch (error) {
      console.error("Error fetching vessels:", error);
    }
  }

  async function fetchPorts() {
    const { data } = await supabase.from("seaports").select(`*`);
    setPorts(data || []);
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

      let query = supabase
        .from("fishing_trips")
        .select(
          `
          *,
          vessels!inner (
            id,
            name,
            registration_number
          ),
          seaports!inner (
          id,
          name,
          number,
          latitude,
          longitude,
          address,
          province,
          district,
          ward
          )
        `,
          { count: "exact" }
        )
        .in("vessel_id", allVesselIds);

      if (searchTerm) {
        query = query.or(
          `trip_code.ilike.%${searchTerm}%,departure_port.ilike.%${searchTerm}%`
        );
      }

      const { data, error, count } = await query
        .range((page - 1) * perPage, page * perPage - 1)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Data is already ordered by created_at descending, so first match is most recent
      const lastCachingTrip = data?.find(
        (trip) => trip.status === "Catching" || true
      );

      // console.log("lastCachingTrip ", lastCachingTrip);
      if (selectedTripId || lastCachingTrip) {
        if (!selectedTripId) setSelectedTripId(lastCachingTrip.id);
        if (!globalCatchTripId) setGlobalCatchTripId(lastCachingTrip.id);

        // Fetch hauls for the last caching trip
        const { data: hauls } = await supabase
          .from("fishing_hauls")
          .select("*")
          .eq("trip_id", selectedTripId || lastCachingTrip.id)
          .order("created_at", { ascending: false });

        // Set hauls and most recent haul ID
        const mappedHauls: HaulData[] = (hauls || []).map((haul) => ({
          id: haul.id,
          trip_id: haul.trip_id,
          haul_number: haul.haul_number,
          latitude: haul.latitude,
          longitude: haul.longitude,
          depth: haul.depth,
          notes: haul.notes,
          start_time: haul.start_time,
          end_time: haul.end_time,
          qr_code: haul.qr_code,
          created_at: haul.created_at,
          region: trips.find((t) => t.id === haul.trip_id)?.to_region,
          catch_records: [],
        }));
        setGlobalCatchHauls(mappedHauls);
        if (hauls && hauls.length > 0) {
          setGlobalCatchHaulId(hauls[0].id); // Most recent haul
          fetchCatchRecords(hauls[0].id);
        } else {
          setGlobalCatchHaulId(null);
          setCatchRecords([]);
        }
      } else {
        // Reset states if no caching trip found
        setSelectedTripId(null);
        setGlobalCatchTripId(null);
        setGlobalCatchHauls([]);
        setGlobalCatchHaulId(null);
      }

      setTrips(data || []);
      setTotal(count || 0);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message);
    } finally {
      setLoading(false);
    }
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
  }, [submitted]);

  // Monitor localStorage for fish analysis results
  useEffect(() => {
    const checkForAnalysisResult = async () => {
      const analysisResult = localStorage.getItem("fishAnalysisResult");
      const capturedImage = localStorage.getItem("capturedFishImage");

      if (analysisResult) {
        try {
          const parsedResult = JSON.parse(analysisResult);
          console.log("Found analysis result:", parsedResult);

          if (parsedResult.success && parsedResult.analysis) {
            // INSTANTLY show analysis results first
            setScannedFishData(parsedResult);

            if (capturedImage) {
              setCapturedFishImage(capturedImage);
            }

            // Use cached zone data or default vessel zone to avoid repeated API calls
            let computedZone = "";
            let userLat = 0;
            let userLon = 0;
            let ec30ZoneData = "";

            // Try to get cached zone first
            const cachedZone = localStorage.getItem("lastKnownZone");
            const cachedCoords = localStorage.getItem("lastKnownCoords");
            
            if (cachedZone && cachedCoords) {
              try {
                const coords = JSON.parse(cachedCoords);
                computedZone = cachedZone;
                userLat = coords.lat;
                userLon = coords.lng;
                console.log("Using cached zone data:", { computedZone, userLat, userLon });
              } catch (e) {
                console.warn("Failed to parse cached coordinates:", e);
              }
            }

            // If no cached zone, try to use user's default vessel current_zone
            if (!computedZone && user?.default_vessel?.current_zone) {
              computedZone = user.default_vessel.current_zone;
              // Use default coordinates for Vietnam waters
              userLat = 10.8231;
              userLon = 106.6297;
              console.log("Using default vessel zone:", computedZone);
            }

            // If still no zone, use fallback
            if (!computedZone) {
              userLat = 10.8231; // Default to Ho Chi Minh City
              userLon = 106.6297;
              const ec30Zone = calculateEC30Zone(userLat, userLon);
              ec30ZoneData = JSON.stringify(ec30Zone);
              computedZone = ec30Zone.ec30Code;
              console.log("Using EC30 fallback zone:", computedZone);
            }

            // Prepare form data for animated filling
            const analysis = parsedResult.analysis;
            const captureTime = new Date();
            const formattedCaptureTime = captureTime.toLocaleString("en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            });

            const newFormData: CatchFormData = {
              haul_id: globalCatchHaulId || "",
              species:
                analysis.vi?.species ||
                analysis.en?.species ||
                globalCatchForm?.fish_specie ||
                "",
              fish_name:
                analysis.vi?.common_name ||
                analysis.en?.common_name ||
                globalCatchForm?.fish_name ||
                "",
              quantity: parseFloat(
                analysis.vi?.total_estimated_weight ||
                  analysis.en?.total_estimated_weight ||
                  globalCatchForm?.quantity ||
                  "0"
              ),
              fish_specie:
                analysis.vi?.species ||
                analysis.en?.species ||
                globalCatchForm?.fish_specie ||
                "",
              three_a_code: (
                analysis.vi?.species ||
                analysis.en?.species ||
                globalCatchForm?.fish_specie ||
                ""
              )
                .substring(0, 3)
                .toUpperCase(),
              fish_size: `${
                analysis.vi?.average_fish_size ||
                analysis.en?.average_fish_size ||
                globalCatchForm?.fish_size ||
                ""
              }`,
              net_kg_per_case:
                analysis.vi?.total_estimated_weight ||
                analysis.en?.total_estimated_weight ||
                globalCatchForm?.net_kg_per_case ||
                "12",
              qr_code: "",
              capture_date: captureTime.toISOString().split("T")[0],
              capture_time: formattedCaptureTime,
              latitude: userLat.toString() || "",
              longitude: userLon.toString() || "",
              region:
                userLat && userLon
                  ? getTraditionalCoastalRegion(userLat, userLon).code
                  : "",
              capture_zone:
                // Preserve existing capture_zone if user has already entered a value
                globalCatchForm?.capture_zone &&
                globalCatchForm.capture_zone.trim() !== ""
                  ? globalCatchForm.capture_zone
                  : computedZone ||
                    (ec30ZoneData
                      ? (() => {
                          try {
                            return JSON.parse(ec30ZoneData).ec30Code;
                          } catch (e) {
                            console.warn(
                              "Failed to parse ec30ZoneData for ec30Code:",
                              e
                            );
                            return "";
                          }
                        })()
                      : "") ||
                    "",
              catching_location:
                (() => {
                  try {
                    return ec30ZoneData ? JSON.parse(ec30ZoneData).zone : "";
                  } catch (e) {
                    console.warn("Failed to parse ec30ZoneData for zone:", e);
                    return globalCatchForm?.catching_location || "";
                  }
                })() ||
                globalCatchForm?.catching_location ||
                "",
              coordinates: {
                lat: (() => {
                  try {
                    return ec30ZoneData
                      ? JSON.parse(ec30ZoneData).coordinates.lat || ""
                      : "";
                  } catch (e) {
                    console.warn(
                      "Failed to parse ec30ZoneData for coordinates.lat:",
                      e
                    );
                    return "";
                  }
                })(),
                lng: (() => {
                  try {
                    return ec30ZoneData
                      ? JSON.parse(ec30ZoneData).coordinates.lng || ""
                      : "";
                  } catch (e) {
                    console.warn(
                      "Failed to parse ec30ZoneData for coordinates.lng:",
                      e
                    );
                    return "";
                  }
                })(),
              },
              image_url: capturedImage || "",
              tank: globalCatchForm?.tank || "1",
              case_size: globalCatchForm?.case_size || "15",
              case_quantity: globalCatchForm?.case_quantity || "300",
            };

            // Use animated form filling instead of direct setting
            animateFormFilling(newFormData);

            // Clear the localStorage to prevent re-processing
            try {
              localStorage.removeItem("fishAnalysisResult");
            } catch (e) {
              console.warn(
                "Failed to clear fishAnalysisResult from localStorage",
                e
              );
            }
          }
        } catch (error) {
          console.error("Error parsing analysis result:", error);
        }
      }
    };

    // Check immediately
    checkForAnalysisResult();

    // Set up interval to check every second when fish scan is active
    let interval: NodeJS.Timeout;
    if (showFishScan) {
      interval = setInterval(checkForAnalysisResult, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [showFishScan, scannedFishData, globalCatchHaulId, globalCatchForm]);

  // When scanned data arrives, close scanner and scroll to form section
  useEffect(() => {
    if (scannedFishData) {
      setShowFishScan(false);
      setTimeout(() => {
        document
          .getElementById("fish-scan-section")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [scannedFishData]);
  useEffect(() => {
    if (showAddOtherFish) {
      setTimeout(() => {
        document
          .getElementById("fish-scan-section")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [showAddOtherFish]);

  const handleSubmitCatchRecord = async (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();

    setGlobalCatchLoading(true);
    setGlobalCatchError(null);

    // Show loading toast
    toast({
      title: "Processing...",
      description: "Submitting catch record and generating QR code",
      variant: "default",
    });

    // Validate required data
    if (!globalCatchTripId || !globalCatchHaulId) {
      const errorMsg = "Missing required data: Trip ID or Haul ID";
      console.error(errorMsg);
      toast({
        title: "Validation Error",
        description: "Trip ID or Haul ID is missing. Please check your data.",
        variant: "destructive",
      });
      setGlobalCatchLoading(false);
      return;
    }

    if (!globalCatchForm) {
      const errorMsg = "No catch form data available";
      console.error(errorMsg);
      toast({
        title: "Validation Error",
        description:
          "No catch form data available. Please fill in the form first.",
        variant: "destructive",
      });
      setGlobalCatchLoading(false);
      return;
    }

    // Validate required fields and set defaults
    const validationErrors: string[] = [];

    // Set default values if not present
    if (
      !globalCatchForm?.case_size ||
      globalCatchForm.case_size.trim() === ""
    ) {
      setGlobalCatchForm((prev) => ({ ...prev, case_size: "15" }));
    }

    if (
      !globalCatchForm?.case_quantity ||
      globalCatchForm.case_quantity.trim() === ""
    ) {
      setGlobalCatchForm((prev) => ({ ...prev, case_quantity: "300 cases" }));
    }

    if (
      !globalCatchForm?.net_kg_per_case ||
      globalCatchForm.net_kg_per_case.trim() === ""
    ) {
      setGlobalCatchForm((prev) => ({ ...prev, net_kg_per_case: "12" }));
    }

    // Extract coordinates and region from zone format like "Zone1-EC143(10.823100-106.629700)"
    let extractedLat = globalCatchForm?.latitude || "";
    let extractedLng = globalCatchForm?.longitude || "";
    let extractedRegion = globalCatchForm?.region || "";

    // Check if we have a zone format and extract region, coordinates
    if (globalCatchForm?.capture_zone) {
      // Extract region number from Zone format (e.g., "Zone1" -> "1")
      const regionMatch = globalCatchForm.capture_zone.match(/Zone(\d+)/);
      if (regionMatch && !extractedRegion) {
        extractedRegion = regionMatch[1];
        setGlobalCatchForm((prev) => ({ ...prev, region: extractedRegion }));
      }

      // Extract coordinates from the zone format
      if (!extractedLat && !extractedLng) {
        const coordinateMatch = globalCatchForm.capture_zone.match(
          /\(([0-9.-]+)-([0-9.-]+)\)/
        );
        if (coordinateMatch) {
          extractedLat = coordinateMatch[1];
          extractedLng = coordinateMatch[2];
          setGlobalCatchForm((prev) => ({
            ...prev,
            latitude: extractedLat,
            longitude: extractedLng,
          }));
        }
      }
    }

    // Handle quantity - set to 1 if 0 or empty, extract number from case_quantity
    const caseQuantityStr = globalCatchForm?.case_quantity || "300 cases";
    const quantityMatch = caseQuantityStr.match(/(\d+)/);
    let quantityValue = quantityMatch ? parseFloat(quantityMatch[1]) : 1;

    if (!quantityValue || quantityValue <= 0) {
      quantityValue = 1;
      setGlobalCatchForm((prev) => ({ ...prev, case_quantity: "1 cases" }));
    }

    // Only validate Product name and image - show warnings for these required fields
    if (
      !globalCatchForm?.fish_name ||
      globalCatchForm.fish_name.trim() === ""
    ) {
      validationErrors.push("Product name is required");
    }

    // Check if image is present (either capturedFishImage from scan, catchImage, or image_url)
    // if (!capturedFishImage && !catchImage && (!globalCatchForm?.image_url || globalCatchForm.image_url.trim() === "")) {
    //   validationErrors.push("Image is required");
    // }

    // If there are validation errors, show them and return
    if (validationErrors.length > 0) {
      toast({
        title: "Validation Error",
        description: validationErrors.join(", "),
        variant: "destructive",
      });
      setGlobalCatchLoading(false);
      return;
    }

    let ec30ZoneData = "";
    let userLat = 0;
    let userLon = 0;
    let computedZone = "";

    if (!globalCatchForm.capture_zone) {
      // Get current location synchronously
      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false, // Use network location for faster response
              timeout: 8000, // Reduced timeout to 8 seconds
              maximumAge: 60000, // Allow cached location up to 1 minute
            });
          }
        );

        userLat = position.coords.latitude;
        userLon = position.coords.longitude;

        // Try to compute zone using location service first
        try {
          const zoneInfo = await computeZoneByNearestSeaport(userLat, userLon);
          computedZone = zoneInfo.zoneName;
          
          // Cache successful zone computation to avoid repeated API calls
          localStorage.setItem("lastKnownZone", computedZone);
          localStorage.setItem("lastKnownCoords", JSON.stringify({ lat: userLat, lng: userLon }));
          console.log("Zone cached successfully:", computedZone);
        } catch (zoneError) {
          console.warn(
            "Zone computation failed; using EC30 fallback:",
            zoneError
          );
          const ec30Zone = calculateEC30Zone(userLat, userLon);
          ec30ZoneData = JSON.stringify(ec30Zone);
          computedZone = ec30Zone.ec30Code;
        }

        console.log("Zone data computed", { computedZone, userLat, userLon });
      } catch (error) {
        const errorMsg = `Error getting location: ${error}`;
        console.error(errorMsg);

        let locationErrorMessage = "Failed to get your location";

        if (error instanceof GeolocationPositionError) {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              locationErrorMessage =
                "Location access denied. Please enable location services in your browser settings.";
              break;
            case error.POSITION_UNAVAILABLE:
              locationErrorMessage =
                "Location information unavailable. Please check your GPS signal.";
              break;
            case error.TIMEOUT:
              locationErrorMessage =
                "Location request timed out after 30 seconds. Please ensure GPS is enabled and try again, or move to an area with better signal reception.";
              break;
            default:
              locationErrorMessage =
                "Location service error. Using default coordinates.";
          }
        } else if (error instanceof Error) {
          locationErrorMessage = `Location error: ${error.message}`;
        }

        toast({
          title: "Location Error",
          description: `${locationErrorMessage} Using default coordinates.`,
          variant: "destructive",
        });

        // Use default coordinates if geolocation fails
        userLat = 10.8231; // Default to Ho Chi Minh City
        userLon = 106.6297;

        // Try to compute zone using location service with default coordinates
        try {
          const zoneInfo = await computeZoneByNearestSeaport(userLat, userLon);
          computedZone = zoneInfo.zoneName;
          
          // Cache successful zone computation to avoid repeated API calls
          localStorage.setItem("lastKnownZone", computedZone);
          localStorage.setItem("lastKnownCoords", JSON.stringify({ lat: userLat, lng: userLon }));
          console.log("Zone cached successfully (default coords):", computedZone);
        } catch (zoneError) {
          console.warn(
            "Zone computation failed with default coordinates; using EC30 fallback:",
            zoneError
          );
          const ec30Zone = calculateEC30Zone(userLat, userLon);
          ec30ZoneData = JSON.stringify(ec30Zone);
          computedZone = ec30Zone.ec30Code;
        }
      }
    }
    console.log("globalCatchForm submit", globalCatchForm);
    try {
      let imageUrl = globalCatchForm.image_url || "";
      const storedImage = localStorage.getItem("capturedFishImage");
      if (storedImage) {
        setCapturedFishImage(storedImage);
      }
      if (storedImage) {
        // Convert base64 to File object
        const base64Response = await fetch(storedImage);
        const blob = await base64Response.blob();
        const file = new File([blob], "fish-photo.jpg", {
          type: "image/jpeg",
        });

        // Create FormData and append file
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folderName", "fishes");

        let response;
        try {
          response = await fetch(
            `${APP_CONFIG.API_URL}${API_ENDPOINTS.FILE_UPLOAD}`,
            {
              method: "POST",
              body: formData,
            }
          );
        } catch (fetchError) {
          console.error("Fetch error:", fetchError);

          let networkErrorMessage = "Failed to connect to server";

          if (
            fetchError instanceof TypeError &&
            fetchError.message.includes("fetch")
          ) {
            networkErrorMessage =
              "Network connection failed. Please check your internet connection.";
          } else if (fetchError instanceof Error) {
            if (fetchError.message.includes("timeout")) {
              networkErrorMessage = "Request timed out. Please try again.";
            } else if (fetchError.message.includes("abort")) {
              networkErrorMessage = "Request was cancelled. Please try again.";
            } else {
              networkErrorMessage = fetchError.message;
            }
          }

          toast({
            title: "Network Error",
            description: networkErrorMessage,
            variant: "destructive",
          });
          throw new Error(`Network error: ${networkErrorMessage}`);
        }

        if (!response.ok) {
          const errorMsg = `Failed to upload file. Status: ${response.status}`;
          console.error(errorMsg);

          let responseErrorMessage = "Failed to upload file";

          switch (response.status) {
            case 400:
              responseErrorMessage =
                "Invalid file format or size. Please check your file.";
              break;
            case 401:
              responseErrorMessage =
                "Authentication required. Please log in again.";
              break;
            case 403:
              responseErrorMessage =
                "Access denied. You don't have permission to upload files.";
              break;
            case 413:
              responseErrorMessage =
                "File too large. Please use a smaller image.";
              break;
            case 500:
              responseErrorMessage = "Server error. Please try again later.";
              break;
            case 502:
            case 503:
            case 504:
              responseErrorMessage =
                "Service temporarily unavailable. Please try again later.";
              break;
            default:
              responseErrorMessage = `Upload failed with status: ${response.status}`;
          }

          toast({
            title: "Upload Error",
            description: responseErrorMessage,
            variant: "destructive",
          });
          throw new Error(`File upload failed: ${responseErrorMessage}`);
        }

        let responseData;
        try {
          responseData = await response.json();
        } catch (jsonError) {
          console.error("JSON parsing error:", jsonError);

          let jsonErrorMessage = "Failed to parse server response";

          if (jsonError instanceof SyntaxError) {
            jsonErrorMessage =
              "Invalid server response format. Please try again.";
          } else if (jsonError instanceof Error) {
            jsonErrorMessage = `Response parsing error: ${jsonError.message}`;
          }

          toast({
            title: "Response Error",
            description: jsonErrorMessage,
            variant: "destructive",
          });
          throw new Error(`Response parsing failed: ${jsonErrorMessage}`);
        }

        const { fileUrl } = responseData;
        imageUrl = fileUrl;
      }

      if (!imageUrl && catchImage) {
        // Upload to Supabase Storage
        const fileExt = catchImage.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}.${fileExt}`;
        const { data, error: uploadError } = await supabase.storage
          .from("catch-images")
          .upload(fileName, catchImage, { upsert: true });
        if (uploadError) {
          const errorMsg = `Failed to upload image: ${uploadError.message}`;
          console.error(errorMsg);

          let uploadErrorMessage = "Failed to upload image to storage";

          if (uploadError.message.includes("File size")) {
            uploadErrorMessage =
              "Image file is too large. Please use a smaller image.";
          } else if (uploadError.message.includes("File type")) {
            uploadErrorMessage =
              "Invalid file type. Please use JPG, PNG, or WebP format.";
          } else if (uploadError.message.includes("Storage")) {
            uploadErrorMessage =
              "Storage service unavailable. Please try again later.";
          } else if (uploadError.message.includes("Network")) {
            uploadErrorMessage =
              "Network error during upload. Please check your connection.";
          } else {
            uploadErrorMessage = uploadError.message;
          }

          toast({
            title: "File Upload Error",
            description: uploadErrorMessage,
            variant: "destructive",
          });
          throw new Error(`File upload failed: ${uploadErrorMessage}`);
        }
        imageUrl = data?.path
          ? supabase.storage.from("catch-images").getPublicUrl(data.path).data
              .publicUrl
          : "";
      }
      // Get haul info for QR code
      console.log("🔍 Looking for haul with ID:", globalCatchHaulId);
      console.log(
        "🔍 Available hauls:",
        globalCatchHauls.map((h) => ({ id: h.id, qr_code: h.qr_code }))
      );

      if (!globalCatchHauls || globalCatchHauls.length === 0) {
        const errorMsg = "No hauls available. Please create a haul first.";
        console.error(errorMsg);
        toast({
          title: "Data Error",
          description: errorMsg,
          variant: "destructive",
        });
        throw new Error(errorMsg);
      }

      const haul = globalCatchHauls.find((h) => h.id === globalCatchHaulId);
      console.log("🔍 Found haul:", haul);

      if (!haul) {
        const errorMsg = `Haul not found with ID: ${globalCatchHaulId}`;
        console.error(errorMsg);
        toast({
          title: "Data Error",
          description: errorMsg,
          variant: "destructive",
        });
        throw new Error(errorMsg);
      }

      // Get last 4 characters of trip code
      const tripCode = haul?.qr_code?.slice(-4) || "";
      console.log("🔍 Trip code (last 4 chars):", tripCode);

      // Format date as 4 digits (e.g., 2023-12-25 becomes 2325)
      const dateStr =
        globalCatchForm.capture_date || new Date().toISOString().split("T")[0];
      const dateObj = new Date(dateStr);
      const year = dateObj.getFullYear().toString().slice(-2); // Last 2 digits of year
      const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
      const day = dateObj.getDate().toString().padStart(2, "0");
      const dateCode = `${month}${day}`;

      // Get current sequence number for this haul and date with proper error handling
      console.log(
        "🔍 Checking existing catch records for haul:",
        globalCatchHaulId
      );
      console.log(
        "🔍 Looking for QR codes like:",
        `${globalCatchForm["three_a_code"]}${tripCode}${dateCode}%`
      );

      const { data: existingRecords, error: queryError } = await supabase
        .from("catch_records")
        .select("qr_code")
        .eq("haul_id", globalCatchHaulId);

      if (queryError) {
        console.error("❌ Error querying existing records:", queryError);
        toast({
          title: "Database Query Error",
          description: `Failed to check existing records: ${queryError.message}`,
          variant: "destructive",
        });
        throw new Error(`Database query failed: ${queryError.message}`);
      }

      console.log("📊 Found existing records:", existingRecords?.length || 0);

      // Generate a unique sequence number with retry logic to handle race conditions
      let sequenceNumber = (existingRecords?.length || 0) + 1;
      let sequenceStr = sequenceNumber.toString().padStart(2, "0");
      let qr = `${globalCatchForm["three_a_code"]}${tripCode}${haul.haul_number
        .toString()
        .padStart(2, "0")}${dateCode}${sequenceStr}`;

      // Check if this QR code already exists and retry with next sequence if needed
      const maxRetries = 5;
      let retryCount = 0;

      while (retryCount < maxRetries) {
        const { data: existingQR, error: qrCheckError } = await supabase
          .from("catch_records")
          .select("id")
          .eq("qr_code", qr)
          .single();

        if (qrCheckError && qrCheckError.code !== "PGRST116") {
          // PGRST116 = no rows returned
          console.error("❌ Error checking QR code existence:", qrCheckError);
          toast({
            title: "Database Error",
            description: `Failed to verify QR code: ${qrCheckError.message}`,
            variant: "destructive",
          });
          throw new Error(
            `QR code verification failed: ${qrCheckError.message}`
          );
        }

        // If QR code doesn't exist, we can use it
        if (qrCheckError && qrCheckError.code === "PGRST116") {
          console.log("✅ QR code is unique:", qr);
          break;
        }

        // QR code exists, try next sequence
        retryCount++;
        sequenceNumber++;
        sequenceStr = sequenceNumber.toString().padStart(2, "0");
        qr = `${globalCatchForm["three_a_code"]}${tripCode}${haul.haul_number
          .toString()
          .padStart(2, "0")}${dateCode}${sequenceStr}`;

        console.log(`🔄 Retry ${retryCount}: Generated new QR code:`, qr);
      }

      if (retryCount >= maxRetries) {
        const errorMsg =
          "Failed to generate unique QR code after multiple attempts";
        console.error("❌", errorMsg);
        toast({
          title: "QR Code Generation Error",
          description: errorMsg,
          variant: "destructive",
        });
        throw new Error(errorMsg);
      }
      console.log("🔍 Generated QR code:", qr);
      console.log("🔍 QR components:", {
        three_a_code: globalCatchForm["three_a_code"],
        tripCode,
        dateCode,
        sequenceStr,
      });

      console.log("🔍 Global catch form data:", globalCatchForm);

      // Helper function to extract numeric value from text
      const extractNumericValue = (
        value: string | undefined,
        defaultValue: number = 0
      ): number => {
        if (!value || value.trim() === "") return defaultValue;
        const match = value.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
        return match ? parseFloat(match[1]) : defaultValue;
      };

      // Parse and convert text values to numbers
      const caseQuantityStr = globalCatchForm?.case_quantity || "300";
      const quantityValue = extractNumericValue(caseQuantityStr, 300);

      const caseSizeValue = extractNumericValue(
        globalCatchForm?.case_size || "15",
        15
      );
      const netKgPerCaseValue = extractNumericValue(
        globalCatchForm?.net_kg_per_case || "12",
        12
      );
      const fishSizeValue = extractNumericValue(
        globalCatchForm?.fish_size || "0",
        0
      );

      // Ensure quantity is at least 1 if it's 0 or empty
      const finalQuantity =
        globalCatchForm?.quantity === 0 || !globalCatchForm?.quantity
          ? 1
          : globalCatchForm.quantity;

      // Try the safe insert function first, fallback to direct insert
      console.log("🔍 Attempting to insert catch record...");
      let error;
      try {
        console.log("🔍 Trying RPC function: insert_catch_record_safe");
        const { error: rpcError } = await supabase.rpc(
          "insert_catch_record_safe",
          {
            p_haul_id: globalCatchHaulId,
            p_species: globalCatchForm?.fish_specie || "",
            p_quantity: finalQuantity,
            p_qr_code: qr,
            p_farmer_id: user?.auth_id || "",
            p_unit: "kg",
            p_fish_name: globalCatchForm?.fish_name || "",
            p_fish_specie: globalCatchForm?.fish_specie || "",
            p_fish_size: fishSizeValue.toString(),
            p_case_size: caseSizeValue.toString(),
            p_net_kg_per_case: netKgPerCaseValue.toString(),
            p_case_quantity: quantityValue.toString(),
            p_tank: globalCatchForm?.tank || "1",
            p_three_a_code: globalCatchForm?.three_a_code || "",
            p_capture_zone: globalCatchForm?.capture_zone || computedZone || "",
            p_catching_location: globalCatchForm?.catching_location || "",
            p_latitude: globalCatchForm?.latitude || "",
            p_longitude: globalCatchForm?.longitude || "",
            p_region: globalCatchForm?.region || "",
            p_image_url: imageUrl || "",
            p_capture_time: new Date().toISOString(),
            p_capture_date: new Date().toISOString().split("T")[0],
          }
        );
        error = rpcError;
      } catch (rpcError) {
        // Fallback to direct insert if RPC function doesn't exist
        console.log(
          "RPC function not available, trying direct insert:",
          rpcError
        );
        toast({
          title: "Database Warning",
          description: "Using fallback database method. This is normal.",
          variant: "default",
        });
        const { error: insertError } = await supabase
          .from("catch_records")
          .insert({
            species: globalCatchForm?.fish_specie || "",
            quantity: finalQuantity,
            unit: "kg",
            fish_name: globalCatchForm?.fish_name || "",
            fish_size: fishSizeValue.toString(),
            case_size: caseSizeValue.toString(),
            net_kg_per_case: netKgPerCaseValue.toString(),
            case_quantity: quantityValue.toString(),
            tank: globalCatchForm?.tank || "1",
            three_a_code: globalCatchForm?.three_a_code || "",
            capture_zone:
              globalCatchForm?.capture_zone ||
              (async () => {
                try {
                  const zoneInfo = await computeZoneByNearestSeaport(
                    userLat,
                    userLon
                  );
                  return zoneInfo.zoneName;
                } catch (e) {
                  console.warn(
                    "Zone computation failed; using EC30 fallback:",
                    e
                  );
                  try {
                    return JSON.parse(ec30ZoneData).ec30Code || "";
                  } catch (parseError) {
                    console.warn(
                      "Failed to parse ec30ZoneData for ec30Code:",
                      parseError
                    );
                    return "";
                  }
                }
              })() ||
              "",
            catching_location:
              globalCatchForm?.catching_location ||
              (() => {
                try {
                  return ec30ZoneData
                    ? JSON.parse(ec30ZoneData).zone || ""
                    : "";
                } catch (e) {
                  console.warn("Failed to parse ec30ZoneData for zone:", e);
                  return "";
                }
              })() ||
              globalCatchForm?.catching_location ||
              "",
            latitude: globalCatchForm?.latitude || userLat.toString() || "",
            longitude: globalCatchForm?.longitude || userLon.toString() || "",
            region:
              globalCatchForm?.region ||
              getTraditionalCoastalRegion(userLat, userLon).code ||
              "",
            coordinates: globalCatchForm.coordinates || {
              lat: (() => {
                try {
                  return ec30ZoneData
                    ? JSON.parse(ec30ZoneData).coordinates.lat || ""
                    : "";
                } catch (e) {
                  console.warn(
                    "Failed to parse ec30ZoneData for coordinates.lat:",
                    e
                  );
                  return "";
                }
              })(),
              lng: (() => {
                try {
                  return ec30ZoneData
                    ? JSON.parse(ec30ZoneData).coordinates.lng || ""
                    : "";
                } catch (e) {
                  console.warn(
                    "Failed to parse ec30ZoneData for coordinates.lng:",
                    e
                  );
                  return "";
                }
              })(),
            },
            farmer_id: user?.auth_id || "",
            image_url: imageUrl,
            qr_code: qr,
            haul_id: globalCatchHaulId,
            capture_time: new Date().toISOString(),
            capture_date: new Date().toISOString().split("T")[0],
          });
        error = insertError;
      }

      if (error) {
        const errorMsg = `Database error: ${error.message || error}`;
        console.error(errorMsg);

        // Handle specific database errors with user-friendly messages
        let userFriendlyMessage = "Failed to save catch record";

        if (error.code === "23505") {
          // Unique constraint violation
          if (error.message.includes("qr_code")) {
            userFriendlyMessage = "QR code already exists. Please try again.";
          } else if (error.message.includes("fish_product_id")) {
            userFriendlyMessage =
              "Product ID already exists. Please try again.";
          } else {
            userFriendlyMessage =
              "Record already exists with this information.";
          }
        } else if (error.code === "23503") {
          // Foreign key constraint violation
          userFriendlyMessage =
            "Invalid reference data. Please check your selection.";
        } else if (error.code === "23514") {
          // Check constraint violation
          userFriendlyMessage = "Invalid data format. Please check your input.";
        } else if (error.message) {
          userFriendlyMessage = error.message;
        }

        toast({
          title: "Database Error",
          description: userFriendlyMessage,
          variant: "destructive",
        });
        throw new Error(userFriendlyMessage);
      }

      // Refresh catch records to show the new record
      await fetchCatchRecords(globalCatchHaulId);

      // Set success state
      setGeneratedQRCode(qr);
      setShowQRCode(true);

      // Clear form fields after successful submission
      setGlobalCatchForm({
        haul_id: globalCatchHaulId,
        species: "",
        fish_name: "",
        quantity: 0,
        capture_zone: "",
        image_url: "",
        qr_code: "",
        fish_specie: "",
        three_a_code: "",
        capture_date: "",
        capture_time: "",
        tank: "",
        case_size: "15", // Reset to default
        net_kg_per_case: "12", // Reset to default
        region: "",
        latitude: "",
        longitude: "",
        catching_location: "",
        fish_size: "",
        case_quantity: "300 cases", // Reset to default
        fish_species: "",
        coordinates: {
          lat: "",
          lng: "",
        },
      });

      // Clear image and error states
      setCatchImage(null);
      setCatchImageUrl(null);
      setScannedFishData(null);
      setGlobalCatchError(null);

      // Clear only the analysis result from storage, keep form data
      try {
        localStorage.removeItem("fishAnalysisResult");
        localStorage.removeItem("capturedFishImage");
      } catch (e) {
        console.warn("Failed to clear stored analysis data:", e);
      }

      // Show success toast
      toast({
        title: "Success!",
        description: `QR Code generated successfully: ${qr}`,
        variant: "default",
      });
    } catch (e: Error | unknown) {
      const error = e instanceof Error ? e.message : String(e);
      setGlobalCatchError(error);
      console.error("catch error", e);

      // Provide more specific error messages based on error type
      let errorTitle = "Error";
      let errorDescription = "Failed to process catch record";

      if (error.includes("QR code already exists")) {
        errorTitle = "Duplicate QR Code";
        errorDescription = "This QR code already exists. Please try again.";
      } else if (error.includes("Database query failed")) {
        errorTitle = "Database Connection Error";
        errorDescription =
          "Unable to connect to database. Please check your connection.";
      } else if (error.includes("QR code verification failed")) {
        errorTitle = "QR Code Verification Error";
        errorDescription =
          "Failed to verify QR code uniqueness. Please try again.";
      } else if (error.includes("QR Code Generation Error")) {
        errorTitle = "QR Code Generation Error";
        errorDescription =
          "Unable to generate unique QR code. Please try again.";
      } else if (error.includes("File upload")) {
        errorTitle = "File Upload Error";
        errorDescription = "Failed to upload image. Please try again.";
      } else if (error.includes("Location")) {
        errorTitle = "Location Error";
        errorDescription =
          "Unable to access location. Please enable location services.";
      } else if (error.includes("Network") || error.includes("fetch")) {
        errorTitle = "Network Error";
        errorDescription =
          "Network connection issue. Please check your internet connection.";
      } else {
        errorDescription = error;
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      setGlobalCatchLoading(false);
      // Clear the localStorage to prevent re-processing
      try {
        localStorage.removeItem("fishAnalysisResult");
      } catch (e) {
        console.warn("Failed to clear fishAnalysisResult from localStorage", e);
      }
    }
  };

  // Add the form handler function
  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setGlobalCatchForm((prev) => {
      // if (!prev) return null;
      return {
        ...prev,
        [name]: value,
      };
    });
  };

  async function fetchHaulsForTrip(tripId: string) {
    try {
      const { data, error } = await supabase
        .from("fishing_hauls")
        .select(
          `
          *,
          catch_records:catch_records(
            *
          )
        `
        )
        .eq("trip_id", tripId)
        .order("haul_number", { ascending: true });

      if (error) throw error;

      setHaulsByTripId((prev) => ({
        ...prev,
        [tripId]: data || [],
      }));
    } catch (error) {
      console.error("Error fetching hauls:", error);
    }
  }

  async function fetchCatchRecords(haulId: string) {
    try {
      const { data, error } = await supabase
        .from("catch_records")
        .select("*")
        .eq("haul_id", haulId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCatchRecords(data || []);
    } catch (error) {
      console.error("Error fetching catch records:", error);
    }
  }

  if (showFishScan) {
    return (
      <FishScanComponent
        setShowFishScan={setShowFishScan}
        scannedData={scannedFishData}
      />
    );
  }
  const tripData = trips.find((t) => t.id === selectedTripId);
  const tripVessel = vessels.find((v) => v.id === tripData?.vessel_id);
  return (
    <div className="flex flex-col gap-4 px-3 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-4 text-center">
        <div className="flex flex-col text-lg md:text-2xl font-bold text-blue-800">
          NHẬT KÝ MẺ
        </div>
        <div className="flex flex-col  text-lg md:text-2xl font-bold text-blue-800">
          FISHING LOG PER HAUL
        </div>
      </div>
      {/* Trip Selection Cards - Mobile Responsive */}
      <div className="">
        <h3 className="text-lg font-semibold mb-2">Select Trip</h3>
        <div className="relative w-full">
          <div className="overflow-x-auto pb-4 hide-scrollbar">
            <div className="flex gap-2 md:gap-4 min-w-full">
              {loading
                ? // Loading skeleton cards
                  Array.from({ length: 3 }).map((_, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex-none w-[200px] md:w-[240px] lg:w-[280px] p-2 md:p-3 lg:p-4 rounded-lg border-2 border-gray-200 bg-gray-50"
                    >
                      <div className="flex flex-col gap-1 md:gap-2">
                        <div className="flex justify-between items-start">
                          <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
                          <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                        </div>
                        <div className="flex justify-between items-start">
                          <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
                          <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                        </div>
                        <div className="flex justify-between items-start">
                          <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
                          <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                        </div>
                        <div className="flex justify-between items-start">
                          <div className="h-3 bg-gray-200 rounded w-8 animate-pulse"></div>
                          <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                        </div>
                        <div className="mt-1 md:mt-2 flex justify-between items-center">
                          <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
                          <div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse"></div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                : trips.length === 0
                ? // Empty trip cards
                  Array.from({ length: 3 }).map((_, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex-none w-[200px] md:w-[240px] lg:w-[280px] p-2 md:p-3 lg:p-4 rounded-lg border-2 border-gray-200 bg-gray-50"
                    >
                      <div className="flex flex-col gap-1 md:gap-2">
                        <div className="flex justify-between items-start">
                          <span className="text-xs md:text-sm font-medium text-gray-400">
                            Trip ID:
                          </span>
                          <span className="text-xs md:text-sm text-gray-400 truncate ml-1">
                            No trip
                          </span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-xs md:text-sm font-medium text-gray-400">
                            Vessel:
                          </span>
                          <span className="text-xs md:text-sm text-gray-400 truncate ml-1">
                            N/A
                          </span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-xs md:text-sm font-medium text-gray-400">
                            Region Ngư Trường:
                          </span>
                          <span className="text-xs md:text-sm text-gray-400 truncate ml-1">
                            N/A
                          </span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-xs md:text-sm font-medium text-gray-400">
                            Date:
                          </span>
                          <span className="text-xs md:text-sm text-gray-400 truncate ml-1">
                            N/A
                          </span>
                        </div>
                        <div className="mt-1 md:mt-2 flex justify-between items-center">
                          <span className="text-xs md:text-sm font-medium text-gray-400">
                            Status:
                          </span>
                          <span className="text-xs md:text-sm px-1.5 md:px-2 py-0.5 md:py-1 rounded-full bg-gray-100 text-gray-400">
                            N/A
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                : // Actual trip cards
                  trips.map((trip, index) => {
                    const vessel = vessels.find((v) => v.id === trip.vessel_id);
                    return (
                      <motion.div
                        key={trip.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className={`flex-none w-[200px] md:w-[240px] lg:w-[280px] p-2 md:p-3 lg:p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                          selectedTripId === trip.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-blue-300"
                        }`}
                        onClick={async () => {
                          setSelectedTripId(trip.id);
                          fetchHaulsForTrip(trip.id);
                        }}
                      >
                        <div className="flex flex-col gap-1 md:gap-2">
                          <div className="flex justify-between items-start">
                            <span className="text-xs md:text-sm font-medium text-gray-600">
                              Trip ID:
                            </span>
                            <span className="text-xs md:text-sm font-bold text-gray-800 truncate ml-1">
                              {trip.trip_code}
                            </span>
                          </div>
                          <div className="flex justify-between items-start">
                            <span className="text-xs md:text-sm font-medium text-gray-600">
                              Vessel:
                            </span>
                            <span className="text-xs md:text-sm text-gray-800 truncate ml-1">
                              {vessel?.registration_number || trip.vessel_id}
                            </span>
                          </div>

                          <div className="mt-1 md:mt-2 flex justify-between items-center">
                            <span className="text-xs md:text-sm font-medium text-gray-600">
                              Status:
                            </span>
                            <span
                              className={`text-xs md:text-sm px-1.5 md:px-2 py-0.5 md:py-1 rounded-full ${
                                trip.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : trip.status === "Catching"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {trip.status || "pending"}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
            </div>
          </div>
          {/* Fade effect for scroll indication */}
          <div className="absolute right-0 top-0 bottom-0 w-8 md:w-12 bg-gradient-to-l from-white to-transparent pointer-events-none" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <Label className="text-lg font-semibold">Select Haul</Label>
            <Button
              onClick={async () => {
                setHaulError(null);
                setHaulLoading(true);

                // Get the current maximum haul number for this trip

                const nextHaulNumber = globalCatchHauls.length + 1;

                const trip = trips.find((t) => t.id === selectedTripId);
                if (!trip) return;

                // Get the seaport information for this trip
                const tripSeaport = ports.find(
                  (p) => p.id === trip.departure_port
                );

                navigator.geolocation.getCurrentPosition(
                  async (pos) => {
                    const userLat = pos.coords.latitude;
                    const userLon = pos.coords.longitude;

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

                    setLocationDenied(false);
                    const haulFormData = {
                      trip_id: selectedTripId,
                      haul_number: nextHaulNumber,
                      latitude: pos.coords.latitude,
                      longitude: pos.coords.longitude,
                      depth: distanceFromSeaport,
                      notes: "",
                      start_time: new Date().toISOString(),
                      end_time: new Date().toISOString(),
                      qr_code: `H${String(nextHaulNumber).padStart(2, "0")}${
                        trip.trip_code
                      }`,
                    };

                    setHaulLoading(true);
                    setHaulError(null);
                    try {
                      const { error } = await supabase
                        .from("fishing_hauls")
                        .insert({
                          ...haulFormData,
                          farmer_id: user?.auth_id,
                        } as {
                          trip_id: string;
                          haul_number: number;
                          latitude: number;
                          longitude: number;
                          depth: number | null;
                          notes: string;
                          start_time: string;
                          end_time: string;
                          qr_code: string;
                          farmer_id: string | null;
                        });
                      if (error) throw error;

                      // Refresh hauls list with proper mapping
                      const { data: hauls } = await supabase
                        .from("fishing_hauls")
                        .select("*")
                        .eq("trip_id", selectedTripId)
                        .order("created_at", { ascending: false });

                      // Map hauls to include required HaulData properties
                      const mappedHauls: HaulData[] = (hauls || []).map(
                        (haul) => ({
                          id: haul.id,
                          haul_number: haul.haul_number,
                          qr_code: haul.qr_code,
                          trip_id: haul.trip_id,
                          latitude: haul.latitude,
                          longitude: haul.longitude,
                          depth: haul.depth,
                          notes: haul.notes,
                          start_time: haul.start_time,
                          end_time: haul.end_time,
                          total_quantity: 0,
                          unique_tanks: 0,
                          total_net_kg: 0,
                          catch_records: [],
                          region: trips.find((t) => t.id === haul.trip_id)
                            ?.to_region,
                          created_at: haul.created_at,
                        })
                      );

                      setHaulsByTripId((prev) => ({
                        ...prev,
                        [selectedTripId]: mappedHauls,
                      }));
                      if (mappedHauls.length > 0) {
                        setGlobalCatchHaulId(mappedHauls[0].id);
                      }
                      fetchTrips();
                    } catch (e: Error | unknown) {
                      setHaulError(e instanceof Error ? e.message : String(e));
                    } finally {
                      setHaulLoading(false);
                      setShowAddOtherFish(true);
                    }
                  },
                  (err) => {
                    if (err.code === 1) {
                      setLocationDenied(true);
                      toast({
                        title: "Location Denied",
                        description:
                          "You denied location access. Please allow it in your browser settings and try again.",
                        variant: "destructive",
                      });
                    }
                    setHaulLoading(false);
                  }
                );
              }}
              className="text-white bg-red-500 hover:bg-blue-600 px-4 text-sm py-2 rounded-md flex items-center gap-2"
            >
              {haulLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}{" "}
              {t("departure.add_new_haul")}
            </Button>
          </div>
          {globalCatchHauls.length > 0 && (
            <div className="relative w-full">
              <div className="overflow-x-auto pb-4 hide-scrollbar">
                <div className="flex gap-2 md:gap-4 min-w-full">
                  {globalCatchHauls.map((h, index) => (
                    <motion.div
                      key={h.id}
                      data-haul-id={h.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className={`flex-none w-[200px] md:w-[240px] lg:w-[300px] p-2 md:p-3 lg:p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                        globalCatchHaulId === h.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300"
                      }`}
                      onClick={() => {
                        setGlobalCatchHaulId(h.id);
                        fetchCatchRecords(h.id);
                        setCreatedGlobalCatch(null);
                        setGlobalCatchError(null);
                      }}
                    >
                      <div className="flex flex-col gap-1 md:gap-3">
                        <div className="flex justify-between items-start">
                          <span className="text-xs md:text-sm font-medium text-gray-600">
                            Haul #:
                          </span>
                          <span className="text-xs md:text-sm font-bold text-gray-800 truncate ml-1">
                            {h.haul_number}
                          </span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-xs md:text-sm font-medium text-gray-600">
                            Region Ngư Trường:
                          </span>
                          <span className="text-xs md:text-sm text-gray-800 break-all truncate ml-1">
                            {h.region ||
                              trips.find((t) => t.id === h.trip_id)
                                ?.to_region ||
                              "N/A"}
                          </span>
                        </div>

                        {/* Totals Section */}
                        <div className="mt-1 md:mt-2 pt-1 md:pt-2 border-t border-gray-200">
                          <div className="grid grid-cols-3 gap-1 md:gap-2">
                            <div className="text-center">
                              <span className="text-xs font-medium text-gray-500 block">
                                Total Qty
                              </span>
                              <span className="text-xs md:text-sm font-bold text-blue-600">
                                {haulTotals[h.id]?.total_quantity || 0}{" "}
                              </span>
                              <span className="text-xs text-gray-500 block">
                                ({haulTotals[h.id]?.catch_records?.length || 0}{" "}
                                records)
                              </span>
                            </div>
                            <div className="text-center">
                              <span className="text-xs font-medium text-gray-500 block">
                                Tanks
                              </span>
                              <span className="text-xs md:text-sm font-bold text-green-600">
                                {haulTotals[h.id]?.unique_tanks || 0}
                              </span>
                              <span className="text-xs text-gray-500 block">
                                used
                              </span>
                            </div>
                            <div className="text-center">
                              <span className="text-xs font-medium text-gray-500 block">
                                Net kg
                              </span>
                              <span className="text-xs md:text-sm font-bold text-orange-600">
                                {(haulTotals[h.id]?.total_net_kg || 0).toFixed(
                                  1
                                )}{" "}
                                KG
                              </span>
                              <span className="text-xs text-gray-500 block">
                                total
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
              {/* Fade effect for scroll indication */}
              <div className="absolute right-0 top-0 bottom-0 w-8 md:w-12 bg-gradient-to-l from-white to-transparent pointer-events-none" />
            </div>
          )}

          {/* Empty Form Section - Shows when no trip is selected */}
          {globalCatchHauls.length === 0 && (
            <div className="flex gap-2 md:gap-4 min-w-full">
              {[...Array(3)].map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex-none w-[200px] md:w-[240px] lg:w-[300px] p-2 md:p-3 lg:p-4 rounded-lg border-2 border-gray-200 bg-gray-50"
                >
                  <div className="flex flex-col gap-1 md:gap-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs md:text-sm font-medium text-gray-400">
                        Haul #:
                      </span>
                      <span className="text-xs md:text-sm text-gray-400 truncate ml-1">
                        No haul
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-xs md:text-sm font-medium text-gray-400">
                        Haul ID:
                      </span>
                      <span className="text-xs md:text-sm text-gray-400 break-all truncate ml-1">
                        N/A
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-xs md:text-sm font-medium text-gray-400">
                        Region Ngư Trường:
                      </span>
                      <span className="text-xs md:text-sm text-gray-400 break-all truncate ml-1">
                        N/A
                      </span>
                    </div>

                    {/* Totals Section */}
                    <div className="mt-1 md:mt-2 pt-1 md:pt-2 border-t border-gray-200">
                      <div className="grid grid-cols-3 gap-1 md:gap-2">
                        <div className="text-center">
                          <span className="text-xs font-medium text-gray-400 block">
                            Total Qty
                          </span>
                          <span className="text-xs md:text-sm font-bold text-gray-400">
                            0
                          </span>
                          <span className="text-xs text-gray-400 block">
                            (0 records)
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-medium text-gray-400 block">
                            Tanks
                          </span>
                          <span className="text-xs md:text-sm font-bold text-gray-400">
                            0
                          </span>
                          <span className="text-xs text-gray-400 block">
                            used
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-medium text-gray-400 block">
                            Net kg
                          </span>
                          <span className="text-xs md:text-sm font-bold text-gray-400">
                            0.0 KG
                          </span>
                          <span className="text-xs text-gray-400 block">
                            total
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {catchRecords.length > 0 &&
            catchRecords
              .sort((a, b) => a.created_at.localeCompare(b.created_at))
              .map((c, index) => (
                <div className="space-y-3" key={c.id}>
                  {/* AI Fish Scan Section */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        {c.image_url && (
                          <div className="border-2 border-red-500 rounded-lg p-2">
                            <img
                              src={c.image_url}
                              alt="Fish Image"
                              className="w-16 h-16 object-cover rounded"
                            />
                            <p className="text-xs text-center mt-1">
                              Fish Image
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="bg-blue-800 text-white w-10 h-10 rounded-full flex justify-center items-center">
                        <h2>{index + 1}</h2>
                      </div>
                    </div>

                    {/* Fish Details Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Column - Fish Identification */}
                      <div className="space-y-3">
                        <div>
                          <Label>Product name</Label>
                          <Input
                            name="fish_name"
                            className="bg-white border-solid border-red-500 mt-2 "
                            value={c?.fish_name || ""}
                            readOnly
                          />
                        </div>
                        <div>
                          <Label>Species</Label>
                          <Input
                            name="fish_specie"
                            className="bg-white border-solid border-red-500 mt-2"
                            value={c?.fish_specie || ""}
                            readOnly
                          />
                        </div>
                        <div>
                          <Label>3-a code</Label>
                          <Input
                            name="three_a_code"
                            className="bg-white border-solid border-red-500 mt-2"
                            value={c?.three_a_code || ""}
                            readOnly
                          />
                        </div>
                        <div>
                          <Label>Size</Label>

                          <div className="flex flex-row items-center gap-2  border border-red-500 mt-2 rounded-lg">
                            <Input
                              name="fish_size"
                              className="bg-white"
                              value={`${c?.fish_size}`}
                              placeholder="e.g., 30"
                              readOnly
                            />
                            <span className="text-xs text-gray-500 mr-2">
                              pcs/kg
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Column - Capture Details */}
                      <div className="space-y-3">
                        <div>
                          <Label>Captured location</Label>
                          <Input
                            name="catching_location"
                            className="bg-gray-300 border-solid border-gray-400 mt-2"
                            value="GPS hidden"
                            disabled={true}
                          />
                        </div>
                        <div>
                          <Label>Zone</Label>
                          <Input
                            name="capture_zone"
                            className="bg-white border-solid border-red-500 mt-2"
                            value={c?.capture_zone || ""}
                            placeholder="e.g., EC (X...)"
                            readOnly
                          />
                        </div>
                        <div>
                          <Label>Captured time</Label>
                          <Input
                            name="capture_time"
                            className="bg-white border-solid border-red-500 mt-2"
                            value={
                              c?.capture_time
                                ? new Date(c?.capture_time || "")
                                    .toLocaleDateString("en-GB", {
                                      day: "2-digit",
                                      month: "2-digit",
                                    })
                                    .replace(/\//g, "/") +
                                  " ; " +
                                  new Date(c?.capture_time || "")
                                    .toLocaleTimeString("en-US", {
                                      hour12: true,
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                    .toLowerCase()
                                : ""
                            }
                            readOnly
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Case/Quantity & Packaging Section */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Case size</Label>
                        <Input
                          name="case_size"
                          className="bg-white border-solid border-red-500 mt-2"
                          value={c?.case_size || "15"}
                          readOnly
                        />
                      </div>
                      <div>
                        <Label>Case Quantity Load</Label>
                        <Input
                          name="case_quantity"
                          className="bg-white border-solid border-black mt-2"
                          value={c?.case_quantity || "300 cases"}
                          readOnly
                        />
                      </div>
                      <div>
                        <Label>Net kg/case</Label>
                        <Input
                          name="net_kg_per_case"
                          className="bg-white border-solid border-red-500 mt-2"
                          value={c?.net_kg_per_case || "12"}
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <Label>Tank#</Label>
                      <div className="flex items-center space-x-2">
                        <select
                          name="tank"
                          className="bg-white border-solid border-black mt-2 w-full min-h-[40px] rounded px-3"
                          value={c?.tank || "1"}
                          disabled={true}
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(
                            (num) => (
                              <option key={num} value={num.toString()}>
                                {num}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* QR Code Generation Section */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    {c.qr_code && (
                      <div className="border-2 border-red-500 rounded-lg p-4">
                        <div className="flex flex-col md:flex-row items-center justify-center md:items-start md:justify-start space-x-4">
                          {/* Left side - Fish image and Product ID */}
                          <div>
                            <div className="flex flex-row items-center gap-2">
                              {c.image_url && (
                                <img
                                  src={c.image_url}
                                  alt="Fish"
                                  className="w-full md:w-[100px] h-[80px] md:h-[100px] object-cover rounded border border-gray-300"
                                />
                              )}
                              <QRCode
                                value={c.qr_code}
                                size={isMobile ? 80 : 100}
                                className="border border-gray-300 rounded"
                              />
                            </div>
                            <p className="text-sm font-medium text-center md:text-left">
                              Product ID : {c.qr_code}
                            </p>
                          </div>

                          {/* Right side - Detailed QR breakdown */}
                          <div className="flex-1 pt-2">
                            <h3 className="text-lg font-bold text-red-600 mb-3 hidden md:block">
                              Detailed attached Fish.QR
                            </h3>
                            <div className="grid grid-cols-4 gap-2">
                              <div className="text-center">
                                <div className="bg-white border border-black p-1 md:p-2 mb-1 text-xs md:text-sm">
                                  <span className="font-bold">
                                    {c.qr_code.substring(0, 3)}
                                  </span>
                                </div>
                                <span className="text-xs text-blue-600">
                                  3-a code
                                </span>
                              </div>
                              <div className="text-center">
                                <div className="bg-white border border-black p-1 md:p-2 mb-1 text-xs md:text-sm">
                                  <span className="font-bold">
                                    {c.qr_code.substring(3, 7)}
                                  </span>
                                </div>
                                <span className="text-xs text-blue-600">
                                  Trip #
                                </span>
                              </div>
                              <div className="text-center">
                                <div className="bg-white border border-black p-1 md:p-2 mb-1 text-xs md:text-sm">
                                  <span className="font-bold">
                                    {c.qr_code.substring(7, 9)}
                                  </span>
                                </div>
                                <span className="text-xs text-blue-600">
                                  Haul #
                                </span>
                              </div>
                              <div className="text-center">
                                <div className="bg-white border border-black p-1 md:p-2 mb-1 text-xs md:text-sm">
                                  <span className="font-bold">
                                    {c.qr_code.substring(9)}
                                  </span>
                                </div>
                                <span className="text-xs text-blue-600">
                                  Catch date
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

          {catchRecords.length === 0 &&
            !globalCatchHaulId &&
            !showAddOtherFish && (
              <div className="space-y-3 mt-6">
                {/* AI Fish Scan Section */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <button
                        type="button"
                        className="bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 cursor-not-allowed"
                        disabled={true}
                      >
                        <Camera className="w-4 h-4" />
                        <span>AI Fish Scan</span>
                      </button>
                    </div>
                  </div>

                  {/* Fish Details Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left Column - Fish Identification */}
                    <div className="space-y-3">
                      <div>
                        <Label>Product name</Label>
                        <Input
                          name="fish_name"
                          className="bg-gray-100 border-solid border-gray-300 mt-2"
                          value=""
                          disabled={true}
                          placeholder="No trip selected"
                          readOnly
                        />
                      </div>
                      <div>
                        <Label>Species</Label>
                        <Input
                          name="fish_specie"
                          className="bg-gray-100 border-solid border-gray-300 mt-2"
                          value=""
                          disabled={true}
                          placeholder="No trip selected"
                          readOnly
                        />
                      </div>
                      <div>
                        <Label>3-a code</Label>
                        <Input
                          name="three_a_code"
                          className="bg-gray-100 border-solid border-gray-300 mt-2"
                          value=""
                          disabled={true}
                          placeholder="No trip selected"
                          readOnly
                        />
                      </div>
                      <div>
                        <Label>Size</Label>
                        <Input
                          name="fish_size"
                          className="bg-gray-100 border-solid border-gray-300 mt-2"
                          value=""
                          disabled={true}
                          placeholder="No trip selected"
                          readOnly
                        />
                      </div>
                    </div>

                    {/* Right Column - Capture Details */}
                    <div className="space-y-3">
                      <div>
                        <Label>Captured location</Label>
                        <Input
                          name="catching_location"
                          className="bg-gray-100 border-solid border-gray-300 mt-2"
                          value="GPS hidden"
                          disabled={true}
                          readOnly
                        />
                      </div>
                      <div>
                        <Label>Zone</Label>
                        <Input
                          name="capture_zone"
                          className="bg-gray-100 border-solid border-gray-300 mt-2"
                          value=""
                          disabled={true}
                          placeholder="No trip selected"
                          readOnly
                        />
                      </div>
                      <div>
                        <Label>Captured time</Label>
                        <Input
                          name="capture_time"
                          className="bg-gray-100 border-solid border-gray-300 mt-2"
                          value=""
                          disabled={true}
                          placeholder="No trip selected"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="bg-gray-400 text-white px-4 py-2 rounded-lg cursor-not-allowed"
                  disabled={true}
                >
                  Edit
                </button>

                {/* Case/Quantity & Packaging Section */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-blue-600 text-sm mb-4">
                    The default case size is 15kg, and the net kg/case is 12kg.
                    If different, please edit accordingly.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Case size</Label>
                      <Input
                        name="case_size"
                        className="bg-gray-100 border-solid border-gray-300 mt-2"
                        value=""
                        disabled={true}
                        placeholder="No trip selected"
                        readOnly
                      />
                    </div>
                    <div>
                      <Label>Case Quantity Load</Label>
                      <Input
                        name="case_quantity"
                        className="bg-gray-100 border-solid border-gray-300 mt-2"
                        value=""
                        disabled={true}
                        placeholder="No trip selected"
                        readOnly
                      />
                    </div>
                    <div>
                      <Label>Net kg/case</Label>
                      <Input
                        name="net_kg_per_case"
                        className="bg-gray-100 border-solid border-gray-300 mt-2"
                        value=""
                        disabled={true}
                        placeholder="No trip selected"
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <Label>Tank#</Label>
                    <div className="flex items-center space-x-2">
                      <select
                        name="tank"
                        className="bg-gray-100 border-solid border-gray-300 mt-2 w-full min-h-[40px] rounded px-3"
                        value=""
                        disabled={true}
                      >
                        <option value="">No trip selected</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* QR Code Generation Section */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-gray-500">
                      Select a trip to generate QR code for FishQR
                    </p>
                    <button
                      type="button"
                      className="bg-gray-400 text-white px-4 py-2 rounded-lg cursor-not-allowed"
                      disabled={true}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            )}

          {catchRecords.length > 0 && (
            <div className="flex">
              <button
                onClick={() => setShowAddOtherFish(!showAddOtherFish)}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                disabled={!globalCatchTripId || !globalCatchHaulId}
              >
                + {catchRecords.length === 0 ? " Add new" : " Add Other"} Fish (
                {catchRecords.length + 1})
              </button>
            </div>
          )}

          {((catchRecords.length === 0 && globalCatchHaulId) ||
            showAddOtherFish) && (
            <div className="space-y-3" id="fish-scan-section">
              {/* AI Fish Scan Section */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          localStorage.removeItem("fishAnalysisResult");
                          localStorage.removeItem("capturedFishImage");
                        } catch (e) {
                          console.warn(
                            "Failed to clear scan keys from localStorage",
                            e
                          );
                        }
                        setScannedFishData(null);
                        setShowQRCode(false);
                        setGeneratedQRCode(null);
                        setShowFishScan(true);
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      <span>AI Fish Scan</span>
                    </button>

                    {capturedFishImage && (
                      <div className="border-2 border-red-500 rounded-lg p-2">
                        <img
                          src={capturedFishImage}
                          alt="Fish Image"
                          className="w-24 h-24 object-cover rounded"
                        />
                        <p className="text-xs text-center mt-1">Fish Image</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fish Details Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column - Fish Identification */}
                  <div className="space-y-3">
                    <div>
                      <Label>Product name</Label>
                      <div className="relative">
                        <Input
                          name="fish_name"
                          className="bg-white border-solid border-red-500 mt-2 pr-10"
                          value={globalCatchForm?.fish_name || ""}
                          onChange={handleFormChange}
                          disabled={
                            !globalCatchTripId ||
                            !globalCatchHaulId ||
                            isLoadingFormData
                          }
                          required
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          {isLoadingFormData ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          ) : (
                            <div className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label>Species</Label>
                      <div className="relative">
                        <Input
                          name="fish_specie"
                          className="bg-white border-solid border-red-500 mt-2 pr-10"
                          value={globalCatchForm?.fish_specie || ""}
                          onChange={handleFormChange}
                          disabled={
                            !globalCatchTripId ||
                            !globalCatchHaulId ||
                            isLoadingFormData
                          }
                          required
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          {isLoadingFormData ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          ) : (
                            <div className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label>3-a code</Label>
                      <div className="relative">
                        <Input
                          name="three_a_code"
                          className="bg-white border-solid border-red-500 mt-2 pr-10"
                          value={globalCatchForm?.three_a_code || ""}
                          onChange={handleFormChange}
                          disabled={
                            !globalCatchTripId ||
                            !globalCatchHaulId ||
                            isLoadingFormData
                          }
                          required
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          {isLoadingFormData ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          ) : (
                            <div className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label>Size</Label>
                      <div className="flex flex-row items-center gap-2 border border-red-500 mt-2 rounded-lg relative">
                        <Input
                          name="fish_size"
                          className="bg-white pr-12"
                          value={globalCatchForm?.fish_size || ""}
                          onChange={handleFormChange}
                          disabled={
                            !globalCatchTripId ||
                            !globalCatchHaulId ||
                            isLoadingFormData
                          }
                          placeholder="e.g., 30"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-16 pointer-events-none">
                          {isLoadingFormData ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          ) : (
                            <div className="h-4 w-4" />
                          )}
                        </div>
                        <span className="text-xs text-gray-500 mr-2">
                          pcs/kg
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Capture Details */}
                  <div className="space-y-3">
                    <div>
                      <Label>Captured location</Label>
                      <Input
                        name="catching_location"
                        className="bg-gray-300 border-solid border-gray-400 mt-2"
                        value="GPS hidden"
                        disabled={true}
                      />
                    </div>
                    <div>
                      <Label>Zone</Label>
                      <div className="relative">
                        <Input
                          name="capture_zone"
                          className="bg-white border-solid border-red-500 mt-2 pr-10"
                          value={globalCatchForm?.capture_zone || ""}
                          onChange={handleFormChange}
                          disabled={
                            !globalCatchTripId ||
                            !globalCatchHaulId ||
                            isLoadingFormData
                          }
                          placeholder="e.g., EC (X...)"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          {isLoadingFormData ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          ) : (
                            <div className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label>Captured time</Label>
                      <div className="relative">
                        <Input
                          name="capture_time"
                          className="bg-white border-solid border-red-500 mt-2 pr-10"
                          value={globalCatchForm?.capture_time || ""}
                          disabled={true}
                          placeholder="e.g., 27/02 ; 09:30 am"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          {isLoadingFormData ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          ) : (
                            <div className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg "
                disabled={true}
              >
                Edit
              </button>
              {/* Case/Quantity & Packaging Section */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-blue-600 text-sm mb-4">
                  The default case size is 15kg, and the net kg/case is 12kg. If
                  different, please edit accordingly.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Case size</Label>
                    <Input
                      name="case_size"
                      className="bg-white border-solid border-red-500 mt-2"
                      value={globalCatchForm?.case_size || "15"}
                      onChange={handleFormChange}
                      disabled={!globalCatchTripId || !globalCatchHaulId}
                    />
                  </div>
                  <div>
                    <Label>Case Quantity Load</Label>
                    <Input
                      name="case_quantity"
                      className="bg-white border-solid border-black mt-2"
                      value={globalCatchForm?.case_quantity || "300 cases"}
                      onChange={handleFormChange}
                      disabled={!globalCatchTripId || !globalCatchHaulId}
                    />
                  </div>
                  <div>
                    <Label>Net kg/case</Label>
                    <Input
                      name="net_kg_per_case"
                      className="bg-white border-solid border-red-500 mt-2"
                      value={globalCatchForm?.net_kg_per_case || "12"}
                      onChange={handleFormChange}
                      disabled={!globalCatchTripId || !globalCatchHaulId}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <Label>Tank#</Label>
                  <div className="flex items-center space-x-2">
                    <select
                      name="tank"
                      className="bg-white border-solid border-black mt-2 w-full min-h-[40px] rounded px-3"
                      value={globalCatchForm?.tank || "1"}
                      onChange={handleFormChange}
                      disabled={!globalCatchTripId || !globalCatchHaulId}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(
                        (num) => (
                          <option key={num} value={num.toString()}>
                            {num}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* QR Code Generation Section */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-700 text-sm">
                    Click Confirm to generate QR code for FishQR
                  </p>
                  <button
                    type="button"
                    onClick={handleSubmitCatchRecord}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!globalCatchTripId || !globalCatchHaulId}
                  >
                    Confirm
                  </button>
                </div>

                {showQRCode && generatedQRCode && (
                  <div className="border-2 border-red-500 rounded-lg p-4">
                    <div className="flex flex-col md:flex-row items-center justify-center md:items-start md:justify-start space-x-4">
                      {/* Left side - Fish image and Product ID */}
                      <div>
                        <div className="flex flex-row items-center gap-2">
                          {capturedFishImage && (
                            <img
                              src={capturedFishImage}
                              alt="Fish"
                              className="w-full md:w-[100px] h-[80px] md:h-[100px] object-cover rounded border border-gray-300"
                            />
                          )}
                          <QRCode
                            value={generatedQRCode}
                            size={isMobile ? 80 : 100}
                            className="border border-gray-300 rounded"
                          />
                        </div>
                        <p className="text-sm font-medium text-center md:text-left">
                          Product ID : {generatedQRCode}
                        </p>
                      </div>

                      {/* Right side - Detailed QR breakdown */}
                      <div className="flex-1 pt-2">
                        <h3 className="text-lg font-bold text-red-600 mb-3 hidden md:block">
                          Detailed attached Fish.QR
                        </h3>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="text-center">
                            <div className="bg-white border border-black p-1 md:p-2 mb-1 text-xs md:text-sm">
                              <span className="font-bold">
                                {generatedQRCode.substring(0, 3)}
                              </span>
                            </div>
                            <span className="text-xs text-blue-600">
                              3-a code
                            </span>
                          </div>
                          <div className="text-center">
                            <div className="bg-white border border-black p-1 md:p-2 mb-1 text-xs md:text-sm">
                              <span className="font-bold">
                                {generatedQRCode.substring(3, 7)}
                              </span>
                            </div>
                            <span className="text-xs text-blue-600">
                              Trip #
                            </span>
                          </div>
                          <div className="text-center">
                            <div className="bg-white border border-black p-1 md:p-2 mb-1 text-xs md:text-sm">
                              <span className="font-bold">
                                {generatedQRCode.substring(7, 9)}
                              </span>
                            </div>
                            <span className="text-xs text-blue-600">
                              Haul #
                            </span>
                          </div>
                          <div className="text-center">
                            <div className="bg-white border border-black p-1 md:p-2 mb-1 text-xs md:text-sm">
                              <span className="font-bold">
                                {generatedQRCode.substring(9)}
                              </span>
                            </div>
                            <span className="text-xs text-blue-600">
                              Catch date
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {globalCatchTripId && globalCatchHaulId && catchRecords.length > 0 && (
          <div className="flex flex-row items-center justify-center mt-4">
            <button
              onClick={() => setShowCatchDialog(true)}
              className="bg-blue-800 text-white px-5 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={
                !globalCatchTripId ||
                !globalCatchHaulId ||
                catchRecords.length === 0
              }
            >
              Submit
            </button>
          </div>
        )}

        <Card className="my-6 py-4" hidden={!showCatchDialog}>
          <CardContent className="p-0md:p-4">
            <>
              {!globalCatchHauls.find((h) => h.id === globalCatchHaulId) && (
                <div className="flex flex-col items-center justify-center absolute top-50 left-10">
                  <QRCode
                    value={
                      globalCatchHauls.find((h) => h.id === globalCatchHaulId)
                        ?.qr_code || ""
                    }
                    size={50}
                  />
                  <span className="text-xs">
                    {
                      globalCatchHauls.find((h) => h.id === globalCatchHaulId)
                        ?.qr_code
                    }
                  </span>
                </div>
              )}
            </>
            <div className="text-center mb-4">
              <div className="font-bold mb-1 text-xl text-blue-600 uppercase">
                Fishing Log / Haul
              </div>
              <div className="flex flex-row items-center justify-around">
                <div className="font-semibold text-xs border-2 border-red-500 pl-2 pr-2 rounded-lg">
                  Trip ID :{" "}
                  {trips.find((v) => v.id === globalCatchTripId)?.trip_code ||
                    "-"}{" "}
                </div>
                <div className="font-semibold text-sm border-2 border-red-500 pl-2 pr-2 rounded-lg">
                  Vessel ID :{" "}
                  {tripVessel?.registration_number || tripData?.vessel_id}
                </div>
              </div>
            </div>
            <div className="mt-4">
              {catchRecords.length === 0 ? (
                <div>No catch records yet.</div>
              ) : (
                <div className="market__box2-spilit border-2 border-black">
                  {/* Fixed Left Column */}
                  <div className="market__box2-fixed bg-gray-100 border-r-2 border-black">
                    <ul className="grid grid-rows-[repeat(13,60px)] !py-0 !px-0">
                      <li className="border-b border-black !px-3 py-2 text-xs font-bold flex items-center  ">
                        Product Photo
                      </li>
                      <li className="border-b border-black !px-3 py-2 text-xs font-bold flex items-center ">
                        Product name
                      </li>
                      <li className="border-b border-black !px-3 py-2 text-xs font-bold flex items-center ">
                        Species
                      </li>
                      <li className="border-b border-black !px-3 py-2 text-xs font-bold flex items-center ">
                        3-a code
                      </li>
                      <li className="border-b border-black !px-3 py-2 text-xs font-bold flex items-center ">
                        Product ID
                      </li>
                      <li className="border-b border-black !px-3 py-2 text-xs font-bold flex items-center ">
                        Captured location
                      </li>
                      <li className="border-b border-black !px-3 py-2 text-xs font-bold flex items-center ">
                        Zone
                      </li>
                      <li className="border-b border-black !px-3 py-2 text-xs font-bold flex items-center ">
                        Captured time
                      </li>
                      <li className="border-b border-black !px-3 py-2 text-xs font-bold flex items-center ">
                        Size
                      </li>
                      <li className="border-b border-black !px-3 py-2 text-xs font-bold flex items-center ">
                        Net kg/case
                      </li>
                      <li className="border-b border-black !px-3 py-2 text-xs font-bold flex items-center ">
                        Case Quantity Load
                      </li>
                      <li className="border-b border-black !px-3 py-2 text-xs font-bold flex items-center ">
                        Tank #
                      </li>
                      <li className="border-black !px-3 py-2 text-xs font-bold flex items-center ">
                        Catch volume
                      </li>
                    </ul>
                  </div>

                  {/* Scrollable Right Section */}
                  <div className="market__box2-slider overflow-x-auto">
                    <div className="flex">
                      {catchRecords.map((rec, index) => (
                        <ul
                          key={rec.id}
                          className="market__box2-item px-0 mx-0 min-w-[200px] border-r border-black last:border-r-0 grid grid-rows-[repeat(13,60px)]"
                        >
                          <li className="border-b border-black px-0 py-2 flex items-center justify-center">
                            {rec.image_url && (
                              <img
                                src={rec.image_url}
                                alt="Fish"
                                className="w-14 h-11 object-cover rounded"
                              />
                            )}
                          </li>
                          <li className="border-b border-black px-0 py-2 flex items-center justify-center">
                            <span className="text-xs">
                              {rec.fish_name || "-"}
                            </span>
                          </li>
                          <li className="border-b border-black px-0 py-2 flex items-center justify-center">
                            <span className="text-xs">
                              {rec.species || "-"}
                            </span>
                          </li>
                          <li className="border-b border-black px-0 py-2 flex items-center justify-center">
                            <span className="text-xs font-bold">
                              {rec.three_a_code || "-"}
                            </span>
                          </li>
                          <li className="border-b border-black px-0 py-2 flex items-center justify-center">
                            <span className="text-xs font-bold">
                              {rec.qr_code || "-"}
                            </span>
                          </li>
                          <li className="border-b border-black px-0 py-2 flex items-center justify-center">
                            <button className="bg-gray-400 text-white px-2 py-1 rounded text-xs">
                              GPS hidden
                            </button>
                          </li>
                          <li className="border-b border-black px-0 py-2 flex items-center justify-center">
                            <span className="text-xs">
                              {rec.capture_zone || "EC (X...)"}
                            </span>
                          </li>
                          <li className="border-b border-black px-0 py-2 flex items-center justify-center">
                            <span className="text-xs">
                              {rec.capture_time
                                ? new Date(rec.capture_time)
                                    .toLocaleDateString("en-GB", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "2-digit",
                                    })
                                    .replace(/\//g, "/") +
                                  " ; " +
                                  new Date(rec.capture_time)
                                    .toLocaleTimeString("en-US", {
                                      hour12: true,
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                    .toLowerCase()
                                : "27/02/25 ; 9:30 am"}
                            </span>
                          </li>
                          <li className="border-b border-black px-0 py-2 flex flex-col justify-center items-center">
                            <span className="text-xs">
                              {rec.fish_size || "70"} pcs/kg
                            </span>
                          </li>
                          <li className="border-b border-black px-0 py-2 flex items-center justify-center">
                            <span className="text-xs">
                              {rec.net_kg_per_case || "12"} kg
                            </span>
                          </li>
                          <li className="border-b border-black px-0 py-2 flex items-center justify-center">
                            <span className="text-xs font-bold">
                              {rec.case_quantity || "1.000"}
                            </span>
                          </li>
                          <li className="border-b border-black px-0 py-2 flex items-center justify-center">
                            <span className="text-xs">{rec.tank || "1"}</span>
                          </li>
                          <li className=" border-black px-0 py-2 flex items-center justify-center">
                            <span className="text-xs font-bold">
                              {(
                                ((Number(rec.net_kg_per_case) || 12) *
                                  (Number(rec.case_quantity) || 1000)) /
                                1000
                              ).toFixed(3)}{" "}
                              kg
                            </span>
                          </li>
                        </ul>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-row items-center justify-center mt-4">
              <button
                onClick={async () => {
                  const { data, error } = await supabase
                    .from("catch_records")
                    .update({
                      is_haul_record: true,
                    })
                    .eq("id", globalCatchHaulId);
                  if (error) {
                    console.error(error);
                  } else {
                    toast({
                      title: "Haul record saved successfully",
                      description: "Haul record saved successfully",
                    });
                  }
                }}
                className="bg-blue-500 text-white px-5 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="overflow-x-scroll px-2 py-6 hidden">
          {haulLoading ? (
            <div className="w-full overflow-x-auto">
              <Table className="min-w-full border-collapse">
                <TableHeader>
                  <TableRow className="border-b-2 border-black">
                    <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-20 sticky left-0 z-10">
                      Haul #
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-16">
                      QR Code
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-16">
                      Latitude
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-16">
                      Longitude
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-16">
                      Depth
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-20">
                      Quantity
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-16">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <motion.tr
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="w-full border-b border-gray-200"
                    >
                      <TableCell className="border border-black px-2 py-1.5 text-xs font-medium w-20 sticky left-0 z-10 bg-white">
                        <motion.div
                          className="h-4 bg-gray-200 rounded animate-pulse"
                          initial={{ width: "60%" }}
                          animate={{ width: ["60%", "80%", "60%"] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      </TableCell>
                      <TableCell className="border border-black px-2 py-1.5 text-xs w-16">
                        <div className="flex flex-col items-center">
                          <motion.div
                            className="w-10 h-10 bg-gray-200 rounded animate-pulse"
                            initial={{ scale: 0.8 }}
                            animate={{ scale: [0.8, 1, 0.8] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                          <motion.div
                            className="h-3 bg-gray-200 rounded w-12 mt-1 animate-pulse"
                            initial={{ width: "60%" }}
                            animate={{ width: ["60%", "80%", "60%"] }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              delay: 0.2,
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="border border-black px-2 py-1.5 text-xs w-16">
                        <motion.div
                          className="h-4 bg-gray-200 rounded animate-pulse"
                          initial={{ width: "50%" }}
                          animate={{ width: ["50%", "70%", "50%"] }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: 0.4,
                          }}
                        />
                      </TableCell>
                      <TableCell className="border border-black px-2 py-1.5 text-xs w-16">
                        <motion.div
                          className="h-4 bg-gray-200 rounded animate-pulse"
                          initial={{ width: "55%" }}
                          animate={{ width: ["55%", "75%", "55%"] }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: 0.5,
                          }}
                        />
                      </TableCell>
                      <TableCell className="border border-black px-2 py-1.5 text-xs w-16">
                        <motion.div
                          className="h-4 bg-gray-200 rounded animate-pulse"
                          initial={{ width: "40%" }}
                          animate={{ width: ["40%", "60%", "40%"] }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: 0.6,
                          }}
                        />
                      </TableCell>
                      <TableCell className="border border-black px-2 py-1.5 text-xs w-20">
                        <motion.div
                          className="h-4 bg-gray-200 rounded animate-pulse"
                          initial={{ width: "60%" }}
                          animate={{ width: ["60%", "80%", "60%"] }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: 0.7,
                          }}
                        />
                      </TableCell>
                      <TableCell className="border border-black px-2 py-1.5 text-xs w-16">
                        <div className="flex gap-1 justify-center">
                          <motion.div
                            className="h-5 w-5 bg-gray-200 rounded animate-pulse"
                            initial={{ scale: 0.8 }}
                            animate={{ scale: [0.8, 1, 0.8] }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              delay: 0.8,
                            }}
                          />
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <div className="flex justify-between items-center mb-4">
                <div className="text-lg font-bold">Hauls list</div>
                <div className="text-lg font-bold">
                  No of hauls: {haulsByTripId[selectedTripId]?.length ?? 0}
                </div>
              </div>
              <Table className="min-w-full border-collapse">
                <TableHeader>
                  <TableRow className="border-b-2 border-black">
                    <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-20 sticky left-0 z-10">
                      Haul #
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-16">
                      QR Code
                    </TableHead>

                    <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-16">
                      Latitude
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-16">
                      Longitude
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-16">
                      Depth
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-20">
                      Records Quantity
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-16">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {haulsByTripId[selectedTripId]?.map((haul) => (
                    <TableRow
                      key={haul.id}
                      className="w-full cursor-pointer hover:bg-gray-50 border-b border-gray-200"
                      onClick={() => {
                        setSelectedHaul(haul);
                        fetchCatchRecords(haul.id);
                        setShowCatchDialog(true);
                      }}
                    >
                      <TableCell className="border border-black px-2 py-1.5 text-xs font-medium w-20 sticky left-0 z-10 bg-white">
                        <div
                          className="truncate"
                          title={String(haul.haul_number)}
                        >
                          {haul.haul_number}
                        </div>
                      </TableCell>
                      <TableCell className="border border-black px-2 py-1.5 text-xs w-16">
                        <div className="flex flex-col items-center">
                          <QRCode value={haul.qr_code || ""} size={40} />
                          <div
                            className="text-xs truncate"
                            title={haul.qr_code}
                          >
                            {haul.qr_code}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="border border-black px-2 py-1.5 text-xs w-16">
                        <div
                          className="truncate"
                          title={`${haul.latitude ?? "-"}`}
                        >
                          {haul.latitude ?? "-"}
                        </div>
                      </TableCell>
                      <TableCell className="border border-black px-2 py-1.5 text-xs w-16">
                        <div
                          className="truncate"
                          title={`${haul.longitude ?? "-"}`}
                        >
                          {haul.longitude ?? "-"}
                        </div>
                      </TableCell>
                      <TableCell className="border border-black px-2 py-1.5 text-xs w-16">
                        <div
                          className="truncate"
                          title={`${haul.depth ?? "-"}`}
                        >
                          {haul.depth ?? "-"}
                        </div>
                      </TableCell>
                      <TableCell className="border border-black px-2 py-1.5 text-xs w-20">
                        <div
                          className="truncate"
                          title={`${haul.notes ?? "-"}`}
                        >
                          {haul?.catch_records?.reduce(
                            (sum, rec) => sum + Number(rec.quantity || 0),
                            0
                          )}
                        </div>
                      </TableCell>
                      <TableCell
                        className="border border-black px-2 py-1.5 text-xs w-16"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedHaul(haul);
                              fetchCatchRecords(haul.id);
                              setShowCatchDialog(true);
                            }}
                            className="h-5 w-5 p-0"
                          >
                            <Pencil className="w-2.5 h-2.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div>
                {/* Pagination controls */}
                <div className="flex flex-col md:flex-row items-center justify-between mt-4 gap-4">
                  <div className="text-sm">
                    {t("departure.showing")}{" "}
                    {trips.length ? (page - 1) * perPage + 1 : 0} -{" "}
                    {Math.min(page * perPage, total)} {t("departure.of")}{" "}
                    {total}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft />
                    </Button>
                    {Array.from(
                      { length: Math.ceil(total / perPage) },
                      (_, i) => (
                        <Button
                          key={i + 1}
                          type="button"
                          variant={page === i + 1 ? "default" : "ghost"}
                          size="icon"
                          onClick={() => setPage(i + 1)}
                        >
                          {i + 1}
                        </Button>
                      )
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={
                        page === Math.ceil(total / perPage) || total === 0
                      }
                      onClick={() => setPage(page + 1)}
                    >
                      <ChevronRight />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Batch() {
  const { language } = useLanguageStore();
  const isMobile = useIsMobile();
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title={language === "en" ? "Fishing Log" : "NHẬT KÝ MẺ"} />
        <TopButtons />

        <div className="px-3 flex gap-2 md:gap-3 lg:gap-4 overflow-x-auto">
          <Link to="/fishing-log/batch" className="flex-shrink-0">
            <button
              className={`
                bg-gradient-to-r from-black to-[#1306ad] text-[#f8f603] rounded-md px-4 md:px-5
                h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                text-xs md:text-base
                w-32 md:w-36 lg:w-40
              `}
            >
              <span className="truncate">
                {language === "en" ? "Fishing Log" : "Nhật Ký Mẻ"}
              </span>
            </button>
          </Link>

          <Link to="/fishing-log/declaration" className="flex-shrink-0">
            <button
              className={`
                bg-gradient-to-r from-[#a8a8a8] to-[#fdfdfd] text-black rounded-md px-4 md:px-5
                h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                text-xs md:text-base
                w-32 md:w-36 lg:w-40 shadow-lg hover:shadow-xl transition-all duration-300
              `}
            >
              <span className="truncate">
                {language === "en" ? "Declaration Log" : "Nhật Ký Khai Báo"}
              </span>
            </button>
          </Link>
        </div>
        <BatchContainer />
      </SidebarInset>
    </SidebarProvider>
  );
}
