import React, { useRef, useState } from 'react';
import { RotateCw, Camera, UploadCloud } from 'lucide-react';
import type { DocumentData, DocumentType } from '../types';
import { PassportDocumentView } from './PassportDocumentView';

interface DocumentUploadCardProps {
  data: DocumentData;
  activeType: DocumentType;
  onTypeChange: (type: DocumentType) => void;
  onImageReplace: (file: File) => void;
  onScanWithCamera: () => void;
}

export const DocumentUploadCard: React.FC<DocumentUploadCardProps> = ({
  data,
  activeType,
  onTypeChange,
  onImageReplace,
  onScanWithCamera,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const tabs: { type: DocumentType; label: string }[] = [
    { type: 'passport', label: 'Passport' },
    { type: 'visa', label: 'Visa' },
    { type: 'other', label: 'Other' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageReplace(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onImageReplace(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between">
      {/* Card Header */}
      <div>
        <h3 className="text-[14px] font-bold text-slate-800 tracking-tight mb-3">
          1. Document Upload
        </h3>

        {/* Document Type Segmented Tabs */}
        <div className="flex rounded-lg bg-slate-100/90 p-1 mb-3.5 border border-slate-200/70">
          {tabs.map((tab) => {
            const isSelected = activeType === tab.type;
            return (
              <button
                key={tab.type}
                onClick={() => onTypeChange(tab.type)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 cursor-pointer text-center ${
                  isSelected
                    ? 'bg-[#1677E8] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Drag and Drop Document Preview Box */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-lg transition-all duration-200 ${
            isDragging ? 'ring-2 ring-blue-500 ring-offset-2 scale-[1.01]' : ''
          }`}
        >
          <PassportDocumentView data={data} showTamperOverlay={false} />

          {/* Drag Overlay State */}
          {isDragging && (
            <div className="absolute inset-0 bg-blue-600/90 rounded-lg flex flex-col items-center justify-center text-white backdrop-blur-xs z-20">
              <UploadCloud className="w-10 h-10 animate-bounce mb-1" />
              <p className="text-xs font-bold">Drop document image to load</p>
            </div>
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Action Buttons Below Preview */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 transition-colors shadow-2xs cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Replace Image</span>
        </button>

        <button
          onClick={onScanWithCamera}
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 transition-colors shadow-2xs cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5 text-slate-500" />
          <span>Scan with Camera</span>
        </button>
      </div>
    </div>
  );
};
