"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  Package, BarChart3, DollarSign, MapPin, Search,
  RefreshCw, Bell, ChevronDown, FileText, Truck,
  ArrowRight, Calendar, Activity, X, Copy, Download
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useDebounce } from "use-debounce";

interface GenericData {
  id?: string;
  [key: string]: any;
}


// ─── Types ──────────────────────────────────────────────────────────
type ServiceFilter = "all" | "LTL" | "LCL" | "FTL";

type DashboardData = {
  total_transaksi: number;
  stt_count: number;
  non_stt_count: number;
  total_koli: number;
  omset_total: number;
  count_ltl: number;
  count_lcl: number;
  count_ftl: number;
  koli_ltl: number;
  koli_lcl: number;
  koli_ftl: number;
  do_selesai_fisik: number;
  pod_selesai_admin: number;
  sla_total: number;
  sla_sesuai: number;
  sla_konfirm: number;
  sla_gagal: number;
  kud_total: number;
  kud_tepat: number;
  kud_lewat: number;
  kud_missing: number;
  komplain_total: number;
  komplain_aman: number;
  komplain_teratasi: number;
  komplain_berat: number;
  doc_total: number;
  doc_cepat: number;
  doc_lambat: number;
  doc_gagal: number;
  vendor_standart: number;
  vendor_mahal: number;
  vendor_mahal_momen: number;
  vendor_unit_cam: number;
  cabang_distribution: { cabang: string; count: number }[];
};

// ─── Constants ──────────────────────────────────────────────────────
const SERVICE_TABS: { key: ServiceFilter; label: string; title: string }[] = [
  { key: "all", label: "Overview", title: "Overview Dashboard" },
  { key: "LTL", label: "LTL", title: "Service LTL" },
  { key: "LCL", label: "LCL", title: "Service LCL" },
  { key: "FTL", label: "FTL", title: "Service FTL" },
];

const DATE_RANGES = [
  { label: "7 Hari Terakhir", days: 7 },
  { label: "30 Hari Terakhir", days: 30 },
  { label: "Bulan Ini", days: -1 },
  { label: "Semua Data", days: 0 },
  { label: "Custom Date", days: -2 },
];

// ─── Helpers ────────────────────────────────────────────────────────
function formatRupiah(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("id-ID");
}

