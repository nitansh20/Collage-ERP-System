import React, { useState, useRef } from 'react';
import {
  ResourceValidationResponse,
  ResourceValidationRow,
  ResourceImportResult,
  PersonaProfile,
} from '../../../server/types/index.js';
import { StatusBadge } from '../common/StatusBadge.js';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Users,
  ShieldCheck,
  AlertCircle,
  FileText,
  Filter,
  Check,
  ExternalLink,
} from 'lucide-react';

interface BulkResourceImportWizardProps {
  currentUser?: PersonaProfile | null;
  onImportComplete?: (result: ResourceImportResult) => void;
  onClose?: () => void;
}

const STAGES = [
  { step: 1, label: 'Upload', desc: 'Select Excel/CSV' },
  { step: 2, label: 'Parse', desc: 'Decode Rows' },
  { step: 3, label: 'Validate', desc: 'Catalog & Taxonomy' },
  { step: 4, label: 'Preview', desc: 'Pre-Flight Scrutiny' },
  { step: 5, label: 'Confirm', desc: 'Commit Authorization' },
  { step: 6, label: 'Process', desc: 'Transactional Ingest' },
  { step: 7, label: 'Show Result', desc: 'Distribution Ledger' },
];

export const BulkResourceImportWizard: React.FC<BulkResourceImportWizardProps> = ({
  currentUser,
  onImportComplete,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Validation response from backend
  const [validationData, setValidationData] = useState<ResourceValidationResponse | null>(null);

  // User row exclusions (e.g. unchecking problematic or duplicate rows)
  const [excludedRows, setExcludedRows] = useState<Set<number>>(new Set());

  // Filter in preview table
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'VALID' | 'INVALID' | 'DUPLICATE'>('ALL');

  // Final Import Result
  const [importResult, setImportResult] = useState<ResourceImportResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read file into Base64
  const processSelectedFile = (selectedFile: File) => {
    setErrorMessage(null);
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'csv' && ext !== 'xls') {
      setErrorMessage('Invalid file format. Please upload an Excel (.xlsx, .xls) or CSV (.csv) workbook.');
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setFileData(result);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read selected file from local filesystem.');
    };
    reader.readAsDataURL(selectedFile);
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
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  // Step 2 & 3: Trigger Server Parsing & Validation
  const handleParseAndValidate = async () => {
    if (!fileData || !file) {
      setErrorMessage('Please select a file to upload first.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setCurrentStep(2); // In parse stage

    try {
      // Small simulated delay for realistic step progression (Upload -> Parse -> Validate)
      setTimeout(async () => {
        setCurrentStep(3); // In validate stage

        const res = await fetch('/api/resources/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileData,
            fileName: file.name,
            fileType: file.name.endsWith('.csv') ? 'csv' : 'xlsx',
          }),
        });

        const data = await res.json();
        setIsProcessing(false);

        if (!data.success) {
          throw new Error(data.error || 'Server rejected uploaded file during validation.');
        }

        setValidationData(data);
        setCurrentStep(4); // Move to Preview
      }, 400);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Error occurred during parsing and validation.');
      setCurrentStep(1); // Return to upload
    }
  };

  // Step 5 & 6: Confirm and commit to database
  const handleProcessImport = async () => {
    if (!validationData) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setCurrentStep(6); // Processing

    try {
      const res = await fetch('/api/resources/confirm-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: validationData.requestId,
          importOnlyValid: true,
          excludedRowNumbers: Array.from(excludedRows),
        }),
      });

      const data = await res.json();
      setIsProcessing(false);

      if (!data.success) {
        throw new Error(data.error || 'Failed to process import.');
      }

      setImportResult(data.data);
      setCurrentStep(7); // Show result

      if (onImportComplete) {
        onImportComplete(data.data);
      }
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Error executing transactional import.');
      setCurrentStep(5); // Return to confirmation
    }
  };

  // Toggle excluding a specific row
  const toggleRowExclusion = (rowNumber: number) => {
    setExcludedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) {
        next.delete(rowNumber);
      } else {
        next.add(rowNumber);
      }
      return next;
    });
  };

  // Template download trigger
  const handleDownloadTemplate = () => {
    window.open('/api/resources/template?format=csv', '_blank');
  };

  // Error report download trigger
  const handleDownloadErrorReport = () => {
    if (validationData?.requestId) {
      window.open(`/api/resources/error-report/${validationData.requestId}`, '_blank');
    }
  };

  // Filter preview rows
  const displayedRows: ResourceValidationRow[] = (validationData?.rows || []).filter((r) => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  });

  // Calculate commit readiness
  const totalCandidateRows = validationData?.rows.length || 0;
  const validUnexcludedRows = (validationData?.rows || []).filter(
    (r) => r.status === 'VALID' && !excludedRows.has(r.rowNumber)
  ).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Stepper Header */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Bulk Resource & Announcement Ingestion Engine
            </h3>
            <p className="text-xs text-slate-500">
              7-Stage statutory ingest with automated course, division and batch distribution validation.
            </p>
          </div>
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            Download Excel/CSV Template
          </button>
        </div>

        {/* 7 Stage Visual Pipeline */}
        <div className="grid grid-cols-7 gap-1 pt-1">
          {STAGES.map((s) => {
            const isDone = currentStep > s.step;
            const isCurrent = currentStep === s.step;
            return (
              <div
                key={s.step}
                className={`relative flex flex-col items-center text-center p-2 rounded-xl transition-all ${
                  isCurrent
                    ? 'bg-blue-50 border border-blue-200 font-bold text-blue-700 ring-2 ring-blue-600/10'
                    : isDone
                    ? 'bg-emerald-50/60 text-emerald-800'
                    : 'text-slate-400'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-mono mb-1 font-bold ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> : s.step}
                </div>
                <span className="text-[11px] font-bold leading-none block">{s.label}</span>
                <span className="text-[9px] text-slate-400 leading-tight hidden sm:block mt-0.5">
                  {s.desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Pipeline Body */}
      <div className="p-6">
        {errorMessage && (
          <div className="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1">
              <strong className="font-bold block">Pipeline Execution Notice</strong>
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-slate-400 hover:text-slate-600 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* STAGE 1: UPLOAD                                               */}
        {/* ============================================================ */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/60'
                  : file
                  ? 'border-emerald-300 bg-emerald-50/30'
                  : 'border-slate-300 bg-slate-50/40 hover:border-slate-400 hover:bg-slate-50'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    processSelectedFile(e.target.files[0]);
                  }
                }}
              />

              <div className="max-w-md mx-auto flex flex-col items-center">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform ${
                    file ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {file ? (
                    <FileSpreadsheet className="w-8 h-8" />
                  ) : (
                    <UploadCloud className="w-8 h-8" />
                  )}
                </div>

                {file ? (
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{file.name}</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {(file.size / 1024).toFixed(1)} KB • Ready for automated taxonomy inspection
                    </p>
                    <span className="inline-block mt-3 text-xs font-semibold text-blue-600 hover:underline">
                      Click to choose a different file
                    </span>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Drop Excel (.xlsx) or CSV file here, or click to browse
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Supports Lecture Notes, Learning Materials, and Announcements.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <span className="text-[11px] font-mono bg-white px-2.5 py-1 rounded-md border border-slate-200 text-slate-600">
                        .xlsx
                      </span>
                      <span className="text-[11px] font-mono bg-white px-2.5 py-1 rounded-md border border-slate-200 text-slate-600">
                        .csv
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Validation Standards Checklist */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Statutory Ingest Requirements & Mapping Rules
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <strong className="block text-slate-900 mb-0.5">Mandatory Columns</strong>
                  <span>Resource Type, Course, Subject, Division, Batch, Title, Description, File Reference / Notice.</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <strong className="block text-slate-900 mb-0.5">Strict Taxonomy</strong>
                  <span>Rejects non-existent divisions or batches (e.g. Division C on CSE is rejected).</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <strong className="block text-slate-900 mb-0.5">Target Scoping</strong>
                  <span>Auto-calculates student recipient cohorts. No silent public disclosure unless checked.</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Authorized role: <strong className="text-slate-800">{currentUser?.roleLabel || currentUser?.name || 'Administrator'}</strong>
              </span>

              <button
                onClick={handleParseAndValidate}
                disabled={!file}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <span>Proceed to Parse & Validate</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STAGE 2 & 3: PARSE & VALIDATE (IN-PROGRESS SPINNER)           */}
        {/* ============================================================ */}
        {(currentStep === 2 || currentStep === 3) && (
          <div className="py-16 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <span className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">
                {currentStep === 2 ? 'Stage 2: Decoding Workbook & Canonical Schema Mapping' : 'Stage 3: Verifying Referential Integrity & Taxonomy'}
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {currentStep === 2
                  ? 'Extracting headers, normalizing cell values, and cross-referencing statutory curriculum codes...'
                  : 'Validating division boundaries, active batch cohorts, duplicate keys, and target recipient permissions...'}
              </p>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STAGE 4: PREVIEW                                              */}
        {/* ============================================================ */}
        {currentStep === 4 && validationData && (
          <div className="space-y-5">
            {/* KPI Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 block uppercase font-mono">
                  Total Rows
                </span>
                <span className="text-xl font-bold text-slate-900 font-mono">
                  {validationData.totalRows}
                </span>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <span className="text-[11px] font-semibold text-emerald-700 block uppercase font-mono">
                  Valid Rows
                </span>
                <span className="text-xl font-bold text-emerald-700 font-mono">
                  {validationData.validCount}
                </span>
              </div>
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                <span className="text-[11px] font-semibold text-rose-700 block uppercase font-mono">
                  Invalid Rows
                </span>
                <span className="text-xl font-bold text-rose-700 font-mono">
                  {validationData.invalidCount}
                </span>
              </div>
              <div className="bg-purple-50 p-3 rounded-xl border border-purple-200">
                <span className="text-[11px] font-semibold text-purple-700 block uppercase font-mono">
                  Duplicate Rows
                </span>
                <span className="text-xl font-bold text-purple-700 font-mono">
                  {validationData.duplicateCount}
                </span>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 col-span-2 sm:col-span-1">
                <span className="text-[11px] font-semibold text-blue-700 block uppercase font-mono">
                  Commit Ready
                </span>
                <span className="text-xl font-bold text-blue-700 font-mono">
                  {validUnexcludedRows} / {validationData.totalRows}
                </span>
              </div>
            </div>

            {/* Error Diagnostics Summary if invalid rows exist */}
            {validationData.invalidCount > 0 && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    Validation Deficiencies Detected ({validationData.invalidCount} rows require attention)
                  </span>
                  <button
                    onClick={handleDownloadErrorReport}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 underline hover:text-rose-800"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Error CSV Report
                  </button>
                </div>
                <p className="text-[11px] text-rose-700">
                  Rows containing invalid course codes, nonexistent divisions/batches, or missing references cannot be committed. You may exclude them or re-upload.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {validationData.errorSummary.map((e, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-100/70 border border-rose-300/60 font-mono text-[11px]"
                    >
                      <strong>{e.field}:</strong> {e.count} row(s) ({e.message})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-1.5">
                {(['ALL', 'VALID', 'INVALID', 'DUPLICATE'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      filterStatus === st
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st} ({st === 'ALL' ? validationData.totalRows : st === 'VALID' ? validationData.validCount : st === 'INVALID' ? validationData.invalidCount : validationData.duplicateCount})
                  </button>
                ))}
              </div>

              <span className="text-xs text-slate-500 font-mono">
                Request ID: {validationData.requestId}
              </span>
            </div>

            {/* Interactive Preview Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-600 uppercase font-mono text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">Include</th>
                      <th className="py-2.5 px-3 w-14">Row</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Course & Subject</th>
                      <th className="py-2.5 px-3">Target Scope</th>
                      <th className="py-2.5 px-3">Title</th>
                      <th className="py-2.5 px-3">Validation Diagnostic</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedRows.map((r) => {
                      const isExcluded = excludedRows.has(r.rowNumber);
                      const isRowValid = r.status === 'VALID';
                      return (
                        <tr
                          key={r.rowNumber}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            isExcluded
                              ? 'opacity-40 bg-slate-50/50'
                              : !isRowValid
                              ? 'bg-rose-50/20'
                              : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={!isExcluded && isRowValid}
                              disabled={!isRowValid}
                              onChange={() => toggleRowExclusion(r.rowNumber)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">#{r.rowNumber}</td>
                          <td className="py-2.5 px-3">
                            <StatusBadge state={r.status} size="sm" />
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {r.resourceType}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900 block font-mono">{r.courseCode}</span>
                            <span className="text-[11px] text-slate-500 line-clamp-1">{r.subject}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-mono text-[11px] text-slate-700">
                              <span>{r.division}</span> • <span>{r.batch}</span>
                            </div>
                            <span className="text-[10px] text-blue-600 font-semibold">
                              ~{r.targetStudentsCount || 64} students
                            </span>
                          </td>
                          <td className="py-2.5 px-3 max-w-[200px]">
                            <span className="font-semibold text-slate-900 block truncate" title={r.title}>
                              {r.title}
                            </span>
                            <span className="text-[11px] text-slate-500 block truncate">
                              {r.fileUrl || r.announcementContent || 'No link'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 max-w-[220px]">
                            {r.errors.length > 0 ? (
                              <div className="text-[11px] text-rose-600 space-y-0.5">
                                {r.errors.map((err, i) => (
                                  <div key={i} className="flex items-start gap-1">
                                    <span className="text-rose-500 font-bold">•</span>
                                    <span>{err}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-emerald-600 font-semibold flex items-center gap-1 text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Passed all integrity bounds
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Upload Different File
              </button>

              <button
                onClick={() => setCurrentStep(5)}
                disabled={validUnexcludedRows === 0}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <span>Proceed to Confirm ({validUnexcludedRows} items)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STAGE 5: CONFIRM                                              */}
        {/* ============================================================ */}
        {currentStep === 5 && validationData && (
          <div className="space-y-6 max-w-xl mx-auto py-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">
                Confirm Bulk Ingestion & Target Distribution
              </h4>
              <p className="text-xs text-slate-500">
                You are about to commit validated academic resources into the live repository. Once confirmed, resources will be distributed strictly to eligible students.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Workbook Source:</span>
                <strong className="text-slate-900 font-mono">{validationData.fileName}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Rows to be Published:</span>
                <strong className="text-emerald-700 font-bold">{validUnexcludedRows} Items</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Deficient / Excluded Rows:</span>
                <strong className="text-rose-700">
                  {validationData.totalRows - validUnexcludedRows} Items (Will be Skipped)
                </strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Target Student Cohort Reach:</span>
                <strong className="text-blue-700 flex items-center gap-1 font-bold">
                  <Users className="w-3.5 h-3.5" />
                  ~{validUnexcludedRows * 64} Enrolled Recipients
                </strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Statutory Audit Sign-off:</span>
                <span className="font-semibold text-slate-800">{currentUser?.name || 'Administrator'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setCurrentStep(4)}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Preview
              </button>

              <button
                onClick={handleProcessImport}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Process Import</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STAGE 6: PROCESS (IN PROGRESS)                                */}
        {/* ============================================================ */}
        {currentStep === 6 && (
          <div className="py-16 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <span className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">
                Stage 6: Writing to Persistent Ledger & Broadcasting
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Executing ACID transactional commit, populating division-batch access indices, and registering statutory audit log entry...
              </p>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STAGE 7: SHOW RESULT                                          */}
        {/* ============================================================ */}
        {currentStep === 7 && importResult && (
          <div className="space-y-6 max-w-xl mx-auto py-4">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">
                Bulk Ingestion Completed Successfully!
              </h4>
              <p className="text-xs text-slate-500">
                Academic resources and syllabus assets have been validated, persisted, and distributed to verified student cohorts.
              </p>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-center">
                <span className="text-[11px] font-semibold text-emerald-700 block uppercase font-mono">
                  Imported
                </span>
                <span className="text-2xl font-bold text-emerald-700 font-mono">
                  {importResult.importedCount}
                </span>
              </div>
              <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200 text-center">
                <span className="text-[11px] font-semibold text-blue-700 block uppercase font-mono">
                  Distributed To
                </span>
                <span className="text-2xl font-bold text-blue-700 font-mono">
                  {importResult.distributedCount}
                </span>
                <span className="text-[10px] text-blue-600 block">students</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                <span className="text-[11px] font-semibold text-slate-500 block uppercase font-mono">
                  Skipped/Failed
                </span>
                <span className="text-2xl font-bold text-slate-700 font-mono">
                  {importResult.failedCount}
                </span>
              </div>
            </div>

            {/* Audit Details */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Audit Reference:</span>
                <span className="font-mono text-slate-800 font-semibold">{importResult.auditLogId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Timestamp:</span>
                <span className="text-slate-800">{importResult.timestamp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Source Workbook:</span>
                <span className="text-slate-800 font-mono">{importResult.fileName}</span>
              </div>
            </div>

            {/* Error Report if partial */}
            {importResult.failedCount > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <span>{importResult.failedCount} rows were skipped due to schema deficiencies.</span>
                <button
                  onClick={handleDownloadErrorReport}
                  className="inline-flex items-center gap-1 font-bold text-amber-800 hover:underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Error CSV
                </button>
              </div>
            )}

            {/* Final Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  setFile(null);
                  setFileData(null);
                  setValidationData(null);
                  setImportResult(null);
                  setCurrentStep(1);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Ingest Another File
              </button>

              {onClose && (
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
                >
                  Return to Resources
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
