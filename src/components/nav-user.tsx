"use client";

import {
  BellIcon,
  CreditCardIcon,
  LogOutIcon,
  MoreVerticalIcon,
  UserCircleIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/stores/auth-store";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function NavUser({
  isDisabledMenu = false,
}: {
  isDisabledMenu?: boolean;
}) {
  const { isMobile } = useSidebar();
  const { user } = useAuth();
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={isDisabledMenu}>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar
                className={`h-8 w-8 grayscale ${
                  isDisabledMenu ? "rounded-full" : "rounded-lg"
                }`}
              >
                <AvatarImage src="" alt={user?.name || ""} />
                <AvatarFallback className="rounded-lg">iT</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  User ID:{" "}
                  {user?.name
                    ? user?.name.toLowerCase().replace(/\s+/g, "")
                    : "N/A"}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  Account ID:{" "}
                  {user?.phone
                    ? user?.phone.replace("+", "")
                    : user?.email
                    ? user?.email.replace("@", "").replace(".", "")
                    : "N/A"}
                </span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
        </DropdownMenu>
        {!isDisabledMenu && (
          <SidebarMenuAction
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="bg-white text-blue-800 hover:bg-gray-100"
          >
            <LogOutIcon className="h-4 w-4" />
            <span className="sr-only">Log out</span>
          </SidebarMenuAction>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
