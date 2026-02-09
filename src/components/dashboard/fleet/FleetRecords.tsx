import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/lib/supabase";
import { useAuthStore, UserRole } from "@/stores/auth-store";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import OpenSeaMapView from "@/components/OpenSeaMapView";

type VesselRecord = {
  id: string;
  vessel_id: string;
  type: string;
  trip_id: string;
  latitude: number | null;
  longitude: number | null;
  zone: string;
  total_volume: number;
  vessel_name: string;
  registration_number: string;
};

type TimeFilter = "today" | "week" | "month" | "year" | "all";

type CatchRecord = {
  id: string;
  net_kg_per_case: string | null;
  latitude: string | null;
  longitude: string | null;
  capture_zone: string | null;
  created_at: string;
  haul_id: {
    id: string;
    trip_id: string;
    fishing_trips: {
      id: string;
      to_region: string;
      vessel_id: string;
      trip_code: string;
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

export default function FleetRecords() {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<VesselRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("today");
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [mapDialog, setMapDialog] = useState<{
    isOpen: boolean;
    latitude: number | null;
    longitude: number | null;
    vesselName: string;
  }>({
    isOpen: false,
    latitude: null,
    longitude: null,
    vesselName: "",
  });

  const isAdmin = user?.role === "Admin";

  const fetchRecords = async () => {
    setLoading(true);
    try {
      // Get the date range based on time filter
      const now = new Date();
      const startDate = new Date();

      switch (timeFilter) {
        case "today":
          startDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate.setDate(1);
          break;
        case "year":
          startDate.setMonth(0, 1);
          break;
        case "all":
          break;
      }

      // Base query
      let query = supabase.from("catch_records").select(`
          id,
          net_kg_per_case,
          latitude,
          longitude,
          capture_zone,
          created_at,
          haul_id!inner (
            id,
            trip_id,
            fishing_trips!inner (
              id,
              to_region,
              vessel_id,
              trip_code,
              vessels!inner (
                id,
                name,
                type,
                registration_number,
                user_id
              )
            )
          )
        `);

      // Add filters
      if (!isAdmin) {
        query = query.eq(
          "haul_id.fishing_trips.vessels.user_id",
          user?.auth_id
        );
      }

      if (timeFilter !== "all") {
        query = query.gte("created_at", startDate.toISOString());
      }

      // Execute query with debug logging
      console.log("Query params:", {
        timeFilter,
        startDate: startDate.toISOString(),
        isAdmin,
        userId: user?.auth_id,
      });

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      console.log("Raw data from query:", data);

      if (error) {
        console.error("Error fetching records:", error);
        throw error;
      }

      // Filter and type check the data
      const filteredData = (data || []).filter(
        (record): record is CatchRecord => {
          const isValidRecord =
            record?.haul_id?.fishing_trips?.vessels !== null;
          if (!isValidRecord) {
            console.log("Invalid record found:", record);
          }
          return isValidRecord;
        }
      );

      console.log("Filtered data:", filteredData);

      // Group by vessel and aggregate data
      const vesselGroups = filteredData.reduce<Record<string, CatchRecord[]>>(
        (groups, record) => {
          const vesselId = record.haul_id?.fishing_trips?.vessels?.id;
          if (!vesselId) {
            console.log("Record without vessel ID:", record);
            return groups;
          }

          if (!groups[vesselId]) {
            groups[vesselId] = [];
          }
          groups[vesselId].push(record);
          return groups;
        },
        {}
      );

      console.log("Vessel groups:", vesselGroups);

      // Process each vessel group
      const processedRecords = Object.entries(vesselGroups).map(
        ([vesselId, records]) => {
          const latestRecord = records[0];

          const record = {
            id: latestRecord.id,
            vessel_id: vesselId,
            type: latestRecord.haul_id?.fishing_trips?.vessels?.type || "N/A",
            trip_id: latestRecord.haul_id?.fishing_trips?.id || "N/A",
            trip_code: latestRecord.haul_id?.fishing_trips?.trip_code || "N/A",
            latitude: latestRecord.latitude
              ? parseFloat(latestRecord.latitude)
              : null,
            longitude: latestRecord.longitude
              ? parseFloat(latestRecord.longitude)
              : null,
            zone:
              latestRecord.capture_zone ||
              latestRecord.haul_id?.fishing_trips?.to_region ||
              "N/A",
            total_volume: records.reduce((sum, record) => {
              const netKgPerCase = record.net_kg_per_case
                ? parseFloat(record.net_kg_per_case)
                : 0;
              return sum + netKgPerCase;
            }, 0),
            vessel_name:
              latestRecord.haul_id?.fishing_trips?.vessels?.name || "N/A",
            registration_number:
              latestRecord.haul_id?.fishing_trips?.vessels
                ?.registration_number || "N/A",
          };
          console.log(`Processed record for vessel ${vesselId}:`, record);
          return record;
        }
      );

      console.log("Final processed records:", processedRecords);
      setRecords(processedRecords);
    } catch (error) {
      console.error("Error in fetchRecords:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [timeFilter]);

  useEffect(() => {
    if (user?.auth_id) {
      fetchRecords();
    }
  }, [user?.auth_id]);

  const handleGPSClick = (record: VesselRecord) => {
    if (record.latitude && record.longitude) {
      setMapDialog({
        isOpen: true,
        latitude: record.latitude,
        longitude: record.longitude,
        vesselName: record.vessel_name,
      });
    }
  };

  return (
    <div className="fleet-records-container p-4 ">
      <div className="time-selector mb-6">
        <h4 className="text-lg font-semibold mb-2">Chọn thời gian</h4>
        <div className="time-picker-container relative">
          <div
            className="time-picker flex items-center justify-between border border-gray-300 rounded px-3 py-2 bg-white cursor-pointer"
            onClick={() => setShowTimeDropdown(!showTimeDropdown)}
          >
            <span className="selected-time capitalize">{timeFilter}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              className="bi bi-calendar3 ml-2"
              viewBox="0 0 16 16"
            >
              <path d="M14 0H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zM1 3.857C1 3.384 1.448 3 2 3h12c.552 0 1 .384 1 .857v10.286c0 .473-.448.857-1 .857H2c-.552 0-1-.384-1-.857V3.857z" />
              <path d="M6.5 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-9 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-9 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
            </svg>
          </div>
          {showTimeDropdown && (
            <div className="time-dropdown absolute z-10 w-full md:w-1/6 mt-1 bg-white border border-gray-300 rounded shadow-lg">
              {["today", "week", "month", "year", "all"].map((option) => (
                <div
                  key={option}
                  className="time-dropdown-option py-2 px-3 hover:bg-blue-50 cursor-pointer capitalize"
                  onClick={() => {
                    setTimeFilter(option as TimeFilter);
                    setShowTimeDropdown(false);
                  }}
                >
                  {option}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="fleet-table overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vessel Info
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trip ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                GPS
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Zone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Volume (kg)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-4">
                  Loading records...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-4">
                  No records found
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {record.vessel_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {record.registration_number}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {record.type}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {record.trip_code}
                  </td>
                  <td className="px-6 py-4">
                    {record.latitude && record.longitude ? (
                      <button
                        onClick={() => handleGPSClick(record)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View Location
                      </button>
                    ) : (
                      <span className="text-gray-500 text-sm">No GPS data</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {record.zone}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {record.total_volume.toLocaleString()} kg
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={mapDialog.isOpen}
        onOpenChange={(open) =>
          setMapDialog((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent className="max-w-4xl max-h-[400px]">
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
    </div>
  );
}
