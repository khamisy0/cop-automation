'use client';

import { useState, useRef } from 'react';
import { Upload } from 'lucide-react';

interface FileUploaderProps {
  onBrandManagerFile: (file: File | null) => void;
  onRHMFile: (file: File | null) => void;
  disabled?: boolean;
}

export default function FileUploader({
  onBrandManagerFile,
  onRHMFile,
  disabled = false,
}: FileUploaderProps) {
  const [brandManagerFile, setBrandManagerFile] = useState<File | null>(null);
  const [rhmFile, setRHMFile] = useState<File | null>(null);
  const [dragOverBM, setDragOverBM] = useState(false);
  const [dragOverRHM, setDragOverRHM] = useState(false);

  const bmInputRef = useRef<HTMLInputElement>(null);
  const rhmInputRef = useRef<HTMLInputElement>(null);

  const handleBrandManagerChange = (file: File | null) => {
    if (file && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('Please select an Excel file (.xlsx or .xls)');
      return;
    }
    setBrandManagerFile(file);
    onBrandManagerFile(file);
  };

  const handleRHMChange = (file: File | null) => {
    if (file && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('Please select an Excel file (.xlsx or .xls)');
      return;
    }
    setRHMFile(file);
    onRHMFile(file);
  };

  const handleDragOver = (e: React.DragEvent, setBM: boolean) => {
    e.preventDefault();
    if (setBM) setDragOverBM(true);
    else setDragOverRHM(true);
  };

  const handleDragLeave = (e: React.DragEvent, setBM: boolean) => {
    e.preventDefault();
    if (setBM) setDragOverBM(false);
    else setDragOverRHM(false);
  };

  const handleDrop = (e: React.DragEvent, setBM: boolean) => {
    e.preventDefault();
    if (setBM) setDragOverBM(false);
    else setDragOverRHM(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      if (setBM) handleBrandManagerChange(files[0]);
      else handleRHMChange(files[0]);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Brand Manager File */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Brand Manager File
        </label>
        <input
          ref={bmInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => handleBrandManagerChange(e.target.files?.[0] || null)}
          disabled={disabled}
          className="hidden"
        />
        <div
          onDragOver={(e) => handleDragOver(e, true)}
          onDragLeave={(e) => handleDragLeave(e, true)}
          onDrop={(e) => handleDrop(e, true)}
          onClick={() => bmInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
            dragOverBM
              ? 'border-blue-500 bg-blue-50'
              : brandManagerFile
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          {brandManagerFile ? (
            <div>
              <p className="text-sm font-medium text-green-700">{brandManagerFile.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                {(brandManagerFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-gray-700">Drag and drop or click to upload</p>
              <p className="text-xs text-gray-500 mt-1">Excel file (.xlsx or .xls)</p>
            </div>
          )}
        </div>
      </div>

      {/* RHM File */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">RHM Report File</label>
        <input
          ref={rhmInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => handleRHMChange(e.target.files?.[0] || null)}
          disabled={disabled}
          className="hidden"
        />
        <div
          onDragOver={(e) => handleDragOver(e, false)}
          onDragLeave={(e) => handleDragLeave(e, false)}
          onDrop={(e) => handleDrop(e, false)}
          onClick={() => rhmInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
            dragOverRHM
              ? 'border-blue-500 bg-blue-50'
              : rhmFile
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          {rhmFile ? (
            <div>
              <p className="text-sm font-medium text-green-700">{rhmFile.name}</p>
              <p className="text-xs text-gray-500 mt-1">{(rhmFile.size / 1024).toFixed(2)} KB</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-gray-700">Drag and drop or click to upload</p>
              <p className="text-xs text-gray-500 mt-1">Excel file (.xlsx or .xls)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
