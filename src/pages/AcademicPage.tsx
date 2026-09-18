import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader.js';
import { DataTable, Column } from '../components/common/DataTable.js';
import { Modal } from '../components/common/Modal.js';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { CourseStructure, CourseModule, ArrearCurriculumDetails } from '../../server/types/index.js';

export const AcademicPage: React.FC = () => {
  const { currentPersona, showToast } = useAuth();
  const [courses, setCourses] = useState<CourseStructure[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseStructure | null>(null);

  // Edit Course Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseStructure | null>(null);
  const [activeEditTab, setActiveEditTab] = useState<'syllabus' | 'arrears'>('syllabus');
  const [isSaving, setIsSaving] = useState(false);

  // Form states for Course & Syllabus
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSyllabusOutline, setFormSyllabusOutline] = useState('');
  const [formCredits, setFormCredits] = useState(4);
  const [formLectureHours, setFormLectureHours] = useState(3);
  const [formTutorialHours, setFormTutorialHours] = useState(1);
  const [formPracticalHours, setFormPracticalHours] = useState(2);
  const [formFaculty, setFormFaculty] = useState('');
  const [formModules, setFormModules] = useState<CourseModule[]>([]);

  // Form states for Arrear Details
  const [formArrearEligibility, setFormArrearEligibility] = useState('');
  const [formArrearFormat, setFormArrearFormat] = useState('');
  const [formArrearThreshold, setFormArrearThreshold] = useState(40);
  const [formArrearSchedule, setFormArrearSchedule] = useState('');
  const [formArrearFocusTopics, setFormArrearFocusTopics] = useState('');
  const [formArrearCoordinator, setFormArrearCoordinator] = useState('');
  const [formArrearRegistered, setFormArrearRegistered] = useState(0);
  const [formArrearNotes, setFormArrearNotes] = useState('');

  const isFacultyOrAdmin =
    currentPersona?.role === 'FAC_MEMBER' ||
    currentPersona?.role === 'HOD_CSE' ||
    currentPersona?.role === 'SUPER_ADMIN' ||
    currentPersona?.role === 'DEAN_ACADEMICS';

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/academic/courses');
      if (res.data.success) {
        setCourses(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleOpenEditModal = (course: CourseStructure, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingCourse(course);
    setFormTitle(course.title);
    setFormDescription(course.description || '');
    setFormSyllabusOutline(course.syllabusOutline || '');
    setFormCredits(course.credits);
    setFormLectureHours(course.lectureHours || 3);
    setFormTutorialHours(course.tutorialHours || 1);
    setFormPracticalHours(course.practicalHours || 2);
    setFormFaculty(course.leadFaculty || course.facultyInCharge || '');
    setFormModules(
      course.modules && course.modules.length > 0
        ? JSON.parse(JSON.stringify(course.modules))
        : [
            {
              title: 'Module 1: Foundations & Architecture',
              hours: 12,
              topics: ['Basic Principles', 'Core Axioms', 'System Overview'],
            },
          ]
    );

    // Arrear Details
    const arr: Partial<ArrearCurriculumDetails> = course.arrearDetails || {};
    setFormArrearEligibility(arr.arrearEligibilityCriteria || 'Candidate must have completed continuous internal assessments.');
    setFormArrearFormat(arr.arrearExamFormat || 'Special Re-Sit Examination (80 Theory + 20 Viva)');
    setFormArrearThreshold(arr.arrearPassingThreshold ?? 40);
    setFormArrearSchedule(arr.specialRemedialSchedule || 'Every Saturday 02:00 PM – 04:00 PM (Lab 4)');
    setFormArrearFocusTopics((arr.arrearFocusTopics || ['Core Fundamentals', 'Practical Applications']).join(', '));
    setFormArrearCoordinator(arr.facultyCoordinator || course.leadFaculty || course.facultyInCharge || '');
    setFormArrearRegistered(arr.registeredArrearCandidates ?? 0);
    setFormArrearNotes(arr.notes || 'Mandatory remedial attendance required before hall ticket issuance.');

    setActiveEditTab('syllabus');
    setIsEditModalOpen(true);
  };

  // Add a module in edit mode
  const handleAddModule = () => {
    setFormModules((prev) => [
      ...prev,
      {
        title: `Module ${prev.length + 1}: Advanced Topics`,
        hours: 12,
        topics: ['Topic 1', 'Topic 2'],
      },
    ]);
  };

  // Remove a module
  const handleRemoveModule = (index: number) => {
    setFormModules((prev) => prev.filter((_, i) => i !== index));
  };

  // Update a module
  const handleUpdateModule = (index: number, field: 'title' | 'hours' | 'topicsStr', value: any) => {
    setFormModules((prev) => {
      const updated = [...prev];
      if (field === 'topicsStr') {
        updated[index] = {
          ...updated[index],
          topics: value
            .split(',')
            .map((t: string) => t.trim())
            .filter((t: string) => t.length > 0),
        };
      } else {
        updated[index] = {
          ...updated[index],
          [field]: field === 'hours' ? Number(value) || 0 : value,
        };
      }
      return updated;
    });
  };

  // Save changes to course and arrear details
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;

    try {
      setIsSaving(true);

      const parsedArrearTopics = formArrearFocusTopics
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const updatedPayload: Partial<CourseStructure> = {
        title: formTitle,
        description: formDescription,
        syllabusOutline: formSyllabusOutline,
        credits: Number(formCredits) || 4,
        lectureHours: Number(formLectureHours) || 3,
        tutorialHours: Number(formTutorialHours) || 1,
        practicalHours: Number(formPracticalHours) || 2,
        leadFaculty: formFaculty,
        facultyInCharge: formFaculty,
        modules: formModules,
        arrearDetails: {
          arrearEligibilityCriteria: formArrearEligibility,
          arrearExamFormat: formArrearFormat,
          arrearPassingThreshold: Number(formArrearThreshold) || 40,
          specialRemedialSchedule: formArrearSchedule,
          arrearFocusTopics: parsedArrearTopics,
          facultyCoordinator: formArrearCoordinator,
          registeredArrearCandidates: Number(formArrearRegistered) || 0,
          notes: formArrearNotes,
        },
      };

      const res = await api.put(`/academic/courses/${editingCourse.id}`, updatedPayload);
      if (res.data.success) {
        showToast(
          'success',
          'Curriculum & Arrear Details Updated',
          `Successfully saved updated syllabus and arrear guidelines for ${editingCourse.code}.`
        );
        setIsEditModalOpen(false);
        // Refresh local course list
        fetchCourses();
        if (selectedCourse?.id === editingCourse.id) {
          setSelectedCourse(res.data.data);
        }
      }
    } catch (err: any) {
      showToast('error', 'Update Failed', err.response?.data?.error || 'Unable to update course syllabus.');
    } finally {
      setIsSaving(false);
    }
  };

  const columns: Column<CourseStructure>[] = [
    {
      header: 'Course Code',
      accessor: (c) => <span className="font-mono font-bold text-blue-600">{c.code}</span>,
    },
    {
      header: 'Course Title & Credits',
      accessor: (c) => (
        <div>
          <span className="font-bold text-slate-900 block leading-tight">{c.title}</span>
          <span className="text-[11px] text-slate-500 font-mono">
            {c.credits} Credits • Sem {c.semester} • {c.totalHours || (c.lectureHours + c.tutorialHours + c.practicalHours)} Statutory Hours
          </span>
        </div>
      ),
    },
    {
      header: 'Department',
      accessor: (c) => <span className="text-slate-700 font-medium">{c.department}</span>,
    },
    {
      header: 'Lead Instructor',
      accessor: (c) => <span className="font-mono text-slate-800">{c.leadFaculty || c.facultyInCharge || 'Faculty Lead'}</span>,
    },
    {
      header: 'Curriculum & Arrear Status',
      align: 'center',
      accessor: (c) => (
        <div className="flex flex-col items-center gap-1">
          <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {(c.modules || []).length} Modules
          </span>
          {c.arrearDetails ? (
            <span className="font-mono text-[10px] px-2 py-0.2 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {c.arrearDetails.registeredArrearCandidates ?? 0} Arrear Candidates
            </span>
          ) : (
            <span className="font-mono text-[10px] text-slate-400">Standard</span>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      accessor: (c) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setSelectedCourse(c)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
          >
            View Details
          </button>
          {isFacultyOrAdmin && (
            <button
              onClick={(e) => handleOpenEditModal(c, e)}
              className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">edit</span>
              <span>Edit Syllabus & Arrears</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Academic Senate"
        badgeIcon="menu_book"
        title="Curriculum & Course Structure"
        description="Statutory UGC/AICTE syllabus frameworks, modular unit breakdowns, course credits, and faculty arrear remedial guidelines across university departments."
      />

      <DataTable
        columns={columns}
        data={courses}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        onRowClick={(c) => setSelectedCourse(c)}
      />

      {/* VIEW SYLLABUS & ARREAR DETAILS MODAL */}
      <Modal
        isOpen={!!selectedCourse}
        onClose={() => setSelectedCourse(null)}
        title={selectedCourse ? `${selectedCourse.code} — ${selectedCourse.title}` : 'Course Details'}
        subtitle={
          selectedCourse
            ? `Lead: ${selectedCourse.leadFaculty || selectedCourse.facultyInCharge} • ${selectedCourse.credits} Credits • Sem ${selectedCourse.semester}`
            : ''
        }
        maxWidth="lg"
      >
        {selectedCourse && (
          <div className="space-y-5">
            {/* Overview & Action Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {selectedCourse.description || selectedCourse.syllabusOutline}
              </p>

              {isFacultyOrAdmin && (
                <button
                  onClick={() => {
                    const current = selectedCourse;
                    setSelectedCourse(null);
                    handleOpenEditModal(current);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto shadow-2xs transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  <span>Edit Curriculum & Arrears</span>
                </button>
              )}
            </div>

            {/* Teaching Scheme Summary */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">Lectures</span>
                <span className="text-sm font-bold text-slate-800 font-mono mt-0.5 block">{selectedCourse.lectureHours || 3} Hrs/Wk</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">Tutorials</span>
                <span className="text-sm font-bold text-slate-800 font-mono mt-0.5 block">{selectedCourse.tutorialHours || 1} Hrs/Wk</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">Practicals</span>
                <span className="text-sm font-bold text-slate-800 font-mono mt-0.5 block">{selectedCourse.practicalHours || 2} Hrs/Wk</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">Total Credits</span>
                <span className="text-sm font-bold text-blue-600 font-mono mt-0.5 block">{selectedCourse.credits} Credits</span>
              </div>
            </div>

            {/* Accredited Syllabus Modules */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-blue-600">view_module</span>
                  <span>Accredited Syllabus Modules ({(selectedCourse.modules || []).length})</span>
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Total: {(selectedCourse.modules || []).reduce((acc, m) => acc + (m.hours || 0), 0)} Lecture Hours
                </span>
              </div>

              <div className="space-y-2.5">
                {(selectedCourse.modules || []).map((m, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                      <span className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-mono text-[11px]">
                          {idx + 1}
                        </span>
                        <span>{m.title}</span>
                      </span>
                      <span className="font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {m.hours} Hours
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-6">
                      {m.topics.map((t, tIdx) => (
                        <span
                          key={tIdx}
                          className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ARREAR & REMEDIAL GUIDELINES SECTION */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-amber-700 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">school</span>
                  <span>Arrear & Backlog Course Clearance Framework</span>
                </span>
                <span className="text-[11px] font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  Passing Threshold: {selectedCourse.arrearDetails?.arrearPassingThreshold ?? 40}%
                </span>
              </div>

              {selectedCourse.arrearDetails ? (
                <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200 space-y-3 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] font-bold font-mono text-amber-800 uppercase block">
                        Eligibility Criteria for Arrear Examination
                      </span>
                      <p className="text-slate-700 mt-0.5 font-medium leading-relaxed">
                        {selectedCourse.arrearDetails.arrearEligibilityCriteria || 'Continuous evaluation requirements met.'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold font-mono text-amber-800 uppercase block">
                        Re-Sit Exam Format & Evaluation
                      </span>
                      <p className="text-slate-700 mt-0.5 font-medium leading-relaxed">
                        {selectedCourse.arrearDetails.arrearExamFormat || 'Theory + Practical Evaluation'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-amber-200/60">
                    <div>
                      <span className="text-[10px] font-bold font-mono text-amber-800 uppercase block">
                        Remedial Clinic & Consultation Schedule
                      </span>
                      <p className="text-slate-700 mt-0.5 font-medium">
                        {selectedCourse.arrearDetails.specialRemedialSchedule || 'Scheduled prior to arrear test.'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold font-mono text-amber-800 uppercase block">
                        Remedial Faculty Coordinator & Backlog Count
                      </span>
                      <p className="text-slate-700 mt-0.5 font-medium">
                        {selectedCourse.arrearDetails.facultyCoordinator || selectedCourse.leadFaculty} •{' '}
                        <strong>{selectedCourse.arrearDetails.registeredArrearCandidates ?? 0} registered candidates</strong>
                      </p>
                    </div>
                  </div>

                  {selectedCourse.arrearDetails.arrearFocusTopics && selectedCourse.arrearDetails.arrearFocusTopics.length > 0 && (
                    <div className="pt-2 border-t border-amber-200/60">
                      <span className="text-[10px] font-bold font-mono text-amber-800 uppercase block mb-1">
                        High-Yield Focus Topics for Backlog Clearance
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {selectedCourse.arrearDetails.arrearFocusTopics.map((topic, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-amber-300 text-amber-900 font-semibold"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCourse.arrearDetails.notes && (
                    <div className="p-2.5 bg-white rounded-xl border border-amber-200 text-slate-600 text-[11px] leading-relaxed">
                      <strong>Department Note:</strong> {selectedCourse.arrearDetails.notes}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs italic text-center">
                  Standard university examination regulations apply. Faculty can configure special remedial guidelines and arrear passing criteria using the Edit button.
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* EDIT CURRICULUM & ARREAR DETAILS MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingCourse ? `Update Syllabus & Arrear Details: ${editingCourse.code}` : 'Edit Course'}
        subtitle="Faculty can modify lecture syllabus modules, accredited hours, and arrear re-sit guidelines."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveCourse} className="space-y-4">
          {/* Tabs for Course Edit */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setActiveEditTab('syllabus')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeEditTab === 'syllabus'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">menu_book</span>
              <span>Curriculum & Syllabus Modules</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveEditTab('arrears')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeEditTab === 'arrears'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">school</span>
              <span>Arrear Details & Remedial Schedule</span>
            </button>
          </div>

          {/* TAB 1: CURRICULUM & SYLLABUS EDIT */}
          {activeEditTab === 'syllabus' && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Course Title</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lead Instructor</label>
                  <input
                    type="text"
                    required
                    value={formFaculty}
                    onChange={(e) => setFormFaculty(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Course Overview / Description</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full text-xs font-normal p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Credits</label>
                  <input
                    type="number"
                    value={formCredits}
                    onChange={(e) => setFormCredits(Number(e.target.value))}
                    className="w-full text-xs font-mono px-3 py-1.5 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Lecture Hrs/Wk</label>
                  <input
                    type="number"
                    value={formLectureHours}
                    onChange={(e) => setFormLectureHours(Number(e.target.value))}
                    className="w-full text-xs font-mono px-3 py-1.5 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Tutorial Hrs/Wk</label>
                  <input
                    type="number"
                    value={formTutorialHours}
                    onChange={(e) => setFormTutorialHours(Number(e.target.value))}
                    className="w-full text-xs font-mono px-3 py-1.5 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Practical Hrs/Wk</label>
                  <input
                    type="number"
                    value={formPracticalHours}
                    onChange={(e) => setFormPracticalHours(Number(e.target.value))}
                    className="w-full text-xs font-mono px-3 py-1.5 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              {/* Dynamic Modules List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-600 font-mono">
                    Syllabus Modules Breakdown ({formModules.length} Modules)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddModule}
                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    <span>Add Module</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {formModules.map((m, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={m.title}
                          onChange={(e) => handleUpdateModule(idx, 'title', e.target.value)}
                          placeholder="Module Title"
                          className="w-full text-xs font-bold px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={m.hours}
                            onChange={(e) => handleUpdateModule(idx, 'hours', e.target.value)}
                            className="w-16 text-xs font-mono text-center px-1.5 py-1.5 bg-white rounded-lg border border-slate-300"
                            title="Lecture Hours"
                          />
                          <span className="text-[11px] text-slate-500 font-mono">Hrs</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveModule(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                            title="Delete Module"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                          Topics (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={m.topics.join(', ')}
                          onChange={(e) => handleUpdateModule(idx, 'topicsStr', e.target.value)}
                          placeholder="e.g. Lamport Timestamps, Vector Clocks, Byzantine Agreement"
                          className="w-full text-xs font-medium px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 mt-0.5"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ARREAR DETAILS EDIT */}
          {activeEditTab === 'arrears' && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-xs">
                <strong>Faculty Arrear Management Portal:</strong> Configure eligibility criteria, passing thresholds, remedial schedules, and special exam formats for students with pending backlogs in this course.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Arrear Passing Threshold (%)</label>
                  <input
                    type="number"
                    min={35}
                    max={100}
                    required
                    value={formArrearThreshold}
                    onChange={(e) => setFormArrearThreshold(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Standard statutory minimum: 40%</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Registered Arrear Candidates</label>
                  <input
                    type="number"
                    min={0}
                    value={formArrearRegistered}
                    onChange={(e) => setFormArrearRegistered(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Arrear Eligibility Criteria</label>
                <input
                  type="text"
                  required
                  value={formArrearEligibility}
                  onChange={(e) => setFormArrearEligibility(e.target.value)}
                  placeholder="e.g. Candidate must have minimum 30% internal evaluation and attended remedial clinics."
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Re-Sit Examination Format</label>
                <input
                  type="text"
                  required
                  value={formArrearFormat}
                  onChange={(e) => setFormArrearFormat(e.target.value)}
                  placeholder="e.g. Special Re-Sit Written Paper (70 Marks) + Practical Viva Voce (30 Marks)"
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Special Remedial Schedule</label>
                  <input
                    type="text"
                    value={formArrearSchedule}
                    onChange={(e) => setFormArrearSchedule(e.target.value)}
                    placeholder="e.g. Every Saturday 02:00 PM – 04:00 PM (Lab 4)"
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Remedial Faculty Coordinator</label>
                  <input
                    type="text"
                    value={formArrearCoordinator}
                    onChange={(e) => setFormArrearCoordinator(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Nair"
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  High-Yield Focus Topics for Arrear Candidates (comma-separated)
                </label>
                <input
                  type="text"
                  value={formArrearFocusTopics}
                  onChange={(e) => setFormArrearFocusTopics(e.target.value)}
                  placeholder="e.g. Raft State Transitions, Vector Clocks, Consistent Hashing"
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department Notes & Guidelines</label>
                <textarea
                  rows={2}
                  value={formArrearNotes}
                  onChange={(e) => setFormArrearNotes(e.target.value)}
                  placeholder="Special instructions or deadlines for students appearing in this arrear..."
                  className="w-full text-xs font-normal p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-mono">
              Course Code: {editingCourse?.code} • Department: {editingCourse?.department}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">save</span>
                <span>{isSaving ? 'Saving Changes...' : 'Save Syllabus & Arrear Details'}</span>
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