function safePercent(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

// ─── KPI Progress Bar Component ─────────────────────────────────────
function KpiCard({
  title, percent, labels, values, colors, onLabelClick
}: {
  title: string;
  percent: number;
  labels: string[];
  values: number[];
  colors: string[];
  onLabelClick?: (index: number) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">{title}</h4>
        <span className="text-xl font-bold text-slate-800">{percent}%</span>
      </div>
      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        {labels.map((label, idx) => (
          <span key={idx} className={colors[idx] + (idx === 0 ? "" : " font-semibold")}>
            {onLabelClick && values[idx] > 0 ? (
              <button
                onClick={() => onLabelClick(idx)}
                className="hover:underline cursor-pointer text-left"
              >
                {label} ({formatNumber(values[idx])})
              </button>
            ) : (
              <>{label} ({formatNumber(values[idx])})</>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Live Tracking SLA Component ──────────────────────────────────────
function LiveTrackingSlaCard({ data = [] }: { data: GenericData[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500); // 500ms debounce
  const [serverData, setServerData] = useState<GenericData[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Use createClient directly here
  const supabase = createClient();

  useEffect(() => {
    async function fetchSearch() {
      if (!debouncedSearchTerm) {
        setServerData(null);
        return;
      }
      setIsLoading(true);
      const q = `%${debouncedSearchTerm}%`;
      const { data: searchResults } = await supabase
        .from("shipments")
        .select("no_stt, nama_customer_teks, status_pengiriman, status_detail_text, tgl_masuk, jenis_layanan")
        .or(`no_stt.ilike.${q},nama_customer_teks.ilike.${q}`)
        .order("tgl_masuk", { ascending: false })
        .limit(100); // just limit to 100 results for the search specifically
      
      setServerData(searchResults || []);
      setIsLoading(false);
    }
    fetchSearch();
  }, [debouncedSearchTerm, supabase]);

  // Fallback to local filter if serverData is null (e.g. search is empty)
  const displayData = serverData !== null ? serverData : data.filter((item) => {
    if (!debouncedSearchTerm) return true;
    const q = debouncedSearchTerm.toLowerCase();
    return (
      String(item.no_stt || "").toLowerCase().includes(q) ||
      String(item.nama_customer_teks || "").toLowerCase().includes(q) ||
      String(item.status_detail_text || item.status_pengiriman || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Activity className="text-orange-500 w-4 h-4" />
          Live Tracking SLA
        </h3>
        <div className="flex gap-3 text-slate-400">
          <button className="hover:text-slate-600"><Copy size={16} /></button>
          <button className="hover:text-slate-600"><Download size={16} /></button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-5">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={14} className="text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Cari STT/Customer..."
          className="w-full pl-9 pr-9 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-orange-500 outline-none text-slate-700"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <RefreshCw size={14} className="text-orange-500 animate-spin" />
          </div>
        )}
      </div>

      {/* List Feed - Compact Two-Line Format */}
      <div className="max-h-[320px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
        {displayData.length > 0 ? (
          displayData.map((item, index) => {
            // Color-coded status dot
            const statusDotColor: Record<string, string> = {
              "Bermasalah": "bg-red-500",
              "Selesai Bongkar": "bg-emerald-500",
              "Dokumen Kembali": "bg-emerald-500",
              "Di Perjalanan": "bg-orange-500",
              "Bongkar": "bg-amber-500",
              "Di Lokasi Muat": "bg-blue-500",
              "Selesai Muat": "bg-blue-400",
            };
            const dotColor = statusDotColor[item.status_pengiriman] || "bg-slate-300";

            // Service badge color
            const serviceBadge: Record<string, string> = {
              "FTL": "bg-orange-100 text-orange-700",
              "LTL": "bg-indigo-100 text-indigo-700",
              "LCL": "bg-teal-100 text-teal-700",
            };
            const badgeClass = serviceBadge[item.jenis_layanan] || "bg-slate-100 text-slate-500";

            return (
            <div key={index} className="flex gap-3 items-start p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <div className={`w-2 h-2 rounded-full ${dotColor} mt-1.5 flex-shrink-0 ${item.status_pengiriman === 'Bermasalah' ? 'animate-pulse' : ''}`}></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-orange-700 truncate">{item.no_stt || '-'}</span>
                  {item.jenis_layanan && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${badgeClass}`}>{item.jenis_layanan}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">{item.status_detail_text || item.status_pengiriman || '-'}</span>
                  <span className="text-[10px] text-slate-400">{item.tgl_masuk ? new Date(item.tgl_masuk).toLocaleDateString('id-ID') : ''}</span>
                </div>
              </div>
            </div>
            );
          })
        ) : (
          <div className="text-center text-xs text-slate-400 py-4">Data tidak ditemukan</div>
        )}
      </div>
    </div>
  );
}

// ─── Distribution Bar Chart Component ───────────────────────────────
function DistributionChart({
  ltl, lcl, ftl
}: {
  ltl: number; lcl: number; ftl: number;
}) {
  const max = Math.max(ltl, lcl, ftl, 1);
  const bars = [
    { name: "LTL", value: ltl, color: "bg-orange-500" },
    { name: "LCL", value: lcl, color: "bg-orange-300" },
    { name: "FTL", value: ftl, color: "bg-slate-300" },
  ];

  // Generate Y-axis labels
  const steps = 10;
  const yLabels: number[] = [];
  for (let i = steps; i >= 0; i--) {
    yLabels.push(Math.round((max / steps) * i));
  }

  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800">Distribusi Transaksi</h3>
          <span className="text-xs text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded">Volume (Koli)</span>
        </div>
        <div className="flex gap-2" style={{ height: 240 }}>
          {/* Y-axis labels */}
          <div className="flex flex-col justify-between text-right pr-1 text-[10px] text-slate-400 font-mono w-10 flex-shrink-0">
            {yLabels.map((v, i) => (
              <span key={i}>{v}</span>
            ))}
          </div>
          {/* Chart area */}
          <div className="flex-1 border-l border-b border-slate-200 flex items-end justify-around gap-4 px-6 pb-1 pt-2 relative">
            {/* Horizontal grid lines */}
            {yLabels.map((_, i) => (
              <div
                key={`grid-${i}`}
                className="absolute left-0 right-0 border-t border-slate-50"
                style={{ bottom: `${(i / steps) * 100}%` }}
              />
            ))}
            {bars.map((bar) => (
              <div key={bar.name} className="flex flex-col items-center gap-2 flex-1 relative z-10">
                <div className="w-full flex justify-center items-end" style={{ height: 200 }}>
                  <div
                    className={`w-16 max-w-full ${bar.color} rounded-t-md transition-all duration-700 ease-out`}
                    style={{
                      height: max > 0 ? `${(bar.value / max) * 100}%` : '0%',
                      minHeight: bar.value > 0 ? '4px' : '0px'
                    }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-500 mt-1">{bar.name}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard Content ─────────────────────────────────────────
function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Active service from URL
  const serviceParam = searchParams.get("service") || "all";
  const activeService = (["all", "LTL", "LCL", "FTL"].includes(serviceParam) ? serviceParam : "all") as ServiceFilter;

  // State
  const [data, setData] = useState<DashboardData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState(30);
  const [customDate, setCustomDate] = useState({ from: "", to: "" });
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [rpcError, setRpcError] = useState(false);

  // New States for SLA Narrative & Modal
  const [liveTrackSla, setLiveTrackSla] = useState<GenericData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [kpiFocus, setKpiFocus] = useState<string | null>(null); // 'SLA', 'KUD', 'KOMPLAIN', 'DOC'
  const [failedShipments, setFailedShipments] = useState<GenericData[]>([]);
  const [isLoadingModal, setIsLoadingModal] = useState(false);

  // Fetch dashboard data
  const fetchStats = useCallback(async () => {
    setIsRefreshing(true);
    setRpcError(false);

    let dateFrom: string | null = null;
    let dateTo: string | null = null;

    if (dateRange > 0) {
      const from = new Date();
      from.setDate(from.getDate() - dateRange);
      dateFrom = from.toISOString().split("T")[0];
      dateTo = new Date().toISOString().split("T")[0];
    } else if (dateRange === -1) {
      const now = new Date();
      dateFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      dateTo = now.toISOString().split("T")[0];
    } else if (dateRange === -2) {
      dateFrom = customDate.from || null;
      dateTo = customDate.to || null;
    }

    const { data: rpcData, error } = await supabase.rpc("get_dashboard_stats_v2", {
      p_service_filter: activeService === "all" ? null : activeService,
      p_date_from: dateFrom,
      p_date_to: dateTo,
    });

    if (!error && rpcData) {
      setData(rpcData as DashboardData);
    } else {
      console.error("Dashboard RPC error:", error);
      setRpcError(true);
    }
    setIsRefreshing(false);

    // Fetch Live Track SLA - fetch all STT without date filter for universal search
    let slaQuery = supabase
      .from("shipments")
      .select("no_stt, nama_customer_teks, status_pengiriman, status_detail_text, tgl_masuk, jenis_layanan")
      .order("tgl_masuk", { ascending: false })
      .limit(200);
    
    if (activeService !== "all") {
      slaQuery = slaQuery.eq("jenis_layanan", activeService);
    }
    // No date filter here - so all STTs are searchable
    const { data: slaData } = await slaQuery;
    setLiveTrackSla(slaData || []);
  }, [activeService, dateRange, customDate, supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
  }, [fetchStats]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDateDropdown) return;
    const handler = () => setShowDateDropdown(false);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [showDateDropdown]);

  // Service tab switch
  const handleServiceChange = (service: ServiceFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    if (service === "all") {
      params.delete("service");
    } else {
      params.set("service", service);
    }
    const qs = params.toString();
    router.push(`/dashboard${qs ? `?${qs}` : ""}`);
  };

  // Open Modal for KPI Failures
  const openKpiModal = async (type: string, statusIndex: number) => {
    let statusName = "";
    if (type === "SLA") statusName = statusIndex === 0 ? "Sesuai" : statusIndex === 1 ? "Konfirm" : "Gagal";
    else if (type === "KUD") statusName = statusIndex === 0 ? "Tepat" : statusIndex === 1 ? "Lewat" : "Marketing";
    else if (type === "KOMPLAIN") statusName = statusIndex === 0 ? "Aman" : statusIndex === 1 ? "Teratasi" : "Berat";
    else if (type === "DOC") statusName = statusIndex === 0 ? "Cepat" : "Lambat";

    setKpiFocus(`${type} - ${statusName}`);
    setIsModalOpen(true);
    setIsLoadingModal(true);
    setFailedShipments([]);

    let query = supabase.from("shipments").select("no_stt, jenis_layanan, tgl_masuk, tgl_diterima, rule_sla_hari, nama_customer_teks, status_pengiriman, rate_sla, rate_kud, rate_komplain, kecepatan_doc").limit(1500);
    
    if (activeService !== "all") {
      query = query.eq("jenis_layanan", activeService);
    }

    if (dateRange > 0) {
      const from = new Date();
      from.setDate(from.getDate() - dateRange);
      query = query.gte("tgl_masuk", from.toISOString().split("T")[0]).lte("tgl_masuk", new Date().toISOString().split("T")[0]);
    } else if (dateRange === -1) {
      const now = new Date();
      query = query.gte("tgl_masuk", `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`).lte("tgl_masuk", now.toISOString().split("T")[0]);
    } else if (dateRange === -2) {
      if (customDate.from) query = query.gte("tgl_masuk", customDate.from);
      if (customDate.to) query = query.lte("tgl_masuk", customDate.to);
    }

    const { data } = await query;
    let filtered = data || [];

    // Filter in JS to match RPC get_dashboard_stats_v2 logic
    if (type === "SLA") {
      filtered = filtered.filter((row: GenericData) => {
        const val = (row.rate_sla || "").toLowerCase();
        if (statusIndex === 0) return val.includes("sesuai");
        if (statusIndex === 1) return val.includes("konfirm");
        if (statusIndex === 2) return val.includes("gagal");
        return false;
      });
    } else if (type === "KUD") {
      filtered = filtered.filter((row: GenericData) => {
        const val = (row.rate_kud || "").toLowerCase();
        if (statusIndex === 0) return /(tepat|sesuai|ok)/.test(val);
        if (statusIndex === 1) return /(lewat|lambat|belum)/.test(val);
        if (statusIndex === 2) return val.trim() !== "" && !/(tepat|sesuai|ok)/.test(val) && !/(lewat|lambat|belum)/.test(val);
        return false;
      });
    } else if (type === "KOMPLAIN") {
      filtered = filtered.filter((row: GenericData) => {
        const val = (row.rate_komplain || "").toLowerCase();
        if (statusIndex === 0) return /(aman|tidak)/.test(val);
        if (statusIndex === 1) return val.includes("teratasi");
        if (statusIndex === 2) return val.includes("berat");
        return false;
      });
    } else if (type === "DOC") {
      filtered = filtered.filter((row: GenericData) => {
        const val = (row.kecepatan_doc || "").toLowerCase();
        if (statusIndex === 0) return val.includes("cepat");
        if (statusIndex === 1) return val.includes("lambat");
        return false;
      });
    }

    setFailedShipments(filtered.slice(0, 50));
    setIsLoadingModal(false);
  };

  // ─── Derived values ───────────────────────────────────────────────
  const activeTab = SERVICE_TABS.find((t) => t.key === activeService) || SERVICE_TABS[0];
  const isFTL = activeService === "FTL";
  const d = data;

  const totalTransaksi = d?.total_transaksi ?? 0;
  const sttCount = d?.stt_count ?? 0;
  const nonSttCount = d?.non_stt_count ?? 0;
  const totalKoli = d?.total_koli ?? 0;
  const omsetTotal = d?.omset_total ?? 0;

  // Per service
  const countLtl = d?.count_ltl ?? 0;
  const countLcl = d?.count_lcl ?? 0;
  const countFtl = d?.count_ftl ?? 0;

  // Koli per service
  const koliLtl = d?.koli_ltl ?? 0;
  const koliLcl = d?.koli_lcl ?? 0;
  const koliFtl = d?.koli_ftl ?? 0;

  // SLA
  const slaTotal = d?.sla_total ?? 0;
  const slaSesuai = d?.sla_sesuai ?? 0;
  const slaKonfirm = d?.sla_konfirm ?? 0;
  const slaGagal = d?.sla_gagal ?? 0;
  const slaPercent = safePercent(slaSesuai, slaTotal);

  // KUD
  const kudTotal = d?.kud_total ?? 0;
  const kudTepat = d?.kud_tepat ?? 0;
  const kudLewat = d?.kud_lewat ?? 0;
  const kudMissing = d?.kud_missing ?? 0;
  const kudPercent = safePercent(kudTepat, kudTotal);

  // Komplain
  const komplainTotal = d?.komplain_total ?? 0;
  const komplainAman = d?.komplain_aman ?? 0;
  const komplainTeratasi = d?.komplain_teratasi ?? 0;
  const komplainBerat = d?.komplain_berat ?? 0;
  const komplainPercent = safePercent(komplainAman, komplainTotal);

  // Dokumen Kembali
  const docTotal = d?.doc_total ?? 0;
  const docCepat = d?.doc_cepat ?? 0;
  const docLambat = d?.doc_lambat ?? 0;
  const docGagal = d?.doc_gagal ?? 0;
  const docPercent = safePercent(docCepat, docTotal);

  // Vendor
  const vendorStd = d?.vendor_standart ?? 0;
  const vendorMahal = d?.vendor_mahal ?? 0;
  const vendorMomen = d?.vendor_mahal_momen ?? 0;
  const vendorCam = d?.vendor_unit_cam ?? 0;

  // Cabang
  const cabangDist = d?.cabang_distribution ?? [];

  // DO/POD
  const doSelesai = d?.do_selesai_fisik ?? 0;
  const podSelesai = d?.pod_selesai_admin ?? 0;

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50">
      {/* ═══════════════ HEADER BAR ═══════════════ */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{activeTab.title}</h1>
            <p className="text-sm text-orange-600 font-medium">CAM Logistics Operations</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Refresh */}
            <button
              onClick={fetchStats}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
            {/* Date range selector */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowDateDropdown(!showDateDropdown)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
              >
                <Calendar className="w-3.5 h-3.5" />
                {DATE_RANGES.find((r) => r.days === dateRange)?.label || "30 Hari Terakhir"}
                <ChevronDown className="w-3 h-3" />
              </button>
              {showDateDropdown && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50 overflow-hidden">
                  {DATE_RANGES.map((r) => (
                    <button
                      key={r.days}
                      onClick={() => {
                        setDateRange(r.days);
                        if (r.days !== -2) {
                          setShowDateDropdown(false);
                        }
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        dateRange === r.days ? "text-orange-600 font-semibold bg-orange-50" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                  {dateRange === -2 && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Start Date</label>
                        <input 
                          type="date" 
                          value={customDate.from}
                          onChange={(e) => setCustomDate(prev => ({ ...prev, from: e.target.value }))}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-orange-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">End Date</label>
                        <input 
                          type="date" 
                          value={customDate.to}
                          onChange={(e) => setCustomDate(prev => ({ ...prev, to: e.target.value }))}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-orange-500 outline-none"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          fetchStats();
                          setShowDateDropdown(false);
                        }}
                        className="w-full bg-orange-600 text-white rounded-md py-1.5 text-sm font-semibold hover:bg-orange-700 transition-colors"
                      >
                        Terapkan
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            {/* User avatar */}
            <div className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
              AO
            </div>
          </div>
        </div>

        {/* ─── Service Tabs ─── */}
        <div className="flex gap-1 mt-4 -mb-1">
          {SERVICE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleServiceChange(tab.key)}
              className={`px-5 py-2 rounded-t-lg text-sm font-semibold transition-all border-b-2 ${
                activeService === tab.key
                  ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════ RPC ERROR STATE ═══════════════ */}
      {rpcError && !data && (
        <div className="p-8">
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-6 text-center space-y-3">
              <p className="text-amber-800 font-semibold">Fungsi RPC belum tersedia</p>
              <p className="text-sm text-amber-700">
                Jalankan migration SQL terbaru di Supabase untuk mengaktifkan dashboard baru:
              </p>
              <code className="block text-xs bg-amber-100 rounded p-3 text-amber-900 font-mono">
                20260803_patch_kpi_columns.sql → 20260803_rpc_dashboard_v2.sql → 20260803_rpc_bulk_import_v2.sql
              </code>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════ LOADING STATE ═══════════════ */}
      {!data && !rpcError && (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full" />
            <span className="text-sm text-slate-500">Memuat data dashboard...</span>
          </div>
        </div>
      )}

      {/* ═══════════════ MAIN CONTENT ═══════════════ */}
      {data && (
        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* ════════════ LEFT COLUMN (3/4) ════════════ */}
            <div className="lg:col-span-3 space-y-6">
              {/* ─── TOP 3 STAT CARDS ─── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Card 1: Total Transaksi Aktif */}
                <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center mb-3">
                      <FileText className="w-4.5 h-4.5 text-orange-600" />
                    </div>
                    <div className="text-3xl font-bold text-slate-900 font-mono tracking-tight">
                      {formatNumber(totalTransaksi)}
                    </div>
                    <div className="text-[11px] text-slate-500 uppercase tracking-wider mt-1 font-semibold">
                      Total Transaksi Aktif
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex gap-3 text-xs">
                      <span className="text-orange-600 font-semibold">STT: {formatNumber(sttCount)}</span>
                      <span className="text-slate-400">Non: {formatNumber(nonSttCount)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Card 2: Total QTY (Koli) */}
                <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center mb-3">
                      <Package className="w-4.5 h-4.5 text-orange-600" />
                    </div>
                    <div className="text-3xl font-bold text-slate-900 font-mono tracking-tight">
                      {formatNumber(totalKoli)}
                    </div>
                    <div className="text-[11px] text-slate-500 uppercase tracking-wider mt-1 font-semibold">
                      Total QTY (Koli)
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex gap-3 text-xs text-slate-500">
                      <span>LTL: <b className="text-slate-700">{formatNumber(koliLtl)}</b></span>
                      <span>LCL: <b className="text-slate-700">{formatNumber(koliLcl)}</b></span>
                      <span>FTL: <b className="text-slate-700">{formatNumber(koliFtl)}</b></span>
                    </div>
                  </CardContent>
                </Card>

                {/* Card 3: Conditional - Omset for non-FTL, Vendor Distribution for FTL */}
                {isFTL ? (
                  <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center mb-3">
                        <Truck className="w-4.5 h-4.5 text-green-600" />
                      </div>
                      <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-3">
                        Distribusi Harga Vendor
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Std</span>
                          <span className="text-lg font-bold font-mono text-slate-800">{vendorStd}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">MH</span>
                          <span className="text-lg font-bold font-mono text-slate-800">{vendorMahal}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Mom</span>
                          <span className="text-lg font-bold font-mono text-slate-800">{vendorMomen}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">CAM</span>
                          <span className="text-lg font-bold font-mono text-orange-600">{vendorCam}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
                        <DollarSign className="w-4.5 h-4.5 text-blue-600" />
                      </div>
                      <div className="text-3xl font-bold text-slate-900 tracking-tight">
                        {formatRupiah(omsetTotal)}
                      </div>
                      <div className="text-[11px] text-slate-500 uppercase tracking-wider mt-1 font-semibold">
                        Omset LCL/LTL
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-100 flex gap-3 text-xs text-slate-500">
                        <span>Std: <b className="text-slate-700">{vendorStd}</b></span>
                        <span>MH: <b className="text-slate-700">{vendorMahal}</b></span>
                        <span>Mom: <b className="text-slate-700">{vendorMomen}</b></span>
                        <span>CAM: <b className="text-orange-600">{vendorCam}</b></span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* ─── DISTRIBUSI TRANSAKSI (Bar Chart) ─── */}
              <DistributionChart
                ltl={koliLtl}
                lcl={koliLcl}
                ftl={koliFtl}
              />

              {/* ─── INDIKATOR KINERJA UTAMA (KPI) ─── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-slate-800">Indikator Kinerja Utama (KPI)</h3>
                  <span className="text-xs text-orange-600 font-medium cursor-pointer hover:underline">
                    Klik angka gagal untuk lihat detail
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <KpiCard
                    title="Performa SLA"
                    percent={slaPercent}
                    labels={["Sesuai", "Konfirm", "Lewat SLA"]}
                    values={[slaSesuai, slaKonfirm, slaGagal]}
                    colors={["text-slate-500", "text-orange-600", "text-red-500"]}
                    onLabelClick={(idx) => openKpiModal("SLA", idx)}
                  />
                  <KpiCard
                    title="Respons KUD"
                    percent={kudPercent}
                    labels={["Tepat", "Lewat 5 Menit", "Marketing"]}
                    values={[kudTepat, kudLewat, kudMissing]}
                    colors={["text-slate-500", "text-orange-600", "text-red-500"]}
                    onLabelClick={(idx) => openKpiModal("KUD", idx)}
                  />
                  <KpiCard
                    title="Tingkat Komplain"
                    percent={komplainPercent}
                    labels={["Aman", "Teratasi", "Berat"]}
                    values={[komplainAman, komplainTeratasi, komplainBerat]}
                    colors={["text-slate-500", "text-orange-600", "text-red-500"]}
                    onLabelClick={(idx) => openKpiModal("KOMPLAIN", idx)}
                  />
                  <KpiCard
                    title="Kecepatan Dokumen Kembali"
                    percent={docPercent}
                    labels={["Cepat", "Lambat"]}
                    values={[docCepat, docLambat]}
                    colors={["text-slate-500", "text-orange-600"]}
                    onLabelClick={(idx) => openKpiModal("DOC", idx)}
                  />
                </div>
              </div>
            </div>

            {/* ════════════ RIGHT COLUMN (1/4) ════════════ */}
            <div className="lg:col-span-1 space-y-6">
              {/* ─── TINGKAT PENYELESAIAN ─── */}
              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0 shadow-lg text-white overflow-hidden">
                <CardContent className="p-5 space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Tingkat Penyelesaian</h3>
                    <p className="text-xs text-orange-100 mt-0.5">Status dokumen logistik harian</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-orange-100">DO Selesai Fisik</span>
                      <span className="text-2xl font-bold text-white font-mono">{formatNumber(doSelesai)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-orange-100">POD Selesai Admin</span>
                      <span className="text-2xl font-bold text-white font-mono">{formatNumber(podSelesai)}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 w-full bg-orange-400/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-700"
                        style={{
                          width: `${totalTransaksi > 0 ? Math.min((podSelesai / totalTransaksi) * 100, 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Cari Log Resi */}
                  <button
                    onClick={() => router.push("/pos?focus=search")}
                    className="w-full py-2.5 bg-white text-orange-600 rounded-lg text-sm font-bold hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Cari Log Resi
                  </button>
                </CardContent>
              </Card>

              {/* ─── LIVE TRACK SLA ─── */}
              <LiveTrackingSlaCard data={liveTrackSla} />

              {/* ─── DISTRIBUSI CABANG ─── */}
              <div>
                <h3 className="text-base font-bold text-slate-800 mb-3">Distribusi Cabang</h3>
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-0 divide-y divide-slate-100">
                    {cabangDist.length > 0 ? (
                      cabangDist.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-orange-50 flex items-center justify-center">
                              <MapPin className="w-3 h-3 text-orange-600" />
                            </div>
                            <span className="text-sm font-semibold text-slate-700">{item.cabang}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold font-mono text-slate-800">
                              {formatNumber(item.count)}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">STT</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-5 py-6 text-center text-sm text-slate-400">
                        Belum ada data distribusi cabang
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL DETAIL KEGAGALAN ═══════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">
                Detail Transaksi Gagal: <span className="text-red-500">{kpiFocus}</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {isLoadingModal ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full" />
                </div>
              ) : failedShipments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                        <th className="px-4 py-3 font-semibold border-b">No STT</th>
                        <th className="px-4 py-3 font-semibold border-b">Tgl Masuk</th>
                        <th className="px-4 py-3 font-semibold border-b">Layanan</th>
                        <th className="px-4 py-3 font-semibold border-b">Customer</th>
                        <th className="px-4 py-3 font-semibold border-b">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {failedShipments.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors text-sm">
                          <td className="px-4 py-3 font-mono text-orange-600 font-semibold">{item.no_stt || '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{item.tgl_masuk}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md font-semibold">
                              {item.jenis_layanan}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-800 font-medium">{item.nama_customer_teks}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-red-50 text-red-600 text-xs rounded-md font-medium">
                              {item.status_pengiriman}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p>Tidak ada data spesifik untuk kueri ini.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page Export (with Suspense for useSearchParams) ─────────────────
export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center bg-slate-50/50">
          <div className="animate-spin w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
