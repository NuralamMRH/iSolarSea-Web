export type UserRole =
  | "super_admin"
  | "admin"
  | "manager"
  | "VVIP"
  | "VIP"
  | "VP";

export interface User {
  id: string;
  auth_id: string;
  email: string;
  name: string;
  role: UserRole;
  is_approved: boolean;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRegistrationData {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  phone?: string;
}

export interface UserUpdateData {
  name?: string;
  role?: UserRole;
  is_approved?: boolean;
  is_email_verified?: boolean;
  is_phone_verified?: boolean;
  phone?: string;
}

export const ROLE_PERMISSIONS = {
  super_admin: {
    can_manage_users: true,
    can_manage_roles: true,
    can_approve_users: true,
    can_manage_settings: true,
    can_manage_data: true,
    can_delete_data: true,
    can_unpublish_data: true,
    can_reject_data: true,
    can_request_update: true,
  },
  admin: {
    can_manage_users: true,
    can_manage_roles: false,
    can_approve_users: true,
    can_manage_settings: false,
    can_manage_data: true,
    can_delete_data: true,
    can_unpublish_data: true,
    can_reject_data: true,
    can_request_update: true,
  },
  manager: {
    can_manage_users: false,
    can_manage_roles: false,
    can_approve_users: false,
    can_manage_settings: false,
    can_manage_data: true,
    can_delete_data: false,
    can_unpublish_data: true,
    can_reject_data: true,
    can_request_update: true,
  },
  VVIP: {
    can_manage_users: false,
    can_manage_roles: false,
    can_approve_users: false,
    can_manage_settings: false,
    can_manage_data: true,
    can_delete_data: false,
    can_unpublish_data: false,
    can_reject_data: false,
    can_request_update: true,
  },
  VIP: {
    can_manage_users: false,
    can_manage_roles: false,
    can_approve_users: false,
    can_manage_settings: false,
    can_manage_data: true,
    can_delete_data: false,
    can_unpublish_data: false,
    can_reject_data: false,
    can_request_update: true,
  },
  VP: {
    can_manage_users: false,
    can_manage_roles: false,
    can_approve_users: false,
    can_manage_settings: false,
    can_manage_data: true,
    can_delete_data: false,
    can_unpublish_data: false,
    can_reject_data: false,
    can_request_update: true,
  },
} as const;

export type Permission = keyof (typeof ROLE_PERMISSIONS)[UserRole];

export function hasPermission(
  user: User | null,
  permission: Permission
): boolean {
  if (!user) return false;
  return ROLE_PERMISSIONS[user.role][permission] || false;
}
