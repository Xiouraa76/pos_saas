"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface GenericData {
  id?: string;
  [key: string]: any;
}


export default function SlaSettingsPage() {
  const supabase = createClient();
  const [routes, setRoutes] = useState<GenericData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [routeName, setRouteName] = useState("");



  const fetchRoutes = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('master_sla_perusahaan')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error("Failed to fetch routes", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRoutes();
  }, []);

  const openAddModal = () => {
    setRouteName("");
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus rute SLA "${name}"?`)) {
      try {
        const { error } = await supabase
          .from('master_sla_perusahaan')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
         
        fetchRoutes();
      } catch (err) {
        console.error(err);
        alert("Gagal menghapus rute.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeName.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('master_sla_perusahaan')
        .insert({ route_name: routeName });
        
      if (error) throw error;
      
      setIsModalOpen(false);
       
      fetchRoutes();
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan sistem saat menyimpan rute.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 overflow-y-auto bg-slate-50">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-sans text-slate-800">
            SLA Perusahaan (FTL)
          </h2>
          <p className="text-muted-foreground mt-1">
            Kelola daftar rute dan standar waktu SLA untuk layanan operasional FTL.
          </p>
        </div>
        <Button onClick={openAddModal} className="bg-orange-600 hover:bg-orange-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Tambah Rute
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4 border-b">
          <CardTitle className="font-sans text-lg">Daftar Rute SLA</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-sans font-semibold">Nama Rute / Keterangan SLA</TableHead>
                <TableHead className="font-sans font-semibold">Tanggal Ditambahkan</TableHead>
                <TableHead className="font-sans font-semibold text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-slate-500 py-8">Memuat data...</TableCell>
                </TableRow>
              ) : routes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-slate-500 py-8">Belum ada data rute SLA.</TableCell>
                </TableRow>
              ) : (
                routes.map((route) => (
                  <TableRow key={route.id}>
                    <TableCell className="font-medium">{route.route_name}</TableCell>
                    <TableCell>{new Date(route.created_at).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(route.id || '', route.route_name || '')} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Add SLA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold">Tambah Rute SLA Baru</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Nama Rute & SLA</Label>
                <Input 
                  value={routeName} 
                  onChange={e => setRouteName(e.target.value)} 
                  required 
                  placeholder="Misal: Tol Panjang 14 - 15 Jam"
                />
                <p className="text-xs text-slate-500">Teks ini akan muncul secara persis di opsi Dropdown Form FTL.</p>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
                <Button type="submit" disabled={isSubmitting} className="bg-orange-600 hover:bg-orange-700 text-white">
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
