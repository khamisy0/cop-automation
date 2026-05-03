"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Download, Upload, X, Check, Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

interface PriceMatrixEntry {
  id: number; country: string; brandCode: string; season: string; supplier: string; section: string | null;
  foreignRetailFOB: number; unitRetail: number; effectiveDate: string; expiryDate: string; createdAt: string; updatedAt: string;
}

interface FormState {
  country: string; brandCode: string; season: string; supplier: string; section: string;
  foreignRetailFOB: string; unitRetail: string; effectiveDate: string; expiryDate: string;
}

const PAGE_SIZE = 20;

export default function PriceMatrixAdmin() {
  const [entries, setEntries] = useState<PriceMatrixEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchFilters, setSearchFilters] = useState({
    country: "", brandCode: "", season: "", supplier: "", foreignRetailFOB: "", unitRetail: "", dates: ""
  });
  const [showForm, setShowForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState<FormState>({
    country: "", brandCode: "", season: "", supplier: "", section: "", foreignRetailFOB: "", unitRetail: "",
    effectiveDate: new Date().toISOString().split("T")[0],
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  useEffect(() => { fetchEntries(); }, []);

  async function fetchEntries() {
    try { setLoading(true); const r = await fetch("/api/admin/price-matrix"); if (!r.ok) throw new Error("Failed to fetch"); setEntries(await r.json()); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : "An error occurred"); }
    finally { setLoading(false); }
  }

  async function handleSave() {
    if (!formData.country.trim() || !formData.brandCode.trim() || !formData.season.trim() || !formData.supplier.trim() || !formData.foreignRetailFOB.trim() || !formData.unitRetail.trim()) { setError("Please fill in all required fields"); return; }
    const fobNum = parseFloat(formData.foreignRetailFOB);
    const unitRetailNum = parseFloat(formData.unitRetail);
    if (isNaN(fobNum) || isNaN(unitRetailNum)) { setError("Prices must be valid numbers"); return; }
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/admin/price-matrix/${editingId}` : "/api/admin/price-matrix";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        country: formData.country.trim(), brandCode: formData.brandCode.trim(), season: formData.season.trim(), supplier: formData.supplier.trim(),
        section: formData.section.trim() || null, foreignRetailFOB: fobNum, unitRetail: unitRetailNum,
        effectiveDate: new Date(formData.effectiveDate), expiryDate: new Date(formData.expiryDate),
      })});
      if (!r.ok) throw new Error("Failed to save");
      setSuccessMessage(editingId ? "Entry updated" : "Entry created"); setShowForm(false); setEditingId(null);
      setFormData({ country: "", brandCode: "", season: "", supplier: "", section: "", foreignRetailFOB: "", unitRetail: "", effectiveDate: new Date().toISOString().split("T")[0], expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] });
      setTimeout(() => setSuccessMessage(null), 3000); fetchEntries();
    } catch (err) { setError(err instanceof Error ? err.message : "An error occurred"); }
  }

  async function handleDelete(id: number) {
    try { const r = await fetch(`/api/admin/price-matrix/${id}`, { method: "DELETE" }); if (!r.ok) throw new Error("Failed to delete"); setSuccessMessage("Entry deleted"); setDeleteConfirm(null); setTimeout(() => setSuccessMessage(null), 3000); fetchEntries(); }
    catch (err) { setError(err instanceof Error ? err.message : "An error occurred"); }
  }

  async function handleDeleteAll() {
    try {
      setLoading(true);
      const r = await fetch("/api/admin/price-matrix", { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete all entries");
      setSuccessMessage("All entries deleted successfully");
      setShowDeleteAllConfirm(false);
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  }

  async function handleDownload() {
    try {
      const ws = XLSX.utils.json_to_sheet(entries.map((e) => ({ Country: e.country, "Brand Code": e.brandCode, Season: e.season, Supplier: e.supplier, Section: e.section || "", "Foreign Retail/FOB": e.foreignRetailFOB, "Unit Retail": e.unitRetail, "Effective Date": new Date(e.effectiveDate).toLocaleDateString(), "Expiry Date": new Date(e.expiryDate).toLocaleDateString() })));
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "PriceMatrix"); XLSX.writeFile(wb, "price-matrix.xlsx");
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to download"); }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploading(true);
    setSuccessMessage("Parsing Excel file...");
    setError(null);
    try {
      const data = await file.arrayBuffer(); const workbook = XLSX.read(data); const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet) as Array<any>;
      if (jsonData.length === 0) { setError("Excel file is empty"); setIsUploading(false); return; }
      
      const CHUNK_SIZE = 250;
      const totalChunks = Math.ceil(jsonData.length / CHUNK_SIZE);
      let totalCreated = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;
      let allErrors: string[] = [];
      
      for (let i = 0; i < jsonData.length; i += CHUNK_SIZE) {
        const currentChunk = Math.floor(i / CHUNK_SIZE) + 1;
        setSuccessMessage(`Uploading batch ${currentChunk} of ${totalChunks}... (${Math.min(i + CHUNK_SIZE, jsonData.length)} / ${jsonData.length} rows)`);
        
        const chunk = jsonData.slice(i, i + CHUNK_SIZE);
        const r = await fetch("/api/admin/price-matrix/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entries: chunk }) });
        
        let result;
        try { result = await r.json(); } catch(e) { throw new Error(`Server error on batch ${currentChunk}. Ensure database is running properly.`); }
        
        if (!r.ok) { let msg = result.message || result.error || "Import failed"; if (result.details) msg += `\n\nTotal rows: ${result.details.totalRows}`; if (result.errors?.length) { msg += "\n\n" + result.errors.slice(0, 5).join("\n"); } throw new Error(msg); }
        
        totalCreated += (result.created || 0);
        totalUpdated += (result.updated || 0);
        totalSkipped += (result.skipped || 0);
        if (result.errors?.length) allErrors = [...allErrors, ...result.errors];
      }
      
      if (totalCreated === 0 && totalUpdated === 0) { 
        let errs = "No entries were imported. " + (totalSkipped > 0 ? `${totalSkipped} rows skipped.` : "");
        if (allErrors.length) errs += "\n\n" + allErrors.slice(0, 5).join("\n");
        setError(errs); setIsUploading(false); return; 
      }
      if (totalSkipped > 0) {
        let warnMsg = `Imported ${totalCreated} created, ${totalUpdated} updated. Skipped ${totalSkipped} rows.`;
        if (allErrors.length) warnMsg += "\n\n" + allErrors.slice(0, 5).join("\n");
        setError(warnMsg);
        setSuccessMessage(`Partially imported (${totalCreated} created).`);
      } else {
        setSuccessMessage(`✓ Imported: ${totalCreated} created, ${totalUpdated} updated`);
      }
      setTimeout(() => setSuccessMessage(null), 4000); fetchEntries();
    } catch (err) { 
      setError(err instanceof Error ? err.message : "Failed to import file"); 
      setSuccessMessage(null);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  const filteredEntries = entries.filter((e) => {
    const datesStr = `${new Date(e.effectiveDate).toLocaleDateString()} — ${new Date(e.expiryDate).toLocaleDateString()}`;
    return (
      e.country.toLowerCase().includes(searchFilters.country.toLowerCase()) &&
      e.brandCode.toLowerCase().includes(searchFilters.brandCode.toLowerCase()) &&
      e.season.toLowerCase().includes(searchFilters.season.toLowerCase()) &&
      e.supplier.toLowerCase().includes(searchFilters.supplier.toLowerCase()) &&
      e.foreignRetailFOB.toString().includes(searchFilters.foreignRetailFOB) &&
      e.unitRetail.toString().includes(searchFilters.unitRetail) &&
      datesStr.toLowerCase().includes(searchFilters.dates.toLowerCase())
    );
  });
  const totalPages = Math.ceil(filteredEntries.length / PAGE_SIZE);
  const paginatedEntries = filteredEntries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="relative flex-1">
            <h2 className="text-lg font-semibold text-gray-900">Price Matrix Reference</h2>
            <p className="text-sm text-gray-500">Manage derived pricing rules across regions.</p>
          </div>
          <div className="flex gap-2">
            {showDeleteAllConfirm ? (
              <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                <span className="text-sm font-medium text-red-700">Delete all entries?</span>
                <button onClick={handleDeleteAll} className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition">Yes, delete</button>
                <button onClick={() => setShowDeleteAllConfirm(false)} className="px-2 py-1 bg-white text-gray-600 border border-gray-200 rounded text-xs font-medium hover:bg-gray-50 transition">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setShowDeleteAllConfirm(true)} className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition duration-200 text-sm font-medium"><Trash2 className="h-4 w-4" /> Delete All</button>
            )}
            <button onClick={() => { setShowForm(!showForm); setEditingId(null); }} className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-200 text-sm font-medium shadow-sm"><Plus className="h-4 w-4" /> Add Entry</button>
            <button onClick={handleDownload} className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition duration-200 text-sm font-medium"><Download className="h-4 w-4" /> Download</button>
            <label className={`flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-900 rounded-lg transition duration-200 text-sm font-medium ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 cursor-pointer'}`}>
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {isUploading ? "Uploading..." : "Upload"}
              <input type="file" accept=".xlsx,.xls" onChange={handleUpload} disabled={isUploading} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Edit2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">{editingId ? "Edit Entry" : "Add New Entry"}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input type="text" placeholder="Country *" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className={inputClass} />
            <input type="text" placeholder="Brand Code *" value={formData.brandCode} onChange={(e) => setFormData({ ...formData, brandCode: e.target.value })} className={inputClass} />
            <input type="text" placeholder="Season *" value={formData.season} onChange={(e) => setFormData({ ...formData, season: e.target.value })} className={inputClass} />
            <input type="text" placeholder="Supplier *" value={formData.supplier} onChange={(e) => setFormData({ ...formData, supplier: e.target.value })} className={inputClass} />
            <input type="text" placeholder="Section" value={formData.section} onChange={(e) => setFormData({ ...formData, section: e.target.value })} className={inputClass} />
            <input type="number" placeholder="Foreign Retail/FOB (€) *" value={formData.foreignRetailFOB} onChange={(e) => setFormData({ ...formData, foreignRetailFOB: e.target.value })} className={inputClass} step="0.01" />
            <input type="number" placeholder="Unit Retail (local) *" value={formData.unitRetail} onChange={(e) => setFormData({ ...formData, unitRetail: e.target.value })} className={inputClass} step="0.01" />
            <input type="date" value={formData.effectiveDate} onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })} className={inputClass} />
            <input type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} className={inputClass} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-200 text-sm font-medium shadow-sm">Save</button>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition duration-200 text-sm font-medium">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? <div className="p-12 text-center text-gray-400">Loading...</div> : paginatedEntries.length === 0 ? <div className="p-12 text-center text-gray-400">No entries found</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-200">
                {["Country", "Brand Code", "Season", "Supplier", "Foreign Retail", "Unit Retail", "Dates", "Multiplier", "Actions"].map((h) => {
                  const filterKey = h === "Country" ? "country" : h === "Brand Code" ? "brandCode" : h === "Season" ? "season" : h === "Supplier" ? "supplier" : h === "Foreign Retail" ? "foreignRetailFOB" : h === "Unit Retail" ? "unitRetail" : h === "Dates" ? "dates" : null;
                  return (
                    <th key={h} className={`px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider align-top ${['Foreign Retail', 'Unit Retail', 'Multiplier'].includes(h) ? 'text-right' : ''}`}>
                      <div className="mb-2">{h}</div>
                      {filterKey && (
                        <input
                          type="text"
                          placeholder="Filter..."
                          value={searchFilters[filterKey as keyof typeof searchFilters]}
                          onChange={(e) => { setSearchFilters({ ...searchFilters, [filterKey]: e.target.value }); setCurrentPage(1); }}
                          className="w-full px-2 py-1 text-xs font-normal bg-white border border-gray-200 rounded text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      )}
                    </th>
                  );
                })}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedEntries.map((entry) => {
                  const multiplier = entry.foreignRetailFOB > 0 ? (entry.unitRetail / entry.foreignRetailFOB).toFixed(2) : "N/A";
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50 transition duration-200">
                      <td className="px-4 py-3 text-gray-900 font-medium">{entry.country}</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">{entry.brandCode}</span></td>
                      <td className="px-4 py-3 text-gray-900">{entry.season}</td>
                      <td className="px-4 py-3 text-gray-500">{entry.supplier}</td>
                      <td className="px-4 py-3 text-right text-gray-900 font-medium">€{entry.foreignRetailFOB.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-gray-900 font-medium">€{entry.unitRetail.toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(entry.effectiveDate).toLocaleDateString()} — {new Date(entry.expiryDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs font-medium">{multiplier}x</span></td>
                      <td className="px-4 py-3">
                        {deleteConfirm === entry.id ? (
                          <div className="flex gap-1.5">
                            <button onClick={() => handleDelete(entry.id)} className="px-2 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 transition">Delete</button>
                            <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 bg-white text-gray-600 border border-gray-200 rounded text-xs font-medium hover:bg-gray-50 transition">Cancel</button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button onClick={() => { setEditingId(entry.id); setFormData({ country: entry.country, brandCode: entry.brandCode, season: entry.season, supplier: entry.supplier, section: entry.section || "", foreignRetailFOB: entry.foreignRetailFOB.toString(), unitRetail: entry.unitRetail.toString(), effectiveDate: new Date(entry.effectiveDate).toISOString().split("T")[0], expiryDate: new Date(entry.expiryDate).toISOString().split("T")[0] }); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition"><Edit2 className="h-4 w-4" /></button>
                            <button onClick={() => setDeleteConfirm(entry.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredEntries.length)} of {filteredEntries.length}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition"><ChevronLeft className="w-4 h-4 text-gray-500" /></button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => { let page = i + 1; if (totalPages > 5) { if (currentPage > 3) page = currentPage - 2 + i; if (currentPage > totalPages - 2) page = totalPages - 4 + i; } return (<button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-lg text-sm font-medium transition ${currentPage === page ? 'bg-primary text-white' : 'hover:bg-gray-100 text-gray-600'}`}>{page}</button>); })}
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition"><ChevronRight className="w-4 h-4 text-gray-500" /></button>
            </div>
          </div>
        )}
      </div>
      <div className="text-sm text-gray-400 text-center">{filteredEntries.length} total entries</div>
    </div>
  );
}
