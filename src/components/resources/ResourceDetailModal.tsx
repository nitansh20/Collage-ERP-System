import React, { useState } from 'react';
import { ResourceUploadItem, Student } from '../../../server/types/index.js';
import { StatusBadge } from '../common/StatusBadge.js';
import {
  FileText,
  BookOpen,
  Bell,
  Download,
  ExternalLink,
  Users,
  Copy,
  Check,
  X,
  Share2,
  Calendar,
  Layers,
  GraduationCap,
  ShieldCheck,
  Globe,
  Lock,
} from 'lucide-react';

interface ResourceDetailModalProps {
  resource: ResourceUploadItem | null;
  onClose: () => void;
  students?: Student[];
  onDelete?: (id: string) => void;
}

export const ResourceDetailModal: React.FC<ResourceDetailModalProps> = ({
  resource,
  onClose,
  students = [],
  onDelete,
}) => {
  const [copied, setCopied] = useState(false);
  const [showRoster, setShowRoster] = useState(false);

  if (!resource) return null;

  const isAnnouncement = resource.category === 'Announcements' || resource.resourceType === 'Announcements';
  const isLectureNote = resource.category === 'Lecture Notes' || resource.resourceType === 'Lecture Notes';

  const handleCopyLink = () => {
    const url = resource.driveUrl || resource.fileUrl || window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Find recipient students from student roster
  const matchingStudents = students.filter((s) => {
    if (resource.isGlobal) return true;

    const deptMatch =
      !resource.department ||
      resource.department === 'ALL' ||
      resource.department === 'All Departments' ||
      resource.department.toLowerCase() === s.department.toLowerCase() ||
      resource.departmentId === s.departmentId;

    const courseMatch =
      !resource.courseCode ||
      resource.courseCode === 'ALL' ||
      resource.courseCode.toUpperCase() === (s.courseCode || '').toUpperCase() ||
      (resource.course && resource.course.toLowerCase().includes(s.program.toLowerCase()));

    const divMatch =
      !resource.division ||
      resource.division === 'ALL' ||
      (s.division && resource.division.toLowerCase() === s.division.toLowerCase());

    const batchMatch =
      !resource.batch ||
      resource.batch === 'ALL' ||
      resource.batch === s.batch ||
      (s.batch && resource.batch.includes(s.batch));

    return deptMatch && courseMatch && divMatch && batchMatch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isAnnouncement
                  ? 'bg-amber-100 text-amber-700'
                  : isLectureNote
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-indigo-100 text-indigo-700'
              }`}
            >
              {isAnnouncement ? (
                <Bell className="w-5 h-5" />
              ) : isLectureNote ? (
                <FileText className="w-5 h-5" />
              ) : (
                <BookOpen className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                  {resource.resourceType || resource.category}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-semibold text-slate-600">
                  {resource.academicYear || '2025-2026'} ({resource.term || 'Spring 2026'})
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 line-clamp-1">{resource.title}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge state={resource.status} size="sm" />
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Target Distribution Card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {resource.isGlobal ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    <Globe className="w-3.5 h-3.5" /> Campus-Wide Broadcast
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    <Lock className="w-3.5 h-3.5" /> Restricted Distribution
                  </span>
                )}
                <span className="text-xs text-slate-500">
                  Targeted to ~{resource.targetStudentsCount || 64} enrolled students
                </span>
              </div>

              <button
                onClick={() => setShowRoster(!showRoster)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Users className="w-3.5 h-3.5" />
                {showRoster ? 'Hide Recipient Cohort' : 'View Recipient Cohort'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Department</span>
                <span className="font-semibold text-slate-800 block truncate" title={resource.department}>
                  {resource.department}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Course Code</span>
                <span className="font-semibold text-slate-800 font-mono">{resource.courseCode || 'BTECH-CSE'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Division</span>
                <span className="font-semibold text-slate-800 font-mono">{resource.division || 'ALL'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Batch</span>
                <span className="font-semibold text-slate-800 font-mono">{resource.batch || 'ALL'}</span>
              </div>
            </div>

            {/* Recipient Roster Drawer */}
            {showRoster && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Eligible Student Recipient Roster ({matchingStudents.length} verified enrolled)
                  </h5>
                </div>
                {matchingStudents.length > 0 ? (
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {matchingStudents.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-[10px]">
                            {s.name.charAt(0)}
                          </span>
                          <div>
                            <span className="font-semibold text-slate-900">{s.name}</span>
                            <span className="text-slate-400 ml-1.5 font-mono">({s.rollNo})</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                          <span>{s.division}</span>
                          <span>•</span>
                          <span>{s.batch}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    No individual student records directly matching this division in sample dataset.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Subject & Academic Context */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
              Course & Module
            </h4>
            <div className="flex items-center gap-2 text-sm text-slate-800 font-semibold">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>{resource.subject || resource.courseName}</span>
              {resource.subjectCode && (
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-xs">
                  {resource.subjectCode}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
              Academic Description / Syllabus Scope
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100">
              {resource.description || 'No extended syllabus scope description provided.'}
            </p>
          </div>

          {/* Announcement Body if applicable */}
          {isAnnouncement && resource.announcementContent && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5" /> Official Circular Content
                </h4>
                {resource.priority && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase font-mono ${
                      resource.priority === 'URGENT'
                        ? 'bg-rose-100 text-rose-700'
                        : resource.priority === 'STATUTORY'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {resource.priority} Notice
                  </span>
                )}
              </div>
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                {resource.announcementContent}
              </div>
            </div>
          )}

          {/* Attached File Reference Card */}
          {(resource.driveUrl || resource.fileUrl) && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                Asset File / Cloud Reference
              </h4>
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-mono font-bold text-xs">
                    {resource.fileType || 'PDF'}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 block truncate max-w-xs sm:max-w-md">
                      {resource.title}.{resource.fileType?.toLowerCase() || 'pdf'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {resource.fileSize || '3.2 MB'} • Cloud Storage Reference
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={resource.driveUrl || resource.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Access Asset
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Ingestion & Audit Metadata */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Published by: <strong className="text-slate-700">{resource.uploadedBy}</strong></span>
              <span>•</span>
              <span>{resource.uploadedAt}</span>
            </div>

            {resource.importRequestId && (
              <span className="font-mono text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                Batch: {resource.importRequestId}
              </span>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-t border-slate-100">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Link Copied!' : 'Copy Resource Link'}
          </button>

          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                onClick={() => onDelete(resource.id)}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                Delete Resource
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
