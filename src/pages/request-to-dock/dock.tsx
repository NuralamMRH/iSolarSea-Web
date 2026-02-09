import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import TopButtons from "@/components/top-buttons";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguageStore } from "@/stores/language-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { pdf } from "@react-pdf/renderer";
import { useTranslation } from "@/hooks/use-translation";
import { useAuthStore } from "@/stores/auth-store";

import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { DockPDF } from "@/components/dashboard/DockPDF";

// Types for vessel transactions
type VesselTransaction =
  Database["public"]["Tables"]["vessel_transactions"]["Row"];

interface VesselData {
  id: string;
  name: string;
  fileUrl: string;
  type: "mining" | "logistics";
  type_of_vessel: string;
  registration_number: string;
  captain_name: string | null;
  owner_name: string | null;
  owner_id?: string;
  capacity: number | null;
  length: number | null;
  width: number | null;
  engine_power: string | null;
  materials: string | null;
  crew_count: number | null;
  number_engines: string | null;
  fishing_method: string | null;
  fishery_permit: string | null;
  expiration_date: string | null;
  fishing_gear: {
    purse_seine: boolean;
    hook: boolean;
    net: boolean;
    trawl: boolean;
  };
  created_at: string;
  owner_id_card?: string;
  residential_address?: string;
  draught?: string;
  hull_material?: string;
  number_of_engines?: string;
  engine_model?: string;
  engine_serial_number?: string;
  port_of_registry?: string;
  vessel_type_from_doc?: string;
  gross_tonnage?: string;
  port_registry?: string;
  type_of_machine?: string;
  status?: "active" | "maintenance" | "docked" | "at-sea";
  last_location?: { lat: number; lng: number };
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
}

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
  fishing_logbook: "",
  trading_logbook: "",
  transshipment_logbook: "",
};
function getDaysBetween(start: string, end: string) {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.max(0, Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24)));
}

function formatDateDDMMYY(dateString: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}${month}${year}`;
}

function formatDateWithMonthName(dateString: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = date.getDate();
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const monthName = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${monthName} ${year}`;
}

