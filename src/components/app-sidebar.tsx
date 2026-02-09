"use client";

import * as React from "react";
import {
  ArrowUpCircleIcon,
  BarChartIcon,
  CameraIcon,
  ClipboardListIcon,
  DatabaseIcon,
  FileCodeIcon,
  FileIcon,
  FileTextIcon,
  FolderIcon,
  HelpCircleIcon,
  LayoutDashboardIcon,
  ListIcon,
  SearchIcon,
  SettingsIcon,
  UsersIcon,
  Home,
  Ship,
  Anchor,
  Map,
  Database,
  Truck,
  Factory,
  PieChart,
  Settings,
  User,
  BaggageClaim,
  Bell,
  Lock,
  Globe,
  Cross,
  X,
} from "lucide-react";

import { NavDocuments } from "@/components/nav-documents";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "react-router-dom";
import { useLanguageStore } from "@/stores/language-store";
import { useAuth } from "@/contexts/AuthContext";
import { LanguageToggle } from "./ui/language-toggle";
import { Button } from "./ui/button";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();
  const { language } = useLanguageStore();
  const { user } = useAuth();
  const { isMobile, setOpen, setOpenMobile } = useSidebar();


  const data = {
    user: {
      id: user?.id || "",
      name: user?.name || "",
      email: user?.email || "",
      avatar: "", // Remove reference to image_url since it doesn't exist in User interface
    },
    navMain: [
      {
        title: language === "en" ? "Vessel Management" : "Quản lý tàu",
        url: "/vessel-management",
        icon: Ship,
        items: [
          {
            title: language === "en" ? "Vessel data" : "Dữ liệu tàu",
            url: "/vessel-management/data",
          },
          {
            title: language === "en" ? "Fleet management" : "Quản lý đội tàu",
            url: "/vessel-management/fleet",
          },
        ],
      },
      {
        title: language === "en" ? "Request to Dock" : "Yêu Cầu Cập Cảng",
        url: "/request-to-dock",
        icon: Anchor,
        items: [
          {
            title: language === "en" ? "Port info" : "Thông tin cảng",
            url: "/request-to-dock/port-info",
          },
          {
            title:
              language === "en"
                ? "R4D - Request for Departure"
                : "R4D - Yêu cầu khởi hành",
            url: "/request-to-dock/departure",
          },
          {
            title:
              language === "en"
                ? "R2D - Request to Dock"
                : "R2D - Yêu cầu cập cảng",
            url: "/request-to-dock/dock",
          },
        ],
      },
      {
        title: language === "en" ? "Fishing Log" : "Nhật Ký Khai Thác",
        url: "/fishing-log",
        icon: Map,
        items: [
          {
            title: language === "en" ? "Batch log" : "Nhật ký mẻ",
            url: "/fishing-log/batch",
          },
          {
            title: language === "en" ? "Declaration log" : "Nhật ký khai báo",
            url: "/fishing-log/declaration",
          },
        ],
      },
      {
        title:
          language === "en" ? "Floating Market - Auction" : "Chợ Nổi - Auction",
        url: "/auction-market",
        icon: Database,
        items: [
          {
            title: language === "en" ? "Auction" : "Đấu Giá",
            url: "/auction-market/auction",
          },
          {
            title:
              language === "en"
                ? "Marketing / For Sale"
                : "Tiếp Thị / Cần Thu Mua",
            url: "/auction-market/marketing",
          },
        ],
      },
      {
        title: language === "en" ? "Transportation" : "Chánh Vận Chuyển",
        url: "/transportation",
        icon: Truck,
        items: [
          {
            title: language === "en" ? "4Share Loading" : "Nhận tải",
            url: "/transportation/4share-loading",
          },
          {
            title: language === "en" ? "2Share Loading" : "Chuyển tải",
            url: "/transportation/2share-loading",
          },
        ],
      },
      {
        title: language === "en" ? "Processing Plant" : "Nhà Máy Chế Biến",
        url: "/processing-plant",
        icon: Factory,
        items: [
          {
            title: language === "en" ? "Company Profile" : "Thông Tin Công Ty",
            url: "/processing-plant/company-profile",
            items: [
              {
                title: language === "en" ? "Species List" : "Danh mục loài",
                url: "/processing-plant/species-list",
              },
              {
                title: language === "en" ? "Ship list" : "Danh sách tàu",
                url: "/processing-plant/ship-list",
              },
            ],
          },

          {
            title: language === "en" ? "IUU" : "IUU",
            url: "/processing-plant/iuu",
          },
          {
            title: language === "en" ? "Order" : "Đơn Hàng",
            url: "/processing-plant/order",
          },
          {
            title: language === "en" ? "Transaction" : "Giao Dịch",
            url: "/processing-plant/transaction",
          },
        ],
      },

      {
        title: language === "en" ? "Settings" : "Cài đặt",
        url: "/settings",
        icon: Settings,
        items: [
          {
            title: language === "en" ? "Account" : "Account",
            icon: User,
            url: "/settings/account",
          },
          {
            title: language === "en" ? "Company" : "Company",
            icon: BaggageClaim,
            url: "/settings/company",
          },
          {
            title: language === "en" ? "Notifications" : "Notifications",
            icon: Bell,
            url: "/settings/notifications",
          },
          {
            title: language === "en" ? "Security" : "Security",
            icon: Lock,
            url: "/settings/security",
          },
        ],
      },
    ],
    navClouds: [
      {
        title: "Capture",
        icon: CameraIcon,
        isActive: true,
        url: "#",
        items: [
          {
            title: "Active Proposals",
            url: "#",
          },
          {
            title: "Archived",
            url: "#",
          },
        ],
      },
      {
        title: "Proposal",
        icon: FileTextIcon,
        url: "#",
        items: [
          {
            title: "Active Proposals",
            url: "#",
          },
          {
            title: "Archived",
            url: "#",
          },
        ],
      },
      {
        title: "Prompts",
        icon: FileCodeIcon,
        url: "#",
        items: [
          {
            title: "Active Proposals",
            url: "#",
          },
          {
            title: "Archived",
            url: "#",
          },
        ],
      },
    ],
    navSecondary: [
      {
        title: "Settings",
        url: "/dashboard/settings",
        icon: SettingsIcon,
      },
      {
        title: "Get Help",
        url: "#",
        icon: HelpCircleIcon,
      },
      {
        title: "Search",
        url: "#",
        icon: SearchIcon,
      },
    ],
    documents: [
      {
        name: "Data Library",
        url: "#",
        icon: DatabaseIcon,
      },
      {
        name: "Reports",
        url: "#",
        icon: ClipboardListIcon,
      },
    ],
  };
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link to="/">
                <img
                  src="/images/common_img/logo_blue.svg"
                  alt="iTruckSea"
                  className="w-[120px] h-auto"
                />
              </Link>
            </SidebarMenuButton>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-0 top-0"
              onClick={() => {
                if (isMobile) {
                  setOpenMobile(false);
                } else {
                  setOpen(false);
                }
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <div className="ml-4">
        <LanguageToggle />
      </div>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
