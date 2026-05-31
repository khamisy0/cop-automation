"use client";

import { useEffect, useState, useMemo } from "react";
import { Download, Upload, X, Check, ChevronLeft, ChevronRight, Loader2, AlertTriangle, Trash2, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";
import { SEASONALITY_BRAND_GROUPS } from "@/lib/constants";

// One tab per brand group. INT + UOMO are a single group (shared sheet, one
// canonical storeCode) so rows are stored once, not duplicated across codes.
const BRAND_TABS = SEASONALITY_BRAND_GROUPS;

interface SeasonalityEntry {
  id: number;
  brandCode: string;
  country: string;
  priority: number;
  mancode: string;
  colorCode: string;
  season: string;
  fromDate1: string | null;
  fromDate2: string | null;
  updatedAt: string;
}

const PAGE_SIZE = 20;

interface BrandStat {
  brandCode: string;
  count: number;
  lastUpdated: string | null;
}

export default function SeasonalityAdmin() {
  // The table now holds ONE page of rows (server-paginated). The whole dataset
  // is far too large to ship to the browser — see the GET route for why.
  const [rows, setRows] = useState<SeasonalityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<BrandStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>("int-uomo");
  const [searchFilters, setSearchFilters] = useState({
    country: "", priority: "", mancode: "", colorCode: "", season: "",
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isClearing, setIsClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmClearLegacy, setConfirmClearLegacy] = useState(false);

  // Derived from active tab. `codes` = every code the group owns (stats + table
  // filter + cleanup on replace); `storeCode` = the single canonical code rows
  // are written under, so INT/UOMO is stored once instead of duplicated.
  const activeGroup = useMemo(
    () => BRAND_TABS.find((t) => t.id === activeTab) ?? BRAND_TABS[0],
    [activeTab]
  );
  const activeTabCodes = useMemo(() => activeGroup.codes, [activeGroup]);

  // Reset to page 1 whenever the tab or filters change
  useEffect(() => { setCurrentPage(1); }, [activeTab, searchFilters]);

  // Fetch the brand counts once (and refresh after mutations)
  useEffect(() => { fetchStats(); }, []);

  // Fetch the current page of rows whenever the query inputs change.
  // Debounced so typing in a filter doesn't fire a request per keystroke.
  useEffect(() => {
    const handle = setTimeout(() => { fetchRows(); }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchFilters, currentPage]);

  function buildRowQuery(page: number, pageSize: number) {
    const params = new URLSearchParams({
      brands: activeTabCodes.join(","),
      page: String(page),
      pageSize: String(pageSize),
    });
    if (searchFilters.country) params.set("country", searchFilters.country);
    if (searchFilters.priority) params.set("priority", searchFilters.priority);
    if (searchFilters.mancode) params.set("mancode", searchFilters.mancode);
    if (searchFilters.colorCode) params.set("colorCode", searchFilters.colorCode);
    if (searchFilters.season) params.set("season", searchFilters.season);
    return params;
  }

  async function fetchStats() {
    try {
      const r = await fetch("/api/admin/seasonality?mode=stats");
      if (!r.ok) throw new Error("Failed to fetch");
      setStats(await r.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  async function fetchRows() {
    try {
      setLoading(true);
      const r = await fetch(`/api/admin/seasonality?${buildRowQuery(currentPage, PAGE_SIZE)}`);
      if (!r.ok) throw new Error("Failed to fetch");
      const data = await r.json();
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function refreshAll() {
    await Promise.all([fetchStats(), fetchRows()]);
  }

  // Per-tab stats (INT+UOMO combined, CAL separate, TEZ separate) — summed from
  // the server-side per-brand aggregate.
  const tabStats = useMemo(() =>
    BRAND_TABS.map((tab) => {
      let count = 0;
      let maxTime = 0;
      for (const s of stats) {
        if (!tab.codes.includes(s.brandCode)) continue;
        count += s.count;
        if (s.lastUpdated) {
          const t = new Date(s.lastUpdated).getTime();
          if (t > maxTime) maxTime = t;
        }
      }
      return { ...tab, count, lastUpdated: maxTime > 0 ? new Date(maxTime) : null };
    }), [stats]);

  const legacyCount = useMemo(
    () => stats.find((s) => s.brandCode === "")?.count ?? 0,
    [stats]
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);

  async function handleClearAll() {
    try {
      setIsClearing(true);
      const r = await fetch("/api/admin/seasonality", { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to clear database");
      const res = await r.json();
      setSuccessMessage(`Database cleared (${res.count} records removed)`);
      setConfirmClear(false);
      setTimeout(() => setSuccessMessage(null), 3000);
      refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsClearing(false);
    }
  }

  async function handleClearLegacy() {
    try {
      setIsClearing(true);
      const r = await fetch("/api/admin/seasonality?legacy=true", { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete legacy records");
      const res = await r.json();
      setSuccessMessage(`Deleted ${res.count} legacy records (no brand assigned)`);
      setConfirmClearLegacy(false);
      setTimeout(() => setSuccessMessage(null), 3000);
      refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsClearing(false);
    }
  }

  async function handleDownload() {
    const brandName = BRAND_TABS.find((t) => t.id === activeTab)?.label ?? activeTab;
    try {
      setIsDownloading(true);
      setError(null);
      // Pull every matching row by paging the API — one big response would blow
      // the serverless body limit, so we accumulate large pages client-side.
      const DL_PAGE = 5000;
      const all: SeasonalityEntry[] = [];
      let page = 1;
      for (;;) {
        const r = await fetch(`/api/admin/seasonality?${buildRowQuery(page, DL_PAGE)}`);
        if (!r.ok) throw new Error("Failed to fetch data for download");
        const data = await r.json();
        all.push(...(data.rows ?? []));
        if (all.length >= (data.total ?? 0) || (data.rows ?? []).length < DL_PAGE) break;
        page++;
      }

      const ws = XLSX.utils.json_to_sheet(all.map((e) => ({
        "Brand Code": e.brandCode,
        "Country": e.country || "GLOBAL",
        "Priority": e.priority,
        "From (date)": e.fromDate1 ?? "",
        "Mancode": e.mancode,
        "Color Code": e.colorCode,
        "Season": e.season,
        "From (second)": e.fromDate2 ?? "",
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "SeasonalityReference");
      XLSX.writeFile(wb, `seasonality-${brandName.toLowerCase().replace(/\s+/g, "-")}.xlsx`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download data");
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setSuccessMessage("Parsing Excel file...");

    const brandName = activeTabLabel;

    try {
      const data = await file.arrayBuffer();
      const u8 = new Uint8Array(data);
      let workbook;
      try {
        workbook = XLSX.read(u8, { type: "array" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/encrypt/i.test(msg)) {
          try {
            workbook = XLSX.read(u8, { type: "array", password: "" });
          } catch {
            throw new Error(
              'The file is flagged as encrypted by its source system. Open it in Microsoft Excel, "Save As" a new .xlsx, and re-upload.'
            );
          }
        } else {
          throw err;
        }
      }
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet) as Array<any>;

      if (jsonData.length === 0) {
        setError("Excel file is empty");
        setIsUploading(false);
        return;
      }

      const CHUNK_SIZE = 5000;
      const totalChunks = Math.ceil(jsonData.length / CHUNK_SIZE);
      let totalCreated = 0, totalSkipped = 0;
      let allErrors: string[] = [];

      for (let i = 0; i < jsonData.length; i += CHUNK_SIZE) {
        const currentChunk = Math.floor(i / CHUNK_SIZE) + 1;
        setSuccessMessage(`Uploading batch ${currentChunk} of ${totalChunks}... (${Math.min(i + CHUNK_SIZE, jsonData.length)} / ${jsonData.length} rows)`);

        const r = await fetch("/api/admin/seasonality/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entries: jsonData.slice(i, i + CHUNK_SIZE),
            replaceAll: i === 0 ? replaceExisting : false,
            brandCodes: [activeGroup.storeCode], // insert once under the canonical code
            replaceCodes: activeTabCodes,          // wipe all owned codes (incl. legacy B6) on replace
          }),
        });

        const result = await r.json();
        if (!r.ok) throw new Error(result.message || result.error || `Import failed on batch ${currentChunk}`);

        totalCreated += result.created || 0;
        totalSkipped += result.skipped || 0;
        if (result.errors?.length) allErrors = [...allErrors, ...result.errors];
      }

      if (totalSkipped > 0) {
        setError(`Imported ${totalCreated} rows for ${brandName}. Skipped ${totalSkipped} rows.${allErrors.length ? "\n" + allErrors.slice(0, 5).join("\n") : ""}`);
      } else {
        setSuccessMessage(`✓ ${totalCreated} records imported for ${brandName}`);
        setTimeout(() => setSuccessMessage(null), 5000);
      }

      // Already on the correct tab — nothing to switch
      refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import file");
      setSuccessMessage(null);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  const activeTabLabel = BRAND_TABS.find((t) => t.id === activeTab)?.label ?? activeTab;

  return (
    <div className="space-y-6 animate-fade-in">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 shadow-sm">
          <X className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 whitespace-pre-wrap flex-1 leading-relaxed">{error}</p>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded transition"><X className="w-4 h-4 text-red-500" /></button>
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 shadow-sm">
          <Check className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
        </div>
      )}

      {/* Summary cards — one per tab */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {tabStats.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`text-left bg-white rounded-xl border shadow-sm p-4 transition hover:shadow-md ${activeTab === t.id ? "border-indigo-400 ring-2 ring-indigo-100" : "border-gray-200"}`}
          >
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide truncate mb-1">{t.label}</p>
            <p className="text-2xl font-bold text-gray-900">{t.count.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">
              {t.lastUpdated ? `Updated ${t.lastUpdated.toLocaleDateString()}` : "No data yet"}
            </p>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Brand tabs */}
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {tabStats.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition border-b-2 -mb-px ${activeTab === t.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {t.label} ({t.count.toLocaleString()})
            </button>
          ))}
        </div>

        {/* Upload config + actions */}
        <div className="p-4 space-y-3">
          {/* Brand selector + replace toggle for upload */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-sm font-medium text-gray-600 flex-shrink-0">Uploading for:</span>
            <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 text-white">
              {activeTabLabel}
            </span>
            <label className="flex items-center gap-2 cursor-pointer ml-auto">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
              />
              <span className="text-sm text-gray-600">Replace existing {activeTabLabel} data</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-700">{activeTabLabel} — Seasonality Reference</p>
              <p className="text-xs text-gray-400">{total.toLocaleString()} records</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {confirmClearLegacy ? (
                <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                  <span className="text-sm font-medium text-amber-800">Delete {legacyCount.toLocaleString()} legacy records?</span>
                  <button onClick={handleClearLegacy} disabled={isClearing} className="px-2 py-1 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-700 transition">Yes</button>
                  <button onClick={() => setConfirmClearLegacy(false)} className="px-2 py-1 bg-white text-gray-600 border border-gray-200 rounded text-xs font-medium hover:bg-gray-50 transition">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmClearLegacy(true)} className="flex items-center gap-2 px-3 py-2 bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition text-sm font-medium">
                  <Trash2 className="h-4 w-4" /> Delete Legacy Data
                </button>
              )}
              {confirmClear ? (
                <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                  <span className="text-sm font-medium text-red-700">Delete ALL records?</span>
                  <button onClick={handleClearAll} disabled={isClearing} className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition">Yes</button>
                  <button onClick={() => setConfirmClear(false)} className="px-2 py-1 bg-white text-gray-600 border border-gray-200 rounded text-xs font-medium hover:bg-gray-50 transition">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmClear(true)} className="flex items-center gap-2 px-3 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition text-sm font-medium">
                  <Trash2 className="h-4 w-4" /> Clear All
                </button>
              )}
              <button onClick={handleDownload} disabled={isDownloading} className="flex items-center gap-2 px-3 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium shadow-sm disabled:opacity-50">
                {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {isDownloading ? "Preparing..." : `Download (${activeTabLabel})`}
              </button>
              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm transition text-sm font-medium ${isUploading ? "bg-indigo-400 text-white cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"}`}>
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isUploading ? "Processing..." : "Upload Master Sheet"}
                <input type="file" accept=".xlsx,.xls" onChange={handleUpload} disabled={isUploading} className="hidden" />
              </label>
              <button onClick={refreshAll} disabled={loading} className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition text-sm font-medium disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-gray-400 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p>Loading...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-gray-400 gap-3">
            <AlertTriangle className="h-10 w-10 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">No data for {activeTabLabel}</p>
            <p className="text-sm">Select the brand(s) in the upload bar above and import a master sheet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {(["Priority", "Country", "Mancode", "Color Code", "Target Season"] as const).map((h) => {
                    const filterKey = h === "Priority" ? "priority" : h === "Country" ? "country" : h === "Mancode" ? "mancode" : h === "Color Code" ? "colorCode" : h === "Target Season" ? "season" : null;
                    return (
                      <th key={h} className="px-4 py-3 text-left">
                        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">{h}</div>
                        {filterKey && (
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={searchFilters[filterKey as keyof typeof searchFilters]}
                            onChange={(e) => { setSearchFilters({ ...searchFilters, [filterKey]: e.target.value }); setCurrentPage(1); }}
                            className="w-full px-2 py-1.5 text-xs font-normal bg-white border border-gray-200 rounded text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition duration-150">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${entry.priority === 1 ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"}`}>
                        {entry.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {entry.country ? (
                        <span className="font-medium text-gray-900">{entry.country}</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs border border-slate-200">GLOBAL</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{entry.mancode}</td>
                    <td className="px-4 py-3 text-gray-600">{entry.colorCode}</td>
                    <td className="px-4 py-3 text-gray-900 font-semibold">{entry.season}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50/50">
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium">{(currentPage - 1) * PAGE_SIZE + 1}</span> to{" "}
              <span className="font-medium">{Math.min(currentPage * PAGE_SIZE, total)}</span> of{" "}
              <span className="font-medium">{total.toLocaleString()}</span>
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition"><ChevronLeft className="w-4 h-4 text-gray-600" /></button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page = i + 1;
                if (totalPages > 5) { if (currentPage > 3) page = currentPage - 2 + i; if (currentPage > totalPages - 2) page = totalPages - 4 + i; }
                return (<button key={page} onClick={() => setCurrentPage(page)} className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition ${currentPage === page ? "bg-indigo-600 text-white shadow-sm" : "hover:bg-gray-200 text-gray-700"}`}>{page}</button>);
              })}
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition"><ChevronRight className="w-4 h-4 text-gray-600" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
