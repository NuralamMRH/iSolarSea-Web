import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLayout } from "@/components/layout/PageLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/integrations/supabase/client";
import { useLanguageStore } from "@/stores/language-store";
import { en } from "@/translations/english";
import { vi } from "@/translations/vietnamese";
import {
  Ship,
  Anchor,
  Navigation,
  Users,
  Map,
  BarChart,
  Shield,
  UserPlus,
  Settings,
} from "lucide-react";
import FleetBarChart from "@/components/dashboard/fleet/FleetBarChart";
import RegionBasedFleet from "@/components/dashboard/fleet/RegionBasedFleet";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Phone, Link2 } from "lucide-react";
import TopButtons from "@/components/top-buttons";
import { useTranslation } from "@/hooks/use-translation";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import QRCode from "react-qr-code";
import { useIsMobile } from "@/hooks/use-mobile";
import VesselsFilter from "@/components/dashboard/fleet/VesselsFilter";
import CompanyInfo from "@/components/dashboard/CompanyInfo";
import VesselsListWithInfo from "@/components/dashboard/fleet/VesselsListWithInfo";
import IuuSummaryRecords from "@/components/dashboard/IuuSummaryRecords";
// Import vessel access control components and hooks
import { useVesselAccess } from "@/hooks/use-vessel-access";
import VesselAccessManager from "@/components/vessel-access/VesselAccessManager";
import {
  VesselAccessPermission,
  VesselAccessRole,
  VesselAccessUser,
  VesselAccessInvitation,
  ROLE_PERMISSIONS,
  canManageAccess,
} from "@/types/vessel-access";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface VesselData {
  id: string;
  name: string;
  type: "mining" | "logistics";
  registration_number: string;
  captain_name: string | null;
  owner_name: string | null;
  capacity: number | null;
  length: number | null;
  width: number | null;
  engine_power: string | null;
  crew_count: number | null;
  fishing_method: string | null;
  created_at: string;
  status?: "active" | "maintenance" | "docked" | "at-sea";
  last_location?: { lat: number; lng: number } | null;
  image_url?: string | null;
  user_id?: string; // Added user_id to VesselData
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
  id: string;
  name: string;
  position: string;
  id_card: string;
  phone: string;
  id_card_front: string;
  id_card_back: string;
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

const FleetManagement = () => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { language } = useLanguageStore();
  const { t } = useTranslation();
  const translations = language === "en" ? en : vi;

  const [vessels, setVessels] = useState<VesselData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [selectedVessel, setSelectedVessel] = useState<VesselData | null>(null);
  const [crewList, setCrewList] = useState<CrewMember[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<CrewMember | null>(null);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [grantLink, setGrantLink] = useState<string>("");
  const [grantType, setGrantType] = useState<"email" | "phone" | null>(null);
  const [phone, setPhone] = useState<string>("");
  const [isGranting, setIsGranting] = useState(false);
  const [grantLinksByVessel, setGrantLinksByVessel] = useState<
    Record<string, GrantLink[]>
  >({});
  const [showGrantLinksDialog, setShowGrantLinksDialog] = useState(false);
  const [selectedGrantLinks, setSelectedGrantLinks] = useState<GrantLink[]>([]);
  const [selectedGrantVessel, setSelectedGrantVessel] =
    useState<VesselData | null>(null);

  // Access control state
  const [selectedVesselForAccess, setSelectedVesselForAccess] =
    useState<VesselData | null>(null);
  const [accessControlDialogOpen, setAccessControlDialogOpen] = useState(false);
  const [activeUsers, setActiveUsers] = useState<VesselAccessUser[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<
    VesselAccessInvitation[]
  >([]);
  const [accessLoading, setAccessLoading] = useState(false);

  // Direct account creation state
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    email: string;
    password: string;
    invitationCode: string;
  } | null>(null);
  const [emailTemplate, setEmailTemplate] = useState<string>("");

  // Role-based access control state
  const [userRole, setUserRole] = useState<string>("");
  const [companyData, setCompanyData] = useState<{
    id: string;
    user_id: string;
    company_name: string;
    address: string | null;
    tax_code: string | null;
    representative_name: string | null;
    representative_position: string | null;
    representative_phone: string | null;
    rep_phone: string | null;
    representative_email: string | null;
    fleet?: Array<{
      type: string;
      count: number;
      vessels: string[];
    }>;
    created_at: string;
    updated_at: string;
    imageOne?: string | null;
    imageTwo?: string | null;
  } | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);

  // Get vessel access for selected vessel
  const vesselAccess = useVesselAccess(selectedVesselForAccess?.id || "");

  useEffect(() => {
    console.log("selectedCrew ", selectedCrew);
  }, [selectedCrew]);

  useEffect(() => {
    if (user) {
      fetchVessels();
      fetchUserRole();
    }
  }, [user]);

  const fetchUserRole = async () => {
    if (!user?.auth_id) return;

    try {
      const { data: userData, error } = await supabase
        .from("users")
        .select("role")
        .eq("auth_id", user.auth_id)
        .single();

      if (error) {
        console.error("Error fetching user role:", error);
        setUserRole("");
      } else {
        setUserRole(userData?.role || "");
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      setUserRole("");
    }
  };

  const fetchCompanyData = async (vesselUserId: string) => {
    if (!vesselUserId) return;

    setCompanyLoading(true);
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", vesselUserId)
        .single();

      if (error) {
        console.error("Error fetching company data:", error);
        setCompanyData(null);
      } else {
        setCompanyData(data);
      }
    } catch (error) {
      console.error("Error fetching company data:", error);
      setCompanyData(null);
    } finally {
      setCompanyLoading(false);
    }
  };

  const isCaptainOrCrew = () => {
    const role = userRole.toLowerCase();
    return role === "captain" || role === "crew" || role === "crew_member";
  };

  const canManageAccess = () => {
    const role = userRole.toLowerCase();
    return role === "owner" || role === "moderator" || role === "admin";
  };

  const fetchVessels = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("vessels")
        .select("*", { count: "exact" })
        .eq("user_id", user?.auth_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const vesselsWithStatus: VesselData[] = (
        data as Record<string, unknown>[]
      ).map((vessel) => {
        const v = vessel as { [key: string]: unknown };
        return {
          id: String(v.id),
          name: String(v.name),
          type: v.type as "mining" | "logistics",
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
          crew_count:
            v.crew_count !== undefined && v.crew_count !== null
              ? Number(v.crew_count)
              : null,
          fishing_method: v.fishing_method ? String(v.fishing_method) : null,
          created_at: String(v.created_at),
          image_url: v.image_url ? String(v.image_url) : null,
          status: ["active", "maintenance", "docked", "at-sea"][
            Math.floor(Math.random() * 4)
          ] as "active" | "maintenance" | "docked" | "at-sea",
          last_location: {
            lat: 10.8231 + Math.random() * 0.5,
            lng: 106.6297 + Math.random() * 0.5,
          },
          user_id: v.user_id ? String(v.user_id) : undefined, // Ensure user_id is included
        };
      });

      // Fetch vessels that the user has access to through vessel access control
      const { data: accessData, error: accessError } = await supabase
        .from("vessel_access_control")
        .select("vessel_id")
        .eq("user_id", user?.auth_id)
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
          .in("id", accessibleVesselIds);

        if (accessibleError) {
          console.error("Error fetching accessible vessels:", accessibleError);
        } else {
          accessibleVessels = accessibleData || [];
        }
      }

      // Combine owned and accessible vessels, removing duplicates
      const allVessels = [...(vesselsWithStatus || []), ...accessibleVessels];
      const uniqueVessels = allVessels.filter(
        (vessel, index, self) =>
          index === self.findIndex((v) => v.id === vessel.id)
      );

      setVessels(uniqueVessels as VesselData[]);

      // Fetch crew for each vessel
      const { data: crewData } = await supabase
        .from("crew_members")
        .select("*")
        .eq("vessel_id", uniqueVessels[0].id);

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
    // Reset form fields
    setEmail("");
    setPassword("");
    setRole("");
    setGrantLink("");
    setGrantType(null);
    setGeneratedCredentials(null);
    setEmailTemplate("");

    // Fetch crew for this vessel
    const { data: crewData } = await supabase
      .from("crew_members")
      .select("*")
      .eq("vessel_id", vessel.id);

    setCrewList(crewData as unknown as CrewMember[]);

    // Fetch company data for this vessel's owner
    if (isCaptainOrCrew()) {
      await fetchCompanyData(vessel.user_id || "");
    }
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
            phone: grantType === "phone" ? phone : null,
            email: grantType === "email" ? email : null,
            grant_code,
            granted_by: user?.id || null,
            password: password,
          },
        ])
        .select()
        .single();
      if (error) throw error;
      const link = `${window.location.origin}/vessel-invitation/${grant_code}`;
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
    const svgId = generatedCredentials
      ? "direct-account-qr-svg"
      : "grant-qr-svg";
    const svg = document.getElementById(svgId);
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

    // Draw title
    ctx.fillStyle = "#222";
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const titleText = generatedCredentials
      ? language === "en"
        ? "Scan to access vessel account (Direct Account)"
        : "Quét mã để truy cập tài khoản tàu (Tài khoản trực tiếp)"
      : language === "en"
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
      a.download = generatedCredentials
        ? "direct-account-qr.png"
        : "grant-qr.png";
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
        setSelectedGrantLinks(updatedLinks as unknown as GrantLink[]);
        // Also update the main grantLinksByVessel state
        setGrantLinksByVessel((prev) => ({
          ...prev,
          [selectedGrantVessel.id]: updatedLinks as unknown as GrantLink[],
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

  // Access control functions
  const openAccessControlDialog = async (vessel: VesselData) => {
    setSelectedVesselForAccess(vessel);
    setAccessControlDialogOpen(true);
    await fetchAccessData(vessel.id);
  };

  const fetchAccessData = async (vesselId: string) => {
    try {
      setAccessLoading(true);
      console.log("Fetching access data for vessel:", vesselId);

      // Fetch active users
      const { data: usersData, error: usersError } = await supabase
        .from("vessel_access_control")
        .select("*")
        .eq("vessel_id", vesselId)
        .eq("is_active", true);

      if (usersError) {
        console.error("Error fetching users:", usersError);
        setActiveUsers([]);
      } else {
        console.log("Users data:", usersData);
        const formattedUsers: VesselAccessUser[] = await Promise.all(
          (usersData || []).map(
            async (item: {
              user_id: string;
              granted_by: string;
              role: VesselAccessRole;
              permissions: VesselAccessPermission[];
              is_active: boolean;
              expires_at?: string;
              created_at: string;
            }) => {
              try {
                // Get user details
                const { data: userData } = await supabase
                  .from("user_details_view")
                  .select("id, email, name, phone")
                  .eq("id", item.user_id)
                  .single();

                const { data: grantedByData } = await supabase
                  .from("user_details_view")
                  .select("id, email, name, phone")
                  .eq("id", item.granted_by)
                  .single();

                return {
                  id: item.user_id,
                  email: userData?.email || "Unknown",
                  name: userData?.name || "Unknown",
                  phone: userData?.phone || "",
                  role: item.role,
                  permissions: item.permissions,
                  is_active: item.is_active,
                  expires_at: item.expires_at,
                  granted_by: item.granted_by,
                  granted_by_name: grantedByData?.name || "Unknown",
                  granted_by_email: grantedByData?.email || "Unknown",
                  created_at: item.created_at,
                };
              } catch (error) {
                console.error("Error fetching user details:", error);
                return {
                  id: item.user_id,
                  email: "Unknown",
                  name: "Unknown",
                  phone: "",
                  role: item.role,
                  permissions: item.permissions,
                  is_active: item.is_active,
                  expires_at: item.expires_at,
                  granted_by: item.granted_by,
                  granted_by_name: "Unknown",
                  granted_by_email: "Unknown",
                  created_at: item.created_at,
                };
              }
            }
          )
        );

        setActiveUsers(formattedUsers);
      }

      // Fetch pending invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from("vessel_access_invitations")
        .select("*")
        .eq("vessel_id", vesselId)
        .eq("is_accepted", false)
        .gt("expires_at", new Date().toISOString());

      if (invitationsError) {
        console.error("Error fetching invitations:", invitationsError);
        setPendingInvitations([]);
      } else {
        console.log("Invitations data:", invitationsData);
        setPendingInvitations(invitationsData || []);
      }
    } catch (error) {
      console.error("Error fetching access data:", error);
      toast({
        title: "Error",
        description: "Failed to load access data",
        variant: "destructive",
      });
    } finally {
      setAccessLoading(false);
    }
  };

  const getAccessLevel = (vessel: VesselData) => {
    // Since vessels are fetched with user_id filter, these are owned vessels
    return { level: "Owner", color: "bg-green-100 text-green-800" };
  };

  const getRoleColor = (role: VesselAccessRole) => {
    switch (role) {
      case "owner":
        return "bg-red-100 text-red-800";
      case "moderator":
        return "bg-orange-100 text-orange-800";
      case "captain":
        return "bg-blue-100 text-blue-800";
      case "crew_member":
        return "bg-green-100 text-green-800";
      case "editor":
        return "bg-purple-100 text-purple-800";
      case "viewer":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Direct account creation functions
  const handleDirectAccountCreation = async () => {
    if (!selectedVessel || !selectedCrew || !role || !email || !password) {
      toast({
        title: "Error",
        description:
          language === "en"
            ? "Please fill in all required fields"
            : "Vui lòng điền đầy đủ thông tin",
        variant: "destructive",
      });
      return;
    }

    setIsGranting(true);
    try {
      // Check if email already exists
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("email", email);

      if (checkError && checkError.code !== "PGRST116") {
        console.error("Error checking existing user:", checkError);
        throw checkError;
      }

      if (existingUser && existingUser.length > 0) {
        throw new Error(
          "Email already exists. Please use a different email address."
        );
      }

      // First, create the user account in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            name: selectedCrew.name,
            account_type: "Fleet Management",
            account_package: "Basic",
          },
        },
      });

      if (authError) {
        console.error("Auth error:", authError);
        throw authError;
      }

      // Check if user was created successfully
      if (!authData.user) {
        throw new Error("Failed to create user account");
      }

      // Insert user data into users table
      const { error: userInsertError } = await supabase.from("users").insert([
        {
          auth_id: authData.user.id,
          email: email,
          name: selectedCrew.name,
          phone: selectedCrew.phone,
          account_type: "Fleet Management",
          account_package: "Basic",
          role: role,
          is_approved: true,
        },
      ]);

      if (userInsertError) {
        console.error("Error inserting user data:", userInsertError);
        throw userInsertError;
      }

      // Create invitation code for vessel access
      const invitationCode = crypto.randomUUID();

      // Note: We're not inserting into vessel_access_invitations due to RLS policy issues
      // The invitation code is still generated for the QR code and email template

      const credentials = {
        email: email,
        password: password,
        invitationCode,
      };

      setGeneratedCredentials(credentials);

      // Generate email template
      const invitationUrl = `${window.location.origin}/vessel-invitation/${invitationCode}`;
      const emailBody = generateDirectAccountEmailTemplate(
        selectedCrew.name,
        selectedVessel.name,
        role,
        email,
        password,
        invitationUrl,
        invitationCode
      );

      setEmailTemplate(emailBody);

      toast({
        title:
          language === "en"
            ? "Account Created Successfully!"
            : "Tài khoản đã được tạo thành công!",
        description:
          language === "en"
            ? "User account created successfully"
            : "Tài khoản người dùng đã được tạo thành công",
        variant: "default",
      });
    } catch (error) {
      console.error("Error creating direct account:", error);
      toast({
        title: "Error",
        description:
          language === "en"
            ? `Failed to create account: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            : `Không thể tạo tài khoản: ${
                error instanceof Error ? error.message : "Lỗi không xác định"
              }`,
        variant: "destructive",
      });
    } finally {
      setIsGranting(false);
    }
  };

  const generateDirectAccountEmailTemplate = (
    crewName: string,
    vesselName: string,
    role: string,
    email: string,
    password: string,
    invitationUrl: string,
    invitationCode: string
  ) => {
    return `Hello ${crewName},

Your vessel access account has been created successfully.

Vessel: ${vesselName}
Role: ${role}
Email: ${email}
Password: ${password}

You can now log in to your account using the email and password above.

For vessel-specific access, you can use the invitation link:
${invitationUrl}

Or use the invitation code: ${invitationCode}

Please change your password after your first login for security.

Best regards,
The iTruckSea Team

---
Xin chào ${crewName},

Tài khoản truy cập tàu của bạn đã được tạo thành công.

Tàu: ${vesselName}
Vai trò: ${role}
Email: ${email}
Mật khẩu: ${password}

Bạn có thể đăng nhập vào tài khoản của mình bằng email và mật khẩu trên.

Để truy cập cụ thể cho tàu, bạn có thể sử dụng liên kết mời:
${invitationUrl}

Hoặc sử dụng mã mời: ${invitationCode}

Vui lòng thay đổi mật khẩu sau lần đăng nhập đầu tiên để bảo mật.

Trân trọng,
Đội ngũ iTruckSea`;
  };

  const copyEmailTemplate = () => {
    if (emailTemplate) {
      navigator.clipboard.writeText(emailTemplate);
      toast({
        title: language === "en" ? "Copied!" : "Đã sao chép!",
        description:
          language === "en"
            ? "Email template copied to clipboard"
            : "Mẫu email đã được sao chép vào clipboard",
        variant: "default",
      });
    }
  };
  const isMobile = useIsMobile();
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader
          title={language === "en" ? "Fleet Management" : "Quản lý đội tàu"}
        />
        <TopButtons />
        <div className="px-3 flex gap-2 md:gap-3 lg:gap-4 overflow-x-auto">
          <Link to="/vessel-management/data" className="flex-shrink-0">
            <button
              className={`
                bg-gradient-to-r from-[#a8a8a8] to-[#fdfdfd] text-black rounded-md px-4 md:px-5
                  h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                  text-xs md:text-base
                w-32 md:w-36 lg:w-40 shadow-lg hover:shadow-xl transition-all duration-300
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
                bg-gradient-to-r from-black to-[#1306ad] text-[#f8f603] rounded-md px-4 md:px-5
                  h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                  text-xs md:text-base
                  w-32 md:w-36 lg:w-40
              `}
            >
              <span className="truncate">
                {language === "en" ? "Fleet Management" : "Quản lý đội tàu"}
              </span>
            </button>
          </Link>
        </div>

        <div className="md:col-span-2  rounded-lg p-6 ">
          <CompanyInfo />
        </div>

        <div className="gap-6 md:p-4">
          <section className="my-5  rounded-lg p-6 border">
            <h2 className="text-xl font-bold mb-4 text-blue-900">
              {language === "en"
                ? "Vessel Access Accounts"
                : "CẤP QUYỀN truy cập CHO TÀU"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vessels.map((vessel, index) => (
                <motion.div
                  key={vessel.id}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="bg-yellow-200 rounded shadow p-4 cursor-pointer hover:ring-2 hover:ring-blue-400 border border-black"
                  onClick={() => openGrantDialog(vessel)}
                >
                  <div className="font-semibold text-lg">{vessel.name}</div>
                  <div className="text-sm text-gray-500">
                    {vessel.registration_number}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {vessel.type}
                  </div>
                </motion.div>
              ))}
            </div>
            <Card className="max-w-95 md:max-w-[600px] mx-auto my-5">
              <CardHeader></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!grantLink && (
                    <>
                      <div>
                        <div className="font-semibold">
                          {t("grantDialog.vessel_id")}
                        </div>
                        <div className="bg-gray-200 rounded px-4 py-2 text-center font-bold text-lg">
                          {selectedVessel?.registration_number || "-"}
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold">
                          {t("grantDialog.role")}
                        </div>
                        <Select value={role} onValueChange={setRole}>
                          <SelectTrigger className="w-full bg-gray-100">
                            <SelectValue
                              placeholder={t(
                                "grantDialog.select_role_placeholder"
                              )}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="captain">
                              {t("grantDialog.role_captain")}
                            </SelectItem>

                            <SelectItem value="crew">
                              {t("grantDialog.role_crew")}
                            </SelectItem>
                            <SelectItem value="owner">
                              {t("grantDialog.role_owner")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <div className="font-semibold">
                          {t("grantDialog.select_crew")}
                        </div>
                        <Select
                          value={selectedCrew?.id || ""}
                          onValueChange={(id) => {
                            const crew =
                              crewList.find((c) => c.id === id) || null;
                            setSelectedCrew(crew);
                          }}
                        >
                          <SelectTrigger className="w-full bg-gray-100">
                            <SelectValue
                              placeholder={t(
                                "grantDialog.select_crew_placeholder"
                              )}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {crewList.map((crew) => (
                              <SelectItem key={crew.id} value={crew.id}>
                                {crew.name} ({crew.position})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>
                          {language === "en" ? "Phone Number" : "Số điện thoại"}
                        </Label>
                        <PhoneInput
                          value={selectedCrew?.phone || ""}
                          readOnly
                          defaultCountry="VN"
                        />
                      </div>

                      <div>
                        <div className="font-semibold">
                          {t("grantDialog.username")}
                        </div>
                        <Input
                          value={selectedCrew?.name || ""}
                          readOnly
                          className="bg-gray-100"
                        />
                      </div>
                      <div>
                        <div className="font-semibold">
                          {t("grantDialog.password")}
                        </div>
                        <Input
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter password"
                          className="bg-gray-100"
                        />
                      </div>

                      <div>
                        <div className="font-semibold">
                          {language === "en" ? "Email" : "Email"}
                        </div>
                        <Input
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="user@example.com"
                          className="bg-gray-100"
                        />
                      </div>

                      <Button
                        className="w-full bg-red-600 text-white mt-4 shadow-lg hover:bg-red-700"
                        onClick={handleDirectAccountCreation}
                        disabled={
                          !isCaptainOrCrew() &&
                          (isGranting ||
                            !selectedCrew ||
                            !role ||
                            !email ||
                            !password)
                        }
                      >
                        {isGranting
                          ? language === "en"
                            ? "Creating Account..."
                            : "Đang tạo tài khoản..."
                          : language === "en"
                          ? "Create Account"
                          : "Tạo tài khoản"}
                      </Button>
                    </>
                  )}
                  {(grantLink || generatedCredentials) && (
                    <div className="mt-4 flex flex-col items-center">
                      {generatedCredentials ? (
                        <>
                          {/* Generated Credentials */}
                          <div className="w-full mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <h3 className="font-semibold text-green-800 mb-2">
                              {language === "en"
                                ? "Generated Account Credentials"
                                : "Thông tin tài khoản đã tạo"}
                            </h3>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="font-medium">Email:</span>
                                <span className="font-mono">
                                  {generatedCredentials.email}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-medium">Password:</span>
                                <span className="font-mono">
                                  {generatedCredentials.password}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-medium">
                                  Invitation Code:
                                </span>
                                <span className="font-mono">
                                  {generatedCredentials.invitationCode}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* QR Code for Direct Account */}
                          <QRCode
                            id="direct-account-qr-svg"
                            value={`${window.location.origin}/vessel-invitation/${generatedCredentials.invitationCode}`}
                            size={180}
                          />

                          {/* Email Template */}
                          {emailTemplate && (
                            <div className="w-full mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-blue-800">
                                  {language === "en"
                                    ? "Email Template"
                                    : "Mẫu email"}
                                </h3>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={copyEmailTemplate}
                                  className="flex items-center gap-1"
                                >
                                  <Mail className="w-4 h-4" />
                                  {language === "en" ? "Copy" : "Sao chép"}
                                </Button>
                              </div>
                              <textarea
                                value={emailTemplate}
                                readOnly
                                className="w-full h-32 p-2 text-xs border rounded bg-white"
                              />
                            </div>
                          )}
                        </>
                      ) : (
                        <QRCode
                          id="grant-qr-svg"
                          value={grantLink}
                          size={180}
                        />
                      )}

                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" onClick={handleDownloadQR}>
                          {language === "en" ? "Download QR" : "Tải QR"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            navigator.share
                              ? navigator.share({
                                  url: generatedCredentials
                                    ? `${window.location.origin}/vessel-invitation/${generatedCredentials.invitationCode}`
                                    : grantLink,
                                })
                              : null
                          }
                        >
                          {language === "en" ? "Share" : "Chia sẻ"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const linkToCopy = generatedCredentials
                              ? `${window.location.origin}/vessel-invitation/${generatedCredentials.invitationCode}`
                              : grantLink;
                            navigator.clipboard.writeText(linkToCopy);
                            toast({
                              title:
                                language === "en"
                                  ? "Copied to clipboard"
                                  : "Đã sao chép vào clipboard",
                              variant: "default",
                            });
                          }}
                        >
                          {language === "en" ? "Copy" : "Sao chép"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Company Details Section for Captain/Crew Users */}
          {isCaptainOrCrew() && companyData && (
            <section className="my-5 rounded-lg p-6 border">
              <h2 className="text-xl font-bold mb-4 text-blue-900 flex items-center gap-2">
                <Ship className="h-6 w-6" />
                {language === "en"
                  ? "Company Information"
                  : "Thông tin công ty"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      {language === "en"
                        ? "Company Details"
                        : "Thông tin công ty"}
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">
                          {language === "en" ? "Company Name:" : "Tên công ty:"}
                        </span>
                        <span>{companyData.company_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">
                          {language === "en" ? "Address:" : "Địa chỉ:"}
                        </span>
                        <span>{companyData.address || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">
                          {language === "en" ? "Tax Code:" : "Mã số thuế:"}
                        </span>
                        <span>{companyData.tax_code || "-"}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      {language === "en"
                        ? "Representative Information"
                        : "Thông tin người đại diện"}
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">
                          {language === "en" ? "Name:" : "Tên:"}
                        </span>
                        <span>{companyData.representative_name || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">
                          {language === "en" ? "Position:" : "Chức vụ:"}
                        </span>
                        <span>
                          {companyData.representative_position || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">
                          {language === "en" ? "Phone:" : "Điện thoại:"}
                        </span>
                        <span>
                          {companyData.rep_phone ||
                            companyData.representative_phone ||
                            "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">
                          {language === "en" ? "Email:" : "Email:"}
                        </span>
                        <span>{companyData.representative_email || "-"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {companyData.fleet && companyData.fleet.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold text-lg mb-2">
                    {language === "en"
                      ? "Fleet Information"
                      : "Thông tin đội tàu"}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {companyData.fleet.map(
                      (
                        fleetType: {
                          type: string;
                          count: number;
                          vessels: string[];
                        },
                        index: number
                      ) => (
                        <div
                          key={index}
                          className="p-4 border rounded-lg bg-gray-50"
                        >
                          <div className="font-medium mb-2">
                            {language === "en" ? "Fleet Type" : "Loại tàu"}{" "}
                            {index + 1}
                          </div>
                          <div className="space-y-1 text-sm">
                            <div>
                              <span className="font-medium">
                                {language === "en" ? "Type:" : "Loại:"}
                              </span>{" "}
                              {fleetType.type || "-"}
                            </div>
                            <div>
                              <span className="font-medium">
                                {language === "en" ? "Count:" : "Số lượng:"}
                              </span>{" "}
                              {fleetType.count}
                            </div>
                            {fleetType.vessels &&
                              fleetType.vessels.length > 0 && (
                                <div>
                                  <span className="font-medium">
                                    {language === "en" ? "Vessels:" : "Tàu:"}
                                  </span>{" "}
                                  {fleetType.vessels.join(", ")}
                                </div>
                              )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Access Control Summary Section */}
          {canManageAccess() && (
            <section className="my-5 rounded-lg p-6 border">
              <h2 className="text-xl font-bold mb-4 text-blue-900 flex items-center gap-2">
                <Shield className="h-6 w-6" />
                {language === "en"
                  ? "Vessel Access Control"
                  : "Kiểm soát truy cập tàu"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vessels.map((vessel, index) => (
                  <motion.div
                    key={vessel.id}
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="bg-white rounded shadow p-4 border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold text-lg">{vessel.name}</div>
                      <Badge className={getAccessLevel(vessel).color}>
                        {getAccessLevel(vessel).level}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 mb-3">
                      {vessel.registration_number}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAccessControlDialog(vessel)}
                        className="flex items-center gap-1"
                      >
                        <Shield className="w-4 h-4" />
                        {language === "en"
                          ? "Manage Access"
                          : "Quản lý truy cập"}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-1">
            <Card className="md:col-span-2 bg-transparent">
              <CompanyInfo />
            </Card>
            <Card className="md:col-span-2 bg-white">
              <FleetBarChart />
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-center text-blue-900">
                {language === "en" ? "Vessels" : "Danh sách tàu"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {/* Skeleton Table Header */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="border-collapse"
                  >
                    <div className="border-b-2 border-black">
                      <div className="grid grid-cols-8 gap-0">
                        {Array.from({ length: 8 }).map((_, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, width: "60%" }}
                            animate={{ opacity: 1, width: "100%" }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            className="border border-black p-3 text-center font-bold bg-gray-200 h-12 animate-pulse"
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>

                  {/* Skeleton Table Rows */}
                  {Array.from({ length: 5 }).map((_, rowIndex) => (
                    <motion.div
                      key={rowIndex}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: rowIndex * 0.1 }}
                      className="border-collapse"
                    >
                      <div className="grid grid-cols-8 gap-0 border-b border-black hover:bg-gray-50">
                        {Array.from({ length: 8 }).map((_, colIndex) => (
                          <motion.div
                            key={colIndex}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              duration: 0.4,
                              delay: rowIndex * 0.1 + colIndex * 0.05,
                            }}
                            className="border border-black p-3 text-center"
                          >
                            <div className="h-4 bg-gray-200 rounded animate-pulse" />
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : vessels.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6 }}
                  className="text-center py-10"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  >
                    <Ship className="mx-auto h-12 w-12 text-muted-foreground" />
                  </motion.div>
                  <motion.h3
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="mt-4 text-lg font-semibold"
                  >
                    {language === "en"
                      ? "No vessels found"
                      : "Không tìm thấy tàu nào"}
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="mt-2 text-sm text-muted-foreground"
                  >
                    {language === "en"
                      ? "Add vessels in the Vessel Data section."
                      : "Thêm tàu trong phần Dữ liệu tàu."}
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                  >
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
                  </motion.div>
                </motion.div>
              ) : (
                <Table className="border-collapse">
                  <TableHeader>
                    <TableRow className="border-b-2 border-black">
                      <TableHead className="border border-black p-3 text-center font-bold">
                        No.
                      </TableHead>
                      <TableHead className="border border-black p-3 text-center font-bold">
                        {language === "en" ? "Name" : "Tên"}
                      </TableHead>
                      <TableHead className="border border-black p-3 text-center font-bold">
                        {language === "en" ? "Type" : "Loại"}
                      </TableHead>
                      <TableHead className="border border-black p-3 text-center font-bold">
                        {language === "en" ? "Captain" : "Thuyền trưởng"}
                      </TableHead>
                      <TableHead className="border border-black p-3 text-center font-bold">
                        {language === "en" ? "Crew" : "Thủy thủ"}
                      </TableHead>
                      <TableHead className="border border-black p-3 text-center font-bold">
                        {language === "en" ? "Status" : "Trạng thái"}
                      </TableHead>
                      <TableHead className="border border-black p-3 text-center font-bold">
                        {language === "en" ? "Grant Links" : "Cấp quyền"}
                      </TableHead>
                      <TableHead className="border border-black p-3 text-center font-bold">
                        {language === "en"
                          ? "Grant Status"
                          : "Trạng thái cấp quyền"}
                      </TableHead>
                      {canManageAccess() && (
                        <TableHead className="border border-black p-3 text-center font-bold">
                          {language === "en"
                            ? "Access Control"
                            : "Kiểm soát truy cập"}
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vessels.map((vessel, index) => (
                      <motion.tr
                        key={vessel.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: index * 0.1 }}
                        className="cursor-pointer hover:bg-gray-100 border-b border-black"
                        onClick={() => {
                          setSelectedGrantLinks(
                            grantLinksByVessel[vessel.id] || []
                          );
                          setSelectedGrantVessel(vessel);
                          setShowGrantLinksDialog(true);
                        }}
                      >
                        <TableCell className="font-medium border border-black p-3 text-center">
                          {vessels.indexOf(vessel) + 1}
                        </TableCell>
                        <TableCell className="font-medium border border-black p-3">
                          {vessel.name}
                        </TableCell>
                        <TableCell className="border border-black p-3">
                          {vessel.type === "mining"
                            ? language === "en"
                              ? "Mining Vessel"
                              : "Tàu khai thác"
                            : language === "en"
                            ? "Logistics Service Ship"
                            : "Tàu dịch vụ hậu cần"}
                        </TableCell>
                        <TableCell className="border border-black p-3">
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
                        <TableCell className="border border-black p-3 text-center">
                          {vessel.crew_count || 0}
                        </TableCell>
                        <TableCell className="border border-black p-3 text-center">
                          {getStatusBadge(vessel.status || "active")}
                        </TableCell>
                        <TableCell className="border border-black p-3 text-center">
                          {grantLinksByVessel[vessel.id]?.length || 0}
                        </TableCell>
                        <TableCell className="border border-black p-3 text-center">
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
                        {canManageAccess() && (
                          <TableCell className="border border-black p-3 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openAccessControlDialog(vessel);
                              }}
                              className="flex items-center gap-1"
                            >
                              <Shield className="w-4 h-4" />
                              {language === "en" ? "Manage" : "Quản lý"}
                            </Button>
                          </TableCell>
                        )}
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="mt-6">
            <div className="text-2xl md:text-4xl font-bold text-center text-[#002e6b] mb-5">
              {language === "en"
                ? "Vessels List by Fishing Region"
                : "Danh Sách Tàu Thuyền Theo Ngư Trường"}
            </div>
            <RegionBasedFleet />
          </div>

          {/* {renderVesselCards()} */}
          <VesselsListWithInfo />

          <div className="flex flex-row gap-2 justify-center my-5">
            <h2 className="text-2lg font-bold text-blue-500">
              FLEET FISHING RECORDS
            </h2>
          </div>
          <IuuSummaryRecords
            isVesselGrouped={true}
            headerClassName="bg-[#00a7d1] text-white"
          />
        </div>
      </SidebarInset>
      <Dialog
        open={showGrantLinksDialog}
        onOpenChange={setShowGrantLinksDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {language === "en"
                ? `Grant Links for ${selectedGrantVessel?.name || ""}`
                : `Các liên kết cấp quyền cho ${
                    selectedGrantVessel?.name || ""
                  }`}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <Table className="border-collapse">
              <TableHeader>
                <TableRow className="border-b-2 border-black">
                  <TableHead className="border border-black p-3 text-center font-bold">
                    {language === "en" ? "Crew" : "Thành viên"}
                  </TableHead>
                  <TableHead className="border border-black p-3 text-center font-bold">
                    {language === "en" ? "Role" : "Vai trò"}
                  </TableHead>
                  <TableHead className="border border-black p-3 text-center font-bold">
                    {language === "en" ? "Status" : "Trạng thái"}
                  </TableHead>
                  <TableHead className="border border-black p-3 text-center font-bold">
                    {language === "en" ? "Created At" : "Tạo lúc"}
                  </TableHead>
                  <TableHead className="border border-black p-3 text-center font-bold">
                    {language === "en" ? "Link" : "Liên kết"}
                  </TableHead>
                  <TableHead className="border border-black p-3 text-center font-bold">
                    {language === "en" ? "Actions" : "Hành động"}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedGrantLinks.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center border border-black p-3"
                    >
                      {language === "en"
                        ? "No grant links"
                        : "Không có liên kết cấp quyền"}
                    </TableCell>
                  </TableRow>
                ) : (
                  selectedGrantLinks.map((link) => {
                    const crew = crewList.find((c) => c.id === link.crew_id);
                    return (
                      <TableRow key={link.id} className="border-b border-black">
                        <TableCell className="border border-black p-3">
                          {crew ? crew.name : link.crew_id}
                        </TableCell>
                        <TableCell className="border border-black p-3">
                          {" "}
                          <select
                            value={link.role}
                            onChange={(e) =>
                              handleUpdateGrantLink(link.id, {
                                role: e.target.value,
                              })
                            }
                            className="border-0 rounded px-2 py-1 mr-2"
                          >
                            <option value="captain">
                              {language === "en" ? "Captain" : "Thuyền trưởng"}
                            </option>
                            <option value="crew">
                              {language === "en" ? "Crew" : "Thủy thủ"}
                            </option>
                            <option value="owner">
                              {language === "en" ? "Owner" : "Chủ tàu"}
                            </option>
                          </select>
                        </TableCell>
                        <TableCell className="border border-black p-3">
                          <select
                            value={link.status}
                            onChange={(e) =>
                              handleUpdateGrantLink(link.id, {
                                status: e.target.value as GrantLink["status"],
                              })
                            }
                            className="border-0 rounded px-2 py-1 mr-2"
                          >
                            <option value="pending">
                              {language === "en" ? "Pending" : "Chờ duyệt"}
                            </option>
                            <option value="accepted">
                              {language === "en" ? "Accepted" : "Đã chấp nhận"}
                            </option>
                            <option value="rejected">
                              {language === "en" ? "Rejected" : "Từ chối"}
                            </option>
                          </select>
                        </TableCell>
                        <TableCell className="border border-black p-3">
                          {new Date(link.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="border border-black p-3">
                          <a
                            href={`${window.location.origin}/grant-login/${link.grant_code}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline"
                          >
                            {language === "en" ? "Open" : "Mở"}
                          </a>
                        </TableCell>
                        <TableCell className="border border-black p-3">
                          <button
                            onClick={() => handleDeleteGrantLink(link.id)}
                            className="text-red-600 hover:underline"
                          >
                            {language === "en" ? "Delete" : "Xóa"}
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Access Control Dialog */}
      <Dialog
        open={accessControlDialogOpen}
        onOpenChange={setAccessControlDialogOpen}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {language === "en"
                ? `Access Control - ${selectedVesselForAccess?.name || ""}`
                : `Kiểm soát truy cập - ${selectedVesselForAccess?.name || ""}`}
            </DialogTitle>
          </DialogHeader>

          {selectedVesselForAccess && canManageAccess() ? (
            <VesselAccessManager
              vesselId={selectedVesselForAccess.id}
              vesselName={selectedVesselForAccess.name}
              userPermissions={vesselAccess.accessData?.permissions || []}
            />
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {language === "en"
                  ? "You don't have permission to manage access for this vessel. Only vessel owners and moderators can manage access permissions."
                  : "Bạn không có quyền quản lý truy cập cho tàu này. Chỉ chủ tàu và người điều hành mới có thể quản lý quyền truy cập."}
              </AlertDescription>
            </Alert>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default FleetManagement;
