import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import { useEffect, useState, useCallback } from "react";
import { Upload, Plus } from "lucide-react";
import { useLanguageStore } from "@/stores/language-store";
import { useTranslation } from "@/hooks/use-translation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import CatchRecordsChart from "@/components/dashboard/fleet/CatchRecordsChart";
import FuelConsumptionChart from "@/components/dashboard/fleet/FuelConsumptionChart";
import VesselEditForm from "@/components/dashboard/fleet/VesselEditForm";
import { API_ENDPOINTS, APP_CONFIG } from "@/lib/constants";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type CatchRecord = {
  id: string;
  created_at: string;
  haul_id: {
    id: string;
    trip_id: string;
    fishing_trips: {
      id: string;
      to_region: string;
      vessel_id: string;
      vessels: {
        id: string;
        name: string;
        type: string;
        registration_number: string;
        user_id: string;
      };
    };
  };
};

type VesselInfo = Database["public"]["Tables"]["vessels"]["Row"] & {
  current_zone?: string;
  current_trip_id?: string;
  trip_status?: string;
  fileUrl?: string;
};

type FishingTrip = Database["public"]["Tables"]["fishing_trips"]["Row"];

interface FuelData {
  id: number;
  trip_id: string | null;
  vessel_id: string | null;
  start_mileage: number | null;
  end_mileage: number | null;
  refueling_volume: number | null;
  fuel_consumption: string | null;
  refueling_date: string | null;
  remarks: string | null;
  fishing_trips?: {
    trip_code: string | null;
  };
  trip_label?: string;
}

interface EmptyFuelRow {
  id: string;
  trip_code: string;
  edit_date: string;
  trip_days: string | number;
  start_mileage: string | number;
  end_mileage: string | number;
  refueling_volume: number;
  fuel_consumption: string | number;
  remarks: string;
  isEmpty: true;
  fishing_trips?: {
    trip_code: string | null;
  };
}

type FuelDisplayRecord = FuelData | EmptyFuelRow;

interface VesselDetailsProps {
  vessel: VesselInfo;
}

// Add custom input component with styled border
const StyledInput = ({ className = "", ...props }) => (
  <Input
    className={`
      !border-2 
      !border-black 
      !ring-0 
      !ring-offset-0 
      focus:!border-blue-500 
      focus:!ring-0 
      hover:!border-gray-400 
      transition-colors 
      rounded-md 
      px-3 
      py-2 
      ${className}
    `}
    {...props}
  />
);

