"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  MapPin, 
  Truck, 
  CheckCircle2, 
  Plus, 
  PackageCheck, 
  PackageOpen, 
  FileCheck, 
  AlertTriangle, 
  Settings2,
  Trash2,
  Search
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface GenericData {
  id?: string;
  [key: string]: any;
}


// ─── Sanitasi & Batas Karakter ────────────────────────────────────────
const MAX_LEN = {
  short: 200,   // driver_name, recipient_name, jenis_unit, dll.
  medium: 500,  // alamat_muat, alamat_tujuan
  long: 2000,   // keterangan_custom, uraian_perjalanan
};

/** Trim + truncate string ke batas aman */
function sanitize(val: string, maxLen: number = MAX_LEN.short): string {
  return val.trim().slice(0, maxLen);
}

/** Trim, jika hasilnya kosong kembalikan null */
function sanitizeOrNull(val: string, maxLen: number = MAX_LEN.short): string | null {
  const trimmed = val.trim().slice(0, maxLen);
  return trimmed === "" ? null : trimmed;
}

const STT_STATUS = [
  { name: "Di Lokasi Muat", icon: MapPin },
  { name: "Selesai Muat", icon: PackageCheck },
  { name: "Di Perjalanan", icon: Truck },
  { name: "Bongkar", icon: PackageOpen },
  { name: "Selesai Bongkar", icon: CheckCircle2 },
  { name: "Dokumen Kembali", icon: FileCheck },
  { name: "Bermasalah", icon: AlertTriangle },
  { name: "Custom", icon: Settings2 }
];

// Whitelist untuk validasi enum sisi frontend (CELAH-04 fix)
const VALID_STATUS_VALUES = STT_STATUS.map(s => s.name);

const CABANG_OPTIONS = [
  "CAM SUB", "CAM SMG", "CAM BKS", "SPP SUB", "SPP SMG", "SPP BKS", "TETRA"
];

const VENDOR_PRICE_OPTIONS = [
  "Harga Standar", "Harga Mahal", "Harga Mahal Momen", "Memakai Unit CAM"
];

