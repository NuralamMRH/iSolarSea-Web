import { AppSidebar } from "@/components/app-sidebar";
import CompanyForm from "@/components/dashboard/CompanyForm";
import { PageLayout } from "@/components/layout/PageLayout";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAuthStore } from "@/stores/auth-store";
import React from "react";

export default function Company() {
  const { user, isAuthenticated } = useAuthStore();

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title={"Company Information"} />
        <div className="p-4">
          <CompanyForm />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
