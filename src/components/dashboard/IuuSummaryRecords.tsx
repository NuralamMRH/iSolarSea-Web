import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/lib/supabase";
import { useAuthStore, UserRole } from "@/stores/auth-store";
import { useVesselAccess } from "@/hooks/use-vessel-access";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import OpenSeaMapView from "@/components/OpenSeaMapView";
import { Button } from "../ui/button";
import QRCode from "react-qr-code";
import { CalendarRange } from "@/components/ui/date-range-picker";
import { useTranslation } from "@/hooks/use-translation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";

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

type TimeFilter = "today" | "week" | "month" | "quarter" | "year" | "all";

type CatchRecord = {
  id: string;
  net_kg_per_case: string | null;
  latitude: string | null;
  longitude: string | null;
  capture_zone: string | null;
  created_at: string;
  image_url: string | null;
  quantity: number | null;
  tank: number | null;
  case_size: number | null;
  qr_code: string | null;
  catching_location: string | null;
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

// --- VesselForm Component ---

export default function IuuSummaryRecords({
  isVesselGrouped,
  headerClassName = "border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold",
}: {
  isVesselGrouped?: boolean;
  headerClassName?: string;
}) {
  const { t } = useTranslation();
  const [records, setRecords] = useState<VesselRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const safeRecords = records ?? [];
  const { user } = useAuthStore();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("week");
  const [showRangeDropdown, setShowRangeDropdown] = useState(false);
  const [isGeneralDeclarationDialog, setIsGeneralDeclarationDialog] =
    useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const isMobile = useIsMobile();

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
  const [dateRange, setDateRange] = useState<{
    from: Date | null;
    to: Date | null;
  }>({ from: null, to: null });

  const isAdmin = user?.role === "Admin";

  // Add this state to store vesselGroups for rendering expanded rows
  const [vesselGroups, setVesselGroups] = useState<
    Record<string, CatchRecord[]>
  >({});

  const fetchRecords = async () => {
    setLoading(true);
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
        case "quarter":
          startDate.setMonth(now.getMonth() - 3);
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
          image_url,
          quantity,
          net_kg_per_case,
          tank,
          case_size,
          qr_code,
          catching_location,
          quantity,
          species,
          fish_name,
          haul_id!inner (
            id,
            trip_id,
            fishing_trips!inner (
              id,
              trip_code,
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
        `);

      // Add filters
      if (!isAdmin) {
        // Use vessel access control instead of just user ownership
        if (allVesselIds.length > 0) {
          query = query.in("haul_id.fishing_trips.vessel_id", allVesselIds);
        } else {
          // If no vessels accessible, return empty result
          setRecords([]);
          return;
        }
      }

      if (timeFilter !== "all") {
        query = query.gte("created_at", startDate.toISOString());
      }

      // Add date range filter if both dates are selected
      if (dateRange.from && dateRange.to) {
        query = query
          .gte("created_at", dateRange.from.toISOString())
          .lte("created_at", dateRange.to.toISOString());
      }

      // Execute query with debug logging
      console.log("Query params:", {
        timeFilter,
        startDate: startDate.toISOString(),
        isAdmin,
        userId: user?.auth_id,
        allVesselIds,
      });

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

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
      setVesselGroups(vesselGroups); // <-- store for rendering

      console.log("Vessel groups:", vesselGroups);

      // Process each vessel group
      const processedRecords = Object.entries(vesselGroups).map(
        ([vesselId, records]) => {
          const latestRecord = records[0];

          const record = {
            ...latestRecord,
            vesselGrouped: true,
            id: latestRecord.id,
            vessel_id: vesselId,
            type: latestRecord.haul_id?.fishing_trips?.vessels?.type || "N/A",
            trip_id: latestRecord.haul_id?.fishing_trips?.id || "N/A",
            trip_code: latestRecord.haul_id?.fishing_trips?.trip_code || "N/A",
            to_region: latestRecord.haul_id?.fishing_trips?.to_region || "N/A",
            net_kg_per_case: latestRecord.net_kg_per_case || "N/A",
            tank: latestRecord.tank || "N/A",
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

      setRecords(
        isVesselGrouped
          ? processedRecords
          : (filteredData as unknown as VesselRecord[])
      );
    } catch (error) {
      console.error("Error in fetchRecords:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      fetchRecords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  useEffect(() => {
    // Only trigger fetch if not using a custom date range
    if (!dateRange.from || !dateRange.to) {
      fetchRecords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFilter]);

  useEffect(() => {
    if (user?.auth_id) {
      fetchRecords();
    }
  }, [user?.auth_id]);

  // Update handleGPSClick to accept both VesselRecord and CatchRecord
  type VesselOrCatchRecord = VesselRecord | CatchRecord;

  const handleGPSClick = (record: VesselOrCatchRecord) => {
    let latitude: number | null = null;
    let longitude: number | null = null;
    let vesselName = "";
    if ("vessel_name" in record) {
      latitude = record.latitude;
      longitude = record.longitude;
      vesselName = record.vessel_name;
    } else if (
      "haul_id" in record &&
      record.haul_id?.fishing_trips?.vessels?.name
    ) {
      latitude = record.latitude ? Number(record.latitude) : null;
      longitude = record.longitude ? Number(record.longitude) : null;
      vesselName = record.haul_id.fishing_trips.vessels.name;
    }
    if (latitude && longitude) {
      setMapDialog({
        isOpen: true,
        latitude,
        longitude,
        vesselName,
      });
    }
  };

  // Add state for selected rows
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Helper to get selected records
  const selectedRecords = safeRecords.filter((r) => selectedIds.includes(r.id));
  const totalSelected = selectedRecords.length;
  const totalQuantity = isVesselGrouped
    ? selectedRecords.reduce(
        (sum, r) =>
          sum + (typeof r.total_volume === "number" ? r.total_volume : 0),
        0
      )
    : selectedRecords.reduce(
        (sum, r) => sum + (Number(r.net_kg_per_case) || 0),
        0
      );

  // Handler for row selection
  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };
  // Handler for select all
  const handleSelectAll = () => {
    if (selectedIds.length === safeRecords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(safeRecords.map((r) => r.id));
    }
  };

  // Helper to get vessel info if all selected records are from the same vessel
  const selectedVessel = (() => {
    if (selectedRecords.length === 0) return null;
    const vesselIds = selectedRecords.map((r: any) =>
      isVesselGrouped ? r.vessel_id : r.haul_id?.fishing_trips?.vessels?.id
    );
    const uniqueVesselIds = Array.from(new Set(vesselIds));
    if (uniqueVesselIds.length === 1) {
      if (isVesselGrouped) {
        return selectedRecords[0];
      } else {
        // Find the vessel info from the first selected record
        const v = selectedRecords[0].haul_id?.fishing_trips?.vessels;
        return v
          ? {
              registration_number: v.registration_number,
              name: v.name,
              type: v.type,
            }
          : null;
      }
    }
    return null;
  })();

  return (
    <div className="fleet-records-container p-4 ">
      <div className="time-selector mb-6">
        <h4 className="text-lg font-semibold mb-2">Báo cáo theo:</h4>
        <div className="px-3 flex gap-2 md:gap-3 lg:gap-4 overflow-x-auto">
          {["today", "week", "month", "year", "all"].map((option) => (
            <div key={option} className="flex-shrink-0">
              <button
                className={`
                  ${
                    timeFilter === option
                      ? "bg-red-800 text-white"
                      : "bg-red-100 text-black"
                  }
                  rounded-md px-4 md:px-5
                  h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                  text-xs md:text-base
                  w-20 md:w-24 lg:w-28
                  capitalize
                `}
                onClick={() => {
                  setTimeFilter(option as TimeFilter);
                  setDateRange({ from: null, to: null }); // Clear date range when time filter is set
                  setShowRangeDropdown(false);
                }}
              >
                <span className="truncate">{option}</span>
              </button>
            </div>
          ))}
        </div>
        {/* Date Range Picker */}
      </div>

      <div className="time-selector mb-6">
        <div className="flex flex-row gap-2">
          <h4 className="text-lg font-semibold mb-2">Từ ngày Đến ngày</h4>

          <Button
            className="ml-4"
            onClick={() => setShowRangeDropdown(!showRangeDropdown)}
          >
            {showRangeDropdown ? "Hide" : "Show"}
          </Button>
        </div>

        <div className="mt-4" hidden={!showRangeDropdown}>
          <CalendarRange
            onChange={(range) => {
              setDateRange(range);
              setTimeFilter("all"); // Clear time filter when date range is set
            }}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className={` w-8 sticky left-0 z-10 ${headerClassName}`}>
                <input
                  type="checkbox"
                  checked={
                    selectedIds.length === safeRecords.length &&
                    safeRecords.length > 0
                  }
                  onChange={handleSelectAll}
                />
              </th>
              <th className={` w-12 ${headerClassName}`}>No.</th>
              <th className={` w-24 ${headerClassName}`}>Vessel Id</th>
              <th className={` w-24 ${headerClassName}`}>Trip ID</th>
              <th className={` w-20 ${headerClassName}`}>GPS</th>
              <th className={` w-20 ${headerClassName}`}>Zone</th>
              <th className={` w-24 ${headerClassName}`}>Capture Time</th>
              <th className={` w-20 ${headerClassName}`}>Fish Image</th>
              <th className={` w-20 ${headerClassName}`}>Product Id</th>
              <th className={` w-20 ${headerClassName}`}>Quantity (kg)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Loading skeleton rows
              Array.from({ length: 5 }).map((_, index) => (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="w-full border-b border-gray-200"
                >
                  <td className="border border-black px-2 py-1.5 text-xs font-medium w-8 sticky left-0 z-10 bg-white">
                    <motion.div
                      className="h-4 bg-gray-200 rounded animate-pulse"
                      initial={{ width: "60%" }}
                      animate={{ width: ["60%", "80%", "60%"] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  </td>
                  <td className="border border-black px-2 py-1.5 text-xs w-12">
                    <motion.div
                      className="h-4 bg-gray-200 rounded animate-pulse"
                      initial={{ width: "40%" }}
                      animate={{ width: ["40%", "60%", "40%"] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: 0.1,
                      }}
                    />
                  </td>
                  <td className="border border-black px-2 py-1.5 text-xs w-24">
                    <motion.div
                      className="h-4 bg-gray-200 rounded animate-pulse"
                      initial={{ width: "70%" }}
                      animate={{ width: ["70%", "90%", "70%"] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: 0.2,
                      }}
                    />
                  </td>
                  <td className="border border-black px-2 py-1.5 text-xs w-24">
                    <motion.div
                      className="h-4 bg-gray-200 rounded animate-pulse"
                      initial={{ width: "65%" }}
                      animate={{ width: ["65%", "85%", "65%"] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: 0.3,
                      }}
                    />
                  </td>
                  <td className="border border-black px-2 py-1.5 text-xs w-20">
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
                  </td>
                  <td className="border border-black px-2 py-1.5 text-xs w-20">
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
                  </td>
                  <td className="border border-black px-2 py-1.5 text-xs w-24">
                    <motion.div
                      className="h-4 bg-gray-200 rounded animate-pulse"
                      initial={{ width: "80%" }}
                      animate={{ width: ["80%", "100%", "80%"] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: 0.6,
                      }}
                    />
                  </td>
                  <td className="border border-black px-2 py-1.5 text-xs w-20">
                    <div className="flex justify-center">
                      <motion.div
                        className="w-10 h-8 bg-gray-200 rounded animate-pulse"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: [0.8, 1, 0.8] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: 0.7,
                        }}
                      />
                    </div>
                  </td>
                  <td className="border border-black px-2 py-1.5 text-xs w-20">
                    <div className="flex justify-center">
                      <motion.div
                        className="w-8 h-8 bg-gray-200 rounded animate-pulse"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: [0.8, 1, 0.8] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: 0.8,
                        }}
                      />
                    </div>
                  </td>
                  <td className="border border-black px-2 py-1.5 text-xs w-20">
                    <motion.div
                      className="h-4 bg-gray-200 rounded animate-pulse"
                      initial={{ width: "60%" }}
                      animate={{ width: ["60%", "80%", "60%"] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: 0.9,
                      }}
                    />
                  </td>
                </motion.tr>
              ))
            ) : safeRecords.length === 0 ? (
              // Empty state
              <motion.tr
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full"
              >
                <td colSpan={10} className="text-center py-12">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Plus className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">
                      No records found
                    </h3>
                    <p className="text-sm text-gray-500">
                      No catch records available for the selected criteria
                    </p>
                  </motion.div>
                </td>
              </motion.tr>
            ) : isVesselGrouped ? (
              safeRecords.flatMap((record, idx) => {
                const rows: React.ReactNode[] = [
                  <motion.tr
                    key={record.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                    className="w-full cursor-pointer hover:bg-gray-50 border-b border-gray-200"
                  >
                    <td className="border border-black px-2 py-1.5 text-xs font-medium w-8 sticky left-0 z-10 bg-white">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(record.id)}
                        onChange={() => handleSelectRow(record.id)}
                      />
                    </td>
                    <td className="border border-black px-2 py-1.5 text-xs w-12">
                      <div className="truncate" title={String(idx + 1)}>
                        {idx + 1}
                      </div>
                    </td>
                    <td className="border border-black px-2 py-1.5 text-xs w-24">
                      <div className="flex flex-col">
                        <div
                          className="truncate font-medium"
                          title={record.registration_number}
                        >
                          {record.registration_number}
                        </div>
                        <div
                          className="truncate text-gray-500"
                          title={record.type}
                        >
                          {record.type}
                        </div>
                      </div>
                    </td>
                    <td className="border border-black px-2 py-1.5 text-xs w-24">
                      <div className="truncate" title={record.trip_id}>
                        {record?.haul_id?.fishing_trips?.trip_code ?? "-"}
                      </div>
                    </td>
                    <td className="border border-black px-2 py-1.5 text-xs w-20">
                      {record.latitude && record.longitude ? (
                        <button
                          onClick={() => handleGPSClick(record)}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          View Location
                        </button>
                      ) : (
                        <span className="text-gray-500 text-xs">
                          No GPS data
                        </span>
                      )}
                    </td>
                    <td className="border border-black px-2 py-1.5 text-xs w-20">
                      <div className="truncate" title={record.zone ?? "-"}>
                        {record.zone ?? "-"}
                      </div>
                    </td>
                    <td className="border border-black px-2 py-1.5 text-xs w-24">
                      <div
                        className="truncate"
                        title={
                          record.created_at
                            ? new Date(record.created_at).toLocaleString(
                                "vi-VN",
                                {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "-"
                        }
                      >
                        {record.created_at
                          ? new Date(record.created_at).toLocaleString(
                              "vi-VN",
                              {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                          : "-"}
                      </div>
                    </td>
                    <td className="border border-black px-2 py-1.5 text-xs w-20">
                      <div className="flex justify-center">
                        {record?.image_url ? (
                          <img
                            src={record?.image_url || "/images/logo.png"}
                            alt="Fish"
                            className="h-8 w-12 object-cover rounded"
                          />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="border border-black px-2 py-1.5 text-xs w-20">
                      <div className="flex justify-center">
                        <QRCode value={record?.qr_code ?? "-"} size={30} />
                      </div>
                    </td>
                    <td className="border border-black px-2 py-1.5 text-xs w-20">
                      <div
                        className="truncate font-medium"
                        title={record.total_volume?.toLocaleString?.() ?? "-"}
                      >
                        {record.total_volume?.toLocaleString?.() ?? "-"}
                      </div>
                    </td>
                  </motion.tr>,
                ];
                // If grouped, and this row is selected, show all catch records for this vessel after this row
                if (isVesselGrouped && selectedIds.includes(record.id)) {
                  const group = vesselGroups[record.vessel_id] || [];
                  rows.push(
                    ...group.map((catchRecord) => (
                      <motion.tr
                        key={catchRecord.id + "-expanded"}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-gray-50 border-b border-gray-200"
                      >
                        <td />
                        <td />
                        <td />
                        <td />
                        <td className="border border-black px-2 py-1.5 text-xs w-20">
                          {catchRecord.latitude && catchRecord.longitude ? (
                            <button
                              onClick={() => handleGPSClick(catchRecord)}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              View Location
                            </button>
                          ) : (
                            <span className="text-gray-500 text-xs">
                              No GPS data
                            </span>
                          )}
                        </td>
                        <td className="border border-black px-2 py-1.5 text-xs w-20">
                          <div className="flex flex-col">
                            <span className="truncate">
                              Zone: {catchRecord.capture_zone ?? "-"}
                            </span>
                            <span className="truncate">
                              Quantity: {catchRecord.net_kg_per_case ?? "-"} kg
                            </span>
                          </div>
                        </td>
                        <td className="border border-black px-2 py-1.5 text-xs w-24">
                          <div className="truncate">
                            {new Date(catchRecord.created_at).toLocaleString(
                              "vi-VN"
                            )}
                          </div>
                        </td>
                        <td className="border border-black px-2 py-1.5 text-xs w-20">
                          <div className="flex justify-center">
                            {catchRecord?.image_url ? (
                              <img
                                src={
                                  catchRecord?.image_url || "/images/logo.png"
                                }
                                alt="Fish"
                                className="h-8 w-12 object-cover rounded"
                              />
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                        <td className="border border-black px-2 py-1.5 text-xs w-20">
                          <div className="flex justify-center">
                            <QRCode
                              value={catchRecord?.qr_code ?? "-"}
                              size={30}
                            />
                          </div>
                        </td>
                        <td className="border border-black px-2 py-1.5 text-xs w-20">
                          <div
                            className="truncate font-medium"
                            title={catchRecord.net_kg_per_case ?? "-"}
                          >
                            {catchRecord.net_kg_per_case ?? "-"}
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  );
                }
                return rows;
              })
            ) : (
              safeRecords.map((record, idx) => (
                <motion.tr
                  key={record.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="w-full cursor-pointer hover:bg-gray-50 border-b border-gray-200"
                >
                  <td className="border border-black px-2 py-1.5 text-xs font-medium w-8 sticky left-0 z-10 bg-white">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(record.id)}
                      onChange={() => handleSelectRow(record.id)}
                    />
                  </td>
                  <td className="border border-black px-2 py-1.5 text-xs w-12">
                    <div className="truncate" title={String(idx + 1)}>
                      {idx + 1}
                    </div>
                  </td>
                  <td className="border border-black px-2 py-1.5 text-xs w-24">
                    <div className="flex flex-col">
                      <div
                        className="truncate font-medium"
                        title={
                          record.haul_id?.fishing_trips?.vessels
                            ?.registration_number
                        }
                      >
                        {
                          record.haul_id?.fishing_trips?.vessels
                            ?.registration_number
                        }
                      </div>
                      <div
                        className="truncate text-gray-500"
                        title={record.haul_id?.fishing_trips?.vessels?.type}
                      >
                        {record.haul_id?.fishing_trips?.vessels?.type}
                      </div>
                    </div>
                  </td>
                  <td className="border border-black px-2 py-1.5 text-xs w-24">
                    <div
                      className="truncate"
                      title={record.haul_id?.fishing_trips?.trip_code}
                    >
                      {record.haul_id?.fishing_trips?.trip_code}
                    </div>
                  </td>
                  <td className="border border-black px-2 py-1.5 text-xs w-20">
                    {record.latitude && record.longitude ? (
                      <button
                        onClick={() => handleGPSClick(record)}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        View Location
                      </button>
                    ) : (
                      <span className="text-gray-500 text-xs">No GPS data</span>
                    )}
                  </td>
                  <td className="border border-black px-2 py-1.5 text-xs w-20">
                    <div
                      className="truncate"
                      title={record.capture_zone ?? "-"}
                    >
                      {record.capture_zone ?? "-"}
                    </div>
                  </td>
                  <td className="border border-black px-2 py-1.5 text-xs w-24">
                    <div
                      className="truncate"
                      title={new Date(record.created_at).toLocaleString(
                        "vi-VN",
                        {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    >
                      {new Date(record.created_at).toLocaleString("vi-VN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </td>
                  <td className="border border-black px-2 py-1.5 text-xs w-20">
                    <div className="flex justify-center">
                      {record?.image_url ? (
                        <img
                          src={record?.image_url || "/images/logo.png"}
                          alt="Fish"
                          className="h-8 w-12 object-cover rounded"
                        />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                  <td className="border border-black px-2 py-1.5 text-xs w-20">
                    <div className="flex justify-center">
                      <QRCode
                        value={record?.qr_code ?? "-"}
                        size={30}
                        className="w-full h-full"
                      />
                    </div>
                  </td>
                  <td className="border border-black px-2 py-1.5 text-xs w-20">
                    <div
                      className="truncate font-medium"
                      title={record.net_kg_per_case ?? "-"}
                    >
                      {record.net_kg_per_case ?? "-"}
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
          {/* Summary row for selected */}
          {totalSelected > 0 && (
            <tfoot>
              <motion.tr
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-yellow-100 font-semibold border-b-2 border-black"
              >
                <td
                  colSpan={6}
                  className="px-6 py-3 text-left border border-black"
                >
                  Selected: {totalSelected} record
                  {totalSelected !== 1 ? "s" : ""}
                  <Button
                    className="ml-4"
                    onClick={() => setDetailsModalOpen(true)}
                  >
                    More details
                  </Button>
                </td>
                <td
                  colSpan={4}
                  className="px-6 py-3 text-right border border-black"
                >
                  Total Quantity: {totalQuantity.toLocaleString()} kg
                </td>
              </motion.tr>
            </tfoot>
          )}
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

      {/* Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vessel & Catch Record Details</DialogTitle>
          </DialogHeader>
          <div className="mb-4">
            {isVesselGrouped ? (
              (() => {
                // Only allow details if one vessel is selected
                const vesselIds = selectedRecords.map((r) => r.vessel_id);
                const uniqueVesselIds = Array.from(new Set(vesselIds));
                if (uniqueVesselIds.length !== 1) {
                  return (
                    <div className="mb-2 text-red-600 font-medium">
                      Please select only one vessel to view details.
                    </div>
                  );
                }
                const vesselId = uniqueVesselIds[0];
                const catchRecords = vesselGroups[vesselId] || [];
                const vessel = selectedRecords[0];
                return (
                  <>
                    <div className="mb-2 p-2 border rounded bg-gray-50">
                      <div className="font-semibold mb-1">
                        Vessel Information
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <Label>Registration Number:</Label>{" "}
                          {vessel.registration_number}
                        </div>
                        <div>
                          <Label>Name:</Label> {vessel.vessel_name}
                        </div>
                        <div>
                          <Label>Type:</Label> {vessel.type}
                        </div>
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="font-semibold mb-1">Catch Records</div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs border">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="px-2 py-1 border">No.</th>
                              <th className="px-2 py-1 border">Trip</th>
                              <th className="px-2 py-1 border">Zone</th>
                              <th className="px-2 py-1 border">Capture Time</th>
                              <th className="px-2 py-1 border">
                                Quantity (kg)
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {catchRecords.map((rec, idx) => (
                              <tr key={rec.id}>
                                <td className="px-2 py-1 border">{idx + 1}</td>
                                <td className="px-2 py-1 border">
                                  {rec.haul_id?.fishing_trips?.trip_code}
                                </td>
                                <td className="px-2 py-1 border">
                                  {rec.capture_zone}
                                </td>
                                <td className="px-2 py-1 border">
                                  {new Date(rec.created_at).toLocaleString(
                                    "vi-VN"
                                  )}
                                </td>
                                <td className="px-2 py-1 border text-right">
                                  {rec.net_kg_per_case || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="font-bold text-right text-lg mt-4">
                      Total Weight:{" "}
                      {catchRecords
                        .reduce(
                          (sum, r) => sum + (Number(r.net_kg_per_case) || 0),
                          0
                        )
                        .toLocaleString()}{" "}
                      kg
                    </div>
                  </>
                );
              })()
            ) : (
              // Not grouped: show selected catch records as before
              <>
                {selectedVessel ? (
                  <div className="mb-2 p-2 border rounded bg-gray-50">
                    <div className="font-semibold mb-1">Vessel Information</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <Label>Registration Number:</Label>{" "}
                        {selectedVessel.registration_number}
                      </div>
                      <div>
                        <Label>Name:</Label> {selectedVessel.name}
                      </div>
                      <div>
                        <Label>Type:</Label> {selectedVessel.type}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-2 text-red-600 font-medium">
                    Selected records are from multiple vessels.
                  </div>
                )}
                <div className="mb-4">
                  <div className="font-semibold mb-1">
                    Selected Catch Records
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs border">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-2 py-1 border">No.</th>
                          <th className="px-2 py-1 border">Trip</th>
                          <th className="px-2 py-1 border">Zone</th>
                          <th className="px-2 py-1 border">Capture Time</th>
                          <th className="px-2 py-1 border">Quantity (kg)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRecords.map((rec, idx) => (
                          <tr key={rec.id}>
                            <td className="px-2 py-1 border">{idx + 1}</td>
                            <td className="px-2 py-1 border">
                              {rec.haul_id?.fishing_trips?.trip_code}
                            </td>
                            <td className="px-2 py-1 border">
                              {rec.capture_zone}
                            </td>
                            <td className="px-2 py-1 border">
                              {new Date(rec.created_at).toLocaleString("vi-VN")}
                            </td>
                            <td className="px-2 py-1 border text-right">
                              {rec.net_kg_per_case || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="font-bold text-right text-lg mt-4">
                  Total Weight:{" "}
                  {selectedRecords
                    .reduce(
                      (sum, r) => sum + (Number(r.net_kg_per_case) || 0),
                      0
                    )
                    .toLocaleString()}{" "}
                  kg
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setDetailsModalOpen(false)} className="mt-2">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
