import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { ThemeColorProvider } from "@/contexts/ThemeColorContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
  AuthProvider,
  RequireAuth,
  RequireAdmin,
} from "./contexts/AuthContext";
import CountryRouter from "./components/country-router";
import {
  setupDatabase,
  createExecuteSqlFunction,
} from "@/integrations/supabase/dbSetup";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import FloatingMarket from "./pages/FloatingMarket";
import MarketingProcurement from "./pages/MarketingProcurement";
import ShippingHandler from "./pages/ShippingHandler";
import ShippingNeeds from "./pages/ShippingNeeds";

import Dashboard from "./pages/dashboard/Index";
import Settings from "./pages/dashboard/Settings";
import Security from "./pages/dashboard/Security";
import Notifications from "./pages/dashboard/Notifications";
import NotificationList from "./pages/dashboard/NotificationList";
import VesselData from "./pages/vessel-management/data";
import MobileScan from "./pages/mobile-scan";
import Thumua from "./pages/Thumua";
import Chanhvantai from "./pages/Chanhvantai";
import Chuyentai from "./pages/Chuyentai";
import Company from "./pages/dashboard/Company";
import VesselInfoPage from "./pages/vessel/[id]";
import VesselDetailsPage from "./pages/dashboard/vesse-details/[id]";
import RequestToDock from "./pages/request-to-dock";
import Departure from "./pages/request-to-dock/departure";
import PortInfo from "./pages/request-to-dock/port-info";
import Dock from "./pages/request-to-dock/dock";
import FishingLog from "./pages/fishing-log";
import FishingLogBatch from "./pages/fishing-log/batch";
import FishingLogDeclaration from "./pages/fishing-log/declaration";
import AuctionMarket from "./pages/auction-market";
import AuctionMarketAuction from "./pages/auction-market/auction";
import AuctionMarketMarketing from "./pages/auction-market/marketing";
import Transportation from "./pages/transportation";
import ProcessingPlant from "./pages/processing-plant";
import ProcessingPlantInfo from "./pages/processing-plant/info";
import ProcessingPlantIuu from "./pages/processing-plant/iuu";
import ProcessingPlantOrder from "./pages/processing-plant/order";
import ProcessingPlantTransaction from "./pages/processing-plant/transaction";
import VesselManagement from "./pages/vessel-management";
import FleetManagement from "./pages/vessel-management/fleet";
import GrantLoginPage from "./pages/grant-login/[grant_code]";
import ShareLoading from "./pages/transportation/4share-loading";
import TwoShareLoading from "./pages/transportation/2share-loading";
import ProcessingPlantCompanyProfile from "./pages/processing-plant/company-profile";
import ProcessingPlantSpeciesList from "./pages/processing-plant/species-list";
import ProcessingPlantShipList from "./pages/processing-plant/ship-list";
import ResultPhoto from "./pages/result-photo";
import ForgetPassword from "./pages/ForgetPassword";
import AccessManager from "./pages/dashboard/access-manager";
import VesselInvitationPage from "./pages/vessel-invitation/[invitation_code]";
import QRScannerPage from "./pages/qr-scanner";

const queryClient = new QueryClient();

