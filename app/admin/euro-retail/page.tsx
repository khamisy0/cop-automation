"use client";

import { useEffect, useState, useMemo } from "react";
import { Plus, Edit2, Trash2, Download, Upload, X, Check, ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";
import { BRANDS } from "@/lib/constants";

interface EuroRetailEntry {
  id: number; batchNumber: string; lineNumber: string; brandCode: string; brandDescription: string;
  mancode: string; colorSize: string; effectiveDate: string; importFileColor: string | null;
  importFileSizeList: string | null; euroRetail: number; createdAt: string; updatedAt: string;
}

interface FormState {
  batchNumber: string; lineNumber: string; brandCode: string; brandDescription: string;
  mancode: string; colorSize: string; effectiveDate: string; importFileColor: string;
  importFileSizeList: string; euroRetail: string;
}

const PAGE_SIZE = 20;

export default function EuroRetailAdmin() {
  const [entries, setEntries] = useState<EuroRetailEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeBrand, setActiveBrand] = useState<string>("all");
  const [searchFilters, setSearchFilters] = useState({
    batchNumber: "", lineNumber: "", brandCode: "", brandDescription: "",
    mancode: "", colorSize: "", effectiveDate: "", euroRetail: "",
  });
  const [showForm, setShowForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState<FormState>({
    batchNumber: "", lineNumber: "", brandCode: "", brandDescription: "",
    mancode: "", colorSize: "", effectiveDate: new Date().toISOString().split("T")[0],
    importFileColor: "", importFileSizeList: "", euroRetail: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  useEffect(() => { fetchEntries(); }, []);
  useEffect(() => { setCurrentPage(1); }, [activeBrand, searchFilters]);

  async function fetchEntries() {
    try {
      setLoading(true);
      const r = await fetch("/api/admin/euro-retail");
      if (!r.ok) throw new Error("Failed to fetch");
      setEntries(await r.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  // Per-brand summary stats computed from loaded data
  const brandStats = useMemo(() =>
    BRANDS.map((b) => {
      const brandEntries = entries.filter((e) => e.brandCode === b.code);
      const lastUpdated = brandEntries.length > 0
        ? new Date(Math.max(...brandEntries.map((e) => new Date(e.updatedAt).getTime())))
        : null;
      return { ...b, count: brandEntries.length, lastUpdated };
    }), [entries]);

  // Entries filtered by active brand tab + column search filters
  const filteredEntries = useMemo(() => {
    return entries
      .filter((e) => activeBrand === "all" || e.brandCode === activeBrand)
      .filter((e) =>
        e.batchNumber.toLowerCase().includes(searchFilters.batchNumber.toLowerCase()) &&
        e.lineNumber.toLowerCase().includes(searchFilters.lineNumber.toLowerCase()) &&
        e.brandCode.toLowerCase().includes(searchFilters.brandCode.toLowerCase()) &&
        e.brandDescription.toLowerCase().includes(searchFilters.brandDescription.toLowerCase()) &&
        e.mancode.toLowerCase().includes(searchFilters.mancode.toLowerCase()) &&
        e.colorSize.toLowerCase().includes(searchFilters.colorSize.toLowerCase()) &&
        new Date(e.effectiveDate).toLocaleDateString().includes(searchFilters.effectiveDate) &&
        e.euroRetail.toString().includes(searchFilters.euroRetail)
      );
  }, [entries, activeBrand, searchFilters]);

  const totalPages = Math.ceil(filteredEntries.length / PAGE_SIZE);
  const paginatedEntries = filteredEntries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function resetForm() {
    setFormData({
      batchNumber: "", lineNumber: "", brandCode: "", brandDescription: "",
      mancode: "", colorSize: "", effectiveDate: new Date().toISOString().split("T")[0],
      importFileColor: "", importFileSizeList: "", euroRetail: "",
    });
  }

  async function handleSave() {
    if (!formData.batchNumber.trim() || !formData.lineNumber.trim() || !formData.brandCode.trim() || !formData.mancode.trim() || !formData.euroRetail.trim()) {
      setError("Please fill in all required fields"); return;
    }
    const euroRetailNum = parseFloat(formData.euroRetail);
    if (isNaN(euroRetailNum)) { setError("Euro Retail must be a valid number"); return; }
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/admin/euro-retail/${editingId}` : "/api/admin/euro-retail";
      const r = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchNumber: formData.batchNumber.trim(), lineNumber: formData.lineNumber.trim(),
          brandCode: formData.brandCode.trim(), brandDescription: formData.brandDescription.trim(),
          mancode: formData.mancode.trim(), colorSize: formData.colorSize.trim(),
          effectiveDate: new Date(formData.effectiveDate),
          importFileColor: formData.importFileColor.trim() || null,
          importFileSizeList: formData.importFileSizeList.trim() || null,
          euroRetail: euroRetailNum,
        }),
      });
      if (!r.ok) throw new Error("Failed to save");
      setSuccessMessage(editingId ? "Entry updated" : "Entry created");
      setShowForm(false); setEditingId(null); resetForm();
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchEntries();
    } catch (err) { setError(err instanceof Error ? err.message : "An error occurred"); }
  }

  async function handleDelete(id: number) {
    try {
      const r = await fetch(`/api/admin/euro-retail/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete");
      setSuccessMessage("Entry deleted"); setDeleteConfirm(null);
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchEntries();
    } catch (err) { setError(err instanceof Error ? err.message : "An error occurred"); }
  }

  async function handleDeleteAll() {
    try {
      setLoading(true);
      const r = await fetch("/api/admin/euro-retail", { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete all entries");
      setSuccessMessage("All entries deleted");
      setShowDeleteAllConfirm(false);
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  }

  // Download exports only what's currently visible (respects active brand + filters)
  function handleDownload() {
    const brandLabel = activeBrand === "all" ? "all-brands" : (BRANDS.find((b) => b.code === activeBrand)?.name ?? activeBrand).toLowerCase().replace(/\s+/g, "-");
    const ws = XLSX.utils.json_to_sheet(filteredEntries.map((e) => ({
      "Batch Number": e.batchNumber, "Line Number": e.lineNumber,
      "Brand Code": e.brandCode, "Brand Description": e.brandDescription,
      Mancode: e.mancode, "Color Size": e.colorSize,
      "Effective Date": new Date(e.effectiveDate).toLocaleDateString(),
      "Import File Color": e.importFileColor ?? "",
      "Import File Size List": e.importFileSizeList ?? "",
      "Euro Retail": e.euroRetail,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "EuroRetail");
    XLSX.writeFile(wb, `euro-retail-${brandLabel}.xlsx`);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploading(true); setSuccessMessage("Parsing file..."); setError(null);
    const brandLabel = activeBrand === "all" ? "" : ` for ${BRANDS.find((b) => b.code === activeBrand)?.name}`;
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet) as Array<any>;
      if (jsonData.length === 0) { setError("File is empty"); setIsUploading(false); return; }

      const CHUNK_SIZE = 250;
      const totalChunks = Math.ceil(jsonData.length / CHUNK_SIZE);
      let totalCreated = 0, totalUpdated = 0, totalSkipped = 0;
      let allErrors: string[] = [];

      for (let i = 0; i < jsonData.length; i += CHUNK_SIZE) {
        const chunk = Math.floor(i / CHUNK_SIZE) + 1;
        setSuccessMessage(`Uploading batch ${chunk} of ${totalChunks}...`);
        const r = await fetch("/api/admin/euro-retail/import", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entries: jsonData.slice(i, i + CHUNK_SIZE) }),
        });
        let result;
        try { result = await r.json(); } catch { throw new Error(`Server error on batch ${chunk}.`); }
        if (!r.ok) throw new Error(result.message || result.error || "Import failed");
        totalCreated += result.created || 0;
        totalUpdated += result.updated || 0;
        totalSkipped += result.skipped || 0;
        if (result.errors?.length) allErrors = [...allErrors, ...result.errors];
      }

      if (totalCreated === 0 && totalUpdated === 0) {
        setError(`No entries imported${brandLabel}.${totalSkipped > 0 ? ` ${totalSkipped} skipped.` : ""}${allErrors.length ? "\n" + allErrors.slice(0, 5).join("\n") : ""}`);
        return;
      }
      setSuccessMessage(`✓ ${totalCreated} added, ${totalUpdated} updated${brandLabel}${totalSkipped > 0 ? ` (${totalSkipped} skipped)` : ""}`);
      setTimeout(() => setSuccessMessage(null), 5000);
      fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import");
      setSuccessMessage(null);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  const inputClass = "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200";

  return (
    <div className="space-y-6 animate-fade-in">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <X className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 whitespace-pre-wrap flex-1">{error}</p>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded transition"><X className="w-4 h-4 text-red-400" /></button>
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
          <Check className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-700">{successMessage}</p>
        </div>
      )}

      {/* Per-brand summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">All Brands</p>
          <p className="text-2xl font-bold text-gray-900">{entries.length.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">total records</p>
        </div>
        {brandStats.map((b) => (
          <button
            key={b.code}
            onClick={() => setActiveBrand(activeBrand === b.code ? "all" : b.code)}
            className={`text-left bg-white rounded-xl border shadow-sm p-4 transition hover:shadow-md ${activeBrand === b.code ? "border-indigo-400 ring-2 ring-indigo-100" : "border-gray-200"}`}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide truncate">{b.name}</p>
              <span className="text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded ml-1 flex-shrink-0">{b.code}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{b.count.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">
              {b.lastUpdated ? `Updated ${b.lastUpdated.toLocaleDateString()}` : "No data"}
            </p>
          </button>
        ))}
      </div>

      {/* Toolbar with brand tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Brand tabs */}
        <div className="flex border-b border-gray-100 overflow-x-auto">
          <button
            onClick={() => setActiveBrand("all")}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition border-b-2 -mb-px ${activeBrand === "all" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            All ({entries.length.toLocaleString()})
          </button>
          {brandStats.map((b) => (
            <button
              key={b.code}
              onClick={() => setActiveBrand(b.code)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition border-b-2 -mb-px ${activeBrand === b.code ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {b.name} ({b.count.toLocaleString()})
            </button>
          ))}
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-medium text-gray-700">
              {activeBrand === "all" ? "Euro Retail Reference" : `${BRANDS.find((b) => b.code === activeBrand)?.name} — Euro Retail`}
            </p>
            <p className="text-xs text-gray-400">{filteredEntries.length.toLocaleString()} records shown</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {showDeleteAllConfirm ? (
              <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                <span className="text-sm font-medium text-red-700">Delete all?</span>
                <button onClick={handleDeleteAll} className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition">Yes</button>
                <button onClick={() => setShowDeleteAllConfirm(false)} className="px-2 py-1 bg-white text-gray-600 border border-gray-200 rounded text-xs font-medium hover:bg-gray-50 transition">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setShowDeleteAllConfirm(true)} className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium">
                <Trash2 className="h-4 w-4" /> Delete All
              </button>
            )}
            <button onClick={() => { setShowForm(!showForm); setEditingId(null); resetForm(); }} className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium shadow-sm">
              <Plus className="h-4 w-4" /> Add Entry
            </button>
            <button onClick={handleDownload} className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition text-sm font-medium">
              <Download className="h-4 w-4" />
              Download{activeBrand !== "all" ? ` (${BRANDS.find((b) => b.code === activeBrand)?.name})` : ""}
            </button>
            <label className={`flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-900 rounded-lg transition text-sm font-medium ${isUploading ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-200 cursor-pointer"}`}>
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload{activeBrand !== "all" ? ` (${BRANDS.find((b) => b.code === activeBrand)?.name})` : ""}
              <input type="file" accept=".xlsx,.xls" onChange={handleUpload} disabled={isUploading} className="hidden" />
            </label>
            <button onClick={fetchEntries} disabled={loading} className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition text-sm font-medium disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Edit2 className="w-5 h-5" /></div>
            <h3 className="text-lg font-medium text-gray-900">{editingId ? "Edit Entry" : "Add New Entry"}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input type="text" placeholder="Batch Number *" value={formData.batchNumber} onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })} className={inputClass} />
            <input type="text" placeholder="Line Number *" value={formData.lineNumber} onChange={(e) => setFormData({ ...formData, lineNumber: e.target.value })} className={inputClass} />
            <input type="text" placeholder="Brand Code *" value={formData.brandCode} onChange={(e) => setFormData({ ...formData, brandCode: e.target.value })} className={inputClass} />
            <input type="text" placeholder="Brand Description" value={formData.brandDescription} onChange={(e) => setFormData({ ...formData, brandDescription: e.target.value })} className={inputClass} />
            <input type="text" placeholder="Mancode *" value={formData.mancode} onChange={(e) => setFormData({ ...formData, mancode: e.target.value })} className={inputClass} />
            <input type="text" placeholder="Color Size" value={formData.colorSize} onChange={(e) => setFormData({ ...formData, colorSize: e.target.value })} className={inputClass} />
            <input type="date" value={formData.effectiveDate} onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })} className={inputClass} />
            <input type="text" placeholder="Import File Color" value={formData.importFileColor} onChange={(e) => setFormData({ ...formData, importFileColor: e.target.value })} className={inputClass} />
            <input type="text" placeholder="Import File Size List" value={formData.importFileSizeList} onChange={(e) => setFormData({ ...formData, importFileSizeList: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Euro Retail *" value={formData.euroRetail} onChange={(e) => setFormData({ ...formData, euroRetail: e.target.value })} className={inputClass} step="0.01" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium shadow-sm">Save</button>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition text-sm font-medium">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading...
          </div>
        ) : paginatedEntries.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No entries found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {(["Batch #", "Line #", "Brand Code", "Brand Desc.", "Mancode", "Color Size", "Eff. Date", "Euro Retail", "Actions"] as const).map((h) => {
                    const filterKey = h === "Batch #" ? "batchNumber" : h === "Line #" ? "lineNumber" : h === "Brand Code" ? "brandCode" : h === "Brand Desc." ? "brandDescription" : h === "Mancode" ? "mancode" : h === "Color Size" ? "colorSize" : h === "Eff. Date" ? "effectiveDate" : h === "Euro Retail" ? "euroRetail" : null;
                    return (
                      <th key={h} className={`px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider align-top ${h === "Euro Retail" ? "text-right" : ""}`}>
                        <div className="mb-2">{h}</div>
                        {filterKey && (
                          <input type="text" placeholder="Filter..." value={searchFilters[filterKey as keyof typeof searchFilters]}
                            onChange={(e) => setSearchFilters({ ...searchFilters, [filterKey]: e.target.value })}
                            className="w-full px-2 py-1 text-xs font-normal bg-white border border-gray-200 rounded text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-900">{entry.batchNumber}</td>
                    <td className="px-4 py-3 text-gray-900">{entry.lineNumber}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">{entry.brandCode}</span></td>
                    <td className="px-4 py-3 text-gray-500">{entry.brandDescription}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{entry.mancode}</td>
                    <td className="px-4 py-3 text-gray-500">{entry.colorSize}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(entry.effectiveDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium">€{entry.euroRetail.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      {deleteConfirm === entry.id ? (
                        <div className="flex gap-1.5">
                          <button onClick={() => handleDelete(entry.id)} className="px-2 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 transition">Delete</button>
                          <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 bg-white text-gray-600 border border-gray-200 rounded text-xs font-medium hover:bg-gray-50 transition">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <button onClick={() => {
                            setEditingId(entry.id);
                            setFormData({ batchNumber: entry.batchNumber, lineNumber: entry.lineNumber, brandCode: entry.brandCode, brandDescription: entry.brandDescription, mancode: entry.mancode, colorSize: entry.colorSize, effectiveDate: new Date(entry.effectiveDate).toISOString().split("T")[0], importFileColor: entry.importFileColor ?? "", importFileSizeList: entry.importFileSizeList ?? "", euroRetail: entry.euroRetail.toString() });
                            setShowForm(true);
                          }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteConfirm(entry.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredEntries.length)} of {filteredEntries.length.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition"><ChevronLeft className="w-4 h-4 text-gray-500" /></button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page = i + 1;
                if (totalPages > 5) { if (currentPage > 3) page = currentPage - 2 + i; if (currentPage > totalPages - 2) page = totalPages - 4 + i; }
                return (<button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-lg text-sm font-medium transition ${currentPage === page ? "bg-indigo-600 text-white" : "hover:bg-gray-100 text-gray-600"}`}>{page}</button>);
              })}
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition"><ChevronRight className="w-4 h-4 text-gray-500" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
