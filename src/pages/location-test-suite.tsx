import React from 'react';
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import TopButtons from "@/components/top-buttons";
import LocationTestSuite from "@/components/LocationTestSuite";

export default function LocationTestSuitePage() {
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Location Service Test Suite" />
        <TopButtons />
        <div className="p-4">
          <LocationTestSuite />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}