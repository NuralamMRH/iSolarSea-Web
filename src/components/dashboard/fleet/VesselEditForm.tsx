import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";

interface VesselFormData {
  name: string;
  type: string;
  type_of_vessel: string;
  fileUrl: string;
  registration_number: string;
  captain_name: string;
  owner_name: string;
  owner_id: string;
  owner_id_card: string;
  residential_address: string;
  capacity: string;
  length: string;
  width: string;
  draught: string;
  hull_material: string;
  materials: string;
  number_of_engines: string;
  engine_power: string;
  engine_model: string;
  engine_serial_number: string;
  port_of_registry: string;
  port_registry: string;
  vessel_type_from_doc: string;
  type_of_machine: string;
  gross_tonnage: string;
  crew_count: string;
  fishing_method: string;
  fishery_permit: string;
  expiration_date: string;
  number_engines: number;
  fishing_gear: {
    purse_seine: boolean;
    hook: boolean;
    net: boolean;
    trawl: boolean;
  };
}

interface VesselEditFormProps {
  vesselId: string;
  initialData: VesselFormData;
  onClose: () => void;
  onSuccess: () => void;
}

export default function VesselEditForm({
  vesselId,
  initialData,
  onClose,
  onSuccess,
}: VesselEditFormProps) {
  const [formData, setFormData] = useState<VesselFormData>(initialData);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (name: keyof typeof formData.fishing_gear) => {
    setFormData((prev) => ({
      ...prev,
      fishing_gear: {
        ...prev.fishing_gear,
        [name]: !prev.fishing_gear[name],
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("vessels")
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", vesselId);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating vessel:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 max-h-[60vh] overflow-y-auto p-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-gray-500 " htmlFor="name">
            Vessel Name
          </Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
        </div>

        <div>
          <Label className="text-gray-500 " htmlFor="registration_number">
            Registration Number
          </Label>
          <Input
            id="registration_number"
            name="registration_number"
            value={formData.registration_number}
            onChange={handleInputChange}
            required
          />
        </div>

        <div>
          <Label className="text-gray-500 " htmlFor="captain_name">
            Captain Name
          </Label>
          <Input
            id="captain_name"
            name="captain_name"
            value={formData.captain_name}
            onChange={handleInputChange}
          />
        </div>

        <div>
          <Label className="text-gray-500 " htmlFor="owner_name">
            Owner Name
          </Label>
          <Input
            id="owner_name"
            name="owner_name"
            value={formData.owner_name}
            onChange={handleInputChange}
          />
        </div>

        <div>
          <Label className="text-gray-500 " htmlFor="capacity">
            Capacity (tons)
          </Label>
          <Input
            id="capacity"
            name="capacity"
            type="number"
            value={formData.capacity}
            onChange={handleInputChange}
          />
        </div>

        <div>
          <Label className="text-gray-500 " htmlFor="length">
            Length (m)
          </Label>
          <Input
            id="length"
            name="length"
            type="number"
            value={formData.length}
            onChange={handleInputChange}
          />
        </div>

        <div>
          <Label className="text-gray-500 " htmlFor="width">
            Width (m)
          </Label>
          <Input
            id="width"
            name="width"
            type="number"
            value={formData.width}
            onChange={handleInputChange}
          />
        </div>

        <div>
          <Label className="text-gray-500 " htmlFor="engine_power">
            Engine Power
          </Label>
          <Input
            id="engine_power"
            name="engine_power"
            value={formData.engine_power}
            onChange={handleInputChange}
          />
        </div>

        <div>
          <Label className="text-gray-500 " htmlFor="crew_count">
            Crew Count
          </Label>
          <Input
            id="crew_count"
            name="crew_count"
            type="number"
            value={formData.crew_count}
            onChange={handleInputChange}
          />
        </div>

        <div>
          <Label className="text-gray-500 " htmlFor="fishing_method">
            Fishing Method
          </Label>
          <Input
            id="fishing_method"
            name="fishing_method"
            value={formData.fishing_method}
            onChange={handleInputChange}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-gray-500 ">Fishing Gear</Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="purse_seine"
              checked={formData.fishing_gear.purse_seine}
              onCheckedChange={() => handleCheckboxChange("purse_seine")}
            />
            <Label className="text-gray-500 " htmlFor="purse_seine">
              Purse Seine
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="hook"
              checked={formData.fishing_gear.hook}
              onCheckedChange={() => handleCheckboxChange("hook")}
            />
            <Label className="text-gray-500 " htmlFor="hook">
              Hook
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="net"
              checked={formData.fishing_gear.net}
              onCheckedChange={() => handleCheckboxChange("net")}
            />
            <Label className="text-gray-500 " htmlFor="net">
              Net
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="trawl"
              checked={formData.fishing_gear.trawl}
              onCheckedChange={() => handleCheckboxChange("trawl")}
            />
            <Label className="text-gray-500 " htmlFor="trawl">
              Trawl
            </Label>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
