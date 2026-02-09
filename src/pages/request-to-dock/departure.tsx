import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import TopButtons from "@/components/top-buttons";
import { useEffect, useState, useCallback } from "react";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguageStore } from "@/stores/language-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { PDFDownloadLink, pdf } from "@react-pdf/renderer";
import { DeparturePDF } from "@/components/dashboard/DeparturePDF"; // adjust path as needed
import { useTranslation } from "@/hooks/use-translation";
import { useAuthStore } from "@/stores/auth-store";
import { useVesselAccess } from "@/hooks/use-vessel-access";
import { useToast } from "@/hooks/use-toast";

// Type for a seaport row
type FormData = {
  vessel_id: string | null;
  vessel: string;
  owner_name: string;
  address: string;
  crew_count: string;
  vessel_type: string;
  departure_province: string;
  place_of_departure: string;
  to_region: string;
  departure_date: string;
  departure_port: string;
  departure_port_name: string;
  trip_period: string;
  status: string;
  number_of_crew: string;
  vessel_registration_number: string;
  total_trip_period: number;
  form_code?: string;
  trip_code?: string;
  dock_province?: string;
  place_of_dock?: string;
  docking_date?: string;
};

const initialForm: FormData = {
  vessel_id: null,
  vessel: "",
  owner_name: "",
  address: "",
  crew_count: "",
  vessel_type: "",
  departure_port: "",
  departure_port_name: "",
  departure_province: "",
  to_region: "",
  place_of_departure: "",
  departure_date: "",
  trip_period: "",
  status: "Departure",
  number_of_crew: "",
  vessel_registration_number: "",
  total_trip_period: 0,
  form_code: "",
  trip_code: "",
  dock_province: "",
  place_of_dock: "",
  docking_date: "",
};