export default function PosPage() {
  const supabase = createClient();
  const [data, setData] = useState<GenericData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // -- Card 1: Informasi Utama --
  const [tglMasuk, setTglMasuk] = useState(() => new Date().toISOString().split('T')[0]);
  const [newStt, setNewStt] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(""); // Dropsown Statis
  const [namaCustomerTeks, setNamaCustomerTeks] = useState(""); // Input Manual
  const [selectedService, setSelectedService] = useState("FTL");
  const [targetSla, setTargetSla] = useState("1");
  
  // -- Card 2: Detail Alamat & Kontak --
  const [alamatMuat, setAlamatMuat] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [alamatTujuan, setAlamatTujuan] = useState("");

  // -- Card 3: Informasi Kargo --
  const [beratKg, setBeratKg] = useState("");
  const [volume, setVolume] = useState("");
  const [qtyKoli, setQtyKoli] = useState("");

  // -- Card 4: Informasi Armada & Vendor --
  const [newNopol, setNewNopol] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [jenisUnit, setJenisUnit] = useState("");
  const [vendorPrice, setVendorPrice] = useState("");
  const [monitoringPj, setMonitoringPj] = useState("");

  // -- Card 5: Penyelesaian & Biaya --
  const [tkbm, setTkbm] = useState("");
  const [omset, setOmset] = useState("");
  const [tglDiterima, setTglDiterima] = useState("");
  const [keteranganCustom, setKeteranganCustom] = useState("");

  // -- Card 6: Indikator KPI & Evaluasi --
  const [rateSla, setRateSla] = useState("");
  const [rateKomplain, setRateKomplain] = useState("");
  const [rateKud, setRateKud] = useState("");
  const [kecepatanDoc, setKecepatanDoc] = useState("");
  const [hargaVendor, setHargaVendor] = useState("");

  // Tracker State
  const [selectedStatus, setSelectedStatus] = useState("Di Lokasi Muat");
  const [customStatusText, setCustomStatusText] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  // Status Barang Filter (Tugas 4)
  const [statusBarangFilter, setStatusBarangFilter] = useState("all");

  const isFTL = selectedService === "FTL";


  const fetchShipments = async (term = searchTerm) => {
    try {
      let query = supabase.from("shipments").select(`
        *,
        master_vehicles ( nopol )
      `);

      if (!term || term.trim() === "") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfToday = today.toISOString(); 

        query = query
          .gte('tgl_masuk', startOfToday)
          .order('created_at', { ascending: false })
          .limit(15);
      } else {
        query = query
          .or(`no_stt.ilike.%${term}%,cabang_customer.ilike.%${term}%,nama_customer_teks.ilike.%${term}%`)
          .order('created_at', { ascending: false })
          .limit(50);
      }

      const { data: shipData, error } = await query;
      if (error) throw error;
      setData(shipData || []);
    } catch (error: unknown) {
      console.error("Gagal mengambil log eksekusi:", (error instanceof Error ? error.message : String(error)));
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchShipments();
  }, []);

  const resetForm = () => {
    setTglMasuk(new Date().toISOString().split('T')[0]);
    setNewStt("");
    setSelectedCustomer("");
    setNamaCustomerTeks("");
    setSelectedService("FTL");
    setTargetSla("1");
    setAlamatMuat("");
    setRecipientName("");
    setRecipientPhone("");
    setAlamatTujuan("");
    setBeratKg("");
    setVolume("");
    setQtyKoli("");
    setNewNopol("");
    setDriverName("");
    setDriverPhone("");
    setJenisUnit("");
    setVendorPrice("");
    setMonitoringPj("");
    setTkbm("");
    setOmset("");
    setTglDiterima("");
    setKeteranganCustom("");
    setRateSla("");
    setRateKomplain("");
    setRateKud("");
    setKecepatanDoc("");
    setHargaVendor("");
    setSelectedStatus("Di Lokasi Muat");
    setCustomStatusText("");
    setIsEditing(false);
    setEditingId(null);
  };

  const handleEdit = (item: GenericData) => {
    setIsEditing(true);
    setEditingId(item.id || null);
    
    setTglMasuk(item.tgl_masuk || new Date().toISOString().split('T')[0]);
    setNewStt(item.no_stt || "");
    setSelectedCustomer(item.cabang_customer || "");
    setNamaCustomerTeks(item.nama_customer_teks || "");
    setSelectedService(item.jenis_layanan || "FTL");
    setTargetSla(item.rule_sla_hari?.toString() || "1");
    
    setAlamatMuat(item.alamat_muat || "");
    setRecipientName(item.recipient_name || "");
    setRecipientPhone(item.recipient_phone || "");
    setAlamatTujuan(item.alamat_tujuan || "");
    
    setBeratKg(item.berat_kg?.toString() || "");
    setVolume(item.volume_m3?.toString() || "");
    setQtyKoli(item.qty_koli?.toString() || "");
    
    setNewNopol(item.master_vehicles?.nopol || "");
    setDriverName(item.driver_name || "");
    setDriverPhone(item.driver_phone || "");
    setJenisUnit(item.jenis_unit || "");
    setVendorPrice(item.vendor_price || "");
    setMonitoringPj(item.monitoring_pj || "");
    
    setTkbm(item.tkbm || "");
    setOmset(item.omset?.toString() || "");
    setTglDiterima(item.tgl_diterima || "");
    setKeteranganCustom(item.keterangan_custom || "");
    setRateSla(item.rate_sla || "");
    setRateKomplain(item.rate_komplain || "");
    setRateKud(item.rate_kud || "");
    setKecepatanDoc(item.kecepatan_doc || "");
    setHargaVendor(item.harga_vendor || "");
    
    const isStandardStatus = STT_STATUS.some(s => s.name === item.status_pengiriman);
    if (isStandardStatus && item.status_pengiriman !== "Custom") {
      setSelectedStatus(item.status_pengiriman);
      setCustomStatusText("");
    } else {
      setSelectedStatus("Custom");
      setCustomStatusText(item.status_detail_text || (isStandardStatus ? "" : item.status_pengiriman) || "");
    }
    
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string, stt: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus STT ${stt || 'Tanpa Nomor'} secara permanen?`)) {
      setIsLoading(true);
      try {
        const { error } = await supabase.from('shipments').delete().eq('id', id);
        if (error) throw error;
        await fetchShipments(searchTerm);
      } catch (err: unknown) {
        alert("Gagal menghapus data: " + (err instanceof Error ? err.message : String(err)));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSubmitStt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
        alert("Mohon isi Customer");
        return;
    }
    
    setIsLoading(true);

    // ═══ VALIDASI ENUM (CELAH-04 fix) ═══
    if (!VALID_STATUS_VALUES.includes(selectedStatus)) {
      alert(`Status pengiriman "${selectedStatus}" tidak valid. Pilih status dari daftar yang tersedia.`);
      setIsLoading(false);
      return;
    }

    // Instead of overriding the enum column, we save custom text to status_detail_text
    const finalStatus = selectedStatus;
    const finalDetailText = selectedStatus === "Custom" ? sanitize(customStatusText, MAX_LEN.medium) : "";

    let finalStt = newStt?.trim();
    if (!finalStt || finalStt === "") {
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

        const { count, error: countError } = await supabase
          .from('shipments')
          .select('id', { count: 'exact', head: true })
          .ilike('no_stt', 'Non-STT-%')
          .gte('created_at', startOfMonth)
          .lte('created_at', endOfMonth);

        if (countError) throw countError;

        const sequence = ((count || 0) + 1).toString().padStart(4, '0'); 
        const cabangAsli = selectedCustomer || 'UNKNOWN';
        const kodeCabang = cabangAsli.replace(/\s+/g, '').toUpperCase(); 
        
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yy = String(now.getFullYear()).slice(-2);
        const tanggalInput = `${dd}${mm}${yy}`;

        finalStt = `Non-STT-${kodeCabang}-${tanggalInput}-${sequence}`;
      } catch (error) {
        console.error("Gagal men-generate ID Non-STT:", error);
        alert("Terjadi kesalahan saat membuat ID Non-STT. Silakan coba lagi.");
        setIsLoading(false);
        return; 
      }
    }

    // ═══ VALIDASI NOPOL (CELAH-03 fix) ═══
    const finalNopol = newNopol?.trim().toUpperCase() || "";
    if (finalNopol === "" && newNopol.trim() !== newNopol) {
        alert("Peringatan: Nomor Polisi (Kendaraan) tidak boleh hanya berisi spasi.");
        setIsLoading(false);
        return;
    }

    // ═══ VALIDASI DRIVER NAME (CELAH-03 fix) ═══
    const finalDriverName = sanitize(driverName);
    if (driverName.length > 0 && finalDriverName === "") {
        alert("Nama Driver tidak boleh hanya berisi spasi.");
        setIsLoading(false);
        return;
    }

    try {
      // 1. Resolve or Insert Vehicle
      let vehicleId = null;
      if (finalNopol !== "") {
        const { data: vData } = await supabase
          .from("master_vehicles")
          .select("id")
          .eq("nopol", finalNopol)
          .single();
          
        if (vData) {
          vehicleId = vData.id;
        } else {
          const { data: newV } = await supabase
            .from("master_vehicles")
            .insert({ nopol: finalNopol, jenis_unit: jenisUnit || null })
            .select("id")
            .single();
          if (newV) vehicleId = newV.id;
        }
      }

      // 2. Insert or Update Shipment
      // ═══ SANITASI SEMUA FIELD TEKS (CELAH-03 & CELAH-05 fix) ═══
      const payload: Record<string, any> = {
        tgl_masuk: tglMasuk,
        no_stt: finalStt,
        cabang_customer: sanitize(selectedCustomer),
        nama_customer_teks: sanitizeOrNull(namaCustomerTeks),
        jenis_layanan: selectedService,
        status_pengiriman: finalStatus,
        rule_sla_hari: parseInt(targetSla) || 1,
        
        // Alamat & Kontak (medium length)
        alamat_muat: sanitizeOrNull(alamatMuat, MAX_LEN.medium),
        alamat_tujuan: sanitizeOrNull(alamatTujuan, MAX_LEN.medium),
        recipient_name: sanitizeOrNull(recipientName),
        recipient_phone: sanitizeOrNull(recipientPhone),
        
        // Kargo
        berat_kg: parseFloat(beratKg) || 0,
        volume_m3: parseFloat(volume) || 0,
        qty_koli: parseInt(qtyKoli) || 0,
        
        // Armada & Vendor
        vehicle_id: vehicleId,
        driver_name: sanitizeOrNull(finalDriverName),
        driver_phone: sanitizeOrNull(driverPhone),
        jenis_unit: isFTL ? sanitizeOrNull(jenisUnit) : null,
        vendor_price: isFTL ? sanitizeOrNull(vendorPrice) : null,
        monitoring_pj: isFTL ? sanitizeOrNull(monitoringPj) : null,
        
        // Biaya & Penyelesaian
        tkbm: sanitizeOrNull(tkbm, MAX_LEN.medium),
        omset: parseFloat(omset) || 0,
        keterangan_custom: sanitizeOrNull(keteranganCustom, MAX_LEN.long),
        
        // KPI & Evaluasi
        rate_sla: sanitizeOrNull(rateSla),
        rate_komplain: sanitizeOrNull(rateKomplain),
        rate_kud: sanitizeOrNull(rateKud),
        kecepatan_doc: sanitizeOrNull(kecepatanDoc),
        harga_vendor: sanitizeOrNull(hargaVendor),
        status_detail_text: finalDetailText
      };

      payload.tgl_diterima = tglDiterima && tglDiterima.trim() !== "" ? tglDiterima : null;

      if (isEditing && editingId) {
        const { error } = await supabase
          .from("shipments")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        alert("Data berhasil diupdate!");
      } else {
        const { error } = await supabase
          .from("shipments")
          .insert(payload);
        if (error) throw error;
      }
      
      resetForm();
      await fetchShipments(searchTerm);

    } catch (err: unknown) {
      console.error("Failed to save shipment:", err, JSON.stringify(err));
      let errorMsg = String(err);
      if (err instanceof Error) {
        errorMsg = err.message;
      } else if (typeof err === "object" && err !== null) {
        errorMsg = (err as any).message || (err as any).details || JSON.stringify(err);
      }
      alert(`Gagal menyimpan STT: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIndex = (status: string) => {
      const idx = STT_STATUS.findIndex(s => s.name === status);
      return idx >= 0 ? idx : STT_STATUS.length - 1; // if not found, it's custom
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 overflow-y-auto bg-slate-50">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-sans text-slate-800">
          Delivery Management (POS)
        </h2>
      </div>
      
      {/* Top Section: Interactive Stepper Tracker */}
      <Card className="border-orange-100 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="font-sans text-lg">Update Tracker Resi</CardTitle>
          <CardDescription>
            Pilih status saat ini untuk STT baru. Klik ikon untuk mengubah status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="flex justify-between items-start px-2 py-4 overflow-x-auto min-w-full pb-6 scrollbar-hide">
              {STT_STATUS.map((status, index) => {
                const currentIdx = getStatusIndex(selectedStatus);
                const isActive = index <= currentIdx; 
                const isSelected = index === currentIdx;
                const isIssue = status.name === "Bermasalah";
                
                const Icon = status.icon;
                
                return (
                  <div 
                    key={status.name} 
                    onClick={() => {
                        setSelectedStatus(status.name);
                        if(status.name !== "Custom") setCustomStatusText("");
                    }}
                    className="flex flex-col items-center relative z-10 min-w-[120px] px-2 shrink-0 cursor-pointer group"
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 mb-3 transition-all duration-300 bg-white
                      ${isSelected ? "border-orange-600 text-orange-600 ring-4 ring-orange-100 shadow-lg scale-110" 
                      : isActive ? "border-orange-600 bg-orange-600 text-white" 
                      : isIssue ? "border-slate-200 text-red-300 group-hover:border-red-300"
                      : "border-slate-200 text-slate-300 group-hover:border-orange-300 group-hover:text-orange-400"}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-xs font-semibold text-center leading-tight transition-colors
                      ${isSelected ? 'text-orange-700' : isActive ? 'text-slate-800' : isIssue ? 'text-red-400/70' : 'text-slate-400 group-hover:text-orange-500'}`}>
                      {status.name}
                    </span>
                  </div>
                );
              })}
              
              {/* Background Line */}
              <div className="absolute top-[2rem] left-14 right-14 h-[2px] bg-slate-100 -z-0">
                <div 
                className="h-full bg-orange-500 transition-all duration-500 ease-in-out" 
                style={{ width: `${(getStatusIndex(selectedStatus) / (STT_STATUS.length - 1)) * 100}%` }}
              ></div>
              </div>
            </div>

            {selectedStatus === "Custom" && (
                <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-100 animate-in slide-in-from-top-2">
                    <Label htmlFor="customStatus" className="text-orange-800 font-semibold mb-2 block">Nama Status Kustom</Label>
                    <Input 
                        id="customStatus"
                        value={customStatusText}
                        onChange={(e) => setCustomStatusText(e.target.value)}
                        placeholder="Misal: Tertahan di Pelabuhan"
                        className="bg-white border-orange-200 focus-visible:ring-orange-500"
                    />
                </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Grid: Form Generation */}
      <form onSubmit={handleSubmitStt} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 items-start">
          
          {/* Left Column */}
          <div className="space-y-6">
            
            {/* Card 1: Informasi Utama */}
            <Card className="shadow-sm">
              <CardHeader className="pb-4 border-b border-slate-50 mb-4 bg-slate-50/50">
                <CardTitle className="font-sans text-lg text-slate-800">1. Informasi Utama</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tglMasuk" className="font-sans font-medium">Tgl Masuk</Label>
                    <Input 
                      id="tglMasuk" 
                      type="date"
                      value={tglMasuk}
                      onChange={(e) => setTglMasuk(e.target.value)}
                      className="font-sans"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stt" className="font-sans font-medium">No. STT</Label>
                    <Input 
                      id="stt" 
                      placeholder="STT-10027" 
                      value={newStt}
                      onChange={(e) => setNewStt(e.target.value.toUpperCase())}
                      className="font-mono uppercase font-semibold text-orange-700 bg-orange-50/30"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                    <Label htmlFor="customer" className="font-sans font-medium">Customer (Downdrip)</Label>
                    <select 
                        id="customer" 
                        value={selectedCustomer}
                        onChange={(e) => setSelectedCustomer(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-sans"
                        disabled={isLoading}
                        required
                    >
                        <option value="">Pilih Cabang...</option>
                        {CABANG_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="namaCustomerTeks" className="font-sans font-medium">Nama Klien (Riil)</Label>
                    <Input 
                        id="namaCustomerTeks" 
                        placeholder="Misal: Radiant" 
                        value={namaCustomerTeks}
                        onChange={(e) => setNamaCustomerTeks(e.target.value)}
                        className="font-sans"
                        disabled={isLoading}
                    />
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                    <Label htmlFor="service" className="font-sans font-medium">Layanan</Label>
                    <select 
                        id="service" 
                        value={selectedService}
                        onChange={(e) => setSelectedService(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring font-sans font-semibold text-slate-700"
                        disabled={isLoading}
                    >
                        <option value="FTL">FTL - Full Truck Load</option>
                        <option value="LTL">LTL - Less Than Truckload</option>
                        <option value="LCL">LCL - Less Container Load</option>
                    </select>
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="targetSla" className="font-sans font-medium">Target SLA (Hari)</Label>
                    <Input 
                        id="targetSla"
                        type="number" 
                        placeholder="1" 
                        value={targetSla}
                        onChange={(e) => setTargetSla(e.target.value)}
                        className="font-mono"
                        disabled={isLoading}
                        required
                    />
                    </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Detail Alamat & Kontak */}
            <Card className="shadow-sm">
              <CardHeader className="pb-4 border-b border-slate-50 mb-4 bg-slate-50/50">
                <CardTitle className="font-sans text-lg text-slate-800">2. Detail Alamat & Kontak</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="alamatMuat" className="font-sans font-medium">Pengirim: Alamat Muat</Label>
                  <Textarea 
                    id="alamatMuat" 
                    placeholder="Alamat lengkap pengambilan barang..." 
                    value={alamatMuat}
                    onChange={(e) => setAlamatMuat(e.target.value)}
                    className="resize-none font-sans text-sm"
                    rows={2}
                    disabled={isLoading}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                    <div className="space-y-2">
                        <Label htmlFor="recipientName" className="font-sans font-medium">Nama Penerima</Label>
                        <Input 
                            id="recipientName" 
                            placeholder="Nama penerima..." 
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            className="font-sans"
                            disabled={isLoading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="recipientPhone" className="font-sans font-medium">No. Penerima</Label>
                        <Input 
                            id="recipientPhone" 
                            placeholder="0812..." 
                            value={recipientPhone}
                            onChange={(e) => setRecipientPhone(e.target.value)}
                            className="font-mono"
                            disabled={isLoading}
                        />
                    </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="alamatTujuan" className="font-sans font-medium">Penerima: Alamat Tujuan</Label>
                  <Textarea 
                    id="alamatTujuan" 
                    placeholder="Alamat lengkap tujuan pengiriman..." 
                    value={alamatTujuan}
                    onChange={(e) => setAlamatTujuan(e.target.value)}
                    className="resize-none font-sans text-sm"
                    rows={2}
                    disabled={isLoading}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Informasi Kargo */}
            <Card className="shadow-sm">
              <CardHeader className="pb-4 border-b border-slate-50 mb-4 bg-slate-50/50">
                <CardTitle className="font-sans text-lg text-slate-800">3. Informasi Kargo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="koli" className="font-sans font-medium text-xs text-slate-500 uppercase tracking-wider">Koli (Qty)</Label>
                      <Input 
                        id="koli" 
                        type="number" 
                        placeholder="0" 
                        value={qtyKoli}
                        onChange={(e) => setQtyKoli(e.target.value)}
                        className="font-mono" 
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="beratKg" className="font-sans font-medium text-xs text-slate-500 uppercase tracking-wider">Berat (Kg)</Label>
                      <Input 
                        id="beratKg" 
                        type="number" 
                        step="0.01"
                        placeholder="0.00" 
                        value={beratKg}
                        onChange={(e) => setBeratKg(e.target.value)}
                        className="font-mono" 
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="volume" className="font-sans font-medium text-xs text-slate-500 uppercase tracking-wider">Volume (m³)</Label>
                      <Input 
                        id="volume" 
                        type="number" 
                        step="0.01"
                        placeholder="0.00" 
                        value={volume}
                        onChange={(e) => setVolume(e.target.value)}
                        className="font-mono" 
                        disabled={isLoading}
                      />
                    </div>
                  </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            
            {/* Card 4: Informasi Armada & Vendor */}
            <Card className="shadow-sm border-teal-100">
              <CardHeader className="pb-4 border-b border-teal-50 mb-4 bg-teal-50/30">
                <CardTitle className="font-sans text-lg text-teal-800">4. Informasi Armada & Vendor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="nopol" className="font-sans font-medium">No. Plat / Nopol</Label>
                        <Input 
                            id="nopol" 
                            placeholder="B 1234 CD" 
                            value={newNopol}
                            onChange={(e) => setNewNopol(e.target.value.trimStart().toUpperCase())}
                            className="font-mono uppercase font-semibold" 
                            disabled={isLoading}
                        />
                    </div>
                    {isFTL && (
                        <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                            <Label htmlFor="jenisUnit" className="font-sans font-medium text-teal-700">Jenis Unit</Label>
                            <Input 
                                id="jenisUnit" 
                                placeholder="CDD / FUSO / Tronton" 
                                value={jenisUnit}
                                onChange={(e) => setJenisUnit(e.target.value)}
                                className="font-sans" 
                                disabled={isLoading}
                            />
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="driver" className="font-sans font-medium">Nama Driver</Label>
                      <Input 
                        id="driver" 
                        placeholder="Nama lengkap" 
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        className="font-sans" 
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="driverPhone" className="font-sans font-medium">No. Driver</Label>
                      <Input 
                        id="driverPhone" 
                        placeholder="0812..." 
                        value={driverPhone}
                        onChange={(e) => setDriverPhone(e.target.value)}
                        className="font-mono" 
                        disabled={isLoading}
                      />
                    </div>
                </div>

                {isFTL && (
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-teal-50 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="space-y-2">
                            <Label htmlFor="vendorPrice" className="font-sans font-medium text-teal-700">Harga Vendor</Label>
                            <select 
                                id="vendorPrice" 
                                value={vendorPrice}
                                onChange={(e) => setVendorPrice(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-sans"
                                disabled={isLoading}
                            >
                                <option value="">Pilih Harga Vendor...</option>
                                {VENDOR_PRICE_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="monitoringPj" className="font-sans font-medium text-teal-700">PJ Monitoring</Label>
                            <Input 
                                id="monitoringPj" 
                                placeholder="Nama staff monitoring" 
                                value={monitoringPj}
                                onChange={(e) => setMonitoringPj(e.target.value)}
                                className="font-sans" 
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                )}
              </CardContent>
            </Card>

            {/* Card 5: Penyelesaian & Biaya */}
            <Card className="shadow-sm border-blue-100">
              <CardHeader className="pb-4 border-b border-blue-50 mb-4 bg-blue-50/30">
                <CardTitle className="font-sans text-lg text-blue-800">5. Penyelesaian & Biaya</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="tkbm" className="font-sans font-medium">TKBM (Deskripsi/Nominal)</Label>
                        <Input 
                            id="tkbm" 
                            placeholder="Kuli muat Rp 50.000" 
                            value={tkbm}
                            onChange={(e) => setTkbm(e.target.value)}
                            className="font-sans" 
                            disabled={isLoading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="omset" className="font-sans font-medium">Omset (Pendapatan)</Label>
                        <Input 
                            id="omset" 
                            type="number"
                            placeholder="0" 
                            value={omset}
                            onChange={(e) => setOmset(e.target.value)}
                            className="font-mono text-green-700 bg-green-50/30" 
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="tglDiterima" className="font-sans font-medium">Tanggal Diterima</Label>
                    <Input 
                        id="tglDiterima" 
                        type="date"
                        value={tglDiterima}
                        onChange={(e) => setTglDiterima(e.target.value)}
                        className="font-sans"
                        disabled={isLoading}
                    />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keterangan" className="font-sans font-medium">Keterangan / Catatan Tambahan</Label>
                  <Textarea 
                    id="keterangan" 
                    placeholder="Catatan..." 
                    value={keteranganCustom}
                    onChange={(e) => setKeteranganCustom(e.target.value)}
                    className="resize-none font-sans text-sm"
                    rows={3}
                    disabled={isLoading}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Card 6: Indikator KPI & Evaluasi */}
            <Card className="shadow-sm border-purple-100">
              <CardHeader className="pb-4 border-b border-purple-50 mb-4 bg-purple-50/30">
                <CardTitle className="font-sans text-lg text-purple-800">6. Indikator KPI & Evaluasi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rateSla" className="font-sans font-medium text-purple-700">Rate SLA</Label>
                    <select 
                        id="rateSla" 
                        value={rateSla}
                        onChange={(e) => setRateSla(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-sans"
                        disabled={isLoading}
                    >
                        <option value="">Pilih Evaluasi SLA...</option>
                        <option value="Sesuai SLA">Sesuai SLA</option>
                        <option value="Lewat SLA Sudah konfirmasi">Lewat SLA Sudah konfirmasi</option>
                        <option value="Lewat SLA">Lewat SLA</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rateKomplain" className="font-sans font-medium text-purple-700">Rate Komplain</Label>
                    <select 
                        id="rateKomplain" 
                        value={rateKomplain}
                        onChange={(e) => setRateKomplain(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-sans"
                        disabled={isLoading}
                    >
                        <option value="">Pilih Rate Komplain...</option>
                        <option value="Tidak ada Komplain">Tidak ada Komplain</option>
                        <option value="Terdapat Komplain tetapi teratasi">Terdapat Komplain tetapi teratasi</option>
                        <option value="Komplain Berat">Komplain Berat</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rateKud" className="font-sans font-medium text-purple-700">Rate KUD</Label>
                    <select 
                        id="rateKud" 
                        value={rateKud}
                        onChange={(e) => setRateKud(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-sans"
                        disabled={isLoading}
                    >
                        <option value="">Pilih Rate KUD...</option>
                        <option value="Sesuai KUD">Sesuai KUD</option>
                        <option value="Lewat dari 5 Menit">Lewat dari 5 Menit</option>
                        <option value="Terjawab oleh Team Marketing">Terjawab oleh Team Marketing</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kecepatanDoc" className="font-sans font-medium text-purple-700">Rate Doc kembali</Label>
                    <select 
                        id="kecepatanDoc" 
                        value={kecepatanDoc}
                        onChange={(e) => setKecepatanDoc(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-sans"
                        disabled={isLoading}
                    >
                        <option value="">Pilih Rate Doc...</option>
                        <option value="Doc cepat kembali">Doc cepat kembali</option>
                        <option value="Doc lambat kembali">Doc lambat kembali</option>
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="hargaVendor" className="font-sans font-medium text-purple-700">Harga Vendor</Label>
                    <select 
                        id="hargaVendor" 
                        value={hargaVendor}
                        onChange={(e) => setHargaVendor(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-sans"
                        disabled={isLoading}
                    >
                        <option value="">Pilih Harga Vendor...</option>
                        <option value="Harga Standar">Harga Standar</option>
                        <option value="Harga Mahal">Harga Mahal</option>
                        <option value="Harga Mahal Momen">Harga Mahal Momen</option>
                        <option value="Memakai Unit CAM">Memakai Unit CAM</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            </div></div>
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isLoading} className="bg-orange-600 hover:bg-orange-700 text-white w-full md:w-auto px-8">
                {isLoading ? 'Menyimpan...' : 'Simpan Data Pengiriman'}
              </Button>
            </div>
          </form>

      {/* ═══════════════ LOG DATA TERAKHIR ═══════════════ */}
      <Card className="shadow-sm border-slate-200 mt-6">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-bold text-slate-800 font-sans">Log Data Terakhir</h3>
            <div className="flex gap-2 items-center">
              {/* Status Barang Filter (Tugas 4) */}
              <select
                value={statusBarangFilter}
                onChange={(e) => setStatusBarangFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm font-sans focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">Semua Status</option>
                <option value="warehouse">Di Warehouse (JKT/SMG)</option>
                <option value="berangkat">Sudah Berangkat</option>
              </select>
              <div className="flex gap-1">
                <Input 
                  placeholder="Cari STT / Customer..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-[200px] bg-white h-9"
                />
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => fetchShipments(searchTerm)}
                  className="h-9"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs">Tgl Masuk</TableHead>
                  <TableHead className="text-xs">No. STT</TableHead>
                  <TableHead className="text-xs">Layanan</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data
                  .filter(item => {
                    if (statusBarangFilter === "warehouse") {
                      const s = (item.status_pengiriman || "").toLowerCase();
                      return s.includes("di lokasi muat") || s.includes("selesai muat") || s.includes("bongkar") || s === "in" || s.includes("masuk");
                    }
                    if (statusBarangFilter === "berangkat") {
                      const s = (item.status_pengiriman || "").toLowerCase();
                      return s.includes("di perjalanan") || s.includes("selesai bongkar") || s === "out" || s.includes("keluar") || s.includes("dokumen kembali");
                    }
                    return true;
                  })
                  .map(item => (
                  <TableRow key={item.id} className="hover:bg-orange-50/30">
                    <TableCell className="text-xs text-slate-600">{item.tgl_masuk ? new Date(item.tgl_masuk).toLocaleDateString('id-ID') : '-'}</TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-orange-700">{item.no_stt || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-semibold">{item.jenis_layanan}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700 font-medium">{item.nama_customer_teks || item.cabang_customer || '-'}</TableCell>
                    <TableCell>
                      <span className="text-[10px] px-2 py-1 bg-slate-100 text-slate-600 rounded-md font-medium">{item.status_pengiriman || '-'}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEdit(item)}
                          className="h-7 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        >
                          Edit
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(item.id!, item.no_stt)}
                          className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                      Belum ada data. Masukkan data pengiriman baru atau cari STT di atas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
