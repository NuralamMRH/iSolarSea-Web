import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneInput } from "@/components/ui/phone-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Ship,
  Plus,
  Edit,
  Trash2,
  Anchor,
  Users,
  Navigation,
  Upload,
  Smartphone,
  ScanLine,
  RefreshCw,
  Download,
  View,
  MoreVerticalIcon,
  Presentation,
  Minus,
  Eye,
} from "lucide-react";
import QRCode from "react-qr-code";
import { toDataURL } from "qrcode";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/integrations/supabase/client";
import { useLanguageStore } from "@/stores/language-store";
import { en } from "@/translations/english";
import { vi } from "@/translations/vietnamese";
import jsPDF from "jspdf";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/use-translation";

import { AppSidebar } from "@/components/app-sidebar";

import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import TopButtons from "@/components/top-buttons";
import { useIsMobile } from "@/hooks/use-mobile";

import { APP_CONFIG, API_ENDPOINTS } from "@/lib/constants";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import CompanyForm from "@/components/dashboard/CompanyForm";

interface FishingGear {
  purse_seine: boolean;
  hook: boolean;
  net: boolean;
  trawl: boolean;
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

interface CompanyData {
  id: string;
  name: string;
  registration_number: string;
  address: string;
  contact_email: string;
  contact_phone: string;
  user_id: string;
  created_at: string;
}

const VesselData = () => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { language } = useLanguageStore();
  const { t } = useTranslation();
  const [isScanning, setIsScanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const [vessels, setVessels] = useState<VesselData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [mobileScanUrl, setMobileScanUrl] = useState("");
  const [scannedData, setScannedData] = useState<ScannedVesselData | null>(
    null
  );
  const [rawOcrText, setRawOcrText] = useState("");
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
    crew_info: [] as CrewMember[],
    fileUrl: "",
  });
  const [editVesselId, setEditVesselId] = useState<string | null>(null);
  const [deletedCrewIds, setDeletedCrewIds] = useState<string[]>([]);
  const [createNewVessel, setCreateNewVessel] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successVessel, setSuccessVessel] = useState<{
    registration_number: string;
    name: string;
  }>({ registration_number: "", name: "" });
  const navigate = useNavigate();
  const [openDeleteDialogId, setOpenDeleteDialogId] = useState<string | null>(
    null
  );
  const [openViewDialogId, setOpenViewDialogId] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const isCaptainOrCrew = () => {
    const role = user?.role.toLowerCase();
    return role === "captain" || role === "crew" || role === "crew_member";
  };

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
          setRawOcrText(result.rawText);

          // Update form with scanned data
          setVesselFormData((prev) => ({
            ...prev,
            fileUrl: result?.fileUrl || prev.fileUrl,
            name: result?.extractedData?.vessel_owner || prev.name,
            owner_name: result?.extractedData?.vessel_owner || prev.owner_name,
            owner_id_card:
              result?.extractedData?.owner_id || prev.owner_id_card,
            residential_address:
              result?.extractedData?.residential_address ||
              prev.residential_address,
            registration_number:
              result?.extractedData?.vessel_id.trim() ||
              prev.registration_number.trim(),
            vessel_type_from_doc:
              result?.extractedData?.type_of_vessel ||
              prev.vessel_type_from_doc,
            gross_tonnage:
              result?.extractedData?.gross_tonnage || prev.gross_tonnage,
            length: result?.extractedData?.length_overall || prev.length,
            width: result?.extractedData?.breadth || prev.width,
            draught: result?.extractedData?.draught || prev.draught,
            materials: result?.extractedData?.materials || prev.materials,
            type_of_machine:
              result?.extractedData?.type_of_machine || prev.type_of_machine,
            number_engines:
              result?.extractedData?.number_engines || prev.number_engines,
            number_of_engines:
              result?.extractedData?.number_of_engines ||
              prev.number_of_engines,
            engine_power:
              result?.extractedData?.total_power || prev.engine_power,
            engine_model:
              result?.extractedData?.type_of_machine || prev.engine_model,
            engine_serial_number:
              result?.extractedData?.number_engines ||
              prev.engine_serial_number,
            port_of_registry:
              result?.extractedData?.port_registry || prev.port_of_registry,
            port_registry:
              result?.extractedData?.port_registry || prev.port_registry,
            type_of_vessel:
              result?.extractedData?.type_of_vessel || prev.type_of_vessel,
            type: result.extractedData.type_of_vessel
              ?.toLowerCase()
              .includes("tàu cá")
              ? "mining"
              : result?.extractedData?.type_of_vessel
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

  console.log("API URL:", APP_CONFIG.API_URL);

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

  useEffect(() => {
    if (user) {
      fetchVessels();
      fetchCompanyProfile();
      console.log("vessels ", vessels);
    }
  }, [user]);

  const fetchCompanyProfile = async () => {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("user_id", user?.auth_id)
      .single();

    setCompany(data || null);
  };

  async function fetchVessels() {
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
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

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
          .in("id", accessibleVesselIds)
          .order("created_at", { ascending: false });

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

      const { data: crew_info_from_db } = await supabase
        .from("crew_members")
        .select("*");

      const vesselsWithStatus: VesselData[] = (
        uniqueVessels as Record<string, unknown>[]
      ).map((vessel) => {
        const v = vessel as { [key: string]: unknown };

        const defaultFishingGear: FishingGear = {
          purse_seine: false,
          hook: false,
          net: false,
          trawl: false,
        };

        const crew_info =
          (
            crew_info_from_db.filter(
              (c: CrewDbRecord) => c.vessel_id === v.id
            ) || []
          ).map(
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

        return {
          id: String(v.id),
          name: String(v.name),
          type: v.type as "mining" | "logistics",
          type_of_vessel: String(v.type_of_vessel || ""),
          registration_number: String(v.registration_number),
          captain_name: v.captain_name ? String(v.captain_name) : null,
          owner_name: v.owner_name ? String(v.owner_name) : null,
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
          materials: v.materials ? String(v.materials) : null,
          crew_count:
            v.crew_count !== undefined && v.crew_count !== null
              ? Number(v.crew_count)
              : null,
          fishing_method: v.fishing_method ? String(v.fishing_method) : null,
          created_at: String(v.created_at),
          status: ["active", "maintenance", "docked", "at-sea"][
            Math.floor(Math.random() * 4)
          ] as "active" | "maintenance" | "docked" | "at-sea",
          last_location: {
            lat: 10.8231 + Math.random() * 0.5,
            lng: 106.6297 + Math.random() * 0.5,
          },
          fileUrl: String(v.fileUrl || ""),
          owner_id: v.owner_id ? String(v.owner_id) : undefined,
          owner_id_card: v.owner_id_card ? String(v.owner_id_card) : undefined,
          residential_address: v.residential_address
            ? String(v.residential_address)
            : undefined,
          draught: v.draught ? String(v.draught) : undefined,
          hull_material: v.hull_material ? String(v.hull_material) : undefined,
          number_engines: v.number_engines
            ? String(v.number_engines)
            : undefined,
          number_of_engines: v.number_of_engines
            ? String(v.number_of_engines)
            : undefined,
          engine_model: v.engine_model ? String(v.engine_model) : undefined,
          type_of_machine: v.type_of_machine
            ? String(v.type_of_machine)
            : undefined,
          engine_serial_number: v.engine_serial_number
            ? String(v.engine_serial_number)
            : undefined,
          port_of_registry: v.port_of_registry
            ? String(v.port_of_registry)
            : undefined,
          vessel_type_from_doc: v.vessel_type_from_doc
            ? String(v.vessel_type_from_doc)
            : undefined,
          gross_tonnage: v.gross_tonnage ? String(v.gross_tonnage) : undefined,
          port_registry: v.port_registry ? String(v.port_registry) : undefined,
          fishery_permit: v.fishery_permit ? String(v.fishery_permit) : null,
          expiration_date: v.expiration_date ? String(v.expiration_date) : null,
          fishing_gear: (v.fishing_gear as FishingGear) || defaultFishingGear,
          crew_info: crew_info,
        };
      });

      setVessels(uniqueVessels);
      setCreateNewVessel(vesselsWithStatus?.length > 0 ? false : true);
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Error fetching vessels",
        description: err.message,
        variant: "destructive",
      });
      console.error("Error fetching vessels:", error);
    } finally {
      setLoading(false);
    }
  }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const vesselRegNum = vesselFormData.registration_number;
      const vesselName = vesselFormData.name;

      // Check if vessel with registration number already exists
      const { data: existingVessel, error: existingVesselError } =
        await supabase
          .from("vessels")
          .select("*")
          .eq("registration_number", vesselFormData.registration_number)
          .single();

      // If vessel exists, use its ID for update
      const vesselIdToUse = existingVessel?.id || editVesselId;

      if (vesselIdToUse) {
        // UPDATE vessel
        const { error: vesselError } = await supabase
          .from("vessels")
          .update({
            user_id: user?.auth_id,
            name: vesselFormData.name,
            type: vesselFormData.type,
            type_of_vessel: vesselFormData.type_of_vessel,
            registration_number: vesselFormData.registration_number.trim(),
            fileUrl: vesselFormData?.fileUrl || "",
            captain_name: vesselFormData.captain_name,
            owner_name: vesselFormData.owner_name,
            owner_id: vesselFormData.owner_id,
            capacity: vesselFormData.capacity
              ? parseFloat(vesselFormData.capacity)
              : null,
            length: vesselFormData.length
              ? parseFloat(vesselFormData.length)
              : null,
            width: vesselFormData.width
              ? parseFloat(vesselFormData.width)
              : null,
            engine_power: vesselFormData.engine_power,
            materials: vesselFormData.materials,
            fishery_permit: vesselFormData.fishery_permit,
            expiration_date: vesselFormData.expiration_date,
            crew_count: vesselFormData.crew_count
              ? parseInt(vesselFormData.crew_count)
              : null,
            fishing_method: vesselFormData.fishing_method,
            fishing_gear: vesselFormData.fishing_gear,
            draught: vesselFormData.draught,
            gross_tonnage: vesselFormData.gross_tonnage,
            residential_address: vesselFormData.residential_address,
            number_engines: vesselFormData.number_engines,
            number_of_engines: vesselFormData.number_of_engines,
            port_registry: vesselFormData.port_registry,
          })
          .eq("id", vesselIdToUse);

        if (vesselError) throw vesselError;

        // Delete crew members marked for deletion (already handled on delete)
        // Upsert (insert or update) crew members
        if (vesselFormData.crew_info.length > 0) {
          const crewRows = vesselFormData.crew_info.map((crew: CrewMember) => {
            const base = {
              vessel_id: vesselIdToUse,
              name: crew.name,
              position: crew.position,
              id_card: crew.id_card,
              phone: crew.phone,
              id_card_front: crew.id_card_front,
              id_card_back: crew.id_card_back,
              role: crew.position || "crew",
            };
            if (crew.id) return { ...base, id: crew.id };
            return base;
          });
          // Upsert: update if id exists, insert if not
          const { error: crewError } = await supabase
            .from("crew_members")
            .upsert(crewRows, { onConflict: "id" });
          if (crewError) throw crewError;
        }

        toast({
          title: "Vessel updated",
          description:
            "Your vessel and crew members have been updated successfully.",
        });
      } else {
        // INSERT new vessel
        const { data: vesselData, error: vesselError } = await supabase
          .from("vessels")
          .insert([
            {
              user_id: user?.auth_id,
              name: vesselFormData.name,
              type: vesselFormData.type,
              type_of_vessel: vesselFormData.type_of_vessel,
              residential_address: vesselFormData.residential_address,
              registration_number: vesselFormData.registration_number,
              fileUrl: vesselFormData?.fileUrl || "",
              captain_name: vesselFormData.captain_name,
              owner_name: vesselFormData.owner_name,
              owner_id: vesselFormData.owner_id,
              capacity: vesselFormData.capacity
                ? parseFloat(vesselFormData.capacity)
                : null,
              length: vesselFormData.length
                ? parseFloat(vesselFormData.length)
                : null,
              width: vesselFormData.width
                ? parseFloat(vesselFormData.width)
                : null,
              engine_power: vesselFormData.engine_power,
              materials: vesselFormData.materials,
              fishery_permit: vesselFormData.fishery_permit,
              expiration_date: vesselFormData.expiration_date,
              crew_count: vesselFormData.crew_count
                ? parseInt(vesselFormData.crew_count)
                : null,
              fishing_method: vesselFormData.fishing_method,
              fishing_gear: vesselFormData.fishing_gear,

              draught: vesselFormData.draught,
              gross_tonnage: vesselFormData.gross_tonnage,
              number_engines: vesselFormData.number_engines,
              number_of_engines: vesselFormData.number_of_engines,
              port_registry: vesselFormData.port_registry,
            },
          ])
          .select()
          .single();

        if (vesselError) throw vesselError;
        const vessel_id = vesselData.id;

        const { data: defaultVesselData, error: defaultVesselError } =
          await supabase
            .from("users")
            .update({
              default_vessel: vesselData.id,
              updated_at: new Date().toISOString(),
            })
            .eq("auth_id", user.auth_id)
            .select();

        if (defaultVesselError) throw defaultVesselError;

        // Insert crew members
        if (vesselFormData.crew_info.length > 0) {
          const crewRows = vesselFormData.crew_info.map((crew: CrewMember) => ({
            vessel_id,
            name: crew.name,
            position: crew.position,
            id_card: crew.id_card,
            phone: crew.phone,
            role: crew.position || "crew",
            id_card_front: crew.id_card_front,
            id_card_back: crew.id_card_back,
          }));

          const { error: crewError } = await supabase
            .from("crew_members")
            .insert(crewRows);

          if (crewError) throw crewError;
        }

        toast({
          title: "Vessel and crew created",
          description:
            "Your vessel and crew members have been created successfully.",
        });
      }

      setDialogOpen(false);
      setEditVesselId(null);
      fetchVessels();
      setSuccessVessel({ registration_number: vesselRegNum, name: vesselName });
      setSuccessDialogOpen(true);

      // Reset form
      setVesselFormData({
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
        port_registry: "",
        vessel_type_from_doc: "",
        type_of_machine: "",
        gross_tonnage: "",
        crew_count: "",
        fishing_method: "",
        fishery_permit: "",
        expiration_date: "",
        number_engines: "",
        fishing_gear: {
          purse_seine: false,
          hook: false,
          net: false,
          trawl: false,
        },
        crew_info: [],
        fileUrl: "",
      });

      // Clear file inputs
      const fileInputs = document.querySelectorAll('input[type="file"]');
      fileInputs.forEach((input) => {
        (input as HTMLInputElement).value = "";
      });

      setDialogOpen(false);
      setEditVesselId(null);
      fetchVessels();
      setSuccessVessel({ registration_number: vesselRegNum, name: vesselName });
      setSuccessDialogOpen(true);
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: "Error creating/updating vessel",
        description: err.message,
        variant: "destructive",
      });
    }
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

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title={language === "en" ? "Vessel Data" : "Dữ liệu tàu"} />

        <div className="@container/main flex flex-1 flex-col gap-2">
          <TopButtons />
          <div className="px-2 md:px-3 flex gap-2 md:gap-3 lg:gap-4 overflow-x-auto">
            <Link to="/vessel-management/data" className="flex-shrink-0">
              <button
                className={`
                  bg-gradient-to-r from-black to-[#1306ad] text-[#f8f603] rounded-md px-4 md:px-5
                  h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                  text-xs md:text-base
                  w-32 md:w-36 lg:w-40
                `}
              >
                <span className="truncate">
                  {language === "en" ? "Vessel Data" : "Dữ liệu tàu"}
                </span>
              </button>
            </Link>
            <Link to="/vessel-management/fleet" className="flex-shrink-0">
              <button
                className={`
                bg-gradient-to-r from-[#a8a8a8] to-[#fdfdfd] text-black rounded-md px-4 md:px-5
                  h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                  text-xs md:text-base
                w-32 md:w-36 lg:w-40 shadow-lg hover:shadow-xl transition-all duration-300
                `}
              >
                <span className="truncate">
                  {language === "en" ? "Fleet Management" : "Quản lý đội tàu"}
                </span>
              </button>
            </Link>
          </div>
          <div className="flex flex-col gap-4 px-2 py-4 md:gap-6 md:py-6">
            <div className="mb-8 flex flex-col lg:flex-row gap-4 lg:gap-0 justify-start md:justify-between md:items-center">
              <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>
                      {language === "en" ? "Scan QR Code" : "Quét mã QR"}
                    </DialogTitle>
                    <DialogDescription>
                      {language === "en"
                        ? "Scan this QR code with your mobile device to continue"
                        : "Quét mã QR này bằng thiện bị di động của bạn để tiếp tục"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col items-center justify-center gap-4 py-4">
                    <div className="w-64 h-64 bg-muted flex items-center justify-center">
                      {/* Add QR Code component here */}
                      <QRCode value={mobileScanUrl} size={256} />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      {language === "en"
                        ? "After scanning, you will be redirected to the document scanner"
                        : "Sau khi quét, bạn sẽ được chuyển đến trình quét tài liệu"}
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {!loading && (
              <Card className="overflow-x-auto bg-blue-50">
                <CardContent className="overflow-x-scroll p-2 md:p-4">
                  <CompanyForm />
                </CardContent>
              </Card>
            )}

            <Card className="bg-blue-50">
              <CardContent className="p-2 md:p-4">
                {loading ? (
                  <div className="space-y-8">
                    {/* Skeleton Vessel Cards */}
                    {Array.from({ length: 3 }).map((_, vesselIdx) => (
                      <motion.div
                        key={vesselIdx}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: vesselIdx * 0.2 }}
                        className="bg-white rounded-lg border border-gray-200 p-6"
                      >
                        {/* Vessel Header Skeleton */}
                        <div className="flex flex-col gap-2 mb-6">
                          <motion.div
                            className="h-6 bg-gray-200 rounded animate-pulse"
                            initial={{ width: "40%" }}
                            animate={{ width: ["40%", "60%", "40%"] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                          <motion.div
                            className="h-4 bg-gray-200 rounded animate-pulse"
                            initial={{ width: "70%" }}
                            animate={{ width: ["70%", "90%", "70%"] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        </div>

                        {/* Document Preview Skeleton */}
                        <motion.div
                          className="h-[200px] bg-gray-200 rounded-lg mb-6 animate-pulse"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3, delay: 0.2 }}
                        />

                        {/* Form Fields Skeleton */}
                        <div className="grid gap-4">
                          {/* First Row - Registration Number and Vessel Name */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <motion.div
                                className="h-4 bg-gray-200 rounded animate-pulse"
                                initial={{ width: "50%" }}
                                animate={{ width: ["50%", "70%", "50%"] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                              <motion.div
                                className="h-10 bg-gray-200 rounded border border-red-500 animate-pulse"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3, delay: 0.1 }}
                              />
                            </div>
                            <div className="space-y-2">
                              <motion.div
                                className="h-4 bg-gray-200 rounded animate-pulse"
                                initial={{ width: "40%" }}
                                animate={{ width: ["40%", "60%", "40%"] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                              <motion.div
                                className="h-10 bg-gray-200 rounded border border-red-500 animate-pulse"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3, delay: 0.2 }}
                              />
                            </div>
                          </div>

                          {/* Second Row - Owner Name and Owner ID */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <motion.div
                                className="h-4 bg-gray-200 rounded animate-pulse"
                                initial={{ width: "45%" }}
                                animate={{ width: ["45%", "65%", "45%"] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                              <motion.div
                                className="h-10 bg-gray-200 rounded border border-red-500 animate-pulse"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3, delay: 0.3 }}
                              />
                            </div>
                            <div className="space-y-2">
                              <motion.div
                                className="h-4 bg-gray-200 rounded animate-pulse"
                                initial={{ width: "35%" }}
                                animate={{ width: ["35%", "55%", "35%"] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                              <motion.div
                                className="h-10 bg-gray-200 rounded border border-red-500 animate-pulse"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3, delay: 0.4 }}
                              />
                            </div>
                          </div>

                          {/* Third Row - Residential Address */}
                          <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                              <motion.div
                                className="h-4 bg-gray-200 rounded animate-pulse"
                                initial={{ width: "55%" }}
                                animate={{ width: ["55%", "75%", "55%"] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                              <motion.div
                                className="h-10 bg-gray-200 rounded border border-red-500 animate-pulse"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3, delay: 0.5 }}
                              />
                            </div>
                          </div>

                          {/* Fourth Row - Type of Vessel and Gross Tonnage */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <motion.div
                                className="h-4 bg-gray-200 rounded animate-pulse"
                                initial={{ width: "50%" }}
                                animate={{ width: ["50%", "70%", "50%"] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                              <motion.div
                                className="h-10 bg-gray-200 rounded border border-red-500 animate-pulse"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3, delay: 0.6 }}
                              />
                            </div>
                            <div className="space-y-2">
                              <motion.div
                                className="h-4 bg-gray-200 rounded animate-pulse"
                                initial={{ width: "45%" }}
                                animate={{ width: ["45%", "65%", "45%"] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                              <motion.div
                                className="h-10 bg-gray-200 rounded border border-red-500 animate-pulse"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3, delay: 0.7 }}
                              />
                            </div>
                          </div>

                          {/* Fifth Row - Length, Width, Draught */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {Array.from({ length: 3 }).map((_, idx) => (
                              <div key={idx} className="space-y-2">
                                <motion.div
                                  className="h-4 bg-gray-200 rounded animate-pulse"
                                  initial={{ width: "40%" }}
                                  animate={{ width: ["40%", "60%", "40%"] }}
                                  transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    delay: idx * 0.1,
                                  }}
                                />
                                <motion.div
                                  className="h-10 bg-gray-200 rounded border border-red-500 animate-pulse"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{
                                    duration: 0.3,
                                    delay: 0.8 + idx * 0.1,
                                  }}
                                />
                              </div>
                            ))}
                          </div>

                          {/* Sixth Row - Materials, Engine Power, Number Engines */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {Array.from({ length: 3 }).map((_, idx) => (
                              <div key={idx} className="space-y-2">
                                <motion.div
                                  className="h-4 bg-gray-200 rounded animate-pulse"
                                  initial={{ width: "45%" }}
                                  animate={{ width: ["45%", "65%", "45%"] }}
                                  transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    delay: idx * 0.1,
                                  }}
                                />
                                <motion.div
                                  className="h-10 bg-gray-200 rounded border border-red-500 animate-pulse"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{
                                    duration: 0.3,
                                    delay: 1.1 + idx * 0.1,
                                  }}
                                />
                              </div>
                            ))}
                          </div>

                          {/* Seventh Row - Type of Machine and Port Registry */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <motion.div
                                className="h-4 bg-gray-200 rounded animate-pulse"
                                initial={{ width: "50%" }}
                                animate={{ width: ["50%", "70%", "50%"] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                              <motion.div
                                className="h-10 bg-gray-200 rounded border border-red-500 animate-pulse"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3, delay: 1.4 }}
                              />
                            </div>
                            <div className="space-y-2">
                              <motion.div
                                className="h-4 bg-gray-200 rounded animate-pulse"
                                initial={{ width: "45%" }}
                                animate={{ width: ["45%", "65%", "45%"] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                              <motion.div
                                className="h-10 bg-gray-200 rounded border border-red-500 animate-pulse"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3, delay: 1.5 }}
                              />
                            </div>
                          </div>

                          {/* Edit Section Header */}
                          <div className="mt-6">
                            <motion.div
                              className="h-6 bg-gray-200 rounded animate-pulse mb-2"
                              initial={{ width: "30%" }}
                              animate={{ width: ["30%", "50%", "30%"] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                            <motion.div
                              className="h-4 bg-gray-200 rounded animate-pulse"
                              initial={{ width: "60%" }}
                              animate={{ width: ["60%", "80%", "60%"] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          </div>

                          {/* Fishery Permit and Expiration Date */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <motion.div
                                className="h-4 bg-gray-200 rounded animate-pulse"
                                initial={{ width: "45%" }}
                                animate={{ width: ["45%", "65%", "45%"] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                              <motion.div
                                className="h-10 bg-gray-200 rounded border border-red-500 animate-pulse"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3, delay: 1.6 }}
                              />
                            </div>
                            <div className="space-y-2">
                              <motion.div
                                className="h-4 bg-gray-200 rounded animate-pulse"
                                initial={{ width: "40%" }}
                                animate={{ width: ["40%", "60%", "40%"] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                              <motion.div
                                className="h-10 bg-gray-200 rounded border border-red-500 animate-pulse"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3, delay: 1.7 }}
                              />
                            </div>
                          </div>

                          {/* Fishing Gear Section */}
                          <div className="space-y-4">
                            <motion.div
                              className="h-4 bg-gray-200 rounded animate-pulse"
                              initial={{ width: "50%" }}
                              animate={{ width: ["50%", "70%", "50%"] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              {Array.from({ length: 4 }).map((_, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center space-x-2"
                                >
                                  <motion.div
                                    className="h-8 w-8 bg-gray-200 rounded animate-pulse"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{
                                      duration: 0.3,
                                      delay: 1.8 + idx * 0.1,
                                    }}
                                  />
                                  <motion.div
                                    className="h-4 bg-gray-200 rounded animate-pulse"
                                    initial={{ width: "60%" }}
                                    animate={{ width: ["60%", "80%", "60%"] }}
                                    transition={{
                                      duration: 2,
                                      repeat: Infinity,
                                      delay: idx * 0.1,
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Crew Information Section */}
                          <div className="space-y-4">
                            <motion.div
                              className="h-4 bg-gray-200 rounded animate-pulse"
                              initial={{ width: "40%" }}
                              animate={{ width: ["40%", "60%", "40%"] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                            <div className="space-y-4">
                              {Array.from({ length: 2 }).map((_, crewIdx) => (
                                <motion.div
                                  key={crewIdx}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{
                                    duration: 0.4,
                                    delay: 2.2 + crewIdx * 0.2,
                                  }}
                                  className="space-y-4 relative"
                                >
                                  <motion.div
                                    className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"
                                    initial={{ scale: 0.8 }}
                                    animate={{ scale: 1 }}
                                    transition={{
                                      duration: 0.3,
                                      delay: 2.4 + crewIdx * 0.2,
                                    }}
                                  />
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Array.from({ length: 4 }).map(
                                      (_, fieldIdx) => (
                                        <div
                                          key={fieldIdx}
                                          className="space-y-2"
                                        >
                                          <motion.div
                                            className="h-4 bg-gray-200 rounded animate-pulse"
                                            initial={{ width: "50%" }}
                                            animate={{
                                              width: ["50%", "70%", "50%"],
                                            }}
                                            transition={{
                                              duration: 2,
                                              repeat: Infinity,
                                              delay: fieldIdx * 0.1,
                                            }}
                                          />
                                          <motion.div
                                            className="h-10 bg-gray-200 rounded border border-red-500 animate-pulse"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{
                                              duration: 0.3,
                                              delay:
                                                2.6 +
                                                crewIdx * 0.2 +
                                                fieldIdx * 0.1,
                                            }}
                                          />
                                        </div>
                                      )
                                    )}
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons Skeleton */}
                        <div className="mt-6 flex justify-end gap-2">
                          <motion.div
                            className="h-10 w-24 bg-gray-200 rounded animate-pulse"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: 3.0 }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  vessels.length > 0 && (
                    <div className="w-full">
                      {vessels.map((vessel, index) => (
                        <motion.div
                          key={vessel.id}
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: index * 0.1 }}
                        >
                          <div className="flex-grow pt-2">
                            <div className="flex flex-col gap-2">
                              <div className="text-lg font-semibold">
                                {index + 1}.{" "}
                                {vessel
                                  ? language === "en"
                                    ? "Vessel Information"
                                    : "Thông tin tàu"
                                  : language === "en"
                                  ? "Add New Vessel"
                                  : "Thêm tàu mới"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {language === "en"
                                  ? "Fill in the details to add a new vessel to your fleet."
                                  : "Điền thông tin để thêm tàu mới vào đội tàu của bạn."}
                              </div>
                            </div>

                            <div className="grid gap-4 py-4">
                              {vessel?.fileUrl && (
                                <div>
                                  <img
                                    src={vessel?.fileUrl}
                                    alt="Document Preview"
                                    className="mt-4 max-w-full h-[200px] rounded-lg shadow-lg"
                                  />
                                </div>
                              )}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="registration_number">
                                    {language === "en"
                                      ? "Registration Number"
                                      : "Số đăng ký"}
                                  </Label>
                                  <span className="block w-full px-3 py-2 border border-red-500 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                                    {vessel.registration_number}
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="name">
                                    {language === "en"
                                      ? "Vessel Name"
                                      : "Tên tàu"}
                                  </Label>
                                  <span className="block w-full px-3 py-2 border border-red-500 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                                    {vessel.name}
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="owner_name">
                                    {language === "en"
                                      ? "Vessel owner"
                                      : "Chủ tàu"}
                                  </Label>
                                  <span className="block w-full px-3 py-2 border border-red-500 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                                    {vessel.owner_name}
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="owner_id">
                                    {language === "en" ? "Owner ID" : "CCCD"}
                                  </Label>
                                  <span className="block w-full px-3 py-2 border border-red-500 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                                    {vessel.owner_id}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="residential_address">
                                    {language === "en"
                                      ? "Residential address"
                                      : "Nơi thường trú"}
                                  </Label>
                                  <span className="block w-full px-3 py-2 border border-red-500 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                                    {vessel.residential_address}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="type_of_vessel">
                                    {language === "en"
                                      ? "Type of Vessel"
                                      : "Kiểu tàu"}
                                  </Label>
                                  <span className="block w-full px-3 py-2 border border-red-500 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                                    {vessel.type_of_vessel}
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="gross_tonnage">
                                    {language === "en"
                                      ? "Gross Tonnage"
                                      : "Tông dung tích, GT:"}
                                  </Label>
                                  <span className="block w-full px-3 py-2 border border-red-500 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                                    {vessel.gross_tonnage}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="length">
                                    {language === "en"
                                      ? "Length (m)"
                                      : "Chiều dài Lmax, m:"}
                                  </Label>
                                  <span className="block w-full px-3 py-2 border border-red-500 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                                    {vessel.length}
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="width">
                                    {language === "en"
                                      ? "Width (m)"
                                      : "Chiều rộng Bmax, m:"}
                                  </Label>
                                  <span className="block w-full px-3 py-2 border border-red-500 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                                    {vessel.width}
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="draught">
                                    {language === "en"
                                      ? "Draught"
                                      : "Chiêu cao mạn D, m:"}
                                  </Label>
                                  <span className="block w-full px-3 py-2 border border-red-500 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                                    {vessel.draught}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="engine_power">
                                    {language === "en"
                                      ? "Materials"
                                      : "Vật liệu vỏ:"}
                                  </Label>
                                  <span className="block w-full px-3 py-2 border border-red-500 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                                    {vessel.materials}
                                  </span>
                                </div>

                                <div className="space-y-3">
                                  <Label htmlFor="engine_power">
                                    {language === "en"
                                      ? "Engine Power"
                                      : "Công suất KW"}
                                  </Label>
                                  <span className="block w-full px-3 py-2 border border-red-500 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                                    {vessel.engine_power}
                                  </span>
                                </div>

                                <div className="space-y-3">
                                  <Label htmlFor="number_engines">
                                    {language === "en"
                                      ? "Number engines"
                                      : "Số máy"}
                                  </Label>
                                  <span className="block w-full px-3 py-2 border border-red-500 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                                    {vessel.number_engines}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="type_of_machine">
                                    {language === "en"
                                      ? "Type of machine"
                                      : "Ký hiệu máy"}
                                  </Label>
                                  <span className="block w-full px-3 py-2 border border-red-500 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                                    {vessel.type_of_machine}
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="port_registry">
                                    {language === "en"
                                      ? "Port of registry"
                                      : "Cáng đăng ký"}
                                  </Label>
                                  <span className="block w-full px-3 py-2 border border-red-500 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                                    {vessel.port_registry}
                                  </span>
                                </div>
                              </div>

                              <div>
                                <h4 className="text-lg font-semibold">
                                  {language === "en"
                                    ? "Edit Vessel"
                                    : "Chỉnh sửa tàu"}
                                </h4>
                                <span className="text-sm text-muted-foreground">
                                  {language === "en"
                                    ? "Fill in the details to edit the vessel"
                                    : "Điền thông tin để chỉnh sửa tàu"}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="fishery_permit">
                                    {language === "en"
                                      ? "Fishery permit"
                                      : "Giấy phép khai thác"}
                                  </Label>
                                  <span className="block w-full px-3 py-2 border border-red-500 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                                    {vessel.fishery_permit}
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="expiration_date">
                                    {language === "en"
                                      ? "Expiration date"
                                      : "Thời hạn"}
                                  </Label>
                                  <span className="block w-full px-3 py-2 border border-red-500 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                                    {vessel.expiration_date}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div>
                                  <Label>
                                    {language === "en"
                                      ? "Fishing method/gear"
                                      : "Phương pháp đánh bắt"}
                                  </Label>
                                  <div className="grid grid-cols-2 gap-2 mt-2 text-[12px]">
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id="purse_seine"
                                        className="h-8 w-8"
                                        checked={
                                          vessel.fishing_gear?.purse_seine
                                        }
                                        readOnly={true}
                                      />
                                      <Label htmlFor="purse_seine">
                                        Purse Seine
                                      </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id="hook"
                                        className="h-8 w-8"
                                        checked={vessel.fishing_gear?.hook}
                                        readOnly={true}
                                      />
                                      <Label htmlFor="hook">Hook</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id="net"
                                        className="h-8 w-8"
                                        checked={vessel.fishing_gear?.net}
                                        readOnly={true}
                                      />
                                      <Label htmlFor="net">Net</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id="trawl"
                                        className="h-8 w-8"
                                        checked={vessel.fishing_gear?.trawl}
                                        readOnly={true}
                                      />
                                      <Label htmlFor="trawl">Trawl</Label>
                                    </div>
                                  </div>
                                </div>
                                {vessel.crew_info?.length > 0 && (
                                  <div>
                                    <Label>
                                      {language === "en"
                                        ? "Crew Information"
                                        : "Thông tin thuyền viên"}
                                    </Label>
                                    <div className="space-y-4 mt-2">
                                      {vessel.crew_info?.map((crew, index) => (
                                        <div
                                          key={index}
                                          className="space-y-4 relative"
                                        >
                                          <Button
                                            type="button"
                                            variant={"outline"}
                                            size="icon"
                                            className="relative group"
                                          >
                                            <span className="text-sm font-medium">
                                              {index + 1}
                                            </span>
                                          </Button>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                              <Label htmlFor="name">
                                                {language === "en"
                                                  ? "Name"
                                                  : "Tên"}
                                              </Label>
                                              <span className="block w-full px-3 py-2 border border-red-500 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                                                {crew.name}
                                              </span>
                                            </div>
                                            <div className="space-y-2">
                                              <Label htmlFor="position">
                                                {language === "en"
                                                  ? "Position"
                                                  : "Vị trí"}
                                              </Label>
                                              <span className="block w-full px-3 py-2 border border-red-500 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                                                {crew.position}
                                              </span>
                                            </div>
                                            <div className="space-y-2">
                                              <Label htmlFor="id_card">
                                                {language === "en"
                                                  ? "ID Card"
                                                  : "CCCD"}
                                              </Label>
                                              <span className="block w-full px-3 py-2 border border-red-500 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                                                {crew.id_card}
                                              </span>
                                            </div>
                                            <div className="space-y-2">
                                              <Label>
                                                {language === "en"
                                                  ? "Phone Number"
                                                  : "Số điện thoại"}
                                              </Label>
                                              <span className="block w-full px-3 py-2 border border-red-500 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                                                {crew.phone}
                                              </span>
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col space-y-2">
                                              <Label className="mb-2 block">
                                                {language === "en"
                                                  ? "ID Card Front"
                                                  : "Mặt trước CCCD"}
                                              </Label>
                                              <div className="flex items-center gap-2 flex-col">
                                                {crew.id_card_front && (
                                                  <img
                                                    src={crew.id_card_front}
                                                    alt="ID Card Front"
                                                    className="h-20 w-32 object-cover rounded cursor-pointer"
                                                    onClick={() =>
                                                      window.open(
                                                        crew.id_card_back,
                                                        "_blank"
                                                      )
                                                    }
                                                  />
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex flex-col space-y-2">
                                              <Label className="mb-2 block">
                                                {language === "en"
                                                  ? "ID Card Back"
                                                  : "Mặt sau CCCD"}
                                              </Label>
                                              <div className="flex items-center gap-2 flex-col">
                                                {crew.id_card_back && (
                                                  <img
                                                    src={crew.id_card_back}
                                                    alt="ID Card Back"
                                                    className="h-20 w-32 object-cover rounded cursor-pointer"
                                                    onClick={() =>
                                                      window.open(
                                                        crew.id_card_back,
                                                        "_blank"
                                                      )
                                                    }
                                                  />
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-6 flex justify-end gap-2">
                            <Button
                              className="cursor-pointer gap-2 bg-blue-500 text-white"
                              onClick={() => {
                                setOpenViewDialogId(vessel.id);
                              }}
                            >
                              <Eye className="h-4 w-4 " />
                              {language === "en" ? "View" : "Xem"}
                            </Button>
                            <Button
                              className="cursor-pointer gap-2 bg-red-500 text-white"
                              onClick={() => setOpenDeleteDialogId(vessel.id)}
                              disabled={isCaptainOrCrew()}
                            >
                              <Trash2 className="h-4 w-4 " />
                              {language === "en" ? "Delete" : "Xóa"}
                            </Button>
                          </div>

                          <AlertDialog
                            open={openDeleteDialogId === vessel.id}
                            onOpenChange={(open) => {
                              if (!open) setOpenDeleteDialogId(null);
                            }}
                          >
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {language === "en"
                                    ? "Are you sure?"
                                    : "Bạn có chắc chắn?"}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {language === "en"
                                    ? "Are you sure you want to delete this vessel info? This action cannot be undone."
                                    : "Bạn có chắc chắn muốn xóa thông tin tàu này? Hành động này không thể hoàn tác."}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  {language === "en" ? "Cancel" : "Hủy"}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    deleteVessel(vessel.id);
                                    setOpenDeleteDialogId(null);
                                  }}
                                  disabled={isCaptainOrCrew()}
                                >
                                  {language === "en" ? "Delete" : "Xóa"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </motion.div>
                      ))}
                    </div>
                  )
                )}

                {vessels.length > 0 && (
                  <div className="!mt-[-36px]">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Button
                        className="cursor-pointer gap-2"
                        onClick={() => {
                          const newState = !createNewVessel;
                          setCreateNewVessel(newState);
                        }}
                      >
                        <motion.div
                          animate={{ rotate: createNewVessel ? 45 : 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          {createNewVessel ? (
                            <Minus className="h-4 w-4 " />
                          ) : (
                            <Plus className="h-4 w-4 " />
                          )}
                        </motion.div>
                        {language === "en"
                          ? createNewVessel
                            ? "Hide Form"
                            : "Add Vessel"
                          : "Thêm tàu khác"}
                      </Button>
                    </motion.div>
                  </div>
                )}
                <AnimatePresence>
                  {createNewVessel && (
                    <motion.div
                      ref={formRef}
                      initial={{ opacity: 0, height: 0, y: -20 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -20 }}
                      transition={{
                        duration: 0.4,
                        ease: "easeOut",
                        opacity: { duration: 0.3 },
                        height: { duration: 0.4 },
                      }}
                      className="overflow-hidden"
                      onAnimationComplete={() => {
                        // Scroll to form and add highlight effect when form opens
                        if (createNewVessel) {
                          const formElement = formRef.current;
                          if (formElement) {
                            // Wait a bit longer to ensure form is fully rendered
                            setTimeout(() => {
                              // Scroll to form
                              formElement.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                                inline: "nearest",
                              });

                              // Add highlight effect
                              formElement.style.boxShadow =
                                "0 0 0 2px rgba(59, 130, 246, 0.3)";
                              setTimeout(() => {
                                formElement.style.boxShadow = "";
                              }, 1000);

                              // Focus the file upload area after scroll completes
                              setTimeout(() => {
                                const fileUploadInput =
                                  document.getElementById("v-doc-file-input");
                                if (fileUploadInput) {
                                  fileUploadInput.focus();
                                }
                              }, 500);
                            }, 300);
                          }
                        }
                      }}
                    >
                      <div className="mx-auto flex flex-col gap-2 py-4">
                        <div className="text-center mb-4">
                          <h2 className="text-2xl font-bold text-blue-800">
                            QUẢN LÝ THÔNG TIN TÀU
                          </h2>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="text-sm font-bold">
                            {language === "en"
                              ? "Ai Document Scan"
                              : "Chọn phương thức quét"}
                          </div>
                        </div>
                        <div className="grid gap-4">
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                          >
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
                              onDrop={(e) => {
                                e.preventDefault();
                                setIsDragging(false);
                                const file = e.dataTransfer.files?.[0];
                                if (file) {
                                  handleDocumentScan(file);
                                }
                              }}
                              onClick={() =>
                                document
                                  .getElementById("v-doc-file-input")
                                  ?.click()
                              }
                              className={`relative p-6 border-2 border-dashed rounded-md cursor-pointer text-center transition-colors ${
                                isDragging
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-300"
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
                                  <span className="text-blue-700 font-semibold">
                                    Scanning...
                                  </span>
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
                                    id="v-doc-file-input"
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleDocumentScan(file);
                                      }
                                    }}
                                  />
                                  <Upload
                                    size={32}
                                    className="mx-auto text-gray-400"
                                  />
                                  <p className="mt-2 text-sm text-gray-600">
                                    {language === "en"
                                      ? "Drag & drop an document image here, or click to select one"
                                      : "Kéo và thả ảnh vào đây, hoặc nhấn để chọn một ảnh"}
                                  </p>
                                </>
                              )}
                              <div className="flex flex-col md:flex-row gap-4 w-full p-3 ">
                                {scanProgress <= 100 &&
                                  scanProgress > 10 &&
                                  !isScanning && (
                                    <div className="flex flex-col md:flex-row gap-4 w-full p-3 ">
                                      <Presentation
                                        size={16}
                                        className="mx-auto text-gray-400"
                                      />
                                      <p className="mt-2 text-sm text-gray-600">
                                        Loading... Please wait a while
                                      </p>
                                    </div>
                                  )}
                              </div>
                            </div>
                          </motion.div>

                          <div className="relative hidden md:block">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-background px-2 text-muted-foreground">
                                {language === "en" ? "Or" : "Hoặc"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <form onSubmit={handleSubmit}>
                        <div className="flex-grow">
                          <div className="flex flex-col gap-2">
                            <div className="text-lg font-semibold">
                              {editVesselId
                                ? language === "en"
                                  ? "Edit Vessel"
                                  : "Chỉnh sửa tàu"
                                : language === "en"
                                ? "Add New Vessel"
                                : "Thêm tàu mới"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {language === "en"
                                ? "Fill in the details to add a new vessel to your fleet."
                                : "Điền thông tin để thêm tàu mới vào đội tàu của bạn."}
                            </div>
                          </div>

                          <div className="grid gap-4 py-4">
                            {vesselFormData?.fileUrl && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: 0.1 }}
                              >
                                <img
                                  src={vesselFormData?.fileUrl}
                                  alt="Document Preview"
                                  className="mt-4 max-w-full h-[200px] rounded-lg shadow-lg"
                                />
                              </motion.div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.4, delay: 0.2 }}
                                className="space-y-2"
                              >
                                <Label htmlFor="registration_number">
                                  {language === "en"
                                    ? "Registration Number"
                                    : "Số đăng ký"}
                                </Label>
                                <Input
                                  id="registration_number"
                                  type="text"
                                  value={vesselFormData.registration_number}
                                  onChange={(e) =>
                                    setVesselFormData((prev) => ({
                                      ...prev,
                                      registration_number: e.target.value,
                                    }))
                                  }
                                  className="!border-solid !border-red-500 rounded-none"
                                />
                              </motion.div>

                              <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.4, delay: 0.3 }}
                                className="space-y-2"
                              >
                                <Label htmlFor="name">
                                  {language === "en"
                                    ? "Vessel Name"
                                    : "Tên tàu"}
                                </Label>
                                <Input
                                  id="name"
                                  type="text"
                                  value={vesselFormData.name}
                                  onChange={(e) =>
                                    setVesselFormData((prev) => ({
                                      ...prev,
                                      name: e.target.value,
                                    }))
                                  }
                                  className="!border-solid !border-red-500 rounded-none"
                                />
                              </motion.div>

                              <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.4, delay: 0.4 }}
                                className="space-y-2"
                              >
                                <Label htmlFor="owner_name">
                                  {language === "en"
                                    ? "Vessel owner"
                                    : "Chủ tàu"}
                                </Label>
                                <Input
                                  id="owner_name"
                                  type="text"
                                  value={vesselFormData.owner_name}
                                  onChange={(e) =>
                                    setVesselFormData((prev) => ({
                                      ...prev,
                                      owner_name: e.target.value,
                                    }))
                                  }
                                  className="!border-solid !border-red-500 rounded-none"
                                />
                              </motion.div>

                              <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.4, delay: 0.5 }}
                                className="space-y-2"
                              >
                                <Label htmlFor="owner_id">
                                  {language === "en" ? "Owner ID" : "CCCD"}
                                </Label>
                                <Input
                                  id="owner_id"
                                  type="text"
                                  value={vesselFormData.owner_id}
                                  onChange={(e) =>
                                    setVesselFormData((prev) => ({
                                      ...prev,
                                      owner_id: e.target.value,
                                    }))
                                  }
                                  className="!border-solid !border-red-500 rounded-none"
                                />
                              </motion.div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="residential_address">
                                  {language === "en"
                                    ? "Residential address"
                                    : "Nơi thường trú"}
                                </Label>
                                <Input
                                  id="residential_address"
                                  type="text"
                                  value={vesselFormData.residential_address}
                                  onChange={(e) =>
                                    setVesselFormData((prev) => ({
                                      ...prev,
                                      residential_address: e.target.value,
                                    }))
                                  }
                                  className="!border-solid !border-red-500 rounded-none"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="type_of_vessel">
                                  {language === "en"
                                    ? "Type of Vessel"
                                    : "Kiểu tàu"}
                                </Label>
                                <Input
                                  id="type_of_vessel"
                                  type="text"
                                  value={vesselFormData.type_of_vessel}
                                  onChange={(e) =>
                                    setVesselFormData((prev) => ({
                                      ...prev,
                                      type_of_vessel: e.target.value,
                                    }))
                                  }
                                  className="!border-solid !border-red-500 rounded-none"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="gross_tonnage">
                                  {language === "en"
                                    ? "Gross Tonnage"
                                    : "Tông dung tích, GT:"}
                                </Label>
                                <Input
                                  id="gross_tonnage"
                                  type="text"
                                  value={vesselFormData.gross_tonnage}
                                  onChange={(e) =>
                                    setVesselFormData((prev) => ({
                                      ...prev,
                                      gross_tonnage: e.target.value,
                                    }))
                                  }
                                  className="!border-solid !border-red-500 rounded-none"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4"></div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="length">
                                  {language === "en"
                                    ? "Length (m)"
                                    : "Chiều dài Lmax, m:"}
                                </Label>
                                <Input
                                  id="length"
                                  type="text"
                                  value={vesselFormData.length}
                                  onChange={(e) =>
                                    setVesselFormData((prev) => ({
                                      ...prev,
                                      length: e.target.value,
                                    }))
                                  }
                                  className="!border-solid !border-red-500 rounded-none"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="width">
                                  {language === "en"
                                    ? "Width (m)"
                                    : "Chiều rộng Bmax, m:"}
                                </Label>
                                <Input
                                  id="width"
                                  type="text"
                                  value={vesselFormData.width}
                                  onChange={(e) =>
                                    setVesselFormData((prev) => ({
                                      ...prev,
                                      width: e.target.value,
                                    }))
                                  }
                                  className="!border-solid !border-red-500 rounded-none"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="draught">
                                  {language === "en"
                                    ? "Draught"
                                    : "Chiêu cao mạn D, m:"}
                                </Label>
                                <Input
                                  id="draught"
                                  type="text"
                                  value={vesselFormData.draught}
                                  onChange={(e) =>
                                    setVesselFormData((prev) => ({
                                      ...prev,
                                      draught: e.target.value,
                                    }))
                                  }
                                  className="!border-solid !border-red-500 rounded-none"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="materials">
                                  {language === "en"
                                    ? "Materials"
                                    : "Vật liệu vỏ:"}
                                </Label>
                                <Input
                                  id="materials"
                                  type="text"
                                  value={vesselFormData.materials}
                                  onChange={(e) =>
                                    setVesselFormData((prev) => ({
                                      ...prev,
                                      materials: e.target.value,
                                    }))
                                  }
                                  className="!border-solid !border-red-500 rounded-none"
                                />
                              </div>

                              <div className="space-y-3">
                                <Label htmlFor="engine_power">
                                  {language === "en"
                                    ? "Engine Power"
                                    : "Công suất KW"}
                                </Label>
                                <Input
                                  id="engine_power"
                                  type="text"
                                  value={vesselFormData.engine_power}
                                  onChange={(e) =>
                                    setVesselFormData((prev) => ({
                                      ...prev,
                                      engine_power: e.target.value,
                                    }))
                                  }
                                  className="!border-solid !border-red-500 rounded-none"
                                />
                              </div>

                              <div className="space-y-3">
                                <Label htmlFor="number_engines">
                                  {language === "en"
                                    ? "Number engines"
                                    : "Số máy"}
                                </Label>
                                <Input
                                  id="number_engines"
                                  type="text"
                                  value={vesselFormData.number_engines}
                                  onChange={(e) =>
                                    setVesselFormData((prev) => ({
                                      ...prev,
                                      number_engines: e.target.value,
                                    }))
                                  }
                                  className="!border-solid !border-red-500 rounded-none"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="type_of_machine">
                                  {language === "en"
                                    ? "Type of machine"
                                    : "Ký hiệu máy"}
                                </Label>
                                <Input
                                  id="type_of_machine"
                                  type="text"
                                  value={vesselFormData.type_of_machine}
                                  onChange={(e) =>
                                    setVesselFormData((prev) => ({
                                      ...prev,
                                      type_of_machine: e.target.value,
                                    }))
                                  }
                                  className="!border-solid !border-red-500 rounded-none"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="port_registry">
                                  {language === "en"
                                    ? "Port of registry"
                                    : "Cáng đăng ký"}
                                </Label>
                                <Input
                                  id="port_registry"
                                  type="text"
                                  value={vesselFormData.port_registry}
                                  onChange={(e) =>
                                    setVesselFormData((prev) => ({
                                      ...prev,
                                      port_registry: e.target.value,
                                    }))
                                  }
                                  className="!border-solid !border-red-500 rounded-none"
                                />
                              </div>
                            </div>

                            <div>
                              <h4 className="text-lg font-semibold">
                                {language === "en"
                                  ? "Edit Vessel"
                                  : "Chỉnh sửa tàu"}
                              </h4>
                              <span className="text-sm text-muted-foreground">
                                {language === "en"
                                  ? "Fill in the details to edit the vessel"
                                  : "Điền thông tin để chỉnh sửa tàu"}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="type">
                                  {language === "en"
                                    ? "Vessel Type"
                                    : "Loại tàu"}{" "}
                                  *
                                </Label>
                                <Select
                                  value={vesselFormData.type}
                                  onValueChange={handleSelectChange}
                                >
                                  <SelectTrigger className="!border-solid !border-red-500 rounded-none">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectGroup>
                                      <SelectItem value="mining">
                                        {language === "en"
                                          ? "Fishing Vessel"
                                          : "Tàu cá"}
                                      </SelectItem>
                                      <SelectItem value="logistics">
                                        {language === "en"
                                          ? "Logistics Service Ship"
                                          : "Tàu dịch vụ"}
                                      </SelectItem>
                                    </SelectGroup>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="fishery_permit">
                                  {language === "en"
                                    ? "Fishery permit"
                                    : "Giấy phép khai thác"}
                                </Label>
                                <Input
                                  id="fishery_permit"
                                  type="text"
                                  value={vesselFormData.fishery_permit}
                                  onChange={(e) =>
                                    setVesselFormData((prev) => ({
                                      ...prev,
                                      fishery_permit: e.target.value,
                                    }))
                                  }
                                  className="!border-solid !border-red-500 rounded-none"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="expiration_date">
                                  {language === "en"
                                    ? "Expiration date"
                                    : "Thời hạn"}
                                </Label>
                                <Input
                                  id="expiration_date"
                                  type="date"
                                  value={vesselFormData.expiration_date}
                                  onChange={(e) =>
                                    setVesselFormData((prev) => ({
                                      ...prev,
                                      expiration_date: e.target.value,
                                    }))
                                  }
                                  className="!border-solid !border-red-500 rounded-none"
                                />
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <Label>
                                  {language === "en"
                                    ? "Fishing method/gear"
                                    : "Phương pháp đánh bắt"}
                                </Label>
                                <div className="grid grid-cols-2 gap-2 mt-2 text-[12px]">
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      id="purse_seine"
                                      className="h-8 w-8"
                                      checked={
                                        vesselFormData.fishing_gear.purse_seine
                                      }
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
                                    <Label htmlFor="purse_seine">
                                      Purse Seine
                                    </Label>
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
                                      checked={
                                        vesselFormData.fishing_gear.trawl
                                      }
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
                                  {language === "en"
                                    ? "Crew Information"
                                    : "Thông tin thuyền viên"}
                                </Label>
                                <div className="space-y-4 mt-2">
                                  {vesselFormData.crew_info.map(
                                    (crew, index) => (
                                      <div
                                        key={index}
                                        className="space-y-4 relative"
                                      >
                                        <Button
                                          type="button"
                                          variant={
                                            vesselFormData.crew_info[index]
                                              .showDelete
                                              ? "destructive"
                                              : "outline"
                                          }
                                          size="icon"
                                          className="relative group"
                                          onMouseEnter={() => {
                                            const newCrewInfo = [
                                              ...vesselFormData.crew_info,
                                            ];
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
                                            if (
                                              !vesselFormData.crew_info[index]
                                                .deleteConfirm
                                            ) {
                                              const newCrewInfo = [
                                                ...vesselFormData.crew_info,
                                              ];
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
                                            const newCrewInfo = [
                                              ...vesselFormData.crew_info,
                                            ];
                                            const deleted = newCrewInfo[index];
                                            if (editVesselId && deleted.id) {
                                              // If editing and crew has an id, delete from DB immediately
                                              await supabase
                                                .from("crew_members")
                                                .delete()
                                                .eq("id", deleted.id);
                                              setDeletedCrewIds((prev) => [
                                                ...prev,
                                                deleted.id!,
                                              ]);
                                            }
                                            newCrewInfo.splice(index, 1);
                                            setVesselFormData((prev) => ({
                                              ...prev,
                                              crew_info: newCrewInfo,
                                            }));
                                          }}
                                        >
                                          {vesselFormData.crew_info[index]
                                            .showDelete ||
                                          vesselFormData.crew_info[index]
                                            .deleteConfirm ? (
                                            <Trash2 className="h-4 w-4" />
                                          ) : (
                                            <span className="text-sm font-medium">
                                              {index + 1}
                                            </span>
                                          )}
                                        </Button>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div className="space-y-2">
                                            <Label>
                                              {language === "en"
                                                ? "Name"
                                                : "Tên"}
                                            </Label>
                                            <Input
                                              type="text"
                                              value={crew.name}
                                              onChange={(e) => {
                                                const newCrewInfo = [
                                                  ...vesselFormData.crew_info,
                                                ];
                                                newCrewInfo[index] = {
                                                  ...newCrewInfo[index],
                                                  name: e.target.value,
                                                };
                                                setVesselFormData((prev) => ({
                                                  ...prev,
                                                  crew_info: newCrewInfo,
                                                }));
                                              }}
                                              className="!border-solid !border-red-500 rounded-none"
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <Label>
                                              {language === "en"
                                                ? "Position"
                                                : "Vị trí"}
                                            </Label>
                                            <Input
                                              type="text"
                                              value={crew.position}
                                              onChange={(e) => {
                                                const newCrewInfo = [
                                                  ...vesselFormData.crew_info,
                                                ];
                                                newCrewInfo[index] = {
                                                  ...newCrewInfo[index],
                                                  position: e.target.value,
                                                };
                                                setVesselFormData((prev) => ({
                                                  ...prev,
                                                  crew_info: newCrewInfo,
                                                }));
                                              }}
                                              className="!border-solid !border-red-500 rounded-none"
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <Label>
                                              {language === "en"
                                                ? "ID Card"
                                                : "CCCD"}
                                            </Label>
                                            <Input
                                              type="text"
                                              value={crew.id_card}
                                              onChange={(e) => {
                                                const newCrewInfo = [
                                                  ...vesselFormData.crew_info,
                                                ];
                                                newCrewInfo[index] = {
                                                  ...newCrewInfo[index],
                                                  id_card: e.target.value,
                                                };
                                                setVesselFormData((prev) => ({
                                                  ...prev,
                                                  crew_info: newCrewInfo,
                                                }));
                                              }}
                                              className="!border-solid !border-red-500 rounded-none"
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <Label>
                                              {language === "en"
                                                ? "Phone Number"
                                                : "Số điện thoại"}
                                            </Label>
                                            <Input
                                              type="text"
                                              value={crew.phone}
                                              onChange={(e) => {
                                                const newCrewInfo = [
                                                  ...vesselFormData.crew_info,
                                                ];
                                                newCrewInfo[index] = {
                                                  ...newCrewInfo[index],
                                                  phone: e.target.value,
                                                };
                                                setVesselFormData((prev) => ({
                                                  ...prev,
                                                  crew_info: newCrewInfo,
                                                }));
                                              }}
                                              className="!border-solid !border-red-500 rounded-none"
                                            />
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="flex flex-col space-y-2">
                                            <Label className="mb-2 block">
                                              {language === "en"
                                                ? "ID Card Front"
                                                : "Mặt trước CCCD"}
                                            </Label>
                                            <div className="flex items-center gap-2 flex-col">
                                              <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                  const file =
                                                    e.target.files?.[0];
                                                  if (file)
                                                    handleImageUpload(
                                                      file,
                                                      index,
                                                      "front"
                                                    );
                                                }}
                                                className="!border-solid rounded-none"
                                              />
                                              {crew.id_card_front && (
                                                <img
                                                  src={crew.id_card_front}
                                                  alt="ID Card Front"
                                                  className="h-20 w-32 object-cover rounded cursor-pointer"
                                                  onClick={() =>
                                                    window.open(
                                                      crew.id_card_back,
                                                      "_blank"
                                                    )
                                                  }
                                                />
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex flex-col space-y-2">
                                            <Label className="mb-2 block">
                                              {language === "en"
                                                ? "ID Card Back"
                                                : "Mặt sau CCCD"}
                                            </Label>
                                            <div className="flex items-center gap-2 flex-col">
                                              <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                  const file =
                                                    e.target.files?.[0];
                                                  if (file)
                                                    handleImageUpload(
                                                      file,
                                                      index,
                                                      "back"
                                                    );
                                                }}
                                                className="!border-solid  rounded-none"
                                              />
                                              {crew.id_card_back && (
                                                <img
                                                  src={crew.id_card_back}
                                                  alt="ID Card Back"
                                                  className="h-20 w-32 object-cover rounded cursor-pointer"
                                                  onClick={() =>
                                                    window.open(
                                                      crew.id_card_back,
                                                      "_blank"
                                                    )
                                                  }
                                                />
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  )}
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
                                    disabled={isCaptainOrCrew()}
                                  >
                                    <Plus className="w-4 h-4 mr-2" />
                                    {language === "en"
                                      ? "Add Crew Member"
                                      : "Thêm thuyền viên"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-6 flex justify-center">
                          <Button type="submit">
                            {editVesselId
                              ? language === "en"
                                ? "Update Vessel"
                                : "Cập nhật tàu"
                              : language === "en"
                              ? "Submit"
                              : "Lưu tàu"}
                          </Button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            <Dialog
              open={successDialogOpen}
              onOpenChange={setSuccessDialogOpen}
            >
              <DialogContent className="sm:max-w-[400px] flex flex-col items-center justify-center">
                <DialogHeader>
                  <DialogTitle>
                    {language === "en" ? "Success!" : "Thành công!"}
                  </DialogTitle>
                  <DialogDescription>
                    {language === "en"
                      ? "Vessel has been saved successfully."
                      : "Tàu đã được lưu thành công."}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                  <QRCode
                    value={`${window.location.origin}/vessel/${successVessel.registration_number}`}
                    size={180}
                  />
                  <div className="text-center">
                    <div className="font-bold text-lg">
                      {successVessel.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Reg #: {successVessel.registration_number}
                    </div>
                  </div>
                  {/* <Button
                    className="mt-2"
                    onClick={() => {
                      setSuccessDialogOpen(false);
                      navigate(`/vessel/${successVessel.registration_number}`);
                    }}
                  >
                    {language === "en" ? "View Vessel" : "Xem tàu"}
                  </Button> */}
                </div>
              </DialogContent>
            </Dialog>

            {/* View Vessel Dialog */}
            <Dialog
              open={openViewDialogId !== null}
              onOpenChange={(open) => {
                if (!open) setOpenViewDialogId(null);
              }}
            >
              <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-white">
                <DialogHeader>
                  <DialogTitle>
                    {language === "en" ? "Vessel Details" : "Chi tiết tàu"}
                  </DialogTitle>
                  <DialogDescription>
                    {language === "en"
                      ? "View complete vessel information"
                      : "Xem thông tin chi tiết tàu"}
                  </DialogDescription>
                </DialogHeader>
                {openViewDialogId &&
                  (() => {
                    const vessel = vessels.find(
                      (v) => v.id === openViewDialogId
                    );
                    if (!vessel) return null;

                    return (
                      <div className="space-y-6">
                        {/* Document Preview */}
                        {vessel.fileUrl && (
                          <div>
                            <Label className="text-sm font-medium">
                              {language === "en"
                                ? "Document Preview"
                                : "Xem trước tài liệu"}
                            </Label>
                            <img
                              src={vessel.fileUrl}
                              alt="Document Preview"
                              className="mt-2 max-w-full h-[200px] rounded-lg shadow-lg object-contain"
                            />
                          </div>
                        )}

                        {/* Basic Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              {language === "en"
                                ? "Registration Number"
                                : "Số đăng ký"}
                            </Label>
                            <span className="block w-full px-3 py-2 border border-gray-200 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                              {vessel.registration_number}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              {language === "en" ? "Vessel Name" : "Tên tàu"}
                            </Label>
                            <span className="block w-full px-3 py-2 border border-gray-200 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                              {vessel.name}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              {language === "en" ? "Vessel owner" : "Chủ tàu"}
                            </Label>
                            <span className="block w-full px-3 py-2 border border-gray-200 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                              {vessel.owner_name || "-"}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              {language === "en" ? "Owner ID" : "CCCD"}
                            </Label>
                            <span className="block w-full px-3 py-2 border border-gray-200 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                              {vessel.owner_id || "-"}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              {language === "en"
                                ? "Residential address"
                                : "Nơi thường trú"}
                            </Label>
                            <span className="block w-full px-3 py-2 border border-gray-200 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                              {vessel.residential_address || "-"}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              {language === "en"
                                ? "Type of Vessel"
                                : "Kiểu tàu"}
                            </Label>
                            <span className="block w-full px-3 py-2 border border-gray-200 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                              {vessel.type_of_vessel || "-"}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              {language === "en"
                                ? "Gross Tonnage"
                                : "Tông dung tích, GT:"}
                            </Label>
                            <span className="block w-full px-3 py-2 border border-gray-200 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                              {vessel.gross_tonnage || "-"}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              {language === "en"
                                ? "Length (m)"
                                : "Chiều dài Lmax, m:"}
                            </Label>
                            <span className="block w-full px-3 py-2 border border-gray-200 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                              {vessel.length || "-"}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              {language === "en"
                                ? "Width (m)"
                                : "Chiều rộng Bmax, m:"}
                            </Label>
                            <span className="block w-full px-3 py-2 border border-gray-200 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                              {vessel.width || "-"}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              {language === "en"
                                ? "Draught"
                                : "Chiêu cao mạn D, m:"}
                            </Label>
                            <span className="block w-full px-3 py-2 border border-gray-200 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                              {vessel.draught || "-"}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              {language === "en" ? "Materials" : "Vật liệu vỏ:"}
                            </Label>
                            <span className="block w-full px-3 py-2 border border-gray-200 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                              {vessel.materials || "-"}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              {language === "en"
                                ? "Engine Power"
                                : "Công suất KW"}
                            </Label>
                            <span className="block w-full px-3 py-2 border border-gray-200 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                              {vessel.engine_power || "-"}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              {language === "en" ? "Number engines" : "Số máy"}
                            </Label>
                            <span className="block w-full px-3 py-2 border border-gray-200 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                              {vessel.number_engines || "-"}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              {language === "en"
                                ? "Type of machine"
                                : "Ký hiệu máy"}
                            </Label>
                            <span className="block w-full px-3 py-2 border border-gray-200 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                              {vessel.type_of_machine || "-"}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              {language === "en"
                                ? "Port of registry"
                                : "Cáng đăng ký"}
                            </Label>
                            <span className="block w-full px-3 py-2 border border-gray-200 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                              {vessel.port_registry || "-"}
                            </span>
                          </div>
                        </div>

                        {/* Edit Section */}
                        <div>
                          <h4 className="text-lg font-semibold">
                            {language === "en"
                              ? "Edit Vessel"
                              : "Chỉnh sửa tàu"}
                          </h4>
                          <span className="text-sm text-muted-foreground">
                            {language === "en"
                              ? "Fill in the details to edit the vessel"
                              : "Điền thông tin để chỉnh sửa tàu"}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              {language === "en"
                                ? "Fishery permit"
                                : "Giấy phép khai thác"}
                            </Label>
                            <span className="block w-full px-3 py-2 border border-gray-200 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                              {vessel.fishery_permit || "-"}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              {language === "en"
                                ? "Expiration date"
                                : "Thời hạn"}
                            </Label>
                            <span className="block w-full px-3 py-2 border border-gray-200 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                              {vessel.expiration_date || "-"}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">
                              {language === "en"
                                ? "Fishing method/gear"
                                : "Phương pháp đánh bắt"}
                            </Label>
                            <div className="grid grid-cols-2 gap-2 mt-2 text-[12px]">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id="purse_seine_view"
                                  className="h-8 w-8"
                                  checked={vessel.fishing_gear?.purse_seine}
                                  readOnly={true}
                                />
                                <Label htmlFor="purse_seine_view">
                                  Purse Seine
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id="hook_view"
                                  className="h-8 w-8"
                                  checked={vessel.fishing_gear?.hook}
                                  readOnly={true}
                                />
                                <Label htmlFor="hook_view">Hook</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id="net_view"
                                  className="h-8 w-8"
                                  checked={vessel.fishing_gear?.net}
                                  readOnly={true}
                                />
                                <Label htmlFor="net_view">Net</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id="trawl_view"
                                  className="h-8 w-8"
                                  checked={vessel.fishing_gear?.trawl}
                                  readOnly={true}
                                />
                                <Label htmlFor="trawl_view">Trawl</Label>
                              </div>
                            </div>
                          </div>

                          {/* Crew Information */}
                          {vessel.crew_info?.length > 0 && (
                            <div>
                              <Label className="text-sm font-medium">
                                {language === "en"
                                  ? "Crew Information"
                                  : "Thông tin thuyền viên"}
                              </Label>
                              <div className="space-y-4 mt-2">
                                {vessel.crew_info.map((crew, index) => (
                                  <div
                                    key={index}
                                    className="space-y-4 relative"
                                  >
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="relative group"
                                    >
                                      <span className="text-sm font-medium">
                                        {index + 1}
                                      </span>
                                    </Button>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label className="text-sm font-medium">
                                          {language === "en" ? "Name" : "Tên"}
                                        </Label>
                                        <span className="block w-full px-3 py-2 border border-gray-200 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                                          {crew.name}
                                        </span>
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-sm font-medium">
                                          {language === "en"
                                            ? "Position"
                                            : "Vị trí"}
                                        </Label>
                                        <span className="block w-full px-3 py-2 border border-gray-200 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                                          {crew.position}
                                        </span>
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-sm font-medium">
                                          {language === "en"
                                            ? "ID Card"
                                            : "CCCD"}
                                        </Label>
                                        <span className="block w-full px-3 py-2 border border-gray-200 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                                          {crew.id_card}
                                        </span>
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-sm font-medium">
                                          {language === "en"
                                            ? "Phone Number"
                                            : "Số điện thoại"}
                                        </Label>
                                        <span className="block w-full px-3 py-2 border border-gray-200 rounded-none bg-white text-sm min-h-[40px] flex items-center">
                                          {crew.phone}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="flex flex-col space-y-2">
                                        <Label className="mb-2 block text-sm font-medium">
                                          {language === "en"
                                            ? "ID Card Front"
                                            : "Mặt trước CCCD"}
                                        </Label>
                                        <div className="flex items-center gap-2 flex-col">
                                          {crew.id_card_front && (
                                            <img
                                              src={crew.id_card_front}
                                              alt="ID Card Front"
                                              className="h-20 w-32 object-cover rounded cursor-pointer"
                                              onClick={() =>
                                                window.open(
                                                  crew.id_card_front,
                                                  "_blank"
                                                )
                                              }
                                            />
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex flex-col space-y-2">
                                        <Label className="mb-2 block text-sm font-medium">
                                          {language === "en"
                                            ? "ID Card Back"
                                            : "Mặt sau CCCD"}
                                        </Label>
                                        <div className="flex items-center gap-2 flex-col">
                                          {crew.id_card_back && (
                                            <img
                                              src={crew.id_card_back}
                                              alt="ID Card Back"
                                              className="h-20 w-32 object-cover rounded cursor-pointer"
                                              onClick={() =>
                                                window.open(
                                                  crew.id_card_back,
                                                  "_blank"
                                                )
                                              }
                                            />
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default VesselData;
