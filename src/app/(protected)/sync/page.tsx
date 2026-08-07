"use client";

import { useState } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle2, Play } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSyncStore } from "@/lib/store";
import Papa from "papaparse";
import { createClient } from "@/utils/supabase/client";

interface GenericData {
  id?: string;
  [key: string]: any;
}


export default function SyncPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<GenericData[]>([]);
  const [csvData, setCsvData] = useState<GenericData[]>([]);
  
  const supabase = createClient();
  const { isUploading, progress, processedRows, totalRows, setIsUploading, setProgress, setTotalRows, reset } = useSyncStore();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      transform: (value) => value === "" ? null : value,
      complete: (results) => {
        const data = results.data as GenericData[];
        setCsvData(data);
        setTotalRows(data.length);
        setPreviewData(data.slice(0, 5));
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const executeUpload = async () => {
    if (csvData.length === 0) return;
    
    setIsUploading(true);
    let currentProcessed = 0;
    const total = csvData.length;
    const chunkSize = 1000;

    for (let i = 0; i < total; i += chunkSize) {
      const chunk = csvData.slice(i, i + chunkSize);
      
      try {
        const { error } = await supabase.rpc('bulk_import_stt', { payload: chunk });
        
        if (error) {
          console.error("RPC Error:", JSON.stringify(error, null, 2), error);
          alert(`Gagal import pada baris ${i}. Periksa log console.`);
          break;
        }

        currentProcessed += chunk.length;
        const newProgress = Math.round((currentProcessed / total) * 100);
        setProgress(newProgress, currentProcessed);

      } catch (err) {
        console.error("Fetch Error:", err);
        break;
      }
    }

    setTimeout(() => {
      setIsUploading(false);
      setFile(null);
      setCsvData([]);
      setPreviewData([]);
      reset();
    }, 2000);
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 overflow-y-auto max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-800">Data Sync Portal</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Import CSV</CardTitle>
          <CardDescription>
            Unggah file CSV Anda (seperti ekspor spreadsheet lama) untuk sinkronisasi massal ke Master Data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dropzone Area */}
          {!file && (
            <label 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-300 rounded-lg p-12 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 hover:border-orange-300 hover:text-orange-600 transition-colors cursor-pointer bg-white block"
            >
              <UploadCloud className="w-12 h-12 mb-4 text-slate-400" />
              <p className="text-lg font-medium text-slate-700">Tarik dan lepas file CSV di sini</p>
              <p className="text-sm mt-1 mb-6">atau klik untuk menelusuri dari perangkat Anda</p>
              <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-slate-300 h-10 px-4 py-2 hover:bg-slate-100 hover:text-slate-900">
                Pilih File
              </div>
              <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            </label>
          )}

          {/* Upload Progress Area */}
          {file && isUploading && (
            <div className="border border-slate-200 rounded-lg p-6 bg-slate-50 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-orange-600" />
                  <div>
                    <h4 className="font-semibold text-slate-800">{file.name}</h4>
                    <p className="text-sm text-slate-500 font-mono">
                      Memproses {processedRows.toLocaleString()} / {totalRows.toLocaleString()} baris...
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-orange-600 font-mono">{progress}%</span>
                </div>
              </div>
              <Progress value={progress} className="h-3 bg-slate-200" indicatorClassName="bg-orange-600" />
              {progress === 100 && (
                <div className="flex items-center justify-center text-emerald-600 mt-4 font-medium">
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Sinkronisasi Selesai
                </div>
              )}
            </div>
          )}

          {/* Preview Table Area */}
          {file && !isUploading && progress === 0 && (
            <div className="space-y-4 border border-slate-200 rounded-lg p-6">
              <div className="flex items-center justify-between border-b pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-6 h-6 text-orange-600" />
                  <h3 className="font-semibold text-lg text-slate-800">{file.name} (Pratinjau)</h3>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setFile(null); setCsvData([]); setPreviewData([]); }}>Batal</Button>
                  <Button onClick={executeUpload} className="bg-orange-600 hover:bg-orange-700 text-white">
                    <Play className="w-4 h-4 mr-2" /> Mulai Import
                  </Button>
                </div>
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>No. STT</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Nopol</TableHead>
                      <TableHead>Layanan</TableHead>
                      <TableHead>Volume</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">{row.no_stt || "-"}</TableCell>
                        <TableCell>{row.nama_customer || "-"}</TableCell>
                        <TableCell className="font-mono">{row.nopol || "-"}</TableCell>
                        <TableCell>{row.jenis_layanan || "-"}</TableCell>
                        <TableCell className="font-mono">{row.qty_koli || "0"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-slate-500 text-center mt-4">
                Menampilkan {previewData.length} baris pertama dari {totalRows.toLocaleString()} baris yang terdeteksi.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
