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
import { motion } from "framer-motion";

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

interface VesselData {
  id: string;
  name: string;
  registration_number: string;
  type: string; // Changed from vessel_type to type to match database
  created_at: string;
  capacity?: number;
  captain_name?: string;
  captain_user_id?: string;
  company_id?: string;
  length?: number;
  fishery_permit?: string;
  expiration_date?: string;
  user_id?: string;
}

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

interface CatchRecord {
  id: string;
  haul_id: {
    id: string;
    haul_number: number;
    qr_code: string;
  };
  species: string;
  quantity: number;
  unit: string;
  quality: string;
  processing_method: string;
  catching_location: string;
  fish_name: string;
  fish_specie: string;
  fish_size: string;
  tank: string;
  case_size: string;
  net_kg_per_case: number;
  capture_date: string;
  capture_time: string;
  capture_zone: string;
  three_a_code: string;
  qr_code: string;
  farmer_id: string;
  image_url: string;
  latitude?: string | number;
  longitude?: string | number;
}

function DeclarationContainer() {
  const { t } = useTranslation();
  const [trips, setTrips] = useState<TripData[]>([]);
  const [vessels, setVessels] = useState<VesselData[]>([]);
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
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [haulsByTripId, setHaulsByTripId] = useState<Record<string, any[]>>({});
  const [showHaulDialog, setShowHaulDialog] = useState(false);

  // New state for vessel and trip selection
  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [catchRecords, setCatchRecords] = useState<CatchRecord[]>([]);
  const [catchLoading, setCatchLoading] = useState(false);
  const [catchError, setCatchError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auto-select latest vessel and trip on load
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

  // Fetch catch records when trip is selected
  useEffect(() => {
    if (selectedTripId) {
      fetchCatchRecordsForTrip(selectedTripId);
    }
  }, [selectedTripId]);

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
      let accessibleVessels: Record<string, unknown>[] = [];
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

  async function fetchPorts() {
    try {
      const { data: portsData, error } = await supabase
        .from("seaports")
        .select("*");
      if (error) throw error;
      setPorts(portsData || []);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function fetchTrips(searchTerm = search, vesselId?: string) {
    try {
      setLoading(true);

      // Get user's auth ID
      const userId = user?.auth_id;
      if (!userId) {
        console.error("User not authenticated");
        return;
      }

      // If a specific vessel ID is provided, only fetch trips for that vessel
      if (vesselId) {
        let query = supabase
          .from("fishing_trips")
          .select(
            `
            *,
            vessels (
              id,
              name,
              registration_number
            )
          `
          )
          .eq("vessel_id", vesselId)
          .order("created_at", { ascending: false });

        if (searchTerm) {
          query = query.or(
            `trip_code.ilike.%${searchTerm}%,departure_port.ilike.%${searchTerm}%`
          );
        }

        const { data: tripsData, error } = await query;
        if (error) throw error;
        setTrips(tripsData || []);
        setTotal(tripsData?.length || 0);
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
          vessels (
            id,
            name,
            registration_number
          )
        `
        )
        .in("vessel_id", allVesselIds)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(
          `trip_code.ilike.%${searchTerm}%,departure_port.ilike.%${searchTerm}%`
        );
      }

      const { data: tripsData, error } = await query;
      if (error) throw error;
      setTrips(tripsData || []);
      setTotal(tripsData?.length || 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function fetchCatchRecordsForTrip(tripId: string) {
    try {
      setCatchLoading(true);
      setCatchError(null);

      // First get all hauls for this trip
      const { data: hauls, error: haulsError } = await supabase
        .from("fishing_hauls")
        .select("id")
        .eq("trip_id", tripId);

      if (haulsError) throw haulsError;

      if (!hauls || hauls.length === 0) {
        setCatchRecords([]);
        return;
      }

      const haulIds = hauls.map((h) => h.id);

      // Then get all catch records for these hauls
      const { data: catchRecordsData, error: catchError } = await supabase
        .from("catch_records")
        .select(
          `
          *,
          haul_id (
            id,
            haul_number,
            qr_code
          )
        `
        )
        .in("haul_id", haulIds)
        .order("created_at", { ascending: false });

      if (catchError) throw catchError;
      setCatchRecords(catchRecordsData || []);
    } catch (e: any) {
      setCatchError(e.message);
    } finally {
      setCatchLoading(false);
    }
  }

  const { user, isAuthenticated } = useAuthStore();
  const userId = user?.auth_id;

  useEffect(() => {
    fetchVessels();
    fetchPorts();
  }, []);

  useEffect(() => {
    if (vessels.length > 0 && selectedVesselId) {
      fetchTrips(search, selectedVesselId);
    }
  }, [vessels, selectedVesselId, search]);

  useEffect(() => {
    fetchTrips();
    // eslint-disable-next-line
  }, [page, perPage]);

  useEffect(() => {
    if (successDialog) setDialogOpen(false);
  }, [successDialog]);

  // Remove all the problematic functions and keep only the UI

  return (
    <div className="flex flex-col gap-4 px-3 py-4 md:gap-6 md:py-6">
      {/* Vessel Selection Cards */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">
          Select Vessel
        </h3>
        {loading ? (
          <div className="flex gap-2 md:gap-4 overflow-x-auto">
            {[...Array(3)].map((_, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex-none w-[200px] md:w-[240px] lg:w-[280px] p-2 md:p-3 lg:p-4 rounded-lg border-2 border-gray-200 bg-gray-100 animate-pulse"
              >
                <div className="h-4 bg-gray-300 rounded mb-2"></div>
                <div className="h-3 bg-gray-300 rounded mb-1"></div>
                <div className="h-3 bg-gray-300 rounded"></div>
              </motion.div>
            ))}
          </div>
        ) : vessels.length === 0 ? (
          <div className="flex gap-2 md:gap-4 overflow-x-auto">
            {[...Array(2)].map((_, index) => (
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
                      Vessel:
                    </span>
                    <span className="text-xs md:text-sm text-gray-400 truncate ml-1">
                      No vessel
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs md:text-sm font-medium text-gray-400">
                      Reg #:
                    </span>
                    <span className="text-xs md:text-sm text-gray-400 break-all truncate ml-1">
                      N/A
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs md:text-sm font-medium text-gray-400">
                      Type:
                    </span>
                    <span className="text-xs md:text-sm text-gray-400 truncate ml-1">
                      N/A
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex gap-2 md:gap-4 overflow-x-auto">
            {vessels.map((vessel, index) => (
              <motion.div
                key={vessel.id}
                data-vessel-id={vessel.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`flex-none w-[200px] md:w-[240px] lg:w-[280px] p-2 md:p-3 lg:p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  selectedVesselId === vessel.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
                onClick={() => {
                  setSelectedVesselId(vessel.id);
                  setSelectedTripId(null); // Clear trip when vessel changes
                }}
              >
                <div className="flex flex-col gap-1 md:gap-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs md:text-sm font-medium text-gray-600">
                      Vessel:
                    </span>
                    <span className="text-xs md:text-sm font-bold text-gray-800 truncate ml-1">
                      {vessel.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs md:text-sm font-medium text-gray-600">
                      Reg #:
                    </span>
                    <span className="text-xs md:text-sm text-gray-800 break-all truncate ml-1">
                      {vessel.registration_number}
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs md:text-sm font-medium text-gray-600">
                      Type:
                    </span>
                    <span className="text-xs md:text-sm text-gray-800 truncate ml-1">
                      {vessel.type}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center w-full h-32">
          <svg
            className="animate-spin h-8 w-8 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            ></path>
          </svg>
          <span className="ml-3 text-blue-700 font-semibold">
            Loading trips...
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Label>Select Trip</Label>
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
                    trips.map((t, index) => (
                      <motion.div
                        key={t.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className={`flex-none w-[200px] md:w-[240px] lg:w-[280px] p-2 md:p-3 lg:p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                          selectedTripId === t.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-blue-300"
                        }`}
                        onClick={async () => {
                          const tripId = t.id;
                          setSelectedTripId(tripId);
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
                              {vessels?.find((v) => v.id === t.vessel_id)
                                ?.registration_number || t.vessel_id}
                            </span>
                          </div>
                          <div className="flex justify-between items-start">
                            <span className="text-xs md:text-sm font-medium text-gray-600">
                              Date:
                            </span>
                            <span className="text-xs md:text-sm text-gray-800 truncate ml-1">
                              {new Date(t.created_at).toLocaleDateString()}
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
                    ))}
              </div>
            </div>
            {/* Fade effect for scroll indication */}
            <div className="absolute right-0 top-0 bottom-0 w-8 md:w-12 bg-gradient-to-l from-white to-transparent pointer-events-none" />
          </div>
        </div>
      )}

      {/* Catch Records Table */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">
          Catch Records
        </h3>
        {catchLoading ? (
          <div className="overflow-x-auto">
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-bold px-2 py-1.5 w-20 sticky left-0 z-10 bg-gray-100">
                    Haul #
                  </TableHead>
                  <TableHead className="font-bold px-2 py-1.5 w-32">
                    Location
                  </TableHead>
                  <TableHead className="font-bold px-2 py-1.5 w-24">
                    Zone
                  </TableHead>
                  <TableHead className="font-bold px-2 py-1.5 w-32">
                    Capture Time
                  </TableHead>
                  <TableHead className="font-bold px-2 py-1.5 w-24">
                    Fish Image
                  </TableHead>
                  <TableHead className="font-bold px-2 py-1.5 w-24">
                    Product ID
                  </TableHead>
                  <TableHead className="font-bold px-2 py-1.5 w-24">
                    Haul ID
                  </TableHead>
                  <TableHead className="font-bold px-2 py-1.5 w-20">
                    Quantity
                  </TableHead>
                  <TableHead className="font-bold px-2 py-1.5 w-20">
                    Tank
                  </TableHead>
                  <TableHead className="font-bold px-2 py-1.5 w-24">
                    Net kg/case
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, index) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="animate-pulse"
                  >
                    <TableCell className="px-2 py-1.5 sticky left-0 z-10 bg-white">
                      <div className="h-4 bg-gray-300 rounded"></div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="h-4 bg-gray-300 rounded"></div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="h-4 bg-gray-300 rounded"></div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="h-4 bg-gray-300 rounded"></div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="h-4 bg-gray-300 rounded"></div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="h-4 bg-gray-300 rounded"></div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="h-4 bg-gray-300 rounded"></div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="h-4 bg-gray-300 rounded"></div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="h-4 bg-gray-300 rounded"></div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="h-4 bg-gray-300 rounded"></div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : catchError ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-8 text-red-500"
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Pencil className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-red-600 mb-2">
              Error Loading Data
            </h3>
            <p className="text-sm text-red-500">{catchError}</p>
          </motion.div>
        ) : catchRecords.length === 0 ? (
          <div className="overflow-x-auto">
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-bold px-2 py-1.5 w-20 sticky left-0 z-10 bg-gray-100 border border-black">
                    Haul #
                  </TableHead>
                  <TableHead className="font-bold px-2 py-1.5 w-32 border border-black">
                    Location
                  </TableHead>
                  <TableHead className="font-bold px-2 py-1.5 w-24 border border-black">
                    Zone
                  </TableHead>
                  <TableHead className="font-bold px-2 py-1.5 w-32 border border-black">
                    Capture Time
                  </TableHead>
                  <TableHead className="font-bold px-2 py-1.5 w-24 border border-black">
                    Fish Image
                  </TableHead>
                  <TableHead className="font-bold px-2 py-1.5 w-24 border border-black">
                    Product ID
                  </TableHead>
                  <TableHead className="font-bold px-2 py-1.5 w-24 border border-black">
                    Haul ID
                  </TableHead>
                  <TableHead className="font-bold px-2 py-1.5 w-20 border border-black">
                    Quantity
                  </TableHead>
                  <TableHead className="font-bold px-2 py-1.5 w-20 border border-black">
                    Tank
                  </TableHead>
                  <TableHead className="font-bold px-2 py-1.5 w-24 border border-black">
                    Net kg/case
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, index) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="hover:bg-gray-50 border-b border-gray-200"
                  >
                    <TableCell className="px-2 py-1.5 sticky left-0 z-10 bg-white">
                      <div className="h-4 bg-gray-300 rounded"></div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="h-4 bg-gray-300 rounded"></div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="h-4 bg-gray-300 rounded"></div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="h-4 bg-gray-300 rounded"></div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="h-4 bg-gray-300 rounded"></div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="h-4 bg-gray-300 rounded"></div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="h-4 bg-gray-300 rounded"></div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="h-4 bg-gray-300 rounded"></div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="h-4 bg-gray-300 rounded"></div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="h-4 bg-gray-300 rounded"></div>
                    </TableCell>
                  </motion.tr>
                ))}
                {/* Summary row */}
                {catchRecords.length > 0 && (
                  <motion.tr
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.3,
                      delay: catchRecords.length * 0.05,
                    }}
                    className="font-bold bg-blue-100"
                  >
                    <TableCell
                      colSpan={7}
                      className="px-2 py-1.5 border border-black"
                    >
                      Total Catch Volume
                    </TableCell>
                    <TableCell className="px-2 py-1.5 border border-black">
                      {catchRecords.reduce(
                        (sum, rec) => sum + Number(rec.quantity || 0),
                        0
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 border border-black">
                      {
                        Array.from(new Set(catchRecords.map((rec) => rec.tank)))
                          .length
                      }
                    </TableCell>
                    <TableCell className="px-2 py-1.5 border border-black">
                      {catchRecords
                        .reduce(
                          (sum, rec) => sum + Number(rec.net_kg_per_case || 0),
                          0
                        )
                        .toFixed(2)}{" "}
                      kg
                    </TableCell>
                  </motion.tr>
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-bold px-2 py-1.5 w-20 sticky left-0 z-10 bg-gray-100 border border-black">
                    Haul #
                  </TableHead>
                  <TableHead className="font-bold px-2 py-1.5 w-32 border border-black">
                    Location
                  </TableHead>
                  <TableHead className="font-bold px-2 py-1.5 w-24 border border-black">
                    Zone
                  </TableHead>
                  <TableHead className="font-bold px-2 py-1.5 w-32 border border-black">
                    Capture Time
                  </TableHead>
                  <TableHead className="font-bold px-2 py-1.5 w-24 border border-black">
                    Fish Image
                  </TableHead>
                  <TableHead className="font-bold px-2 py-1.5 w-24 border border-black">
                    Product ID
                  </TableHead>
                  <TableHead className="font-bold px-2 py-1.5 w-24 border border-black">
                    Haul ID
                  </TableHead>
                  <TableHead className="font-bold px-2 py-1.5 w-20 border border-black">
                    Quantity
                  </TableHead>
                  <TableHead className="font-bold px-2 py-1.5 w-20 border border-black">
                    Tank
                  </TableHead>
                  <TableHead className="font-bold px-2 py-1.5 w-24 border border-black">
                    Net kg/case
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catchRecords.map((record, index) => (
                  <motion.tr
                    key={record.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="hover:bg-gray-50 border-b border-gray-200"
                  >
                    <TableCell className="text-xs truncate px-2 py-1.5 sticky left-0 z-10 bg-white border border-black">
                      {record.haul_id.haul_number}
                    </TableCell>
                    <TableCell className="text-xs truncate px-2 py-1.5 border border-black">
                      {record.catching_location}
                    </TableCell>
                    <TableCell className="text-xs truncate px-2 py-1.5 border border-black">
                      {record.capture_zone}
                    </TableCell>
                    <TableCell className="text-xs truncate px-2 py-1.5 border border-black">
                      {new Date(record.capture_time).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-xs truncate px-2 py-1.5 border border-black">
                      {record.image_url && (
                        <img
                          src={record.image_url}
                          alt="Catch"
                          className="max-h-16 rounded"
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-xs truncate px-2 py-1.5 border border-black">
                      <QRCode value={record.qr_code} size={40} />
                    </TableCell>
                    <TableCell className="text-xs truncate px-2 py-1.5 border border-black">
                      <QRCode value={record.haul_id.qr_code} size={40} />
                    </TableCell>
                    <TableCell className="text-xs truncate px-2 py-1.5 border border-black">
                      {record.quantity}
                    </TableCell>
                    <TableCell className="text-xs truncate px-2 py-1.5 border border-black">
                      {record.tank}
                    </TableCell>
                    <TableCell className="text-xs truncate px-2 py-1.5 border border-black">
                      {record.net_kg_per_case} {record.unit}
                    </TableCell>
                  </motion.tr>
                ))}
                {/* Summary row */}
                {catchRecords.length > 0 && (
                  <motion.tr
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.3,
                      delay: catchRecords.length * 0.05,
                    }}
                    className="font-bold bg-blue-100"
                  >
                    <TableCell
                      colSpan={7}
                      className="px-2 py-1.5 border border-black"
                    >
                      Total Catch Volume
                    </TableCell>
                    <TableCell className="px-2 py-1.5 border border-black">
                      {catchRecords.reduce(
                        (sum, rec) => sum + Number(rec.quantity || 0),
                        0
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 border border-black">
                      {
                        Array.from(new Set(catchRecords.map((rec) => rec.tank)))
                          .length
                      }
                    </TableCell>
                    <TableCell className="px-2 py-1.5 border border-black">
                      {catchRecords
                        .reduce(
                          (sum, rec) => sum + Number(rec.net_kg_per_case || 0),
                          0
                        )
                        .toFixed(2)}{" "}
                      kg
                    </TableCell>
                  </motion.tr>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DeclarationLog() {
  const { language } = useLanguageStore();
  const isMobile = useIsMobile();
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader
          title={language === "en" ? "Declaration Log" : "NHẬT KÝ KHAI BÁO"}
        />
        <TopButtons />

        <div className="px-3 flex gap-2 md:gap-3 lg:gap-4 overflow-x-auto">
          <Link to="/fishing-log/batch" className="flex-shrink-0">
            <button
              className={`
                 bg-gradient-to-r from-[#a8a8a8] to-[#fdfdfd] text-black rounded-md px-4 md:px-5
                h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                text-xs md:text-base
                w-32 md:w-36 lg:w-40 shadow-lg hover:shadow-xl transition-all duration-300
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
                bg-gradient-to-r from-black to-[#1306ad] text-[#f8f603] rounded-md px-4 md:px-5
                h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                text-xs md:text-base
                w-32 md:w-36 lg:w-40
              `}
            >
              <span className="truncate">
                {language === "en" ? "Declaration Log" : "Nhật Ký Khai Báo"}
              </span>
            </button>
          </Link>
        </div>
        <DeclarationContainer />
      </SidebarInset>
    </SidebarProvider>
  );
}
