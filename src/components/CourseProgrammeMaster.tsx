import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { IGNOUProgramme, IGNOUCourse } from '../types';
import {
  GraduationCap,
  BookOpen,
  Search,
  Plus,
  Download,
  Trash2,
  Edit2,
  X,
  CheckCircle2,
  Filter,
} from 'lucide-react';

export const CourseProgrammeMaster: React.FC = () => {
  const {
    allProgrammes,
    customProgrammes,
    saveCustomProgramme,
    removeCustomProgramme,
    saveCustomCourse,
    getProgrammeCourses,
    getCourseTitle,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'courses' | 'programmes'>('courses');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgFilter, setSelectedProgFilter] = useState('ALL');

  // Add Programme Modal
  const [isAddProgModalOpen, setIsAddProgModalOpen] = useState(false);
  const [progForm, setProgForm] = useState({
    code: '',
    name: '',
    level: 'Bachelor' as 'Bachelor' | 'Master' | 'Diploma' | 'Certificate',
    department: '',
  });

  // Add Course Modal
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [courseForm, setCourseForm] = useState({
    programmeCode: 'MEG',
    code: '',
    title: '',
    credits: 4,
  });

  // Extract all courses across programmes
  const allFlattenedCourses = useMemo(() => {
    const list: Array<{ code: string; title: string; programme: string; credits: number }> = [];
    allProgrammes.forEach((prog) => {
      const courses = getProgrammeCourses(prog.code);
      courses.forEach((c) => {
        list.push({
          code: c.code,
          title: c.title || getCourseTitle(c.code, prog.code),
          programme: prog.code,
          credits: c.credits || 4,
        });
      });
    });
    return list;
  }, [allProgrammes, getProgrammeCourses, getCourseTitle]);

  // Filtered Courses
  const filteredCourses = useMemo(() => {
    return allFlattenedCourses.filter((c) => {
      if (selectedProgFilter !== 'ALL' && c.programme !== selectedProgFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allFlattenedCourses, selectedProgFilter, searchQuery]);

  // Filtered Programmes
  const filteredProgrammes = useMemo(() => {
    return allProgrammes.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allProgrammes, searchQuery]);

  // Handle Add Programme
  const handleSaveProgramme = (e: React.FormEvent) => {
    e.preventDefault();
    if (!progForm.code || !progForm.name) {
      showToast('Programme code and name are required.', 'error');
      return;
    }
    saveCustomProgramme({
      code: progForm.code.trim().toUpperCase(),
      name: progForm.name.trim(),
      level: progForm.level,
      department: progForm.department.trim(),
    });
    setIsAddProgModalOpen(false);
    setProgForm({ code: '', name: '', level: 'Bachelor', department: '' });
    showToast(`Programme ${progForm.code} saved successfully.`, 'success');
  };

  // Handle Add Course
  const handleSaveCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.code || !courseForm.programmeCode) {
      showToast('Course code and programme code are required.', 'error');
      return;
    }
    saveCustomCourse(courseForm.programmeCode, {
      code: courseForm.code.trim().toUpperCase(),
      title: courseForm.title.trim() || courseForm.code.trim().toUpperCase(),
      credits: Number(courseForm.credits) || 4,
    });
    setIsAddCourseModalOpen(false);
    setCourseForm({ programmeCode: 'MEG', code: '', title: '', credits: 4 });
    showToast(`Course ${courseForm.code} added to ${courseForm.programmeCode}.`, 'success');
  };

  // Export Courses CSV
  const handleExportCoursesCSV = () => {
    const headers = ['Course Code', 'Course Title', 'Programme', 'Credits'];
    const rows = filteredCourses.map((c) => [c.code, `"${c.title}"`, c.programme, c.credits]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `IGNOU_SC2033_COURSES_CATALOG_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Courses catalog exported to CSV.', 'success');
  };

  // Export Programmes CSV
  const handleExportProgrammesCSV = () => {
    const headers = ['Programme Code', 'Programme Name', 'Level', 'Department'];
    const rows = filteredProgrammes.map((p) => [p.code, `"${p.name}"`, p.level, `"${p.department || ''}"`]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `IGNOU_SC2033_PROGRAMMES_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Programmes exported to CSV.', 'success');
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold tracking-tight">Programme & Course Master Catalog</h2>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Manage academic programmes, curricula, and courses offered at IGNOU Study Centre 2033. Newly registered courses will automatically populate in Student Intake autocomplete and evaluation award sheets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'courses' ? (
            <button
              type="button"
              onClick={handleExportCoursesCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold rounded-lg border border-slate-700 transition shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Export Courses CSV
            </button>
          ) : (
            <button
              type="button"
              onClick={handleExportProgrammesCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold rounded-lg border border-slate-700 transition shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Export Programmes CSV
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('courses')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'courses'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            Course Catalog ({allFlattenedCourses.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('programmes')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'programmes'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-teal-600" />
            Programmes ({allProgrammes.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'courses' ? (
            <button
              type="button"
              onClick={() => setIsAddCourseModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-2xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Custom Course
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddProgModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-2xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Programme
            </button>
          )}
        </div>
      </div>

      {/* COURSES TAB */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by course code or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Filter by Programme:</span>
              <select
                value={selectedProgFilter}
                onChange={(e) => setSelectedProgFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800"
              >
                <option value="ALL">All Programmes</option>
                {allProgrammes.map((p) => (
                  <option key={p.code} value={p.code}>{p.code} - {p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto max-h-[560px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3">Course Code</th>
                    <th className="p-3">Official Course Title</th>
                    <th className="p-3">Programme</th>
                    <th className="p-3 text-center">Credits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredCourses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400">
                        No courses found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredCourses.map((c, idx) => (
                      <tr key={`${c.code}-${c.programme}-${idx}`} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono font-bold text-slate-900">{c.code}</td>
                        <td className="p-3 font-medium text-slate-800">{c.title}</td>
                        <td className="p-3 font-mono text-slate-600">{c.programme}</td>
                        <td className="p-3 text-center font-mono text-slate-700">{c.credits}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 p-2.5 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
              <span>Showing {filteredCourses.length} of {allFlattenedCourses.length} courses</span>
            </div>
          </div>
        </div>
      )}

      {/* PROGRAMMES TAB */}
      {activeTab === 'programmes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search programmes by code or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div className="text-xs text-slate-500">
              Total Programmes: <strong>{filteredProgrammes.length}</strong>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto max-h-[560px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3">Programme Code</th>
                    <th className="p-3">Full Programme Name</th>
                    <th className="p-3">Degree Level</th>
                    <th className="p-3">Department / School</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredProgrammes.map((p) => {
                    const isCustom = customProgrammes.some((cp) => cp.code === p.code);
                    return (
                      <tr key={p.code} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono font-bold text-slate-900">{p.code}</td>
                        <td className="p-3 font-semibold text-slate-800">{p.name}</td>
                        <td className="p-3 text-slate-600">{p.level}</td>
                        <td className="p-3 text-slate-600">{p.department || 'IGNOU'}</td>
                        <td className="p-3 text-right">
                          {isCustom && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Remove custom programme ${p.code}?`)) {
                                  removeCustomProgramme(p.code);
                                }
                              }}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer"
                              title="Delete Custom Programme"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ADD PROGRAMME MODAL */}
      {isAddProgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm">Add New IGNOU Programme</h3>
              <button
                type="button"
                onClick={() => setIsAddProgModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProgramme} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Programme Code *</label>
                <input
                  type="text"
                  value={progForm.code}
                  onChange={(e) => setProgForm({ ...progForm, code: e.target.value.toUpperCase() })}
                  required
                  placeholder="e.g. MSW, MBA, MCA_NEW"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Programme Title *</label>
                <input
                  type="text"
                  value={progForm.name}
                  onChange={(e) => setProgForm({ ...progForm, name: e.target.value })}
                  required
                  placeholder="e.g. Master of Social Work"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Academic Level</label>
                <select
                  value={progForm.level}
                  onChange={(e) => setProgForm({ ...progForm, level: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                >
                  <option value="Bachelor">Bachelor Degree</option>
                  <option value="Master">Master Degree</option>
                  <option value="Diploma">Post Graduate / Diploma</option>
                  <option value="Certificate">Certificate</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">School / Division</label>
                <input
                  type="text"
                  value={progForm.department}
                  onChange={(e) => setProgForm({ ...progForm, department: e.target.value })}
                  placeholder="e.g. School of Humanities"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddProgModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-md font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-semibold cursor-pointer"
                >
                  Save Programme
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD COURSE MODAL */}
      {isAddCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm">Add New Course to Catalog</h3>
              <button
                type="button"
                onClick={() => setIsAddCourseModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Associated Programme *</label>
                <select
                  value={courseForm.programmeCode}
                  onChange={(e) => setCourseForm({ ...courseForm, programmeCode: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                >
                  {allProgrammes.map((p) => (
                    <option key={p.code} value={p.code}>{p.code} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Course Code *</label>
                <input
                  type="text"
                  value={courseForm.code}
                  onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value.toUpperCase() })}
                  required
                  placeholder="e.g. MEG-14, MCS-211"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Course Title</label>
                <input
                  type="text"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  placeholder="e.g. Contemporary Indian Literature in Translation"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Credits</label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={courseForm.credits}
                  onChange={(e) => setCourseForm({ ...courseForm, credits: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddCourseModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-md font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-semibold cursor-pointer"
                >
                  Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
