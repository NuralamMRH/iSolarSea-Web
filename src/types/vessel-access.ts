export type VesselAccessPermission =
  | "view_basic_info"
  | "view_detailed_info"
  | "view_catch_records"
  | "view_trips"
  | "view_crew"
  | "view_locations"
  | "edit_basic_info"
  | "edit_detailed_info"
  | "edit_catch_records"
  | "edit_trips"
  | "edit_crew"
  | "edit_locations"
  | "manage_access"
  | "delete_vessel"
  | "full_access";

export type VesselAccessRole =
  | "owner"
  | "moderator"
  | "captain"
  | "crew_member"
  | "viewer"
  | "editor"
  | "delegate";

export interface VesselAccessControl {
  id: string;
  vessel_id: string;
  user_id: string;
  granted_by: string;
  role: VesselAccessRole;
  permissions: VesselAccessPermission[];
  is_active: boolean;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface VesselAccessInvitation {
  id: string;
  vessel_id: string;
  email: string;
  role: VesselAccessRole;
  permissions: VesselAccessPermission[];
  invited_by: string;
  invitation_code: string;
  expires_at: string;
  is_accepted: boolean;
  accepted_at?: string;
  created_at: string;
}

export interface VesselAccessUser {
  id: string;
  email: string;
  name: string;
  role: VesselAccessRole;
  permissions: VesselAccessPermission[];
  is_active: boolean;
  expires_at?: string;
  granted_by: string;
  granted_by_name: string;
  created_at: string;
}

export interface VesselAccessSummary {
  vessel_id: string;
  vessel_name: string;
  total_users: number;
  active_users: number;
  pending_invitations: number;
  owner_id: string;
  owner_name: string;
}

// Permission presets for different roles
export const ROLE_PERMISSIONS: Record<
  VesselAccessRole,
  VesselAccessPermission[]
> = {
  owner: ["full_access"],
  moderator: [
    "view_basic_info",
    "view_detailed_info",
    "view_catch_records",
    "view_trips",
    "view_crew",
    "view_locations",
    "edit_basic_info",
    "edit_detailed_info",
    "edit_catch_records",
    "edit_trips",
    "edit_crew",
    "edit_locations",
    "manage_access",
  ],
  captain: [
    "view_basic_info",
    "view_detailed_info",
    "view_catch_records",
    "view_trips",
    "view_crew",
    "view_locations",
    "edit_catch_records",
    "edit_trips",
    "edit_crew",
    "edit_locations",
  ],
  crew_member: [
    "view_basic_info",
    "view_catch_records",
    "view_trips",
    "view_crew",
    "view_locations",
    "edit_catch_records",
  ],
  viewer: [
    "view_basic_info",
    "view_catch_records",
    "view_trips",
    "view_crew",
    "view_locations",
  ],
  editor: [
    "view_basic_info",
    "view_detailed_info",
    "view_catch_records",
    "view_trips",
    "view_crew",
    "view_locations",
    "edit_basic_info",
    "edit_catch_records",
    "edit_trips",
    "edit_crew",
    "edit_locations",
  ],
  delegate: ["view_basic_info", "view_catch_records", "view_trips"],
};

// Helper function to check if user has permission
export function hasVesselPermission(
  userPermissions: VesselAccessPermission[],
  requiredPermission: VesselAccessPermission
): boolean {
  return (
    userPermissions.includes(requiredPermission) ||
    userPermissions.includes("full_access")
  );
}

// Helper function to get role permissions
export function getRolePermissions(
  role: VesselAccessRole
): VesselAccessPermission[] {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.delegate;
}

// Helper function to check if user can manage access
export function canManageAccess(
  userPermissions: VesselAccessPermission[]
): boolean {
  return (
    hasVesselPermission(userPermissions, "manage_access") ||
    hasVesselPermission(userPermissions, "full_access")
  );
}

// Helper function to check if user can edit vessel
export function canEditVessel(
  userPermissions: VesselAccessPermission[]
): boolean {
  return (
    hasVesselPermission(userPermissions, "edit_basic_info") ||
    hasVesselPermission(userPermissions, "full_access")
  );
}

// Helper function to check if user can view detailed info
export function canViewDetailedInfo(
  userPermissions: VesselAccessPermission[]
): boolean {
  return (
    hasVesselPermission(userPermissions, "view_detailed_info") ||
    hasVesselPermission(userPermissions, "full_access")
  );
}
