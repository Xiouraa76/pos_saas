"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/utils/supabase/client";
import { AlertTriangle } from "lucide-react";

interface GenericData {
  id?: string;
  [key: string]: any;
}

// ─── Sanitasi & Batas Karakter ────────────────────────────────────────
const MAX_LEN = {
  short: 200,
  medium: 500,
  long: 2000,
};

function sanitize(val: string, maxLen: number = MAX_LEN.short): string {
  return val.trim().slice(0, maxLen);
}

function sanitizeOrNull(val: string, maxLen: number = MAX_LEN.short): string | null {
  const trimmed = val.trim().slice(0, maxLen);
  return trimmed === "" ? null : trimmed;
}

export function FormInputFtl() {
  const supabase = createClient();
  const [data, setData] = useState<GenericData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  const [isLoading, setIsLoading] = useState(false);
  const [slaOptions, setSlaOptions] = useState<GenericData[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination State
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 20;

  // FTL Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nopol, setNopol] = useState("");
  const [driverName, setDriverName] = useState("");
  const [alamatMuat, setAlamatMuat] = useState("");
  const [alamatTujuan, setAlamatTujuan] = useState("");
  const [slaPerusahaan, setSlaPerusahaan] = useState("");
  
  const [waktuStartMuat, setWaktuStartMuat] = useState("");
  const [waktuSelesaiTf, setWaktuSelesaiTf] = useState("");
  const [waktuTibaSla, setWaktuTibaSla] = useState("");
  const [waktuTibaReal, setWaktuTibaReal] = useState("");
  
  const [uraianPerjalanan, setUraianPerjalanan] = useState("");
  const [permintaanCustTiba, setPermintaanCustTiba] = useState("");
  const [isBermasalah, setIsBermasalah] = useState(false);

  // ─── Auto-compute status from time fields ────────────────────────
  function computeFtlStatus(fields: { waktuTibaReal: string; waktuTibaSla: string; waktuSelesaiTf: string; waktuStartMuat: string; isBermasalah: boolean; slaPerusahaan: string; }) {
    if (fields.isBermasalah) {
      return { status: "Bermasalah" as const, detail: "Bermasalah - Ditandai manual oleh admin" };
    }
    if (fields.waktuTibaReal) {
      return { status: "Selesai Bongkar" as const, detail: `Selesai Bongkar - ${fields.slaPerusahaan || 'Tiba di tujuan'}` };
    }
    if (fields.waktuSelesaiTf || fields.waktuTibaSla) {
      return { status: "Di Perjalanan" as const, detail: `Di Perjalanan - ${fields.slaPerusahaan || 'Menuju tujuan'}` };
    }
    if (fields.waktuStartMuat) {
      return { status: "Di Lokasi Muat" as const, detail: `Di Lokasi Muat - ${fields.slaPerusahaan || 'Proses muat'}` };
    }
    return { status: "Custom" as const, detail: "Baru dibuat - Belum ada update waktu" };
  }

  const fetchSlaOptions = async () => {
    try {
      const { data: slas } = await supabase.from('master_sla_perusahaan').select('*');
      setSlaOptions(slas || []);
    } catch (error) {
      console.error("Failed to fetch SLA routes", error);
    }
  };

  const fetchFtlShipments = async (term = debouncedSearchTerm, currentPage = page, isLoadMore = false) => {
    try {
      let query = supabase.from("shipments")
        .select(`*, master_vehicles(nopol)`)
        .eq('jenis_layanan', 'FTL')
        .order('created_at', { ascending: false });

      // Note: statusFilter is applied client-side after fetch for simplicity

      if (term && term.trim() !== "") {
        const { data: vData } = await supabase.from('master_vehicles').select('id').ilike('nopol', `%${term}%`);
        const vIds = vData?.map(v => v.id) || [];
        
        if (vIds.length > 0) {
          query = query.or(`driver_name.ilike.%${term}%,id_vehicle.in.(${vIds.join(',')})`);
        } else {
          query = query.ilike('driver_name', `%${term}%`);
        }
      }

      const from = currentPage * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data: shipData, error } = await query.range(from, to);
      if (error) throw error;
      
      const newData = shipData || [];
      setHasMore(newData.length >= ITEMS_PER_PAGE);

      if (isLoadMore) {
        setData(prev => {
          const existingIds = new Set(prev.map(item => item.id));
          const uniqueNewData = newData.filter(item => !existingIds.has(item.id));
          return [...prev, ...uniqueNewData];
        });
      } else {
        setData(newData);
      }
    } catch (error: any) {
      console.error("Gagal mengambil log eksekusi FTL:", error?.message || JSON.stringify(error));
    }
  };
  useEffect(() => {
    fetchSlaOptions();
    fetchFtlShipments(debouncedSearchTerm, 0, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(0);
    fetchFtlShipments(debouncedSearchTerm, 0, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFtlShipments(debouncedSearchTerm, nextPage, true);
  };

  const resetForm = () => {
    setEditingId(null);
    setNopol(""); setDriverName(""); setAlamatMuat(""); setAlamatTujuan("");
    setSlaPerusahaan(""); setWaktuStartMuat(""); setWaktuSelesaiTf("");
    setWaktuTibaSla(""); setWaktuTibaReal(""); setUraianPerjalanan(""); setPermintaanCustTiba("");
    setIsBermasalah(false);
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setNopol(item.master_vehicles?.nopol || "");
    setDriverName(item.driver_name || "");
    setAlamatMuat(item.alamat_muat || "");
    setAlamatTujuan(item.alamat_tujuan || "");
    setSlaPerusahaan(item.sla_perusahaan || "");
    
    const formatDateTimeLocal = (dateString: string | null) => {
      if (!dateString) return "";
      try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString.slice(0, 16);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      } catch (e) {
        return "";
      }
    };

    setWaktuStartMuat(formatDateTimeLocal(item.waktu_start_muat));
    setWaktuSelesaiTf(formatDateTimeLocal(item.waktu_selesai_tf));
    setWaktuTibaSla(formatDateTimeLocal(item.waktu_tiba_sla));
    setWaktuTibaReal(formatDateTimeLocal(item.waktu_tiba_real));
    setUraianPerjalanan(item.uraian_perjalanan || "");
    setPermintaanCustTiba(item.keterangan_custom || "");
    setIsBermasalah(item.status_pengiriman === "Bermasalah");
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Resolve Vehicle (with trim validation)
      let vehicleId = null;
      const trimmedNopol = sanitize(nopol);
      if (trimmedNopol) {
        const { data: vData } = await supabase.from("master_vehicles").select("id").eq("nopol", trimmedNopol).single();
        if (vData) {
          vehicleId = vData.id;
        } else {
          const { data: newV } = await supabase.from("master_vehicles").insert({ nopol: trimmedNopol }).select("id").single();
          if (newV) vehicleId = newV.id;
        }
      }

      // 2. Validasi driver name (CELAH-03 fix)
      const trimmedDriver = sanitize(driverName);
      if (driverName.length > 0 && trimmedDriver === "") {
        alert("Nama Driver tidak boleh hanya berisi spasi.");
        setIsLoading(false);
        return;
      }

      // 3. Auto-compute status from time fields
      const computed = computeFtlStatus({
        waktuTibaReal, waktuTibaSla, waktuSelesaiTf, waktuStartMuat,
        isBermasalah, slaPerusahaan
      });

      // 4. Insert FTL Shipment (semua field di-sanitize, CELAH-05 fix)
      const payload: Record<string, any> = {
        jenis_layanan: 'FTL',
        vehicle_id: vehicleId,
        driver_name: sanitizeOrNull(driverName),
        alamat_muat: sanitizeOrNull(alamatMuat, MAX_LEN.medium),
        alamat_tujuan: sanitizeOrNull(alamatTujuan, MAX_LEN.medium),
        sla_perusahaan: sanitizeOrNull(slaPerusahaan),
        waktu_start_muat: waktuStartMuat || null,
        waktu_selesai_tf: waktuSelesaiTf || null,
        waktu_tiba_sla: waktuTibaSla || null,
        waktu_tiba_real: waktuTibaReal || null,
        uraian_perjalanan: sanitizeOrNull(uraianPerjalanan, MAX_LEN.long),
        keterangan_custom: sanitizeOrNull(permintaanCustTiba, MAX_LEN.long),
        status_pengiriman: computed.status,
        status_detail_text: computed.detail,
      };

      if (editingId) {
        const { error } = await supabase.from("shipments").update(payload).eq("id", editingId);
        if (error) throw error;
        alert("Data FTL Berhasil Diperbarui!");
      } else {
        const { error } = await supabase.from("shipments").insert(payload);
        if (error) throw error;
        alert("Data FTL Berhasil Disimpan!");
      }
      
      resetForm();
      
      setPage(0);
      await fetchFtlShipments(debouncedSearchTerm, 0, false);
    } catch (err: unknown) {
      console.error(err);
      alert("Gagal menyimpan data FTL: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-orange-100 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="font-sans text-lg text-slate-800">
            {editingId ? "Edit Data Perjalanan FTL" : "Form Input Data Perjalanan FTL"}
          </CardTitle>
          <CardDescription>Catat detail armada, driver, SLA rute, dan waktu perjalanan riil.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nopol Armada</Label>
                <Input value={nopol} onChange={e => setNopol(e.target.value.toUpperCase())} placeholder="B 1234 CD" className="font-mono uppercase font-semibold" disabled={isLoading} required />
              </div>
              <div className="space-y-2">
                <Label>Nama Driver</Label>
                <Input value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="Nama supir..." disabled={isLoading} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lokasi Muat</Label>
                <Textarea value={alamatMuat} onChange={e => setAlamatMuat(e.target.value)} placeholder="Alamat lengkap lokasi muat..." rows={2} className="resize-none" disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label>Lokasi Bongkar</Label>
                <Textarea value={alamatTujuan} onChange={e => setAlamatTujuan(e.target.value)} placeholder="Alamat lengkap lokasi bongkar..." rows={2} className="resize-none" disabled={isLoading} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>SLA Perusahaan (Rute)</Label>
              <select 
                value={slaPerusahaan}
                onChange={e => setSlaPerusahaan(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={isLoading}
                required
              >
                <option value="">Pilih Rute SLA...</option>
                {slaOptions.map(sla => (
                  <option key={sla.id} value={sla.route_name}>{sla.route_name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="space-y-2">
                <Label className="text-xs">Start Pukul Selesai Muat</Label>
                <Input type="datetime-local" value={waktuStartMuat} onChange={e => setWaktuStartMuat(e.target.value)} className="text-sm font-mono" disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Start Pukul Selesai Di TF</Label>
                <Input type="datetime-local" value={waktuSelesaiTf} onChange={e => setWaktuSelesaiTf(e.target.value)} className="text-sm font-mono" disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Tiba SLA Pukul</Label>
                <Input type="datetime-local" value={waktuTibaSla} onChange={e => setWaktuTibaSla(e.target.value)} className="text-sm font-mono" disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-orange-700 font-bold">Tiba Real Pukul</Label>
                <Input type="datetime-local" value={waktuTibaReal} onChange={e => setWaktuTibaReal(e.target.value)} className="text-sm font-mono bg-orange-50 border-orange-200" disabled={isLoading} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Jurnal / Uraian Di Perjalanan</Label>
              <Textarea 
                value={uraianPerjalanan} 
                onChange={e => setUraianPerjalanan(e.target.value)} 
                placeholder="Tuliskan kronologi kendala, istirahat, macet, atau laporan supir..." 
                rows={4} 
                className="resize-none bg-slate-50"
                disabled={isLoading} 
              />
            </div>
            
             <div className="space-y-2">
               <Label>Permintaan Cust Tiba & Keterangan</Label>
               <Input value={permintaanCustTiba} onChange={e => setPermintaanCustTiba(e.target.value)} placeholder="Keterangan tambahan..." disabled={isLoading} />
             </div>

             {/* ─── Bermasalah Override ─── */}
             <div className="flex items-center gap-3 p-3 rounded-lg border border-red-200 bg-red-50/50">
               <input
                 type="checkbox"
                 id="bermasalah_ftl"
                 checked={isBermasalah}
                 onChange={e => setIsBermasalah(e.target.checked)}
                 className="rounded border-red-300 text-red-600 focus:ring-red-500 h-4 w-4"
                 disabled={isLoading}
               />
               <label htmlFor="bermasalah_ftl" className="flex items-center gap-2 text-sm font-medium text-red-700 cursor-pointer">
                 <AlertTriangle className="w-4 h-4" />
                 Tandai Bermasalah (Truk mogok, kecelakaan, kendala berat)
               </label>
             </div>

             {/* ─── Auto Status Preview ─── */}
             {(() => {
               const preview = computeFtlStatus({ waktuTibaReal, waktuTibaSla, waktuSelesaiTf, waktuStartMuat, isBermasalah, slaPerusahaan });
               const colorMap: Record<string, string> = {
                 "Bermasalah": "bg-red-100 text-red-700 border-red-200",
                 "Selesai Bongkar": "bg-emerald-100 text-emerald-700 border-emerald-200",
                 "Di Perjalanan": "bg-orange-100 text-orange-700 border-orange-200",
                 "Di Lokasi Muat": "bg-blue-100 text-blue-700 border-blue-200",
                 "Custom": "bg-slate-100 text-slate-600 border-slate-200",
               };
               return (
                 <div className="flex items-center gap-2 text-xs">
                   <span className="text-slate-500 font-medium">Status otomatis:</span>
                   <span className={`px-2.5 py-1 rounded-full border font-semibold ${colorMap[preview.status] || colorMap.Custom}`}>
                     {preview.status}
                   </span>
                   <span className="text-slate-400 truncate">{preview.detail}</span>
                 </div>
               );
             })()}

             <div className="flex justify-end pt-4 gap-2">
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm} disabled={isLoading}>
                  Batal Edit
                </Button>
              )}
              <Button type="submit" disabled={isLoading} className="bg-orange-600 hover:bg-orange-700 text-white w-full md:w-auto px-8">
                {isLoading ? 'Menyimpan...' : (editingId ? 'Update Log FTL' : 'Simpan Log FTL')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabel Log FTL Independen */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4 border-b bg-slate-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="font-sans text-lg">Log Eksekusi Terakhir (FTL)</CardTitle>
            <div className="flex gap-2 items-center">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm font-sans focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">Semua Status</option>
                <option value="Di Lokasi Muat">Di Lokasi Muat</option>
                <option value="Di Perjalanan">Di Perjalanan</option>
                <option value="Selesai Bongkar">Selesai Bongkar</option>
                <option value="Bermasalah">Bermasalah</option>
                <option value="belum">Belum Ada Status</option>
              </select>
              <Input 
                placeholder="Cari Driver atau Nopol..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs bg-white"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tgl Masuk</TableHead>
                <TableHead>Nopol</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Rute SLA</TableHead>
                <TableHead>Status Terakhir</TableHead>
                <TableHead>Tiba Real</TableHead>
                <TableHead>Jurnal Perjalanan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data
                .filter(item => {
                  if (statusFilter === "all") return true;
                  if (statusFilter === "belum") return !item.status_pengiriman || item.status_pengiriman === "Custom";
                  return item.status_pengiriman === statusFilter;
                })
                .map(item => {
                  const statusColor: Record<string, string> = {
                    "Bermasalah": "bg-red-100 text-red-700",
                    "Selesai Bongkar": "bg-emerald-100 text-emerald-700",
                    "Dokumen Kembali": "bg-emerald-100 text-emerald-700",
                    "Di Perjalanan": "bg-orange-100 text-orange-700",
                    "Bongkar": "bg-amber-100 text-amber-700",
                    "Di Lokasi Muat": "bg-blue-100 text-blue-700",
                    "Selesai Muat": "bg-blue-100 text-blue-700",
                    "Custom": "bg-slate-100 text-slate-600",
                  };
                  const statusBadgeClass = statusColor[item.status_pengiriman] || "bg-slate-100 text-slate-500";
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-'}</TableCell>
                      <TableCell className="font-mono font-medium">{item.master_vehicles?.nopol || '-'}</TableCell>
                      <TableCell>{item.driver_name || '-'}</TableCell>
                      <TableCell>{item.sla_perusahaan || '-'}</TableCell>
                      <TableCell>
                        {item.status_pengiriman ? (
                          <Badge className={`${statusBadgeClass} border-none text-xs font-semibold`}>
                            {item.status_pengiriman}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Belum ada status</span>
                        )}
                      </TableCell>
                      <TableCell>{item.waktu_tiba_real ? new Date(item.waktu_tiba_real).toLocaleString('id-ID') : 'Belum Tiba'}</TableCell>
                      <TableCell className="max-w-xs truncate text-xs" title={item.uraian_perjalanan}>{item.uraian_perjalanan || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              {data.filter(item => {
                if (statusFilter === "all") return true;
                if (statusFilter === "belum") return !item.status_pengiriman || item.status_pengiriman === "Custom";
                return item.status_pengiriman === statusFilter;
              }).length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-slate-500">Data FTL tidak ditemukan.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {hasMore && (
            <div className="flex justify-center p-4 border-t border-slate-100 bg-slate-50">
              <Button 
                variant="outline" 
                onClick={handleLoadMore}
                className="text-slate-600 hover:text-slate-800"
              >
                Muat Lebih Banyak
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