export default function VesselDetails({ vessel }: VesselDetailsProps) {
  const { t } = useTranslation();
  const { language } = useLanguageStore();
  const { user } = useAuthStore();
  const { user: authUser, checkAuth } = useAuth();
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [catchRecords, setCatchRecords] = useState<CatchRecord[]>([]);
  const [trips, setTrips] = useState<FishingTrip[]>([]);
  const [fuelData, setFuelData] = useState<FuelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [addFuelDialogOpen, setAddFuelDialogOpen] = useState(false);
  const [catchProductionData, setCatchProductionData] = useState([
    { name: "TỔNG KHAI THÁC", value: 0, color: "#3B82F6" },
    { name: "TỔNG BÁN", value: 0, color: "#EF4444" },
    { name: "TỔNG CHUYỂN TẢI", value: 0, color: "#F97316" },
    { name: "TỔNG TRÊN TÀU", value: 0, color: "#10B981" },
  ]);
  const [mapDialog, setMapDialog] = useState({
    isOpen: false,
    latitude: null as number | null,
    longitude: null as number | null,
    vesselName: "",
  });

  const [newFuelData, setNewFuelData] = useState({
    trip_code: "",
    edit_date: new Date().toISOString().split("T")[0],
    trip_days: 0,
    start_mileage: 0,
    end_mileage: 0,
    refueling_volume: 0,
    fuel_consumption: 0,
    remarks: "",
  });

  const isAuthorized =
    user?.role === "Admin" || vessel?.user_id === user?.auth_id;

  // Mock data for charts based on the images
  const fisheryProductData = [
    { name: "CÁ", value: 40, color: "#FCD34D" },
    { name: "GIÁP SÁC", value: 30, color: "#F97316" },
    { name: "NHUYỄN THỂ", value: 20, color: "#EC4899" },
    { name: "KHÁC", value: 10, color: "#6B7280" },
  ];

  const portProductionData = [
    {
      name: "Nha Trang",
      fish: 120,
      crustaceans: 80,
      mollusks: 40,
      others: 20,
      growthRate: 16,
    },
    {
      name: "Phan Thiết",
      fish: 150,
      crustaceans: 100,
      mollusks: 50,
      others: 30,
      growthRate: 33,
    },
    {
      name: "BR. Vũng Tàu",
      fish: 100,
      crustaceans: 70,
      mollusks: 35,
      others: 15,
      growthRate: 20,
    },
    {
      name: "Cà Mau",
      fish: 60,
      crustaceans: 0,
      mollusks: 0,
      others: 0,
      growthRate: 20,
    },
    {
      name: "Bình Định",
      fish: 40,
      crustaceans: 0,
      mollusks: 0,
      others: 0,
      growthRate: 10,
    },
  ];

  const fetchCatchRecords = useCallback(async () => {
    if (!vessel?.id) return;

    try {
      // First get all trips for this vessel
      const { data: trips, error: tripsError } = await supabase
        .from("fishing_trips")
        .select("id")
        .eq("vessel_id", vessel.id);

      if (tripsError) throw tripsError;
      if (!trips?.length) {
        setCatchRecords([]);
        return;
      }

      // Get all hauls for these trips
      const { data: hauls, error: haulsError } = await supabase
        .from("fishing_hauls")
        .select("id")
        .in(
          "trip_id",
          trips.map((t) => t.id)
        );

      if (haulsError) throw haulsError;
      if (!hauls?.length) {
        setCatchRecords([]);
        return;
      }

      // Get catch records for these hauls
      const { data, error } = await supabase
        .from("catch_records")
        .select(
          `
          id,
          created_at,
          haul_id!inner (
            id,
            trip_id,
            fishing_trips!inner (
              id,
              to_region,
              vessel_id,
              vessels!inner (
                id,
                name,
                type,
                registration_number,
                user_id
              )
            )
          )
        `
        )
        .in(
          "haul_id",
          hauls.map((h) => h.id)
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCatchRecords(data || []);
    } catch (error) {
      console.error("Error fetching catch records:", error);
      setCatchRecords([]);
    }
  }, [vessel?.id]);

  const fetchTrips = useCallback(async () => {
    if (!vessel?.id) return;

    try {
      const { data: tripsData } = await supabase
        .from("fishing_trips")
        .select("*")
        .eq("vessel_id", vessel.id)
        .order("created_at", { ascending: false });

      setTrips(tripsData || []);
    } catch (error) {
      console.error("Error fetching trips:", error);
      setTrips([]);
    }
  }, [vessel?.id]);

  const fetchFuelData = useCallback(async () => {
    if (!vessel?.id) return;

    try {
      const { data: fuelRows, error } = await supabase
        .from("fuel_consumption")
        .select("*, fishing_trips(trip_code)")
        .eq("vessel_id", vessel.id)
        .order("refueling_date", { ascending: false });

      if (error) throw error;

      // Process fuel data to ensure proper structure for chart
      const processedFuelData: FuelData[] = (fuelRows || []).map(
        (record: any, index: number) => ({
          ...record,
          trip_label: record?.fishing_trips?.trip_code || `Trip ${index + 1}`,
          refueling_volume: record?.refueling_volume ?? 0,
        })
      );

      setFuelData(processedFuelData);
    } catch (error) {
      console.error("Error fetching fuel data:", error);
      setFuelData([]);
    }
  }, [vessel?.id]);

  const calculateTripDays = (departureDate: string, returnDate?: string) => {
    const start = new Date(departureDate);
    const end = returnDate ? new Date(returnDate) : new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateCatchProductionData = useCallback(async () => {
    if (!vessel?.id) return;

    try {
      // Get all trips for this vessel
      const { data: vesselTrips } = await supabase
        .from("fishing_trips")
        .select("id")
        .eq("vessel_id", vessel.id);

      if (!vesselTrips?.length) {
        setCatchProductionData([
          { name: "TỔNG KHAI THÁC", value: 0, color: "#3B82F6" },
          { name: "TỔNG BÁN", value: 0, color: "#EF4444" },
          { name: "TỔNG CHUYỂN TẢI", value: 0, color: "#F97316" },
          { name: "TỔNG TRÊN TÀU", value: 0, color: "#10B981" },
        ]);
        return;
      }

      const tripIds = vesselTrips.map((trip) => trip.id);

      // Get all hauls for these trips
      const { data: hauls } = await supabase
        .from("fishing_hauls")
        .select("id")
        .in("trip_id", tripIds);

      if (!hauls?.length) {
        setCatchProductionData([
          { name: "TỔNG KHAI THÁC", value: 0, color: "#3B82F6" },
          { name: "TỔNG BÁN", value: 0, color: "#EF4444" },
          { name: "TỔNG CHUYỂN TẢI", value: 0, color: "#F97316" },
          { name: "TỔNG TRÊN TÀU", value: 0, color: "#10B981" },
        ]);
        return;
      }

      const haulIds = hauls.map((haul) => haul.id);

      // Get catch records with net_kg_per_case
      const { data: catchRecords } = await supabase
        .from("catch_records")
        .select("id, quantity, net_kg_per_case")
        .in("haul_id", haulIds);

      // Get vessel transactions (sales)
      const { data: vesselTransactions } = await supabase
        .from("vessel_transactions")
        .select("quantity, catch_record_id")
        .in("trip_id", tripIds);

      // Get product orders (transfers)
      const { data: productOrders } = await supabase
        .from("product_orders")
        .select("quantity_load")
        .in("trip_id", tripIds);

      // Calculate totals
      let totalCatch = 0;
      let totalSold = 0;
      let totalTransferred = 0;
      let totalOnVessel = 0;

      // Calculate total catch from catch_records
      const catchRecordsArr = (catchRecords || []) as {
        id: string;
        quantity: number | string | null;
        net_kg_per_case: string | null;
      }[];
      if (catchRecordsArr.length) {
        totalCatch = catchRecordsArr.reduce((sum, record) => {
          const quantity = parseFloat(record.quantity?.toString() || "0");
          const netKgPerCase = parseFloat(record.net_kg_per_case || "0");
          return sum + quantity * netKgPerCase;
        }, 0);
      }

      // Calculate total sold from vessel_transactions
      const vesselTransactionsArr = (vesselTransactions || []) as {
        quantity: number | string | null;
        catch_record_id?: string;
      }[];
      if (vesselTransactionsArr.length) {
        totalSold = vesselTransactionsArr.reduce((sum, transaction) => {
          return sum + parseFloat(transaction.quantity?.toString() || "0");
        }, 0);
      }

      // Calculate total transferred from product_orders
      const productOrdersArr = (productOrders || []) as {
        quantity_load: number | string | null;
      }[];
      if (productOrdersArr.length) {
        totalTransferred = productOrdersArr.reduce((sum, order) => {
          return sum + parseFloat(order.quantity_load?.toString() || "0");
        }, 0);
      }

      // Calculate remaining on vessel
      totalOnVessel = totalCatch - totalSold - totalTransferred;

      setCatchProductionData([
        {
          name: "TỔNG KHAI THÁC",
          value: Math.round(totalCatch),
          color: "#3B82F6",
        },
        { name: "TỔNG BÁN", value: Math.round(totalSold), color: "#EF4444" },
        {
          name: "TỔNG CHUYỂN TẢI",
          value: Math.round(totalTransferred),
          color: "#F97316",
        },
        {
          name: "TỔNG TRÊN TÀU",
          value: Math.round(totalOnVessel),
          color: "#10B981",
        },
      ]);
    } catch (error) {
      console.error("Error calculating catch production data:", error);
      setCatchProductionData([
        { name: "TỔNG KHAI THÁC", value: 0, color: "#3B82F6" },
        { name: "TỔNG BÁN", value: 0, color: "#EF4444" },
        { name: "TỔNG CHUYỂN TẢI", value: 0, color: "#F97316" },
        { name: "TỔNG TRÊN TÀU", value: 0, color: "#10B981" },
      ]);
    }
  }, [vessel?.id]);

  const handleAddFuelData = async () => {
    try {
      const { error } = await supabase.from("fuel_consumption").insert({
        vessel_id: vessel.id,
        trip_id: trips[0]?.id,
        start_mileage: newFuelData.start_mileage,
        end_mileage: newFuelData.end_mileage,
        refueling_volume: newFuelData.refueling_volume,
        fuel_consumption: String(newFuelData.fuel_consumption),
        refueling_date: newFuelData.edit_date,
        remarks: newFuelData.remarks,
      });

      if (error) throw error;

      setAddFuelDialogOpen(false);
      fetchFuelData();

      // Reset form
      setNewFuelData({
        trip_code: "",
        edit_date: new Date().toISOString().split("T")[0],
        trip_days: 0,
        start_mileage: 0,
        end_mileage: 0,
        refueling_volume: 0,
        fuel_consumption: 0,
        remarks: "",
      });
    } catch (error) {
      console.error("Error adding fuel data:", error);
    }
  };

  const handleEditVessel = async () => {
    if (!vessel) return;
    setEditDialogOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    try {
      setIsUploading(true);
      let imageOneUrl = file;
      if (file instanceof File) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folderName", "vessels");

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
        imageOneUrl = fileUrl;

        console.log("imageOneUrl", imageOneUrl);

        // Update vessel record with new image URL
        const { error: updateError, data: updatedVessel } = await supabase
          .from("vessels")
          .update({ image_url: imageOneUrl })
          .eq("id", vessel?.id)
          .select()
          .single();

        console.log("updatedVessel?.image_url", updatedVessel?.image_url);

        if (updateError) throw updateError;

        // Show success toast
        toast({
          title: "Image uploaded successfully",
          description: "Vessel image has been updated.",
          variant: "default",
        });

        // Refresh vessel data to show the new image
        if (vessel?.id && updatedVessel) {
          // Update the vessel prop with new data
          Object.assign(vessel, updatedVessel);
        }
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Failed to upload image",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred while uploading the image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (vessel?.id) {
      console.log("vessel?.image_url", vessel?.image_url);
      fetchCatchRecords();
      fetchTrips();
      fetchFuelData();
      calculateCatchProductionData(); // Call the new function here
    }
  }, [
    vessel?.id,
    fetchCatchRecords,
    fetchTrips,
    fetchFuelData,
    calculateCatchProductionData,
  ]);

  // Auto-fill form when opening dialog
  useEffect(() => {
    if (addFuelDialogOpen && trips.length > 0) {
      const latestTrip = trips[0];
      const tripDays = latestTrip.departure_date
        ? calculateTripDays(latestTrip.departure_date, latestTrip.return_date)
        : 0;

      // Auto-fill from fishing_trips info
      setNewFuelData((prev) => ({
        ...prev,
        trip_code: latestTrip.trip_code,
        edit_date: latestTrip.departure_date
          ? new Date(latestTrip.departure_date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        trip_days: tripDays,
      }));

      // Auto-fill from last fuel record if exists
      if (fuelData.length > 0) {
        const lastRecord = fuelData[0];
        setNewFuelData((prev) => ({
          ...prev,
          start_mileage: lastRecord.end_mileage || 0,
          end_mileage: lastRecord.end_mileage || 0,
          refueling_volume: lastRecord.refueling_volume || 0,
          remarks: lastRecord.remarks || "",
        }));
      }
    }
  }, [addFuelDialogOpen, trips, fuelData]);

  // Generate empty rows when no fuel data exists
  const generateEmptyRows = (): EmptyFuelRow[] => {
    const emptyRows = [];
    for (let i = 0; i < 3; i++) {
      emptyRows.push({
        id: `empty-${i}`,
        trip_code: `${3 - i}`,
        edit_date: "dd/mm/yy",
        trip_days: "#days",
        start_mileage: ".........",
        end_mileage: ".........",
        refueling_volume: 0,
        fuel_consumption: ".........",
        remarks: i === 0 ? "OnTrip" : "End trip",
        isEmpty: true,
      });
    }
    return emptyRows;
  };

  const displayFuelData: FuelDisplayRecord[] =
    fuelData.length > 0 ? fuelData : generateEmptyRows();

  return (
    <div className="vessel-details rounded-lg shadow-lg mb-8">
      {/* Header */}
      <div className="p-6 flex justify-center items-center relative">
        <div
          className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#31b1d6] to-blue-600 z-0"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        ></div>
        <div
          className="flex justify-center items-center bg-background p-2 "
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <h1 className="text-red-500 font-bold text-xl text-center z-10">
            {vessel.name}
          </h1>
        </div>
        <div></div>
      </div>

      {/* Vessel Image */}
      <div className="relative">
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={async (e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file && isAuthorized) {
              setImage(file);
              await handleImageUpload(file);
            }
          }}
          onClick={() => {
            if (isAuthorized) {
              document
                .getElementById(`file-upload-input-${vessel.id}`)
                ?.click();
            }
          }}
          className={`relative w-full h-64 cursor-pointer transition-colors ${
            isDragging ? "bg-blue-50" : ""
          } ${isUploading ? "opacity-50" : ""}`}
        >
          {vessel.image_url ? (
            <div className="relative w-full h-full group">
              <img
                src={vessel.image_url}
                alt="Vessel"
                className="w-full h-full object-cover rounded-lg"
              />
              {/* Overlay for click functionality */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Upload size={32} className="text-white" />
                </div>
              </div>
              {/* Mobile touch indicator */}
              <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                Change
              </div>
            </div>
          ) : image ? (
            <div className="relative w-full h-full group">
              <img
                src={image instanceof File ? URL.createObjectURL(image) : image}
                alt="Vessel"
                className="w-full h-full object-cover rounded-lg"
              />
              {/* Overlay for click functionality */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Upload size={32} className="text-white" />
                </div>
              </div>
              {/* Mobile touch indicator */}
              <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                Change
              </div>
            </div>
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-lg">
              <div className="text-center">
                <Upload size={48} className="text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">
                  {isUploading
                    ? "Uploading..."
                    : "Click or drag to upload image"}
                </p>
              </div>
            </div>
          )}

          <input
            id={`file-upload-input-${vessel.id}`}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file && isAuthorized) {
                setImage(file);
                await handleImageUpload(file);
              }
            }}
          />

          {/* Upload overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p>Uploading image...</p>
              </div>
            </div>
          )}
        </div>

        {/* Vessel Type Badge */}
        <div className="absolute bottom-4 left-4">
          <span className="bg-blue-900 text-white px-4 py-2 rounded">
            Tàu Khai Thác
          </span>
        </div>

        <div className="absolute bottom-4 right-4">
          <Button
            onClick={async () => {
              const { data: updateData, error: updateError } = await supabase
                .from("users")
                .update({
                  default_vessel: vessel.id,
                  updated_at: new Date().toISOString(),
                })
                .eq("auth_id", user.auth_id)
                .select();
              if (updateError) {
                console.error("Error updating user:", updateError);
                toast({
                  title: "Error",
                  description: "Failed to update user",
                  variant: "destructive",
                });
                return;
              }
              // Refresh auth user profile so UI reflects the new default immediately
              await checkAuth();
              toast({
                title: "Success",
                description: "Vessel updated successfully",
                variant: "default",
              });
            }}
            className="bg-red-900 text-white px-4 py-2 rounded"
          >
            {vessel.id === authUser?.default_vessel ? "Default" : "Make Default"}
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Vessel Information Section */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              THÔNG TIN TÀU (Tàu đã cấp quyền)
            </h2>
            <Button
              variant="outline"
              size="sm"
              className="bg-blue-100 text-blue-600"
            >
              Chi tiết thông tin &gt;
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <InfoField label="Vessel ID" value={vessel.registration_number} />
              <InfoField label="Trip ID" value={trips[0]?.trip_code || "N/A"} />
              <InfoField label="Captain" value={vessel.captain_name || "N/A"} />
              <InfoField label="Contact#" value="N/A" />
            </div>
            <div className="space-y-4">
              <InfoField
                label="Trip status"
                value={vessel.trip_status || "N/A"}
              />
              <InfoField label="Port" value="N/A" />
              <InfoField label="GPS" value="N/A" disabled />
              <InfoField label="Zone" value={vessel.current_zone || "N/A"} />
            </div>
          </div>
        </div>

        {/* Catch Production Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">SẢN LƯỢNG KHAI THÁC</h2>

          {/* Summary Boxes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {catchProductionData.map((item) => (
              <div
                key={item.name}
                className="p-4 rounded-lg text-white"
                style={{ backgroundColor: item.color }}
              >
                <div className="text-sm mb-2">{item.name}</div>
                <div className="text-2xl font-bold mb-2">{item.value} KG</div>
                <div className="text-xs underline cursor-pointer">
                  View more details &gt;&gt;
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Pie Chart */}
            <div
              className="p-4 rounded-lg border"
              style={{ backgroundColor: "#E6F3FF" }}
            >
              <h3 className="text-lg font-semibold mb-4 text-blue-900">
                SẢN LƯỢNG THỦY SẢN KHAI THÁC
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={fisheryProductData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                  >
                    {fisheryProductData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-400 rounded mr-2"></div>
                  <span className="text-sm font-medium">CÁ</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-orange-500 rounded mr-2"></div>
                  <span className="text-sm font-medium">
                    GIÁP SÁC (Tôm, Cua, Ghẹ,...)
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-pink-500 rounded mr-2"></div>
                  <span className="text-sm font-medium">
                    NHUYỄN THỂ (Bào Ngư, Sò,...)
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-500 rounded mr-2"></div>
                  <span className="text-sm font-medium">KHÁC</span>
                </div>
              </div>
            </div>

            {/* Bar Chart */}
            <div
              className="p-4 rounded-lg border"
              style={{
                background: "linear-gradient(135deg, #E6F3FF 0%, #E6F7E6 100%)",
              }}
            >
              <h3 className="text-lg font-semibold mb-4 text-blue-900">
                SẢN LƯỢNG THỦY SẢN THEO CẢNG
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={portProductionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#B8D4F0" />
                  <XAxis dataKey="name" stroke="#2E5BBA" />
                  <YAxis stroke="#2E5BBA" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="fish" stackId="a" fill="#FCD34D" />
                  <Bar dataKey="crustaceans" stackId="a" fill="#F97316" />
                  <Bar dataKey="mollusks" stackId="a" fill="#EC4899" />
                  <Bar dataKey="others" stackId="a" fill="#6B7280" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-5 gap-2 text-xs">
                {portProductionData.map((port) => (
                  <div key={port.name} className="text-center">
                    <div className="text-green-600 text-lg">↗</div>
                    <div className="text-gray-600">Growth Rate</div>
                    <div className="font-semibold text-blue-900">
                      {port.growthRate}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Fuel Consumption Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold mb-2 text-blue-900">
                LƯỢNG DẦU TIÊU THỤ
              </h2>
              <p className="text-gray-600">
                Chi tiết chỉ số lượng dầu tiêu thụ
              </p>
            </div>
            <Button
              onClick={() => setAddFuelDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Fuel Consumption Record
            </Button>
          </div>

          <div className="bg-white rounded-lg border overflow-hidden">
            {/* Dark Blue Header Bar */}
            <div className="bg-blue-900 p-4">
              <h3 className="text-white font-bold text-center text-lg">
                FUEL CONSUMPTION STATISTICS
              </h3>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-blue-400">
                    <th className="px-4 py-3 text-white font-bold text-center text-sm">
                      Trip #
                    </th>
                    <th className="px-4 py-3 text-white font-bold text-center text-sm">
                      Edit Date
                    </th>
                    <th className="px-4 py-3 text-white font-bold text-center text-sm">
                      Trip days (days)
                    </th>
                    <th className="px-4 py-3 text-white font-bold text-center text-sm">
                      Start mileage (km)
                    </th>
                    <th className="px-4 py-3 text-white font-bold text-center text-sm">
                      End mileage (km)
                    </th>
                    <th className="px-4 py-3 text-white font-bold text-center text-sm">
                      Refueling volume (L)
                    </th>
                    <th className="px-4 py-3 text-white font-bold text-center text-sm">
                      Fuel consumption (L/100km)
                    </th>
                    <th className="px-4 py-3 text-white font-bold text-center text-sm">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayFuelData.map((record, index) => (
                    <tr
                      key={record.id}
                      className={`${
                        index === 0 ? "bg-yellow-100 font-bold" : "bg-white"
                      } border-b border-gray-200`}
                    >
                      <td className="px-4 py-3 text-center text-sm">
                        {record.fishing_trips?.trip_code || record.trip_code}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {record.isEmpty
                          ? record.edit_date
                          : new Date(
                              record.refueling_date
                            ).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {record.isEmpty ? record.trip_days : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {record.isEmpty
                          ? record.start_mileage
                          : record.start_mileage}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {record.isEmpty
                          ? record.end_mileage
                          : record.end_mileage}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {record.isEmpty
                          ? record.refueling_volume
                          : typeof record.refueling_volume === "number"
                          ? record.refueling_volume.toFixed(1)
                          : record.refueling_volume || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {record.isEmpty
                          ? record.fuel_consumption
                          : typeof record.fuel_consumption === "number"
                          ? record.fuel_consumption.toFixed(1)
                          : record.fuel_consumption || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {record.isEmpty ? record.remarks : record.remarks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Fuel Consumption Chart */}
        <div className="bg-white rounded-lg border overflow-hidden">
          {/* Dark Blue Header */}
          <div className="bg-blue-900 p-4">
            <h3 className="text-yellow-400 font-bold text-center text-lg">
              CHART FUEL CONSUMPTION
            </h3>
          </div>

          <div className="p-4">
            <div className="relative max-w-2xl mx-auto">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={fuelData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  barSize={60}
                  barGap={8}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                  <XAxis
                    dataKey="trip_label"
                    stroke="#2E5BBA"
                    tick={{ fontSize: 12, fill: "#2E5BBA" }}
                  />
                  <YAxis
                    label={{
                      value: "Refueling volume (L)",
                      angle: -90,
                      position: "insideLeft",
                      style: { textAnchor: "middle", fill: "#2E5BBA" },
                    }}
                    stroke="#2E5BBA"
                    tick={{ fontSize: 12, fill: "#2E5BBA" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                    }}
                  />
                  <Bar
                    dataKey="refueling_volume"
                    fill="#3B82F6"
                    radius={[2, 2, 0, 0]}
                    maxBarSize={80}
                  />
                </BarChart>
              </ResponsiveContainer>

              {/* Fuel can icon */}
              <div className="absolute top-4 right-4">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 2H16L18 4V6H20V8H18V10H20V12H18V14H20V16H18V18H20V20H18V22H6V20H4V18H6V16H4V14H6V12H4V10H6V8H4V6H6V4L8 2Z"
                    stroke="#3B82F6"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <path d="M8 6H16V18H8V6Z" fill="#3B82F6" fillOpacity="0.1" />
                  <circle
                    cx="12"
                    cy="12"
                    r="2"
                    fill="#3B82F6"
                    fillOpacity="0.3"
                  />
                </svg>
              </div>
            </div>

            {/* Year label at bottom */}
            <div className="text-center mt-4">
              <span className="text-sm text-gray-600 font-medium">
                NĂM 2025
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Fuel Data Dialog */}
      <Dialog open={addFuelDialogOpen} onOpenChange={setAddFuelDialogOpen}>
        <DialogContent className="max-w-2xl bg-light-foreground">
          <DialogHeader>
            <DialogTitle className="text-center text-white">
              Add Fuel Consumption Record
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="edit_date"
                  className="text-gray-500 font-medium mb-1"
                >
                  Edit Date
                </Label>
                <StyledInput
                  id="edit_date"
                  type="date"
                  value={newFuelData.edit_date}
                  onChange={(e) =>
                    setNewFuelData((prev) => ({
                      ...prev,
                      edit_date: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="trip_days"
                  className="text-gray-500 font-medium mb-1"
                >
                  Trip days (days)
                </Label>
                <StyledInput
                  id="trip_days"
                  type="number"
                  value={newFuelData.trip_days}
                  onChange={(e) =>
                    setNewFuelData((prev) => ({
                      ...prev,
                      trip_days: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div>
                <Label
                  htmlFor="start_mileage"
                  className="text-gray-500 font-medium mb-1"
                >
                  Start mileage (km)
                </Label>
                <StyledInput
                  id="start_mileage"
                  type="number"
                  value={newFuelData.start_mileage}
                  onChange={(e) => {
                    const startMileage = Number(e.target.value);
                    const fuelConsumption =
                      newFuelData.refueling_volume > 0
                        ? ((newFuelData.end_mileage - startMileage) /
                            newFuelData.refueling_volume) *
                          100
                        : 0;
                    setNewFuelData((prev) => ({
                      ...prev,
                      start_mileage: startMileage,
                      fuel_consumption: fuelConsumption,
                    }));
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="end_mileage"
                  className="text-gray-500 font-medium mb-1"
                >
                  End mileage (km)
                </Label>
                <StyledInput
                  id="end_mileage"
                  type="number"
                  value={newFuelData.end_mileage}
                  onChange={(e) => {
                    const endMileage = Number(e.target.value);
                    const fuelConsumption =
                      newFuelData.refueling_volume > 0
                        ? ((endMileage - newFuelData.start_mileage) /
                            newFuelData.refueling_volume) *
                          100
                        : 0;
                    setNewFuelData((prev) => ({
                      ...prev,
                      end_mileage: endMileage,
                      fuel_consumption: fuelConsumption,
                    }));
                  }}
                />
              </div>
              <div>
                <Label
                  htmlFor="refueling_volume"
                  className="text-gray-500 font-medium mb-1"
                >
                  Refueling volume (L)
                </Label>
                <StyledInput
                  id="refueling_volume"
                  type="number"
                  value={newFuelData.refueling_volume}
                  onChange={(e) => {
                    const refuelingVolume = Number(e.target.value);
                    const fuelConsumption =
                      refuelingVolume > 0
                        ? ((newFuelData.end_mileage -
                            newFuelData.start_mileage) /
                            refuelingVolume) *
                          100
                        : 0;
                    setNewFuelData((prev) => ({
                      ...prev,
                      refueling_volume: refuelingVolume,
                      fuel_consumption: fuelConsumption,
                    }));
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="fuel_consumption"
                  className="text-gray-500 font-medium mb-1"
                >
                  Fuel consumption (L/100km)
                </Label>
                <StyledInput
                  id="fuel_consumption"
                  type="number"
                  value={newFuelData.fuel_consumption}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div>
                <Label
                  htmlFor="remarks"
                  className="text-gray-500 font-medium mb-1"
                >
                  Remarks
                </Label>
                <StyledInput
                  id="remarks"
                  value={newFuelData.remarks}
                  onChange={(e) =>
                    setNewFuelData((prev) => ({
                      ...prev,
                      remarks: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <Button
              onClick={handleAddFuelData}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2"
            >
              Save Record
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] bg-light-foreground overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              Edit Vessel Information
            </DialogTitle>
          </DialogHeader>
          <VesselEditForm
            vesselId={vessel.id}
            initialData={{
              name: vessel.name,
              type: vessel.type,
              type_of_vessel: "",
              fileUrl: "",
              registration_number: vessel.registration_number,
              captain_name: vessel.captain_name || "",
              owner_name: "",
              owner_id: "",
              owner_id_card: "",
              residential_address: "",
              capacity: vessel.capacity?.toString() || "",
              length: vessel.length?.toString() || "",
              width: "",
              draught: "",
              hull_material: "",
              materials: "",
              number_of_engines: "",
              engine_power: "",
              engine_model: "",
              engine_serial_number: "",
              port_of_registry: "",
              port_registry: "",
              vessel_type_from_doc: "",
              type_of_machine: "",
              gross_tonnage: "",
              crew_count: "",
              fishing_method: "",
              fishery_permit: vessel.fishery_permit || "",
              expiration_date: vessel.expiration_date || "",
              number_engines: 0,
              fishing_gear: {
                purse_seine: false,
                hook: false,
                net: false,
                trawl: false,
              },
            }}
            onClose={() => setEditDialogOpen(false)}
            onSuccess={() => {
              fetchTrips();
              fetchCatchRecords();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

const InfoField = ({
  label,
  value,
  disabled = false,
}: {
  label: string;
  value: string | number;
  disabled?: boolean;
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <input
      type="text"
      value={value}
      readOnly
      disabled={disabled}
      className={`w-full p-2 border rounded-md ${
        disabled ? "bg-gray-100 text-gray-500" : "bg-white"
      }`}
    />
  </div>
);
