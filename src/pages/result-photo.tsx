import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Fish,
  Camera,
  Check,
  AlertCircle,
  Info,
  Clock,
  Eye,
  Plus,
  LayoutDashboard,
  SplinePointer,
} from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { useAuthStore } from "@/stores/auth-store";
import { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toDataURL } from "qrcode";
import OpenSeaMapView from "@/components/OpenSeaMapView";
import { Select } from "@/components/ui/select";
import QRCode from "react-qr-code";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguageStore } from "@/stores/language-store";
import { API_ENDPOINTS, APP_CONFIG } from "@/lib/constants";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Add interfaces at the top of the file
interface GlobalCatchFormData {
  haul_id: string;
  species: string;
  quantity: number;
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
  capture_zone?:
    | string
    | {
        zone: string;
        ec30Code: string;
        region: string;
        coordinates: { lat: number; lng: number };
        ngutruong: string;
        area_km2: number;
      };
  region: string | null;
  three_a_code: string | null;
  qr_code: string;
  farmer_id: string | null;
  image_url: string | null;
  latitude: string | null;
  longitude: string | null;
  diameter: string | null;
  fish_product_id?: string;
  created_at?: string;
  updated_at?: string | null;
  // Additional fields for form
  trip_id?: string;
  haul_number?: string;
  depth?: string;
  notes?: string;
  start_time?: string;
  end_time?: string;
  vessel_registration_number?: string;
  vessel_name?: string;
  vessel_id?: string;
  vessel_type?: string;
  vessel_length?: string;
}

// Updated interface to match the new Python API response
interface FishDetection {
  fish_id: number;
  classification: {
    accuracy: number;
    common_name: string;
    scientific_name: string;
    species: string;
    species_id: string;
  };
  detection: {
    bounding_box: number[];
    confidence: number;
    detected_class: string;
    model: string;
  };
  metrics: {
    dimensions: {
      area_pixels: number;
      height_pixels: number;
      width_pixels: number;
    };
    position: {
      center_x: number;
      center_y: number;
      relative_center_x: number;
      relative_center_y: number;
    };
    relative_size: {
      area_ratio: number;
      height_ratio: number;
      width_ratio: number;
    };
    size_category: string;
  };
  polygon: number[][];
  processing_time_ms: number;
  distance_analysis?: {
    estimated_weight_kg: number;
    distance_cm: number;
    real_length_cm: number;
    real_girth_cm: number;
    distance_confidence: number;
    calculation_method: string;
    formulas_used: string[];
  };
}

interface FishAnalysisResult {
  success: boolean;
  processor: string;
  analysis: {
    en: Record<string, string>;
    vi: Record<string, string>;
  };
  fish_count: number;
  detections: FishDetection[];
  annotated_image?: {
    filename: string;
    url: string;
  };
  models_used?: {
    classification: string;
    detection: string;
  };
  processing_time?: {
    classification_ms: number;
    detection_ms: number;
    total_ms: number;
  };
  image_info?: {
    channels: number;
    height: number;
    width: number;
    size_mb: number;
  };
  timestamp: string;
  error?: string;
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
  diameter: string | null;
  fish_product_id?: string;
  created_at?: string;
  updated_at?: string | null;

}

// Update HaulData interface to include catch_records
interface HaulData {
  id: string;
  haul_number: number;
  qr_code: string;
  total_quantity: number;
  unique_tanks: number;
  total_net_kg: number;
  catch_records: CatchRecord[];
}

// Update TripData interface to include vessel_registration_number
interface TripData {
  id: string;
  trip_code: string;
  vessel_id: string;
  departure_port: string;
  status: string;
  created_at: string;
  vessel_registration_number?: string;
  vessels?: {
    id: string;
    name: string;
    registration_number: string;
  };
}

interface HaulTotals {
  total_quantity: number;
  unique_tanks: number;
  total_net_kg: number;
  catch_records: CatchRecord[];
}

// Add interface for HaulForm
interface HaulForm {
  trip_id: string;
  haul_number: number;
  latitude: string | number;
  longitude: string | number;
  depth: string;
  notes: string;
  start_time: string;
  end_time: string;
  qr_code: string;
  farmer_id?: string;
}

