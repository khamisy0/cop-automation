'use client';

import { useState } from 'react';
import { Download, Loader2, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import FileUploadCard from '@/components/ui/FileUploadCard';
import ErrorAlert from '@/components/shared/ErrorAlert';
import PreviewTable from '@/components/shared/PreviewTable';
import {
  ProcessingResult,
  ProcessingError,
  FormInputs,
} from '@/modules/cop/types';
import { COUNTRY_CODES, countryNameToCodeMap } from '@/lib/constants';

export default function COPPage() {
  const [brandManagerFile, setBrandManagerFile] = useState<File | null>(null);
  const [rhmFile, setRHMFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [formErrors, setFormErrors] = useState<ProcessingError[]>([]);

  const [formInputs, setFormInputs] = useState<FormInputs>({
    countryCode: '', brand: '', supplier: '', reason: '',
    newEffectiveDate: '', compensated: 'No', transactionDescription: '',
  });

  const brandSupplierMap: Record<string, string> = { '56': '5601', 'B6': 'B601' };

  const handleFormChange = (field: keyof FormInputs, value: string) => {
    setFormInputs((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'brand') updated.supplier = brandSupplierMap[value] || '';
      if (field === 'countryCode') updated.countryCode = countryNameToCodeMap[value] || '';
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);
    setResult(null);
    if (!brandManagerFile || !rhmFile) { setFormErrors([{ type: 'validation', message: 'Both files are required' }]); return; }
    const emptyFields = Object.entries(formInputs).filter(([key, value]) => !value && key !== 'compensated').map(([key]) => key);
    if (emptyFields.length > 0) { setFormErrors([{ type: 'validation', message: `Please fill in all required fields: ${emptyFields.join(', ')}` }]); return; }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('brandManagerFile', brandManagerFile);
      formData.append('rhmFile', rhmFile);
      Object.entries(formInputs).forEach(([k, v]) => formData.append(k, v));

      const response = await fetch('/api/cop', { method: 'POST', body: formData });
      const data = (await response.json()) as ProcessingResult;
      setResult(data);
      if (!data.success) setFormErrors(data.validation?.errors || []);
    } catch (error) {
      setFormErrors([{ type: 'validation', message: error instanceof Error ? error.message : 'An unexpected error occurred' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result?.erpLines || result.erpLines.length === 0) return;
    const header = 'CountryCode|Brand|Season|Supplier|Reason|NewEffectiveDate|ToDate|Compensated|Mancode|Color|Size|NewEffectiveRetail|TransactionDescription';
    const content = [header, ...result.erpLines].join('\r\n') + '\r\n';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'COP.txt';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const inputClass = 'w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200';

  return (
    <div className="space-y-6 animate-fade-in">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Upload */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FileUploadCard label="Brand Manager File" description="Upload the Brand Manager Excel file" file={brandManagerFile} onFileSelect={setBrandManagerFile} disabled={isProcessing} />
          <FileUploadCard label="RHM Report File" description="Upload the RHM Report Excel file" file={rhmFile} onFileSelect={setRHMFile} disabled={isProcessing} />
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition duration-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Enter Details</h3>
              <p className="text-sm text-gray-500">Fill in the required processing parameters</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
              <select value={Object.keys(countryNameToCodeMap).find((c) => countryNameToCodeMap[c] === formInputs.countryCode) || ''} onChange={(e) => handleFormChange('countryCode', e.target.value)} disabled={isProcessing} className={inputClass}>
                <option value="">Select a country</option>
                {COUNTRY_CODES.map((country) => (
                  <option key={country.code} value={country.name}>
                    {country.name} - {country.code}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand *</label>
              <select value={formInputs.brand} onChange={(e) => handleFormChange('brand', e.target.value)} disabled={isProcessing} className={inputClass}>
                <option value="">Select a brand</option>
                <option value="56">Intimissimi - 56</option>
                <option value="B6">IUMAN UOMO - B6</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <input type="text" value={formInputs.supplier} disabled placeholder="Auto-populated" className={`${inputClass} bg-gray-50 cursor-not-allowed`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
              <input type="text" value={formInputs.reason} onChange={(e) => handleFormChange('reason', e.target.value)} placeholder="e.g., Seasonal promotion" disabled={isProcessing} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Effective Date *</label>
              <input type="date" value={formInputs.newEffectiveDate} onChange={(e) => handleFormChange('newEffectiveDate', e.target.value)} disabled={isProcessing} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Compensated *</label>
              <select value={formInputs.compensated} onChange={(e) => handleFormChange('compensated', e.target.value)} disabled={isProcessing} className={inputClass}>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Description *</label>
              <input type="text" value={formInputs.transactionDescription} onChange={(e) => handleFormChange('transactionDescription', e.target.value)} placeholder="e.g., Price adjustment for Q1 promotion" disabled={isProcessing} className={inputClass} />
            </div>
          </div>
        </div>

        {formErrors.length > 0 && <ErrorAlert errors={formErrors} title="Upload Errors" />}

        <div className="flex justify-end">
          <button type="submit" disabled={isProcessing || !brandManagerFile || !rhmFile} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-5 rounded-lg transition duration-200 text-sm shadow-sm">
            {isProcessing ? (<><Loader2 className="h-4 w-4 animate-spin" />Processing...</>) : 'Generate COP File'}
          </button>
        </div>
      </form>

      {result && (
        <div className="space-y-6 animate-fade-in">
          {result.success && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-emerald-900">Processing Complete</h3>
                <p className="text-sm text-emerald-700">Your COP file has been generated successfully.</p>
              </div>
            </div>
          )}

          {result.validation?.errors.length > 0 && <ErrorAlert errors={result.validation.errors} title={result.success ? 'Warnings' : 'Errors'} />}

          {result.summary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Total SKUs', value: result.summary.totalSKUs },
                { label: 'Average Discount', value: `${(result.summary.averageDiscount || 0).toFixed(2)}%` },
                { label: 'Missing Items', value: result.summary.missingItemsCount || 0 },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {result.data && result.data.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition duration-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-900">Data Preview</h3>
              </div>
              <div className="p-4">
                <PreviewTable data={result.data} columns={[
                  { key: 'mancode', label: 'Mancode' }, { key: 'color', label: 'Color' }, { key: 'size', label: 'Size' }, { key: 'season', label: 'Season' },
                  { key: 'salePrice', label: 'Sale Price', format: (v) => `$${v.toFixed(2)}` },
                  { key: 'unitRetail', label: 'Unit Retail', format: (v) => `$${v.toFixed(2)}` },
                  { key: 'discountPercent', label: 'Discount %', format: (v) => `${(v * 100).toFixed(2)}%` },
                  { key: 'newEffectiveRetail', label: 'New Retail', format: (v) => `$${v.toFixed(2)}` },
                ]} />
              </div>
            </div>
          )}

          {result.success && result.erpLines && result.erpLines.length > 0 && (
            <div className="flex justify-end">
              <button onClick={handleDownload} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 px-5 rounded-lg transition duration-200 text-sm">
                <Download className="h-4 w-4" /> Download COP.txt
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
