import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import { Input } from "../ui/input";
import { useLanguageStore } from "@/stores/language-store";
import { Upload, Plus, Trash2 } from "lucide-react";
import { API_ENDPOINTS, APP_CONFIG } from "@/lib/constants";

// Define the expected company data interface
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

export default function CompanyForm() {
  const { user, isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { language } = useLanguageStore();
  console.log("User: ", user);

  // State for form fields
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

  const [imageOne, setImageOne] = useState<File | null>(null);
  const [imageTwo, setImageTwo] = useState<File | null>(null);
  const [formLoading, setFormLoading] = useState(true);

  // Fleet state
  const [fleet, setFleet] = useState<FleetType[]>([
    { type: "", count: 0, vessels: [""] },
  ]);

  // Fetch existing company data for this user
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
        if (companyData.imageOne && typeof companyData.imageOne === "string") {
          setImageOne(companyData.imageOne as unknown as File); // We'll handle this as a URL string, not a File
        } else {
          setImageOne(null);
        }
        if (companyData.imageTwo && typeof companyData.imageTwo === "string") {
          setImageTwo(companyData.imageTwo as unknown as File); // We'll handle this as a URL string, not a File
        } else {
          setImageTwo(null);
        }
      } else {
        setHasCompany(false);
      }
      setFormLoading(false);
    })();
  }, [user?.id]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthUserId(data?.user?.id ?? null);
    });
  }, []);

  // Fleet management functions
  const addFleetType = () => {
    setFleet([...fleet, { type: "", count: 0, vessels: [""] }]);
  };

  const removeFleetType = (index: number) => {
    if (fleet.length > 1) {
      setFleet(fleet.filter((_, i) => i !== index));
    }
  };

  const updateFleetType = (
    index: number,
    field: keyof FleetType,
    value: string | number
  ) => {
    const updatedFleet = [...fleet];
    if (field === "count") {
      updatedFleet[index] = { ...updatedFleet[index], count: Number(value) };
    } else if (field === "type") {
      updatedFleet[index] = { ...updatedFleet[index], type: String(value) };
    }
    setFleet(updatedFleet);
  };

  const addVesselId = (fleetIndex: number) => {
    const updatedFleet = [...fleet];
    updatedFleet[fleetIndex].vessels.push("");
    setFleet(updatedFleet);
  };

  const removeVesselId = (fleetIndex: number, vesselIndex: number) => {
    const updatedFleet = [...fleet];
    if (updatedFleet[fleetIndex].vessels.length > 1) {
      updatedFleet[fleetIndex].vessels.splice(vesselIndex, 1);
      setFleet(updatedFleet);
    }
  };

  const updateVesselId = (
    fleetIndex: number,
    vesselIndex: number,
    value: string
  ) => {
    const updatedFleet = [...fleet];
    updatedFleet[fleetIndex].vessels[vesselIndex] = value;
    setFleet(updatedFleet);
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUserId) {
      toast({
        title: t("companyForm.need_login"),
        variant: "destructive",
      });
      return;
    }
    setLoading(true);

    let imageOneUrl = imageOne;
    let imageTwoUrl = imageTwo;

    if (imageOne) {
      // If it's already a File object, use it directly
      if (imageOne instanceof File) {
        const formData = new FormData();
        formData.append("file", imageOne);
        formData.append("folderName", "fishes");

        const response = await fetch(
          `${APP_CONFIG.API_URL}${API_ENDPOINTS.FILE_UPLOAD}`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error("Failed to upload file");
        }

        const { fileUrl } = await response.json();
        imageOneUrl = fileUrl;
      }
    }

    if (imageTwo) {
      // If it's already a File object, use it directly
      if (imageTwo instanceof File) {
        const formData = new FormData();
        formData.append("file", imageTwo);
        formData.append("folderName", "fishes");

        const response = await fetch(
          `${APP_CONFIG.API_URL}${API_ENDPOINTS.FILE_UPLOAD}`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error("Failed to upload file");
        }

        const { fileUrl } = await response.json();
        imageTwoUrl = fileUrl;
      }
    }

    // Use type assertion to match the expected database schema
    const { error } = await (
      supabase.from("companies") as unknown as {
        upsert: (
          values: Record<string, unknown>,
          options?: { onConflict?: string }
        ) => Promise<{ error: { message: string } | null }>;
      }
    ).upsert(
      {
        user_id: authUserId,
        company_name: companyName,
        address,
        tax_code: taxCode,
        representative_name: repName,
        representative_position: repPosition,
        rep_phone: repPhone,
        representative_email: repEmail,
        fleet,
        imageOne: imageOneUrl,
        imageTwo: imageTwoUrl,
      },
      { onConflict: "user_id" }
    );
    setLoading(false);
    if (error) {
      toast({
        title: t("companyForm.error_submit"),
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSuccessDialogOpen(true);
    }
  };

  const isCaptainOrCrew = () => {
    const role = user?.role.toLowerCase();
    return role === "captain" || role === "crew" || role === "crew_member";
  };

  return (
    <div>
      <div className="text-2xl font-bold text-center text-[#002e6b] mb-5">
        {t("companyForm.title")}
      </div>
      {formLoading ? (
        <div className="space-y-6">
          {/* Skeleton for Company Information Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <motion.div
              initial={{ opacity: 0, width: "60%" }}
              animate={{ opacity: 1, width: "100%" }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="h-6 bg-gray-200 rounded animate-pulse"
            />
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                  <div className="h-10 bg-gray-200 rounded animate-pulse" />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Skeleton for Representative Information Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-4"
          >
            <motion.div
              initial={{ opacity: 0, width: "70%" }}
              animate={{ opacity: 1, width: "100%" }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="h-6 bg-gray-200 rounded animate-pulse"
            />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
                  <div className="h-10 bg-gray-200 rounded animate-pulse" />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Skeleton for Fleet Information Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="space-y-4"
          >
            <motion.div
              initial={{ opacity: 0, width: "50%" }}
              animate={{ opacity: 1, width: "100%" }}
              transition={{ duration: 0.4, delay: 0.7 }}
              className="h-4 bg-gray-200 rounded animate-pulse"
            />
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.8 + index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                  <div className="h-10 bg-gray-200 rounded animate-pulse" />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Skeleton for Image Upload Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="space-y-4"
          >
            <motion.div
              initial={{ opacity: 0, width: "50%" }}
              animate={{ opacity: 1, width: "100%" }}
              transition={{ duration: 0.4, delay: 1.0 }}
              className="h-4 bg-gray-200 rounded animate-pulse"
            />
            <div className="flex flex-row gap-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 1.1 + index * 0.1 }}
                  className="flex-1"
                >
                  <div className="h-40 bg-gray-200 rounded border-2 border-dashed border-gray-300 animate-pulse" />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Skeleton for Submit Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2 }}
            className="text-center"
          >
            <div className="h-12 bg-gray-200 rounded-lg animate-pulse mx-auto w-48" />
          </motion.div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{ marginBottom: 24 }}
          >
            <span className="text-lg font-bold text-[#000]">
              {t("companyForm.company_info")}
            </span>
            <div style={{ margin: "16px 0 0 0" }}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <label>{t("companyForm.company_name")}</label>
                <Input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="bg-white p-2 rounded-md border-solid border-gray-800 my-2 radius-5"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <label>{t("companyForm.address")}</label>
                <Input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="bg-white p-2 rounded-md border-solid border-gray-800 my-2 radius-5"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <label>{t("companyForm.tax_code")}</label>
                <Input
                  type="text"
                  value={taxCode}
                  onChange={(e) => setTaxCode(e.target.value)}
                  className="bg-white p-2 rounded-md border-solid border-gray-800 my-2 radius-5"
                />
              </motion.div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{ marginBottom: 24 }}
          >
            <b>• THÔNG TIN NGƯỜI ĐẠI DIỆN</b>
            <div style={{ margin: "16px 0 0 0" }}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <label>{t("companyForm.rep_name")}</label>
                <Input
                  type="text"
                  value={repName}
                  onChange={(e) => setRepName(e.target.value)}
                  className="bg-white p-2 rounded-md border-solid border-gray-800 my-2 radius-5"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                <label>{t("companyForm.rep_position")}</label>
                <Input
                  type="text"
                  value={repPosition}
                  onChange={(e) => setRepPosition(e.target.value)}
                  className="bg-white p-2 rounded-md border-solid border-gray-800 my-2 radius-5"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.6 }}
              >
                <label>{t("companyForm.rep_phone")}</label>
                <Input
                  type="text"
                  value={repPhone}
                  onChange={(e) => setRepPhone(e.target.value)}
                  className="bg-white p-2 rounded-md border-solid border-gray-800 my-2 radius-5"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.7 }}
              >
                <label>{t("companyForm.rep_email")}</label>
                <Input
                  type="email"
                  value={repEmail}
                  onChange={(e) => setRepEmail(e.target.value)}
                  className="bg-white p-2 rounded-md border-solid border-gray-800 my-2 radius-5"
                />
              </motion.div>
            </div>
          </motion.div>

          {/* Fleet Information Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            style={{ marginBottom: 24 }}
          >
            <b>• THÔNG TIN ĐỘI TÀU</b>
            <div style={{ margin: "16px 0 0 0" }}>
              {fleet.map((fleetType, fleetIndex) => (
                <motion.div
                  key={fleetIndex}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + fleetIndex * 0.1 }}
                  className="mb-6 p-4 border border-gray-300 rounded-lg"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-blue-700">
                      Loại Tàu ({fleetIndex + 1})
                    </h4>
                    {fleet.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFleetType(fleetIndex)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Loại Tàu
                      </label>
                      <Input
                        type="text"
                        value={fleetType.type}
                        onChange={(e) =>
                          updateFleetType(fleetIndex, "type", e.target.value)
                        }
                        placeholder="Ví dụ: Tàu đánh cá, Tàu vận tải..."
                        className="bg-white p-2 rounded-md border-solid border-gray-800"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Số lượng
                      </label>
                      <Input
                        type="number"
                        value={fleetType.count}
                        onChange={(e) =>
                          updateFleetType(fleetIndex, "count", e.target.value)
                        }
                        min="0"
                        className="bg-white p-2 rounded-md border-solid border-gray-800"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                      Mã Tàu (Vessel IDs)
                    </label>
                    {fleetType.vessels.map((vesselId, vesselIndex) => (
                      <div
                        key={vesselIndex}
                        className="flex items-center gap-2 mb-2"
                      >
                        <Input
                          type="text"
                          value={vesselId}
                          onChange={(e) =>
                            updateVesselId(
                              fleetIndex,
                              vesselIndex,
                              e.target.value
                            )
                          }
                          placeholder="Nhập mã tàu..."
                          className="flex-1 bg-white p-2 rounded-md border-solid border-gray-800"
                        />
                        {fleetType.vessels.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              removeVesselId(fleetIndex, vesselIndex)
                            }
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addVesselId(fleetIndex)}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <Plus size={16} />
                      Thêm mã tàu
                    </button>
                  </div>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 }}
                className="text-center"
              >
                <button
                  type="button"
                  onClick={addFleetType}
                  className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={20} />
                  Thêm tàu
                </button>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <label>{t("companyForm.upload_image_title")}</label>
            <div className="flex flex-row gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.8 }}
                className="grid gap-4 py-4"
              >
                <div
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setIsDraggingOne(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDraggingOne(false);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingOne(false);
                    const file = e.dataTransfer.files?.[0];
                    setImageOne(file);
                  }}
                  onClick={() =>
                    document.getElementById("file-upload-input")?.click()
                  }
                  className={`relative p-6 border-2 border-dashed rounded-md cursor-pointer text-center transition-colors ${
                    isDraggingOne
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300"
                  }`}
                >
                  {imageOne ? (
                    <img
                      src={
                        imageOne instanceof File
                          ? URL.createObjectURL(imageOne)
                          : imageOne
                      }
                      alt="Document Preview"
                      className="mx-auto h-32 object-contain"
                    />
                  ) : (
                    <>
                      <input
                        id="file-upload-input"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          setImageOne(file);
                        }}
                      />
                      <Upload size={32} className="mx-auto text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        {language === "en"
                          ? t("companyForm.upload_image_1")
                          : t("companyForm.upload_image_1")}
                      </p>
                    </>
                  )}
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.9 }}
                className="grid gap-4 py-4"
              >
                <div
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setIsDraggingTwo(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDraggingTwo(false);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingTwo(false);
                    const file = e.dataTransfer.files?.[0];
                    setImageTwo(file);
                  }}
                  onClick={() =>
                    document.getElementById("file-upload-input-2")?.click()
                  }
                  className={`relative p-6 border-2 border-dashed rounded-md cursor-pointer text-center transition-colors ${
                    isDraggingTwo
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300"
                  }`}
                >
                  {imageTwo ? (
                    <img
                      src={
                        imageTwo instanceof File
                          ? URL.createObjectURL(imageTwo)
                          : imageTwo
                      }
                      alt="Document Preview"
                      className="mx-auto h-32 object-contain"
                    />
                  ) : (
                    <>
                      <input
                        id="file-upload-input-2"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          setImageTwo(file);
                        }}
                      />
                      <Upload size={32} className="mx-auto text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        {language === "en"
                          ? t("companyForm.upload_image_2")
                          : t("companyForm.upload_image_2")}
                      </p>
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
            className="text-center"
          >
            <button
              className="w-[180px] md:w-[300px] p-4 md:p-6 text-sm md:text-md rounded-lg"
              type="submit"
              style={{
                background:
                  "linear-gradient(160deg, #4a90e2 60%, #3573c9 100%)",
                color: "#fff",
                fontWeight: 500,
                border: "none",
                marginTop: 24,
                marginBottom: 8,
                position: "relative",
                letterSpacing: 2,
                outline: "none",
              }}
              disabled={loading || isCaptainOrCrew()}
            >
              <span
                className="rounded-lg left-1 right-1 top-1 bottom-1 "
                style={{
                  position: "absolute",

                  border: "4px solid #fff",
                  pointerEvents: "none",
                }}
              />
              <span style={{ position: "relative", zIndex: 1 }}>
                {loading
                  ? t("companyForm.sending")
                  : hasCompany
                  ? t("companyForm.update")
                  : t("companyForm.submit")}
              </span>
            </button>
          </motion.div>
        </form>
      )}

      <div className="container mx-auto mt-10 border-2 border-gray-300 rounded-lg p-4">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 32,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
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
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
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
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
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

      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] md:min-w-[400px] md:min-h-[300px] bg-[#dde7ea]">
          <DialogTitle
            style={{
              textAlign: "center",
              fontWeight: 700,
              color: "#19305b",
            }}
          >
            {t("companyForm.success_title")}
          </DialogTitle>
          <DialogDescription
            style={{
              textAlign: "center",
              fontSize: 18,
              color: "#222",
              marginBottom: 24,
            }}
          >
            {t("companyForm.success_id")}
          </DialogDescription>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 32,
            }}
          >
            <div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
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
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
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
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