// Helper function to parse EC30 zone data
function parseEC30ZoneData(captureZoneData: string | null): {
  zone: string;
  ec30Code: string;
  region: string;
  coordinates: { lat: number; lng: number };
  ngutruong: string;
  area_km2: number;
} | null {
  if (!captureZoneData) return null;

  try {
    return JSON.parse(captureZoneData);
  } catch (error) {
    console.error("Error parsing EC30 zone data:", error);
    return null;
  }
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

// Update the fetchHaulTotals function
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
        diameter: record.diameter as string | null,
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

export default function ResultPhoto() {
  const { language } = useLanguageStore();
  const { t } = useTranslation();

  const { isAuthenticated, user } = useAuthStore();

  const navigate = useNavigate();
  const [myPhoto, setMyPhoto] = useState("");
  const [fishResult, setFishResult] = useState<FishAnalysisResult | null>(null);
  const [fishDistance, setFishDistance] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  const [trips, setTrips] = useState<TripData[]>([]);
  const [vessels, setVessels] = useState<
    Database["public"]["Tables"]["vessels"]["Row"][]
  >([]);
  const [ports, setPorts] = useState<
    Database["public"]["Tables"]["seaports"]["Row"][]
  >([]);
  const [error, setError] = useState<string | null>(null);

  // Pagination and search
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");

  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [haulsByTripId, setHaulsByTripId] = useState<
    Record<string, HaulData[]>
  >({});
  const [showHaulDialog, setShowHaulDialog] = useState(false);
  const [haulForm, setHaulForm] = useState<HaulForm | null>(null);
  const [catchForm, setCatchForm] = useState<GlobalCatchFormData | null>(null);
  const [globalHaulForm, setGlobalHaulForm] =
    useState<GlobalCatchFormData | null>(null);

  const [haulLoading, setHaulLoading] = useState(false);
  const [haulError, setHaulError] = useState<string | null>(null);

  const [catchImage, setCatchImage] = useState<File | null>(null);
  const [catchImageUrl, setCatchImageUrl] = useState<string | null>(null);

  const [locationDenied, setLocationDenied] = useState(false);
  const [globalCatchTripId, setGlobalCatchTripId] = useState<string | null>(
    null
  );
  const [globalCatchHauls, setGlobalCatchHauls] = useState<HaulData[]>([]);
  const [globalCatchHaulId, setGlobalCatchHaulId] = useState<string | null>(
    null
  );
  const [globalCatchForm, setGlobalCatchForm] =
    useState<GlobalCatchFormData | null>(null);
  const [globalCatchLoading, setGlobalCatchLoading] = useState(false);
  const [globalCatchError, setGlobalCatchError] = useState<string | null>(null);
  const [createdGlobalCatch, setCreatedGlobalCatch] =
    useState<CatchRecord | null>(null);

  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);
  const [catchLocation, setCatchLocation] = useState<string | null>(null);

  const [isSaveFish, setIsSaveFish] = useState(false);
  const [haulTotals, setHaulTotals] = useState<Record<string, HaulTotals>>({});

  if (!isAuthenticated) {
    navigate("/login");
  }

  useEffect(() => {
    fetchVessels();
    fetchPorts();
    fetchTrips();
  }, []);

  // Add useEffect to scroll to selected trip when it changes
  useEffect(() => {
    if (globalCatchTripId) {
      const tripElement = document.querySelector(
        `[data-trip-id="${globalCatchTripId}"]`
      );
      if (tripElement) {
        tripElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
      }
    }

    if (globalCatchTripId) {
      const selectedTrip = trips.find((t) => t.id === globalCatchTripId);
      // Get the seaport information for this trip
      const tripSeaport = ports.find(
        (p) => p.id === selectedTrip.departure_port
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

          const ec30Zone = calculateEC30Zone(userLat, userLon);

          setGlobalCatchForm((prev) => {
            if (!prev) return null;
            const newForm = {
              ...prev,
              capture_zone: ec30Zone,
            };
            return newForm;
          });
        },
        (err) => {
          // If location is not available, still create the form
          if (err.code === 1) {
            toast({
              title: "Location Denied",
              description:
                "Location access denied. You can still create the haul manually.",
              variant: "destructive",
            });
          }
        }
      );
    }
  }, [globalCatchTripId]);

  // Add useEffect to scroll to selected haul when it changes
  useEffect(() => {
    if (globalCatchHaulId) {
      const haulElement = document.querySelector(
        `[data-haul-id="${globalCatchHaulId}"]`
      );
      if (haulElement) {
        haulElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
      }
    }
  }, [globalCatchHaulId]);

  const extractStandardizedValues = (data: FishAnalysisResult) => {
    if (data.processor === "gemini") {
      const geminiData = data as FishAnalysisResult;
      if (language === "en") {
        return {
          species: geminiData.analysis.en.species || "",
          quantity: geminiData.analysis.en.total_number_of_fish || "",
          fish_name: geminiData.analysis.en.common_name || "",
          per_fish_weight:
            geminiData.analysis.en.estimated_weight_per_fish || "",
          average_fish_size: geminiData.analysis.en.average_fish_size || "",
          total_estimated_weight:
            geminiData.analysis.en.total_estimated_weight || "",
        };
      } else {
        return {
          species: geminiData.analysis.vi.species || "",
          quantity: geminiData.analysis.vi.total_number_of_fish || "",
          fish_name: geminiData.analysis.vi.common_name || "",
          per_fish_weight:
            geminiData.analysis.vi.estimated_weight_per_fish || "",
          average_fish_size: geminiData.analysis.vi.average_fish_size || "",
          total_estimated_weight:
            geminiData.analysis.vi.total_estimated_weight || "",
        };
      }
    } else {
      const apiData = data as FishAnalysisResult;
      return {
        species: apiData.detections?.[0]?.classification?.species || "",
        quantity: apiData.fish_count?.toString() || "",
        fish_name: apiData.detections?.[0]?.classification?.common_name || "",
        total_estimated_weight:
          apiData.detections?.[0]?.distance_analysis?.estimated_weight_kg?.toString() ||
          "",
      };
    }
  };

  useEffect(() => {
    // Only set the form if we have fishResult and globalCatchHaulId and no form exists yet
    if (fishResult && globalCatchHaulId && !globalCatchForm) {
      const now = new Date();

      // Calculate EC30 zone if coordinates are available
      let ec30ZoneData = "";
      if (location?.latitude && location?.longitude) {
        const ec30Zone = calculateEC30Zone(
          location.latitude,
          location.longitude
        );
        ec30ZoneData = JSON.stringify(ec30Zone);
      }

      setGlobalCatchForm({
        haul_id: globalCatchHaulId,
        species: fishResult?.analysis[language].species || "",
        quantity: Number(
          fishResult?.analysis[language].total_number_of_fish ||
            fishResult?.fish_count.toString()
        ),
        unit: "kg",
        quality: "1",
        processing_method: "1",
        catching_location: catchLocation || "",
        latitude: location?.latitude.toString() || "",
        longitude: location?.longitude.toString() || "",
        fish_name: fishResult?.analysis[language].common_name,
        fish_specie: fishResult?.analysis[language].species || "",
        fish_size: fishResult?.analysis[language].average_fish_size || "",
        tank: "1",
        case_size: "15",
        net_kg_per_case:
          fishResult?.analysis[language].total_estimated_weight || "12",
        capture_date: now.toISOString().slice(0, 10),
        capture_time: now.toISOString(),
        capture_zone: ec30ZoneData, // Save EC30 zone as JSON string
        region:
          location?.latitude && location?.longitude
            ? getTraditionalCoastalRegion(location.latitude, location.longitude)
                .code
            : "",
        three_a_code: fishResult?.analysis[language].species.slice(0, 3) || "",
        qr_code: "",
        farmer_id: user?.auth_id || "",
        image_url: myPhoto || "",
        diameter: null,
      });
    }
  }, [
    globalCatchForm,
    globalCatchHaulId,
    fishResult,
    location,
    catchLocation,
    language,
    user?.auth_id,
    myPhoto,
  ]);

  // Remove the problematic useEffect that was causing infinite re-renders
  // useEffect(() => {
  //   if (globalCatchForm?.capture_zone) {
  //     console.log("Capture zone changed to:", globalCatchForm.capture_zone);
  //   }
  // }, [globalCatchForm?.capture_zone]);

  async function fetchVessels() {
    const { data } = await supabase
      .from("vessels")
      .select("*")
      .eq("user_id", user?.auth_id || "");
    setVessels(data || []);
  }

  async function fetchPorts() {
    const { data } = await supabase.from("seaports").select("*");
    setPorts(data || []);
  }

  async function fetchTrips(searchTerm = search) {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
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
        .eq("status", "Catching")
        .eq("vessels.user_id", user?.auth_id || "");
      if (searchTerm) {
        query = query.or(
          `trip_code.ilike.%${searchTerm}%,departure_port.ilike.%${searchTerm}%`
        );
      }
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);
      setTrips(data || []);
      setTotal(count || 0);

      // Find the most recent trip with Caching status

      // Data is already ordered by created_at descending, so first match is most recent
      const lastCachingTrip = data?.find((trip) => trip.status === "Catching");

      // console.log("lastCachingTrip ", lastCachingTrip);
      if (lastCachingTrip) {
        setExpandedTripId(lastCachingTrip.id);
        setGlobalCatchTripId(lastCachingTrip.id);

        // Fetch hauls for the last caching trip
        const { data: hauls } = await supabase
          .from("fishing_hauls")
          .select("*")
          .eq("trip_id", lastCachingTrip.id)
          .order("created_at", { ascending: false });

        // Set hauls and most recent haul ID
        const mappedHauls: HaulData[] = (hauls || []).map((haul) => ({
          id: haul.id,
          haul_number: haul.haul_number,
          qr_code: haul.qr_code,
          total_quantity: 0,
          unique_tanks: 0,
          total_net_kg: 0,
          catch_records: [],
        }));
        setGlobalCatchHauls(mappedHauls);
        if (hauls && hauls.length > 0) {
          setGlobalCatchHaulId(hauls[0].id); // Most recent haul
        } else {
          setGlobalCatchHaulId(null);
        }
      } else {
        // Reset states if no caching trip found
        setExpandedTripId(null);
        setGlobalCatchTripId(null);
        setGlobalCatchHauls([]);
        setGlobalCatchHaulId(null);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Check if screen is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 600);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    // Load photo and fish analysis result
    const photoData = localStorage.getItem("myPhoto");
    const fishData = localStorage.getItem("fishAnalysisResult");

    if (photoData) {
      setMyPhoto(photoData);
    }

    if (fishData) {
      try {
        const parsedFishData = JSON.parse(fishData);
        setFishResult(parsedFishData as FishAnalysisResult);
        console.log("parsedFishData ", parsedFishData);

        setFishDistance(Number(localStorage.getItem("fishDistance")) || 0);
      } catch (error) {
        console.error("Error parsing fish data:", error);
      }
    }

    setLoading(false);
  }, []);

  function reScan() {
    // Clear previous results
    localStorage.removeItem("fishAnalysisResult");
    navigate("/mobile-scan");
  }

  function getConfidenceColor(confidence: number) {
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.6) return "text-yellow-600";
    return "text-red-600";
  }

  function getConfidenceLabel(confidence: number) {
    if (confidence >= 0.9) return "Very High";
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Medium";
    if (confidence >= 0.4) return "Low";
    return "Very Low";
  }



  // Modify fetchHaulTotals to be a component function that updates state
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
    globalCatchHauls.forEach(async (haul) => {
      await fetchAndUpdateHaulTotals(haul.id);
    });
  }, [globalCatchHauls]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Fish className="w-12 h-12 animate-pulse text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  // Add the form handler function
  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // Prevent default behavior for select
    if (e.target.tagName === "SELECT") {
      e.preventDefault();
    }

    setGlobalCatchForm((prev) => {
      if (!prev) return null;

      return {
        ...prev,
        [name]: value,
      };
    });
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center"
      style={{
        backgroundImage: isMobile ? "none" : "url(/112.png)",
        backgroundColor: isMobile ? "#f0f9ff" : undefined,
      }}
    >
      <div className="flex justify-center items-center min-h-screen md:p-4">
        <div
          className={`
          ${
            isMobile
              ? "w-full max-w-md border-0 rounded-lg"
              : "w-full border border-gray-300 rounded-lg"
          }
          bg-white overflow-hidden shadow-lg
        `}
        >
          <div className="flex flex-col">
            {/* Header */}
            <div className="bg-blue-600 text-white p-4 text-center">
              <Fish className="w-8 h-8 mx-auto mb-2" />
              <h1 className="text-xl font-bold">Fish Identification Result</h1>
            </div>

            <div className="p-6 space-y-6">
              {/* Photo and basic info */}
              <div className="flex flex-col md:flex-row gap-4">
                {/* Photo */}
                <div className="flex-shrink-0">
                  {myPhoto && (
                    <img
                      className="w-full h-[300px] md:w-25 md:h-[400px] object-cover rounded-lg border-2 border-gray-200 mx-auto"
                      src={myPhoto.replace("data:image/jpeg;base64,:", "")}
                      alt="Scanned fish"
                    />
                  )}
                </div>
                {/* Fish identification results */}
                {fishResult && (
                  <div className="flex-1 space-y-3">
                    {fishResult ? (
                      <>
                        {/* Fish name */}
                        <div>
                          <h2 className="text-xl font-bold text-gray-800 capitalize">
                            {fishResult.analysis[language].common_name || ""}
                          </h2>
                          <p className="text-sm text-gray-600">
                            {fishResult?.analysis[language].species || ""}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-gray-700">
                            Total Number of Fish:
                          </label>
                          <span className="text-sm font-bold text-blue-600">
                            {fishResult.analysis[language].total_number_of_fish}
                          </span>
                        </div>

                        {/* Weight Information */}
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-gray-700">
                            Estimated Weight:
                          </label>
                          <span className="text-sm font-bold text-blue-600">
                            {fishResult.analysis[language]
                              .total_estimated_weight || ""}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                        <p className="text-red-600">
                          No fish identification data available
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* OpenSeaMap  map */}
              {!createdGlobalCatch && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Location
                    </h3>
                    <OpenSeaMapView
                      onLocationUpdate={(location) => {
                        if (globalCatchForm) {
                          setLocation({
                            latitude: location.latitude,
                            longitude: location.longitude,
                            address: location.address,
                          });
                          setCatchLocation(location.address);
                          setGlobalCatchForm({
                            ...globalCatchForm,
                            latitude: location.latitude.toString(),
                            longitude: location.longitude.toString(),
                            catching_location: location.address,
                          });
                        }
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-4">
                    <Label>Select Trip</Label>
                    <div className="relative w-full">
                      <div className="overflow-x-auto pb-4 hide-scrollbar">
                        <div className="flex gap-2 md:gap-4 min-w-full">
                          {loading ? (
                            // Loading skeleton cards
                            Array.from({ length: 3 }).map((_, index) => (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{
                                  duration: 0.3,
                                  delay: index * 0.1,
                                }}
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
                          ) : trips.length === 0 ? (
                            // No trips message
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5 }}
                              className="flex flex-col items-center justify-center w-full py-12 text-center"
                            >
                              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <Plus className="w-8 h-8 text-gray-400" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                                No trips found
                              </h3>
                              <p className="text-sm text-gray-500">
                                Create a new trip to get started
                              </p>
                            </motion.div>
                          ) : (
                            // Actual trip cards
                            trips.map((t, index) => (
                              <motion.div
                                key={t.id}
                                data-trip-id={t.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{
                                  duration: 0.3,
                                  delay: index * 0.1,
                                }}
                                className={`flex-none w-[200px] md:w-[240px] lg:w-[280px] p-2 md:p-3 lg:p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                                  globalCatchTripId === t.id
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 hover:border-blue-300"
                                }`}
                                onClick={async () => {
                                  const tripId = t.id;
                                  setGlobalCatchTripId(tripId);
                                  setGlobalCatchHaulId(null);
                                  setCreatedGlobalCatch(null);
                                  setGlobalCatchError(null);

                                  // Fetch hauls with totals
                                  const { data: hauls, error } = await supabase
                                    .from("fishing_hauls")
                                    .select("id, haul_number, qr_code")
                                    .eq("trip_id", tripId)
                                    .order("haul_number", { ascending: true });

                                  if (error) {
                                    setGlobalCatchError(error.message);
                                    setGlobalCatchHauls([]);
                                  } else {
                                    // Fetch totals and catch records for each haul
                                    const haulsWithTotals = await Promise.all(
                                      hauls.map(async (haul) => {
                                        const totals = await fetchHaulTotals(
                                          haul.id
                                        );
                                        console.log("totals ", totals);
                                        return {
                                          ...haul,
                                          total_quantity:
                                            totals?.total_quantity || 0,
                                          unique_tanks:
                                            totals?.unique_tanks || 0,
                                          total_net_kg:
                                            totals?.total_net_kg || 0,
                                          catch_records:
                                            totals?.catch_records || [],
                                        };
                                      })
                                    );
                                    setGlobalCatchHauls(haulsWithTotals || []);
                                    if (
                                      haulsWithTotals &&
                                      haulsWithTotals.length > 0
                                    ) {
                                      setGlobalCatchHaulId(
                                        haulsWithTotals.sort(
                                          (a, b) =>
                                            b.haul_number - a.haul_number
                                        )[0].id
                                      );
                                    }
                                  }

                                  const { data: maxHaul } = await supabase
                                    .from("fishing_hauls")
                                    .select("haul_number")
                                    .eq("trip_id", tripId)
                                    .order("haul_number", { ascending: false })
                                    .limit(1)
                                    .single();
                                  const nextHaulNumber =
                                    (maxHaul?.haul_number || 0) + 1;
                                  navigator.geolocation.getCurrentPosition(
                                    (pos) => {
                                      setGlobalHaulForm({
                                        trip_id: tripId,
                                        haul_number: nextHaulNumber,
                                        latitude:
                                          pos.coords.latitude.toString(),
                                        longitude:
                                          pos.coords.longitude.toString(),
                                        start_time: new Date().toISOString(),
                                        end_time: new Date().toISOString(),
                                        qr_code: `H${String(
                                          nextHaulNumber
                                        ).padStart(2, "0")}${t.trip_code}`,
                                      } as any);
                                    },
                                    (err) => {
                                      console.error(
                                        "Error getting location:",
                                        err
                                      );
                                    }
                                  );
                                }}
                              >
                                <div className="flex flex-col gap-1 md:gap-2">
                                  <div className="flex justify-between items-start">
                                    <span className="text-xs md:text-sm font-medium text-gray-600">
                                      Trip ID:
                                    </span>
                                    <span className="text-xs md:text-sm font-bold text-gray-800 truncate ml-1">
                                      {t.trip_code}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-start">
                                    <span className="text-xs md:text-sm font-medium text-gray-600">
                                      Vessel:
                                    </span>
                                    <span className="text-xs md:text-sm text-gray-800 truncate ml-1">
                                      {t.vessels?.registration_number ||
                                        t.vessel_id}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-start">
                                    <span className="text-xs md:text-sm font-medium text-gray-600">
                                      Date:
                                    </span>
                                    <span className="text-xs md:text-sm text-gray-800 truncate ml-1">
                                      {new Date(
                                        t.created_at
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="mt-1 md:mt-2 flex justify-between items-center">
                                    <span className="text-xs md:text-sm font-medium text-gray-600">
                                      Status:
                                    </span>
                                    <span
                                      className={`text-xs md:text-sm px-1.5 md:px-2 py-0.5 md:py-1 rounded-full ${
                                        t.status === "completed"
                                          ? "bg-green-100 text-green-800"
                                          : t.status === "in_progress"
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      {t.status || "pending"}
                                    </span>
                                  </div>
                                </div>
                              </motion.div>
                            ))
                          )}
                        </div>
                      </div>
                      {/* Fade effect for scroll indication */}
                      <div className="absolute right-0 top-0 bottom-0 w-8 md:w-12 bg-gradient-to-l from-white to-transparent pointer-events-none" />
                    </div>
                    {globalCatchError && (
                      <div className="text-red-500">{globalCatchError}</div>
                    )}
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <Label>Select Haul</Label>
                      <button
                        onClick={async () => {
                          setHaulError(null);
                          setHaulLoading(true);

                          // Get the current maximum haul number for this trip
                          const { data: maxHaul } = await supabase
                            .from("fishing_hauls")
                            .select("haul_number")
                            .eq("trip_id", globalCatchTripId)
                            .order("haul_number", { ascending: false })
                            .limit(1)
                            .single();

                          const nextHaulNumber =
                            (maxHaul?.haul_number || 0) + 1;
                          const trip = trips.find(
                            (t) => t.id === globalCatchTripId
                          );
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
                                  const coords =
                                    await getCoordinatesFromAddress(
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
                                trip_id: globalCatchTripId,
                                haul_number: nextHaulNumber,
                                latitude: pos.coords.latitude,
                                longitude: pos.coords.longitude,
                                depth: distanceFromSeaport,
                                notes: "",
                                start_time: new Date().toISOString(),
                                end_time: new Date().toISOString(),
                                qr_code: `H${String(nextHaulNumber).padStart(
                                  2,
                                  "0"
                                )}${trip.trip_code}`,
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
                                  .eq("trip_id", globalCatchTripId)
                                  .order("created_at", { ascending: false });

                                // Map hauls to include required HaulData properties
                                const mappedHauls: HaulData[] = (
                                  hauls || []
                                ).map((haul) => ({
                                  id: haul.id,
                                  haul_number: haul.haul_number,
                                  qr_code: haul.qr_code,
                                  total_quantity: 0,
                                  unique_tanks: 0,
                                  total_net_kg: 0,
                                  catch_records: [],
                                }));

                                setGlobalCatchHauls(mappedHauls);

                                // Auto-select the newly created haul
                                if (mappedHauls.length > 0) {
                                  setGlobalCatchHaulId(mappedHauls[0].id);
                                }
                              } catch (e: Error | unknown) {
                                setHaulError(
                                  e instanceof Error ? e.message : String(e)
                                );
                              } finally {
                                setHaulLoading(false);
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
                        className="text-blue-500 px-4 text-sm py-2 rounded-md flex items-center gap-2"
                      >
                        {haulLoading ? (
                          <SplinePointer size={16} />
                        ) : (
                          <Plus size={16} />
                        )}{" "}
                        {t("departure.add_new_haul")}
                      </button>
                    </div>
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
                                setCreatedGlobalCatch(null);
                                setGlobalCatchError(null);

                                setGlobalCatchForm({
                                  ...globalCatchForm,
                                  haul_id: h.id,
                                });
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
                                    QR Code:
                                  </span>
                                  <span className="text-xs md:text-sm text-gray-800 break-all truncate ml-1">
                                    {h.qr_code || "N/A"}
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
                                        (
                                        {haulTotals[h.id]?.catch_records
                                          ?.length || 0}{" "}
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
                                        {(
                                          haulTotals[h.id]?.total_net_kg || 0
                                        ).toFixed(1)}{" "}
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
                          {globalCatchHauls.length === 0 &&
                            globalCatchTripId && (
                              <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="flex-none w-full p-4 text-center text-gray-500"
                              >
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                                  <Plus className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                                  No hauls found
                                </h3>
                                <p className="text-sm text-gray-500">
                                  Create a new haul to get started
                                </p>
                              </motion.div>
                            )}
                        </div>
                      </div>
                      {/* Fade effect for scroll indication */}
                      <div className="absolute right-0 top-0 bottom-0 w-8 md:w-12 bg-gradient-to-l from-white to-transparent pointer-events-none" />
                    </div>
                  </div>

                  {/* Add custom scrollbar styles */}
                  <style
                    dangerouslySetInnerHTML={{
                      __html: `
                  .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                  }
                  .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                  }
                `,
                    }}
                  />
                </>
              )}

              {createdGlobalCatch && (
                <div className="flex flex-col items-center gap-4">
                  <div className="font-semibold">Catch Record Created!</div>
                  <QRCode value={createdGlobalCatch.qr_code} size={80} />
                  <div className="text-xs">{createdGlobalCatch.qr_code}</div>
                  <button
                    className="w-1/2 py-2 md:py-3  px-2 md:px-4 border-2 border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                    onClick={reScan}
                  >
                    <Camera className="w-4 h-4" />
                    Scan Again
                  </button>

                  <button
                    className=" mt-2 w-1/2 py-2 md:py-3  px-2 md:px-4 border-2 border-black-500 bg-gray-500 text-black rounded-lg hover:bg-black-50 transition-colors flex items-center justify-center gap-2"
                    onClick={() => {
                      setIsSaveFish(false);
                      setGlobalCatchForm(null);
                      navigate("/fishing-log/batch");
                    }}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </button>
                </div>
              )}

              {globalCatchHaulId && (
                <div className="space-y-3">
                  <form
                    className="flex flex-col gap-2 mt-4"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setGlobalCatchLoading(true);
                      setGlobalCatchError(null);

                      if (!globalCatchForm.capture_zone) {
                        setGlobalCatchError("Capture zone is required");
                        setGlobalCatchLoading(false);
                        return;
                      }

                      try {
                        let imageUrl = globalCatchForm.image_url || "";
                        if (myPhoto) {
                          // Convert base64 to File object
                          const base64Response = await fetch(myPhoto);
                          const blob = await base64Response.blob();
                          const file = new File([blob], "fish-photo.jpg", {
                            type: "image/jpeg",
                          });

                          // Create FormData and append file
                          const formData = new FormData();
                          formData.append("file", file);
                          formData.append("folderName", "fishes");

                          const response = await fetch(
                            `${APP_CONFIG.API_URL}${API_ENDPOINTS.FILE_UPLOAD}`,
                            {
                              method: "POST",
                              body: formData,
                            }
                          );

                          if (!response.ok) {
                            throw new Error("Failed to upload file");
                          }

                          const { fileUrl } = await response.json();
                          imageUrl = fileUrl;
                        }

                        if (!imageUrl && catchImage) {
                          // Upload to Supabase Storage
                          const fileExt = catchImage.name.split(".").pop();
                          const fileName = `${Date.now()}_${Math.random()
                            .toString(36)
                            .substr(2, 9)}.${fileExt}`;
                          const { data, error: uploadError } =
                            await supabase.storage
                              .from("catch-images")
                              .upload(fileName, catchImage, { upsert: true });
                          if (uploadError) throw uploadError;
                          imageUrl = data?.path
                            ? supabase.storage
                                .from("catch-images")
                                .getPublicUrl(data.path).data.publicUrl
                            : "";
                        }
                        // Get haul info for QR code
                        const haul = globalCatchHauls.find(
                          (h) => h.id === globalCatchHaulId
                        );
                        const trip = trips.find(
                          (t) => t.id === globalCatchTripId
                        );
                        const tripCode = haul?.qr_code?.slice(3) || "";
                        const qr = `${
                          globalCatchForm["three_a_code"]
                        }${tripCode}${String(haul?.haul_number).padStart(
                          2,
                          "0"
                        )}${globalCatchForm.capture_date.replace(/-/g, "")}`;
                        const { error } = await supabase
                          .from("catch_records")
                          .insert({
                            ...globalCatchForm,
                            farmer_id: user?.auth_id || "",
                            image_url: imageUrl,
                            qr_code: qr,
                            haul_id: globalCatchHaulId,
                          });
                        if (error) throw error;
                        setCreatedGlobalCatch({
                          ...globalCatchForm,
                          qr_code: qr,
                          capture_zone:
                            typeof globalCatchForm?.capture_zone === "string"
                              ? globalCatchForm.capture_zone
                              : JSON.stringify(
                                  globalCatchForm?.capture_zone || ""
                                ),
                        });
                        setGlobalCatchForm(null);
                        setCatchImage(null);
                        setCatchImageUrl(null);
                        setIsSaveFish(false);
                      } catch (e: Error | unknown) {
                        const error =
                          e instanceof Error ? e.message : String(e);
                        setGlobalCatchError(error);
                        console.log("catch error", e);
                      } finally {
                        setGlobalCatchLoading(false);
                      }
                    }}
                  >
                    <div>
                      <Label>Fish Name</Label>
                      <Input
                        name="fish_name"
                        className="bg-white !border-solid !border-gray-500 mt-2"
                        value={globalCatchForm?.fish_name || ""}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                    <div>
                      <Label>Fish species</Label>
                      <Input
                        name="fish_specie"
                        className="bg-white !border-solid !border-gray-500 mt-2"
                        value={globalCatchForm?.fish_specie || ""}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                    <div>
                      <Label>Species (3-a code)</Label>
                      <Input
                        name="three_a_code"
                        className="bg-white !border-solid !border-gray-500 mt-2"
                        value={globalCatchForm?.three_a_code || ""}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                    <div>
                      <Label>Quantity (kg)</Label>
                      <Input
                        name="quantity"
                        className="bg-white !border-solid !border-gray-500 mt-2"
                        type="number"
                        value={globalCatchForm?.quantity || ""}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                    {/* Tank Selection */}
                    <div className="col-span-2 flex flex-col py-5">
                      <Label>Tank: {globalCatchForm?.tank || "1"}</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="mt-2 space-y-4">
                              <Slider
                                defaultValue={[
                                  parseInt(globalCatchForm?.tank || "1"),
                                ]}
                                max={12}
                                min={1}
                                step={1}
                                onValueChange={(value) => {
                                  setGlobalCatchForm((prev) => {
                                    if (!prev) return null;
                                    return {
                                      ...prev,
                                      tank: String(value[0]),
                                    };
                                  });
                                }}
                                className="w-full"
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Select tank number: {globalCatchForm?.tank || "1"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    {/* Case Size */}
                    <div>
                      <Label>Case Size (kg)</Label>
                      <Input
                        name="case_size"
                        type="text"
                        className="bg-white !border-solid !border-gray-500 mt-2"
                        value={globalCatchForm?.case_size || "15"}
                        onChange={handleFormChange}
                      />
                    </div>
                    {/* Net kg/case */}
                    <div>
                      <Label>Net kg/case</Label>
                      <Input
                        name="net_kg_per_case"
                        type="text"
                        className="bg-white !border-solid !border-gray-500 mt-2"
                        value={globalCatchForm?.net_kg_per_case || "12"}
                        onChange={handleFormChange}
                      />
                    </div>
                    {/* Capture Date */}
                    <div>
                      <Label>Capture Date</Label>
                      <Input
                        name="capture_date"
                        className="bg-white !border-solid !border-gray-500 mt-2"
                        type="date"
                        value={globalCatchForm?.capture_date || ""}
                        onChange={handleFormChange}
                        required
                      />
                    </div>

                    {/* Traditional Coastal Region (A-D) */}
                    <div>
                      <Label>Traditional Coastal Region</Label>
                      <div className="bg-gray-200 mt-2 p-3 rounded border">
                        {globalCatchForm?.latitude &&
                        globalCatchForm?.longitude ? (
                          (() => {
                            const lat = parseFloat(
                              globalCatchForm.latitude.toString()
                            );
                            const lng = parseFloat(
                              globalCatchForm.longitude.toString()
                            );
                            const coastalRegion = getTraditionalCoastalRegion(
                              lat,
                              lng
                            );
                            return (
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="font-semibold text-sm">
                                    Code:
                                  </span>
                                  <span className="text-sm font-mono bg-green-100 px-2 py-1 rounded">
                                    {coastalRegion.code}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="font-semibold text-sm">
                                    Name:
                                  </span>
                                  <span className="text-sm">
                                    {coastalRegion.name}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="font-semibold text-sm">
                                    Description:
                                  </span>
                                  <span className="text-sm text-gray-600">
                                    {coastalRegion.description}
                                  </span>
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="text-gray-500 text-sm">
                            No GPS coordinates available
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Capture Zone (Ngư Trường + EC30) */}
                    <div>
                      <Label>Ngư Trường & EC30 Zone</Label>
                      <div className="bg-gray-200 mt-2 p-3 rounded border">
                        {globalCatchForm?.latitude &&
                        globalCatchForm?.longitude ? (
                          (() => {
                            const lat = parseFloat(
                              globalCatchForm.latitude.toString()
                            );
                            const lng = parseFloat(
                              globalCatchForm.longitude.toString()
                            );
                            const ec30Zone = calculateEC30Zone(lat, lng);

                            return (
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="font-semibold text-sm">
                                    Ngư Trường:
                                  </span>
                                  <span className="text-sm">
                                    {ec30Zone.ngutruong}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="font-semibold text-sm">
                                    EC30 Code:
                                  </span>
                                  <span className="text-sm font-mono bg-blue-100 px-2 py-1 rounded">
                                    {ec30Zone.ec30Code}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="font-semibold text-sm">
                                    Region:
                                  </span>
                                  <span className="text-sm">
                                    {ec30Zone.region}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="font-semibold text-sm">
                                    Area:
                                  </span>
                                  <span className="text-sm">
                                    {ec30Zone.area_km2.toLocaleString()} km²
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="font-semibold text-sm">
                                    Coordinates:
                                  </span>
                                  <span className="text-sm font-mono">
                                    {ec30Zone.coordinates.lat.toFixed(4)},{" "}
                                    {ec30Zone.coordinates.lng.toFixed(4)}
                                  </span>
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="text-gray-500 text-sm">
                            No GPS coordinates available
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label>Traditional Coastal Region</Label>
                      <select
                        name="region"
                        className="bg-gray-200 mt-2 w-full min-h-[40px] rounded"
                        value={
                          globalCatchForm?.latitude &&
                          globalCatchForm?.longitude
                            ? getTraditionalCoastalRegion(
                                parseFloat(globalCatchForm.latitude.toString()),
                                parseFloat(globalCatchForm.longitude.toString())
                              ).code
                            : globalCatchForm?.region || ""
                        }
                        onChange={(e) => {
                          e.preventDefault();
                          const selectedValue = e.target.value;
                          console.log(
                            "Selected coastal region:",
                            selectedValue
                          );

                          setGlobalCatchForm((prev) => {
                            if (!prev) return null;
                            return {
                              ...prev,
                              region: selectedValue,
                            };
                          });
                        }}
                      >
                        <option value="">
                          Select Traditional Coastal Region
                        </option>
                        <option value="A">A - Cà Mau – Kiên Giang</option>
                        <option value="B">B - Đà Nẵng – Thanh Hóa</option>
                        <option value="C">C - Hải Phòng – Vũng Tàu</option>
                        <option value="D">D - Hải Dương – Thái Bình</option>
                      </select>
                    </div>

                    <div>
                      <Label>Latitude</Label>
                      <Input
                        name="latitude"
                        className="bg-white !border-solid !border-gray-500 mt-2"
                        value={globalCatchForm?.latitude || ""}
                        onChange={handleFormChange}
                        disabled={true}
                      />
                    </div>

                    <div>
                      <Label>Longitude</Label>
                      <Input
                        name="longitude"
                        className="bg-white !border-solid !border-gray-500 mt-2"
                        value={globalCatchForm?.longitude || ""}
                        onChange={handleFormChange}
                        disabled={true}
                      />
                    </div>
                    <div>
                      <Label>Catching Location</Label>
                      <Input
                        name="catching_location"
                        className="bg-white !border-solid !border-gray-500 mt-2"
                        value={globalCatchForm?.catching_location || ""}
                        onChange={handleFormChange}
                        disabled={false}
                      />
                    </div>

                    {globalCatchError && (
                      <div className="text-red-500">{globalCatchError}</div>
                    )}

                    <div className="flex gap-3 flex-row">
                      <button
                        className="w-1/2 py-2 md:py-3  px-2 md:px-4 border-2 border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                        onClick={reScan}
                      >
                        <Camera className="w-4 h-4" />
                        Scan Again
                      </button>

                      {fishResult && !fishResult.error && (
                        <button
                          type="submit"
                          className="w-1/2 py-2 md:py-3  px-2 md:px-4  bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                          onClick={() => {
                            if (!globalCatchTripId) {
                              toast({
                                title: "Trip not selected",
                                description:
                                  "Please select a trip before saving fish.",
                                variant: "destructive",
                              });
                              return;
                            }

                            if (!globalCatchHaulId) {
                              toast({
                                title: "Haul not selected",
                                description:
                                  "Please select a haul before saving fish.",
                                variant: "destructive",
                              });
                              return;
                            }
                          }}
                        >
                          <Check className="w-4 h-4" />
                          {globalCatchLoading ? "Saving..." : "Save Record"}
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              )}

              {/* Error message */}
              {fishResult?.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">Identification Error</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">
                    {fishResult.error}
                  </p>
                </div>
              )}

              {/* Additional info */}
              <div className="text-center text-xs text-gray-500 border-t pt-4">
                <p>This identification is based on AI analysis.</p>
                <p>
                  For critical applications, please verify with marine biology
                  experts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
