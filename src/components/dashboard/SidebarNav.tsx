import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Ship,
  Anchor,
  Map,
  Database,
  Truck,
  Factory,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTranslation } from "@/hooks/use-translation";

type NavItem = {
  title: string;
  href: string;
  icon: React.ReactNode;
  active?: boolean;
};

export function SidebarNav() {
  const location = useLocation();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const navItems: NavItem[] = [
    {
      title: "Vessel Management",
      href: "/vessel-management",
      icon: <Ship className="h-5 w-5" />,
      active: location.pathname === "/vessel-management",
    },
    {
      title: "Request to Dock",
      href: "/request-to-dock",
      icon: <Anchor className="h-5 w-5" />,
      active: location.pathname === "/request-to-dock",
    },
    {
      title: "Nhật Ký Khai Thác",
      href: "/fishing-log",
      icon: <Map className="h-5 w-5" />,
      active: location.pathname === "/fishing-log",
    },
    {
      title: "Chợ Nổi Auction Market",
      href: "/auction-market",
      icon: <Database className="h-5 w-5" />,
      active: location.pathname === "/auction-market",
    },
    {
      title: "Chành Vận Chuyển",
      href: "/transportation",
      icon: <Truck className="h-5 w-5" />,
      active: location.pathname === "/transportation",
    },
    {
      title: "Nhà Máy Chế Biến",
      href: "/processing-plant",
      icon: <Factory className="h-5 w-5" />,
      active: location.pathname === "/processing-plant",
    },
  ];

  // Mobile sidebar
  const MobileSidebar = () => (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[250px] p-0 bg-blue-950">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-blue-900">
            <Link to="/dashboard" className="flex items-center">
              <img
                src="https://itrucksea.com/assets/images/common_img/logo_blue.svg"
                alt="iTruckSea"
                className="h-8 w-auto"
              />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5 text-white" />
            </Button>
          </div>
          <div className="flex-1 py-4 overflow-auto">
            <nav className="px-2 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center px-3 py-2   font-medium rounded-md transition-colors",
                    item.active
                      ? "bg-blue-800 text-white"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  {item.icon}
                  <span className="ml-3">{item.title}</span>
                </Link>
              ))}
            </nav>
          </div>
          <div className="p-4 border-t border-blue-900">
            <p className="  text-blue-200">iTruckSEA © 2025</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  // Desktop sidebar
  const DesktopSidebar = () => (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex flex-col flex-grow bg-blue-950 overflow-y-auto">
        <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-blue-900">
          <Link to="/dashboard" className="flex items-center">
            <img
              src="https://itrucksea.com/assets/images/common_img/logo_blue.svg"
              alt="iTruckSea"
              className="h-8 w-auto"
            />
          </Link>
        </div>
        <div className="mt-5 flex-1 flex flex-col">
          <nav className="flex-1 px-2 pb-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "group flex items-center px-2 py-2   font-medium rounded-md transition-colors",
                  item.active
                    ? "bg-blue-800 text-white"
                    : "text-blue-100 hover:bg-blue-800 hover:text-white"
                )}
              >
                {item.icon}
                <span className="ml-3">{item.title}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <MobileSidebar />
      <DesktopSidebar />
    </>
  );
}
