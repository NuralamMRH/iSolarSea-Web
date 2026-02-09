import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import { useLanguageStore } from "@/stores/language-store";
import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";

// Define types
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

// Custom tooltip for BarChart
const CustomBarTooltip: React.FC<TooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border-gray-300 rounded-lg  p-3 text-xs min-w-[100px]">
        <div className="font-bold text-base mb-1" style={{ color: data.color }}>
          {data.status}
        </div>
        <div className="mb-1">
          Vessels: <span className="font-semibold">{data.count}</span>
        </div>
        <div className="text-gray-600">
          {data.vessels && data.vessels.length > 0 ? (
            <ul className="list-disc ml-4">
              {data.vessels.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
          ) : (
            "No vessels"
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default function FleetBarChart() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const { user } = useAuthStore();
  const { language } = useLanguageStore();

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

  useEffect(() => {
    if (user?.auth_id) {
      fetchData();
    }
  }, [user?.auth_id]);

  // Process vessel type summary
  const vesselTypeSummary = [
    {
      type: "Mining",
      count: vessels.filter((v) => v.type?.toLowerCase() === "mining").length,
      color: "#ff9800",
    },
    {
      type: "Logistics",
      count: vessels.filter(
        (v) =>
          v.type?.toLowerCase() === "logistics" ||
          v.type?.toLowerCase() === "transport"
      ).length,
      color: "#4caf50",
    },
    {
      type: "Others",
      count: vessels.filter(
        (v) =>
          !["mining", "fishing", "logistics", "transport"].includes(
            v.type?.toLowerCase() || ""
          )
      ).length,
      color: "#9e9e9e",
    },
  ];

  // Filter data based on selected status
  const filteredData = selectedStatus
    ? statusData.filter((item) => item.status === selectedStatus)
    : statusData;

  return (
    <div className="fleet-statistics">
      <div className="flex flex-col w-full relative">
        <div className="bg-teal-500 rounded-full md:h-10 md:w-1/2 max-w-28 flex items-center justify-between px-2  mb-2">
          <span className=" text-white font-semibold text-[10px] md:text-sm ">
            Total Vessels
          </span>

          {vessels.length}
        </div>

        <div className="flex flex-col gap-2">
          {/* Vessel type summary */}
          <div className="flex flex-wrap gap-2 w-full justify-start md:justify-start hidden">
            {vesselTypeSummary.map((item) => (
              <div
                key={item.type}
                className="flex items-center bg-white rounded-lg px-3 py-1 shadow text-sm font-semibold"
                style={{ color: item.color }}
              >
                <span
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: item.color }}
                ></span>
                {item.type}: <span className="ml-1">{item.count}</span>
              </div>
            ))}
          </div>
          <div className="text-center md:text-end text-sm">
            <div className="font-extrabold md:text-sm text-[#0a2259]">
              FLEET MANAGEMENT
            </div>
            <div className="font-extrabold text-sm text-[#0a2259] mt-1">
              FLEET OPERATIONS STATUS
            </div>
          </div>
        </div>

        <div className="flex md:flex-row gap-4 place-items-end">
          <div className="w-full h-80 hidden md:block">
            <div className="font-bold text-[#0a2259] mb-2 md:text-left">
              TRIP STATUS
            </div>
            <ul className="space-y-1">
              {statusData.map((item) => (
                <li
                  key={item.status}
                  className={`flex items-baseline text-sm cursor-pointer ${
                    selectedStatus === item.status ? "font-bold" : ""
                  }`}
                  onClick={() =>
                    setSelectedStatus((prev) =>
                      prev === item.status ? null : item.status
                    )
                  }
                >
                  <span className="font-bold text-[#0a2259] w-full md:w-8 inline-block">
                    {item.count}-
                  </span>
                  <span className="italic ml-1" style={{ color: item.color }}>
                    ({item.status})
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: Chart and Header */}
          <div className="flex-1 flex flex-col justify-center items-center  md:p-6">
            <div className="w-[100vw] md:w-[500px] h-80 flex items-end">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filteredData}
                  barCategoryGap={0}
                  barGap={0}
                  margin={{
                    top: 20,
                    right: 20,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="1" />
                  <XAxis dataKey="status" className="text-xs md:text-sm" />
                  {/* <YAxis className="text-xs md:text-sm" /> */}
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="count">
                    {filteredData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
