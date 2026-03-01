'use client';

import { useState } from 'react';
import { Download, Loader2, CheckCircle2 } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import ErrorAlert from '@/components/ErrorAlert';
import PreviewTable from '@/components/PreviewTable';
import SummaryCard from '@/components/SummaryCard';
import { ProcessingResult, MergedRow, ProcessingError, FormInputs } from '@/lib/types';

export default function Home() {
  const [brandManagerFile, setBrandManagerFile] = useState<File | null>(null);
  const [rhmFile, setRHMFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [formErrors, setFormErrors] = useState<ProcessingError[]>([]);

  // Form inputs state
  const [formInputs, setFormInputs] = useState<FormInputs>({
    countryCode: '',
    brand: '',
    supplier: '',
    reason: '',
    newEffectiveDate: '',
    compensated: 'No',
    transactionDescription: '',
  });

  // Brand to supplier mapping
  const brandSupplierMap: { [key: string]: string } = {
    '56': '5601',
    'B6': 'B601',
  };

  const handleFormChange = (field: keyof FormInputs, value: string) => {
    setFormInputs((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Auto-populate supplier when brand changes
      if (field === 'brand') {
        updated.supplier = brandSupplierMap[value] || '';
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);
    setResult(null);

    // Validate files
    if (!brandManagerFile || !rhmFile) {
      setFormErrors([
        {
          type: 'validation',
          message: 'Both files are required',
        },
      ]);
      return;
    }

    // Validate form inputs are not empty
    const emptyFields = Object.entries(formInputs)
      .filter(([key, value]) => !value && key !== 'compensated')
      .map(([key]) => key);

    if (emptyFields.length > 0) {
      setFormErrors([
        {
          type: 'validation',
          message: `Please fill in all required fields: ${emptyFields.join(', ')}`,
        },
      ]);
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('brandManagerFile', brandManagerFile);
      formData.append('rhmFile', rhmFile);
      formData.append('countryCode', formInputs.countryCode);
      formData.append('brand', formInputs.brand);
      formData.append('supplier', formInputs.supplier);
      formData.append('reason', formInputs.reason);
      formData.append('newEffectiveDate', formInputs.newEffectiveDate);
      formData.append('compensated', formInputs.compensated);
      formData.append('transactionDescription', formInputs.transactionDescription);

      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      });

      const data = (await response.json()) as ProcessingResult;
      setResult(data);

      if (!data.success) {
        setFormErrors(data.validation?.errors || []);
      }
    } catch (error) {
      setFormErrors([
        {
          type: 'validation',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result?.erpLines || result.erpLines.length === 0) {
      alert('No data to download');
      return;
    }

    // Create content with Windows line breaks
    const content = result.erpLines.join('\r\n') + '\r\n';

    // Create blob with UTF-8 encoding
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'COP.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">COP Automation System</h1>
          <p className="text-gray-600">
            Transform Excel files into ERP-ready TXT format for retail price management
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <form onSubmit={handleSubmit}>
            {/* File Upload Section */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 1: Upload Files</h2>
              <FileUploader
                onBrandManagerFile={setBrandManagerFile}
                onRHMFile={setRHMFile}
                disabled={isProcessing}
              />
            </div>

            {/* Form Inputs Section */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 2: Enter Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Country Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country Code *
                  </label>
                  <input
                    type="text"
                    name="countryCode"
                    value={formInputs.countryCode}
                    onChange={(e) => handleFormChange('countryCode', e.target.value)}
                    placeholder="e.g., US"
                    disabled={isProcessing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Brand */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand *
                  </label>
                  <select
                    name="brand"
                    value={formInputs.brand}
                    onChange={(e) => handleFormChange('brand', e.target.value)}
                    disabled={isProcessing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a brand</option>
                    <option value="56">Intimissimi - 56</option>
                    <option value="B6">IUMAN UOMO - B6</option>
                  </select>
                </div>

                {/* Supplier */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier (Auto-populated)
                  </label>
                  <input
                    type="text"
                    name="supplier"
                    value={formInputs.supplier}
                    disabled={true}
                    placeholder="Automatically filled based on brand"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                  />
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason *
                  </label>
                  <input
                    type="text"
                    name="reason"
                    value={formInputs.reason}
                    onChange={(e) => handleFormChange('reason', e.target.value)}
                    placeholder="e.g., Seasonal promotion"
                    disabled={isProcessing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* New Effective Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Effective Date *
                  </label>
                  <input
                    type="date"
                    name="newEffectiveDate"
                    value={formInputs.newEffectiveDate}
                    onChange={(e) => handleFormChange('newEffectiveDate', e.target.value)}
                    disabled={isProcessing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Compensated */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Compensated *
                  </label>
                  <select
                    name="compensated"
                    value={formInputs.compensated}
                    onChange={(e) => handleFormChange('compensated', e.target.value as 'Yes' | 'No')}
                    disabled={isProcessing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                {/* Transaction Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction Description *
                  </label>
                  <input
                    type="text"
                    name="transactionDescription"
                    value={formInputs.transactionDescription}
                    onChange={(e) => handleFormChange('transactionDescription', e.target.value)}
                    placeholder="e.g., Price adjustment for Q1 promotion"
                    disabled={isProcessing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Error Alert */}
            {formErrors.length > 0 && (
              <div className="mb-6">
                <ErrorAlert errors={formErrors} title="Upload Errors" />
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isProcessing || !brandManagerFile || !rhmFile}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-6 rounded-lg transition"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Generate COP File'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            {/* Status */}
            {result.success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-green-900">Processing Complete</h3>
                  <p className="text-sm text-green-800">Your COP file has been generated successfully.</p>
                </div>
              </div>
            )}

            {/* Validation Warnings */}
            {result.validation?.errors.length > 0 && (
              <ErrorAlert
                errors={result.validation.errors}
                title={result.success ? 'Processing Warnings' : 'Processing Errors'}
              />
            )}

            {/* Summary */}
            {result.summary && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Processing Summary</h2>
                <SummaryCard
                  totalSKUs={result.summary.totalSKUs}
                  averageDiscount={result.summary.averageDiscount}
                  missingItemsCount={result.summary.missingItemsCount}
                />
              </div>
            )}

            {/* Preview Table */}
            {result.data && result.data.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Data Preview (First 20 rows)
                </h2>
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <PreviewTable data={result.data} />
                </div>
              </div>
            )}

            {/* Download Button */}
            {result.success && result.erpLines && result.erpLines.length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition"
                >
                  <Download className="h-4 w-4" />
                  Download COP.txt
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
