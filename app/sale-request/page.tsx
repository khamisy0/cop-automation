'use client';

import { useState } from 'react';
import { Download, Loader2, CheckCircle2, Tag } from 'lucide-react';
import ErrorAlert from '@/components/shared/ErrorAlert';
import PreviewTable from '@/components/shared/PreviewTable';
import FileUploadCard from '@/components/ui/FileUploadCard';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { ProcessedItem } from '@/modules/sale-request/types';
import { ProcessingError } from '@/modules/cop/types';
import { COUNTRY_CODES } from '@/lib/constants';

export default function SaleRequestPage() {
  const [itemListFile, setItemListFile] = useState<File | null>(null);
  const [priceListFile, setPriceListFile] = useState<File | null>(null);
  const [brand, setBrand] = useState('');
  const [country, setCountry] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedItems, setProcessedItems] = useState<ProcessedItem[]>([]);
  const [errors, setErrors] = useState<ProcessingError[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  const brands = [
    { label: 'INT - 56', value: '56' },
    { label: 'UOMO - B6', value: 'B6' },
    { label: 'CAL - 55', value: '55' },
    { label: 'TEZ - 57', value: '57' },
  ];
  

  const handleProcess = async () => {
    setErrors([]); setSuccessMessage(''); setProcessedItems([]);
    if (!itemListFile) { setErrors([{ type: 'validation', message: 'Please upload an Item List file' }]); return; }
    if (!priceListFile) { setErrors([{ type: 'validation', message: 'Please upload a Price List file' }]); return; }
    if (!brand) { setErrors([{ type: 'validation', message: 'Please select a Brand' }]); return; }
    if (!country) { setErrors([{ type: 'validation', message: 'Please select a Country' }]); return; }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('itemListFile', itemListFile);
      formData.append('priceListFile', priceListFile);
      formData.append('brand', brand);
      formData.append('country', country);

      const response = await fetch('/api/sale-request', { method: 'POST', body: formData });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = 'SalePriceRequest_Output.xlsx';
        document.body.appendChild(link); link.click(); document.body.removeChild(link); window.URL.revokeObjectURL(url);
        const itemsProcessed = response.headers.get('X-Processed-Items');
        setSuccessMessage(itemsProcessed ? `Successfully processed ${itemsProcessed} items!` : 'Sale prices generated successfully!');
      } else {
        const errorData = await response.json();
        if (errorData.errors && Array.isArray(errorData.errors)) { setErrors(errorData.errors.map((e: any) => ({ ...e, type: e.type || 'validation' }))); }
        else if (errorData.error) { setErrors([{ type: 'validation', message: errorData.error }]); }
        else { setErrors([{ type: 'validation', message: 'An error occurred while processing' }]); }
        if (errorData.data && Array.isArray(errorData.data)) setProcessedItems(errorData.data);
      }
    } catch (error) {
      setErrors([{ type: 'validation', message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }]);
    } finally { setIsProcessing(false); }
  };

  const inputClass = 'w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition duration-200';

  return (
    <div className="space-y-6 animate-fade-in">
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <p className="text-sm text-emerald-800 font-medium">{successMessage}</p>
        </div>
      )}
      {errors.length > 0 && <ErrorAlert errors={errors} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FileUploadCard label="Upload Item List" description="Excel file with: mancode, color, season, discount" file={itemListFile} onFileSelect={setItemListFile} />
            <FileUploadCard label="Upload Price List" description="Excel file with brand-country tabs (e.g., INT UAE)" file={priceListFile} onFileSelect={setPriceListFile} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Select Brand & Country</h3>
                <p className="text-sm text-gray-500">Choose the brand and country for price calculation</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                <SearchableSelect
                  options={brands.map((b) => ({ value: b.value, label: b.label }))}
                  value={brand}
                  onChange={setBrand}
                  placeholder="Select Brand"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <SearchableSelect
                  options={COUNTRY_CODES.map((c) => ({ value: c.name, label: `${c.name} - ${c.code}` }))}
                  value={country}
                  onChange={setCountry}
                  placeholder="Select Country"
                />
              </div>
            </div>
          </div>

          <button onClick={handleProcess} disabled={isProcessing} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition duration-200 text-sm shadow-sm">
            {isProcessing ? (<><Loader2 className="w-4 h-4 animate-spin" />Processing...</>) : (<><CheckCircle2 className="w-4 h-4" />Generate Prices</>)}
          </button>
        </div>

        {/* Status sidebar */}
        <div className="space-y-4">
          {[
            { label: 'Item List', value: itemListFile ? '✓ Ready' : 'Not uploaded', ready: !!itemListFile },
            { label: 'Price List', value: priceListFile ? '✓ Ready' : 'Not uploaded', ready: !!priceListFile },
            { label: 'Brand', value: brand || 'Not selected', ready: !!brand },
            { label: 'Country', value: country || 'Not selected', ready: !!country },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className={`text-base font-semibold mt-0.5 ${item.ready ? 'text-gray-900' : 'text-gray-400'}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {processedItems.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">Preview ({processedItems.length} items)</h3>
            <button onClick={handleProcess} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 px-3 py-1.5 rounded-lg transition duration-200 text-sm">
              <Download className="w-3.5 h-3.5" /> Download
            </button>
          </div>
          <div className="p-4">
            <PreviewTable data={processedItems.slice(0, 10)} columns={[
              { key: 'mancode', label: 'Mancode' }, { key: 'color', label: 'Color' }, { key: 'season', label: 'Season' },
              { key: 'euroRetail', label: 'Euro Retail' }, { key: 'originalRetail', label: 'Original Retail' },
              { key: 'discount', label: 'Discount' }, { key: 'salePrice', label: 'Sale Price' },
            ]} />
            {processedItems.length > 10 && <p className="text-sm text-gray-500 mt-3">Showing 10 of {processedItems.length} items</p>}
          </div>
        </div>
      )}
    </div>
  );
}
