"use client";

import { useEffect, useState, useMemo } from "react";
import { Plus, Edit2, Trash2, Download, Upload, X, Check, ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";
import { BRANDS, COUNTRY_CODES } from "@/lib/constants";
import SearchableSelect from "@/components/ui/SearchableSelect";

interface PriceMatrixEntry {
  id: number; country: string; brandCode: string; season: string; supplier: string;
  section: string | null; foreignRetailFOB: number; unitRetail: number;
  effectiveDate: string; expiryDate: string; createdAt: string; updatedAt: string;
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

  // Scope filters
  const [filterBrand, setFilterBrand] = useState("");
  const [filterCountry, setFilterCountry] = useState("");

  const [searchFilters, setSearchFilters] = useState({
    country: "", brandCode: "", season: "", supplier: "", foreignRetailFOB: "", unitRetail: "", dates: "",
  });
  const [showForm, setShowForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState<FormState>({
    country: "", brandCode: "", season: "", supplier: "", section: "",
    foreignRetailFOB: "", unitRetail: "",
    effectiveDate: new Date().toISOString().split("T")[0],
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  useEffect(() => { fetchEntries(); }, []);
  useEffect(() => { setCurrentPage(1); }, [filterBrand, filterCountry, searchFilters]);

  async function fetchEntries() {
    try {
      setLoading(true);
      const r = await fetch("/api/admin/price-matrix");
      if (!r.ok) throw new Error("Failed to fetch");
      setEntries(await r.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  // Per-country summary: count, brands covered, last updated
  const countryStats = useMemo(() => {
    const map: Record<string, { count: number; brands: Set<string>; lastUpdated: Date | null }> = {};
    entries.forEach((e) => {
      if (!map[e.country]) map[e.country] = { count: 0, brands: new Set(), lastUpdated: null };
      map[e.country].count++;
      map[e.country].brands.add(e.brandCode);
      const d = new Date(e.updatedAt);
      if (!map[e.country].lastUpdated || d > map[e.country].lastUpdated!) map[e.country].lastUpdated = d;
    });
    // Order by COUNTRY_CODES list, then add any unknown countries
    const ordered: { country: string; count: number; brands: Set<string>; lastUpdated: Date | null }[] = [];
    COUNTRY_CODES.forEach((c) => { if (map[c.name]) ordered.push({ country: c.name, ...map[c.name] }); });
    Object.keys(map).forEach((k) => { if (!COUNTRY_CODES.find((c) => c.name === k)) ordered.push({ country: k, ...map[k] }); });
    return ordered;
  }, [entries]);

  // Entries filtered by scope dropdowns + column search filters
  const filteredEntries = useMemo(() => {
    return entries
      .filter((e) => !filterBrand || e.brandCode === filterBrand)
      .filter((e) => !filterCountry || e.country === filterCountry)
      .filter((e) => {
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
  }, [entries, filterBrand, filterCountry, searchFilters]);

  const totalPages = Math.ceil(filteredEntries.length / PAGE_SIZE);
  const paginatedEntries = filteredEntries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function resetForm() {
    setFormData({
      country: "", brandCode: "", season: "", supplier: "", section: "",
      foreignRetailFOB: "", unitRetail: "",
      effectiveDate: new Date().toISOString().split("T")[0],
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    });
  }

  // Scope label for messaging
  const scopeLabel = useMemo(() => {
    const parts = [];
    if (filterBrand) parts.push(BRANDS.find((b) => b.code === filterBrand)?.name ?? filterBrand);
    if (filterCountry) parts.push(filterCountry);
    return parts.length > 0 ? parts.join(" / ") : "";
  }, [filterBrand, filterCountry]);

  async function handleSave() {
    if (!formData.country.trim() || !formData.brandCode.trim() || !formData.season.trim() || !formData.supplier.trim() || !formData.foreignRetailFOB.trim() || !formData.unitRetail.trim()) {
      setError("Please fill in all required fields"); return;
    }
    const fobNum = parseFloat(formData.foreignRetailFOB);
    const unitRetailNum = parseFloat(formData.unitRetail);
    if (isNaN(fobNum) || isNaN(unitRetailNum)) { setError("Prices must be valid numbers"); return; }
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/admin/price-matrix/${editingId}` : "/api/admin/price-matrix";
      const r = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: formData.country.trim(), brandCode: formData.brandCode.trim(),
          season: formData.season.trim(), supplier: formData.supplier.trim(),
          section: formData.section.trim() || null, foreignRetailFOB: fobNum, unitRetail: unitRetailNum,
          effectiveDate: new Date(formData.effectiveDate), expiryDate: new Date(formData.expiryDate),
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
      const r = await fetch(`/api/admin/price-matrix/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete");
      setSuccessMessage("Entry deleted"); setDeleteConfirm(null);
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchEntries();
    } catch (err) { setError(err instanceof Error ? err.message : "An error occurred"); }
  }

  async function handleDeleteAll() {
    try {
      setLoading(true);
      const r = await fetch("/api/admin/price-matrix", { method: "DELETE" });
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

  // Download exports only the currently filtered view
  function handleDownload() {
    const filename = ["price-matrix", filterBrand || null, filterCountry || null].filter(Boolean).join("-");
    const ws = XLSX.utils.json_to_sheet(filteredEntries.map((e) => ({
      Country: e.country, "Brand Code": e.brandCode, Season: e.season, Supplier: e.supplier,
      Section: e.section ?? "", "Foreign Retail/FOB": e.foreignRetailFOB, "Unit Retail": e.unitRetail,
      "Effective Date": new Date(e.effectiveDate).toLocaleDateString(),
      "Expiry Date": new Date(e.expiryDate).toLocaleDateString(),
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PriceMatrix");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploading(true); setSuccessMessage("Parsing file..."); setError(null);
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
        const r = await fetch("/api/admin/price-matrix/import", {
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
        setError(`No entries imported${scopeLabel ? ` for ${scopeLabel}` : ""}.${totalSkipped > 0 ? ` ${totalSkipped} skipped.` : ""}${allErrors.length ? "\n" + allErrors.slice(0, 5).join("\n") : ""}`);
        return;
      }
      setSuccessMessage(`✓ ${totalCreated} added, ${totalUpdated} updated${scopeLabel ? ` for ${scopeLabel}` : ""}${totalSkipped > 0 ? ` (${totalSkipped} skipped)` : ""}`);
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

      {/* Per-country summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">All Countries</p>
          <p className="text-2xl font-bold text-gray-900">{entries.length.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">{countryStats.length} countries with data</p>
        </div>
        {countryStats.map((c) => (
          <button
            key={c.country}
            onClick={() => setFilterCountry(filterCountry === c.country ? "" : c.country)}
            className={`text-left bg-white rounded-xl border shadow-sm p-4 transition hover:shadow-md ${filterCountry === c.country ? "border-indigo-400 ring-2 ring-indigo-100" : "border-gray-200"}`}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{c.country}</p>
              <span className="text-xs text-gray-400">{c.brands.size} brand{c.brands.size !== 1 ? "s" : ""}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{c.count.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">
              {c.lastUpdated ? `Updated ${c.lastUpdated.toLocaleDateString()}` : "No data"}
            </p>
          </button>
        ))}
      </div>

      {/* Toolbar with scope filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Scope filter bar */}
        <div className="flex flex-wrap items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-500 flex-shrink-0">Filter by:</span>
          <div className="w-48">
            <SearchableSelect
              options={[{ value: "", label: "All Brands" }, ...BRANDS.map((b) => ({ value: b.code, label: `${b.name} (${b.code})` }))]}
              value={filterBrand}
              onChange={setFilterBrand}
              placeholder="All Brands"
            />
          </div>
          <div className="w-48">
            <SearchableSelect
              options={[{ value: "", label: "All Countries" }, ...COUNTRY_CODES.map((c) => ({ value: c.name, label: `${c.name} - ${c.code}` }))]}
              value={filterCountry}
              onChange={setFilterCountry}
              placeholder="All Countries"
            />
          </div>
          {(filterBrand || filterCountry) && (
            <button
              onClick={() => { setFilterBrand(""); setFilterCountry(""); }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-medium text-gray-700">
              {scopeLabel ? `Price Matrix — ${scopeLabel}` : "Price Matrix Reference"}
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
              Download{scopeLabel ? ` (${scopeLabel})` : ""}
            </button>
            <label className={`flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-900 rounded-lg transition text-sm font-medium ${isUploading ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-200 cursor-pointer"}`}>
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload{scopeLabel ? ` (${scopeLabel})` : ""}
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
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Edit2 className="w-5 h-5" /></div>
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
                  {(["Country", "Brand Code", "Season", "Supplier", "Foreign Retail", "Unit Retail", "Dates", "Multiplier", "Actions"] as const).map((h) => {
                    const filterKey = h === "Country" ? "country" : h === "Brand Code" ? "brandCode" : h === "Season" ? "season" : h === "Supplier" ? "supplier" : h === "Foreign Retail" ? "foreignRetailFOB" : h === "Unit Retail" ? "unitRetail" : h === "Dates" ? "dates" : null;
                    return (
                      <th key={h} className={`px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider align-top ${["Foreign Retail", "Unit Retail", "Multiplier"].includes(h) ? "text-right" : ""}`}>
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
                {paginatedEntries.map((entry) => {
                  const multiplier = entry.foreignRetailFOB > 0 ? (entry.unitRetail / entry.foreignRetailFOB).toFixed(2) : "N/A";
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-900 font-medium">{entry.country}</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">{entry.brandCode}</span></td>
                      <td className="px-4 py-3 text-gray-900">{entry.season}</td>
                      <td className="px-4 py-3 text-gray-500">{entry.supplier}</td>
                      <td className="px-4 py-3 text-right text-gray-900 font-medium">€{entry.foreignRetailFOB.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-gray-900 font-medium">€{entry.unitRetail.toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(entry.effectiveDate).toLocaleDateString()} — {new Date(entry.expiryDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs font-medium">{multiplier}x</span></td>
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
                              setFormData({ country: entry.country, brandCode: entry.brandCode, season: entry.season, supplier: entry.supplier, section: entry.section ?? "", foreignRetailFOB: entry.foreignRetailFOB.toString(), unitRetail: entry.unitRetail.toString(), effectiveDate: new Date(entry.effectiveDate).toISOString().split("T")[0], expiryDate: new Date(entry.expiryDate).toISOString().split("T")[0] });
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
                  );
                })}
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