function generateDockingId(tripCode: string) {
  const currentDate = new Date();
  const formattedDate = formatDateDDMMYY(currentDate.toISOString());
  return `${tripCode}${formattedDate}`;
}
function DockContainer() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [trips, setTrips] = useState<
    Database["public"]["Tables"]["fishing_trips"]["Row"][]
  >([]);
  const [vessels, setVessels] = useState<VesselData[]>([]);
  const [ports, setPorts] = useState<
    Database["public"]["Tables"]["seaports"]["Row"][]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [successDialog, setSuccessDialog] = useState(false);
  const [submitted, setSubmitted] = useState<Record<string, string> | null>(
    null
  );
  const [dockQrUrl, setDockQrUrl] = useState<string | undefined>();
  const [tripQrUrl, setTripQrUrl] = useState<string | undefined>();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [dockingTrips, setDockingTrips] = useState<
    Database["public"]["Tables"]["fishing_trips"]["Row"][]
  >([]);

  const [catchRecords, setCatchRecords] = useState<CatchRecord[]>([]);
  const [catchLoading, setCatchLoading] = useState(false);
  const [catchError, setCatchError] = useState<string | null>(null);
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Transaction-related state variables
  const [transactions, setTransactions] = useState<VesselTransaction[]>([]);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [transactionError, setTransactionError] = useState<string | null>(null);

  // Helper: get vessel info by id
  const vesselMap = Object.fromEntries(vessels.map((v) => [v.id, v]));

  useEffect(() => {
    fetchVessels();
    fetchPorts();
  }, []);

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
  }, [selectedTripId]);

  useEffect(() => {
    fetchTrips();
    // eslint-disable-next-line
  }, [page, perPage]);

  useEffect(() => {
    if (successDialog) {
      // Handle success dialog close
    }
  }, [successDialog]);

  // Fetch docking trips for the history table
  useEffect(() => {
    fetchDockingTrips().then(setDockingTrips);
  }, []);

  // Auto-select the latest trip with Catching status, or latest trip if no Catching status found
  useEffect(() => {
    if (trips.length > 0) {
      const latestCatchingTrip = trips.find(
        (trip) => trip.status === "Catching"
      );
      if (latestCatchingTrip) {
        setSelectedTripId(latestCatchingTrip.id);
        handleTripSelect(latestCatchingTrip);
      } else {
        // If no Catching status trip found, select the latest trip
        setSelectedTripId(trips[0].id);
        handleTripSelect(trips[0]);
      }
    }
  }, [trips]);

  // Fetch transactions when trip is selected
  useEffect(() => {
    if (!selectedTripId) return;
    fetchTransactionsForTrip(selectedTripId);
  }, [selectedTripId]);

  const fetchVessels = async () => {
    try {
      setLoading(true);

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

      const vesselsWithStatus: VesselData[] = uniqueVessels.map((vessel) => {
        const v = vessel as { [key: string]: unknown };

        interface FishingGear {
          purse_seine: boolean;
          hook: boolean;
          net: boolean;
          trawl: boolean;
        }

        const defaultFishingGear: FishingGear = {
          purse_seine: false,
          hook: false,
          net: false,
          trawl: false,
        };

        return {
          id: String(v.id),
          name: String(v.name),
          type: v.type as "mining" | "logistics",
          type_of_vessel: String(v.type_of_vessel || ""),
          registration_number: String(v.registration_number),
          captain_name: v.captain_name ? String(v.captain_name) : null,
          owner_name: v.owner_name ? String(v.owner_name) : null,
          capacity:
            v.capacity !== undefined && v.capacity !== null
              ? Number(v.capacity)
              : null,
          length:
            v.length !== undefined && v.length !== null
              ? Number(v.length)
              : null,
          width:
            v.width !== undefined && v.width !== null ? Number(v.width) : null,
          engine_power: v.engine_power ? String(v.engine_power) : null,
          materials: v.materials ? String(v.materials) : null,
          crew_count:
            v.crew_count !== undefined && v.crew_count !== null
              ? Number(v.crew_count)
              : null,
          fishing_method: v.fishing_method ? String(v.fishing_method) : null,
          created_at: String(v.created_at),
          status: ["active", "maintenance", "docked", "at-sea"][
            Math.floor(Math.random() * 4)
          ] as "active" | "maintenance" | "docked" | "at-sea",
          last_location: {
            lat: 10.8231 + Math.random() * 0.5,
            lng: 106.6297 + Math.random() * 0.5,
          },
          fileUrl: String(v.fileUrl || ""),
          owner_id: v.owner_id ? String(v.owner_id) : undefined,
          owner_id_card: v.owner_id_card ? String(v.owner_id_card) : undefined,
          residential_address: v.residential_address
            ? String(v.residential_address)
            : undefined,
          draught: v.draught ? String(v.draught) : undefined,
          hull_material: v.hull_material ? String(v.hull_material) : undefined,
          number_engines: v.number_engines
            ? String(v.number_engines)
            : undefined,
          number_of_engines: v.number_of_engines
            ? String(v.number_of_engines)
            : undefined,
          engine_model: v.engine_model ? String(v.engine_model) : undefined,
          type_of_machine: v.type_of_machine
            ? String(v.type_of_machine)
            : undefined,
          engine_serial_number: v.engine_serial_number
            ? String(v.engine_serial_number)
            : undefined,
          port_of_registry: v.port_of_registry
            ? String(v.port_of_registry)
            : undefined,
          vessel_type_from_doc: v.vessel_type_from_doc
            ? String(v.vessel_type_from_doc)
            : undefined,
          gross_tonnage: v.gross_tonnage ? String(v.gross_tonnage) : undefined,
          port_registry: v.port_registry ? String(v.port_registry) : undefined,
          fishery_permit: v.fishery_permit ? String(v.fishery_permit) : null,
          expiration_date: v.expiration_date ? String(v.expiration_date) : null,
          fishing_gear: (v.fishing_gear as FishingGear) || defaultFishingGear,
        };
      });

      setVessels(vesselsWithStatus);
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: "Error fetching vessels",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  async function fetchPorts() {
    const { data } = await supabase.from("seaports").select("*");
    setPorts(data || []);
  }

  function handleTripSelect(
    trip: Database["public"]["Tables"]["fishing_trips"]["Row"]
  ) {
    const vessel = vessels.find((v) => v.id === trip.vessel_id);
    setForm({
      total_trip_period: form.total_trip_period,
      vessel_id: trip.vessel_id,
      owner: vessel?.captain_name || "",
      address: vessel?.registration_number || "",
      vessel_type: vessel?.type || "",
      crew_count: vessel?.capacity ? String(vessel.capacity) : "",
      departure_port: trip.departure_port || "",
      departure_province: trip.departure_province || "",
      to_region: trip.to_region || "",
      place_of_departure: trip.place_of_departure || "",
      departure_date: trip.departure_date
        ? trip.departure_date.slice(0, 10)
        : "",
      trip_period: trip.trip_period || "",
      status: "Docking", // Always set to Docking for dock form
      number_of_crew: vessel?.capacity || 0,
      vessel_registration_number: vessel?.registration_number || "",
      dock_province: trip.dock_province || "",
      place_of_dock: trip.place_of_dock || "",
      docking_date: trip.docking_date || "",
      fishing_logbook: trip.fishing_logbook || "",
      trading_logbook: trip.trading_logbook || "",
      transshipment_logbook: trip.transshipment_logbook || "",
    });
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

      // Query 1: Fetch trips where user_id matches (user-based trips)
      let userTripsQuery = supabase
        .from("fishing_trips")
        .select(
          `
          *,
          vessels (
            id,
            name,
            registration_number
          )
        `,
          { count: "exact" }
        )
        .eq("user_id", userId);

      // Query 2: Fetch trips where vessel_id matches user's vessels (vessel-based trips)
      let vesselTripsQuery = supabase.from("fishing_trips").select(
        `
          *,
          vessels (
            id,
            name,
            registration_number
          )
        `,
        { count: "exact" }
      );

      // Only add vessel filtering if user has vessels
      if (allVesselIds.length > 0) {
        vesselTripsQuery = vesselTripsQuery.in("vessel_id", allVesselIds);
      } else {
        // If no vessels, skip vessel-based query
        vesselTripsQuery = null;
      }

      // Add search filter if provided
      if (searchTerm) {
        userTripsQuery = userTripsQuery.or(
          `trip_code.ilike.%${searchTerm}%,departure_port.ilike.%${searchTerm}%`
        );
        if (vesselTripsQuery) {
          vesselTripsQuery = vesselTripsQuery.or(
            `trip_code.ilike.%${searchTerm}%,departure_port.ilike.%${searchTerm}%`
          );
        }
      }

      // Execute queries
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;

      const userTripsResult = await userTripsQuery
        .order("created_at", { ascending: false })
        .range(from, to);

      if (userTripsResult.error) throw userTripsResult.error;

      let vesselTripsResult = null;
      if (vesselTripsQuery) {
        vesselTripsResult = await vesselTripsQuery
          .order("created_at", { ascending: false })
          .range(from, to);

        if (vesselTripsResult.error) throw vesselTripsResult.error;
      }

      // Combine and deduplicate trips
      const userTrips = userTripsResult.data || [];
      const vesselTrips = vesselTripsResult?.data || [];

      // Create a map to deduplicate by trip ID
      const tripsMap = new Map();

      // Add user trips first
      userTrips.forEach((trip) => {
        tripsMap.set(trip.id, trip);
      });

      // Add vessel trips (will overwrite duplicates with same ID)
      vesselTrips.forEach((trip) => {
        tripsMap.set(trip.id, trip);
      });

      // Convert map back to array and sort by created_at
      const combinedTrips = Array.from(tripsMap.values()).sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTrips(combinedTrips);
      setTotal(combinedTrips.length);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function fetchDockingTrips() {
    try {
      // Get user's auth ID
      const userId = user?.auth_id;
      if (!userId) {
        console.error("User not authenticated");
        return [];
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

      if (allVesselIds.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from("fishing_trips")
        .select(
          `
          *,
          vessels!inner (
            id,
            name,
            registration_number
          )
        `
        )
        .in("vessel_id", allVesselIds)
        .eq("status", "Docking") // Only show Docking status trips
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (e: unknown) {
      console.error("Error fetching docking trips:", e);
      return [];
    }
  }

  async function handleAddOrEdit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (selectedTripId) {
        // Get the selected trip to generate docking_id
        const selectedTrip = trips.find((trip) => trip.id === selectedTripId);
        const dockingId = selectedTrip
          ? generateDockingId(selectedTrip.trip_code)
          : "";

        // Update the selected trip with dock information and change status to Docking
        await supabase
          .from("fishing_trips")
          .update({
            dock_province: form.dock_province,
            place_of_dock: form.place_of_dock,
            docking_date: form.docking_date
              ? new Date(form.docking_date).toISOString()
              : null,
            total_trip_period: getDaysBetween(
              form.departure_date,
              form.docking_date || ""
            ),
            status: "Docking", // Always set to Docking
            fishing_logbook: form.fishing_logbook,
            trading_logbook: form.trading_logbook,
            transshipment_logbook: form.transshipment_logbook,
            docking_id: dockingId,
          })
          .eq("id", selectedTripId);

        // Refresh trips list
        fetchTrips();

        // Set submitted data for success dialog
        const currentTrip = trips.find((trip) => trip.id === selectedTripId);
        const vessel = vessels.find((v) => v.id === currentTrip?.vessel_id);

        setSubmitted({
          vessel_id: vessel?.registration_number || "",
          owner: currentTrip?.owner_name || vessel?.owner_name || "",
          address: currentTrip?.address || vessel?.registration_number || "",
          crew_count:
            currentTrip?.number_of_crew || vessel?.crew_count
              ? String(vessel.crew_count)
              : "",
          vessel_type: currentTrip?.vessel_type || vessel?.type || "",
          departure_port: currentTrip?.departure_port || "",
          departure_province: currentTrip?.departure_province || "",
          to_region: currentTrip?.to_region || "",
          place_of_departure: currentTrip?.place_of_departure || "",
          departure_date: currentTrip?.departure_date?.slice(0, 10) || "",
          trip_period: currentTrip?.trip_period || "",
          status: "Docking",
          trip_code: currentTrip?.trip_code || "",
          dock_province: form.dock_province,
          place_of_dock: form.place_of_dock,
          docking_date: form.docking_date,
          total_trip_period: getDaysBetween(
            currentTrip?.departure_date || "",
            form.docking_date || ""
          ).toString(),
          docking_id: dockingId,
          fishing_logbook: form.fishing_logbook,
          trading_logbook: form.trading_logbook,
          transshipment_logbook: form.transshipment_logbook,
          // Additional vessel information
          vessel_name: vessel?.name || "",
          vessel_length: vessel?.length ? String(vessel.length) : "",
          vessel_width: vessel?.width ? String(vessel.width) : "",
          vessel_draught: vessel?.draught ? String(vessel.draught) : "",
          vessel_materials: vessel?.materials || "",
          vessel_engine_power: vessel?.engine_power
            ? String(vessel.engine_power)
            : "",
          vessel_number_engines: vessel?.number_engines
            ? String(vessel.number_engines)
            : "",
          vessel_type_of_machine: vessel?.type_of_machine || "",
          vessel_port_registry: vessel?.port_registry || "",
          vessel_fishery_permit: vessel?.fishery_permit || "",
          vessel_expiration_date: vessel?.expiration_date || "",
          vessel_owner_name: vessel?.owner_name || "",
          vessel_owner_id: vessel?.owner_id || "",
          vessel_residential_address: vessel?.residential_address || "",
          vessel_gross_tonnage: vessel?.gross_tonnage
            ? String(vessel.gross_tonnage)
            : "",
          vessel_number_of_engines: vessel?.number_of_engines
            ? String(vessel.number_of_engines)
            : "",
          vessel_engine_model: vessel?.engine_model || "",
          vessel_engine_serial_number: vessel?.engine_serial_number || "",
          vessel_port_of_registry: vessel?.port_of_registry || "",
          vessel_vessel_type_from_doc: vessel?.vessel_type_from_doc || "",
          vessel_owner_id_card: vessel?.owner_id_card || "",
          vessel_hull_material: vessel?.hull_material || "",
        });

        fetchCatchRecordsForTrip(selectedTripId || "");

        setSelectedTripId(selectedTripId || "");

        toast({
          title: "Success",
          description: "Trip status updated to Docking successfully",
        });

        // Show success dialog
        setSuccessDialog(true);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const handleDownloadPDF = async () => {
    const blob = await pdf(
      <DockPDF
        isDocking={submitted?.status === "Docking"}
        loading={loading}
        orderLoading={orderLoading}
        transactionLoading={transactionLoading}
        trips={trips}
        selectedTripId={selectedTripId}
        catchRecords={catchRecords}
        transactions={transactions}
        orders={orders}
        catchError={catchError}
        orderError={orderError}
        transactionError={transactionError}
        vesselMap={vesselMap}
        data={{
          ...submitted,
          owner_name: submitted.vessel_owner_name || "",
          address: submitted.address || "",
          form_qr_url: dockQrUrl || submitted.form_code || "",
          trip_qr_url: tripQrUrl || submitted.trip_code || "",
          form_code: submitted.form_code || "",
          trip_code: submitted.trip_code || "",
          dock_province: submitted.dock_province || "",
          place_of_dock: submitted.place_of_dock || "",
          docking_date: submitted.docking_date || "",
          vessel_id: submitted.vessel_id || "",
          vessel: submitted?.vessel_id || "",
          number_of_crew: submitted.number_of_crew || "",
          vessel_type: submitted.vessel_type || "",
          departure_province: submitted.departure_province || "",
          place_of_departure: submitted.place_of_departure || "",
          departure_port: submitted.departure_port || "",
          departure_port_name: submitted.departure_port_name || "",
          to_region: submitted.to_region || "",
          departure_date: submitted.departure_date || "",
          trip_period: submitted.trip_period || "",
          status: submitted.status || "",
          total_trip_period: Number(submitted.total_trip_period || 0),
          crew_count: submitted.crew_count || "",
        }}
      />
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dock_${submitted?.trip_code || "form"}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  async function fetchCatchRecordsForTrip(tripId: string) {
    console.log("fetchCatchRecordsForTrip ", tripId);
    setCatchLoading(true);
    setCatchError(null);
    try {
      // First get all hauls for this trip
      const { data: haulsData, error: haulsError } = await supabase
        .from("fishing_hauls")
        .select("id")
        .eq("trip_id", tripId);

      if (haulsError) throw haulsError;

      if (!haulsData || haulsData.length === 0) {
        setCatchRecords([]);
        return;
      }

      // Get catch records for these hauls
      const haulIds = haulsData.map((haul) => haul.id);
      const { data, error } = await supabase
        .from("catch_records")
        .select(
          `
          *,
          haul_id (
            id,
            haul_number,
            qr_code,
            trip_id
          )
        `
        )
        .in("haul_id", haulIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      console.log("setCatchRecords ", data);

      setCatchRecords(data || []);
    } catch (e: unknown) {
      setCatchError(e instanceof Error ? e.message : String(e));
    } finally {
      setCatchLoading(false);
    }
  }

  // Fetch transactions for the selected trip
  async function fetchTransactionsForTrip(tripId: string) {
    setTransactionLoading(true);
    setTransactionError(null);
    try {
      const { data, error } = await supabase
        .from("vessel_transactions")
        .select(
          `
          *,
          seller_vessel:vessels!vessel_transactions_seller_vessel_id_fkey (
            id,
            name,
            registration_number
          ),
          buyer_vessel:vessels!vessel_transactions_buyer_vessel_id_fkey (
            id,
            name,
            registration_number
          )
        `
        )
        .eq("trip_id", tripId)
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (e: unknown) {
      setTransactionError(e instanceof Error ? e.message : String(e));
    } finally {
      setTransactionLoading(false);
    }
  }

  const isMobile = useIsMobile();
  return (
    <div className="flex flex-col gap-4 px-3 py-4 md:gap-6">
      {/* Trip Selection Cards - Mobile Responsive */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Select Trip</h3>
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
                            ? "border-blue-500 bg-white"
                            : "border-gray-200 hover:border-blue-300"
                        }`}
                        onClick={() => {
                          setSelectedTripId(trip.id);
                          handleTripSelect(trip);
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
                              {trip.vessel ||
                                vessel?.registration_number ||
                                trip.vessel_id}
                            </span>
                          </div>
                          <div className="flex justify-between items-start">
                            <span className="text-xs md:text-sm font-medium text-gray-600">
                              Date:
                            </span>
                            <span className="text-xs md:text-sm text-gray-800 truncate ml-1">
                              {new Date(trip.created_at).toLocaleDateString()}
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

      {/* Dock Form - Only show if a trip is selected */}

      <Card>
        <CardContent>
          <form
            onSubmit={handleAddOrEdit}
            className=" md:p-6 grid grid-cols-2 gap-6"
          >
            <div className="col-span-2 pt-6 md:pt-0">
              <span className="text-sm font-bold">
                Thông tin tàu (Vessel info)
              </span>
            </div>
            {/* Read-only fields */}
            <div className="col-span-2 md:col-span-1">
              <Label className="text-sm truncate">
                {t("departure.registration_number_vessel_id")}
              </Label>
              <Input
                className="bg-gray-50 border-solid border-2 border-red-200"
                value={form.vessel_registration_number || form.vessel_id}
                readOnly
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <Label className="text-sm truncate">{t("departure.owner")}</Label>
              <Input
                className="bg-gray-50 border-solid border-2 border-red-200"
                value={form.owner}
                readOnly
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <Label>{t("departure.address")}</Label>
              <Input
                className="bg-gray-50 border-solid border-2 border-red-200"
                value={form.address}
                readOnly
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <Label className="text-sm truncate">
                {t("departure.number_of_crew_members_crews")}
              </Label>
              <Input
                className="bg-gray-50 border-solid border-2 border-red-200"
                value={form.crew_count}
                readOnly
              />
            </div>

            <div className="col-span-2 md:col-span-1">
              <Label>{t("departure.type_of_vessel")}</Label>
              <Input
                className="bg-gray-50 border-solid border-2 border-red-200"
                value={form.vessel_type?.toUpperCase()}
                readOnly
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <Label>{t("departure.departure_province_city")}</Label>
              <Input
                className="bg-gray-50 border-solid border-2 border-red-200"
                value={form.departure_province}
                readOnly
              />
            </div>
            <div className="col-span-2">
              <span className="text-sm font-bold">
                Thông tin xuất cảng (Depature info)
              </span>
            </div>
            <div className="col-span-2 md:col-span-1">
              <Label>{t("departure.place_of_departure")}</Label>
              <Input
                className="bg-gray-50 border-solid border-2 border-red-200"
                value={form.place_of_departure}
                readOnly
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <Label>{t("departure.to_region")}</Label>
              <Input
                className="bg-gray-50 border-solid border-2 border-red-200"
                value={form.to_region}
                readOnly
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <Label>{t("departure.departure_date")}</Label>
              <Input
                type="date"
                className="bg-gray-50 border-solid border-2 border-red-200"
                value={form.departure_date}
                readOnly
              />
            </div>

            {/* Editable dock fields */}
            <div className="col-span-2">
              <Button className="p-4 rounded mr-2" disabled>
                Edit
              </Button>
              <span className="text-sm font-bold">
                Thông tin cập cảng (Docking info)
              </span>
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-6 bg-blue-100 p-4 rounded">
              <div className="col-span-2 md:col-span-1">
                <Label>{t("departure.dock_province_city")} *</Label>
                <Input
                  required
                  className="bg-white"
                  value={form.dock_province}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      dock_province: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label>{t("departure.place_of_dock")} *</Label>
                <Input
                  required
                  className="bg-white"
                  value={form.place_of_dock}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      place_of_dock: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="col-span-2 md:col-span-1">
                <Label>{t("departure.docking_date")}</Label>
                <Input
                  type="date"
                  className="bg-white"
                  value={form.docking_date}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      docking_date: e.target.value,
                      total_trip_period: getDaysBetween(
                        f.departure_date,
                        e.target.value
                      ),
                    }))
                  }
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label>{t("departure.total_trip_period")}</Label>
                <Input
                  type="text"
                  className="bg-white"
                  value={`${form.total_trip_period} days`}
                />
              </div>
            </div>

            {/* Classified Vessel Section */}
            <div className="col-span-2">
              <span className="text-sm font-bold">
                Phân loại tàu (Classified Vessel)
              </span>
            </div>
            <div className="col-span-2 grid grid-cols-1 gap-6 bg-green-100 p-4 rounded">
              <div className="col-span-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-blue-800">
                      Sổ nhật ký khai thác:
                    </div>
                    <div className="text-sm italic text-blue-800">
                      Fishing Logbook
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    id="fishing_logbook"
                    checked={form.fishing_logbook === "Yes"}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        fishing_logbook: e.target.checked ? "Yes" : "No",
                      }))
                    }
                    className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                </div>
              </div>
              <div className="col-span-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-blue-800">
                      Sổ nhật ký thu mua:
                    </div>
                    <div className="text-sm italic text-blue-800">
                      Trading Logbook
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    id="trading_logbook"
                    checked={form.trading_logbook === "Yes"}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        trading_logbook: e.target.checked ? "Yes" : "No",
                      }))
                    }
                    className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                </div>
              </div>
              <div className="col-span-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-blue-800">
                      Sổ nhật ký chuyển tải:
                    </div>
                    <div className="text-sm italic text-blue-800">
                      Transshipment Logbook
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    id="transshipment_logbook"
                    checked={form.transshipment_logbook === "Yes"}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        transshipment_logbook: e.target.checked ? "Yes" : "No",
                      }))
                    }
                    className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>

            <div className="col-span-2 flex justify-end">
              <Button type="submit" disabled={loading} className="w-40">
                {loading ? "Updating..." : "Update to Docking"}
              </Button>
            </div>
            {error && <div className="col-span-2 text-red-500">{error}</div>}
          </form>
        </CardContent>
      </Card>

      {/* Success details dialog  */}
      <Dialog open={successDialog} onOpenChange={setSuccessDialog}>
        <DialogContent className="p-1 max-h-[95vh] max-w-[95vw] overflow-y-auto overflow-x-hidden   rounded-lg">
          <DialogHeader className="mt-8">
            <DialogTitle>
              <div className="font-semibold text-lg uppercase">
                {t("departure.socialist_republic_of_vietnam")}
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg p-2 md:p-6 bg-white position-relative">
            {!isMobile && (
              <>
                {!submitted?.docking_id && (
                  <div className="flex flex-col items-center justify-center absolute top-50 left-10">
                    <QRCode value={submitted?.docking_id || ""} size={50} />
                    <span className="text-xs">{submitted?.docking_id}</span>
                  </div>
                )}

                <div className="flex flex-col items-center justify-center absolute top-50 right-10"></div>
              </>
            )}
            <div className="text-center mb-4">
              <div className="font-bold text-base mb-1">BẢN KHAI CHUNG</div>
              <div className="text-xs mb-2">GENERAL DECLARATION</div>
              <div className="font-semibold text-sm mt-2">
                NGHỀ CHÍNH (Primary Method) :...............
              </div>
            </div>

            {/* Vessel Information Section */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">Họ và tên chủ tàu (Owner):</span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.vessel_owner_name || submitted?.owner || "-"}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">CCCD (Owner ID):</span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.vessel_owner_id || "-"}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">
                  Số đăng ký (Registration Number):
                </span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.vessel_id || "-"}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">Tên tàu (Vessel Name):</span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.vessel_name || "-"}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">
                  Nơi thường trú (Residential Address):
                </span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.vessel_residential_address || "-"}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">Kiểu tàu (Type of Vessel):</span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.vessel_type || "-"}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">
                  Tổng dung tích GT (Gross Tonnage):
                </span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.vessel_gross_tonnage || "-"}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">
                  Chiều dài Lmax, m (Length):
                </span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.vessel_length || "-"}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">
                  Chiều rộng Bmax, m (Width):
                </span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.vessel_width || "-"}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">
                  Chiều cao mạn D, m (Draught):
                </span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.vessel_draught || "-"}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">Vật liệu vỏ (Materials):</span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.vessel_materials || "-"}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">
                  Công suất KW (Engine Power):
                </span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.vessel_engine_power || "-"}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">
                  Số máy (Number of Engines):
                </span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.vessel_number_engines || "-"}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">
                  Ký hiệu máy (Type of Machine):
                </span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.vessel_type_of_machine || "-"}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">
                  Cảng đăng ký (Port of Registry):
                </span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.vessel_port_registry || "-"}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">
                  Giấy phép khai thác (Fishery Permit):
                </span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.vessel_fishery_permit || "-"}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">
                  Thời hạn (Expiration Date):
                </span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.vessel_expiration_date || "-"}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">
                  Họ và tên thuyền trưởng (Captain):
                </span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.crew_count || "-"}
                </div>
              </div>
            </div>

            {/* Fishing Method/Gear Section */}
            <div className="grid grid-cols-1 gap-2 mb-4">
              <div className="col-span-1">
                <span className="text-sm mb-2">
                  Kích thước chủ yếu của ngư cụ theo nghề chính (Primary fishing
                  gear size : )
                </span>
                <div className="space-y-4">
                  <div>
                    <Label>Fishing method/gear</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-[12px]">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="purse_seine"
                          className="h-8 w-8"
                          checked={Boolean(
                            vessels.find(
                              (v) =>
                                v.registration_number === submitted?.vessel_id
                            )?.fishing_gear?.purse_seine
                          )}
                          readOnly={true}
                        />
                        <Label htmlFor="purse_seine">Purse Seine</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="hook"
                          className="h-8 w-8"
                          checked={Boolean(
                            vessels.find(
                              (v) =>
                                v.registration_number === submitted?.vessel_id
                            )?.fishing_gear?.hook
                          )}
                          readOnly={true}
                        />
                        <Label htmlFor="hook">Hook</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="net"
                          className="h-8 w-8"
                          checked={Boolean(
                            vessels.find(
                              (v) =>
                                v.registration_number === submitted?.vessel_id
                            )?.fishing_gear?.net
                          )}
                          readOnly={true}
                        />
                        <Label htmlFor="net">Net</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="trawl"
                          className="h-8 w-8"
                          checked={Boolean(
                            vessels.find(
                              (v) =>
                                v.registration_number === submitted?.vessel_id
                            )?.fishing_gear?.trawl
                          )}
                          readOnly={true}
                        />
                        <Label htmlFor="trawl">Trawl</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Trip Information Section */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">{t("departure.address")}:</span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.address || "-"}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">
                  {t("departure.number_of_crew_members_crews")}:
                </span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.crew_count || "-"}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">
                  {t("departure.type_of_vessel")}:
                </span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.vessel_type || "-"}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">
                  {t("departure.departure_province_city")}:
                </span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.departure_province || "-"}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">
                  {t("departure.place_of_departure")}:
                </span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.place_of_departure || "-"}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">
                  {t("departure.to_region")}:
                </span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.to_region || "-"}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">
                  {t("departure.trip_period")}:
                </span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.trip_period || "-"}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">
                  {t("departure.departure_date")} :
                </span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.departure_date
                    ? formatDateWithMonthName(submitted.departure_date)
                    : "-"}
                </div>
              </div>

              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">
                  {t("departure.dock_province_city")}:
                </span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.dock_province || "-"}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">
                  {t("departure.place_of_dock")}:
                </span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.place_of_dock || "-"}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">
                  {t("departure.docking_date")} :
                </span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.docking_date
                    ? formatDateWithMonthName(submitted.docking_date)
                    : "-"}
                </div>
              </div>

              <div className="col-span-2 md:col-span-1">
                <span className="text-sm mb-2">
                  {t("departure.total_trip_period")} :
                </span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.total_trip_period
                    ? `${submitted.total_trip_period} days`
                    : "-"}
                </div>
              </div>

              <div className="col-span-2">
                <span className="text-sm mb-2">{t("departure.status")}:</span>
                <div className="bg-white p-2 border border-gray-300 rounded mt-1">
                  {submitted?.status || "-"}
                </div>
              </div>
            </div>

            {/*fishing_logbook table section  */}

            {submitted?.fishing_logbook === "Yes" && (
              <div className="mb-6 py-6 ">
                <div className="mb-3 flex flex-col items-center">
                  <h3 className="text-lg font-semibold text-center mb-3 text-gray-800">
                    THÔNG TIN NHẬT KÝ KHAI THÁC THỦY SẢN THEO MẺ
                  </h3>
                  <span className="text-sm font-semibold text-center mb-3">
                    FISHING LOGBOOK BY HAUL
                  </span>
                </div>

                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm">
                    Trip Id: {submitted?.trip_code}
                  </span>
                  <span className="text-sm">
                    Vessel Id: {submitted?.vessel_id}
                  </span>
                </div>
                {loading ? (
                  <div
                    className="w-full overflow-x-auto"
                    style={{ width: "90vw" }}
                  >
                    <Table className="min-w-full border-collapse">
                      <TableHeader>
                        <TableRow className="bg-gray-100">
                          <TableHead className="font-bold px-2 py-4 w-20 sticky left-0 z-10 bg-gray-100">
                            Haul #
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-32">
                            Location
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24">
                            Zone
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-32">
                            Capture Time
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24">
                            Fish Image
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24">
                            Product ID
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24">
                            Haul ID
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-20">
                            Quantity
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-20">
                            Tank
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24">
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
                            <TableCell className="px-2 py-4 sticky left-0 z-10 bg-white">
                              <div className="h-4 bg-gray-300 rounded"></div>
                            </TableCell>
                            <TableCell className="px-2 py-4">
                              <div className="h-4 bg-gray-300 rounded"></div>
                            </TableCell>
                            <TableCell className="px-2 py-4">
                              <div className="h-4 bg-gray-300 rounded"></div>
                            </TableCell>
                            <TableCell className="px-2 py-4">
                              <div className="h-4 bg-gray-300 rounded"></div>
                            </TableCell>
                            <TableCell className="px-2 py-4">
                              <div className="h-4 bg-gray-300 rounded"></div>
                            </TableCell>
                            <TableCell className="px-2 py-4">
                              <div className="h-4 bg-gray-300 rounded"></div>
                            </TableCell>
                            <TableCell className="px-2 py-4">
                              <div className="h-4 bg-gray-300 rounded"></div>
                            </TableCell>
                            <TableCell className="px-2 py-4">
                              <div className="h-4 bg-gray-300 rounded"></div>
                            </TableCell>
                            <TableCell className="px-2 py-4">
                              <div className="h-4 bg-gray-300 rounded"></div>
                            </TableCell>
                            <TableCell className="px-2 py-4">
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
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center py-8 text-gray-500"
                  >
                    <div className="w-full overflow-x-auto">
                      <Table className="min-w-full border-collapse">
                        <TableHeader>
                          <TableRow className="bg-gray-100">
                            <TableHead className="font-bold px-2 py-4 w-20 sticky left-0 z-10 bg-gray-100">
                              Haul #
                            </TableHead>
                            <TableHead className="font-bold px-2 py-4 w-32">
                              Location
                            </TableHead>
                            <TableHead className="font-bold px-2 py-4 w-24">
                              Zone
                            </TableHead>
                            <TableHead className="font-bold px-2 py-4 w-32">
                              Capture Time
                            </TableHead>
                            <TableHead className="font-bold px-2 py-4 w-24">
                              Fish Image
                            </TableHead>
                            <TableHead className="font-bold px-2 py-4 w-24">
                              Product ID
                            </TableHead>
                            <TableHead className="font-bold px-2 py-4 w-24">
                              Haul ID
                            </TableHead>
                            <TableHead className="font-bold px-2 py-4 w-20">
                              Quantity
                            </TableHead>
                            <TableHead className="font-bold px-2 py-4 w-20">
                              Tank
                            </TableHead>
                            <TableHead className="font-bold px-2 py-4 w-24">
                              Net kg/case
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.from({ length: 5 }).map((_, index) => (
                            <motion.tr
                              key={index}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.1 }}
                              className="w-full border-b border-gray-200"
                            >
                              <TableCell className="border border-black px-4 py-4 text-xs font-medium w-20 sticky left-0 z-10 bg-white">
                                <div className="text-gray-400">-</div>
                              </TableCell>
                              <TableCell className="border border-black px-4 py-4 text-xs w-32">
                                <div className="text-gray-400">-</div>
                              </TableCell>
                              <TableCell className="border border-black px-4 py-4 text-xs w-24">
                                <div className="text-gray-400">-</div>
                              </TableCell>
                              <TableCell className="border border-black px-4 py-4 text-xs w-20">
                                <div className="text-gray-400">-</div>
                              </TableCell>
                              <TableCell className="border border-black px-4 py-4 text-xs w-20">
                                <div className="text-gray-400">-</div>
                              </TableCell>
                              <TableCell className="border border-black px-4 py-4 text-xs w-24">
                                <div className="text-gray-400">-</div>
                              </TableCell>
                              <TableCell className="border border-black px-4 py-4 text-xs w-24">
                                <div className="text-gray-400">-</div>
                              </TableCell>
                              <TableCell className="border border-black px-4 py-4 text-xs w-16 font-bold">
                                <div className="text-gray-400">-</div>
                              </TableCell>
                              <TableCell className="border border-black px-4 py-4 text-xs w-16 font-bold">
                                <div className="text-gray-400">-</div>
                              </TableCell>
                              <TableCell className="border border-black px-4 py-4 text-xs w-16 font-bold">
                                <div className="text-gray-400">-</div>
                              </TableCell>
                            </motion.tr>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </motion.div>
                ) : (
                  <div
                    className="w-full overflow-x-auto"
                    style={{ width: "90vw" }}
                  >
                    <Table className="min-w-full border-collapse">
                      <TableHeader>
                        <TableRow className="bg-gray-100">
                          <TableHead className="font-bold px-2 py-4 w-20 sticky left-0 z-10 bg-gray-100 border border-black">
                            Haul #
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-32 border border-black">
                            Location
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24 border border-black">
                            Zone
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-32 border border-black">
                            Capture Time
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24 border border-black">
                            Fish Image
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24 border border-black">
                            Product ID
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24 border border-black">
                            Haul ID
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-20 border border-black">
                            Quantity
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-20 border border-black">
                            Tank
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24 border border-black">
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
                            <TableCell className="text-xs truncate px-2 py-4 sticky left-0 z-10 bg-white border border-black">
                              {record?.haul_id?.haul_number}
                            </TableCell>
                            <TableCell className="text-xs truncate px-2 py-4 border border-black">
                              {record?.catching_location}
                            </TableCell>
                            <TableCell className="text-xs truncate px-2 py-4 border border-black">
                              {record?.capture_zone}
                            </TableCell>
                            <TableCell className="text-xs truncate px-2 py-4 border border-black">
                              {new Date(record?.capture_time).toLocaleString(
                                "vi-VN"
                              )}
                            </TableCell>
                            <TableCell className="text-xs truncate px-2 py-4 border border-black">
                              {record?.image_url && (
                                <img
                                  src={record.image_url}
                                  alt="Catch"
                                  className="max-h-16 rounded"
                                />
                              )}
                            </TableCell>
                            <TableCell className="text-xs truncate px-2 py-4 border border-black">
                              <QRCode value={record?.qr_code} size={40} />
                            </TableCell>
                            <TableCell className="text-xs truncate px-2 py-4 border border-black">
                              {record?.haul_id?.qr_code ? (
                                <QRCode
                                  value={record?.haul_id?.qr_code}
                                  size={40}
                                />
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs truncate px-2 py-4 border border-black">
                              {record?.quantity}
                            </TableCell>
                            <TableCell className="text-xs truncate px-2 py-4 border border-black">
                              {record.tank}
                            </TableCell>
                            <TableCell className="text-xs truncate px-2 py-4 border border-black">
                              {record?.net_kg_per_case} {record?.unit}
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
                              className="px-2 py-4 border border-black"
                            >
                              Total Catch Volume
                            </TableCell>
                            <TableCell className="px-2 py-4 border border-black">
                              {catchRecords.reduce(
                                (sum, rec) => sum + Number(rec.quantity || 0),
                                0
                              )}
                            </TableCell>
                            <TableCell className="px-2 py-4 border border-black">
                              {
                                Array.from(
                                  new Set(catchRecords.map((rec) => rec.tank))
                                ).length
                              }
                            </TableCell>
                            <TableCell className="px-2 py-4 border border-black">
                              {catchRecords
                                .reduce(
                                  (sum, rec) =>
                                    sum + Number(rec.net_kg_per_case || 0),
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
            )}

            {submitted?.trading_logbook === "Yes" && (
              <div className="mt-8 overflow-x-auto">
                <div className="mb-3 flex flex-col items-center">
                  <h3 className="text-lg font-semibold text-center mb-3 text-gray-800">
                    THÔNG TIN NHẬT KÝ KHAI THÁC THỦY SẢN THEO MẺ
                  </h3>
                  <span className="text-sm font-semibold text-center mb-3">
                    TRADING LOGBOOK BY HAUL
                  </span>
                </div>

                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm">
                    Trip Id: {submitted?.trip_code}
                  </span>
                  <span className="text-sm">
                    Vessel Id: {submitted?.vessel_id}
                  </span>
                </div>
                {orderLoading ? (
                  <div
                    className="w-full overflow-x-auto"
                    style={{ width: "90vw" }}
                  >
                    <Table className="min-w-full border-collapse">
                      <TableHeader>
                        <TableRow className="bg-gray-100">
                          <TableHead className="font-bold px-2 py-4 w-20 sticky left-0 z-10 bg-gray-100">
                            Tank
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-32">
                            Product Name
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24">
                            Product ID
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-20">
                            Type
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-20">
                            Quantity
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24">
                            Bid Price
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-20">
                            Price
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24">
                            Departure
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24">
                            Arrival
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-32">
                            Created
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
                            <TableCell className="px-2 py-4 sticky left-0 z-10 bg-white">
                              <div className="h-4 bg-gray-300 rounded"></div>
                            </TableCell>
                            <TableCell className="px-2 py-4">
                              <div className="h-4 bg-gray-300 rounded"></div>
                            </TableCell>
                            <TableCell className="px-2 py-4">
                              <div className="h-4 bg-gray-300 rounded"></div>
                            </TableCell>
                            <TableCell className="px-2 py-4">
                              <div className="h-4 bg-gray-300 rounded"></div>
                            </TableCell>
                            <TableCell className="px-2 py-4">
                              <div className="h-4 bg-gray-300 rounded"></div>
                            </TableCell>
                            <TableCell className="px-2 py-4">
                              <div className="h-4 bg-gray-300 rounded"></div>
                            </TableCell>
                            <TableCell className="px-2 py-4">
                              <div className="h-4 bg-gray-300 rounded"></div>
                            </TableCell>
                            <TableCell className="px-2 py-4">
                              <div className="h-4 bg-gray-300 rounded"></div>
                            </TableCell>
                            <TableCell className="px-2 py-4">
                              <div className="h-4 bg-gray-300 rounded"></div>
                            </TableCell>
                            <TableCell className="px-2 py-4">
                              <div className="h-4 bg-gray-300 rounded"></div>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : orderError ? (
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
                    <p className="text-sm text-red-500">{orderError}</p>
                  </motion.div>
                ) : orders.filter((o) => o.type === "2BuyListing").length ===
                  0 ? (
                  <div
                    className="w-full overflow-x-auto"
                    style={{ width: "90vw" }}
                  >
                    <Table className="min-w-full border-collapse">
                      <TableHeader>
                        <TableRow className="bg-gray-100">
                          <TableHead className="font-bold px-2 py-4 w-20 sticky left-0 z-10 bg-gray-100">
                            Tank
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-32">
                            Product Name
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24">
                            Product ID
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-20">
                            Type
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-20">
                            Quantity
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-20">
                            Price
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24">
                            Departure
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24">
                            Arrival
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-32">
                            Created
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from({ length: 5 }).map((_, index) => (
                          <motion.tr
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            className="w-full border-b border-gray-200"
                          >
                            <TableCell className="border border-black px-4 py-4 text-xs font-medium w-20 sticky left-0 z-10 bg-white">
                              <div className="text-gray-400">-</div>
                            </TableCell>
                            <TableCell className="border border-black px-4 py-4 text-xs w-32">
                              <div className="text-gray-400">-</div>
                            </TableCell>
                            <TableCell className="border border-black px-4 py-4 text-xs w-24">
                              <div className="text-gray-400">-</div>
                            </TableCell>
                            <TableCell className="border border-black px-4 py-4 text-xs w-20">
                              <div className="text-gray-400">-</div>
                            </TableCell>

                            <TableCell className="border border-black px-4 py-4 text-xs w-24">
                              <div className="text-gray-400">-</div>
                            </TableCell>
                            <TableCell className="border border-black px-4 py-4 text-xs w-24">
                              <div className="text-gray-400">-</div>
                            </TableCell>
                            <TableCell className="border border-black px-4 py-4 text-xs w-16 font-bold">
                              <div className="text-gray-400">-</div>
                            </TableCell>
                            <TableCell className="border border-black px-4 py-4 text-xs w-16 font-bold">
                              <div className="text-gray-400">-</div>
                            </TableCell>
                            <TableCell className="border border-black px-4 py-4 text-xs w-16 font-bold">
                              <div className="text-gray-400">-</div>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div
                    className="w-full overflow-x-auto"
                    style={{ width: "90vw" }}
                  >
                    <Table className="min-w-full border-collapse">
                      <TableHeader>
                        <TableRow className="bg-gray-100">
                          <TableHead className="font-bold px-2 py-4 w-20 sticky left-0 z-10 bg-gray-100 border border-black">
                            Tank
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-32 border border-black">
                            Product Name
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24 border border-black">
                            Product ID
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-20 border border-black">
                            Type
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-20 border border-black">
                            Quantity
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24 border border-black">
                            Bid Price
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-20 border border-black">
                            Price
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24 border border-black">
                            Departure
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24 border border-black">
                            Arrival
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-32 border border-black">
                            Created
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders
                          .filter((o) => o.type === "2BuyListing")
                          .map((o, index) => (
                            <motion.tr
                              key={o.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                duration: 0.3,
                                delay: index * 0.05,
                              }}
                              className="hover:bg-gray-50 border-b border-gray-200"
                            >
                              <TableCell className="text-xs truncate px-2 py-4 sticky left-0 z-10 bg-white border border-black">
                                {o.tank_number}
                              </TableCell>
                              <TableCell className="text-xs truncate px-2 py-4 border border-black min-w-[200px] max-w-[300px] whitespace-nowrap overflow-ellipsis overflow-hidden">
                                {o.product_name}
                              </TableCell>
                              <TableCell className="text-xs truncate px-2 py-4 border border-black">
                                {o.product_id}
                              </TableCell>
                              <TableCell className="text-xs truncate px-2 py-4 border border-black">
                                {o.type}
                              </TableCell>
                              <TableCell className="text-xs truncate px-2 py-4 border border-black">
                                {o.quantity_load || o.available_load}
                              </TableCell>
                              <TableCell className="text-xs truncate px-2 py-4 border border-black">
                                {o.bid_price}
                              </TableCell>
                              <TableCell className="text-xs truncate px-2 py-4 border border-black">
                                {o.price}
                              </TableCell>
                              <TableCell className="text-xs truncate px-2 py-4 border border-black">
                                {o.departure_date || "-"}
                              </TableCell>
                              <TableCell className="text-xs truncate px-2 py-4 border border-black">
                                {o.arrival_date || "-"}
                              </TableCell>
                              <TableCell className="text-xs truncate px-2 py-4 border border-black min-w-[200px] max-w-[300px] whitespace-nowrap overflow-ellipsis overflow-hidden">
                                {o.created_at?.slice(0, 19).replace("T", " ")}
                              </TableCell>
                            </motion.tr>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* Trip-Based Transactions */}
            {submitted?.transshipment_logbook === "Yes" && (
              <div className="mt-8 overflow-x-auto">
                <div className="mb-3 flex flex-col items-center">
                  <h3 className="text-lg font-semibold text-center mb-3 text-gray-800">
                    THÔNG TIN GIAO DỊCH THEO CHUYẾN
                  </h3>
                  <span className="text-sm font-semibold text-center mb-3">
                    TRANS-SHIPMENT LOGBOOK BY HAUL
                  </span>
                </div>

                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm">
                    Trip Id:{" "}
                    {trips.find((t) => t.id === selectedTripId)?.trip_code}
                  </span>
                  <span className="text-sm">
                    Vessel Id: {submitted?.vessel_id}
                  </span>
                </div>

                {transactionLoading ? (
                  <div
                    className="w-full overflow-x-auto"
                    style={{ width: "90vw" }}
                  >
                    <Table className="min-w-full border-collapse">
                      <TableHeader>
                        <TableRow className="bg-gray-100">
                          <TableHead className="font-bold px-2 py-4 w-20 sticky left-0 z-10 bg-gray-100">
                            PO #
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-32">
                            Transaction Date
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24">
                            Vessel ID
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-20">
                            Type
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-20">
                            Quantity
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24">
                            Price
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24">
                            Amount VND
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-16">
                            Status
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
                            <TableCell className="px-2 py-4 sticky left-0 z-10 bg-white">
                              <div className="h-4 bg-gray-300 rounded"></div>
                            </TableCell>
                            <TableCell className="px-2 py-4">
                              <div className="h-4 bg-gray-300 rounded"></div>
                            </TableCell>
                            <TableCell className="px-2 py-4">
                              <div className="h-4 bg-gray-300 rounded"></div>
                            </TableCell>
                            <TableCell className="px-2 py-4">
                              <div className="h-4 bg-gray-300 rounded"></div>
                            </TableCell>
                            <TableCell className="px-2 py-4">
                              <div className="h-4 bg-gray-300 rounded"></div>
                            </TableCell>
                            <TableCell className="px-2 py-4">
                              <div className="h-4 bg-gray-300 rounded"></div>
                            </TableCell>
                            <TableCell className="px-2 py-4">
                              <div className="h-4 bg-gray-300 rounded"></div>
                            </TableCell>
                            <TableCell className="px-2 py-4">
                              <div className="h-4 bg-gray-300 rounded"></div>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : transactionError ? (
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
                      Error Loading Transactions
                    </h3>
                    <p className="text-sm text-red-500">{transactionError}</p>
                  </motion.div>
                ) : transactions.length === 0 ? (
                  <div
                    className="w-full overflow-x-auto"
                    style={{ width: "90vw" }}
                  >
                    <Table className="min-w-full border-collapse">
                      <TableHeader>
                        <TableRow className="bg-gray-100">
                          <TableHead className="font-bold px-2 py-4 w-20 sticky left-0 z-10 bg-gray-100 border border-black">
                            PO #
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-32 border border-black">
                            Transaction Date
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24 border border-black">
                            Vessel ID
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-20 border border-black">
                            Type
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-20 border border-black">
                            Quantity
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24 border border-black">
                            Price
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24 border border-black">
                            Amount VND
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-16 border border-black">
                            Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from({ length: 5 }).map((_, index) => (
                          <motion.tr
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            className="w-full border-b border-gray-200"
                          >
                            <TableCell className="border border-black px-4 py-4 text-xs font-medium w-20 sticky left-0 z-10 bg-white">
                              <div className="text-gray-400">-</div>
                            </TableCell>
                            <TableCell className="border border-black px-4 py-4 text-xs w-32">
                              <div className="text-gray-400">-</div>
                            </TableCell>
                            <TableCell className="border border-black px-4 py-4 text-xs w-24">
                              <div className="text-gray-400">-</div>
                            </TableCell>
                            <TableCell className="border border-black px-4 py-4 text-xs w-20">
                              <div className="text-gray-400">-</div>
                            </TableCell>
                            <TableCell className="border border-black px-4 py-4 text-xs w-20">
                              <div className="text-gray-400">-</div>
                            </TableCell>
                            <TableCell className="border border-black px-4 py-4 text-xs w-24">
                              <div className="text-gray-400">-</div>
                            </TableCell>
                            <TableCell className="border border-black px-4 py-4 text-xs w-24">
                              <div className="text-gray-400">-</div>
                            </TableCell>
                            <TableCell className="border border-black px-4 py-4 text-xs w-16 font-bold">
                              <div className="text-gray-400">-</div>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div
                    className="w-full overflow-x-auto"
                    style={{ width: "90vw" }}
                  >
                    <Table className="min-w-full border-collapse">
                      <TableHeader>
                        <TableRow className="bg-gray-100">
                          <TableHead className="font-bold px-2 py-4 w-20 sticky left-0 z-10 bg-gray-100 border border-black">
                            PO #
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-32 border border-black">
                            Transaction Date
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24 border border-black">
                            Vessel ID
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-20 border border-black">
                            Type
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-20 border border-black">
                            Quantity
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24 border border-black">
                            Price
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-24 border border-black">
                            Amount VND
                          </TableHead>
                          <TableHead className="font-bold px-2 py-4 w-16 border border-black">
                            Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((tx, index) => {
                          const vessel =
                            vesselMap[tx.seller_vessel_id] ||
                            vesselMap[tx.buyer_vessel_id];
                          const amount = (tx.price || 0) * (tx.quantity || 0);
                          return (
                            <motion.tr
                              key={tx.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                duration: 0.3,
                                delay: index * 0.05,
                              }}
                              className="hover:bg-gray-50 border-b border-gray-200"
                            >
                              <TableCell className="text-xs truncate px-2 py-4 sticky left-0 z-10 bg-white border border-black">
                                {tx.id.slice(0, 8)}
                              </TableCell>
                              <TableCell className="text-xs truncate px-2 py-4 border border-black">
                                {new Date(
                                  tx.transaction_date
                                ).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-xs truncate px-2 py-4 border border-black">
                                {vessel?.registration_number ||
                                  vessel?.name ||
                                  "-"}
                              </TableCell>
                              <TableCell className="text-xs truncate px-2 py-4 border border-black">
                                {tx.type || "-"}
                              </TableCell>
                              <TableCell className="text-xs truncate px-2 py-4 border border-black">
                                {tx.quantity} {tx.unit}
                              </TableCell>
                              <TableCell className="text-xs truncate px-2 py-4 border border-black">
                                {tx.price?.toLocaleString()} {tx.currency}
                              </TableCell>
                              <TableCell className="text-xs truncate px-2 py-4 border border-black font-medium">
                                {amount.toLocaleString()} VND
                              </TableCell>
                              <TableCell className="text-xs truncate px-2 py-4 border border-black font-bold">
                                {tx.status === "completed" ? (
                                  <span className="text-green-700 bg-green-100 px-2 py-1 rounded-full text-xs">
                                    Paid
                                  </span>
                                ) : (
                                  <span className="text-red-700 bg-red-100 px-2 py-1 rounded-full text-xs">
                                    Unpaid
                                  </span>
                                )}
                              </TableCell>
                            </motion.tr>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end mt-8">
              <div className="text-right">
                <div className="mb-2">{submitted?.created_at || ""}</div>
                <div>Date.. {submitted?.departure_date || ""}...</div>
                <div className="font-bold mt-4">{t("departure.captain")}</div>
                <div className="text-xs">{t("departure.master")}</div>
              </div>
            </div>
            <DialogFooter className="w-full">
              <Button
                onClick={() => setSuccessDialog(false)}
                className="mt-4 bg-red-500 text-white"
              >
                {t("departure.e_submission")}
              </Button>
              <Button
                onClick={handleDownloadPDF}
                className="mt-4 bg-red-800 text-white"
              >
                {t("departure.print")}
              </Button>
              <Button onClick={() => setSuccessDialog(false)} className="mt-4">
                {t("departure.close")}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t("departure.trip_history_list")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table className="min-w-full border-collapse">
              <TableHeader>
                <TableRow className="border-b-2 border-black">
                  <TableHead className="border border-black bg-gray-100 px-2 py-4 text-xs font-bold w-20 sticky left-0 z-10">
                    {t("departure.trip_code")}
                  </TableHead>
                  <TableHead className="border border-black bg-gray-100 px-2 py-4 text-xs font-bold w-16">
                    {t("departure.vessel")}
                  </TableHead>
                  <TableHead className="border border-black bg-gray-100 px-2 py-4 text-xs font-bold w-20">
                    {t("departure.departure_date")}
                  </TableHead>
                  <TableHead className="border border-black bg-gray-100 px-2 py-4 text-xs font-bold w-16">
                    {t("departure.departure_port")}
                  </TableHead>
                  <TableHead className="border border-black bg-gray-100 px-2 py-4 text-xs font-bold w-20">
                    {t("departure.departure_province")}
                  </TableHead>
                  <TableHead className="border border-black bg-gray-100 px-2 py-4 text-xs font-bold w-20">
                    {t("departure.place_of_departure")}
                  </TableHead>
                  <TableHead className="border border-black bg-gray-100 px-2 py-4 text-xs font-bold w-24">
                    {t("departure.to_region")}
                  </TableHead>
                  <TableHead className="border border-black bg-gray-100 px-2 py-4 text-xs font-bold w-16">
                    {t("departure.trip_period")}
                  </TableHead>
                  <TableHead className="border border-black bg-gray-100 px-2 py-4 text-xs font-bold w-16">
                    {t("departure.status")}
                  </TableHead>

                  <TableHead className="border border-black bg-gray-100 px-2 py-4 text-xs font-bold w-16">
                    {t("departure.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dockingTrips.length === 0
                  ? // Show empty rows when no docking trips
                    Array.from({ length: 4 }).map((_, index) => (
                      <TableRow
                        key={`empty-${index}`}
                        className="w-full border-b border-gray-200"
                      >
                        <TableCell className="border border-black px-2 py-4 text-xs font-medium w-20 sticky left-0 z-10 bg-white">
                          <div className="h-4 bg-gray-100 rounded"></div>
                        </TableCell>
                        <TableCell className="border border-black px-2 py-4 text-xs w-16">
                          <div className="h-4 bg-gray-100 rounded"></div>
                        </TableCell>
                        <TableCell className="border border-black px-2 py-4 text-xs w-20">
                          <div className="h-4 bg-gray-100 rounded"></div>
                        </TableCell>
                        <TableCell className="border border-black px-2 py-4 text-xs w-16">
                          <div className="h-4 bg-gray-100 rounded"></div>
                        </TableCell>
                        <TableCell className="border border-black px-2 py-4 text-xs w-20">
                          <div className="h-4 bg-gray-100 rounded"></div>
                        </TableCell>
                        <TableCell className="border border-black px-2 py-4 text-xs w-20">
                          <div className="h-4 bg-gray-100 rounded"></div>
                        </TableCell>
                        <TableCell className="border border-black px-2 py-4 text-xs w-20">
                          <div className="h-4 bg-gray-100 rounded"></div>
                        </TableCell>
                        <TableCell className="border border-black px-2 py-4 text-xs w-16">
                          <div className="h-4 bg-gray-100 rounded"></div>
                        </TableCell>
                        <TableCell className="border border-black px-2 py-4 text-xs w-16">
                          <div className="h-4 bg-gray-100 rounded"></div>
                        </TableCell>
                        <TableCell className="border border-black px-2 py-4 text-xs w-16">
                          <div className="h-4 bg-gray-100 rounded"></div>
                        </TableCell>
                      </TableRow>
                    ))
                  : dockingTrips.map((trip) => {
                      const vessel = vessels.find(
                        (v) => v.id === trip.vessel_id
                      );
                      return (
                        <TableRow
                          key={trip.id}
                          className="w-full cursor-pointer hover:bg-gray-50 border-b border-gray-200"
                          onClick={() => {
                            setSubmitted({
                              vessel_id: vessel?.registration_number || "",
                              owner: vessel?.captain_name || "",
                              address: vessel?.registration_number || "",
                              crew_count: vessel?.capacity
                                ? String(vessel.capacity)
                                : "",
                              vessel_type: vessel?.type || "",
                              departure_port: trip.departure_port || "",
                              departure_province: trip.departure_province || "",
                              to_region: trip.to_region || "",
                              place_of_departure: trip.place_of_departure || "",
                              departure_date:
                                trip.departure_date?.slice(0, 10) || "",
                              trip_period: trip.trip_period || "",
                              status: trip.status || "Departure",
                              trip_code: trip?.trip_code || "",
                              dock_province: trip.dock_province || "",
                              place_of_dock: trip.place_of_dock || "",
                              fishing_logbook: trip.fishing_logbook || "",
                              trading_logbook: trip.trading_logbook || "",
                              transshipment_logbook:
                                trip.transshipment_logbook || "",
                              docking_id: trip.docking_id || "",
                              docking_date: trip.docking_date || "",
                              total_trip_period: getDaysBetween(
                                trip.departure_date,
                                trip?.docking_date || ""
                              ).toString(),
                              // Additional vessel information
                              vessel_name: vessel?.name || "",
                              vessel_length: vessel?.length
                                ? String(vessel.length)
                                : "",
                              vessel_width: vessel?.width
                                ? String(vessel.width)
                                : "",
                              vessel_draught: vessel?.draught
                                ? String(vessel.draught)
                                : "",
                              vessel_materials: vessel?.materials || "",
                              vessel_engine_power: vessel?.engine_power
                                ? String(vessel.engine_power)
                                : "",
                              vessel_number_engines: vessel?.number_engines
                                ? String(vessel.number_engines)
                                : "",
                              vessel_type_of_machine:
                                vessel?.type_of_machine || "",
                              vessel_port_registry: vessel?.port_registry || "",
                              vessel_fishery_permit:
                                vessel?.fishery_permit || "",
                              vessel_expiration_date:
                                vessel?.expiration_date || "",
                              vessel_owner_name: vessel?.owner_name || "",
                              vessel_owner_id: vessel?.owner_id || "",
                              vessel_residential_address:
                                vessel?.residential_address || "",
                              vessel_gross_tonnage: vessel?.gross_tonnage
                                ? String(vessel.gross_tonnage)
                                : "",
                              vessel_number_of_engines:
                                vessel?.number_of_engines
                                  ? String(vessel.number_of_engines)
                                  : "",
                              vessel_engine_model: vessel?.engine_model || "",
                              vessel_engine_serial_number:
                                vessel?.engine_serial_number || "",
                              vessel_port_of_registry:
                                vessel?.port_of_registry || "",
                              vessel_vessel_type_from_doc:
                                vessel?.vessel_type_from_doc || "",
                              vessel_owner_id_card: vessel?.owner_id_card || "",
                              vessel_hull_material: vessel?.hull_material || "",
                            });
                            fetchCatchRecordsForTrip(trip.id);
                            setSelectedTripId(selectedTripId || "");
                            setSuccessDialog(true);
                          }}
                        >
                          <TableCell className="border border-black px-2 py-4 text-xs font-medium w-20 sticky left-0 z-10 bg-white">
                            <div className="truncate" title={trip.trip_code}>
                              {trip.trip_code}
                            </div>
                          </TableCell>
                          <TableCell className="border border-black px-2 py-4 text-xs w-16">
                            <div
                              className="truncate"
                              title={vessel?.registration_number || "-"}
                            >
                              {vessel?.registration_number || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="border border-black px-2 py-4 text-xs w-20">
                            <div
                              className="truncate"
                              title={trip.departure_date?.slice(0, 10) || "-"}
                            >
                              {trip.departure_date?.slice(0, 10) || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="border border-black px-2 py-4 text-xs w-16">
                            <div
                              className="truncate"
                              title={
                                ports.find((p) => p.id === trip.departure_port)
                                  ?.name || "-"
                              }
                            >
                              {ports.find((p) => p.id === trip.departure_port)
                                ?.name || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="border border-black px-2 py-4 text-xs w-20">
                            <div
                              className="truncate"
                              title={trip.departure_province || "-"}
                            >
                              {trip.departure_province || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="border border-black px-2 py-4 text-xs w-20">
                            <div
                              className="truncate"
                              title={trip.place_of_departure || "-"}
                            >
                              {trip.place_of_departure || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="border border-black px-2 py-4 text-xs w-24">
                            <div
                              className="truncate"
                              title={trip.to_region || "-"}
                            >
                              {trip.to_region || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="border border-black px-2 py-4 text-xs w-16">
                            <div
                              className="truncate"
                              title={trip.trip_period || "-"}
                            >
                              {trip.trip_period || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="border border-black px-2 py-4 text-xs w-16">
                            <div className="truncate" title={trip.status}>
                              {trip.status}
                            </div>
                          </TableCell>

                          <TableCell
                            className="border border-black px-2 py-4 text-xs w-16"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex gap-1 justify-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSubmitted({
                                    vessel_id:
                                      vessel?.registration_number || "",
                                    owner: vessel?.captain_name || "",
                                    address: vessel?.registration_number || "",
                                    crew_count: vessel?.capacity
                                      ? String(vessel.capacity)
                                      : "",
                                    vessel_type: vessel?.type || "",
                                    departure_port: trip.departure_port || "",
                                    departure_province:
                                      trip.departure_province || "",
                                    to_region: trip.to_region || "",
                                    place_of_departure:
                                      trip.place_of_departure || "",
                                    departure_date:
                                      trip.departure_date?.slice(0, 10) || "",
                                    trip_period: trip.trip_period || "",
                                    status: trip.status || "Departure",
                                    trip_code: trip?.trip_code || "",
                                    dock_province: trip.dock_province || "",
                                    place_of_dock: trip.place_of_dock || "",
                                    fishing_logbook: trip.fishing_logbook || "",
                                    trading_logbook: trip.trading_logbook || "",
                                    transshipment_logbook:
                                      trip.transshipment_logbook || "",
                                    docking_id: trip.docking_id || "",
                                    docking_date: trip.docking_date || "",
                                    total_trip_period: getDaysBetween(
                                      trip.departure_date,
                                      trip?.docking_date || ""
                                    ).toString(),
                                    // Additional vessel information
                                    vessel_name: vessel?.name || "",
                                    vessel_length: vessel?.length
                                      ? String(vessel.length)
                                      : "",
                                    vessel_width: vessel?.width
                                      ? String(vessel.width)
                                      : "",
                                    vessel_draught: vessel?.draught
                                      ? String(vessel.draught)
                                      : "",
                                    vessel_materials: vessel?.materials || "",
                                    vessel_engine_power: vessel?.engine_power
                                      ? String(vessel.engine_power)
                                      : "",
                                    vessel_number_engines:
                                      vessel?.number_engines
                                        ? String(vessel.number_engines)
                                        : "",
                                    vessel_type_of_machine:
                                      vessel?.type_of_machine || "",
                                    vessel_port_registry:
                                      vessel?.port_registry || "",
                                    vessel_fishery_permit:
                                      vessel?.fishery_permit || "",
                                    vessel_expiration_date:
                                      vessel?.expiration_date || "",
                                    vessel_owner_name: vessel?.owner_name || "",
                                    vessel_owner_id: vessel?.owner_id || "",
                                    vessel_residential_address:
                                      vessel?.residential_address || "",
                                    vessel_gross_tonnage: vessel?.gross_tonnage
                                      ? String(vessel.gross_tonnage)
                                      : "",
                                    vessel_number_of_engines:
                                      vessel?.number_of_engines
                                        ? String(vessel.number_of_engines)
                                        : "",
                                    vessel_engine_model:
                                      vessel?.engine_model || "",
                                    vessel_engine_serial_number:
                                      vessel?.engine_serial_number || "",
                                    vessel_port_of_registry:
                                      vessel?.port_of_registry || "",
                                    vessel_vessel_type_from_doc:
                                      vessel?.vessel_type_from_doc || "",
                                    vessel_owner_id_card:
                                      vessel?.owner_id_card || "",
                                    vessel_hull_material:
                                      vessel?.hull_material || "",
                                  });
                                  setSuccessDialog(true);
                                  fetchCatchRecordsForTrip(trip.id);
                                  setSelectedTripId(selectedTripId || "");
                                }}
                                className="h-5 w-5 p-0"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>
            {/* Pagination controls */}
            <div className="flex items-center justify-between mt-4">
              <div>
                {t("departure.showing")}{" "}
                {dockingTrips.length ? (page - 1) * perPage + 1 : 0} -{" "}
                {Math.min(page * perPage, dockingTrips.length)}{" "}
                {t("departure.of")} {dockingTrips.length}
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
                  { length: Math.ceil(dockingTrips.length / perPage) },
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
                    page === Math.ceil(dockingTrips.length / perPage) ||
                    dockingTrips.length === 0
                  }
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dock() {
  const { language } = useLanguageStore();
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader
          title={language === "en" ? "Dock info" : "Thông tin cảng"}
        />
        <TopButtons />

        <div className="px-3 flex gap-2 md:gap-3 lg:gap-4 overflow-x-auto">
          {/* {user.role === "Admin" && ()} */}
          <Link to="/request-to-dock/port-info" className="flex-shrink-0">
            <button
              className={`
                bg-gradient-to-r from-[#a8a8a8] to-[#fdfdfd] text-black rounded-md px-4 md:px-5
                  h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                  text-xs md:text-base
                w-38 md:w-38 lg:w-52 shadow-lg hover:shadow-xl transition-all duration-300
              `}
            >
              <span className="truncate">{t("departure.port_info")}</span>
            </button>
          </Link>

          <Link to="/request-to-dock/departure" className="flex-shrink-0">
            <button
              className={`
                bg-gradient-to-r from-[#a8a8a8] to-[#fdfdfd] text-black rounded-md px-4 md:px-5
                  h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                  text-xs md:text-base
                w-38 md:w-38 lg:w-52 shadow-lg hover:shadow-xl transition-all duration-300
              `}
            >
              <span className="truncate">
                {language === "en"
                  ? "R4D - Request for Departure"
                  : "R4D - Yêu cầu khởi hành"}
              </span>
            </button>
          </Link>
          <Link to="/request-to-dock/dock" className="flex-shrink-0">
            <button
              className={`
               bg-gradient-to-r from-black to-[#1306ad] text-[#f8f603] rounded-md px-4 md:px-5
                  h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                  text-xs md:text-base
                  w-38 md:w-38 lg:w-52
              `}
            >
              <span className="truncate">
                {language === "en"
                  ? "R2D - Request to Dock"
                  : "R2D - Yêu cầu cập cảng"}
              </span>
            </button>
          </Link>
        </div>
        <DockContainer />
      </SidebarInset>
    </SidebarProvider>
  );
}
