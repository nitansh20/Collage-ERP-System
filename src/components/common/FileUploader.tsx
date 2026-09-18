import React, { useState, useRef } from 'react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  label?: string;
  sublabel?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  accept = '.xlsx,.csv,.xls',
  label = 'Drag and drop Excel workbook or CSV sheet',
  sublabel = 'Supports .xlsx, .xls, and UTF-8 RFC4180 CSV formats (Max 25MB)',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
        isDragging
          ? 'border-blue-500 bg-blue-50/60 scale-[1.005]'
          : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
      <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 mx-auto flex items-center justify-center mb-3">
        <span className="material-symbols-outlined text-[28px]">upload_file</span>
      </div>
      <h4 className="text-sm font-bold text-slate-800">{label}</h4>
      <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">{sublabel}</p>
      <div className="mt-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
          <span className="material-symbols-outlined text-[16px] text-blue-600">attachment</span>
          <span>Browse from Local System</span>
        </span>
      </div>
    </div>
  );
};
