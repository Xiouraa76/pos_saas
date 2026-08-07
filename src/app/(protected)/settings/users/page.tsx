"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Settings2, Trash2 } from "lucide-react";

interface GenericData {
  id?: string;
  [key: string]: any;
}


export default function UsersSettingsPage() {
  const [users, setUsers] = useState<GenericData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("staff");
  const [canAccessDashboard, setCanAccessDashboard] = useState(false);
  const [canAccessPos, setCanAccessPos] = useState(false);
  const [canAccessSettings, setCanAccessSettings] = useState(false);
  const [canAccessFtl, setCanAccessFtl] = useState(false);
  const [canAccessLtl, setCanAccessLtl] = useState(false);
  const [canAccessLcl, setCanAccessLcl] = useState(false);



  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, []);

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId("");
    setEmail("");
    setPassword("");
    setDisplayName("");
    setRole("staff");
    setCanAccessDashboard(false);
    setCanAccessPos(false);
    setCanAccessSettings(false);
    setCanAccessFtl(false);
    setCanAccessLtl(false);
    setCanAccessLcl(false);
    setIsModalOpen(true);
  };

  const openEditModal = (user: Record<string, any>) => {
    setIsEditing(true);
    setEditingId(user.id);
    setEmail(user.email);
    setPassword(""); // Keep empty, only fill if changing
    setDisplayName(user.permissions?.display_name || "");
    setRole(user.permissions?.role || "staff");
    setCanAccessDashboard(user.permissions?.can_access_dashboard || false);
    setCanAccessPos(user.permissions?.can_access_pos || false);
    setCanAccessSettings(user.permissions?.can_access_settings || false);
    setCanAccessFtl(user.permissions?.can_access_ftl || false);
    setCanAccessLtl(user.permissions?.can_access_ltl || false);
    setCanAccessLcl(user.permissions?.can_access_lcl || false);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, email: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus pengguna ${email}?`)) {
      try {
        const res = await fetch(`/api/admin/users?id=${id}&email=${email}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        
        if (data.error) {
          alert(data.error);
        } else {
           
          fetchUsers();
        }
      } catch (err) {
        console.error(err);
        alert("Gagal menghapus pengguna.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const payload = {
      id: editingId,
      email,
      password,
      display_name: displayName,
      role,
      can_access_dashboard: canAccessDashboard,
      can_access_pos: canAccessPos,
      can_access_settings: canAccessSettings,
      can_access_ftl: canAccessFtl,
      can_access_ltl: canAccessLtl,
      can_access_lcl: canAccessLcl
    };

    try {
      const res = await fetch('/api/admin/users', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setIsModalOpen(false);
         
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 overflow-y-auto bg-slate-50">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-sans text-slate-800">
            User Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Kelola staf, hak akses, dan kata sandi pengguna aplikasi.
          </p>
        </div>
        <Button onClick={openAddModal} className="bg-slate-900 hover:bg-slate-800 text-white">
          <Plus className="mr-2 h-4 w-4" /> Tambah Staf
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4 border-b">
          <CardTitle className="font-sans text-lg">Daftar Pengguna</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-sans font-semibold">Email / Username</TableHead>
                <TableHead className="font-sans font-semibold">Nama Lengkap</TableHead>
                <TableHead className="font-sans font-semibold">Role</TableHead>
                <TableHead className="font-sans font-semibold">Hak Akses</TableHead>
                <TableHead className="font-sans font-semibold text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500 py-8">Memuat data...</TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500 py-8">Belum ada pengguna.</TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.permissions?.display_name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{user.permissions?.role || "Staff"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.permissions?.can_access_dashboard ? (
                           <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none">Dashboard</Badge>
                        ) : null}
                        {user.permissions?.can_access_pos ? (
                           <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-none">POS</Badge>
                        ) : null}
                        {user.permissions?.can_access_settings ? (
                           <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200 border-none">Settings</Badge>
                        ) : null}
                        {user.permissions?.can_access_ftl ? (
                           <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-none">FTL</Badge>
                        ) : null}
                        {user.permissions?.can_access_ltl ? (
                           <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border-none">LTL</Badge>
                        ) : null}
                        {user.permissions?.can_access_lcl ? (
                           <Badge className="bg-pink-100 text-pink-800 hover:bg-pink-200 border-none">LCL</Badge>
                        ) : null}
                        
                        {!user.permissions?.can_access_dashboard && !user.permissions?.can_access_pos && !user.permissions?.can_access_settings && !user.permissions?.can_access_ftl && !user.permissions?.can_access_ltl && !user.permissions?.can_access_lcl && (
                            <Badge className="bg-slate-100 text-slate-500 border-none">Diblokir / No Access</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(user)} className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(user.id || '', user.email || '')} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Basic Modal Implementation */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold">{isEditing ? 'Edit Pengguna' : 'Tambah Staf Baru'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Email / Username Login</Label>
                <Input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  disabled={isEditing} // Email tidak bisa diganti jika edit
                  placeholder="staf1@cam.local"
                />
              </div>
              <div className="space-y-2">
                <Label>Nama Lengkap (Display Name)</Label>
                <Input 
                  value={displayName} 
                  onChange={e => setDisplayName(e.target.value)} 
                  required 
                  placeholder="Budi Staf"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="staff">Staff Operasional</option>
                    <option value="finance">Finance</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Password {isEditing && "(Kosongkan jika tidak ingin ganti)"}</Label>
                <Input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required={!isEditing} 
                />
              </div>

              <div className="pt-4 border-t space-y-3">
                <Label className="text-slate-800 font-semibold">Pengaturan Hak Akses</Label>
                
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="acc_dash" checked={canAccessDashboard} onChange={e => setCanAccessDashboard(e.target.checked)} className="rounded border-slate-300" />
                  <label htmlFor="acc_dash" className="text-sm font-medium leading-none">Akses Menu Dashboard & Analytics</label>
                </div>

                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="acc_pos" checked={canAccessPos} onChange={e => setCanAccessPos(e.target.checked)} className="rounded border-slate-300" />
                  <label htmlFor="acc_pos" className="text-sm font-medium leading-none">Akses Menu POS / Delivery Management</label>
                </div>

                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="acc_set" checked={canAccessSettings} onChange={e => setCanAccessSettings(e.target.checked)} className="rounded border-slate-300" />
                  <label htmlFor="acc_set" className="text-sm font-medium leading-none">Akses Menu Settings (User Management)</label>
                </div>
                
                <Label className="text-slate-800 font-semibold pt-2 block">Hak Akses Layanan Khusus</Label>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="acc_ftl" checked={canAccessFtl} onChange={e => setCanAccessFtl(e.target.checked)} className="rounded border-slate-300" />
                  <label htmlFor="acc_ftl" className="text-sm font-medium leading-none">Akses Form FTL</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="acc_ltl" checked={canAccessLtl} onChange={e => setCanAccessLtl(e.target.checked)} className="rounded border-slate-300" />
                  <label htmlFor="acc_ltl" className="text-sm font-medium leading-none">Akses Form LTL</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="acc_lcl" checked={canAccessLcl} onChange={e => setCanAccessLcl(e.target.checked)} className="rounded border-slate-300" />
                  <label htmlFor="acc_lcl" className="text-sm font-medium leading-none">Akses Form LCL</label>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
                <Button type="submit" disabled={isSubmitting}>
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