// Only in development or when needed
if (process.env.NODE_ENV === "development") {
  // First create the SQL execution function if needed
  createExecuteSqlFunction().then(() => {
    // Then setup/update the database
    // setupDatabase();
  });
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <ThemeColorProvider>
            <AuthProvider>
              <CountryRouter>
                <Toaster />
                <Sonner />
                <Routes>
                  {/* Root redirect to default country */}
                  <Route path="/" element={<Navigate to="/vietnam" replace />} />
                  
                  {/* Country-based routes */}
                  <Route path="/:country" element={<Index />} />
                  <Route path="/:country/login" element={<Login />} />
                  <Route path="/:country/register" element={<Register />} />
                  <Route path="/:country/forget-password" element={<ForgetPassword />} />
                  <Route path="/:country/dangnhap" element={<Login />} />
                  <Route path="/:country/dangky" element={<Register />} />
                  
                  {/* Legacy routes without country (will be redirected) */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forget-password" element={<ForgetPassword />} />
                  <Route path="/dangnhap" element={<Login />} />
                  <Route path="/dangky" element={<Register />} />

                {/* Public Routes - Country-based */}
                 <Route path="/:country/chonoi" element={<FloatingMarket />} />
                 <Route path="/:country/marketing-procurement" element={<MarketingProcurement />} />
                 <Route path="/:country/shipping-handler" element={<ShippingHandler />} />
                 <Route path="/:country/shipping-needs" element={<ShippingNeeds />} />
                 <Route path="/:country/thumua" element={<Thumua />} />
                 <Route path="/:country/chanhvantai" element={<Chanhvantai />} />
                 <Route path="/:country/chuyentai" element={<Chuyentai />} />
                 
                 {/* Legacy public routes (will be redirected) */}
                 <Route path="/chonoi" element={<FloatingMarket />} />
                 <Route path="/marketing-procurement" element={<MarketingProcurement />} />
                 <Route path="/shipping-handler" element={<ShippingHandler />} />
                 <Route path="/shipping-needs" element={<ShippingNeeds />} />
                 <Route path="/thumua" element={<Thumua />} />
                 <Route path="/chanhvantai" element={<Chanhvantai />} />
                 <Route path="/chuyentai" element={<Chuyentai />} />
                {/* Protected Dashboard Routes - Country-based */}
                <Route
                  path="/:country/dashboard"
                  element={
                    <RequireAuth>
                      <Dashboard />
                    </RequireAuth>
                  }
                />
                
                {/* Legacy dashboard route (will be redirected) */}
                <Route
                  path="/dashboard"
                  element={
                    <RequireAuth>
                      <Dashboard />
                    </RequireAuth>
                  }
                />

                {/* Request to Dock - Country-based */}
                <Route
                  path="/:country/request-to-dock"
                  element={
                    <RequireAuth>
                      <RequestToDock />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/:country/request-to-dock/departure"
                  element={
                    <RequireAuth>
                      <Departure />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/:country/request-to-dock/port-info"
                  element={
                    <RequireAuth>
                      <PortInfo />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/:country/request-to-dock/dock"
                  element={
                    <RequireAuth>
                      <Dock />
                    </RequireAuth>
                  }
                />
                
                {/* Legacy request-to-dock routes (will be redirected) */}
                <Route
                  path="/request-to-dock"
                  element={
                    <RequireAuth>
                      <RequestToDock />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/request-to-dock/departure"
                  element={
                    <RequireAuth>
                      <Departure />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/request-to-dock/port-info"
                  element={
                    <RequireAuth>
                      <PortInfo />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/request-to-dock/dock"
                  element={
                    <RequireAuth>
                      <Dock />
                    </RequireAuth>
                  }
                />
                {/* Fishing Log - Country-based */}
                <Route
                  path="/:country/fishing-log"
                  element={
                    <RequireAuth>
                      <FishingLog />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/:country/fishing-log/batch"
                  element={
                    <RequireAuth>
                      <FishingLogBatch />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/:country/fishing-log/declaration"
                  element={
                    <RequireAuth>
                      <FishingLogDeclaration />
                    </RequireAuth>
                  }
                />
                
                {/* Legacy fishing-log routes (will be redirected) */}
                <Route
                  path="/fishing-log"
                  element={
                    <RequireAuth>
                      <FishingLog />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/fishing-log/batch"
                  element={
                    <RequireAuth>
                      <FishingLogBatch />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/fishing-log/declaration"
                  element={
                    <RequireAuth>
                      <FishingLogDeclaration />
                    </RequireAuth>
                  }
                />
                
                {/* Auction Market - Country-based */}
                <Route
                  path="/:country/auction-market"
                  element={
                    <RequireAuth>
                      <AuctionMarket />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/:country/auction-market/auction"
                  element={
                    <RequireAuth>
                      <AuctionMarketAuction />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/:country/auction-market/marketing"
                  element={
                    <RequireAuth>
                      <AuctionMarketMarketing />
                    </RequireAuth>
                  }
                />
                
                {/* Legacy auction-market routes (will be redirected) */}
                <Route
                  path="/auction-market"
                  element={
                    <RequireAuth>
                      <AuctionMarket />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/auction-market/auction"
                  element={
                    <RequireAuth>
                      <AuctionMarketAuction />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/auction-market/marketing"
                  element={
                    <RequireAuth>
                      <AuctionMarketMarketing />
                    </RequireAuth>
                  }
                />
                {/* Transportation */}
                {/* Transportation Routes - Country-based */}
                 <Route
                   path="/:country/transportation"
                   element={
                     <RequireAuth>
                       <Transportation />
                     </RequireAuth>
                   }
                 />
                 <Route
                   path="/:country/transportation/4share-loading"
                   element={
                     <RequireAuth>
                       <ShareLoading />
                     </RequireAuth>
                   }
                 />
                 <Route
                   path="/:country/transportation/2share-loading"
                   element={
                     <RequireAuth>
                       <TwoShareLoading />
                     </RequireAuth>
                   }
                 />
                 
                 {/* Legacy transportation routes (will be redirected) */}
                 <Route
                   path="/transportation"
                   element={
                     <RequireAuth>
                       <Transportation />
                     </RequireAuth>
                   }
                 />
                 <Route
                   path="/transportation/4share-loading"
                   element={
                     <RequireAuth>
                       <ShareLoading />
                     </RequireAuth>
                   }
                 />
                 <Route
                   path="/transportation/2share-loading"
                   element={
                     <RequireAuth>
                       <TwoShareLoading />
                     </RequireAuth>
                   }
                 />
                {/* Processing Plant - Country-based */}
                <Route
                  path="/:country/processing-plant"
                  element={
                    <RequireAuth>
                      <ProcessingPlant />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/:country/processing-plant/company-profile"
                  element={
                    <RequireAuth>
                      <ProcessingPlantCompanyProfile />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/:country/processing-plant/species-list"
                  element={
                    <RequireAuth>
                      <ProcessingPlantSpeciesList />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/:country/processing-plant/ship-list"
                  element={
                    <RequireAuth>
                      <ProcessingPlantShipList />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/:country/processing-plant/info"
                  element={
                    <RequireAuth>
                      <ProcessingPlantInfo />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/:country/processing-plant/iuu"
                  element={
                    <RequireAuth>
                      <ProcessingPlantIuu />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/:country/processing-plant/order"
                  element={
                    <RequireAuth>
                      <ProcessingPlantOrder />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/:country/processing-plant/transaction"
                  element={
                    <RequireAuth>
                      <ProcessingPlantTransaction />
                    </RequireAuth>
                  }
                />
                
                {/* Legacy processing-plant routes (will be redirected) */}
                <Route
                  path="/processing-plant"
                  element={
                    <RequireAuth>
                      <ProcessingPlant />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/processing-plant/company-profile"
                  element={
                    <RequireAuth>
                      <ProcessingPlantCompanyProfile />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/processing-plant/species-list"
                  element={
                    <RequireAuth>
                      <ProcessingPlantSpeciesList />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/processing-plant/ship-list"
                  element={
                    <RequireAuth>
                      <ProcessingPlantShipList />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/processing-plant/info"
                  element={
                    <RequireAuth>
                      <ProcessingPlantInfo />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/processing-plant/iuu"
                  element={
                    <RequireAuth>
                      <ProcessingPlantIuu />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/processing-plant/order"
                  element={
                    <RequireAuth>
                      <ProcessingPlantOrder />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/processing-plant/transaction"
                  element={
                    <RequireAuth>
                      <ProcessingPlantTransaction />
                    </RequireAuth>
                  }
                />
                {/* Vessel Management - Country-based */}
                <Route
                  path="/:country/vessel-management"
                  element={
                    <RequireAuth>
                      <VesselManagement />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/:country/vessel-management/data"
                  element={
                    <RequireAuth>
                      <VesselData />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/:country/vessel-management/fleet"
                  element={
                    <RequireAuth>
                      <FleetManagement />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/:country/vessel/:id"
                  element={
                    <RequireAuth>
                      <VesselInfoPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/:country/dashboard/vessel-details/:id"
                  element={
                    <RequireAuth>
                      <VesselDetailsPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/:country/dashboard/access-manager"
                  element={
                    <RequireAuth>
                      <AccessManager />
                    </RequireAuth>
                  }
                />
                
                {/* Legacy vessel-management routes (will be redirected) */}
                <Route
                  path="/vessel-management/fleet"
                  element={
                    <RequireAuth>
                      <FleetManagement />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/vessel-management"
                  element={
                    <RequireAuth>
                      <VesselManagement />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/vessel-management/data"
                  element={
                    <RequireAuth>
                      <VesselData />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/vessel/:id"
                  element={
                    <RequireAuth>
                      <VesselInfoPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/vessel-details/:id"
                  element={
                    <RequireAuth>
                      <VesselDetailsPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/access-manager"
                  element={
                    <RequireAuth>
                      <AccessManager />
                    </RequireAuth>
                  }
                />

                <Route
                  path="/grant-login/:grant_code"
                  element={<GrantLoginPage />}
                />
                <Route
                  path="/vessel-invitation/:invitationCode"
                  element={<VesselInvitationPage />}
                />

                <Route path="/mobile-scan" element={<MobileScan />} />
                <Route path="/result-photo" element={<ResultPhoto />} />
                <Route
                  path="/qr-scanner"
                  element={
                    <RequireAuth>
                      <QRScannerPage />
                    </RequireAuth>
                  }
                />

                {/* Admin Routes - Country-based */}
                <Route
                  path="/:country/admin/dashboard"
                  element={
                    <RequireAdmin>
                      <Dashboard />
                    </RequireAdmin>
                  }
                />
                
                {/* Legacy admin routes (will be redirected) */}
                <Route
                  path="/admin/dashboard"
                  element={
                    <RequireAdmin>
                      <Dashboard />
                    </RequireAdmin>
                  }
                />
                
                {/* Settings - Country-based */}
                <Route
                  path="/:country/settings/account"
                  element={
                    <RequireAuth>
                      <Settings />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/:country/settings/company"
                  element={
                    <RequireAuth>
                      <Company />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/:country/settings/security"
                  element={
                    <RequireAuth>
                      <Security />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/:country/settings/notifications"
                  element={
                    <RequireAuth>
                      <Notifications />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/:country/notifications"
                  element={
                    <RequireAuth>
                      <NotificationList />
                    </RequireAuth>
                  }
                />
                
                {/* Legacy settings routes (will be redirected) */}
                <Route
                  path="/settings/account"
                  element={
                    <RequireAuth>
                      <Settings />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/settings/company"
                  element={
                    <RequireAuth>
                      <Company />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/settings/security"
                  element={
                    <RequireAuth>
                      <Security />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/settings/notifications"
                  element={
                    <RequireAuth>
                      <Notifications />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <RequireAuth>
                      <NotificationList />
                    </RequireAuth>
                  }
                />
                {/* Catch-all route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </CountryRouter>
            </AuthProvider>
          </ThemeColorProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
