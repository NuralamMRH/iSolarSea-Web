import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import TopButtons from "@/components/top-buttons";
import { useEffect, useState, useMemo } from "react";
import { getCurrentUser, supabase } from "@/lib/supabase";
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
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Ship,
  Users,
  Upload,
  Presentation,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguageStore } from "@/stores/language-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { PDFDownloadLink, pdf } from "@react-pdf/renderer";
import { DeparturePDF } from "@/components/dashboard/DeparturePDF"; // adjust path as needed
import { useTranslation } from "@/hooks/use-translation";
import { useAuthStore } from "@/stores/auth-store";
import { Toast } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import CompanyForm from "@/components/dashboard/CompanyForm";
import FleetBarChart from "@/components/dashboard/fleet/FleetBarChart";
import { Badge } from "@/components/ui/badge";
import { API_ENDPOINTS, APP_CONFIG } from "@/lib/constants";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { jsPDF } from "jspdf";
import RegionBasedFleet from "@/components/dashboard/fleet/RegionBasedFleet";
import VesselsFilter from "@/components/dashboard/fleet/VesselsFilter";
import FleetRecords from "@/components/dashboard/fleet/FleetRecords";

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
};
function getDaysBetween(start: string, end: string) {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.max(0, Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24)));
}
// Type for joined catch record with haul info
interface CatchRecordWithHaul
  extends Omit<
    Database["public"]["Tables"]["catch_records"]["Row"],
    "haul_id"
  > {
  haul_id: { id: string; haul_number: number; qr_code: string } | string;
  tank: string;
  species: string;
  fish_size: string;
  quantity: number;
  id: string;
  image_url: string;
  net_kg_per_case: string | number;
}
// Type for product order (define locally if not in types)
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

interface TripData {
  id: string;
  vessel_id: string;
  vessel_name: string;
  departure_date: string;
  return_date: string | null;
  status: "ongoing" | "completed" | "planned";
  catch_volume?: number;
  destination?: string;
}

// Define CrewMember type for crewList
interface CrewMember {
  id?: string;
  name: string;
  position: string;
  id_card: string;
  phone: string;
  id_card_front: string;
  id_card_back: string;
  showDelete?: boolean;
  deleteConfirm?: boolean;
  role?: string;
  contact_phone?: string;
}

interface GrantLink {
  id: string;
  vessel_id: string;
  crew_id: string;
  role: string;
  grant_code: string;
  granted_by: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  // Add other fields as needed
}

interface ScannedVesselData {
  vessel_owner?: string;
  owner_id?: string;
  residential_address?: string;
  vessel_id?: string;
  type_of_vessel?: string;
  gross_tonnage?: string;
  length_overall?: string;
  breadth?: string;
  draught?: string;
  materials?: string;
  number_of_engines?: string;
  total_power?: string;
  type_of_machine?: string;
  number_engines?: string;
  port_registry?: string;
  vessel_name?: string;
  port_of_registry?: string;
}

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
  crew_info: CrewMember[];
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

interface VesselFormData {
  name: string;
  type: "mining" | "logistics";
  type_of_vessel: string;
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
  vessel_type_from_doc: string;
  type_of_machine: string;
  gross_tonnage: string;
  crew_count: string;
  number_engines: string;
  fishing_method: string;
  fishery_permit: string;
  expiration_date: string;
  port_registry: string;
  fishing_gear: {
    purse_seine: boolean;
    hook: boolean;
    net: boolean;
    trawl: boolean;
  };
  crew_info: CrewMember[];
  fileUrl?: string;
}

interface CrewDbRecord {
  id: string;
  name: string;
  position?: string;
  role?: string;
  id_card?: string;
  phone?: string;
  contact_phone?: string;
  id_card_front?: string;
  id_card_back?: string;
  created_at?: string;
  document_id?: string;
  vessel_id?: string;
}

