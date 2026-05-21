"use client";

import { useEffect, useState, useMemo } from "react";
import { Download, Upload, X, Check, ChevronLeft, ChevronRight, Loader2, AlertTriangle, Trash2, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";

const SEASONALITY_BRANDS = [
  { code: "56", name: "Intimissimi" },
  { code: "B6", name: "IUMAN UOMO" },
  { code: "55", name: "Calzedonia" },
  { code: "57", name: "Tezenis" },
];

// Tabs — INT and UOMO share one tab since they use the same sheet
const BRAND_TABS = [
  { id: "int-uomo", label: "Intimissimi / IUMAN UOMO", codes: ["56", "B6"] },
  { id: "cal",      label: "Calzedonia",                codes: ["55"] },
  { id: "tez",      label: "Tezenis",                   codes: ["57"] },
];

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

export default function SeasonalityAdmin() {
  const [entries, setEntries] = useState<SeasonalityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>("int-uomo");
  const [searchFilters, setSearchFilters] = useState({
    country: "", priority: "", mancode: "", colorCode: "", season: "",
  });

  const [isUploading, setIsUploading] = useState(false);
  // uploadBrands: one or more brands the file will be tagged to (INT+UOMO share a sheet)
  const [uploadBrands, setUploadBrands] = useState<string[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isClearing, setIsClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => { fetchEntries(); }, []);
  useEffect(() => { setCurrentPage(1); }, [activeTab, searchFilters]);

  async function fetchEntries() {
    try {
      setLoading(true);
      const r = await fetch("/api/admin/seasonality");
      if (!r.ok) throw new Error("Failed to fetch");
      setEntries(await r.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  // Per-tab stats (INT+UOMO combined, CAL separate, TEZ separate)
  const tabStats = useMemo(() =>
    BRAND_TABS.map((tab) => {
      const tabEntries = entries.filter((e) => tab.codes.includes(e.brandCode));
      const lastUpdated = tabEntries.length > 0
        ? new Date(Math.max(...tabEntries.map((e) => new Date(e.updatedAt).getTime())))
        : null;
      return { ...tab, count: tabEntries.length, lastUpdated };
    }), [entries]);

  const activeTabCodes = BRAND_TABS.find((t) => t.id === activeTab)?.codes ?? [];

  const filteredEntries = useMemo(() =>
    entries
      .filter((e) => activeTabCodes.includes(e.brandCode))
      .filter((e) =>
        e.country.toLowerCase().includes(searchFilters.country.toLowerCase()) &&
        e.priority.toString().includes(searchFilters.priority) &&
        e.mancode.toLowerCase().includes(searchFilters.mancode.toLowerCase()) &&
        e.colorCode.toLowerCase().includes(searchFilters.colorCode.toLowerCase()) &&
        e.season.toLowerCase().includes(searchFilters.season.toLowerCase())
      ), [entries, activeTab, searchFilters]);

  const totalPages = Math.ceil(filteredEntries.length / PAGE_SIZE);
  const paginatedEntries = filteredEntries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function handleClearAll() {
    try {
      setIsClearing(true);
      const r = await fetch("/api/admin/seasonality", { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to clear database");
      const res = await r.json();
      setSuccessMessage(`Database cleared (${res.count} records removed)`);
      setConfirmClear(false);
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsClearing(false);
    }
  }

  function handleDownload() {
    const brandName = BRAND_TABS.find((t) => t.id === activeTab)?.label ?? activeTab;
    const ws = XLSX.utils.json_to_sheet(filteredEntries.map((e) => ({
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
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (uploadBrands.length === 0) {
      setError("Please select at least one brand before uploading.");
      e.target.value = "";
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccessMessage("Parsing Excel file...");

    const brandName = uploadBrands
      .map((code) => SEASONALITY_BRANDS.find((b) => b.code === code)?.name ?? code)
      .join(" + ");

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
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
            // Only pass replaceAll on the first chunk to avoid double-delete
            replaceAll: i === 0 ? replaceExisting : false,
            brandCodes: uploadBrands,
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

      // Switch to the tab that contains the uploaded brands
      const matchingTab = BRAND_TABS.find((t) => uploadBrands.some((c) => t.codes.includes(c)));
      if (matchingTab) setActiveTab(matchingTab.id);
      fetchEntries();
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
            <span className="text-sm font-medium text-gray-600 flex-shrink-0">Upload for:</span>
            <div className="flex gap-2 flex-wrap items-center flex-1">
              {SEASONALITY_BRANDS.map((b) => {
                const selected = uploadBrands.includes(b.code);
                return (
                  <button
                    key={b.code}
                    type="button"
                    onClick={() =>
                      setUploadBrands((prev) =>
                        prev.includes(b.code) ? prev.filter((x) => x !== b.code) : [...prev, b.code]
                      )
                    }
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${selected ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"}`}
                  >
                    {b.name}
                  </button>
                );
              })}
              <span className="text-xs text-gray-400 italic">Intimissimi &amp; IUMAN UOMO share the same sheet — select both</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
              />
              <span className="text-sm text-gray-600">
                Replace {uploadBrands.length > 0
                  ? uploadBrands.map((c) => SEASONALITY_BRANDS.find((b) => b.code === c)?.name ?? c).join(" + ")
                  : "selected brands"} data
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-700">{activeTabLabel} — Seasonality Reference</p>
              <p className="text-xs text-gray-400">{filteredEntries.length.toLocaleString()} records</p>
            </div>
            <div className="flex flex-wrap gap-2">
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
              <button onClick={handleDownload} className="flex items-center gap-2 px-3 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium shadow-sm">
                <Download className="h-4 w-4" /> Download ({activeTabLabel})
              </button>
              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm transition text-sm font-medium ${uploadBrands.length === 0 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : isUploading ? "bg-indigo-400 text-white cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"}`}>
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isUploading
                  ? "Processing..."
                  : uploadBrands.length > 0
                  ? `Upload (${uploadBrands.map((c) => SEASONALITY_BRANDS.find((b) => b.code === c)?.name ?? c).join(" + ")})`
                  : "Select brand first"}
                <input type="file" accept=".xlsx,.xls" onChange={handleUpload} disabled={isUploading || uploadBrands.length === 0} className="hidden" />
              </label>
              <button onClick={fetchEntries} disabled={loading} className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition text-sm font-medium disabled:opacity-50">
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
        ) : paginatedEntries.length === 0 ? (
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
                {paginatedEntries.map((entry) => (
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
              <span className="font-medium">{Math.min(currentPage * PAGE_SIZE, filteredEntries.length)}</span> of{" "}
              <span className="font-medium">{filteredEntries.length.toLocaleString()}</span>
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
