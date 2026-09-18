import React, { useState } from 'react';
import { AcademicResourceType, ResourceUploadItem } from '../../../server/types/index.js';
import {
  FileText,
  BookOpen,
  Bell,
  X,
  Upload,
  Link,
  Users,
  AlertCircle,
  CheckCircle2,
  Globe,
  Lock,
} from 'lucide-react';

interface CreateResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (resource: ResourceUploadItem) => void;
}

const COURSES_CONFIG: Record<
  string,
  {
    name: string;
    dept: string;
    divisions: string[];
    batches: string[];
    subjects: { code: string; name: string }[];
  }
> = {
  'BTECH-CSE': {
    name: 'B.Tech Computer Science & Engineering',
    dept: 'Computer Science & Engineering',
    divisions: ['Division A', 'Division B', 'ALL'],
    batches: ['2021-2025', '2022-2026', '2023-2027', 'Batch 1', 'Batch 2', 'ALL'],
    subjects: [
      { code: 'CS601', name: 'Distributed Systems & Cloud Computing' },
      { code: 'CS602', name: 'Compiler Construction & Optimization' },
      { code: 'CS603', name: 'Capstone Project Phase I' },
    ],
  },
  'BTECH-ECE': {
    name: 'B.Tech Electronics & Communication',
    dept: 'Electronics & Communication',
    divisions: ['Division A', 'ALL'],
    batches: ['2021-2025', '2022-2026', '2023-2027', 'Batch 1', 'Batch 2', 'ALL'],
    subjects: [
      { code: 'EC401', name: 'Digital Signal Processing & Architectures' },
      { code: 'EC402', name: 'Microprocessors & Embedded Systems' },
    ],
  },
  'BTECH-MECH': {
    name: 'B.Tech Mechanical Engineering',
    dept: 'Mechanical Engineering',
    divisions: ['Division A', 'ALL'],
    batches: ['2021-2025', '2022-2026', '2023-2027', 'Batch 1', 'Batch 2', 'ALL'],
    subjects: [
      { code: 'ME201', name: 'Thermodynamics & Fluid Mechanics' },
    ],
  },
  'MTECH-CPS': {
    name: 'M.Tech Cyber-Physical Systems',
    dept: 'Computer Science & Engineering',
    divisions: ['Division A', 'ALL'],
    batches: ['2024-2026', '2025-2027', 'ALL'],
    subjects: [
      { code: 'CPS701', name: 'Real-Time Embedded Operating Systems' },
    ],
  },
  ALL: {
    name: 'All University Programs',
    dept: 'All Departments',
    divisions: ['ALL'],
    batches: ['ALL'],
    subjects: [{ code: 'GEN-01', name: 'All Subjects (Campus Circular)' }],
  },
};

