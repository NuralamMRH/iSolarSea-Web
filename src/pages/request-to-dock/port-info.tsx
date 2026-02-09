import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import TopButtons from "@/components/top-buttons";
import { useEffect, useState } from "react";
import {
  getAllSeaports,
  searchSeaports,
  addSeaport,
  supabase,
} from "@/lib/supabase";
import type { Database } from "@/integrations/supabase/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguageStore } from "@/stores/language-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "@/hooks/use-translation";
import { useAuthStore } from "@/stores/auth-store";

// Type for a seaport row
const initialForm = {
  name: "",
  address: "",
  classification: 1,
  province: "",
  district: "",
  ward: "",
  status: "Active",
  latitude: undefined,
  longitude: undefined,
};

function PortInfoContainer() {
  const { t } = useTranslation();
  const [ports, setPorts] = useState<
    Database["public"]["Tables"]["seaports"]["Row"][]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Pagination and search
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchPorts();
    // eslint-disable-next-line
  }, [page, perPage]);

  async function fetchPorts(searchTerm = search) {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from("seaports").select("*", { count: "exact" });
      if (searchTerm) {
        query = query.or(
          `name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%,province.ilike.%${searchTerm}%`
        );
      }
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);
      setPorts(data || []);
      setTotal(count || 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchPorts(search);
  }

  function handlePerPageChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setPerPage(Number(e.target.value));
    setPage(1);
  }

  async function handleAddOrEdit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (editId) {
        // Edit
        await supabase.from("seaports").update(form).eq("id", editId);
      } else {
        // Add
        await addSeaport(form);
      }
      setForm(initialForm);
      setDialogOpen(false);
      setEditId(null);
      fetchPorts();
    } catch (e: unknown) {
      console.error("Add/Edit port error:", e);
      setError(
        e instanceof Error
          ? e.message
          : typeof e === "object" && e !== null && "message" in e
          ? (e as { message?: string }).message || JSON.stringify(e)
          : JSON.stringify(e)
      );
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(port: Database["public"]["Tables"]["seaports"]["Row"]) {
    setForm({
      name: port.name || "",
      address: port.address || "",
      classification: port.classification || 1,
      province: port.province || "",
      district: port.district || "",
      ward: port.ward || "",
      status: port.status || "Active",
      latitude: port.latitude ?? undefined,
      longitude: port.longitude ?? undefined,
    });
    setEditId(port.id);
    setDialogOpen(true);
  }

  async function handleDelete() {
    if (!deleteId) return;
    setLoading(true);
    setError(null);
    try {
      await supabase.from("seaports").delete().eq("id", deleteId);
      setDeleteId(null);
      setShowDeleteConfirm(false);
      fetchPorts();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-3 py-4 md:gap-6 md:py-6">
      <form
        onSubmit={handleSearch}
        className="flex flex-wrap gap-2 items-end mb-4"
      >
        <Input
          placeholder={t("portInfo.search_placeholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 bg-blue-100 h-9"
        />
        <Button type="submit">{t("portInfo.search")}</Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setSearch("");
            setPage(1);
            fetchPorts("");
          }}
        >
          {t("portInfo.reset")}
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <span>{t("portInfo.rows_per_page")}</span>
          <select
            value={perPage}
            onChange={handlePerPageChange}
            className="border rounded px-2 py-1"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </form>
      <div className="mb-8 flex flex-col lg:flex-row gap-4 lg:gap-0 justify-start md:justify-between md:items-center">
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditId(null);
              setForm(initialForm);
            }
          }}
        >
          <DialogTrigger asChild>
            {/* <Button className="gap-2">
              <Plus size={16} /> {t("portInfo.add_new_seaport")}
            </Button> */}
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col overflow-y-auto overflow-x-hidden">
            <DialogHeader>
              <DialogTitle>
                {editId
                  ? t("portInfo.edit_seaport")
                  : t("portInfo.add_new_seaport")}
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={handleAddOrEdit}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4"
            >
              <div>
                <Label>{t("portInfo.name")}</Label>
                <Input
                  required
                  placeholder={t("portInfo.name")}
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className=" bg-blue-100"
                />
              </div>
              <div>
                <Label>{t("portInfo.address")}</Label>
                <Input
                  placeholder={t("portInfo.address")}
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: e.target.value }))
                  }
                  className=" bg-blue-100"
                />
              </div>
              <div>
                <Label>{t("portInfo.classification")}</Label>
                <Input
                  type="number"
                  placeholder={t("portInfo.classification")}
                  value={form.classification}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      classification: Number(e.target.value),
                    }))
                  }
                  className=" bg-blue-100"
                />
              </div>
              <div>
                <Label>{t("portInfo.province")}</Label>
                <Input
                  placeholder={t("portInfo.province")}
                  value={form.province}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, province: e.target.value }))
                  }
                  className=" bg-blue-100"
                />
              </div>
              <div>
                <Label>{t("portInfo.district")}</Label>
                <Input
                  placeholder={t("portInfo.district")}
                  value={form.district}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, district: e.target.value }))
                  }
                  className=" bg-blue-100"
                />
              </div>
              <div>
                <Label>{t("portInfo.ward")}</Label>
                <Input
                  placeholder={t("portInfo.ward")}
                  value={form.ward}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ward: e.target.value }))
                  }
                  className=" bg-blue-100"
                />
              </div>
              <div>
                <Label>{t("portInfo.latitude")}</Label>
                <Input
                  type="number"
                  placeholder={t("portInfo.latitude")}
                  value={form.latitude ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      latitude: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    }))
                  }
                  className=" bg-blue-100"
                />
              </div>
              <div>
                <Label>{t("portInfo.longitude")}</Label>
                <Input
                  type="number"
                  placeholder={t("portInfo.longitude")}
                  value={form.longitude ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      longitude: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    }))
                  }
                  className=" bg-blue-100"
                />
              </div>
              <div>
                <Label>{t("portInfo.status")}</Label>
                <Input
                  placeholder={t("portInfo.status")}
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value }))
                  }
                  className=" bg-blue-100"
                />
              </div>
              <DialogFooter className="col-span-1 md:col-span-2 mt-4">
                <Button type="submit">
                  {editId
                    ? t("portInfo.update_seaport")
                    : t("portInfo.add_seaport")}
                </Button>
              </DialogFooter>
            </form>
            {error && <div className="text-red-500">{error}</div>}
          </DialogContent>
        </Dialog>
        {/* Delete confirmation dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("portInfo.delete_seaport")}</DialogTitle>
            </DialogHeader>
            <div>{t("portInfo.delete_confirm")}</div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t("portInfo.cancel")}
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                {t("portInfo.delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="overflow-x-auto">
        <CardHeader>
          <CardTitle>{t("portInfo.seaport_information")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-scroll">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <p>{t("portInfo.loading")}</p>
            </div>
          ) : ports.length === 0 ? (
            <div className="text-center py-10">
              <Plus className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                {t("portInfo.no_seaports_found")}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("portInfo.add_first_seaport")}
              </p>
              <Button
                onClick={() => setDialogOpen(true)}
                className="mt-4 gap-2"
              >
                <Plus size={16} /> {t("portInfo.add_seaport")}
              </Button>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table className="min-w-full border-collapse">
                <TableHeader>
                  <TableRow className="border-b-2 border-black">
                    <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-16 sticky left-0 z-10">
                      {t("portInfo.no")}
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-24">
                      {t("portInfo.name")}
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-32">
                      {t("portInfo.address")}
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-20">
                      {t("portInfo.classification")}
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-20">
                      {t("portInfo.province")}
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-20">
                      {t("portInfo.district")}
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-20">
                      {t("portInfo.ward")}
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-16">
                      {t("portInfo.status")}
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-20">
                      {t("portInfo.latitude")}
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-20">
                      {t("portInfo.longitude")}
                    </TableHead>
                    <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-24">
                      {t("portInfo.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ports.map((port, idx) => (
                    <TableRow
                      key={port.id}
                      className="w-full cursor-pointer hover:bg-gray-50 border-b border-gray-200"
                    >
                      <TableCell className="border border-black px-2 py-1.5 text-xs font-medium w-16 sticky left-0 z-10 bg-white">
                        <div
                          className="truncate"
                          title={String((page - 1) * perPage + idx + 1)}
                        >
                          {(page - 1) * perPage + idx + 1}
                        </div>
                      </TableCell>
                      <TableCell className="border border-black px-2 py-1.5 text-xs w-24">
                        <div className="truncate" title={port.name}>
                          {port.name}
                        </div>
                      </TableCell>
                      <TableCell className="border border-black px-2 py-1.5 text-xs w-32">
                        <div className="truncate" title={port.address}>
                          {port.address}
                        </div>
                      </TableCell>
                      <TableCell className="border border-black px-2 py-1.5 text-xs w-20">
                        <div
                          className="truncate"
                          title={String(port.classification)}
                        >
                          {port.classification}
                        </div>
                      </TableCell>
                      <TableCell className="border border-black px-2 py-1.5 text-xs w-20">
                        <div className="truncate" title={port.province}>
                          {port.province}
                        </div>
                      </TableCell>
                      <TableCell className="border border-black px-2 py-1.5 text-xs w-20">
                        <div className="truncate" title={port.district}>
                          {port.district}
                        </div>
                      </TableCell>
                      <TableCell className="border border-black px-2 py-1.5 text-xs w-20">
                        <div className="truncate" title={port.ward}>
                          {port.ward}
                        </div>
                      </TableCell>
                      <TableCell className="border border-black px-2 py-1.5 text-xs w-16">
                        <div className="truncate" title={port.status}>
                          {port.status}
                        </div>
                      </TableCell>
                      <TableCell className="border border-black px-2 py-1.5 text-xs w-20">
                        <div className="truncate" title={String(port.latitude)}>
                          {port.latitude}
                        </div>
                      </TableCell>
                      <TableCell className="border border-black px-2 py-1.5 text-xs w-20">
                        <div
                          className="truncate"
                          title={String(port.longitude)}
                        >
                          {port.longitude}
                        </div>
                      </TableCell>
                      <TableCell
                        className="border border-black px-2 py-1.5 text-xs w-24"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(port)}
                            className="h-5 w-5 p-0"
                          >
                            <Pencil className="w-2.5 h-2.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setDeleteId(port.id);
                              setShowDeleteConfirm(true);
                            }}
                            className="h-5 w-5 p-0"
                          >
                            <Trash2 className="w-2.5 h-2.5 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* Pagination controls */}
              <div className="flex items-center justify-between mt-4">
                <div>
                  {t("portInfo.showing")}{" "}
                  {ports.length ? (page - 1) * perPage + 1 : 0} -{" "}
                  {Math.min(page * perPage, total)} {t("portInfo.of")} {total}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft />
                  </Button>
                  {Array.from(
                    { length: Math.ceil(total / perPage) },
                    (_, i) => (
                      <Button
                        key={i + 1}
                        type="button"
                        variant={page === i + 1 ? "default" : "ghost"}
                        size="icon"
                        onClick={() => setPage(i + 1)}
                      >
                        {i + 1}
                      </Button>
                    )
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={
                      page === Math.ceil(total / perPage) || total === 0
                    }
                    onClick={() => setPage(page + 1)}
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <h1 className="text-2xl font-bold text-center text-blue-800 bg-gray-200 p-4 mt-5 rounded-md">
            Add Seaport/Thêm Cảng
          </h1>
          <form
            onSubmit={handleAddOrEdit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4"
          >
            <div>
              <Label>{t("portInfo.name")}</Label>
              <Input
                required
                placeholder={t("portInfo.name")}
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className=" bg-blue-100"
              />
            </div>
            <div>
              <Label>{t("portInfo.address")}</Label>
              <Input
                placeholder={t("portInfo.address")}
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                className=" bg-blue-100"
              />
            </div>
            <div>
              <Label>{t("portInfo.classification")}</Label>
              <Input
                type="number"
                placeholder={t("portInfo.classification")}
                value={form.classification}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    classification: Number(e.target.value),
                  }))
                }
                className=" bg-blue-100"
              />
            </div>
            <div>
              <Label>{t("portInfo.province")}</Label>
              <Input
                placeholder={t("portInfo.province")}
                value={form.province}
                onChange={(e) =>
                  setForm((f) => ({ ...f, province: e.target.value }))
                }
                className=" bg-blue-100"
              />
            </div>
            <div>
              <Label>{t("portInfo.district")}</Label>
              <Input
                placeholder={t("portInfo.district")}
                value={form.district}
                onChange={(e) =>
                  setForm((f) => ({ ...f, district: e.target.value }))
                }
                className=" bg-blue-100"
              />
            </div>
            <div>
              <Label>{t("portInfo.ward")}</Label>
              <Input
                placeholder={t("portInfo.ward")}
                value={form.ward}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ward: e.target.value }))
                }
                className=" bg-blue-100"
              />
            </div>
            <div>
              <Label>{t("portInfo.latitude")}</Label>
              <Input
                type="number"
                placeholder={t("portInfo.latitude")}
                value={form.latitude ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    latitude: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  }))
                }
                className=" bg-blue-100"
              />
            </div>
            <div>
              <Label>{t("portInfo.longitude")}</Label>
              <Input
                type="number"
                placeholder={t("portInfo.longitude")}
                value={form.longitude ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    longitude: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  }))
                }
                className=" bg-blue-100"
              />
            </div>
            <div>
              <Label>{t("portInfo.status")}</Label>
              <Input
                placeholder={t("portInfo.status")}
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value }))
                }
                className=" bg-blue-100"
              />
            </div>
            <DialogFooter className="col-span-1 md:col-span-2 mt-4">
              <Button type="submit">
                {editId
                  ? t("portInfo.update_seaport")
                  : t("portInfo.add_seaport")}
              </Button>
            </DialogFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PortInfo() {
  const { language } = useLanguageStore();
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader
          title={language === "en" ? "Port info" : "Thông tin cảng"}
        />
        <TopButtons />

        <div className="px-3 flex gap-2 md:gap-3 lg:gap-4 overflow-x-auto">
          {/* {user.role === "Admin" && ()} */}
            <Link to="/request-to-dock/port-info" className="flex-shrink-0">
              <button
                className={`
                 bg-gradient-to-r from-black to-[#1306ad] text-[#f8f603] rounded-md px-4 md:px-5
                  h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                  text-xs md:text-base
                  w-38 md:w-38 lg:w-52
                `}
              >
                <span className="truncate">
                  {language === "en" ? "Port info" : "Thông tin cảng"}
                </span>
              </button>
            </Link>
          <Link to="/request-to-dock/departure" className="flex-shrink-0">
            <button
              className={`
                bg-gradient-to-r from-[#a8a8a8] to-[#fdfdfd] text-black rounded-md px-4 md:px-5
                  h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                  text-xs md:text-base
                w-38 md:w-38 lg:w-52 shadow-lg hover:shadow-xl transition-all duration-300
              `}
            >
              <span className="truncate">
                {language === "en"
                  ? "R4D - Request for Departure"
                  : "R4D - Yêu cầu khởi hành"}
              </span>
            </button>
          </Link>
          <Link to="/request-to-dock/dock" className="flex-shrink-0">
            <button
              className={`
                bg-gradient-to-r from-[#a8a8a8] to-[#fdfdfd] text-black rounded-md px-4 md:px-5
                  h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                  text-xs md:text-base
                w-38 md:w-38 lg:w-52 shadow-lg hover:shadow-xl transition-all duration-300
              `}
            >
              <span className="truncate">
                {language === "en"
                  ? "R2D - Request to Dock"
                  : "R2D - Yêu cầu cập cảng"}
              </span>
            </button>
          </Link>
        </div>
        <PortInfoContainer />
      </SidebarInset>
    </SidebarProvider>
  );
}
