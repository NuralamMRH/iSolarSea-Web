import React, { useEffect, useState } from "react";
import { useLanguageStore } from "@/stores/language-store";
import { useAuthStore } from "@/stores/auth-store";
import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";

// Define types
type Port = {
  id: string;
  name: string;
  code?: string;
};

type VesselWithTrip = Database["public"]["Tables"]["vessels"]["Row"] & {
  fishing_trips: Database["public"]["Tables"]["fishing_trips"]["Row"][];
};

type StatusDataType = {
  num: number;
  status: string;
  code: string;
  color: string;
  count: number;
  vessels: string[];
};

type TooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload: StatusDataType;
  }>;
};

type Trip = Database["public"]["Tables"]["fishing_trips"]["Row"] & {
  vessels: Database["public"]["Tables"]["vessels"]["Row"];
  departure_port: string | Port;
  return_port: string | Port;
};

type RegionData = {
  name: string;
  color: string;
  borderColor: string;
  trips: Trip[];
};

type StatusDialogData = {
  isOpen: boolean;
  region: string;
  status: string;
  trips: Trip[];
};

export default function RegionBasedFleet() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const { user } = useAuthStore();
  const { language } = useLanguageStore();

  const [ports, setPorts] = useState<Port[]>([]);
  const [vessels, setVessels] = useState<VesselWithTrip[]>([]);
  const [statusData, setStatusData] = useState<StatusDataType[]>([
    {
      num: 1,
      status: "Departure",
      code: "-1-",
      color: "#4338ca",
      count: 0,
      vessels: [],
    },
    {
      num: 2,
      status: "OnRoad",
      code: "-2-",
      color: "#ffc107",
      count: 0,
      vessels: [],
    },
    {
      num: 3,
      status: "Catching",
      code: "-3-",
      color: "#ff9800",
      count: 0,
      vessels: [],
    },
    {
      num: 4,
      status: "4Sales",
      code: "-4-",
      color: "#ff006e",
      count: 0,
      vessels: [],
    },
    {
      num: 5,
      status: "2Buy",
      code: "-5-",
      color: "#ff2600",
      count: 0,
      vessels: [],
    },
    {
      num: 6,
      status: "4Share",
      code: "-6-",
      color: "#f59e42",
      count: 0,
      vessels: [],
    },
    {
      num: 7,
      status: "2Share",
      code: "-7-",
      color: "#ffe082",
      count: 0,
      vessels: [],
    },
    {
      num: 8,
      status: "Full",
      code: "-8-",
      color: "#d4e157",
      count: 0,
      vessels: [],
    },
    {
      num: 9,
      status: "Return Port",
      code: "-9-",
      color: "#81c784",
      count: 0,
      vessels: [],
    },
    {
      num: 10,
      status: "Docking",
      code: "-10-",
      color: "#00c9a7",
      count: 0,
      vessels: [],
    },
  ]);

  const [regions, setRegions] = useState<RegionData[]>([
    {
      name: "D. Hai Phong - Quang Ninh (Vinh Bac Bo)",
      color: "bg-red-400",
      borderColor: "border-red-400",
      trips: [],
    },
    {
      name: "C. Hoang Sa - Truong Sa",
      color: "bg-blue-500",
      borderColor: "border-blue-500",
      trips: [],
    },
    {
      name: "B. NThuan - BThuan - BR. Vung Tau",
      color: "bg-yellow-500",
      borderColor: "border-yellow-500",
      trips: [],
    },
    {
      name: "A. Ca Mau - Kien Giang",
      color: "bg-orange-400",
      borderColor: "border-orange-400",
      trips: [],
    },
  ]);

  const [dialogData, setDialogData] = useState<StatusDialogData>({
    isOpen: false,
    region: "",
    status: "",
    trips: [],
  });

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const { data: vesselsData, error: vesselsError } = await supabase
        .from("vessels")
        .select(
          `
          *,
          fishing_trips (*)
        `
        )
        .eq("user_id", user?.auth_id || "");

      if (vesselsError) throw vesselsError;

      // Reset counts
      const newStatusData = statusData.map((item) => ({
        ...item,
        count: 0,
        vessels: [],
      }));

      // Count vessels by status
      vesselsData?.forEach((vessel) => {
        const latestTrip =
          vessel.fishing_trips?.[vessel.fishing_trips.length - 1];
        if (latestTrip?.status) {
          const statusItem = newStatusData.find(
            (item) => item.status === latestTrip.status
          );
          if (statusItem) {
            statusItem.count++;
            statusItem.vessels.push(vessel.name);
          }
        }
      });

      setStatusData(newStatusData);
      setVessels(vesselsData || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  // Fetch trips for all regions
  const fetchTrips = async () => {
    setLoading(true);
    try {
      const { data: tripsData, error } = await supabase
        .from("fishing_trips")
        .select(
          `
          *,
          vessels (*)
        `
        )
        .eq("vessels.user_id", user?.auth_id || "");

      if (error) throw error;

      // Helper function to get region letter
      const getRegionLetter = (str: string) => {
        // First try to find a direct letter match
        const letterMatch = str.match(/^[ABCD]\.?\s*/i);
        if (letterMatch) return letterMatch[0].charAt(0).toUpperCase();

        // If no direct letter, check for region names
        const regionMap: { [key: string]: string } = {
          "HAI PHONG": "D",
          "QUANG NINH": "D",
          "HOANG SA": "C",
          "TRUONG SA": "C",
          NTHUAN: "B",
          BTHUAN: "B",
          "VUNG TAU": "B",
          "CA MAU": "A",
          "KIEN GIANG": "A",
        };

        // Convert to uppercase for comparison
        const upperStr = str.toUpperCase();
        for (const [key, value] of Object.entries(regionMap)) {
          if (upperStr.includes(key)) {
            return value;
          }
        }
        return "";
      };

      // Update regions with their respective trips
      const updatedRegions = regions.map((region) => ({
        ...region,
        trips:
          (tripsData as Trip[])?.filter((trip) => {
            if (!trip.to_region) return false;

            const tripRegionLetter = getRegionLetter(trip.to_region);
            const regionLetter = getRegionLetter(region.name);

            return tripRegionLetter === regionLetter;
          }) || [],
      }));

      setRegions(updatedRegions);
    } catch (error) {
      console.error("Error fetching trips:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPorts = async () => {
    const { data, error } = await supabase.from("seaports").select("*");
    if (error) throw error;
    setPorts(data || []);
  };

  useEffect(() => {
    if (user?.auth_id) {
      fetchData();
      fetchTrips(); // Fetch trips when component mounts
      fetchPorts();
    }
  }, [user?.auth_id]);

  // Get count of trips by status for a region
  const getStatusCount = (trips: Trip[], status: string) => {
    return trips.filter((trip) => trip.status === status).length;
  };

  // Handle status click to open dialog
  const handleStatusClick = (region: RegionData, status: string) => {
    const filteredTrips = region.trips.filter((trip) => trip.status === status);
    setDialogData({
      isOpen: true,
      region: region.name,
      status,
      trips: filteredTrips,
    });
  };

  return (
    <Card className=" mt-8 md:px-40 bg-white p-4 relative overflow-hidden">
      <img
        src="/images/icons/world.png"
        alt="World"
        className="absolute"
        style={{
          width: "100%",
          height: "100%",
          maxWidth: 800,
          objectFit: "contain",
          objectPosition: "bottom",
          opacity: 0.5,
          left: "50%",
          bottom: 0,
          transform: "translate(-50%, 10%)",
        }}
      />
      <img
        src="/images/icons/vietnam-map.png"
        alt="World"
        className="absolute"
        style={{
          width: "100%",
          height: "100%",
          maxWidth: 800,
          objectFit: "contain",
          objectPosition: "bottom",
          opacity: 0.5,
          top: "50%",
          left: -100,
          transform: "translateY(-50%)",
        }}
      />

      <h1 className="text-center font-bold text-md md:text-xl  text-blue-800">
        {language === "en" ? "REGION NGƯ TRƯỜNG" : "Region Ngư Trường"}
      </h1>
      <div className="vietnam-map-content overflow-hidden flex flex-col md:flex-row relative">
        <div className="w-1 md:w-1/3 text-center"></div>

        <div className="region-timeline md:w-2/3 mt-12">
          {/* <!-- Fishing Region Status Boxes --> */}
          <div className="fishing-regions-container mt-[20px] mb-8 relative z-10">
            <ul className="StepProgress fishing-regions-wrapper flex flex-col gap-[42px] p-2 md:p-0">
              {regions.map((region, index) => (
                <div
                  key={index}
                  className={`StepProgress-item no-number is-Done region-box px-2 md:px-0 rounded-3xl border-2 ${region.borderColor} relative`}
                >
                  <div
                    className={`absolute top-[-25px] md:top-[-30px] left-[10px] right-[10px] region-header ${region.color} text-white font-bold py-1 md:py-2 px-3 text-center text-xs md:text-sm border-2 md:border-4 border-white rounded-full`}
                  >
                    {region.name}
                  </div>
                  <div className="region-content mt-5 md:px-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-1">
                        {[
                          { code: "-1-", status: "Departure" },
                          { code: "-2-", status: "OnRoad" },
                          { code: "-3-", status: "Catching" },
                          { code: "-4-", status: "4Sales" },
                          { code: "-5-", status: "2Buy" },
                        ].map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center mb-1 cursor-pointer hover:bg-gray-100 rounded"
                            onClick={() =>
                              handleStatusClick(region, item.status)
                            }
                          >
                            <span className="text-[12px]">
                              {item.code} ({item.status})
                            </span>
                            <span className="ml-auto text-[12px] font-semibold">
                              : {getStatusCount(region.trips, item.status)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="col-span-1">
                        {[
                          { code: "-6-", status: "4Share" },
                          { code: "-7-", status: "2Share" },
                          { code: "-8-", status: "Full" },
                          { code: "-9-", status: "Return Port" },
                          { code: "-10-", status: "Docking" },
                        ].map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center mb-1 cursor-pointer hover:bg-gray-100  rounded"
                            onClick={() =>
                              handleStatusClick(region, item.status)
                            }
                          >
                            <span className="text-[12px]">
                              {item.code} ({item.status})
                            </span>
                            <span className="ml-auto text-[12px] font-semibold">
                              : {getStatusCount(region.trips, item.status)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <Dialog
        open={dialogData.isOpen}
        onOpenChange={(open) =>
          setDialogData((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogData.region} - {dialogData.status} Trips
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {dialogData.trips.length === 0 ? (
              <p className="text-center text-gray-500">
                No trips found for this status
              </p>
            ) : (
              <div className="grid gap-4">
                {dialogData.trips.map((trip, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="font-semibold">
                          Vessel: {trip.vessels?.name}
                        </p>
                        <p>Registration: {trip.vessels?.registration_number}</p>
                        <p>
                          Departure:{" "}
                          {new Date(trip.departure_date).toLocaleDateString()}
                        </p>
                        <p>
                          From:{" "}
                          {ports.find((port) => port.id === trip.departure_port)
                            ?.name || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p>
                          Return:{" "}
                          {trip.return_date
                            ? new Date(trip.return_date).toLocaleDateString()
                            : "N/A"}
                        </p>
                        <p>To: {trip.return_port || "N/A"}</p>
                        <p>
                          Status:{" "}
                          <span className="font-semibold">{trip.status}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