function DepartureContainer() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [trips, setTrips] = useState<
    Array<
      Database["public"]["Tables"]["fishing_trips"]["Row"] & {
        vessels: {
          id: string;
          name: string;
          registration_number: string;
        };
      }
    >
  >([]);
  const [vessels, setVessels] = useState<
    Database["public"]["Tables"]["vessels"]["Row"][]
  >([]);
  const [ports, setPorts] = useState<
    Database["public"]["Tables"]["seaports"]["Row"][]
  >([]);
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormData>(initialForm);
  const [successDialog, setSuccessDialog] = useState(false);
  const [submitted, setSubmitted] = useState<FormData | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStatusSelect, setShowStatusSelect] = useState(false);
  const [actionType, setActionType] = useState<"print" | "update" | null>(null);
  // Pagination and search
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [formQrUrl, setFormQrUrl] = useState<string | undefined>();
  const [tripQrUrl, setTripQrUrl] = useState<string | undefined>();

  // Search functionality state
  const [portSearchTerm, setPortSearchTerm] = useState("");
  const [vesselSearchTerm, setVesselSearchTerm] = useState("");
  const [filteredPorts, setFilteredPorts] = useState<
    Database["public"]["Tables"]["seaports"]["Row"][]
  >([]);
  const [filteredVessels, setFilteredVessels] = useState<
    Database["public"]["Tables"]["vessels"]["Row"][]
  >([]);
  const [showPortDropdown, setShowPortDropdown] = useState(false);
  const [showVesselDropdown, setShowVesselDropdown] = useState(false);

  const fetchVessels = useCallback(async () => {
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
  }, [user?.auth_id]);

  const fetchPorts = useCallback(async () => {
    const { data } = await supabase.from("seaports").select("*");
    setPorts(data || []);
  }, []);

  // Search functions for ports and vessels
  const searchPorts = useCallback(
    (searchTerm: string) => {
      if (!searchTerm.trim()) {
        setFilteredPorts([]);
        return;
      }

      const filtered = ports.filter((port) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          port.name?.toLowerCase().includes(searchLower) ||
          port.address?.toLowerCase().includes(searchLower) ||
          port.province?.toLowerCase().includes(searchLower) ||
          port.district?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredPorts(filtered);
    },
    [ports]
  );

  const searchVessels = useCallback(
    (searchTerm: string) => {
      if (!searchTerm.trim()) {
        setFilteredVessels([]);
        return;
      }

      const filtered = vessels.filter((vessel) => {
        const searchLower = searchTerm.toLowerCase();
        return vessel.registration_number?.toLowerCase().includes(searchLower);
      });
      setFilteredVessels(filtered);
    },
    [vessels]
  );

  // useEffect hooks
  useEffect(() => {
    fetchVessels();
    fetchPorts();
  }, [fetchVessels, fetchPorts]);

  useEffect(() => {
    fetchTrips();
    // eslint-disable-next-line
  }, [page, perPage]);

  useEffect(() => {
    if (successDialog) setDialogOpen(false);
  }, [successDialog]);

  // Initialize search terms with current form values
  useEffect(() => {
    if (form.departure_port_name) {
      setPortSearchTerm(form.departure_port_name);
    }
    if (form.vessel) {
      setVesselSearchTerm(form.vessel);
    }
  }, [form.departure_port_name, form.vessel]);

  // Search effect hooks
  useEffect(() => {
    searchPorts(portSearchTerm);
  }, [portSearchTerm, searchPorts]);

  useEffect(() => {
    searchVessels(vesselSearchTerm);
  }, [vesselSearchTerm, searchVessels]);

  // Handle clicking outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        !target.closest(".port-search-container") &&
        !target.closest(".vessel-search-container")
      ) {
        setShowPortDropdown(false);
        setShowVesselDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Helper functions for selection
  const handlePortSelect = (
    port: Database["public"]["Tables"]["seaports"]["Row"]
  ) => {
    const newForm: FormData = {
      ...form,
      departure_port: port.id,
      departure_port_name: port.name || "",
      address: port.address,
      total_trip_period: form.total_trip_period,
      form_code: form.form_code || "",
      trip_code: form.trip_code || "",
      dock_province: form.dock_province || "",
      place_of_dock: form.place_of_dock || "",
      docking_date: form.docking_date || "",
    };
    setForm(newForm);
    setPortSearchTerm(port.name || "");
    setShowPortDropdown(false);
  };

  const handleVesselSelect = (
    vessel: Database["public"]["Tables"]["vessels"]["Row"]
  ) => {
    const newForm: FormData = {
      ...form,
      vessel_id: vessel.id,
      vessel: vessel.registration_number || "",
      owner_name: (vessel.owner_name as string) || "",
      address: (vessel.residential_address as string) || "",
      vessel_type: vessel.type || "",
      crew_count: "",
      total_trip_period: form.total_trip_period,
      form_code: form.form_code || "",
      trip_code: form.trip_code || "",
      dock_province: form.dock_province || "",
      place_of_dock: form.place_of_dock || "",
      docking_date: form.docking_date || "",
    };
    setForm(newForm);
    setVesselSearchTerm(vessel.registration_number || "");
    setShowVesselDropdown(false);
  };

  const handlePortClear = () => {
    const newForm: FormData = {
      ...form,
      departure_port: "",
      departure_port_name: "",
      total_trip_period: form.total_trip_period,
      form_code: form.form_code || "",
      trip_code: form.trip_code || "",
      dock_province: form.dock_province || "",
      place_of_dock: form.place_of_dock || "",
      docking_date: form.docking_date || "",
    };
    setForm(newForm);
    setPortSearchTerm("");
    setShowPortDropdown(false);
  };

  const handleVesselClear = () => {
    const newForm: FormData = {
      ...form,
      vessel_id: null,
      vessel: "",
      owner_name: "",
      address: "",
      vessel_type: "",
      crew_count: "",
      total_trip_period: form.total_trip_period,
      form_code: form.form_code || "",
      trip_code: form.trip_code || "",
      dock_province: form.dock_province || "",
      place_of_dock: form.place_of_dock || "",
      docking_date: form.docking_date || "",
    };
    setForm(newForm);
    setVesselSearchTerm("");
    setShowVesselDropdown(false);
  };

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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchTrips(search);
  }

  function handlePerPageChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setPerPage(Number(e.target.value));
    setPage(1);
  }

  function handleEdit(
    trip: Database["public"]["Tables"]["fishing_trips"]["Row"]
  ) {
    const vessel = vessels.find((v) => v.id === trip.vessel_id);
    const newForm = {
      vessel_id: trip.vessel_id,
      vessel: trip.vessel || "",
      owner_name:
        (trip as { owner_name?: string }).owner_name ||
        vessel?.owner_name ||
        "",
      address: trip.address || vessel?.residential_address || "",
      crew_count:
        trip.number_of_crew ||
        (vessel?.capacity ? String(vessel.capacity) : ""),
      vessel_type: trip.vessel_type || "",
      departure_port: trip.departure_port || "",
      departure_port_name: trip.departure_port_name || "",
      departure_province: trip.departure_province || "",
      to_region: trip.to_region || "",
      place_of_departure: trip.place_of_departure || "",
      departure_date: trip.departure_date?.slice(0, 10) || "",
      trip_period: trip.trip_period || "",
      status: trip.status || "Departure",
      number_of_crew:
        trip.number_of_crew ||
        (vessel?.capacity ? String(vessel.capacity) : ""),
      vessel_registration_number: vessel?.registration_number || "",
      total_trip_period: 0,
      form_code: (trip?.trip_code as string) || "",
      trip_code: (trip?.trip_code as string) || "",
    };
    setForm(newForm);

    // Set search terms for the input fields
    setVesselSearchTerm(vessel?.registration_number || "");
    setPortSearchTerm(trip.departure_port_name || "");

    setEditId(trip.id);
    setDialogOpen(true);
  }
  function formatDateDDMMYY(dateString: string) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    return `${day}${month}${year}`;
  }

  async function handleAddOrEdit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate required fields
    if (!form.departure_date) {
      setError("Please select a departure date");
      setLoading(false);
      return;
    }

    if (!form.departure_province) {
      setError("Please enter departure province");
      setLoading(false);
      return;
    }

    if (!form.place_of_departure) {
      setError("Please enter place of departure");
      setLoading(false);
      return;
    }

    if (!form.to_region) {
      setError("Please select a region");
      setLoading(false);
      return;
    }

    let vessel_id = form.vessel_id;
    if (!form.vessel_id || form.vessel_id === "") {
      const { data: vesselData, error: vesselError } = await supabase
        .from("vessels")
        .insert([
          {
            user_id: user?.auth_id,
            name: form.owner_name,
            type: "fishing",
            type_of_vessel: form.vessel_type,
            residential_address: form.address,
            registration_number: form.vessel,
            fileUrl: "",
            captain_name: form.owner_name,
            owner_name: form.owner_name,
            owner_id: form.owner_name,
          },
        ])
        .select()
        .single();

      if (vesselError) throw vesselError;
      vessel_id = vesselData.id;
    }

    const trip_code =
      form.vessel_type.charAt(0) +
      (form.departure_port
        ? Number(form.departure_port).toString().padStart(2, "0")
        : form.departure_port_name.slice(0, 2)) +
      form.to_region.charAt(0) +
      formatDateDDMMYY(form.departure_date) +
      (trips.length + 1000).toString().padStart(4, "0");
    try {
      if (editId) {
        // Edit
        await supabase
          .from("fishing_trips")
          .update({
            user_id: user?.auth_id,
            vessel_id: vessel_id,
            vessel: form.vessel || vesselSearchTerm,
            departure_date: form.departure_date
              ? new Date(form.departure_date).toISOString()
              : null,
            departure_port: form.departure_port || null,
            departure_port_name: form.departure_port_name || portSearchTerm,
            status: form.status || "Departure",
            departure_province: form.departure_province,
            place_of_departure: form.place_of_departure,
            to_region: form.to_region,
            trip_period: form.trip_period,
            number_of_crew: Number(form.crew_count),
            vessel_type: form.vessel_type,
            vessel_registration_number: form.vessel,
            address: form.address,
            owner_name: form.owner_name,
          })
          .eq("id", editId);
      } else {
        // Add
        console.log("form", form);
        console.log("user?.auth_id", user?.auth_id);
        const { data, error } = await supabase
          .from("fishing_trips")
          .insert({
            user_id: user?.auth_id,
            vessel_id: vessel_id,
            vessel: form.vessel || vesselSearchTerm,
            trip_code: trip_code.toUpperCase(),
            form_code: (
              trip_code + form.departure_date.slice(0, 2)
            ).toUpperCase(),
            departure_date: form.departure_date
              ? new Date(form.departure_date).toISOString()
              : null,
            departure_port: form.departure_port || null,
            departure_port_name: form.departure_port_name || portSearchTerm,
            status: "Departure",
            departure_province: form.departure_province,
            place_of_departure: form.place_of_departure,
            to_region: form.to_region,
            trip_period: form.trip_period,
            number_of_crew: Number(form.crew_count),
            vessel_type: form.vessel_type,
            vessel_registration_number: form.vessel,
            address: form.address,
            owner_name: form.owner_name,
          })
          .select()
          .single();
        console.log("error", error);
        if (error) throw error;
        setSubmitted({
          vessel_id: vessel_id,
          vessel: form.vessel || vesselSearchTerm,
          owner_name: form.owner_name,
          address: form.address,
          vessel_registration_number: form.vessel,
          crew_count: form.crew_count,
          vessel_type: form.vessel_type,
          departure_port: form.departure_port,
          departure_port_name: form.departure_port_name || portSearchTerm,
          departure_province: form.departure_province,
          to_region: form.to_region,
          place_of_departure: form.place_of_departure,
          departure_date: form.departure_date,
          trip_period: form.trip_period,
          status: "Departure",
          number_of_crew: form.number_of_crew,
          total_trip_period: 0,
          form_code: data.form_code,
          trip_code: data.trip_code,
        });
        setSuccessDialog(true);
        setForm(initialForm);
        setPortSearchTerm("");
        setVesselSearchTerm("");
      }
      setDialogOpen(false);
      setEditId(null);
      fetchTrips();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setLoading(true);
    setError(null);
    try {
      await supabase.from("fishing_trips").delete().eq("id", deleteId);
      setDeleteId(null);
      setShowDeleteConfirm(false);
      fetchTrips();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const handleActionButtonClick = (action: "print" | "update") => {
    setActionType(action);
    setShowStatusSelect(true);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!submitted || newStatus === "Select") return;

    try {
      // Update the trip status in the database
      await supabase
        .from("fishing_trips")
        .update({ status: newStatus })
        .eq("trip_code", submitted.trip_code);

      // Update the local submitted state with new status
      const updatedSubmitted = { ...submitted, status: newStatus };
      setSubmitted(updatedSubmitted);

      // Perform the action based on actionType
      if (actionType === "print") {
        // Create PDF data with updated status
        const pdfData = {
          ...updatedSubmitted,
          owner_name: updatedSubmitted.owner_name || "",
          address: updatedSubmitted.address || "",
          form_qr_url: formQrUrl || "",
          trip_qr_url: tripQrUrl || "",
          form_code: updatedSubmitted.form_code || "",
          trip_code: updatedSubmitted.trip_code || "",
          dock_province: updatedSubmitted.dock_province || "",
          place_of_dock: updatedSubmitted.place_of_dock || "",
          docking_date: updatedSubmitted.docking_date || "",
          isDocking: newStatus === "Docking",
        };

        const doc = await pdf(
          <DeparturePDF data={pdfData} isDocking={false} />
        );
        const blob = await doc.toBlob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `departure-${updatedSubmitted.vessel_registration_number}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      }

      // Close the modal
      setSuccessDialog(false);
      setShowStatusSelect(false);
      setActionType(null);

      toast.toast({
        title: "Trip status updated successfully",
        description: "Trip status updated successfully",
        variant: "default",
      });
      // Refresh the trips list
      fetchTrips();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  useEffect(() => {
    async function generateQr() {
      if (submitted?.form_code) {
        const formQr = await toDataURL(submitted.form_code, { width: 80 });
        setFormQrUrl(formQr);
      }
      if (submitted?.trip_code) {
        const tripQr = await toDataURL(submitted.trip_code, { width: 80 });
        setTripQrUrl(tripQr);
      }
    }
    generateQr();
  }, [submitted]);

  const isMobile = useIsMobile();
  return (
    <div className="flex flex-col gap-4 px-3 py-4 md:gap-6 md:py-6">
      <h1 className="text-2xl font-bold text-center text-blue-800 bg-gray-200 p-4 mt-5 rounded-md">
        {t("departure.title")}
      </h1>

      <form
        onSubmit={handleAddOrEdit}
        className="rounded  md:p-6 grid grid-cols-2 gap-6"
      >
        <Card className="col-span-2">
          <CardContent>
            <div className="col-span-2 md:col-span-1 pt-6 relative port-search-container">
              <Label className="text-sm truncate  ">
                {t("departure.departure_port")}
              </Label>

              <Input
                className="!border-solid !border-red-500 rounded-none"
                value={portSearchTerm}
                onChange={(e) => {
                  setForm((f) => ({
                    ...f,
                    departure_port_name: e.target.value,
                  }));
                  setPortSearchTerm(e.target.value);
                  setShowPortDropdown(true);
                }}
                onFocus={() => setShowPortDropdown(true)}
                placeholder="Port name, address, province, district"
              />

              {showPortDropdown && filteredPorts.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredPorts.map((port) => (
                    <div
                      key={port.id}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                      onClick={() => handlePortSelect(port)}
                    >
                      <div className="font-medium">{port.name}</div>
                      <div className="text-sm text-gray-600">
                        {port.address && `${port.address}, `}
                        {port.province && `${port.province}, `}
                        {port.district}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="col-span-2 md:col-span-1 relative vessel-search-container">
              <Label className="text-sm truncate">Vessel ID</Label>
              <Input
                className="!border-solid !border-red-500 rounded-none"
                value={vesselSearchTerm.toLocaleUpperCase()}
                onChange={(e) => {
                  setForm((f) => ({ ...f, vessel: e.target.value }));
                  setVesselSearchTerm(e.target.value);
                  setShowVesselDropdown(true);
                }}
                onFocus={() => setShowVesselDropdown(true)}
                placeholder="Vessel ID or registration number"
              />

              {showVesselDropdown && filteredVessels.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredVessels.map((vessel) => (
                    <div
                      key={vessel.id}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                      onClick={() => handleVesselSelect(vessel)}
                    >
                      <div className="font-medium">
                        {vessel.registration_number}
                      </div>
                      <div className="text-sm text-gray-600">
                        {vessel.name && `Name: ${vessel.name}`}
                        {vessel.owner_name && ` | Owner: ${vessel.owner_name}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="col-span-2">
              <Label>{t("departure.owner")}</Label>
              <Input
                className="!border-solid !border-red-500 rounded-none"
                value={form.owner_name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, owner_name: e.target.value }));
                }}
              />
            </div>
            <div className="col-span-2">
              <Label>{t("departure.address")}</Label>
              <Input
                className="!border-solid !border-red-500 rounded-none"
                value={form.address}
                onChange={(e) => {
                  setForm((f) => ({ ...f, address: e.target.value }));
                }}
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <Label className="text-sm truncate">
                {t("departure.crew_count")}
              </Label>
              <Input
                className="!border-solid !border-red-500 rounded-none"
                value={form.number_of_crew}
                onChange={(e) => {
                  setForm((f) => ({ ...f, number_of_crew: e.target.value }));
                }}
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <Label>{t("departure.vessel_type")}</Label>
              <Input
                className="!border-solid !border-red-500 rounded-none"
                value={form.vessel_type}
                onChange={(e) => {
                  setForm((f) => ({ ...f, vessel_type: e.target.value }));
                }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardContent>
            <div className="col-span-2 grid grid-cols-2 gap-6 rounded">
              <div className="col-span-2">
                <Label>{t("departure.departure_province")} *</Label>
                <Input
                  required
                  className="!border-solid !border-gray-500 rounded-none"
                  value={form.departure_province}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      departure_province: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="col-span-2">
                <Label>{t("departure.place_of_departure")} *</Label>
                <Input
                  required
                  className="!border-solid !border-gray-500 rounded-none"
                  value={form.place_of_departure}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      place_of_departure: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="col-span-2">
                <Label>{t("departure.to_region")} *</Label>
                <Select
                  value={form.to_region}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, to_region: value }))
                  }
                >
                  <SelectTrigger className="!border-solid !border-gray-500 rounded-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="A. Ca Mau - Kien Giang">
                        A. Ca Mau - Kien Giang
                      </SelectItem>
                      <SelectItem value="B. Da Nang - Thanh Hoa">
                        B. Da Nang - Thanh Hoa
                      </SelectItem>
                      <SelectItem value="C. Hai Phong - Vung Tau">
                        C. Hai Phong - Vung Tau
                      </SelectItem>
                      <SelectItem value="D. Hai Duong - Thai Binh">
                        D. Hai Duong - Thai Binh
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label>{t("departure.departure_date")} *</Label>
                <Input
                  type="date"
                  value={form.departure_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, departure_date: e.target.value }))
                  }
                  className="!border-solid !border-gray-500 rounded-none"
                />
              </div>
              <div className="col-span-2">
                <Label>{t("departure.trip_period")}</Label>
                <Select
                  value={form.trip_period}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, trip_period: value }))
                  }
                >
                  <SelectTrigger className="!border-solid !border-gray-500 rounded-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {[3, 4, 5, 10, 15, 20, 30].map((v) => (
                        <SelectItem key={v} value={String(v)}>
                          {v} days
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        {editId && (
          <div>
            <Label>{t("departure.status")}</Label>
            <select
              className="w-full border rounded p-2 bg-white"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value }))
              }
            >
              <option value="Select">{t("departure.select")}</option>
              <option value="Departure">
                {t("departure.status_options.Departure")}
              </option>
              <option value="OnRoad">
                {t("departure.status_options.OnRoad")}
              </option>
              <option value="Catching">
                {t("departure.status_options.Catching")}
              </option>
              <option value="4Sales">
                {t("departure.status_options.4Sales")}
              </option>
              <option value="2Buy">{t("departure.status_options.2Buy")}</option>
              <option value="4Share">
                {t("departure.status_options.4Share")}
              </option>
              <option value="2Share">
                {t("departure.status_options.2Share")}
              </option>
              <option value="Full">{t("departure.status_options.Full")}</option>
              <option value="Return Port">
                {t("departure.status_options.Return Port")}
              </option>
              <option value="Docking">
                {t("departure.status_options.Docking")}
              </option>
            </select>
          </div>
        )}
        <div className="col-span-2 flex justify-end">
          <Button type="submit" disabled={loading} className="w-40">
            {loading
              ? editId
                ? t("departure.updating")
                : t("departure.submitting")
              : editId
              ? t("departure.update")
              : t("departure.submit")}
          </Button>
        </div>
        {error && <div className="col-span-2 text-red-500">{error}</div>}
      </form>

      {trips.length >= 1 && (
        <form
          onSubmit={handleSearch}
          className="flex flex-wrap gap-2 items-end mb-0"
        >
          <Input
            placeholder={t("departure.search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 bg-blue-100 h-9"
          />
          <Button type="submit">{t("departure.search")}</Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSearch("");
              setPage(1);
              fetchTrips("");
            }}
          >
            {t("departure.reset")}
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <span>{t("departure.rows_per_page")}</span>
            <select
              value={perPage}
              onChange={handlePerPageChange}
              className="border rounded px-2 py-1"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </form>
      )}
      <div className="mb-5 mt-0 flex flex-col lg:flex-row gap-4 lg:gap-0 justify-start md:justify-between md:items-center">
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setForm(initialForm);
              setPortSearchTerm("");
              setVesselSearchTerm("");
              setEditId(null);
            }
          }}
        >
          {/* {trips.length >= 1 && (
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus size={16} /> {t("departure.add_trip")}
              </Button>
            </DialogTrigger>
          )} */}

          <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col overflow-y-auto overflow-x-hidden">
            <DialogHeader>
              <DialogTitle>
                {editId ? t("departure.edit_trip") : t("departure.add_trip")}
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={handleAddOrEdit}
              className="rounded  md:p-6 grid grid-cols-2 gap-6"
            >
              <div className="col-span-2 md:col-span-1 relative port-search-container">
                <Label className="text-sm truncate">
                  {t("departure.departure_port")}
                </Label>

                <div className="relative">
                  <Input
                    className="!border-solid !border-red-500 rounded-none pr-8"
                    value={portSearchTerm}
                    onChange={(e) => {
                      setPortSearchTerm(e.target.value);
                      setForm((f) => ({
                        ...f,
                        departure_port_name: e.target.value,
                      }));
                      setShowPortDropdown(true);
                    }}
                    onFocus={() => setShowPortDropdown(true)}
                    placeholder="Search ports by name, address, province, district..."
                  />
                  {portSearchTerm && (
                    <button
                      type="button"
                      onClick={handlePortClear}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {showPortDropdown && filteredPorts.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredPorts.map((port) => (
                      <div
                        key={port.id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                        onClick={() => handlePortSelect(port)}
                      >
                        <div className="font-medium">{port.name}</div>
                        <div className="text-sm text-gray-600">
                          {port.address && `${port.address}, `}
                          {port.province && `${port.province}, `}
                          {port.district}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="col-span-2 md:col-span-1 relative vessel-search-container">
                <Label className="text-sm truncate">Vessel ID</Label>
                <div className="relative">
                  <Input
                    className="!border-solid !border-red-500 rounded-none pr-8"
                    value={vesselSearchTerm}
                    onChange={(e) => {
                      setVesselSearchTerm(e.target.value);
                      setForm((f) => ({
                        ...f,
                        vessel: e.target.value,
                      }));
                      setShowVesselDropdown(true);
                    }}
                    onFocus={() => setShowVesselDropdown(true)}
                    placeholder="Search vessels by registration number..."
                  />
                  {vesselSearchTerm && (
                    <button
                      type="button"
                      onClick={handleVesselClear}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {showVesselDropdown && filteredVessels.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredVessels.map((vessel) => (
                      <div
                        key={vessel.id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                        onClick={() => handleVesselSelect(vessel)}
                      >
                        <div className="font-medium">
                          {vessel.registration_number}
                        </div>
                        <div className="text-sm text-gray-600">
                          {vessel.name && `Name: ${vessel.name}`}
                          {vessel.owner_name &&
                            ` | Owner: ${vessel.owner_name}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="col-span-2">
                <Label>{t("departure.owner")}</Label>
                <Input
                  className="!border-solid !border-red-500 rounded-none"
                  value={form.owner_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, owner_name: e.target.value }))
                  }
                />
              </div>
              <div className="col-span-2">
                <Label>{t("departure.address")}</Label>
                <Input
                  className="!border-solid !border-red-500 rounded-none"
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: e.target.value }))
                  }
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label className="text-sm truncate">
                  {t("departure.crew_count")}
                </Label>
                <Input
                  className="!border-solid !border-red-500 rounded-none"
                  value={form.number_of_crew || 2}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, number_of_crew: e.target.value }))
                  }
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label>{t("departure.vessel_type")}</Label>
                <Input
                  className="!border-solid !border-red-500 rounded-none"
                  value={form.vessel_type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, vessel_type: e.target.value }))
                  }
                />
              </div>

              <div className="col-span-2 grid grid-cols-2 gap-6 rounded">
                <div className="col-span-2">
                  <Label>{t("departure.departure_province")} *</Label>
                  <Input
                    required
                    className="!border-solid !border-red-500 rounded-none"
                    value={form.departure_province}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        departure_province: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label>{t("departure.place_of_departure")} *</Label>
                  <Input
                    required
                    className="!border-solid !border-red-500 rounded-none"
                    value={form.place_of_departure}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        place_of_departure: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label>{t("departure.to_region")} *</Label>
                  <Select
                    value={form.to_region}
                    onValueChange={(value) =>
                      setForm((f) => ({ ...f, to_region: value }))
                    }
                  >
                    <SelectTrigger className="!border-solid !border-red-500 rounded-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="A. Ca Mau - Kien Giang">
                          A. Ca Mau - Kien Giang
                        </SelectItem>
                        <SelectItem value="B. Da Nang - Thanh Hoa">
                          B. Da Nang - Thanh Hoa
                        </SelectItem>
                        <SelectItem value="C. Hai Phong - Vung Tau">
                          C. Hai Phong - Vung Tau
                        </SelectItem>
                        <SelectItem value="D. Hai Duong - Thai Binh">
                          D. Hai Duong - Thai Binh
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label>{t("departure.departure_date")} *</Label>
                  <Input
                    type="date"
                    value={form.departure_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, departure_date: e.target.value }))
                    }
                    className="!border-solid !border-red-500 rounded-none"
                  />
                </div>
                <div className="col-span-2">
                  <Label>{t("departure.trip_period")}</Label>
                  <Select
                    value={form.trip_period}
                    onValueChange={(value) =>
                      setForm((f) => ({ ...f, trip_period: value }))
                    }
                  >
                    <SelectTrigger className="!border-solid !border-red-500 rounded-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {[3, 4, 5, 10, 15, 20, 30].map((v) => (
                          <SelectItem key={v} value={String(v)}>
                            {v} days
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {editId && (
                <div>
                  <Label>{t("departure.status")}</Label>
                  <select
                    className="w-full border rounded p-2 bg-white"
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value }))
                    }
                  >
                    <option value="Select">{t("departure.select")}</option>
                    <option value="Departure">
                      {t("departure.status_options.Departure")}
                    </option>
                    <option value="OnRoad">
                      {t("departure.status_options.OnRoad")}
                    </option>
                    <option value="Catching">
                      {t("departure.status_options.Catching")}
                    </option>
                    <option value="4Sales">
                      {t("departure.status_options.4Sales")}
                    </option>
                    <option value="2Buy">
                      {t("departure.status_options.2Buy")}
                    </option>
                    <option value="4Share">
                      {t("departure.status_options.4Share")}
                    </option>
                    <option value="2Share">
                      {t("departure.status_options.2Share")}
                    </option>
                    <option value="Full">
                      {t("departure.status_options.Full")}
                    </option>
                    <option value="Return Port">
                      {t("departure.status_options.Return Port")}
                    </option>
                    <option value="Docking">
                      {t("departure.status_options.Docking")}
                    </option>
                  </select>
                </div>
              )}
              <div className="col-span-2 flex justify-end">
                <Button type="submit" disabled={loading} className="w-40">
                  {loading
                    ? editId
                      ? t("departure.updating")
                      : t("departure.submitting")
                    : editId
                    ? t("departure.update")
                    : t("departure.submit")}
                </Button>
              </div>
              {error && <div className="col-span-2 text-red-500">{error}</div>}
            </form>
          </DialogContent>
        </Dialog>
        {/* Delete confirmation dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("departure.dialog.delete_title")}</DialogTitle>
            </DialogHeader>
            <div>{t("departure.dialog.delete_confirm")}</div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t("departure.dialog.cancel")}
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                {t("departure.dialog.delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="overflow-hidden py-3 px-2">
        <CardHeader className="pl-0">
          <CardTitle>{t("departure.fishing_trips")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <p>{t("departure.loading")}</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table className="min-w-full border-collapse">
                <TableHeader>
                  <TableRow className="border-b-2 border-black">
                    <TableHead className="border border-black bg-gray-100 px-2 py-4 text-xs font-bold w-20 sticky left-0 z-10">
                      Trip Code
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-4 text-xs font-bold w-16">
                      Vessel
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-4 text-xs font-bold w-20">
                      Date
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-4 text-xs font-bold w-16">
                      Port
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-4 text-xs font-bold w-20">
                      Province
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-4 text-xs font-bold w-20">
                      Place
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-4 text-xs font-bold w-24">
                      Region
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-4 text-xs font-bold w-16">
                      Period
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-4 text-xs font-bold w-16">
                      Status
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-4 text-xs font-bold w-16">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((trip) => {
                    const vessel = vessels.find((v) => v.id === trip.vessel_id);
                    return (
                      <TableRow
                        key={trip.id}
                        className="w-full cursor-pointer hover:bg-gray-50 border-b border-gray-200"
                        onClick={() => {
                          setSubmitted({
                            vessel_id: trip.vessel_id,
                            vessel: trip.vessel || "",
                            owner_name:
                              (trip as { owner_name?: string }).owner_name ||
                              vessel?.owner_name ||
                              "",
                            address:
                              trip.address || vessel?.residential_address || "",
                            crew_count:
                              trip.number_of_crew ||
                              (vessel?.capacity ? String(vessel.capacity) : ""),
                            number_of_crew:
                              trip.number_of_crew ||
                              (vessel?.capacity ? String(vessel.capacity) : ""),
                            vessel_type: trip.vessel_type || "",
                            departure_port: trip.departure_port || "",
                            departure_port_name: trip.departure_port_name || "",
                            departure_province: trip.departure_province || "",
                            to_region: trip.to_region || "",
                            place_of_departure: trip.place_of_departure || "",
                            departure_date:
                              trip.departure_date?.slice(0, 10) || "",
                            trip_period: trip.trip_period || "",
                            status: trip.status || "Departure",
                            vessel_registration_number:
                              vessel?.registration_number || "",
                            total_trip_period: 0,
                            form_code: (trip?.trip_code as string) || "",
                            trip_code: (trip?.trip_code as string) || "",
                          });
                          setSuccessDialog(true);
                        }}
                      >
                        <TableCell className="border border-black px-2 py-4 text-xs font-medium w-20 sticky left-0 z-10 bg-white">
                          <div className="truncate" title={trip.trip_code}>
                            {trip.trip_code}
                          </div>
                        </TableCell>
                        <TableCell className="border border-black px-2 py-4 text-xs w-16">
                          <div className="truncate" title={trip.vessel || "-"}>
                            {trip.vessel || "-"}
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
                            title={trip.departure_port_name || "-"}
                          >
                            {trip.departure_port_name || "-"}
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
                              onClick={() => handleEdit(trip)}
                              className="h-5 w-5 p-0"
                            >
                              <Pencil className="w-2.5 h-2.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setDeleteId(trip.id);
                                setShowDeleteConfirm(true);
                              }}
                              className="h-5 w-5 p-0"
                            >
                              <Trash2 className="w-2.5 h-2.5 text-red-500" />
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
                  {trips.length ? (page - 1) * perPage + 1 : 0} -{" "}
                  {Math.min(page * perPage, total)} {t("departure.of")} {total}
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
          )}
        </CardContent>
      </Card>
      {/* Success dialog for submitted details */}
      <Dialog open={successDialog} onOpenChange={setSuccessDialog}>
        <DialogContent className="max-h-[90vh] md:max-w-2xl overflow-y-auto overflow-x-hidden max-w-[95vw]  rounded-lg">
          <DialogHeader>
            <DialogTitle>
              <div className="font-semibold text-lg uppercase">
                {t("departure.dialog.socialist_republic_of_vietnam")}
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg p-2 md:p-6 bg-white position-relative">
            {!isMobile && (
              <>
                <div className="flex flex-col items-center justify-center absolute top-50 left-10">
                  <QRCode value={submitted?.form_code || ""} size={50} />
                  <span className="text-xs">
                    {t("departure.dialog.form_qr")}
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center absolute top-50 right-10">
                  <QRCode value={submitted?.trip_code || ""} size={50} />
                  <span className="text-xs">
                    {t("departure.dialog.trip_qr")}
                  </span>
                </div>
              </>
            )}

            <div className="text-center mb-4">
              <div className="font-bold text-base mb-1">
                {t("departure.dialog.independence_freedom_happiness")}
              </div>
              <div className="text-xs mb-2">
                {t(
                  "departure.dialog.socialist_republic_of_vietnam_independence_freedom_happiness"
                )}
              </div>
              <div className="font-semibold text-sm mt-2">
                {t("departure.dialog.general_declaration")}
              </div>
            </div>

            <div className="border-t pt-2 mb-2 font-bold text-lg text-blue-700">
              {t("departure.dialog.vessel_info")}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="col-span-2 gap-2">
                <span className="font-semibold">Vessel ID :</span>
                <Input
                  className="bg-blue-50 flex-1"
                  value={submitted?.vessel || ""}
                  readOnly
                />
              </div>
              {submitted?.owner_name && (
                <div className="col-span-2">
                  <span className="font-semibold">{t("departure.owner")}:</span>
                  <Input
                    className="bg-blue-50 flex-1"
                    value={submitted?.owner_name || ""}
                    readOnly
                  />
                </div>
              )}
              {submitted?.address && (
                <div className="col-span-2 md:col-span-2">
                  <span className="font-semibold">
                    {t("departure.address")}:
                  </span>
                  <Input
                    className="bg-blue-50 flex-1"
                    value={submitted?.address || ""}
                    readOnly
                  />
                </div>
              )}
              <div className="col-span-2">
                <span className="font-semibold">
                  {t("departure.crew_count")}:
                </span>
                <Input
                  className="bg-blue-50 flex-1"
                  value={submitted?.number_of_crew || 1}
                  readOnly
                />
              </div>
              <div className="col-span-2">
                <span className="font-semibold">
                  {t("departure.vessel_type")}:
                </span>
                <Input
                  className="bg-blue-50 flex-1"
                  value={submitted?.vessel_type.toUpperCase() || ""}
                  readOnly
                />
              </div>
              <div className="col-span-2">
                <span className="font-semibold">
                  {t("departure.departure_province")} :
                </span>
                <Input
                  className="bg-blue-50 flex-1"
                  value={submitted?.departure_province || ""}
                  readOnly
                />
              </div>
              <div className="col-span-2">
                <span className="font-semibold">
                  {t("departure.place_of_departure")} :
                </span>
                <Input
                  className="bg-blue-50 flex-1"
                  value={submitted?.place_of_departure || ""}
                  readOnly
                />
              </div>
              <div className="col-span-2">
                <span className="font-semibold">
                  {t("departure.to_region")}
                </span>
                <Input
                  className="bg-blue-50 flex-1"
                  value={submitted?.to_region || ""}
                  readOnly
                />
              </div>
              <div className="col-span-2">
                <span className="font-semibold">
                  {t("departure.departure_date")} :
                </span>
                <Input
                  className="bg-blue-50 flex-1"
                  value={submitted?.departure_date || ""}
                  readOnly
                />
              </div>
              <div className="col-span-2">
                <span className="font-semibold">
                  {t("departure.trip_period")} :
                </span>
                <Input
                  className="bg-blue-50 flex-1"
                  value={submitted?.trip_period || ""}
                  readOnly
                />
              </div>
            </div>
            <div className="flex justify-end mt-8">
              <div className="text-right">
                <div className="mb-2"></div>
                <div>
                  {t("departure.date")}.. {submitted?.departure_date || ""}...
                </div>
                <div className="font-bold mt-4">
                  {t("departure.dialog.captain")}
                </div>
                <div className="text-xs">{t("departure.dialog.master")}</div>
              </div>
            </div>

            {!showStatusSelect ? (
              <div className="w-full flex flex-col md:flex-row justify-between items-center gap-2">
                <Button
                  onClick={() => handleActionButtonClick("update")}
                  className="mt-4 bg-red-500 text-white"
                >
                  {t("departure.dialog.e_submission")}
                </Button>
                <Button
                  onClick={() => handleActionButtonClick("print")}
                  className="mt-4 bg-red-800 text-white"
                >
                  {t("departure.dialog.print")}
                </Button>
              </div>
            ) : (
              <div className="w-full flex flex-col md:flex-row justify-between items-center gap-2">
                <div className="flex flex-row items-center gap-2">
                  <Label className="min-w-1/3">{t("departure.status")}</Label>
                  <select
                    className="min-w-1/2 h-10 rounded p-2 bg-blue-50"
                    value={"Select"}
                    onChange={(e) => handleStatusChange(e.target.value)}
                  >
                    <option value="Select">{t("departure.select")}</option>
                    <option value="Departure">
                      {t("departure.status_options.Departure")}
                    </option>
                    <option value="OnRoad">
                      {t("departure.status_options.OnRoad")}
                    </option>
                    <option value="Catching">
                      {t("departure.status_options.Catching")}
                    </option>
                    <option value="4Sales">
                      {t("departure.status_options.4Sales")}
                    </option>
                    <option value="2Buy">
                      {t("departure.status_options.2Buy")}
                    </option>
                    <option value="4Share">
                      {t("departure.status_options.4Share")}
                    </option>
                    <option value="2Share">
                      {t("departure.status_options.2Share")}
                    </option>
                    <option value="Full">
                      {t("departure.status_options.Full")}
                    </option>
                    <option value="Return Port">
                      {t("departure.status_options.Return Port")}
                    </option>
                    <option value="Docking">
                      {t("departure.status_options.Docking")}
                    </option>
                  </select>
                </div>
                <Button
                  onClick={() => {
                    setShowStatusSelect(false);
                    setActionType(null);
                  }}
                  className="mt-4 bg-gray-500 text-white"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Departure() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title={t("departure.title")} />
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
               bg-gradient-to-r from-black to-[#1306ad] text-[#f8f603] rounded-md px-4 md:px-5
                  h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                  text-xs md:text-base
                  w-38 md:w-38 lg:w-52
              `}
            >
              <span className="truncate">{t("departure.title")}</span>
            </button>
          </Link>
          <Link to="/request-to-dock/dock" className="flex-shrink-0">
            <button
              className={`
                bg-gradient-to-r from-[#a8a8a8] to-[#fdfdfd] text-black rounded-md px-4 md:px-5
                  h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                  text-xs md:text-base
                w-38 md:w-38 lg:w-52 shadow-lg hover:shadow-xl transition-all duration-300
              `}
            >
              <span className="truncate">{t("departure.request_to_dock")}</span>
            </button>
          </Link>
        </div>
        <DepartureContainer />
      </SidebarInset>
    </SidebarProvider>
  );
}