// --- VesselScanUpload Component ---
function VesselScanUpload({
  isScanning,
  scanProgress,
  previewUrl,
  isDragging,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileInputClick,
  onFileChange,
  language,
}) {
  return (
    <div className="grid gap-4 py-4">
      <div
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={onFileInputClick}
        className={`relative p-6 border-2 border-dashed rounded-md cursor-pointer text-center transition-colors ${
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
        }`}
      >
        {/* Scanning overlay */}
        {isScanning && (
          <div className="absolute inset-0 bg-white bg-opacity-80 flex flex-col items-center justify-center z-10">
            <svg
              className="animate-spin h-8 w-8 text-blue-500 mb-2"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
            <span className="text-blue-700 font-semibold">Scanning...</span>
          </div>
        )}
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Document Preview"
            className="mx-auto h-32 object-contain"
          />
        ) : (
          <>
            <input
              id="file-upload-input"
              type="file"
              className="hidden"
              accept="image/*"
              onChange={onFileChange}
            />
            <Upload size={32} className="mx-auto text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              {language === "en"
                ? "Drag & drop an image here, or click to select one"
                : "Kéo và thả ảnh vào đây, hoặc nhấn để chọn một ảnh"}
            </p>
          </>
        )}
        <div className="flex flex-col md:flex-row gap-4 w-full p-3 ">
          {scanProgress <= 100 && scanProgress > 10 && !isScanning && (
            <div className="flex flex-col md:flex-row gap-4 w-full p-3 ">
              <Presentation size={16} className="mx-auto text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                Loading... Please wait a while
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- VesselForm Component ---
function VesselForm({
  vesselFormData,
  scannedData,
  language,
  handleInputChange,
  handleSelectChange,
  handleImageUpload,
  onSubmit,
  isEdit,
  setVesselFormData,
  editVesselId,
  supabase,
  deletedCrewIds,
  setDeletedCrewIds,
  crewList,
  PhoneInput,
  Plus,
  Trash2,
}) {
  return (
    <form onSubmit={onSubmit}>
      {/* Show image preview if fileUrl exists */}
      {vesselFormData.fileUrl && (
        <div className="mb-4 flex justify-center">
          <img
            src={vesselFormData.fileUrl}
            alt="Document Preview"
            className="max-w-full h-[200px] rounded-lg shadow-lg"
          />
        </div>
      )}
      {/* Vessel Form Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="registration_number">
            {language === "en" ? "Registration Number" : "Số đăng ký"}
          </Label>
          <Input
            id="registration_number"
            name="registration_number"
            value={vesselFormData.registration_number}
            onChange={handleInputChange}
            readOnly={!!scannedData}
            className={
              scannedData ? "bg-muted" : "bg-light-gray border border-gray-500"
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">
            {language === "en" ? "Vessel Name" : "Tên tàu"}
          </Label>
          <Input
            id="name"
            name="name"
            value={vesselFormData.name || vesselFormData.registration_number}
            onChange={handleInputChange}
            readOnly={!!scannedData?.vessel_name}
            className={
              scannedData?.vessel_name
                ? "bg-muted"
                : "bg-light-gray border border-gray-500"
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="owner_name">
            {language === "en" ? "Vessel owner" : "Chủ tàu"}
          </Label>
          <Input
            id="owner_name"
            name="owner_name"
            value={vesselFormData.owner_name}
            onChange={handleInputChange}
            readOnly={!!scannedData?.vessel_owner}
            className={
              scannedData?.vessel_owner
                ? "bg-muted"
                : "bg-light-gray border border-gray-500"
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="owner_id">
            {language === "en" ? "Owner ID" : "CCCD"}
          </Label>
          <Input
            id="owner_id"
            name="owner_id"
            value={vesselFormData.owner_id}
            onChange={handleInputChange}
          />
        </div>
      </div>
      <div className="grid gap-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="residential_address">
            {language === "en" ? "Residential address" : "Nơi thường trú"}
          </Label>
          <Input
            id="residential_address"
            name="residential_address"
            value={vesselFormData.residential_address}
            onChange={handleInputChange}
            readOnly={!!scannedData?.residential_address}
            className={
              scannedData?.vessel_owner
                ? "bg-muted"
                : "bg-light-gray border border-gray-500"
            }
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="type_of_vessel">
            {language === "en" ? "Type of Vessel" : "Kiểu tàu"}
          </Label>
          <Input
            id="type_of_vessel"
            name="type_of_vessel"
            value={vesselFormData.type_of_vessel}
            onChange={handleInputChange}
            readOnly={!!scannedData?.type_of_vessel}
            className={
              scannedData?.type_of_vessel
                ? "bg-muted"
                : "bg-light-gray border border-gray-500"
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gross_tonnage">
            {language === "en" ? "Gross Tonnage" : "Tông dung tích, GT:"}
          </Label>
          <Input
            id="gross_tonnage"
            name="gross_tonnage"
            value={vesselFormData.gross_tonnage}
            onChange={handleInputChange}
            readOnly={!!scannedData?.gross_tonnage}
            className={
              scannedData?.gross_tonnage
                ? "bg-muted"
                : "bg-light-gray border border-gray-500"
            }
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="length">
            {language === "en" ? "Length (m)" : "Chiều dài Lmax, m:"}
          </Label>
          <Input
            id="length"
            name="length"
            value={vesselFormData.length}
            onChange={handleInputChange}
            readOnly={!!scannedData?.length_overall}
            className={
              scannedData?.length_overall
                ? "bg-muted"
                : "bg-light-gray border border-gray-500"
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="width">
            {language === "en" ? "Width (m)" : "Chiều rộng Bmax, m:"}
          </Label>
          <Input
            id="width"
            name="width"
            value={vesselFormData.width}
            onChange={handleInputChange}
            readOnly={!!scannedData?.breadth}
            className={
              scannedData?.breadth
                ? "bg-muted"
                : "bg-light-gray border border-gray-500"
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="draught">
            {language === "en" ? "Draught" : "Chiêu cao mạn D, m:"}
          </Label>
          <Input
            id="draught"
            name="draught"
            value={vesselFormData.draught}
            onChange={handleInputChange}
            readOnly={!!scannedData?.draught}
            className={
              scannedData?.draught
                ? "bg-muted"
                : "bg-light-gray border border-gray-500"
            }
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="materials">
            {language === "en" ? "Materials" : "Vật liệu vỏ:"}
          </Label>
          <Input
            id="materials"
            name="materials"
            value={vesselFormData.materials}
            onChange={handleInputChange}
            readOnly={!!scannedData?.materials}
            className={
              scannedData?.materials
                ? "bg-muted"
                : "bg-light-gray border border-gray-500"
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="engine_power">
            {language === "en" ? "Engine Power" : "Công suất KW"}
          </Label>
          <Input
            id="engine_power"
            name="engine_power"
            value={vesselFormData.engine_power}
            onChange={handleInputChange}
            readOnly={!!scannedData?.total_power}
            className={
              scannedData?.total_power
                ? "bg-muted"
                : "bg-light-gray border border-gray-500"
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="number_engines">
            {language === "en" ? "Number engines" : "Số máy"}
          </Label>
          <Input
            id="number_engines"
            name="number_engines"
            value={vesselFormData.number_engines}
            onChange={handleInputChange}
            readOnly={!!scannedData?.number_engines}
            className={
              scannedData?.number_engines
                ? "bg-muted"
                : "bg-light-gray border border-gray-500"
            }
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="type">
            {language === "en" ? "Vessel Type" : "Loại tàu"} *
          </Label>
          <Select
            value={vesselFormData.type}
            onValueChange={handleSelectChange}
          >
            <SelectTrigger>
              <span>
                {vesselFormData.type === "mining"
                  ? language === "en"
                    ? "Fishing Vessel"
                    : "Tàu cá"
                  : language === "en"
                  ? "Logistics Service Ship"
                  : "Tàu dịch vụ"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="mining">
                  {language === "en" ? "Fishing Vessel" : "Tàu cá"}
                </SelectItem>
                <SelectItem value="logistics">
                  {language === "en" ? "Logistics Service Ship" : "Tàu dịch vụ"}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fishery_permit">
            {language === "en" ? "Fishery permit" : "Giấy phép khai thác"}
          </Label>
          <Input
            id="fishery_permit"
            name="fishery_permit"
            value={vesselFormData.fishery_permit}
            onChange={handleInputChange}
            readOnly={!!scannedData?.fishery_permit}
            className={
              scannedData?.fishery_permit
                ? "bg-muted"
                : "bg-light-gray border border-gray-500"
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiration_date">
            {language === "en" ? "Expiration date" : "Thời hạn"}
          </Label>
          <Input
            id="expiration_date"
            name="expiration_date"
            type="date"
            value={vesselFormData.expiration_date}
            onChange={handleInputChange}
            readOnly={!!scannedData?.expiration_date}
            className={
              scannedData?.expiration_date
                ? "bg-muted"
                : "bg-light-gray border border-gray-500"
            }
          />
        </div>
      </div>
      <div className="space-y-4 mt-4">
        <div>
          <Label>
            {language === "en" ? "Fishing method/gear" : "Phương pháp đánh bắt"}
          </Label>
          <div className="grid grid-cols-2 gap-2 mt-2 text-[12px]">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="purse_seine"
                className="h-8 w-8 bg-light-gray border border-gray-500"
                checked={vesselFormData.fishing_gear.purse_seine}
                onChange={(e) =>
                  setVesselFormData((prev) => ({
                    ...prev,
                    fishing_gear: {
                      ...prev.fishing_gear,
                      purse_seine: e.target.checked,
                    },
                  }))
                }
              />
              <Label htmlFor="purse_seine">Purse Seine</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="hook"
                className="h-8 w-8"
                checked={vesselFormData.fishing_gear.hook}
                onChange={(e) =>
                  setVesselFormData((prev) => ({
                    ...prev,
                    fishing_gear: {
                      ...prev.fishing_gear,
                      hook: e.target.checked,
                    },
                  }))
                }
              />
              <Label htmlFor="hook">Hook</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="net"
                className="h-8 w-8"
                checked={vesselFormData.fishing_gear.net}
                onChange={(e) =>
                  setVesselFormData((prev) => ({
                    ...prev,
                    fishing_gear: {
                      ...prev.fishing_gear,
                      net: e.target.checked,
                    },
                  }))
                }
              />
              <Label htmlFor="net">Net</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="trawl"
                className="h-8 w-8"
                checked={vesselFormData.fishing_gear.trawl}
                onChange={(e) =>
                  setVesselFormData((prev) => ({
                    ...prev,
                    fishing_gear: {
                      ...prev.fishing_gear,
                      trawl: e.target.checked,
                    },
                  }))
                }
              />
              <Label htmlFor="trawl">Trawl</Label>
            </div>
          </div>
        </div>
        <div>
          <Label>
            {language === "en" ? "Crew Information" : "Thông tin thuyền viên"}
          </Label>
          <div className="space-y-4 mt-2">
            {vesselFormData.crew_info.map((crew, index) => (
              <div key={index} className="space-y-4 relative">
                <Button
                  type="button"
                  variant={
                    vesselFormData.crew_info[index].showDelete
                      ? "destructive"
                      : "outline"
                  }
                  size="icon"
                  className="relative group"
                  onMouseEnter={() => {
                    const newCrewInfo = [...vesselFormData.crew_info];
                    newCrewInfo[index] = {
                      ...newCrewInfo[index],
                      showDelete: true,
                    };
                    setVesselFormData((prev) => ({
                      ...prev,
                      crew_info: newCrewInfo,
                    }));
                  }}
                  onMouseLeave={() => {
                    if (!vesselFormData.crew_info[index].deleteConfirm) {
                      const newCrewInfo = [...vesselFormData.crew_info];
                      newCrewInfo[index] = {
                        ...newCrewInfo[index],
                        showDelete: false,
                      };
                      setVesselFormData((prev) => ({
                        ...prev,
                        crew_info: newCrewInfo,
                      }));
                    }
                  }}
                  onClick={async () => {
                    const newCrewInfo = [...vesselFormData.crew_info];
                    const deleted = newCrewInfo[index];
                    if (editVesselId && deleted.id) {
                      // If editing and crew has an id, delete from DB immediately
                      await supabase
                        .from("crew_members")
                        .delete()
                        .eq("id", deleted.id);
                      setDeletedCrewIds((prev) => [...prev, deleted.id!]);
                    }
                    newCrewInfo.splice(index, 1);
                    setVesselFormData((prev) => ({
                      ...prev,
                      crew_info: newCrewInfo,
                    }));
                  }}
                >
                  {vesselFormData.crew_info[index].showDelete ||
                  vesselFormData.crew_info[index].deleteConfirm ? (
                    <Trash2 className="h-4 w-4" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </Button>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder={language === "en" ? "Name" : "Tên"}
                    value={crew.name}
                    onChange={(e) => {
                      const newCrewInfo = [...vesselFormData.crew_info];
                      newCrewInfo[index].name = e.target.value;
                      setVesselFormData((prev) => ({
                        ...prev,
                        crew_info: newCrewInfo,
                      }));
                    }}
                    className={"bg-light-gray border border-gray-500"}
                  />
                  <Input
                    placeholder={language === "en" ? "Position" : "Vị trí"}
                    value={crew.position}
                    onChange={(e) => {
                      const newCrewInfo = [...vesselFormData.crew_info];
                      newCrewInfo[index].position = e.target.value;
                      setVesselFormData((prev) => ({
                        ...prev,
                        crew_info: newCrewInfo,
                      }));
                    }}
                    className={"bg-light-gray border border-gray-500"}
                  />
                  <Input
                    placeholder={language === "en" ? "ID Card" : "CCCD"}
                    value={crew.id_card}
                    onChange={(e) => {
                      const newCrewInfo = [...vesselFormData.crew_info];
                      newCrewInfo[index].id_card = e.target.value;
                      setVesselFormData((prev) => ({
                        ...prev,
                        crew_info: newCrewInfo,
                      }));
                    }}
                    className={"bg-light-gray border border-gray-500"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {language === "en" ? "Phone Number" : "Số điện thoại"}
                  </Label>
                  <PhoneInput
                    value={crew.phone}
                    onChange={(value) => {
                      const newCrewInfo = [...vesselFormData.crew_info];
                      newCrewInfo[index].phone = value || "";
                      setVesselFormData((prev) => ({
                        ...prev,
                        crew_info: newCrewInfo,
                      }));
                    }}
                    defaultCountry="VN"
                    className={"bg-light-gray border border-gray-500"}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-2">
                    <Label className="mb-2 block">
                      {language === "en" ? "ID Card Front" : "Mặt trước CCCD"}
                    </Label>
                    <div className="flex items-center gap-2 flex-col">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, index, "front");
                        }}
                        className={"bg-light-gray border border-gray-500"}
                      />
                      {crew.id_card_front && (
                        <img
                          src={crew.id_card_front}
                          alt="ID Card Front"
                          className="h-20 w-32 object-cover rounded cursor-pointer"
                          onClick={() =>
                            window.open(crew.id_card_back, "_blank")
                          }
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Label className="mb-2 block">
                      {language === "en" ? "ID Card Back" : "Mặt sau CCCD"}
                    </Label>
                    <div className="flex items-center gap-2 flex-col">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, index, "back");
                        }}
                        className={"bg-light-gray border border-gray-500"}
                      />
                      {crew.id_card_back && (
                        <img
                          src={crew.id_card_back}
                          alt="ID Card Back"
                          className="h-20 w-32 object-cover rounded cursor-pointer"
                          onClick={() =>
                            window.open(crew.id_card_back, "_blank")
                          }
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setVesselFormData((prev) => ({
                  ...prev,
                  crew_info: [
                    ...prev.crew_info,
                    {
                      name: "",
                      position: "",
                      id_card: "",
                      phone: "",
                      id_card_front: "",
                      id_card_back: "",
                    },
                  ],
                }))
              }
              className={
                "bg-light-gray border border-gray-500 float-right mt-4"
              }
            >
              <Plus className="w-4 h-4 mr-2" />
              {language === "en" ? "Add Crew Member" : "Thêm thuyền viên"}
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-4 w-full p-3 mt-4">
        <Button type="submit" className="w-full md:w-1/3">
          {language === "en" ? "Save" : "Lưu"}
        </Button>
      </div>
    </form>
  );
}

export default function ProcessingPlantShipList() {
  const { language } = useLanguageStore();
  const isMobile = useIsMobile();

  const { user, isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  const { t } = useTranslation();

  // State for form fields
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [repName, setRepName] = useState("");
  const [repPosition, setRepPosition] = useState("");
  const [repPhone, setRepPhone] = useState("");
  const [repEmail, setRepEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [hasCompany, setHasCompany] = useState(false);

  //xxxx

  const [vessels, setVessels] = useState<VesselData[]>([]);
  const [trips, setTrips] = useState<TripData[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [selectedVessel, setSelectedVessel] = useState<VesselData | null>(null);
  const [crewList, setCrewList] = useState<CrewMember[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<CrewMember | null>(null);
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [grantLink, setGrantLink] = useState<string>("");
  const [grantType, setGrantType] = useState<"email" | "phone" | null>(null);
  const [isGranting, setIsGranting] = useState(false);
  const [grantLinksByVessel, setGrantLinksByVessel] = useState<
    Record<string, GrantLink[]>
  >({});
  const [showGrantLinksDialog, setShowGrantLinksDialog] = useState(false);
  const [selectedGrantLinks, setSelectedGrantLinks] = useState<GrantLink[]>([]);
  const [selectedGrantVessel, setSelectedGrantVessel] =
    useState<VesselData | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  const [isScanning, setIsScanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [mobileScanUrl, setMobileScanUrl] = useState("");
  const [scannedData, setScannedData] = useState<ScannedVesselData | null>(
    null
  );

  const [vesselFormData, setVesselFormData] = useState<VesselFormData>({
    name: "",
    type: "mining",
    type_of_vessel: "",
    registration_number: "",
    captain_name: "",
    owner_name: "",
    owner_id: "",
    owner_id_card: "",
    residential_address: "",
    capacity: "",
    length: "",
    width: "",
    draught: "",
    hull_material: "",
    materials: "",
    number_of_engines: "",
    engine_power: "",
    engine_model: "",
    engine_serial_number: "",
    port_of_registry: "",
    vessel_type_from_doc: "",
    type_of_machine: "",
    gross_tonnage: "",
    crew_count: "",
    number_engines: "",
    fishing_method: "",
    fishery_permit: "",
    expiration_date: "",
    port_registry: "",
    fishing_gear: {
      purse_seine: false,
      hook: false,
      net: false,
      trawl: false,
    },
    crew_info: [],
    fileUrl: "",
  });
  const [editVesselId, setEditVesselId] = useState<string | null>(null);
  const [deletedCrewIds, setDeletedCrewIds] = useState<string[]>([]);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successVessel, setSuccessVessel] = useState<{
    registration_number: string;
    name: string;
  }>({ registration_number: "", name: "" });

  const handleDocumentScan = async (file: File) => {
    try {
      if (!user?.auth_id) {
        throw new Error("User not authenticated");
      }

      setIsScanning(true);
      setScanProgress(0);
      setPreviewUrl(URL.createObjectURL(file));

      // Simulate scanning progress with more visible timing
      const progressInterval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev < 20) return prev + 2;
          if (prev < 40) return prev + 3;
          if (prev < 70) return prev + 2;
          if (prev < 85) return prev + 1;
          return prev;
        });
      }, 200);

      // Start the OCR request after a brief delay to show the scanning effect
      setTimeout(async () => {
        try {
          // Upload file directly to tesseract-ocr endpoint
          const formData = new FormData();
          formData.append("image", file);

          const response = await fetch(
            `${APP_CONFIG.API_URL}${API_ENDPOINTS.TESSERACT_OCR}`,
            {
              method: "POST",
              body: formData,
            }
          );

          clearInterval(progressInterval);
          setScanProgress(100);

          if (!response.ok) {
            throw new Error("OCR failed");
          }

          const result = await response.json();
          console.log("result ", result);

          // Update scanned data state
          setScannedData(result.extractedData);

          // Update form with scanned data
          setVesselFormData((prev) => ({
            ...prev,
            fileUrl: result.fileUrl || prev.fileUrl,
            name: result.extractedData.vessel_owner || prev.name,
            owner_name: result.extractedData.vessel_owner || prev.owner_name,
            owner_id_card: result.extractedData.owner_id || prev.owner_id_card,
            residential_address:
              result.extractedData.residential_address ||
              prev.residential_address,
            registration_number:
              result.extractedData.vessel_id || prev.registration_number,
            vessel_type_from_doc:
              result.extractedData.type_of_vessel || prev.vessel_type_from_doc,
            gross_tonnage:
              result.extractedData.gross_tonnage || prev.gross_tonnage,
            length: result.extractedData.length_overall || prev.length,
            width: result.extractedData.breadth || prev.width,
            draught: result.extractedData.draught || prev.draught,
            materials: result.extractedData.materials || prev.materials,
            type_of_machine:
              result.extractedData.type_of_machine || prev.type_of_machine,
            number_engines:
              result.extractedData.number_engines || prev.number_engines,
            number_of_engines:
              result.extractedData.number_of_engines || prev.number_of_engines,
            engine_power: result.extractedData.total_power || prev.engine_power,
            engine_model:
              result.extractedData.type_of_machine || prev.engine_model,
            engine_serial_number:
              result.extractedData.number_engines || prev.engine_serial_number,
            port_of_registry:
              result.extractedData.port_registry || prev.port_of_registry,
            port_registry:
              result.extractedData.port_registry || prev.port_registry,
            type_of_vessel:
              result.extractedData.type_of_vessel || prev.type_of_vessel,
            type: result.extractedData.type_of_vessel
              ?.toLowerCase()
              .includes("tàu cá")
              ? "mining"
              : result.extractedData.type_of_vessel
                  ?.toLowerCase()
                  .includes("fishing")
              ? "mining"
              : prev.type,
          }));

          console.log("vesselFormData ", vesselFormData);

          // Show completion state for longer before transitioning
          setTimeout(() => {
            setScanDialogOpen(false);
            setQrDialogOpen(false);
            setDialogOpen(true);
            setIsScanning(false);
            setScanProgress(0);
            setPreviewUrl("");
          }, 2000); // Increased delay to 2 seconds

          toast({
            title:
              language === "en"
                ? "Document Scanned Successfully"
                : "Quét tài liệu thành công",
            description:
              language === "en"
                ? "Document has been processed and data extracted via Tesseract OCR."
                : "Tài liệu đã được xử lý và trích xuất dữ liệu bằng Tesseract OCR.",
            variant: "default",
          });
        } catch (error) {
          clearInterval(progressInterval);
          throw error;
        }
      }, 1000); // Start OCR after 1 second delay
    } catch (error) {
      console.error("Error processing document:", error);
      toast({
        variant: "destructive",
        title:
          language === "en"
            ? "Error Processing Document"
            : "Lỗi xử lý tài liệu",
        description:
          language === "en"
            ? "Failed to process the document. Please try again."
            : "Không thể xử lý tài liệu. Vui lòng thử lại.",
      });
      setScanProgress(0);
      setPreviewUrl("");
      setIsScanning(false);
    }
  };

  // Fetch existing company data for this user
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", user?.auth_id)
        .single();
      console.log("data: ", data);
      if (data) {
        setCompanyName(data.company_name || "");
        setAddress(data.address || "");
        setTaxCode(data.tax_code || "");
        setRepName(data.representative_name || "");
        setRepPosition(data.representative_position || "");
        setRepPhone(data.rep_phone || data.representative_phone || "");
        setRepEmail(data.representative_email || "");
        setHasCompany(true);
      } else {
        setHasCompany(false);
      }
    })();
  }, [user?.id]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthUserId(data?.user?.id ?? null);
    });
  }, []);

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUserId) {
      toast({
        title: t("companyForm.need_login"),
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("companies").upsert(
      {
        user_id: authUserId,
        company_name: companyName,
        address,
        tax_code: taxCode,
        representative_name: repName,
        representative_position: repPosition,
        rep_phone: repPhone,
        representative_email: repEmail,
      },
      { onConflict: "user_id" }
    );
    setLoading(false);
    if (error) {
      toast({
        title: t("companyForm.error_submit"),
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSuccessDialogOpen(true);
    }
  };

  // xxxxxxx

  useEffect(() => {
    console.log("selectedCrew ", selectedCrew);
  }, [selectedCrew]);

  // Mock data for visualization
  const mockVesselTypes = [
    { type: "Mining", count: 12 },
    { type: "Logistics", count: 8 },
  ];

  const mockVesselStatus = [
    { status: "active", count: 15 },
    { status: "maintenance", count: 2 },
    { status: "docked", count: 3 },
    { status: "at-sea", count: 5 },
  ];

  const mockTrips = [
    {
      id: "1",
      vessel_id: "1",
      vessel_name: "Sea Explorer I",
      departure_date: "2023-10-15",
      return_date: "2023-10-25",
      status: "completed",
      catch_volume: 1250,
      destination: "North Sea",
    },
    {
      id: "2",
      vessel_id: "2",
      vessel_name: "Ocean Voyager",
      departure_date: "2023-11-01",
      return_date: null,
      status: "ongoing",
      catch_volume: 850,
      destination: "South Bay",
    },
    {
      id: "3",
      vessel_id: "3",
      vessel_name: "Coastal Trader",
      departure_date: "2023-11-10",
      return_date: null,
      status: "planned",
      destination: "East Harbor",
    },
  ];

  useEffect(() => {
    if (user) {
      fetchVessels();
      // In a real implementation, we would fetch trips from Supabase
      setTrips(mockTrips as TripData[]);
    }
  }, [user]);

  const fetchVessels = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("vessels")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (error) throw error;

      const vesselsWithStatus: VesselData[] = (
        data as Record<string, unknown>[]
      ).map((vessel) => {
        const v = vessel as { [key: string]: unknown };
        return {
          id: String(v.id),
          name: String(v.name),
          fileUrl: v.fileUrl ? String(v.fileUrl) : "",
          type: v.type as "mining" | "logistics",
          type_of_vessel: v.type_of_vessel ? String(v.type_of_vessel) : "",
          registration_number: String(v.registration_number),
          captain_name: v.captain_name ? String(v.captain_name) : null,
          owner_name: v.owner_name ? String(v.owner_name) : null,
          owner_id: v.owner_id ? String(v.owner_id) : "",
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
          materials: v.materials ? String(v.materials) : "",
          crew_count:
            v.crew_count !== undefined && v.crew_count !== null
              ? Number(v.crew_count)
              : null,
          number_engines: v.number_engines ? String(v.number_engines) : "",
          fishing_method: v.fishing_method ? String(v.fishing_method) : null,
          fishery_permit: v.fishery_permit ? String(v.fishery_permit) : "",
          expiration_date: v.expiration_date ? String(v.expiration_date) : null,
          fishing_gear: v.fishing_gear
            ? (v.fishing_gear as VesselData["fishing_gear"])
            : { purse_seine: false, hook: false, net: false, trawl: false },
          crew_info: [], // Will be filled later
          created_at: String(v.created_at),
          owner_id_card: v.owner_id_card ? String(v.owner_id_card) : "",
          residential_address: v.residential_address
            ? String(v.residential_address)
            : "",
          draught: v.draught ? String(v.draught) : "",
          hull_material: v.hull_material ? String(v.hull_material) : "",
          number_of_engines: v.number_of_engines
            ? String(v.number_of_engines)
            : "",
          engine_model: v.engine_model ? String(v.engine_model) : "",
          engine_serial_number: v.engine_serial_number
            ? String(v.engine_serial_number)
            : "",
          port_of_registry: v.port_of_registry
            ? String(v.port_of_registry)
            : "",
          vessel_type_from_doc: v.vessel_type_from_doc
            ? String(v.vessel_type_from_doc)
            : "",
          gross_tonnage: v.gross_tonnage ? String(v.gross_tonnage) : "",
          port_registry: v.port_registry ? String(v.port_registry) : "",
          type_of_machine: v.type_of_machine ? String(v.type_of_machine) : "",
          status: ["active", "maintenance", "docked", "at-sea"][
            Math.floor(Math.random() * 4)
          ] as "active" | "maintenance" | "docked" | "at-sea",
          last_location: {
            lat: 10.8231 + Math.random() * 0.5,
            lng: 106.6297 + Math.random() * 0.5,
          },
        };
      });

      setVessels(vesselsWithStatus || []);

      // Fetch crew for each vessel
      const { data: crewData } = await supabase
        .from("crew_members")
        .select("*")
        .eq("vessel_id", vesselsWithStatus[0].id);

      setCrewList(crewData as unknown as CrewMember[]);

      const vesselIds = vesselsWithStatus.map((v) => v.id);
      const { data: grantLinksData } = await supabase
        .from("grant_links")
        .select("*")
        .in("vessel_id", vesselIds);

      const grantLinksByVessel: Record<string, GrantLink[]> = {};
      (grantLinksData || []).forEach((link) => {
        if (!grantLinksByVessel[link.vessel_id])
          grantLinksByVessel[link.vessel_id] = [];
        grantLinksByVessel[link.vessel_id].push(link as GrantLink);
      });

      setGrantLinksByVessel(grantLinksByVessel);
    } catch (error: unknown) {
      const err = error as { message: string };
      toast({
        title: "Error fetching vessels",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "maintenance":
        return "bg-yellow-500";
      case "docked":
        return "bg-blue-500";
      case "at-sea":
        return "bg-indigo-500";
      case "ongoing":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      case "planned":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge className={`${getStatusColor(status)} text-white`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const openGrantDialog = async (vessel: VesselData) => {
    setSelectedVessel(vessel);
    setGrantDialogOpen(true);
    // Fetch crew for this vessel
    const { data: crewData } = await supabase
      .from("crew_members")
      .select("*")
      .eq("vessel_id", vessel.id);

    setCrewList(crewData as unknown as CrewMember[]);

    // console.log("crewList ", crewList);
  };

  const handleGrantType = (type: "email" | "phone") => {
    setGrantType(type);
  };

  const handleGrantSubmit = async () => {
    if (!selectedVessel || !selectedCrew || !grantType) return;
    setIsGranting(true);
    try {
      const grant_code = crypto.randomUUID();
      const { data, error } = await supabase
        .from("grant_links")
        .insert([
          {
            vessel_id: selectedVessel.id,
            crew_id: selectedCrew.id,
            role,
            email: grantType === "email" ? email : null,
            grant_code,
            granted_by: user?.id || null,
          },
        ])
        .select()
        .single();
      if (error) throw error;
      const link = `${window.location.origin}/grant-login/${grant_code}`;
      setGrantLink(link);
      toast({
        title: language === "en" ? "Grant created" : "Đã cấp quyền",
        description: link,
        variant: "default",
      });
    } catch (err) {
      const error = err as { message: string };
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGranting(false);
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById("grant-qr-svg");
    if (!svg) return;

    // Settings
    const qrSize = 180;
    const padding = 50;
    const border = 10;
    const borderRadius = 10;
    const titleHeight = 40;
    const fontSize = 12;
    const canvasWidth = qrSize + padding * 2 + border * 2;
    const canvasHeight = qrSize + padding * 2 + titleHeight + border * 2;

    // Create a canvas
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Helper to draw rounded rectangle
    function drawRoundedRect(
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r);
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h);
      ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
    }

    // Fill background white with rounded rect
    ctx.save();
    drawRoundedRect(ctx, 0, 0, canvasWidth, canvasHeight, borderRadius);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.restore();

    //  ctx.save();
    // drawRoundedRect(
    //   ctx,
    //   border / 2,
    //   border / 2,
    //   canvasWidth - border,
    //   canvasHeight - border,
    //   borderRadius
    // );
    // ctx.strokeStyle = "#000";
    // ctx.lineWidth = border;
    // ctx.stroke();
    // ctx.restore();
    // Draw title
    ctx.fillStyle = "#222";
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const titleText =
      language === "en"
        ? "Scan to access vessel account"
        : "Quét mã để truy cập tài khoản tàu";
    ctx.fillText(titleText, canvasWidth / 2, border + padding / 2);

    // Serialize SVG and create an image
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const img = new window.Image();
    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    img.onload = function () {
      ctx.drawImage(
        img,
        border + padding,
        border + padding + titleHeight,
        qrSize,
        qrSize
      );
      URL.revokeObjectURL(url);

      // Create a PNG download link
      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = "grant-qr.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    img.src = url;
  };

  const handleUpdateGrantLink = async (
    id: string,
    updates: Partial<GrantLink>
  ) => {
    const { error } = await supabase
      .from("grant_links")
      .update(updates)
      .eq("id", id);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Refresh grant links for the selected vessel
      if (selectedGrantVessel) {
        const { data: updatedLinks } = await supabase
          .from("grant_links")
          .select("*")
          .eq("vessel_id", selectedGrantVessel.id);
        setSelectedGrantLinks(updatedLinks as GrantLink[]);
        // Also update the main grantLinksByVessel state
        setGrantLinksByVessel((prev) => ({
          ...prev,
          [selectedGrantVessel.id]: updatedLinks as GrantLink[],
        }));
      }
      toast({ title: "Updated", variant: "default" });
    }
  };

  const handleDeleteGrantLink = async (id: string) => {
    const { error } = await supabase.from("grant_links").delete().eq("id", id);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Remove from UI
      setSelectedGrantLinks((prev) => prev.filter((l) => l.id !== id));
      if (selectedGrantVessel) {
        setGrantLinksByVessel((prev) => ({
          ...prev,
          [selectedGrantVessel.id]: prev[selectedGrantVessel.id].filter(
            (l) => l.id !== id
          ),
        }));
      }
      toast({ title: "Deleted", variant: "default" });
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(vessels.length / rowsPerPage);
  const paginatedVessels = vessels.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleImageUpload = async (
    file: File,
    crewIndex: number,
    type: "front" | "back"
  ) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folderName", "crew-id-cards");
      const response = await fetch(
        `${APP_CONFIG.API_URL}${API_ENDPOINTS.FILE_UPLOAD}`,
        {
          method: "POST",
          body: formData,
        }
      );

      console.log("response ", response);
      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const { fileUrl } = await response.json();

      console.log("fileUrl ", fileUrl);

      const newCrewInfo = [...vesselFormData.crew_info];
      if (type === "front") {
        newCrewInfo[crewIndex].id_card_front = fileUrl;
      } else {
        newCrewInfo[crewIndex].id_card_back = fileUrl;
      }
      setVesselFormData((prev) => ({ ...prev, crew_info: newCrewInfo }));

      toast({
        title: "Image uploaded successfully",
        description: `ID card ${type} image uploaded for crew member ${
          crewIndex + 1
        }`,
      });
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: "Error uploading image",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVesselFormData({
      ...vesselFormData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSelectChange = (value: string) => {
    setVesselFormData({
      ...vesselFormData,
      type: value as "mining" | "logistics",
    });
  };

  const deleteVessel = async (id: string) => {
    try {
      const { error } = await supabase.from("vessels").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Vessel deleted",
        description: "The vessel has been deleted successfully.",
      });

      fetchVessels();
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: "Error deleting vessel",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // PDF download function

  const downloadVessel = async (vesselId: string) => {
    const vessel = vessels.find((v) => v.id === vesselId);
    const { data: crew } = await supabase
      .from("crew_members")
      .select("*")
      .eq("vessel_id", vesselId);

    if (!vessel) return;
    const doc = new jsPDF();
    // Generate QR code as data URL
    const vesselUrl = `${window.location.origin}/vessel/${vessel.registration_number}`;
    const qrDataUrl = await toDataURL(vesselUrl, { width: 80 });
    doc.addImage(qrDataUrl, "PNG", 10, 10, 30, 30);
    doc.setFontSize(20);
    doc.text(t("vesselInfo.title"), 70, 20);
    doc.setFontSize(12);
    let y = 80;
    doc.text(`${t("vesselInfo.name")}: ${vessel.name}`, 10, y);
    y += 8;
    doc.text(
      `${t("vesselInfo.registration_number")}: ${vessel.registration_number}`,
      10,
      y
    );
    y += 8;
    doc.text(`${t("vesselInfo.type")}: ${vessel.type}`, 10, y);
    y += 8;
    doc.text(
      `${t("vesselInfo.captain_name")}: ${vessel.captain_name ?? "-"}`,
      10,
      y
    );
    y += 8;
    doc.text(
      `${t("vesselInfo.owner_name")}: ${vessel.owner_name ?? "-"}`,
      10,
      y
    );
    y += 8;
    doc.text(`${t("vesselInfo.capacity")}: ${vessel.capacity ?? "-"}`, 10, y);
    y += 8;
    doc.text(`${t("vesselInfo.length")}: ${vessel.length ?? "-"} m`, 10, y);
    y += 8;
    doc.text(`${t("vesselInfo.width")}: ${vessel.width ?? "-"} m`, 10, y);
    y += 8;
    doc.text(
      `${t("vesselInfo.engine_power")}: ${vessel.engine_power ?? "-"}`,
      10,
      y
    );
    y += 8;
    doc.text(`Fishery Permit: ${vessel.fishery_permit ?? "-"}`, 10, y);
    y += 8;
    doc.text(`Expiration Date: ${vessel.expiration_date ?? "-"}`, 10, y);
    y += 8;
    doc.text(
      `${t("vesselInfo.fishing_method")}: ${vessel.fishing_method ?? "-"}`,
      10,
      y
    );
    y += 8;
    doc.text(
      `${t("vesselInfo.fishing_gear")}: ${
        Object.entries(vessel.fishing_gear)
          .filter(([_, v]) => v)
          .map(([k]) => k)
          .join(", ") || "-"
      }`,
      10,
      y
    );
    y += 8;
    doc.text(
      `${t("vesselInfo.crew_count")}: ${vessel.crew_count ?? "-"}`,
      10,
      y
    );
    y += 12;
    doc.text(t("vesselInfo.crew_members"), 10, y);
    y += 8;
    if (crew && crew.length > 0) {
      crew.forEach((c: CrewDbRecord, idx) => {
        doc.text(
          `${idx + 1}. ${c.name} (${c.position || c.role || ""}) - ${
            c.phone || c.contact_phone || ""
          }`,
          12,
          y
        );
        y += 7;
        if (y > 270) {
          doc.addPage();
          y = 10;
        }
      });
    } else {
      doc.text(t("vesselInfo.no_crew"), 12, y);
    }
    doc.save(`${vessel.name || "vessel"}.pdf`);
  };

  // Edit logic
  const handleEditVessel = async (vesselId: string) => {
    const vessel = vessels.find((v) => v.id === vesselId);
    if (!vessel) return;

    const { data: crew_info_from_db } = await supabase
      .from("crew_members")
      .select("*")
      .eq("vessel_id", vesselId);

    const crew_info =
      (crew_info_from_db || []).map(
        (c: CrewDbRecord): CrewMember => ({
          id: c.id,
          name: c.name || "",
          position: c.position || c.role || "",
          id_card: c.id_card || "",
          phone: c.phone || c.contact_phone || "",
          id_card_front: c.id_card_front || "",
          id_card_back: c.id_card_back || "",
          showDelete: false,
          deleteConfirm: false,
          role: c.role,
          contact_phone: c.contact_phone,
        })
      ) ?? [];

    setVesselFormData({
      name: vessel.name,
      type: vessel.type,
      type_of_vessel: vessel.type_of_vessel,
      fileUrl: vessel.fileUrl,
      registration_number: vessel.registration_number,
      captain_name: vessel.captain_name ?? "",
      owner_name: vessel.owner_name ?? "",
      owner_id: vessel.owner_id ?? "",
      owner_id_card: vessel.owner_id_card ?? "",
      residential_address: vessel.residential_address ?? "",
      capacity: vessel.capacity ? String(vessel.capacity) : "",
      length: vessel.length ? String(vessel.length) : "",
      width: vessel.width ? String(vessel.width) : "",
      draught: vessel.draught ? String(vessel.draught) : "",
      hull_material: vessel.hull_material ?? "",
      materials: vessel.materials ?? "",
      number_of_engines: vessel.number_of_engines ?? "",
      engine_power: vessel.engine_power ?? "",
      engine_model: vessel.engine_model ?? "",
      engine_serial_number: vessel.engine_serial_number ?? "",
      port_of_registry: vessel.port_of_registry ?? "",
      port_registry: vessel.port_registry ?? "",
      vessel_type_from_doc: vessel.vessel_type_from_doc ?? "",
      type_of_machine: vessel.type_of_machine ?? "",
      gross_tonnage: vessel.gross_tonnage ? String(vessel.gross_tonnage) : "",
      crew_count: vessel.crew_count ? String(vessel.crew_count) : "",
      fishing_method: vessel.fishing_method ?? "",
      fishery_permit: vessel.fishery_permit ?? "",
      expiration_date: vessel.expiration_date ?? "",
      number_engines: vessel.number_engines,
      fishing_gear: vessel.fishing_gear ?? {
        purse_seine: false,
        hook: false,
        net: false,
        trawl: false,
      },
      crew_info: crew_info,
    });
    setDeletedCrewIds([]);
    setEditVesselId(vesselId);
    setDialogOpen(true);
  };

  // Handlers for VesselScanUpload
  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleDocumentScan(file);
  };
  const handleFileInputClick = () => {
    document.getElementById("file-upload-input")?.click();
  };
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleDocumentScan(file);
  };

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader
          title={language === "en" ? "2Share Loading" : "Chuyển tải"}
        />
        <TopButtons />

        <div className="px-3 flex gap-2 md:gap-3 lg:gap-4 overflow-x-auto">
          <Link
            to="/processing-plant/company-profile"
            className="flex-shrink-0"
          >
            <button
              className={`
                bg-gradient-to-r from-black to-[#1306ad] text-[#f8f603] rounded-md px-4 md:px-5
                h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                text-xs md:text-base
                w-32 md:w-36 lg:w-40
              `}
            >
              <span className="truncate">
                {language === "en" ? "Company Profile" : "Nhận Tải"}
              </span>
            </button>
          </Link>

          <Link to="/processing-plant/iuu" className="flex-shrink-0">
            <button
              className={`
                bg-gradient-to-r from-[#a8a8a8] to-[#fdfdfd] text-black  rounded-md px-4 md:px-5
                h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                text-xs md:text-base
                w-32 md:w-36 lg:w-40 shadow-lg hover:shadow-xl transition-all duration-300
              `}
            >
              <span className="truncate">
                {language === "en" ? "Báo Cáo IUU" : "Báo Cáo IUU"}
              </span>
            </button>
          </Link>
          <Link to="/processing-plant/order" className="flex-shrink-0">
            <button
              className={`
                bg-gradient-to-r from-[#a8a8a8] to-[#fdfdfd] text-black  rounded-md px-4 md:px-5
                h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                text-xs md:text-base
                w-32 md:w-36 lg:w-40 shadow-lg hover:shadow-xl transition-all duration-300
              `}
            >
              <span className="truncate">
                {language === "en" ? "Order" : "Đơn Hàng"}
              </span>
            </button>
          </Link>
          <Link to="/processing-plant/transaction" className="flex-shrink-0">
            <button
              className={`
                bg-gradient-to-r from-[#a8a8a8] to-[#fdfdfd] text-black  rounded-md px-4 md:px-5
                h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                text-xs md:text-base
                w-32 md:w-36 lg:w-40 shadow-lg hover:shadow-xl transition-all duration-300
              `}
            >
              <span className="truncate">
                {language === "en" ? "Transaction" : "Giao dịch"}
              </span>
            </button>
          </Link>
        </div>
        <div className="flex flex-col md:flex-row gap-4 w-full p-3 ">
          <div className="mt-8 w-full md:w-1/3">
            <div style={{ marginBottom: 24 }}>
              <b>Thông tin công ty</b>
              <div style={{ margin: "16px 0 0 0" }}>
                <span className="text-sm">
                  {t("companyForm.company_name")} : {companyName}
                </span>
                <br />
                <span className="text-sm">
                  {t("companyForm.address")} : {address}
                </span>
                <br />
                <span className="text-sm">
                  {t("companyForm.tax_code")} : {taxCode}
                </span>
              </div>
            </div>
          </div>
          <div className="w-full md:w-2/3">
            <FleetBarChart />
          </div>
        </div>

        <Card className="m-3">
          <CardHeader>
            <CardTitle>
              {language === "en" ? "Vessel List" : "Danh sách tàu"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <p>{language === "en" ? "Loading..." : "Đang tải..."}</p>
              </div>
            ) : vessels.length === 0 ? (
              <div className="text-center py-10">
                <Ship className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">
                  {language === "en"
                    ? "No vessels found"
                    : "Không tìm thấy tàu nào"}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {language === "en"
                    ? "Add vessels in the Vessel Data section."
                    : "Thêm tàu trong phần Dữ liệu tàu."}
                </p>
                <Button
                  onClick={() =>
                    (window.location.href = "/vessel-management/data")
                  }
                  className="mt-4 gap-2"
                >
                  {language === "en"
                    ? "Go to Vessel Data"
                    : "Đi đến Dữ liệu tàu"}
                </Button>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {language === "en" ? "Name" : "Tên"}
                      </TableHead>
                      <TableHead>
                        {language === "en" ? "Type" : "Loại"}
                      </TableHead>
                      <TableHead>
                        {language === "en" ? "Captain" : "Thuyền trưởng"}
                      </TableHead>
                      <TableHead>
                        {language === "en" ? "Crew" : "Thủy thủ"}
                      </TableHead>
                      <TableHead>
                        {language === "en" ? "Status" : "Trạng thái"}
                      </TableHead>
                      <TableHead>
                        {language === "en" ? "Grant Links" : "Cấp quyền"}
                      </TableHead>
                      <TableHead>
                        {language === "en"
                          ? "Grant Status"
                          : "Trạng thái cấp quyền"}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedVessels.map((vessel) => (
                      <TableRow
                        key={vessel.id}
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          setSelectedGrantLinks(
                            grantLinksByVessel[vessel.id] || []
                          );
                          setSelectedGrantVessel(vessel);
                          setShowGrantLinksDialog(true);
                        }}
                      >
                        <TableCell className="font-medium">
                          {vessel.name}
                        </TableCell>
                        <TableCell>
                          {vessel.type === "mining"
                            ? language === "en"
                              ? "Mining Vessel"
                              : "Tàu khai thác"
                            : language === "en"
                            ? "Logistics Service Ship"
                            : "Tàu dịch vụ hậu cần"}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const links = grantLinksByVessel[vessel.id] || [];
                            if (links.length === 0)
                              return vessel.captain_name || "-";
                            const captainGrant = links.find(
                              (l) => l.role === "captain"
                            );
                            if (!captainGrant)
                              return vessel.captain_name || "-";
                            if (captainGrant.status === "accepted") {
                              const crew = crewList.find(
                                (c) => c.id === captainGrant.crew_id
                              );
                              return crew ? crew.name : "(Accepted)";
                            }
                            const crew = crewList.find(
                              (c) => c.id === captainGrant.crew_id
                            );
                            return crew
                              ? `${crew.name} (${
                                  captainGrant.status.charAt(0).toUpperCase() +
                                  captainGrant.status.slice(1)
                                })`
                              : `(${
                                  captainGrant.status.charAt(0).toUpperCase() +
                                  captainGrant.status.slice(1)
                                })`;
                          })()}
                        </TableCell>
                        <TableCell>{vessel.crew_count || 0}</TableCell>
                        <TableCell>
                          {getStatusBadge(vessel.status || "active")}
                        </TableCell>
                        <TableCell>
                          {grantLinksByVessel[vessel.id]?.length || 0}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const links = grantLinksByVessel[vessel.id] || [];
                            if (links.length === 0) return "-";
                            const captainGrant = links.find(
                              (l) => l.role === "captain"
                            );
                            return captainGrant
                              ? captainGrant.status.charAt(0).toUpperCase() +
                                  captainGrant.status.slice(1)
                              : "-";
                          })()}
                        </TableCell>
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
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
                {/* Add New Vessel Button */}
                <div className="flex justify-end mt-6">
                  <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Plus size={16} />
                        {language === "en" ? "Add New Vessel" : "Thêm tàu mới"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {language === "en"
                            ? "Add New Vessel"
                            : "Thêm tàu mới"}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="py-8 text-gray-500">
                        {scanProgress < 100 && !scannedData ? (
                          <VesselScanUpload
                            isScanning={isScanning}
                            scanProgress={scanProgress}
                            previewUrl={previewUrl}
                            isDragging={isDragging}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onFileInputClick={handleFileInputClick}
                            onFileChange={handleFileChange}
                            language={language}
                          />
                        ) : (
                          <VesselForm
                            vesselFormData={vesselFormData}
                            scannedData={scannedData}
                            language={language}
                            handleInputChange={handleInputChange}
                            handleSelectChange={handleSelectChange}
                            handleImageUpload={handleImageUpload}
                            onSubmit={handleSubmit}
                            isEdit={!!editVesselId}
                            setVesselFormData={setVesselFormData}
                            editVesselId={editVesselId}
                            supabase={supabase}
                            deletedCrewIds={deletedCrewIds}
                            setDeletedCrewIds={setDeletedCrewIds}
                            crewList={crewList}
                            PhoneInput={PhoneInput}
                            Plus={Plus}
                            Trash2={Trash2}
                          />
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* <Card className="m-3">
          <img
            src="/images/regionngu.png"
            alt="ship-list"
            className="w-full h-full object-cover rounded-lg"
          />
        </Card> */}

        <div className="container">
          <RegionBasedFleet />
        </div>

        <VesselsFilter />

        {/* <!-- Fleet Fishing Records --> */}
        <FleetRecords />
      </SidebarInset>
    </SidebarProvider>
  );
}