export const CreateResourceModal: React.FC<CreateResourceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [resourceType, setResourceType] = useState<AcademicResourceType>('Lecture Notes');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [term, setTerm] = useState('Spring 2026');
  const [courseCode, setCourseCode] = useState('BTECH-CSE');
  const [subjectCode, setSubjectCode] = useState('CS601');
  const [division, setDivision] = useState('Division A');
  const [batch, setBatch] = useState('2021-2025');
  const [fileUrl, setFileUrl] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [priority, setPriority] = useState<'NORMAL' | 'URGENT' | 'STATUTORY'>('NORMAL');
  const [isGlobal, setIsGlobal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentCourse = COURSES_CONFIG[courseCode] || COURSES_CONFIG['BTECH-CSE'];

  const handleCourseChange = (newCode: string) => {
    setCourseCode(newCode);
    const cfg = COURSES_CONFIG[newCode];
    if (cfg) {
      setDivision(cfg.divisions[0] || 'ALL');
      setBatch(cfg.batches[0] || 'ALL');
      setSubjectCode(cfg.subjects[0]?.code || 'CS601');
    }
  };

  const selectedSubject = currentCourse.subjects.find((s) => s.code === subjectCode) || currentCourse.subjects[0];

  // Calculate estimated audience
  let audienceEstimate = isGlobal ? 1240 : division !== 'ALL' ? 64 : batch !== 'ALL' ? 128 : 240;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Frontend validation
    if (!title.trim() || title.trim().length < 3) {
      setError('Resource Title must be at least 3 characters.');
      return;
    }

    if (resourceType !== 'Announcements' && !fileUrl.trim()) {
      setError(`A File or Cloud Reference URL is mandatory for ${resourceType}.`);
      return;
    }

    if (resourceType === 'Announcements' && !announcementContent.trim() && !fileUrl.trim()) {
      setError('Announcement Content or an official circular file reference URL is required.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        title: title.trim(),
        category: resourceType,
        resourceType,
        description: description.trim() || 'Academic syllabus study asset published to student portal.',
        academicYear,
        term,
        department: currentCourse.dept,
        course: currentCourse.name,
        courseCode: courseCode,
        subject: selectedSubject?.name || 'Academic Module',
        subjectCode: subjectCode,
        division,
        batch,
        fileUrl: fileUrl.trim(),
        driveUrl: fileUrl.trim(),
        fileSize: '3.4 MB',
        fileType: fileUrl.endsWith('.docx') ? 'DOCX' : fileUrl.endsWith('.pptx') ? 'PPTX' : 'PDF',
        announcementContent: announcementContent.trim(),
        priority: resourceType === 'Announcements' ? priority : undefined,
        isGlobal,
      };

      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to publish resource.');
      }

      onSuccess(data.data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during submission.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Publish Academic Resource</h3>
            <p className="text-xs text-slate-500">
              Distribute lecture notes, study materials, or official announcements with verified target scoping.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <strong className="font-semibold block">Validation Error</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* 1. Resource Type Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-mono">
              1. Resource Type *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  type: 'Lecture Notes' as const,
                  icon: FileText,
                  desc: 'Slides, transcripts & handouts',
                },
                {
                  type: 'Learning Materials' as const,
                  icon: BookOpen,
                  desc: 'Labs, assignments & datasets',
                },
                {
                  type: 'Announcements' as const,
                  icon: Bell,
                  desc: 'Official notices & circulars',
                },
              ].map((item) => {
                const isSelected = resourceType === item.type;
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setResourceType(item.type)}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1.5 ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-900">{item.type}</span>
                    <span className="text-[11px] text-slate-500 line-clamp-1">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Target Scoping & Distribution Matrix */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                2. Target Scoping & Distribution Matrix *
              </label>
              <div className="flex items-center gap-1.5 text-xs text-blue-700 font-semibold bg-blue-100/60 px-2 py-0.5 rounded-full">
                <Users className="w-3.5 h-3.5" />
                <span>Estimated Target: ~{audienceEstimate} Students</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Course */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Target Course / Program
                </label>
                <select
                  value={courseCode}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-200 py-2 px-2.5 bg-white font-medium focus:ring-2 focus:ring-blue-600"
                >
                  <option value="BTECH-CSE">B.Tech Computer Science & Engg (BTECH-CSE)</option>
                  <option value="BTECH-ECE">B.Tech Electronics & Comm (BTECH-ECE)</option>
                  <option value="BTECH-MECH">B.Tech Mechanical Engg (BTECH-MECH)</option>
                  <option value="MTECH-CPS">M.Tech Cyber-Physical Systems (MTECH-CPS)</option>
                  <option value="ALL">All Programs (Campus Wide)</option>
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Subject / Curriculum Module
                </label>
                <select
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-200 py-2 px-2.5 bg-white font-medium focus:ring-2 focus:ring-blue-600"
                >
                  {currentCourse.subjects.map((sub) => (
                    <option key={sub.code} value={sub.code}>
                      [{sub.code}] {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Division */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Target Division / Section
                </label>
                <select
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-200 py-2 px-2.5 bg-white font-medium focus:ring-2 focus:ring-blue-600"
                >
                  {currentCourse.divisions.map((div) => (
                    <option key={div} value={div}>
                      {div}
                    </option>
                  ))}
                </select>
              </div>

              {/* Batch */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Target Student Batch
                </label>
                <select
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-200 py-2 px-2.5 bg-white font-medium focus:ring-2 focus:ring-blue-600"
                >
                  {currentCourse.batches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Global Visibility Override */}
            <div className="pt-2 border-t border-slate-200/60 flex items-start gap-2.5">
              <input
                id="isGlobalCheck"
                type="checkbox"
                checked={isGlobal}
                onChange={(e) => setIsGlobal(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isGlobalCheck" className="text-xs cursor-pointer select-none">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                  Make Globally Visible across entire campus
                </span>
                <span className="text-slate-500 block text-[11px] mt-0.5">
                  By default, resources are strictly restricted to the specified Department, Course, Division and Batch. Only check this for institution-wide statutory notices.
                </span>
              </label>
            </div>
          </div>

          {/* 3. Title & Content */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                Resource Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Unit 4: Distributed Consensus & Paxos Proof"
                className="w-full text-xs rounded-lg border-slate-200 py-2 px-3 bg-white font-medium focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                  Academic Year
                </label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-200 py-2 px-2.5 bg-white font-medium focus:ring-2 focus:ring-blue-600"
                >
                  <option value="2025-2026">2025-2026 (Current Academic Year)</option>
                  <option value="2024-2025">2024-2025</option>
                  <option value="2026-2027">2026-2027</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                  Academic Term / Semester
                </label>
                <select
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-200 py-2 px-2.5 bg-white font-medium focus:ring-2 focus:ring-blue-600"
                >
                  <option value="Spring 2026">Spring 2026 (Sem 6 / Sem 4 / Sem 2)</option>
                  <option value="Fall 2025">Fall 2025</option>
                  <option value="Sem 6">Semester 6</option>
                  <option value="Sem 4">Semester 4</option>
                  <option value="Sem 2">Semester 2</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                Syllabus Scope & Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Brief pedagogical description, chapter reference, or preparation requirements..."
                className="w-full text-xs rounded-lg border-slate-200 py-2 px-3 bg-white font-medium focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* 4. Announcement Body & Priority (if Announcements) */}
          {resourceType === 'Announcements' && (
            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider font-mono">
                  Announcement Circular Body
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-600">Urgency:</span>
                  {(['NORMAL', 'URGENT', 'STATUTORY'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase font-mono ${
                        priority === p
                          ? p === 'URGENT'
                            ? 'bg-rose-600 text-white'
                            : p === 'STATUTORY'
                            ? 'bg-purple-600 text-white'
                            : 'bg-blue-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-600'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={announcementContent}
                onChange={(e) => setAnnouncementContent(e.target.value)}
                rows={3}
                placeholder="Enter formal announcement notice text..."
                className="w-full text-xs rounded-lg border-slate-200 py-2 px-3 bg-white font-medium focus:ring-2 focus:ring-blue-600"
              />
            </div>
          )}

          {/* 5. File / Cloud Reference URL */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
              File / Cloud Asset Reference URL {resourceType !== 'Announcements' && '*'}
            </label>
            <div className="relative">
              <Link className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="url"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/sample_asset.pdf"
                className="w-full text-xs rounded-lg border-slate-200 py-2 pl-9 pr-3 bg-white font-mono focus:ring-2 focus:ring-blue-600"
                required={resourceType !== 'Announcements'}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Provide a valid Google Drive, institutional repository, or CDN link (PDF, DOCX, PPTX).
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Publish & Distribute
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
