"use client";

import { useEffect, useState } from "react";
import { Download, Upload, X, Check, Search, ChevronLeft, ChevronRight, Loader2, AlertTriangle, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";

interface SeasonalityEntry {
  id: number;
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
  const [searchFilters, setSearchFilters] = useState({
    country: "", priority: "", mancode: "", colorCode: "", season: ""
  });
  
  const [isUploading, setIsUploading] = useState(false);
  const [replaceAll, setReplaceAll] = useState(true); // Default to replacing the source of truth
  const [currentPage, setCurrentPage] = useState(1);
  const [isClearing, setIsClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => { fetchEntries(); }, []);

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

  async function handleDownload() {
    try {
      const ws = XLSX.utils.json_to_sheet(entries.map((e) => ({
        "Country": e.country || "GLOBAL",
        "Priority": e.priority,
        "From (date)": e.fromDate1 || "",
        "Mancode": e.mancode,
        "Color Code": e.colorCode,
        "Season": e.season,
        "From (second)": e.fromDate2 || "",
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "SeasonalityReference");
      XLSX.writeFile(wb, "seasonality-reference.xlsx");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download");
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    setError(null);
    setSuccessMessage("Parsing Excel file...");
    
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
      let totalCreated = 0;
      let totalSkipped = 0;
      let allErrors: string[] = [];

      for (let i = 0; i < jsonData.length; i += CHUNK_SIZE) {
        const currentChunk = Math.floor(i / CHUNK_SIZE) + 1;
        setSuccessMessage(`Uploading batch ${currentChunk} of ${totalChunks}... (${Math.min(i + CHUNK_SIZE, jsonData.length)} / ${jsonData.length} rows)`);
        
        const chunk = jsonData.slice(i, i + CHUNK_SIZE);
        const isFirstChunk = i === 0;

        const r = await fetch("/api/admin/seasonality/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entries: chunk, replaceAll: isFirstChunk ? replaceAll : false }),
        });
        
        const result = await r.json();
        
        if (!r.ok) {
          throw new Error(result.message || result.error || `Import failed on batch ${currentChunk}`);
        }

        totalCreated += (result.created || 0);
        totalSkipped += (result.skipped || 0);
        if (result.errors && Array.isArray(result.errors)) {
          allErrors = [...allErrors, ...result.errors];
        }
      }
      
      if (totalSkipped > 0) {
        setError(`Successfully imported ${totalCreated} rows. Skipped ${totalSkipped} rows due to missing mandatory fields.`);
        if (allErrors.length) {
          console.warn("Import errors:", allErrors);
        }
      } else {
        setSuccessMessage(`✓ Successfully imported all ${totalCreated} reference records`);
        setTimeout(() => setSuccessMessage(null), 5000);
      }
      
      fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import file");
      setSuccessMessage(null);
    } finally {
      setIsUploading(false);
      e.target.value = ""; // reset input
    }
  }

  const filteredEntries = entries.filter((e) => {
    return (
      e.country.toLowerCase().includes(searchFilters.country.toLowerCase()) &&
      e.priority.toString().includes(searchFilters.priority) &&
      e.mancode.toLowerCase().includes(searchFilters.mancode.toLowerCase()) &&
      e.colorCode.toLowerCase().includes(searchFilters.colorCode.toLowerCase()) &&
      e.season.toLowerCase().includes(searchFilters.season.toLowerCase())
    );
  });
  
  const totalPages = Math.ceil(filteredEntries.length / PAGE_SIZE);
  const paginatedEntries = filteredEntries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-6 animate-fade-in p-6 bg-gray-50/50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Seasonality Validation Reference</h1>
        <p className="text-gray-500 mt-1">Manage the centralized source of truth for variant expected seasons.</p>
      </div>

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

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-200">
              <input 
                type="checkbox" 
                id="replaceAll"
                checked={replaceAll}
                onChange={(e) => setReplaceAll(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
              />
              <label htmlFor="replaceAll" className="text-sm font-medium text-amber-900 cursor-pointer select-none">
                Replace entire database on upload
              </label>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition duration-200 text-sm font-medium shadow-sm">
              <Download className="h-4 w-4" /> Export Data
            </button>
            <label className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-sm transition duration-200 text-sm font-medium ${isUploading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-indigo-700 cursor-pointer hover:shadow'}`}>
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {isUploading ? "Processing..." : "Upload Master Sheet"}
              <input type="file" accept=".xlsx,.xls" onChange={handleUpload} disabled={isUploading} className="hidden" />
            </label>
            
            <div className="w-px h-8 bg-gray-200 mx-1"></div>
            
            {confirmClear ? (
              <div className="flex items-center gap-2 animate-fade-in">
                <span className="text-sm text-red-600 font-medium px-2">Are you sure?</span>
                <button onClick={handleClearAll} disabled={isClearing} className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium shadow-sm transition">Yes, Clear Database</button>
                <button onClick={() => setConfirmClear(false)} className="px-3 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmClear(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-300 transition duration-200 text-sm font-medium shadow-sm">
                <Trash2 className="h-4 w-4" /> Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-gray-400 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p>Loading database...</p>
          </div>
        ) : paginatedEntries.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-gray-400 gap-3">
            <AlertTriangle className="h-10 w-10 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">No reference data found</p>
            <p className="text-sm">Upload a master sheet to begin validation.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {["Priority", "Country", "Mancode", "Color Code", "Target Season"].map((h) => {
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
                      <span className={`px-2 py-1 rounded text-xs font-bold ${entry.priority === 1 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
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
            <p className="text-sm text-gray-500">Showing <span className="font-medium">{(currentPage - 1) * PAGE_SIZE + 1}</span> to <span className="font-medium">{Math.min(currentPage * PAGE_SIZE, filteredEntries.length)}</span> of <span className="font-medium">{filteredEntries.length}</span> entries</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition"><ChevronLeft className="w-4 h-4 text-gray-600" /></button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => { 
                let page = i + 1; 
                if (totalPages > 5) { 
                  if (currentPage > 3) page = currentPage - 2 + i; 
                  if (currentPage > totalPages - 2) page = totalPages - 4 + i; 
                } 
                return (
                  <button key={page} onClick={() => setCurrentPage(page)} className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition ${currentPage === page ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-gray-200 text-gray-700'}`}>
                    {page}
                  </button>
                ); 
              })}
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition"><ChevronRight className="w-4 h-4 text-gray-600" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
