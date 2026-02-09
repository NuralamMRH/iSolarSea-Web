import { useState, useEffect } from "react";
import { useAuthStore } from "../stores/auth-store";
import { supabase } from "../integrations/supabase/client";
import {
  VesselAccessPermission,
  VesselAccessRole,
} from "../types/vessel-access";

interface VesselAccessData {
  role: VesselAccessRole;
  permissions: VesselAccessPermission[];
  is_active: boolean;
  expires_at?: string;
}

export function useVesselAccess(vesselId: string) {
  const { user } = useAuthStore();
  const [accessData, setAccessData] = useState<VesselAccessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!user || !vesselId) {
      setLoading(false);
      return;
    }

    fetchVesselAccess();
  }, [user, vesselId]);

  const fetchVesselAccess = async () => {
    try {
      setLoading(true);

      // First check if user is the vessel owner
      const { data: vesselData, error: vesselError } = await supabase
        .from("vessels")
        .select("user_id")
        .eq("id", vesselId)
        .single();

      if (vesselError) throw vesselError;

      if (vesselData?.user_id === user?.auth_id) {
        setIsOwner(true);
        setAccessData({
          role: "owner",
          permissions: ["full_access"],
          is_active: true,
        });
        setLoading(false);
        return;
      }

      // If not owner, check for delegated access
      const { data: accessData, error: accessError } = await supabase
        .from("vessel_access_control")
        .select("role, permissions, is_active, expires_at")
        .eq("vessel_id", vesselId)
        .eq("user_id", user?.auth_id)
        .eq("is_active", true)
        .single();

      if (accessError && accessError.code !== "PGRST116") {
        throw accessError;
      }

      if (accessData) {
        // Check if access has expired
        if (
          accessData.expires_at &&
          new Date(accessData.expires_at) < new Date()
        ) {
          setAccessData(null);
        } else {
          setAccessData(accessData);
        }
      } else {
        setAccessData(null);
      }
    } catch (error) {
      console.error("Error fetching vessel access:", error);
      setAccessData(null);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: VesselAccessPermission): boolean => {
    if (!accessData) return false;
    return (
      accessData.permissions.includes(permission) ||
      accessData.permissions.includes("full_access")
    );
  };

  const canViewBasicInfo = (): boolean => {
    return isOwner || hasPermission("view_basic_info");
  };

  const canViewDetailedInfo = (): boolean => {
    return isOwner || hasPermission("view_detailed_info");
  };

  const canViewCatchRecords = (): boolean => {
    return isOwner || hasPermission("view_catch_records");
  };

  const canViewTrips = (): boolean => {
    return isOwner || hasPermission("view_trips");
  };

  const canViewCrew = (): boolean => {
    return isOwner || hasPermission("view_crew");
  };

  const canViewLocations = (): boolean => {
    return isOwner || hasPermission("view_locations");
  };

  const canEditBasicInfo = (): boolean => {
    return isOwner || hasPermission("edit_basic_info");
  };

  const canEditCatchRecords = (): boolean => {
    return isOwner || hasPermission("edit_catch_records");
  };

  const canEditTrips = (): boolean => {
    return isOwner || hasPermission("edit_trips");
  };

  const canEditCrew = (): boolean => {
    return isOwner || hasPermission("edit_crew");
  };

  const canManageAccess = (): boolean => {
    return isOwner || hasPermission("manage_access");
  };

  const canDeleteVessel = (): boolean => {
    return isOwner || hasPermission("delete_vessel");
  };

  return {
    loading,
    isOwner,
    accessData,
    hasPermission,
    canViewBasicInfo,
    canViewDetailedInfo,
    canViewCatchRecords,
    canViewTrips,
    canViewCrew,
    canViewLocations,
    canEditBasicInfo,
    canEditCatchRecords,
    canEditTrips,
    canEditCrew,
    canManageAccess,
    canDeleteVessel,
    refetch: fetchVesselAccess,
  };
}
