import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import { Upload } from "lucide-react";
import { useLanguageStore } from "@/stores/language-store";
import { useTranslation } from "@/hooks/use-translation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import OpenSeaMapView from "@/components/OpenSeaMapView";
import CatchRecordsChart from "@/components/dashboard/fleet/CatchRecordsChart";
import FuelConsumptionChart from "@/components/dashboard/fleet/FuelConsumptionChart";
import VesselEditForm from "@/components/dashboard/fleet/VesselEditForm";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { API_ENDPOINTS, APP_CONFIG } from "@/lib/constants";
import { Database } from "@/integrations/supabase/types";

// Remove ProductOrder interface since product_orders table doesn't exist
// Remove FuelData interface since fuel_consumption table doesn't exist

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

// Update VesselInfo to match actual database schema
type VesselInfo = Database["public"]["Tables"]["vessels"]["Row"] & {
  current_zone?: string;
  current_trip_id?: string;
  trip_status?: string;
  fileUrl?: string;
};

type RegionStatus = {
  departure: string;
  onRoad: string;
  catching: string;
  sales: string;
  buy: string;
  share4: string;
  share2: string;
  full: string;
  returnPort: string;
  docking: string;
};

type FishingTrip = Database["public"]["Tables"]["fishing_trips"]["Row"];

const FISHING_REGIONS = [
  "D. Hai Phong - Quang Ninh (Vinh Bac Bo)",
  "C. Hoang Sa - Truong Sa",
  "B. NThuan - BThuan - BR. Vung Tau",
  "A. Ca Mau - Kien Giang",
];

