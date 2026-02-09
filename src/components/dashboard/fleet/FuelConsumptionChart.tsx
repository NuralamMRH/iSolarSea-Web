import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "@/hooks/use-translation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Fuel } from "lucide-react";
import { Plus } from "lucide-react";

interface FuelData {
  id: string;
  trip_id: string;
  vessel_id: string;
  start_mileage: number;
  end_mileage: number;
  refueling_volume: number;
  fuel_consumption: number;
  refueling_date: string;
  remarks: string;
  fishing_trips?: {
    trip_code: string;
    departure_date: string;
    arrival_date: string;
  };
}

interface ChartDataItem {
  trip: string;
  totalVolume: number;
  records: FuelData[];
  tripDays: number;
}

interface FuelConsumptionChartProps {
  vesselId: string;
  tripId?: string;
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

export default function FuelConsumptionChart({
  vesselId,
  tripId,
}: FuelConsumptionChartProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<FuelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

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

  useEffect(() => {
    fetchFuelData();
  }, [vesselId]);

  const calculateTripDays = (departureDate: string, arrivalDate?: string) => {
    const start = new Date(departureDate);
    const end = arrivalDate ? new Date(arrivalDate) : new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const fetchFuelData = async () => {
    try {
      const { data: fuelData, error } = await supabase
        .from("fuel_consumption")
        .select("*, fishing_trips(trip_code)")
        .eq("vessel_id", vesselId);

      if (error) throw error;

      // Group data by trip
      const groupedData = (fuelData || []).reduce<
        Record<string, ChartDataItem>
      >((acc, curr) => {
        const tripCode = curr.fishing_trips?.trip_code || "Unknown Trip";
        if (!acc[tripCode]) {
          acc[tripCode] = {
            trip: tripCode,
            totalVolume: 0,
            records: [],
            tripDays: curr.fishing_trips?.departure_date
              ? calculateTripDays(
                  curr.fishing_trips.departure_date,
                  curr.fishing_trips.arrival_date
                )
              : 0,
          };
        }
        acc[tripCode].totalVolume += curr.refueling_volume;
        acc[tripCode].records.push(curr);
        return acc;
      }, {});

      // Convert to array format for chart
      const formattedData = Object.values(groupedData);
      setChartData(formattedData);
      setData(fuelData || []);
    } catch (error) {
      console.error("Error fetching fuel data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFuelData = async () => {
    try {
      const { error } = await supabase.from("fuel_consumption").insert({
        vessel_id: vesselId,
        trip_id: tripId,
        start_mileage: newFuelData.start_mileage,
        end_mileage: newFuelData.end_mileage,
        refueling_volume: newFuelData.refueling_volume,
        fuel_consumption:
          ((newFuelData.end_mileage - newFuelData.start_mileage) /
            newFuelData.refueling_volume) *
          100,
        refueling_date: newFuelData.edit_date,
        remarks: newFuelData.remarks,
      });

      if (error) throw error;

      setAddDialogOpen(false);
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

  if (loading) {
    return <div>Loading fuel consumption data...</div>;
  }

  // Flattened records for pagination
  const allRecords = chartData.flatMap((tripData) =>
    tripData.records.map((record) => ({
      ...record,
      trip_code: record.fishing_trips?.trip_code || "Unknown Trip",
      trip_days: tripData.tripDays,
    }))
  );
  const totalPages = Math.ceil(allRecords.length / rowsPerPage);
  const paginatedRecords = allRecords.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Fuel className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-bold text-[#0B1C35]">
            CHART FUEL CONSUMPTION
          </h2>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          {data.length === 0 ? "Add First Fuel Record" : "Add Fuel Record"}
        </Button>
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-center">NĂM 2025</h3>
        {chartData.length > 0 ? (
          <div className="relative">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="trip" />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="totalVolume"
                  fill="#7DD3FC"
                  name="Refueling Volume (L)"
                  label={{ position: "top" }}
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="absolute top-0 right-0">
              <Fuel className="w-8 h-8 text-blue-300" />
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No fuel consumption records yet.
          </div>
        )}
      </div>

      {/* Fuel Consumption Table with Pagination */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trip #</TableHead>
              <TableHead>Edit Date</TableHead>
              <TableHead>Trip days (days)</TableHead>
              <TableHead>Start mileage (km)</TableHead>
              <TableHead>End mileage (km)</TableHead>
              <TableHead>Refueling volume (L)</TableHead>
              <TableHead>Fuel consumption (L/100km)</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRecords.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">
                  {record.trip_code}
                </TableCell>
                <TableCell>
                  {new Date(record.refueling_date).toLocaleDateString()}
                </TableCell>
                <TableCell>{record.trip_days}</TableCell>
                <TableCell>{record.start_mileage}</TableCell>
                <TableCell>{record.end_mileage}</TableCell>
                <TableCell>{record.refueling_volume.toFixed(1)}</TableCell>
                <TableCell>{record.fuel_consumption}</TableCell>
                <TableCell>{record.remarks}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => (
              <Button
                key={i + 1}
                variant={currentPage === i + 1 ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Add Fuel Data Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
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
                  onChange={(e) =>
                    setNewFuelData((prev) => ({
                      ...prev,
                      start_mileage: Number(e.target.value),
                    }))
                  }
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
                  onChange={(e) =>
                    setNewFuelData((prev) => ({
                      ...prev,
                      end_mileage: Number(e.target.value),
                    }))
                  }
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
                  onChange={(e) =>
                    setNewFuelData((prev) => ({
                      ...prev,
                      refueling_volume: Number(e.target.value),
                      fuel_consumption:
                        ((newFuelData.end_mileage - newFuelData.start_mileage) /
                          Number(e.target.value)) *
                        100,
                    }))
                  }
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
    </div>
  );
}
