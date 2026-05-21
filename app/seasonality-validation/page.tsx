"use client";

import { useState } from "react";
import { Upload, FileText, CheckCircle, AlertTriangle, Download, Loader2, Globe } from "lucide-react";
import * as XLSX from "xlsx";
import { ValidationEngineResponse } from "@/modules/seasonality/types";
import { COUNTRY_CODES } from "@/lib/constants";
import SearchableSelect from "@/components/ui/SearchableSelect";

const SEASONALITY_BRANDS = [
  { code: "56", name: "Intimissimi" },
  { code: "B6", name: "IUMAN UOMO" },
  { code: "55", name: "Calzedonia" },
  { code: "57", name: "Tezenis" },
];

export default function SeasonalityValidation() {
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ValidationEngineResponse | null>(null);
  const [pasteData, setPasteData] = useState("");
  const [targetBrand, setTargetBrand] = useState("");
  const [targetCountry, setTargetCountry] = useState("UAE");

  async function processData(data: any[]) {
    try {
      setIsProcessing(true);
      setError(null);
      setResults(null);

      const r = await fetch("/api/seasonality-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: data, targetCountry, targetBrand }),
      });

      const res = await r.json();

      if (!r.ok) {
        throw new Error(res.error || res.message || "Failed to process data");
      }

      setResults(res as ValidationEngineResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!targetBrand) {
      setError("Please select a brand before uploading.");
      e.target.value = "";
      return;
    }
    if (!targetCountry.trim()) {
      setError("Please specify the target country before uploading.");
      e.target.value = "";
      return;
    }

    try {
      setIsProcessing(true);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet) as Array<any>;

      if (jsonData.length === 0) {
        throw new Error("The uploaded Excel file is empty.");
      }

      await processData(jsonData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read Excel file");
      setIsProcessing(false);
    }
    
    e.target.value = "";
  }

  function handlePasteSubmit() {
    if (!targetBrand) {
      setError("Please select a brand.");
      return;
    }
    if (!targetCountry.trim()) {
      setError("Please specify the target country.");
      return;
    }

    if (!pasteData.trim()) {
      setError("Please paste some data first.");
      return;
    }

    try {
      const rows = pasteData.trim().split("\n");
      const parsedData = [];
      
      for (let i = 0; i < rows.length; i++) {
        // Splitting by tabs perfectly separates Excel columns and respects completely empty cells
        const values = rows[i].split("\t");
        
        // Skip Header Rows just in case the user accidentally copied them anyway
        const joinedStr = values.join("").toLowerCase();
        if (joinedStr.includes("mancode") || joinedStr.includes("articlecode")) {
          continue;
        }

        // Expected format: line nb(0), seq(1), mancode(2), barcode(3), color(4)...
        if (values.length >= 5) {
          const mancodeVal = values[2]?.trim();
          const colorVal = values[4]?.trim();

          if (mancodeVal && colorVal) {
            parsedData.push({ mancode: mancodeVal, color: colorVal });
          }
        }
      }

      if (parsedData.length === 0) {
        throw new Error("Could not parse data. Make sure it's copied directly from Excel (Mancode in 3rd column, Color in 5th column).");
      }

      processData(parsedData);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse pasted data.");
    }
  }

  function handleDownload() {
    if (!results) return;

    const wsData = results.results.map((r) => ({
      Mancode: r.mancode,
      "Color Code": r.colorCode,
      Country: r.country,
      "Target Season": r.correctSeason || "Not in DB",
      "Priority Matched": r.priorityUsed || "None",
      Status: r.status,
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Validation Results");
    XLSX.writeFile(wb, "season_lookups.xlsx");
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Found": return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case "Not Found": return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Found": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Not Found": return "bg-amber-100 text-amber-700 border-amber-200";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Season Lookup Request</h1>
          <p className="text-gray-500 mt-1">Extract the correct season for a list of items using the Master Reference Sheet.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!results && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 bg-indigo-100 rounded-lg flex-shrink-0"><Globe className="w-5 h-5 text-indigo-600" /></div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Brand &amp; Market</h3>
                <p className="text-xs text-gray-500">Select the brand and country to validate against</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <SearchableSelect
                options={SEASONALITY_BRANDS.map((b) => ({ value: b.code, label: `${b.name} - ${b.code}` }))}
                value={targetBrand}
                onChange={setTargetBrand}
                placeholder="Select brand *"
                className="w-full sm:w-52"
              />
              <SearchableSelect
                options={[
                  { value: '', label: 'GLOBAL (No specific country)' },
                  ...COUNTRY_CODES.map((c) => ({ value: c.name, label: `${c.name} - ${c.code}` })),
                ]}
                value={targetCountry}
                onChange={setTargetCountry}
                placeholder="Select country"
                className="w-full sm:w-52"
              />
            </div>
          </div>

          <div className="flex border-b border-gray-200">
            <button 
              onClick={() => setActiveTab("upload")} 
              className={`flex-1 py-4 text-sm font-medium transition flex justify-center items-center gap-2 ${activeTab === 'upload' ? 'bg-indigo-50/50 text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              <Upload className="w-4 h-4" /> Upload Excel
            </button>
            <button 
              onClick={() => setActiveTab("paste")} 
              className={`flex-1 py-4 text-sm font-medium transition flex justify-center items-center gap-2 ${activeTab === 'paste' ? 'bg-indigo-50/50 text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              <FileText className="w-4 h-4" /> Paste Data
            </button>
          </div>

          <div className="p-8">
            <div className="mb-6 bg-blue-50/50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 flex justify-between">
              <div>
                <strong className="block mb-1 text-blue-900">Required Headers (Case Insensitive):</strong>
                <code className="bg-blue-100 px-1.5 py-0.5 rounded text-blue-900">Mancode</code>, <code className="bg-blue-100 px-1.5 py-0.5 rounded text-blue-900">Color</code>
              </div>
            </div>

            {activeTab === "upload" ? (
              <label className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl transition-all duration-200 ${isProcessing ? 'border-gray-300 bg-gray-50' : 'border-indigo-200 bg-indigo-50/20 hover:bg-indigo-50/50 cursor-pointer'}`}>
                <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} disabled={isProcessing} />
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                      <p className="text-sm font-medium text-gray-900">Extracting seasons...</p>
                    </>
                  ) : (
                    <>
                      <div className="p-4 bg-white rounded-full shadow-sm mb-4 border border-indigo-100">
                        <Upload className="w-8 h-8 text-indigo-500" />
                      </div>
                      <p className="mb-2 text-sm text-gray-500"><span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop</p>
                      <p className="text-xs text-gray-500">XLSX, XLS</p>
                    </>
                  )}
                </div>
              </label>
            ) : (
              <div className="space-y-4">
                <textarea 
                  className="w-full h-64 p-4 text-sm font-mono border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-400"
                  placeholder="Mancode&#9;Color&#10;12345&#9;001&#10;..."
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                  disabled={isProcessing}
                />
                <div className="flex justify-end">
                  <button 
                    onClick={handlePasteSubmit}
                    disabled={isProcessing || !pasteData.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-sm disabled:opacity-50 transition"
                  >
                    {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : "Look Up Seasons"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {results && (
        <div className="space-y-6 animate-fade-in mt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-sm text-gray-500 font-medium mb-1">Total Processed (Market: <span className="text-gray-900 font-bold">{targetCountry}</span>)</p>
              <div className="text-3xl font-bold text-gray-900">{results.summary.total}</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 shadow-sm">
              <p className="text-sm text-emerald-600 font-medium mb-1">Found in Master</p>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold text-emerald-700">{results.summary.found}</div>
                <div className="text-sm text-emerald-600 font-medium">({((results.summary.found / results.summary.total) * 100).toFixed(0)}%)</div>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 shadow-sm">
              <p className="text-sm text-amber-600 font-medium mb-1">Not Found in DB</p>
              <div className="text-3xl font-bold text-amber-700">{results.summary.notFound}</div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">Extracted Final Seasons</h3>
            <div className="flex gap-3">
              <button onClick={() => setResults(null)} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition shadow-sm">
                New Lookup
              </button>
              <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition shadow-sm">
                <Download className="w-4 h-4" /> Export Excel
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Mancode</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Color</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Correct Season</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Priority Matched</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {results.results.slice(0, 100).map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(r.status)}
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getStatusBadge(r.status)}`}>
                            {r.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{r.mancode}</td>
                      <td className="px-4 py-3 text-gray-600">{r.colorCode}</td>
                      <td className="px-4 py-3 font-bold text-indigo-700">{r.correctSeason || '--'}</td>
                      <td className="px-4 py-3 text-gray-500">{r.priorityUsed !== null ? r.priorityUsed : '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {results.results.length > 100 && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-center text-sm text-gray-500">
                  Showing first 100 results. Export to Excel to view all {results.results.length} records.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
