import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import React, { useEffect, useState } from "react";
import { useTranslation } from "@/hooks/use-translation";
interface CompanyData {
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
  fleet?: FleetType[];
  created_at: string;
  updated_at: string;
  imageOne?: string | null;
  imageTwo?: string | null;
}

interface FleetType {
  type: string;
  count: number;
  vessels: string[];
}

function CompanyInfo() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuthStore();
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [repName, setRepName] = useState("");
  const [repPosition, setRepPosition] = useState("");
  const [repPhone, setRepPhone] = useState("");
  const [repEmail, setRepEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [hasCompany, setHasCompany] = useState(false);
  const [isDraggingOne, setIsDraggingOne] = useState(false);
  const [isDraggingTwo, setIsDraggingTwo] = useState(false);
  const [isUploadingOne, setIsUploadingOne] = useState(false);
  const [isUploadingTwo, setIsUploadingTwo] = useState(false);
  const [formLoading, setFormLoading] = useState(true);
  const [fleet, setFleet] = useState<FleetType[]>([
    { type: "", count: 0, vessels: [""] },
  ]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setFormLoading(true);
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", user?.auth_id)
        .single();
      console.log("data: ", data);
      if (data) {
        // Cast the data to our expected interface
        const companyData = data as unknown as CompanyData;
        setCompanyName(companyData.company_name || "");
        setAddress(companyData.address || "");
        setTaxCode(companyData.tax_code || "");
        setRepName(companyData.representative_name || "");
        setRepPosition(companyData.representative_position || "");
        setRepPhone(
          companyData.rep_phone || companyData.representative_phone || ""
        );
        setRepEmail(companyData.representative_email || "");
        setFleet(companyData.fleet || [{ type: "", count: 0, vessels: [""] }]);
        setHasCompany(true);
        // Handle image fields - they might be strings (URLs) or null
      } else {
        setHasCompany(false);
      }
      setFormLoading(false);
    })();
  }, [user?.id]);

  return (
    <div>
      {companyName && (
        <div className="container mx-auto mt-10  rounded-lg p-4">
          <div className="text-2xl font-bold text-center text-[#002e6b] mb-5">
            {t("companyForm.success_title")}
          </div>
          <div className="flex justify-center items-center">
            <span className="text-sm text-gray-500 text-center">
              Company ID
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 32,
            }}
          >
            <div>
              <div
                style={{ fontWeight: 700, marginBottom: 8, color: "#001c5c" }}
              >
                {t("companyForm.company_info")}
              </div>
              <div>
                {t("companyForm.company_name")} : {companyName}
              </div>
              <div>
                {t("companyForm.address")} : {address}
              </div>
              <div>
                {t("companyForm.tax_code")} : {taxCode}
              </div>
            </div>
            <div>
              <div
                style={{ fontWeight: 700, marginBottom: 8, color: "#001c5c" }}
              >
                {t("companyForm.rep_info")}
              </div>
              <div>
                {t("companyForm.rep_name")} : {repName}
              </div>
              <div>
                {t("companyForm.rep_position")} : {repPosition}
              </div>
              <div>
                {t("companyForm.rep_phone")} : {repPhone}
              </div>
              <div>
                {t("companyForm.rep_email")} : {repEmail}
              </div>
            </div>
          </div>

          {/* Fleet Information in Success Dialog */}
          {fleet.length > 0 && fleet.some((f) => f.type || f.count > 0) && (
            <div style={{ marginTop: 16 }}>
              <div
                style={{ fontWeight: 700, marginBottom: 8, color: "#001c5c" }}
              >
                THÔNG TIN ĐỘI TÀU
              </div>
              {fleet.map((fleetType, index) => (
                <div key={index} style={{ marginBottom: 8 }}>
                  <div>
                    Loại Tàu ({index + 1}): {fleetType.type || "Chưa nhập"}
                  </div>
                  <div>Số lượng: {fleetType.count}</div>
                  {fleetType.vessels.length > 0 &&
                    fleetType.vessels.some((v) => v) && (
                      <div>
                        Mã tàu: {fleetType.vessels.filter((v) => v).join(", ")}
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CompanyInfo;
