import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { PageHeader } from '../components/common/PageHeader.js';
import { FileUploader } from '../components/common/FileUploader.js';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import {
  FacultyAcademicScope,
  MarksValidationRow,
  MarksValidationResponse,
  MarksImportResult,
  ExaminationMark,
} from '../../server/types/index.js';

type StepNumber = 1 | 2 | 3 | 4 | 5;

export const BulkMarksImportPage: React.FC = () => {
  const { currentPersona, switchPersona, showToast } = useAuth();

  // Workflow Step State
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [activeTab, setActiveTab] = useState<'upload' | 'ledger'>('upload');

  // Academic Scope State
  const [scope, setScope] = useState<FacultyAcademicScope | null>(null);
  const [isScopeLoading, setIsScopeLoading] = useState(true);
  const [scopeError, setScopeError] = useState<string | null>(null);

  // Form Selections
  const [selectedYear, setSelectedYear] = useState('2025-2026');
  const [selectedTerm, setSelectedTerm] = useState('Spring 2026 (Even Semester)');
  const [selectedExamId, setSelectedExamId] = useState('EXAM-2026-END');
  const [selectedCourseId, setSelectedCourseId] = useState('dept_cs_btech');
  const [selectedSubjectCode, setSelectedSubjectCode] = useState('CS601');
  const [selectedDivision, setSelectedDivision] = useState('Division A');

  // Upload & File State
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<number>(0);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Validation Preview State
  const [validationResult, setValidationResult] = useState<MarksValidationResponse | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'VALID' | 'ERROR'>('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  // Confirmation & Commit State
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<MarksImportResult | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Master Ledger State
  const [masterMarks, setMasterMarks] = useState<ExaminationMark[]>([]);
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);

  // Authorization Check
  const isFacultyAuthorized =
    currentPersona &&
    (currentPersona.role === 'SUPER_ADMIN' ||
      currentPersona.role === 'COE_OFFICER' ||
      currentPersona.role === 'DEAN_ACADEMICS' ||
      currentPersona.role.startsWith('HOD') ||
      currentPersona.role.startsWith('FAC') ||
      currentPersona.allowedModules.includes('*') ||
      currentPersona.allowedModules.includes('bulk-marks'));

  // Fetch Academic Scope when persona changes
  const fetchAcademicScope = async () => {
    try {
      setIsScopeLoading(true);
      setScopeError(null);
      const res = await api.get('/examinations/faculty/scope');
      if (res.data.success) {
        const data: FacultyAcademicScope = res.data.data;
        setScope(data);

        // Pre-select defaults from accessible items
        if (data.academicYears.length > 0) setSelectedYear(data.academicYears[0]);
        if (data.terms.length > 0) setSelectedTerm(data.terms[0]);
        if (data.examinations.length > 0) setSelectedExamId(data.examinations[1]?.id || data.examinations[0].id);
        if (data.courses.length > 0) setSelectedCourseId(data.courses[0].id);
        if (data.subjects.length > 0) setSelectedSubjectCode(data.subjects[0].code);
        if (data.divisions.length > 0) setSelectedDivision(data.divisions[0]);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      setScopeError(msg);
    } finally {
      setIsScopeLoading(false);
    }
  };

  // Fetch Live Master Ledger
  const fetchMasterMarks = async () => {
    try {
      setIsLedgerLoading(true);
      const res = await api.get('/examinations/marks');
      if (res.data.success) {
        setMasterMarks(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch marks', err);
    } finally {
      setIsLedgerLoading(false);
    }
  };

  useEffect(() => {
    if (isFacultyAuthorized) {
      fetchAcademicScope();
      fetchMasterMarks();
    }
  }, [currentPersona?.id, isFacultyAuthorized]);

  // Selected Exam Object
  const currentExam = scope?.examinations.find((e) => e.id === selectedExamId);
  const currentSubject = scope?.subjects.find((s) => s.code === selectedSubjectCode);
  const currentCourse = scope?.courses.find((c) => c.id === selectedCourseId || c.code === selectedCourseId);

  // -------------------------------------------------------------
  // Step 2: Download Standard Excel Template
  // -------------------------------------------------------------
  const handleDownloadTemplate = async () => {
    try {
      showToast('info', 'Generating Template', `Preparing official Excel template for ${selectedSubjectCode} (${selectedDivision})...`);
      const res = await api.get('/examinations/faculty/template', {
        params: {
          academicYear: selectedYear,
          term: selectedTerm,
          examId: selectedExamId,
          courseId: selectedCourseId,
          subjectCode: selectedSubjectCode,
          division: selectedDivision,
        },
        responseType: 'blob',
      });

      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Marks_Entry_${selectedSubjectCode}_${selectedDivision.replace(/\s+/g, '_')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast('success', 'Template Downloaded', `Standard marks template ready for grading.`);
    } catch (err: any) {
      showToast('error', 'Download Failed', err.response?.data?.error || err.message);
    }
  };

  // -------------------------------------------------------------
  // Step 2: Process Uploaded File & Validate on Backend
  // -------------------------------------------------------------
  const processAndValidateFile = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadedFileName(file.name);
      setUploadedFileSize(file.size);

      // Read file into Base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const rawBuffer = e.target?.result as ArrayBuffer;
          const bytes = new Uint8Array(rawBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64Data = window.btoa(binary);
          setFileBase64(base64Data);

          showToast('info', 'Backend Validation', `Validating rows in ${file.name} against institutional registry...`);

          // Send to Backend for strict verification
          const res = await api.post('/examinations/faculty/validate-upload', {
            fileData: base64Data,
            fileName: file.name,
            fileSize: file.size,
            academicYear: selectedYear,
            term: selectedTerm,
            examId: selectedExamId,
            courseId: selectedCourseId,
            subjectCode: selectedSubjectCode,
            division: selectedDivision,
          });

          if (res.data.success) {
            setValidationResult(res.data.data);
            setCurrentStep(3); // Advance to Preview

            if (res.data.data.summary.errorRows > 0) {
              showToast(
                'warning',
                'Integrity Violations Flagged',
                `${res.data.data.summary.errorRows} candidate records failed statutory validation checks.`
              );
            } else {
              showToast(
                'success',
                'Validation Passed',
                `All ${res.data.data.summary.validRows} candidates passed statutory compliance!`
              );
            }
          }
        } catch (err: any) {
          showToast('error', 'Validation Rejected', err.response?.data?.error || err.message);
        } finally {
          setIsUploading(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      setIsUploading(false);
      showToast('error', 'File Read Error', err.message);
    }
  };

  // -------------------------------------------------------------
  // Quick Testing Presets: Generate Sample Sheets On The Fly
  // -------------------------------------------------------------
  const loadValidSamplePreset = async () => {
    // Generate valid workbook for Division A
    const wb = XLSX.utils.book_new();
    const data = [
      ['Enrollment Number', 'Marks', 'Student Name'],
      ['21CS042', 64, 'Aarav Sharma'],
      ['21CS088', 68, 'Ananya Iyer'],
      ['21CS112', 54, 'Devansh Kulkarni'],
      ['21CS019', 61, 'Meera Nair'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Marks Entry');
    const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    setUploadedFileName('Valid_DivisionA_Marks_Clean.xlsx');
    setUploadedFileSize(14200);
    setFileBase64(b64);
    setIsUploading(true);

    try {
      const res = await api.post('/examinations/faculty/validate-upload', {
        fileData: b64,
        fileName: 'Valid_DivisionA_Marks_Clean.xlsx',
        fileSize: 14200,
        academicYear: selectedYear,
        term: selectedTerm,
        examId: selectedExamId,
        courseId: selectedCourseId,
        subjectCode: selectedSubjectCode,
        division: selectedDivision,
      });

      if (res.data.success) {
        setValidationResult(res.data.data);
        setCurrentStep(3);
        showToast('success', 'Valid Roster Ingested', 'Loaded 4 valid candidate records for Division A.');
      }
    } catch (err: any) {
      showToast('error', 'Validation Error', err.response?.data?.error || err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const loadFlawedSamplePreset = async () => {
    // Generate workbook demonstrating all 9 validation rule failures
    const wb = XLSX.utils.book_new();
    const data = [
      ['Enrollment Number', 'Marks', 'Student Name'],
      ['21CS042', 64, 'Aarav Sharma'], // Valid
      ['21CS088', 82, 'Ananya Iyer'], // Error: 82 > 70 statutory ceiling
      ['21CS034', 59, 'Karan Patel'], // Error: Enrolled in Division B, not Division A
      ['21CS042', 60, 'Aarav Sharma'], // Error: Duplicate enrollment number
      ['21CS999', 45, 'Nonexistent Student'], // Error: Not in master student registry
      ['21CS112', 'ABSENT', 'Devansh Kulkarni'], // Error: Non-numeric score
      ['', 50, 'Empty Roll Number'], // Error: Missing enrollment number
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Marks Entry');
    const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    setUploadedFileName('Flawed_Marks_Integrity_Breaches.xlsx');
    setUploadedFileSize(16400);
    setFileBase64(b64);
    setIsUploading(true);

    try {
      const res = await api.post('/examinations/faculty/validate-upload', {
        fileData: b64,
        fileName: 'Flawed_Marks_Integrity_Breaches.xlsx',
        fileSize: 16400,
        academicYear: selectedYear,
        term: selectedTerm,
        examId: selectedExamId,
        courseId: selectedCourseId,
        subjectCode: selectedSubjectCode,
        division: selectedDivision,
      });

      if (res.data.success) {
        setValidationResult(res.data.data);
        setCurrentStep(3);
        showToast(
          'warning',
          'Integrity Violations Flagged',
          'ACID gate detected statutory violations across multiple candidate rows.'
        );
      }
    } catch (err: any) {
      showToast('error', 'Validation Error', err.response?.data?.error || err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // -------------------------------------------------------------
  // Step 3: Download Error Report
  // -------------------------------------------------------------
  const handleDownloadErrorReport = async () => {
    if (!validationResult) return;

    try {
      showToast('info', 'Generating Report', 'Assembling statutory deficiency diagnosis report...');
      const res = await api.post(
        '/examinations/faculty/error-report',
        {
          rows: validationResult.rows,
          examName: validationResult.examDetails.examName,
          subjectCode: validationResult.examDetails.subjectCode,
        },
        { responseType: 'blob' }
      );

      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Deficiency_Report_${selectedSubjectCode}_${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast('success', 'Report Generated', 'Downloaded error report with remediation steps.');
    } catch (err: any) {
      showToast('error', 'Report Failed', err.response?.data?.error || err.message);
    }
  };

  // -------------------------------------------------------------
  // Step 4: Confirm Import (Atomic Database Transaction)
  // -------------------------------------------------------------
  const handleConfirmImport = async () => {
    if (!validationResult) return;
    setShowConfirmModal(false);

    try {
      setIsCommitting(true);
      setCurrentStep(4); // Processing state
      setCommitError(null);

      // Perform single atomic transaction
      const res = await api.post('/examinations/faculty/confirm-import', {
        batchId: validationResult.batchId,
        academicYear: selectedYear,
        term: selectedTerm,
        examId: selectedExamId,
        courseId: selectedCourseId,
        subjectCode: selectedSubjectCode,
        division: selectedDivision,
        rows: validationResult.rows,
      });

      if (res.data.success) {
        setCommitResult(res.data.data);
        setCurrentStep(5); // Success state
        showToast(
          'success',
          'Atomic Transaction Succeeded',
          `Permanently committed ${res.data.data.totalRows} candidate marks to COE Master Ledger.`
        );
        await fetchMasterMarks();
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message;
      setCommitError(errorMsg);
      setCurrentStep(3); // Return to preview with error
      showToast('error', 'ACID Transaction Rolled Back', errorMsg);
    } finally {
      setIsCommitting(false);
    }
  };

  // Reset workflow
  const handleResetWorkflow = () => {
    setCurrentStep(1);
    setValidationResult(null);
    setCommitResult(null);
    setCommitError(null);
    setUploadedFileName(null);
    setFileBase64(null);
  };

  // Filtered rows in validation preview
  const filteredRows = (validationResult?.rows || []).filter((row) => {
    if (filterMode === 'VALID' && row.validationStatus !== 'VALID') return false;
    if (filterMode === 'ERROR' && row.validationStatus !== 'ERROR') return false;

    if (searchFilter.trim()) {
      const query = searchFilter.toLowerCase();
      const matchRoll = row.enrollmentNumber.toLowerCase().includes(query);
      const matchName = row.studentName.toLowerCase().includes(query);
      const matchErr = row.errorMessage?.toLowerCase().includes(query);
      return matchRoll || matchName || matchErr;
    }

    return true;
  });

  // -------------------------------------------------------------
  // ACCESS DENIED SCREEN (If Unauthorized Persona)
  // -------------------------------------------------------------
  if (!isFacultyAuthorized) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-8">
        <div className="p-8 bg-white rounded-3xl border border-rose-200 shadow-sm text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[36px]">gpp_bad</span>
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-mono font-bold uppercase tracking-wider">
              HTTP 403 Forbidden • Access Denied
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Faculty Examination Grading Privileges Required
            </h2>
            <p className="text-sm text-slate-600 max-w-lg mx-auto">
              This module is strictly guarded by the Controller of Examinations. Only authorized Faculty members, Heads of Department (HOD), and Examination Branch officers can upload and commit student marks.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left max-w-md mx-auto space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Active Persona:</span>
              <span className="font-bold text-slate-900">{currentPersona?.name}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Current Role:</span>
              <span className="font-mono font-bold text-rose-700">{currentPersona?.role}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Department:</span>
              <span className="text-slate-800">{currentPersona?.department}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Access Status:</span>
              <span className="font-mono font-bold text-rose-600">LACKS GRADING CLEARANCE</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => switchPersona('user_faculty_cse')}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">badge</span>
              <span>Switch to Dr. P. Sundaram (Faculty CSE)</span>
            </button>
            <button
              onClick={() => switchPersona('user_hod_cse')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">school</span>
              <span>Switch to Dr. Rajesh Nair (HOD CSE)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MAIN FACULTY PORTAL (AUTHORIZED)
  // -------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        badgeText="Statutory Examination Gateway"
        badgeIcon="verified"
        title="Faculty Bulk Examination Marks Upload"
        description="Select academic scope, download official roster template, ingest scores via Excel, and atomically commit validated marks to the Controller of Examinations master ledger."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeTab === 'upload' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Upload Wizard
              </button>
              <button
                onClick={() => setActiveTab('ledger')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeTab === 'ledger' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Live Ledger ({masterMarks.length})
              </button>
            </div>
          </div>
        }
      />

      {/* Scope Loading / Error State */}
      {isScopeLoading && (
        <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center text-slate-500 text-xs space-y-2">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Verifying faculty credentials and loading academic scope...</p>
        </div>
      )}

      {scopeError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 flex items-center gap-3 text-xs">
          <span className="material-symbols-outlined text-[20px] text-rose-600">error</span>
          <span>{scopeError}</span>
        </div>
      )}

      {/* =========================================================
          TAB 1: UPLOAD WIZARD
         ========================================================= */}
      {activeTab === 'upload' && !isScopeLoading && (
        <div className="space-y-6">
          {/* Stepper (Stitch Design) */}
          <div className="w-full bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs overflow-x-auto">
            <div className="flex items-center justify-between min-w-[720px] gap-2">
              {[
                { num: 1, label: 'Scope Selection', sublabel: 'Exam & Subject' },
                { num: 2, label: 'Template & Upload', sublabel: 'Excel File Ingest' },
                { num: 3, label: 'Validation Preview', sublabel: '9 Statutory Rules' },
                { num: 4, label: 'ACID Commit', sublabel: 'Atomic Ledger Write' },
                { num: 5, label: 'Master Receipt', sublabel: 'Audit Sealed' },
              ].map((s, idx) => {
                const isDone = currentStep > s.num;
                const isCurrent = currentStep === s.num;
                return (
                  <React.Fragment key={s.num}>
                    <div
                      onClick={() => {
                        if (isDone || (s.num === 1 && currentStep !== 4)) {
                          setCurrentStep(s.num as StepNumber);
                        }
                      }}
                      className={`flex items-center gap-2.5 cursor-pointer select-none ${
                        isCurrent ? 'opacity-100' : isDone ? 'opacity-90' : 'opacity-40'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-xl font-mono text-xs font-bold flex items-center justify-center transition-all ${
                          isDone
                            ? 'bg-emerald-600 text-white'
                            : isCurrent
                            ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {isDone ? (
                          <span className="material-symbols-outlined text-[16px]">check</span>
                        ) : (
                          s.num
                        )}
                      </div>
                      <div>
                        <h4
                          className={`text-xs font-bold leading-tight ${
                            isCurrent ? 'text-blue-600' : 'text-slate-800'
                          }`}
                        >
                          {s.label}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono leading-none mt-0.5">
                          {s.sublabel}
                        </p>
                      </div>
                    </div>
                    {idx < 4 && (
                      <div
                        className={`h-0.5 flex-1 min-w-[16px] transition-all ${
                          currentStep > s.num ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* -------------------------------------------------------
              STEP 1: ACADEMIC SCOPE SELECTION
             ------------------------------------------------------- */}
          {currentStep === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Controls */}
              <div className="lg:col-span-2 p-6 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-sm font-bold text-slate-900">Academic Scope & Examination Target</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select the statutory exam, syllabus course, and division you are authorized to grade.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Academic Year */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">Academic Year</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                    >
                      {scope?.academicYears.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Term */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">Term / Semester</label>
                    <select
                      value={selectedTerm}
                      onChange={(e) => setSelectedTerm(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                    >
                      {scope?.terms.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Examination */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="font-semibold text-slate-700">Examination</label>
                    <select
                      value={selectedExamId}
                      onChange={(e) => setSelectedExamId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                    >
                      {scope?.examinations.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.name} (Max Marks: {ex.maxMarks} • {ex.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Course */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">Course / Degree Program</label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                    >
                      {scope?.courses.map((crs) => (
                        <option key={crs.id} value={crs.id}>
                          {crs.code} — {crs.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subject */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">Subject (Faculty Authorized Scope)</label>
                    <select
                      value={selectedSubjectCode}
                      onChange={(e) => setSelectedSubjectCode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                    >
                      {scope?.subjects.map((sub) => (
                        <option key={sub.code} value={sub.code}>
                          {sub.code} — {sub.name} (Sem {sub.semester})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Division */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="font-semibold text-slate-700">Division / Section</label>
                    <div className="flex gap-3">
                      {scope?.divisions.map((div) => (
                        <label
                          key={div}
                          className={`flex-1 p-3 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                            selectedDivision === div
                              ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="radio"
                            name="division"
                            value={div}
                            checked={selectedDivision === div}
                            onChange={() => setSelectedDivision(div)}
                            className="hidden"
                          />
                          <span>{div}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <span>Proceed to Template & Upload</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>

              {/* Sidebar Metadata & Security Badge */}
              <div className="space-y-4">
                <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-4 text-xs">
                  <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px] uppercase font-bold">
                    <span className="material-symbols-outlined text-[16px] text-blue-600">verified_user</span>
                    <span>Academic Scope Clearance</span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1">
                      <span className="text-[10px] text-blue-600 font-mono uppercase font-bold">Statutory Ceiling</span>
                      <h4 className="text-base font-extrabold text-blue-900 font-mono">
                        {currentExam?.maxMarks || 70} Marks
                      </h4>
                      <p className="text-[11px] text-blue-700">
                        {currentExam?.name} ({currentExam?.type} Component)
                      </p>
                    </div>

                    <div className="space-y-2 text-slate-600">
                      <div className="flex justify-between pb-1 border-b border-slate-100">
                        <span className="text-slate-400">Faculty Member:</span>
                        <span className="font-bold text-slate-800">{currentPersona?.name}</span>
                      </div>
                      <div className="flex justify-between pb-1 border-b border-slate-100">
                        <span className="text-slate-400">Staff ID:</span>
                        <span className="font-mono font-bold text-slate-800">{currentPersona?.staffId}</span>
                      </div>
                      <div className="flex justify-between pb-1 border-b border-slate-100">
                        <span className="text-slate-400">Department:</span>
                        <span className="font-bold text-slate-800">{currentSubject?.department}</span>
                      </div>
                      <div className="flex justify-between pb-1 border-b border-slate-100">
                        <span className="text-slate-400">Selected Subject:</span>
                        <span className="font-mono font-bold text-slate-800">{selectedSubjectCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Selected Division:</span>
                        <span className="font-bold text-slate-800">{selectedDivision}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-amber-900 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="material-symbols-outlined text-[16px] text-amber-700">lock_reset</span>
                    <span>Zero-Trust Academic Scope</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Faculty grading is strictly restricted to subjects in your assigned department. The backend validates academic ownership before any file parsing or commit.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------
              STEP 2: TEMPLATE DOWNLOAD & FILE INGESTION
             ------------------------------------------------------- */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Download Standard Template Box */}
                <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">table_view</span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">1. Download Roster Template</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Download the official Excel template pre-populated with enrolled students for{' '}
                      <strong className="text-slate-700 font-semibold">{selectedSubjectCode} ({selectedDivision})</strong>.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Columns:</span>
                      <span className="font-mono text-slate-700">Enrollment Number, Marks, Student Name</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Format:</span>
                      <span className="font-mono text-emerald-700 font-bold">.xlsx (Excel 2007+)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Max Score:</span>
                      <span className="font-mono text-blue-700 font-bold">{currentExam?.maxMarks} Marks</span>
                    </div>
                  </div>

                  <button
                    onClick={handleDownloadTemplate}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    <span>Download Official Template (.xlsx)</span>
                  </button>

                  {/* Testing Helper Presets */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                      Quick Verification Presets:
                    </span>
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={loadValidSamplePreset}
                        disabled={isUploading}
                        className="w-full py-1.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 text-left flex items-center justify-between cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>Load Valid Roster (4 Students)</span>
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">100% Pass</span>
                      </button>
                      <button
                        onClick={loadFlawedSamplePreset}
                        disabled={isUploading}
                        className="w-full py-1.5 px-3 rounded-lg border border-rose-200 bg-rose-50/40 hover:bg-rose-50 text-[11px] font-semibold text-rose-800 text-left flex items-center justify-between cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span>Load Flawed Roster (Integrity Breaches)</span>
                        </span>
                        <span className="font-mono text-[10px] text-rose-600">Tests 9 Rules</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: Upload File Area */}
                <div className="lg:col-span-2 p-6 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">2. Ingest Completed Marks Spreadsheet</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Drop the graded workbook here. The backend will parse and validate every row.
                      </p>
                    </div>
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                      <span>Change Scope</span>
                    </button>
                  </div>

                  {isUploading ? (
                    <div className="border-2 border-dashed border-blue-400 bg-blue-50/40 rounded-3xl p-12 text-center space-y-3">
                      <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                      <h4 className="text-sm font-bold text-blue-900">Parsing & Validating Spreadsheet...</h4>
                      <p className="text-xs text-blue-700">
                        Checking enrollment numbers, division bindings, and statutory score limits against the institutional ledger.
                      </p>
                    </div>
                  ) : (
                    <FileUploader
                      onFileSelect={processAndValidateFile}
                      accept=".xlsx,.xls,.csv"
                      label="Upload Graded Marks Sheet (.xlsx or .csv)"
                      sublabel={`Target: ${selectedSubjectCode} (${currentSubject?.name}) • ${selectedDivision} • Max: ${currentExam?.maxMarks} Marks`}
                    />
                  )}

                  {/* 9 Statutory Validation Rules Summary */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-[11px] font-mono uppercase font-bold text-slate-400 block">
                      Enforced Statutory Validation Rules (Server-Authoritative)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>
                        <span>Enrollment number is required</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>
                        <span>Enrollment number must exist</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>
                        <span>Student belongs to selected division</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>
                        <span>Student belongs to selected course</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>
                        <span>No duplicate enrollment numbers</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>
                        <span>Marks must be strictly numeric</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>
                        <span>Marks within statutory ceiling [0 – {currentExam?.maxMarks}]</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>
                        <span>Required headers must be present</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------
              STEP 3: VALIDATION PREVIEW & DEFICIENCY REPORT
             ------------------------------------------------------- */}
          {currentStep === 3 && validationResult && (
            <div className="space-y-6">
              {/* Top KPI Metrics Row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Total Rows</span>
                  <h3 className="text-xl font-extrabold text-slate-900 font-mono">
                    {validationResult.summary.totalRows}
                  </h3>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-2xs space-y-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-emerald-700">Valid Records</span>
                  <h3 className="text-xl font-extrabold text-emerald-800 font-mono">
                    {validationResult.summary.validRows}
                  </h3>
                </div>

                <div
                  className={`p-4 rounded-2xl shadow-2xs space-y-1 ${
                    validationResult.summary.errorRows > 0
                      ? 'bg-rose-50 border border-rose-200'
                      : 'bg-slate-50 border border-slate-200'
                  }`}
                >
                  <span
                    className={`text-[10px] font-mono uppercase font-bold ${
                      validationResult.summary.errorRows > 0 ? 'text-rose-700' : 'text-slate-400'
                    }`}
                  >
                    Integrity Violations
                  </span>
                  <h3
                    className={`text-xl font-extrabold font-mono ${
                      validationResult.summary.errorRows > 0 ? 'text-rose-700' : 'text-slate-500'
                    }`}
                  >
                    {validationResult.summary.errorRows}
                  </h3>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Statutory Ceiling</span>
                  <h3 className="text-xl font-extrabold text-blue-700 font-mono">
                    {validationResult.examDetails.maxMarks}
                  </h3>
                </div>

                <div className="col-span-2 sm:col-span-1 p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400">ACID Gate</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        validationResult.canConfirm ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                      }`}
                    />
                    <span
                      className={`text-xs font-bold ${
                        validationResult.canConfirm ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {validationResult.canConfirm ? 'PERMITTED' : 'LOCKED'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Alert Banner */}
              {validationResult.summary.errorRows > 0 ? (
                <div className="p-5 bg-rose-50 border border-rose-200 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-rose-900">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-200 text-rose-800 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[24px]">gpp_maybe</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold font-mono uppercase tracking-wide">
                        ACID Integrity Gate: {validationResult.summary.errorRows} Critical Errors Flagged
                      </h4>
                      <p className="text-xs text-rose-700 mt-0.5">
                        Statutory rules violated. The transaction cannot proceed until all errors are rectified. Download the deficiency report, adjust your spreadsheet, and re-upload.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleDownloadErrorReport}
                      className="px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      <span>Download Error Report (.xlsx)</span>
                    </button>
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="px-3.5 py-2 rounded-xl bg-white border border-rose-300 text-rose-900 hover:bg-rose-100 text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">upload</span>
                      <span>Upload New File</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-emerald-950">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[24px]">verified</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold font-mono uppercase tracking-wide">
                        Pre-Flight Verification Succeeded: All Records Clean
                      </h4>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        All {validationResult.summary.validRows} candidates matched institutional student records and statutory score limits [0 – {validationResult.examDetails.maxMarks}].
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setShowConfirmModal(true)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">lock</span>
                      <span>Confirm Import (Atomic Commit)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Commit Error (if any rollback occurred) */}
              {commitError && (
                <div className="p-4 bg-rose-100 border border-rose-300 rounded-2xl text-rose-900 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="material-symbols-outlined text-[16px]">warning</span>
                    <span>ACID Transaction Aborted & Rolled Back</span>
                  </div>
                  <p>{commitError}</p>
                </div>
              )}

              {/* Validation Table Filter Controls */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  {/* Tabs */}
                  <div className="flex bg-slate-100 p-1 rounded-xl text-xs">
                    <button
                      onClick={() => setFilterMode('ALL')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        filterMode === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      All ({validationResult.summary.totalRows})
                    </button>
                    <button
                      onClick={() => setFilterMode('VALID')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        filterMode === 'VALID' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      Valid Only ({validationResult.summary.validRows})
                    </button>
                    <button
                      onClick={() => setFilterMode('ERROR')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        filterMode === 'ERROR' ? 'bg-white text-rose-800 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      Deficiencies Only ({validationResult.summary.errorRows})
                    </button>
                  </div>

                  {/* Search */}
                  <div className="w-full sm:w-64 relative">
                    <span className="material-symbols-outlined text-[16px] text-slate-400 absolute left-3 top-2.5">
                      search
                    </span>
                    <input
                      type="text"
                      placeholder="Filter roll no or name..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase text-slate-400">
                      <tr>
                        <th className="py-3 px-4 w-12">#</th>
                        <th className="py-3 px-4">Enrollment Number</th>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4 text-center">Marks</th>
                        <th className="py-3 px-4">Validation Status</th>
                        <th className="py-3 px-4">Diagnostic Verification Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No records match the current filter.
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map((row) => {
                          const isErr = row.validationStatus === 'ERROR';
                          return (
                            <tr
                              key={row.rowNumber}
                              className={`transition-colors ${
                                isErr ? 'bg-rose-50/40 hover:bg-rose-50' : 'hover:bg-slate-50/70'
                              }`}
                            >
                              <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                                {row.rowNumber}
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-900">
                                {row.enrollmentNumber}
                              </td>
                              <td className="py-3 px-4 font-medium text-slate-800">
                                {row.studentName}
                              </td>
                              <td className="py-3 px-4 text-center font-mono font-bold">
                                <span
                                  className={`px-2 py-0.5 rounded-md ${
                                    isErr && row.errorMessage?.includes('ceiling')
                                      ? 'bg-rose-200 text-rose-900'
                                      : 'bg-slate-100 text-slate-800'
                                  }`}
                                >
                                  {row.marks !== null ? row.marks : row.rawMarks || '—'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold inline-flex items-center gap-1 ${
                                    isErr
                                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[12px]">
                                    {isErr ? 'cancel' : 'check_circle'}
                                  </span>
                                  <span>{row.validationStatus}</span>
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {isErr ? (
                                  <span className="text-rose-700 font-medium text-[11px]">
                                    {row.errorMessage}
                                  </span>
                                ) : (
                                  <span className="text-emerald-700 text-[11px] font-medium flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">done</span>
                                    <span>Verified candidate & score</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bottom action bar */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    <span>Back to Ingest</span>
                  </button>

                  <div className="flex items-center gap-3">
                    {validationResult.summary.errorRows > 0 ? (
                      <button
                        onClick={handleDownloadErrorReport}
                        className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        <span>Download Deficiency Excel</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowConfirmModal(true)}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px]">lock</span>
                        <span>Confirm Import (Atomic Commit)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------
              STEP 4: PROCESSING TRANSACTION ANIMATION
             ------------------------------------------------------- */}
          {currentStep === 4 && (
            <div className="p-16 bg-white rounded-3xl border border-slate-200 shadow-sm text-center space-y-4 max-w-lg mx-auto">
              <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Executing ACID Transaction Commit...
                </h3>
                <p className="text-xs text-slate-500">
                  Writing all candidate marks in a single atomic database lock. Rolling back if any discrepancy is detected.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-600">
                Target: {selectedSubjectCode} • {selectedDivision} • ACID Lock Active
              </div>
            </div>
          )}

          {/* -------------------------------------------------------
              STEP 5: IMPORT RESULT & AUDIT RECEIPT
             ------------------------------------------------------- */}
          {currentStep === 5 && commitResult && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Success Banner */}
              <div className="p-8 bg-white rounded-3xl border border-emerald-200 shadow-sm text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[36px]">verified</span>
                </div>

                <div className="space-y-1">
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-mono font-bold uppercase tracking-wider">
                    ACID Commit Completed
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">
                    Examination Marks Sealed into COE Master Ledger
                  </h2>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    All {commitResult.totalRows} student marks have been permanently committed in a single atomic transaction.
                  </p>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left pt-2">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Total Rows</span>
                    <p className="text-lg font-extrabold text-slate-900 font-mono">{commitResult.totalRows}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Updated Rows</span>
                    <p className="text-lg font-extrabold text-emerald-700 font-mono">{commitResult.updatedRows}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Failed Rows</span>
                    <p className="text-lg font-extrabold text-slate-400 font-mono">0</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Processing Time</span>
                    <p className="text-lg font-extrabold text-blue-700 font-mono">
                      {commitResult.processingDurationMs} ms
                    </p>
                  </div>
                </div>

                {/* Cryptographic Audit Trail Card */}
                <div className="p-4 bg-slate-900 text-slate-300 rounded-2xl text-left space-y-2 font-mono text-xs border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] pb-1 border-b border-slate-800">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <span className="material-symbols-outlined text-[14px]">lock</span>
                      <span>CRYPTOGRAPHIC AUDIT LOG ENTRY</span>
                    </span>
                    <span>{commitResult.timestamp}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500">Request ID:</span>{' '}
                      <span className="text-white font-bold">{commitResult.requestId}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Action:</span>{' '}
                      <span className="text-emerald-400">FACULTY_BULK_MARKS_UPLOAD</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Subject:</span>{' '}
                      <span className="text-white">{commitResult.subject}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Division:</span>{' '}
                      <span className="text-white">{commitResult.division}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Evaluator:</span>{' '}
                      <span className="text-white">
                        {commitResult.actor.name} ({commitResult.actor.role})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Transaction Status:</span>{' '}
                      <span className="text-emerald-400 font-bold">COMMITTED / IMMUTABLE</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={handleResetWorkflow}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">replay</span>
                    <span>Upload Another Division / Exam</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('ledger')}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    <span>Inspect Master Marks Ledger</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 2: LIVE MASTER MARKS LEDGER
         ========================================================= */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Controller of Examinations Master Ledger</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Statutory student examination marks committed to the institutional registry.
              </p>
            </div>
            <button
              onClick={fetchMasterMarks}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>Refresh Ledger</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase text-slate-400">
                <tr>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4 text-center">Internal (30)</th>
                  <th className="py-3 px-4 text-center">Theory (70)</th>
                  <th className="py-3 px-4 text-center">Total (100)</th>
                  <th className="py-3 px-4 text-center">Grade</th>
                  <th className="py-3 px-4">Evaluator</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {masterMarks.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{m.rollNo}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{m.studentName}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{m.courseCode}</td>
                    <td className="py-3 px-4 text-center font-mono">{m.internalMarks}</td>
                    <td className="py-3 px-4 text-center font-mono">{m.theoryMarks}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">{m.totalMarks}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono font-bold text-[11px]">
                        {m.grade}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-[11px]">{m.evaluator}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[10px]">{m.lastUpdated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================
          CONFIRMATION MODAL (BEFORE ATOMIC WRITE)
         ========================================================= */}
      {showConfirmModal && validationResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">lock</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Confirm Statutory Marks Commit
              </h3>
              <p className="text-xs text-slate-600">
                You are about to commit marks for{' '}
                <strong className="text-slate-800 font-semibold">{validationResult.summary.validRows} candidates</strong> in{' '}
                <strong className="text-slate-800 font-semibold">{selectedSubjectCode} ({selectedDivision})</strong>.
              </p>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <span className="font-bold flex items-center gap-1 text-[11px]">
                <span className="material-symbols-outlined text-[14px]">warning</span>
                <span>Atomic Transaction Notice</span>
              </span>
              <p className="text-[11px] text-amber-800">
                All records will be updated in a single transaction. If any database constraint fails, the entire batch will roll back immediately with 0 changes applied.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Subject:</span>
                <span className="font-bold text-slate-800">{selectedSubjectCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Division:</span>
                <span className="font-bold text-slate-800">{selectedDivision}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Evaluator:</span>
                <span className="font-bold text-slate-800">{currentPersona?.name}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={isCommitting}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span>Authorize & Commit</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
