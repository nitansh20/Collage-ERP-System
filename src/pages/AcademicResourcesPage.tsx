import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import {
  ResourceUploadItem,
  Student,
  ResourceImportAudit,
  AcademicResourceType,
} from '../../server/types/index.js';
import { ResourceDetailModal } from '../components/resources/ResourceDetailModal.js';
import { CreateResourceModal } from '../components/resources/CreateResourceModal.js';
import { BulkResourceImportWizard } from '../components/resources/BulkResourceImportWizard.js';
import {
  FileText,
  BookOpen,
  Bell,
  UploadCloud,
  Download,
  Plus,
  Search,
  Filter,
  Users,
  Eye,
  Trash2,
  Share2,
  Calendar,
  Layers,
  GraduationCap,
  Globe,
  Lock,
  History,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';

interface AcademicResourcesPageProps {
  onNavigate: (route: string) => void;
}

export const AcademicResourcesPage: React.FC<AcademicResourcesPageProps> = ({ onNavigate }) => {
  const { currentPersona, showToast } = useAuth();

  // Active Tab: 'ALL' | 'Lecture Notes' | 'Learning Materials' | 'Announcements' | 'BULK_INGEST' | 'AUDIT_HISTORY'
  const [activeTab, setActiveTab] = useState<string>('ALL');

  const [resources, setResources] = useState<ResourceUploadItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [auditLogs, setAuditLogs] = useState<ResourceImportAudit[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Perspective Simulation for testing strict academic relationship distribution
  const [studentPerspective, setStudentPerspective] = useState<string>('ADMIN'); // 'ADMIN' or studentId

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedCourse, setSelectedCourse] = useState('ALL');
  const [selectedDivision, setSelectedDivision] = useState('ALL');
  const [selectedBatch, setSelectedBatch] = useState('ALL');

  // Modals
  const [detailResource, setDetailResource] = useState<ResourceUploadItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Fetch data
  const fetchData = async () => {
    try {
      setIsLoading(true);

      const queryParams = new URLSearchParams();
      if (studentPerspective !== 'ADMIN') {
        queryParams.append('studentPerspectiveId', studentPerspective);
      }
      if (selectedDept !== 'ALL') queryParams.append('department', selectedDept);
      if (selectedCourse !== 'ALL') queryParams.append('course', selectedCourse);
      if (selectedDivision !== 'ALL') queryParams.append('division', selectedDivision);
      if (selectedBatch !== 'ALL') queryParams.append('batch', selectedBatch);

      const [resRes, stuRes, auditRes] = await Promise.allSettled([
        api.get(`/resources?${queryParams.toString()}`),
        api.get('/students'),
        api.get('/resources/audit-logs'),
      ]);

      if (resRes.status === 'fulfilled' && resRes.value.data?.success) {
        setResources(resRes.value.data.data);
      }
      if (stuRes.status === 'fulfilled' && stuRes.value.data?.success) {
        setStudents(stuRes.value.data.data);
      }
      if (auditRes.status === 'fulfilled' && auditRes.value.data?.success) {
        setAuditLogs(auditRes.value.data.data);
      }
    } catch {
      // Safely silent or handled
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [studentPerspective, selectedDept, selectedCourse, selectedDivision, selectedBatch]);

  // Handle Delete
  const handleDeleteResource = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this academic resource?')) {
      return;
    }

    try {
      const res = await api.delete(`/resources/${id}`);
      if (res.data.success) {
        showToast('success', 'Resource Deleted', 'Resource removed from statutory student repository.');
        setDetailResource(null);
        fetchData();
      }
    } catch (err: any) {
      showToast('error', 'Delete Failed', err.response?.data?.error || err.message);
    }
  };

  // KPI Calculations
  const totalCount = resources.length;
  const lectureNotesCount = resources.filter(
    (r) => r.category === 'Lecture Notes' || r.resourceType === 'Lecture Notes'
  ).length;
  const learningMaterialsCount = resources.filter(
    (r) => r.category === 'Learning Materials' || r.resourceType === 'Learning Materials'
  ).length;
  const announcementsCount = resources.filter(
    (r) => r.category === 'Announcements' || r.resourceType === 'Announcements'
  ).length;
  const totalAudienceReach = resources.reduce(
    (acc, r) => acc + (r.targetStudentsCount || (r.isGlobal ? 1240 : 64)),
    0
  );

  // Filtered by Search & Tab
  const filteredResources = resources.filter((r) => {
    // Tab filter
    if (activeTab === 'Lecture Notes' && r.category !== 'Lecture Notes' && r.resourceType !== 'Lecture Notes') {
      return false;
    }
    if (activeTab === 'Learning Materials' && r.category !== 'Learning Materials' && r.resourceType !== 'Learning Materials') {
      return false;
    }
    if (activeTab === 'Announcements' && r.category !== 'Announcements' && r.resourceType !== 'Announcements') {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        r.title.toLowerCase().includes(q) ||
        r.courseCode.toLowerCase().includes(q) ||
        (r.subject && r.subject.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        r.uploadedBy.toLowerCase().includes(q) ||
        (r.division && r.division.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  // Current active student perspective info
  const activeStudentInfo = students.find((s) => s.id === studentPerspective);

  const canManageResources =
    currentPersona?.role === 'SUPER_ADMIN' ||
    currentPersona?.role === 'DEAN_ACADEMICS' ||
    currentPersona?.role === 'HOD_CSE' ||
    currentPersona?.role === 'FAC_MEMBER';

  // Audience Scoping Inspector & Student Simulator is strictly restricted to Super Admin only
  const isSuperAdmin = currentPersona?.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        badgeText={canManageResources ? 'Academic Distribution & Syllabi' : 'Student LMS Portal'}
        badgeIcon="folder_open"
        title={canManageResources ? 'Academic Resources & Announcements Portal' : 'My Course Materials & Notes'}
        description={
          canManageResources
            ? 'Unified institutional repository for Lecture Notes, Learning Materials, and Announcements with automated department, course, division, and batch scoping.'
            : 'Access official lecture notes, laboratory problem sets, and academic announcements for your enrolled courses.'
        }
        actions={
          canManageResources ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.open('/api/resources/template?format=csv', '_blank')}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Download Template</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('BULK_INGEST');
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <UploadCloud className="w-4 h-4 text-emerald-400" />
                <span>⚡ Bulk Import (7-Stage)</span>
              </button>

              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Resource</span>
              </button>
            </div>
          ) : undefined
        }
      />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase font-mono">Total Catalog</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-2xl font-bold text-slate-900 mt-1 block font-mono">
            {totalCount}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Syllabus Assets</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600 uppercase font-mono">Lecture Notes</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-2xl font-bold text-blue-700 mt-1 block font-mono">
            {lectureNotesCount}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Slides & Transcripts</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-600 uppercase font-mono">Learning Materials</span>
            <BookOpen className="w-4 h-4 text-indigo-500" />
          </div>
          <span className="text-2xl font-bold text-indigo-700 mt-1 block font-mono">
            {learningMaterialsCount}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Labs & Problem Sets</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 uppercase font-mono">Announcements</span>
            <Bell className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-bold text-amber-700 mt-1 block font-mono">
            {announcementsCount}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Urgent Circulars</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase font-mono">Target Reach</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-2xl font-bold text-emerald-700 mt-1 block font-mono">
            ~{totalAudienceReach.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Student Enrolments</span>
        </div>
      </div>

      {/* Role-Based Distribution Inspector (Super Admin Clearance Only) */}
      {isSuperAdmin && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider font-mono text-blue-300">
                  Audience Scoping Inspector
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 font-mono">
                  Admin Only
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Verify how resources are strictly partitioned by course, division, and batch according to student enrollment.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs text-slate-400 whitespace-nowrap">Preview As:</label>
            <select
              value={studentPerspective}
              onChange={(e) => setStudentPerspective(e.target.value)}
              className="text-xs rounded-xl bg-slate-800 border-slate-700 text-white py-1.5 px-3 focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="ADMIN">👑 Full Administrative View (All Resources)</option>
              <option value="stu_001">👨‍🎓 Aarav Sharma (CSE Sem 6, Div A, Batch 2021-2025)</option>
              <option value="stu_003">👨‍🎓 Rohan Mehra (ECE Sem 4, Div A, Batch 2022-2026)</option>
              <option value="stu_004">👩‍🎓 Kavya Pillai (MECH Sem 2, Div A, Batch 2023-2027)</option>
            </select>
          </div>
        </div>
      )}

      {isSuperAdmin && studentPerspective !== 'ADMIN' && activeStudentInfo && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600" />
            <span>
              Simulating Student Portal for <strong>{activeStudentInfo.name}</strong> ({activeStudentInfo.rollNo}).
              Showing only resources matching <strong>{activeStudentInfo.program} ({activeStudentInfo.courseCode})</strong>, <strong>{activeStudentInfo.division}</strong>, <strong>{activeStudentInfo.batch}</strong>, or campus-wide announcements.
            </span>
          </div>
          <button
            onClick={() => setStudentPerspective('ADMIN')}
            className="text-xs font-bold text-blue-700 underline hover:text-blue-800 whitespace-nowrap ml-2 cursor-pointer"
          >
            Reset to Admin
          </button>
        </div>
      )}

      {/* Primary Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-1">
          {[
            { id: 'ALL', label: 'All Resources', count: totalCount },
            { id: 'Lecture Notes', label: 'Lecture Notes', count: lectureNotesCount },
            { id: 'Learning Materials', label: 'Learning Materials', count: learningMaterialsCount },
            { id: 'Announcements', label: canManageResources ? 'Announcement Management' : 'Announcements', count: announcementsCount },
            ...(canManageResources
              ? [
                  { id: 'BULK_INGEST', label: '⚡ Ingest Pipeline', count: null },
                  { id: 'AUDIT_HISTORY', label: 'Audit History', count: auditLogs.length },
                ]
              : []),
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-4 text-xs font-bold transition-all relative ${
                  isSelected
                    ? 'text-blue-600 font-extrabold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`ml-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {isSelected && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: BULK INGEST ENGINE WIZARD                          */}
      {/* ========================================================= */}
      {activeTab === 'BULK_INGEST' && (
        <div className="space-y-4">
          <BulkResourceImportWizard
            currentUser={currentPersona}
            onImportComplete={() => {
              fetchData();
              showToast('success', 'Import Completed', 'Staged items successfully published.');
            }}
            onClose={() => setActiveTab('ALL')}
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: AUDIT & INGEST HISTORY                             */}
      {/* ========================================================= */}
      {activeTab === 'AUDIT_HISTORY' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Bulk Ingestion Statutory Audit Log
              </h3>
              <p className="text-xs text-slate-500">
                Comprehensive audit trail tracking batch files, row verification rates, and distribution timestamps.
              </p>
            </div>
            <button
              onClick={fetchData}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              Refresh Log
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono text-[11px] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Batch Request ID</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Author / Role</th>
                  <th className="py-2.5 px-3">Source Workbook</th>
                  <th className="py-2.5 px-3 text-center">Total Rows</th>
                  <th className="py-2.5 px-3 text-center">Success</th>
                  <th className="py-2.5 px-3 text-center">Failed</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-blue-600">
                      {log.requestId}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-900 block">{log.userName}</span>
                      <span className="text-[10px] text-slate-400 font-mono uppercase">{log.userRole}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700 text-xs">
                      {log.fileName}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold">{log.totalRows}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-600">
                      {log.successfulRows}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-rose-600">
                      {log.failedRows}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge state={log.status} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-right">
                      {log.failedRows > 0 ? (
                        <button
                          onClick={() => window.open(`/api/resources/error-report/${log.requestId}`, '_blank')}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline inline-flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> Error CSV
                        </button>
                      ) : (
                        <span className="text-emerald-600 font-medium text-xs">Clean Batch</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: RESOURCE LIST & ANNOUNCEMENTS (STANDARD VIEWS)      */}
      {/* ========================================================= */}
      {activeTab !== 'BULK_INGEST' && activeTab !== 'AUDIT_HISTORY' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              {/* Search */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search resources, topics, course code..."
                  className="w-full text-xs rounded-xl border-slate-200 py-2 pl-9 pr-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Department */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="text-xs rounded-xl border-slate-200 py-1.5 px-2.5 bg-slate-50 font-medium"
                >
                  <option value="ALL">All Courses</option>
                  <option value="BTECH-CSE">B.Tech CSE</option>
                  <option value="BTECH-ECE">B.Tech ECE</option>
                  <option value="BTECH-MECH">B.Tech MECH</option>
                  <option value="MTECH-CPS">M.Tech CPS</option>
                </select>

                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className="text-xs rounded-xl border-slate-200 py-1.5 px-2.5 bg-slate-50 font-medium"
                >
                  <option value="ALL">All Divisions</option>
                  <option value="Division A">Division A</option>
                  <option value="Division B">Division B</option>
                </select>

                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="text-xs rounded-xl border-slate-200 py-1.5 px-2.5 bg-slate-50 font-medium"
                >
                  <option value="ALL">All Batches</option>
                  <option value="2021-2025">Batch 2021-2025</option>
                  <option value="2022-2026">Batch 2022-2026</option>
                  <option value="2023-2027">Batch 2023-2027</option>
                </select>

                {(selectedCourse !== 'ALL' || selectedDivision !== 'ALL' || selectedBatch !== 'ALL' || searchQuery) && (
                  <button
                    onClick={() => {
                      setSelectedCourse('ALL');
                      setSelectedDivision('ALL');
                      setSelectedBatch('ALL');
                      setSearchQuery('');
                    }}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Dedicated Announcement Management Card View when on Announcements Tab */}
          {activeTab === 'Announcements' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredResources.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setDetailResource(item)}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-amber-400 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded-full ${
                            item.priority === 'URGENT'
                              ? 'bg-rose-100 text-rose-700'
                              : item.priority === 'STATUTORY'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {item.priority || 'NORMAL'} NOTICE
                        </span>
                        {item.isGlobal ? (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Globe className="w-3 h-3" /> Campus Wide
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Lock className="w-3 h-3" /> {item.courseCode} ({item.division || 'ALL'})
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">{item.uploadedAt}</span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                      {item.title}
                    </h4>

                    <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                      {item.announcementContent || item.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>Audience: ~{item.targetStudentsCount || 64} students</span>
                    </div>

                    <span className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      View Notice <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Standard Resource Table View */}
          {activeTab !== 'Announcements' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono text-[11px] uppercase">
                    <tr>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Course & Module</th>
                      <th className="py-3 px-4">Title & Scope</th>
                      <th className="py-3 px-4">Target Audience Scope</th>
                      <th className="py-3 px-4">Author & Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredResources.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-800 text-sm">No resources match criteria</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Try broadening your search query or reset audience filters.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredResources.map((item) => {
                        const isAnnouncement = item.category === 'Announcements';
                        const isNotes = item.category === 'Lecture Notes';
                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                            onClick={() => setDetailResource(item)}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                    isAnnouncement
                                      ? 'bg-amber-100 text-amber-700'
                                      : isNotes
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-indigo-100 text-indigo-700'
                                  }`}
                                >
                                  {isAnnouncement ? (
                                    <Bell className="w-3.5 h-3.5" />
                                  ) : isNotes ? (
                                    <FileText className="w-3.5 h-3.5" />
                                  ) : (
                                    <BookOpen className="w-3.5 h-3.5" />
                                  )}
                                </div>
                                <span className="font-semibold text-slate-800 text-xs">
                                  {item.category}
                                </span>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-blue-600 block">
                                {item.courseCode}
                              </span>
                              <span className="text-[11px] text-slate-500 line-clamp-1">
                                {item.subject || item.courseName}
                              </span>
                            </td>

                            <td className="py-3 px-4 max-w-xs">
                              <span className="font-bold text-slate-900 block truncate group-hover:text-blue-600 transition-colors">
                                {item.title}
                              </span>
                              <span className="text-[11px] text-slate-400 block truncate">
                                {item.fileSize || 'PDF'} • {item.description}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                {item.isGlobal ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                    <Globe className="w-3 h-3" /> Campus Wide
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                    <Lock className="w-3 h-3" /> {item.division || 'ALL'} • {item.batch || 'ALL'}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                ~{item.targetStudentsCount || 64} eligible students
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <span className="text-slate-800 font-medium block">
                                {item.uploadedBy}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {item.uploadedAt}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <StatusBadge state={item.status} size="sm" />
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div
                                className="flex items-center justify-end gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => setDetailResource(item)}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="View resource details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {canManageResources && (
                                  <button
                                    onClick={() => handleDeleteResource(item.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete resource"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resource Detail Modal */}
      {detailResource && (
        <ResourceDetailModal
          resource={detailResource}
          students={students}
          onClose={() => setDetailResource(null)}
          onDelete={(id) => handleDeleteResource(id)}
        />
      )}

      {/* Create Resource Modal */}
      <CreateResourceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newRes) => {
          showToast('success', 'Resource Published', `Successfully distributed "${newRes.title}".`);
          fetchData();
        }}
      />
    </div>
  );
};
