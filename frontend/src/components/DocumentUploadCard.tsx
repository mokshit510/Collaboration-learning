import React, { useRef, useState } from 'react';
import {
  RotateCw,
  Camera,
  UploadCloud,
  Sparkles,
  AlertCircle,
  X,
  FileText,
  Play,
  Loader2,
} from 'lucide-react';
import type { DocumentData, DocumentType, DemoScenarioId, UploadState, UploadedDocument } from '../types';
import { PassportDocumentView } from './PassportDocumentView';

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const UPLOAD_ERROR_MESSAGE = 'Only JPG, JPEG, PNG or WEBP images up to 2 MB are allowed.';

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

interface DocumentUploadCardProps {
  data: DocumentData;
  activeType: DocumentType;
  onTypeChange: (type: DocumentType) => void;
  onImageReplace: (file: File) => void;
  onResetDocument?: () => void;
  onScanWithCamera: () => void;
  onStartVerification?: () => void;
  isSimulating?: boolean;
  uploadedDocument?: UploadedDocument | null;
  selectedScenario?: DemoScenarioId;
  onScenarioChange?: (scenario: DemoScenarioId) => void;
  allowUpload?: boolean;
}

export const DocumentUploadCard: React.FC<DocumentUploadCardProps> = ({
  data,
  activeType,
  onTypeChange,
  onImageReplace,
  onResetDocument,
  onScanWithCamera,
  onStartVerification,
  isSimulating = false,
  uploadedDocument,
  selectedScenario = 'tampered',
  onScenarioChange,
  allowUpload = true,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localValidation, setLocalValidation] = useState<{
    status: 'VALIDATING' | 'ERROR';
    error?: string;
  } | null>(null);

  // Derived state without cascading useEffect renders
  const uploadState: UploadState = localValidation
    ? localValidation.status
    : uploadedDocument
    ? uploadedDocument.status
    : data.isUserUploaded
    ? 'READY'
    : 'IDLE';

  const errorMessage: string | null =
    localValidation?.status === 'ERROR'
      ? localValidation.error || 'Invalid file.'
      : uploadedDocument?.errorMessage || null;

  const tabs: { type: DocumentType; label: string }[] = [
    { type: 'passport', label: 'Passport' },
    { type: 'visa', label: 'Visa' },
    { type: 'other', label: 'Other' },
  ];

  const validateAndProcessFile = (file: File) => {
    // 1. Check empty/corrupted file
    if (!file || file.size === 0) {
      setLocalValidation({
        status: 'ERROR',
        error: 'The selected file is empty or corrupted. Please choose a valid image.',
      });
      return;
    }

    // 2. Check format
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isMimeValid = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());
    const isExtValid = ALLOWED_EXTENSIONS.includes(extension);

    if (!isMimeValid && !isExtValid) {
      setLocalValidation({
        status: 'ERROR',
        error: UPLOAD_ERROR_MESSAGE,
      });
      return;
    }

    // 3. Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setLocalValidation({
        status: 'ERROR',
        error: UPLOAD_ERROR_MESSAGE,
      });
      return;
    }

    // 4. File reading validation
    setLocalValidation({ status: 'VALIDATING' });

    const reader = new FileReader();
    reader.onload = () => {
      // Local validation completed successfully
      setLocalValidation(null);
      onImageReplace(file);
    };

    reader.onerror = () => {
      setLocalValidation({
        status: 'ERROR',
        error: 'Unable to read this file. Please try another image.',
      });
    };

    // Validate readability via ArrayBuffer
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      validateAndProcessFile(file);
      // Reset input value so re-selecting same file triggers change
      e.target.value = '';
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
      const file = e.dataTransfer.files[0];
      validateAndProcessFile(file);
    }
  };

  const handleReset = () => {
    setLocalValidation(null);
    onResetDocument?.();
  };

  const isUploaded = Boolean(data.isUserUploaded || uploadedDocument?.file);

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between">
      {/* Card Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[14px] font-bold text-slate-800 tracking-tight">
              1. Document Upload
            </h3>
            {uploadState === 'READY' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300/80 px-1.5 py-0.2 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                READY
              </span>
            )}
          </div>

          {/* Demo Scenario Selector Quick Pill */}
          {onScenarioChange && !isUploaded && (
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
              <select
                value={selectedScenario}
                onChange={(e) => onScenarioChange(e.target.value as DemoScenarioId)}
                className="text-[10.5px] font-semibold text-slate-700 bg-amber-50/70 border border-amber-300/80 rounded-md py-0.5 px-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer shadow-2xs"
                title="Select a predefined realistic verification scenario"
              >
                <option value="genuine">Scenario 1: Genuine (Low Risk)</option>
                <option value="tampered">Scenario 2: Tampered (Photo/NFC)</option>
                <option value="expired">Scenario 3: Expired Document</option>
                <option value="watchlist">Scenario 4: Watchlist Hit</option>
                <option value="low_ocr">Scenario 5: Degraded OCR Quality</option>
              </select>
            </div>
          )}
        </div>

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

        {/* Validation Error Alert Banner */}
        {uploadState === 'ERROR' && errorMessage && (
          <div className="mb-3 p-2.5 bg-rose-50 border border-rose-300 rounded-lg flex items-start gap-2 text-rose-800 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-[11px] leading-tight">
              <span className="font-semibold block">Upload Validation Error</span>
              <span className="text-rose-700">{errorMessage}</span>
            </div>
            <button
              onClick={() => {
                setLocalValidation(null);
              }}
              className="text-rose-400 hover:text-rose-700 p-0.5 rounded cursor-pointer"
              title="Dismiss error"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Validating State Spinner */}
        {uploadState === 'VALIDATING' && (
          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-blue-800">
            <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
            <span className="text-[11px] font-medium">
              Validating optical resolution and file integrity...
            </span>
          </div>
        )}

        {/* Uploaded Document Info Strip (Shown when document is loaded) */}
        {isUploaded && (
          <div className="mb-2.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-2 text-slate-700 text-[11px]">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <FileText className="w-3.5 h-3.5 text-[#1677E8] shrink-0" />
              <span className="font-semibold truncate text-slate-900" title={data.uploadedFile?.name || 'document.jpg'}>
                {data.uploadedFile?.name || 'document.jpg'}
              </span>
              <span className="text-slate-400 text-[10px] shrink-0">
                ({data.uploadedFile?.size ? formatBytes(data.uploadedFile.size) : 'Optical Scan'})
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-200/80 px-1.5 py-0.5 rounded">
                {activeType}
              </span>
              {allowUpload && (
                <button
                  onClick={handleReset}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-200/50 transition-colors cursor-pointer"
                  title="Remove uploaded document and reset"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Document Preview Area (Click or Drag-and-Drop when allowUpload is true) */}
        <div
          onClick={() => {
            if (allowUpload && !isUploaded) {
              fileInputRef.current?.click();
            }
          }}
          onDragOver={allowUpload ? handleDragOver : undefined}
          onDragLeave={allowUpload ? handleDragLeave : undefined}
          onDrop={allowUpload ? handleDrop : undefined}
          className={`relative rounded-lg transition-all duration-200 ${
            allowUpload ? 'cursor-pointer' : 'cursor-default'
          } ${
            isDragging && allowUpload ? 'ring-2 ring-blue-500 ring-offset-2 scale-[1.01]' : ''
          }`}
          title={
            allowUpload
              ? isUploaded
                ? 'Document loaded'
                : 'Click or drop to upload document'
              : 'Document Preview'
          }
        >
          <PassportDocumentView data={data} showTamperOverlay={false} />

          {/* Idle upload drop prompt overlay (only when allowUpload and not uploaded) */}
          {allowUpload && !isUploaded && !isDragging && (
            <div className="absolute inset-0 rounded-md bg-slate-900/10 hover:bg-slate-900/20 border border-dashed border-blue-400/60 flex flex-col items-center justify-end p-2 transition-all group">
              <div className="bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1.5 text-slate-700 text-[10px] font-medium border border-slate-200/80 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-3.5 h-3.5 text-[#1677E8]" />
                <span>Click to browse or drop JPG, PNG, WEBP (max 2 MB)</span>
              </div>
            </div>
          )}

          {/* Drag Overlay State */}
          {allowUpload && isDragging && (
            <div className="absolute inset-0 bg-blue-600/90 rounded-lg flex flex-col items-center justify-center text-white backdrop-blur-xs z-20">
              <UploadCloud className="w-10 h-10 animate-bounce mb-1" />
              <p className="text-xs font-bold">Drop document image to load</p>
              <p className="text-[10px] text-blue-200">JPG, PNG, WEBP (max 2 MB)</p>
            </div>
          )}
        </div>
      </div>

      {/* Hidden File Input (only rendered when allowUpload is true) */}
      {allowUpload && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={handleFileChange}
        />
      )}

      {/* Action Buttons Below Preview */}
      <div className="space-y-2 mt-3.5">
        {/* If document is ready and verify handler available, offer Start Verification button */}
        {isUploaded && onStartVerification && (
          <button
            onClick={onStartVerification}
            disabled={isSimulating}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSimulating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running Verification Pipeline...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Pipeline on Uploaded Document</span>
              </>
            )}
          </button>
        )}

        {/* Upload buttons only rendered when allowUpload is true */}
        {allowUpload && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 transition-colors shadow-2xs cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                <span>{isUploaded ? 'Replace Image' : 'Select Image'}</span>
              </button>

              <button
                onClick={onScanWithCamera}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 transition-colors shadow-2xs cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-slate-500" />
                <span>Scan with Camera</span>
              </button>
            </div>

            {isUploaded && onResetDocument && (
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-600 hover:text-slate-800 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
              >
                <X className="w-3 h-3 text-slate-500" />
                <span>Remove Upload & Reset to Default</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
