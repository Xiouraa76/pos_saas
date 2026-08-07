"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/utils/supabase/client";
import { useDebounce } from "use-debounce";

interface GenericData {
  id?: string;
  [key: string]: any;
}


export function FormInputLtlLcl() {
  const supabase = createClient();
  const [data, setData] = useState<GenericData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionUser, setSessionUser] = useState<any>(null);

  // Pagination State
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 20;

  // LTL/LCL Form State
  const [noStt, setNoStt] = useState("");
  
  // Timeline State
  const [timelineDate, setTimelineDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [timelineStatus, setTimelineStatus] = useState("IN");
  const [timelineLocation, setTimelineLocation] = useState("");
  const [timelineRemarks, setTimelineRemarks] = useState("");const fetchSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: perm } = await supabase.from('user_permissions').select('display_name').eq('user_id', user.id).single();
      setSessionUser(perm?.display_name || user.email);
    }
  };

  const fetchLtlShipments = async (term = debouncedSearchTerm, currentPage = page, isLoadMore = false) => {
    try {
      let query = supabase.from("shipments")
        .select(`*`)
        .in('jenis_layanan', ['LTL', 'LCL'])
        .order('created_at', { ascending: false });

      if (term && term.trim() !== "") {
        query = query.ilike('no_stt', `%${term}%`);
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
      console.error("Gagal mengambil log eksekusi LTL/LCL:", error?.message || JSON.stringify(error));
    }
  };
  useEffect(() => {
    fetchSession();
    fetchLtlShipments(debouncedSearchTerm, 0, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(0);
    fetchLtlShipments(debouncedSearchTerm, 0, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLtlShipments(debouncedSearchTerm, nextPage, true);
  };

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noStt) {
      alert("Masukkan No. STT terlebih dahulu!");
      return;
    }

    setIsLoading(true);

    try {
      // Find STT
      const { data: existingShipment, error: findError } = await supabase
        .from('shipments')
        .select('id, timeline_checkpoints')
        .eq('no_stt', noStt)
        .in('jenis_layanan', ['LTL', 'LCL'])
        .single();

      if (findError || !existingShipment) {
        alert("STT LTL/LCL tidak ditemukan. Pastikan STT sudah terdaftar.");
        setIsLoading(false);
        return;
      }

      // Append to JSONB
      const newCheckpoint = {
        tanggal_waktu: timelineDate,
        status: timelineStatus,
        lokasi_checkpoint: timelineLocation,
        keterangan_tambahan: timelineRemarks,
        diperbarui_oleh: sessionUser
      };

      let currentCheckpoints: unknown[] = [];
      try {
        if (Array.isArray(existingShipment.timeline_checkpoints)) {
          currentCheckpoints = existingShipment.timeline_checkpoints;
        } else if (typeof existingShipment.timeline_checkpoints === 'string') {
          currentCheckpoints = JSON.parse(existingShipment.timeline_checkpoints);
          if (!Array.isArray(currentCheckpoints)) currentCheckpoints = [];
        }
      } catch (e) {
        currentCheckpoints = [];
      }
        
      const updatedCheckpoints = [...currentCheckpoints, newCheckpoint];

      const { error: updateError } = await supabase
        .from('shipments')
        .update({ 
            timeline_checkpoints: updatedCheckpoints,
            status_pengiriman: timelineStatus // update status utama
        })
        .eq('id', existingShipment.id);

      if (updateError) throw updateError;

      alert(`Update Timeline STT ${noStt} berhasil ditambahkan!`);
      
      // Reset form (except STT)
      setTimelineStatus("IN");
      setTimelineLocation("");
      setTimelineRemarks("");
      setTimelineDate(new Date().toISOString().slice(0, 16));
      
      setPage(0);
      await fetchLtlShipments(debouncedSearchTerm, 0, false);
    } catch (err: unknown) {
      console.error(err);
      alert("Gagal menyimpan timeline: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-indigo-100 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="font-sans text-lg text-slate-800">Timeline Builder (LTL & LCL)</CardTitle>
          <CardDescription>Pencarian STT dan Penambahan Update Harian Perjalanan Kargo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddUpdate} className="space-y-6">
            <div className="space-y-2">
              <Label>Nomor STT (LTL / LCL)</Label>
              <Input 
                value={noStt} 
                onChange={e => setNoStt(e.target.value.toUpperCase())} 
                placeholder="Masukkan Nomor STT yang dicari..." 
                className="font-mono uppercase font-bold text-indigo-700 bg-indigo-50/30 max-w-sm" 
                disabled={isLoading} 
                required 
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
              <div className="space-y-2">
                <Label className="text-xs">Waktu Update</Label>
                <Input type="datetime-local" value={timelineDate} onChange={e => setTimelineDate(e.target.value)} className="text-sm font-mono" disabled={isLoading} required />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Status Checkpoint</Label>
                <select 
                  value={timelineStatus}
                  onChange={e => setTimelineStatus(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={isLoading}
                  required
                >
                  <option value="IN">IN (Masuk Hub)</option>
                  <option value="OUT">OUT (Keluar Hub / Berangkat)</option>
                  <option value="Di Perjalanan">Di Perjalanan</option>
                  <option value="Bongkar">Proses Bongkar</option>
                  <option value="Selesai Bongkar">Selesai Bongkar (Done)</option>
                  <option value="Bermasalah">Bermasalah / Tertahan</option>
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs">Lokasi Checkpoint / Cabang</Label>
                <Input value={timelineLocation} onChange={e => setTimelineLocation(e.target.value)} placeholder="Misal: Hub Transit Semarang" disabled={isLoading} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Keterangan Tambahan (Opsional)</Label>
              <Textarea 
                value={timelineRemarks} 
                onChange={e => setTimelineRemarks(e.target.value)} 
                placeholder="Catatan update..." 
                rows={2} 
                className="resize-none"
                disabled={isLoading} 
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full md:w-auto px-8">
                {isLoading ? 'Menyimpan...' : '+ Tambah Update Harian'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabel Log LTL Independen */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4 border-b bg-slate-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="font-sans text-lg">Log Eksekusi Terakhir (LTL/LCL)</CardTitle>
            <Input 
              placeholder="Cari STT..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs bg-white"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tgl Masuk</TableHead>
                <TableHead>No. STT</TableHead>
                <TableHead>Layanan</TableHead>
                <TableHead>Status Terakhir</TableHead>
                <TableHead>Riwayat Timeline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(item => {
                  const timelines = Array.isArray(item.timeline_checkpoints) ? item.timeline_checkpoints : [];
                  const lastTimeline = timelines.length > 0 ? timelines[timelines.length - 1] : null;
                  return (
                    <TableRow key={item.id}>
                    <TableCell>{item.tgl_masuk ? new Date(item.tgl_masuk).toLocaleDateString('id-ID') : '-'}</TableCell>
                    <TableCell className="font-mono font-medium text-indigo-700">{item.no_stt || '-'}</TableCell>
                    <TableCell>
                        <span className="px-2 py-1 rounded bg-slate-100 text-xs font-semibold">{item.jenis_layanan}</span>
                    </TableCell>
                    <TableCell>
                        {item.status_pengiriman || '-'}
                    </TableCell>
                    <TableCell className="max-w-xs text-xs">
                        {lastTimeline ? (
                            <div>
                                <span className="font-semibold text-slate-700">{new Date(lastTimeline.tanggal_waktu).toLocaleString('id-ID')}</span> - {lastTimeline.lokasi_checkpoint} <br/>
                                <span className="text-slate-500">[{lastTimeline.status}] {lastTimeline.keterangan_tambahan}</span>
                            </div>
                        ) : 'Belum ada timeline'}
                    </TableCell>
                    </TableRow>
                  );
              })}
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-slate-500">Data LTL/LCL tidak ditemukan.</TableCell>
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