export default function VesselDetails() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { language } = useLanguageStore();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [vessel, setVessel] = useState<VesselInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [regionStatuses, setRegionStatuses] = useState<RegionStatus[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [catchRecords, setCatchRecords] = useState<CatchRecord[]>([]);
  const [trips, setTrips] = useState<FishingTrip[]>([]);

  // Remove vesselStats and selectedStat since product_orders table doesn't exist
  const [mapDialog, setMapDialog] = useState({
    isOpen: false,
    latitude: null as number | null,
    longitude: null as number | null,
    vesselName: "",
  });

  const isAuthorized =
    user?.role === "Admin" || vessel?.user_id === user?.auth_id;

  useEffect(() => {
    if (id) {
      fetchVesselDetails();
      fetchCatchRecords();
    }
  }, [id]);

  const fetchCatchRecords = async () => {
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
  };

  const fetchVesselDetails = async () => {
    try {
      console.log("Fetching vessel with id:", id);

      // First find the vessel by id
      const { data: vesselData, error } = await supabase
        .from("vessels")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching vessel:", error);

        // If no vessel found, let's check what vessels exist
        const { data: allVessels, error: allVesselsError } = await supabase
          .from("vessels")
          .select("id, name, registration_number")
          .limit(5);

        if (allVesselsError) {
          console.error("Error fetching all vessels:", allVesselsError);
        } else {
          console.log("Available vessels:", allVessels);

          // If no vessels exist, create a test vessel
          if (!allVessels || allVessels.length === 0) {
            console.log(
              "No vessels found in database. Creating a test vessel..."
            );
            const { data: newVessel, error: createError } = await supabase
              .from("vessels")
              .insert({
                name: "Test Vessel",
                registration_number: "TEST001",
                type: "mining",
                user_id: user?.auth_id || "test-user",
                captain_name: "Test Captain",
                capacity: 1000,
                length: 50,
              })
              .select()
              .single();

            if (createError) {
              console.error("Error creating test vessel:", createError);
            } else {
              console.log("Created test vessel:", newVessel);
              // If the registration number matches our test vessel, use it
              if (registration_number === "TEST001") {
                setVessel({
                  ...newVessel,
                  current_zone: "Unknown",
                  current_trip_id: "N/A",
                  trip_status: "N/A",
                });
                setTrips([]);
                setLoading(false);
                return;
              }
            }
          }
        }

        throw error;
      }

      console.log("Found vessel:", vesselData);

      // Get the latest trip info
      const { data: latestTrip } = await supabase
        .from("fishing_trips")
        .select("*")
        .eq("vessel_id", vesselData.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      setVessel({
        ...vesselData,
        current_zone: latestTrip?.to_region || "Unknown",
        current_trip_id: latestTrip?.id || "N/A",
        trip_status: latestTrip?.status || "N/A",
      });

      // Fetch trips for this vessel
      const { data: tripsData } = await supabase
        .from("fishing_trips")
        .select("*")
        .eq("vessel_id", vesselData.id)
        .order("created_at", { ascending: false });

      setTrips(tripsData || []);

      // Fetch region statuses (mock data for now - replace with actual data)
      const mockRegionStatuses = FISHING_REGIONS.map(() => ({
        departure: "...",
        onRoad: "...",
        catching: "...",
        sales: "...",
        buy: "...",
        share4: "...",
        share2: "...",
        full: "...",
        returnPort: "...",
        docking: "...",
      }));
      setRegionStatuses(mockRegionStatuses);
    } catch (error) {
      console.error("Error fetching vessel details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditVessel = async () => {
    if (!vessel) return;
    setEditDialogOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    try {
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
      }

      // Update vessel record with new image URL - remove fileUrl since it doesn't exist in schema
      // const { error: updateError } = await supabase
      //   .from("vessels")
      //   .update({ fileUrl: imageOneUrl })
      //   .eq("id", vessel?.id);

      // if (updateError) throw updateError;

      // Refresh vessel data
      fetchVesselDetails();
    } catch (error) {
      console.error("Error uploading image:", error);
    }
  };

  if (loading) {
    return <div className="p-8">Loading vessel details...</div>;
  }

  if (!vessel) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Vessel Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            No vessel found with registration number:{" "}
            <strong>{vessel?.registration_number}</strong>
          </p>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">This could mean:</p>
            <ul className="text-sm text-gray-500 list-disc list-inside space-y-1">
              <li>The vessel doesn't exist in the database</li>
              <li>The registration number is incorrect</li>
              <li>You don't have permission to view this vessel</li>
            </ul>
            <div className="mt-6 space-x-4">
              <Button onClick={() => navigate(-1)} variant="outline">
                Go Back
              </Button>
              <Button onClick={() => navigate("/vessel-management")}>
                Manage Vessels
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="fixed top-0 left-0 right-0 bg-white z-10 mb-8 shadow-md flex justify-between items-center p-4">
        <button
          onClick={() => navigate(-1)}
          className="text-black hover:text-gray-300 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <h1 className="text-black text-xl font-bold text-center">
          Vessel details
        </h1>
        <div></div>
      </div>
      <div className="flex justify-between items-start mt-20 mb-8">
        <h1 className="text-2xl font-bold">{vessel.name}</h1>
        {isAuthorized && (
          <Button onClick={handleEditVessel}>Update Vessel Info</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Vessel Image */}
        <div className="relative rounded-lg overflow-hidden">
          <div className="grid gap-4 py-4">
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
                setImage(file);
                if (isAuthorized && file instanceof File) {
                  handleImageUpload(file);
                }
              }}
              onClick={() => {
                if (isAuthorized) {
                  document.getElementById("file-upload-input")?.click();
                }
              }}
              className={`relative p-6 border-2 border-dashed rounded-md cursor-pointer text-center transition-colors ${
                isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
              }`}
            >
              {image ? (
                <img
                  src={
                    image instanceof File ? URL.createObjectURL(image) : image
                  }
                  alt="Document Preview"
                  className="mx-auto h-62 object-contain"
                />
              ) : (
                <>
                  <input
                    id="file-upload-input"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setImage(file);
                    }}
                  />
                  <Upload size={32} className="mx-auto text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    {language === "en"
                      ? "Upload Vessel Image"
                      : "Upload Vessel Image"}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Vessel Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="Vessel ID" value={vessel.registration_number} />
            <InfoItem
              label="Trip ID"
              value={
                trips.find((t) => t.vessel_id === vessel.id)?.trip_code || "N/A"
              }
            />
            <InfoItem label="Captain" value={vessel.captain_name || "N/A"} />
            <InfoItem label="Contact#" value="N/A" />
            <InfoItem label="Port" value="N/A" />
            <InfoItem label="Trip Status" value={vessel.trip_status || "N/A"} />
            <InfoItem label="Zone" value={vessel.current_zone || "N/A"} />
            {catchRecords.length > 0 ? (
              <div className="col-span-2">
                <button
                  onClick={() =>
                    setMapDialog({
                      isOpen: true,
                      latitude: 10.8231, // Default coordinates
                      longitude: 106.6297,
                      vesselName: vessel.name,
                    })
                  }
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  View Location
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Catch Records Chart */}
      <div className="mb-8">
        <CatchRecordsChart />
      </div>

      {/* Fuel Consumption Chart */}
      <div className="mb-8">
        <FuelConsumptionChart
          vesselId={vessel.id}
          tripId={trips.find((t) => t.vessel_id === vessel.id)?.id}
        />
      </div>

      {/* Map Dialog */}
      <Dialog
        open={mapDialog.isOpen}
        onOpenChange={(open) =>
          setMapDialog((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Location of {mapDialog.vesselName}</DialogTitle>
          </DialogHeader>
          {mapDialog.latitude && mapDialog.longitude && (
            <div className="h-[500px]">
              <OpenSeaMapView
                latitude={mapDialog.latitude}
                longitude={mapDialog.longitude}
                vesselName={mapDialog.vesselName}
              />
            </div>
          )}
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
            onSuccess={fetchVesselDetails}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

const InfoItem = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div>
    <div className="text-sm text-gray-500">{label}</div>
    <div className="font-medium">{value}</div>
  </div>
);

const StatusItem = ({
  step,
  label,
  value,
}: {
  step: string;
  label: string;
  value: string;
}) => (
  <div className="bg-gray-50 p-3 rounded">
    <div className="text-sm text-gray-500">
      -{step}- ({label})
    </div>
    <div className="font-medium">{value}</div>
  </div>
);
