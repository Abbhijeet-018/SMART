import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Layers,
  FlaskConical,
  BookText
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Course, CourseType } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

export const CoursesPage: React.FC = () => {
  const { courses, addCourse, updateCourse, deleteCourse, currentPlan, faculties } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    course_code: '',
    title: '',
    course_type: 'Theory' as CourseType,
    weekly_hours: 4,
    required_specialization: '',
    required_lab_skills: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleOpenAddModal = () => {
    setEditingCourse(null);
    setFormData({
      course_code: `CS${Math.floor(510 + Math.random() * 50)}`,
      title: '',
      course_type: 'Theory',
      weekly_hours: 4,
      required_specialization: 'Artificial Intelligence',
      required_lab_skills: ''
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      course_code: course.course_code,
      title: course.title,
      course_type: course.course_type,
      weekly_hours: course.weekly_hours,
      required_specialization: course.required_specialization,
      required_lab_skills: course.required_lab_skills.join(', ')
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  const handleTypeChange = (type: CourseType) => {
    setFormData(prev => ({
      ...prev,
      course_type: type,
      weekly_hours: type === 'Lab' ? 3 : 4
    }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.course_code.trim()) errors.course_code = 'Course code is required.';
    if (!formData.title.trim()) errors.title = 'Course title is required.';
    if (!formData.required_specialization.trim()) {
      errors.required_specialization = 'Required specialization is required for qualification matching.';
    }
    if (formData.weekly_hours <= 0 || formData.weekly_hours > 12) {
      errors.weekly_hours = 'Weekly teaching hours must be between 1 and 12.';
    }
    if (formData.course_type === 'Lab' && !formData.required_lab_skills.trim()) {
      errors.required_lab_skills = 'Lab courses require at least one software/tool skill requirement.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const labSkillsArray = formData.course_type === 'Lab'
      ? formData.required_lab_skills.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const payload = {
      course_code: formData.course_code.trim(),
      title: formData.title.trim(),
      course_type: formData.course_type,
      weekly_hours: Number(formData.weekly_hours),
      required_specialization: formData.required_specialization.trim(),
      required_lab_skills: labSkillsArray
    };

    if (editingCourse) {
      const success = updateCourse(editingCourse.id, payload);
      if (success) setIsFormModalOpen(false);
    } else {
      const success = addCourse(payload);
      if (success) setIsFormModalOpen(false);
    }
  };

  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      const matchesSearch =
        c.course_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.required_specialization.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === 'all' || c.course_type === typeFilter;

      const isAssigned = currentPlan ? currentPlan.assignments.some(a => a.course_id === c.id) : false;
      const matchesAssignment =
        assignmentFilter === 'all' ||
        (assignmentFilter === 'assigned' && isAssigned) ||
        (assignmentFilter === 'unassigned' && !isAssigned);

      return matchesSearch && matchesType && matchesAssignment;
    });
  }, [courses, searchQuery, typeFilter, assignmentFilter, currentPlan]);

  const totalHours = courses.reduce((sum, c) => sum + c.weekly_hours, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Curriculum Courses</h1>
            <Badge variant="neutral" size="sm">{courses.length} Total Courses ({totalHours}h)</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Department theory and laboratory courses with teaching hours, specialization criteria, and laboratory skill constraints.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Course</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by course code, title, or specialization..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Course Types</option>
            <option value="Theory">Theory Only</option>
            <option value="Lab">Lab Only</option>
          </select>

          <select
            value={assignmentFilter}
            onChange={e => setAssignmentFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Allocation Status</option>
            <option value="assigned">Assigned</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>
      </div>

      {/* Courses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 font-semibold">Course Code</th>
                <th className="px-4 py-3.5 font-semibold">Title</th>
                <th className="px-3 py-3.5 font-semibold">Type</th>
                <th className="px-3 py-3.5 font-semibold text-center">Weekly Hours</th>
                <th className="px-3 py-3.5 font-semibold">Required Specialization</th>
                <th className="px-3 py-3.5 font-semibold">Lab Skill Requirements</th>
                <th className="px-3 py-3.5 font-semibold">Allocated Faculty</th>
                <th className="px-4 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    No curriculum courses match the specified criteria.
                  </td>
                </tr>
              ) : (
                filteredCourses.map(c => {
                  const assignment = currentPlan
                    ? currentPlan.assignments.find(a => a.course_id === c.id)
                    : null;
                  const assignedFaculty = assignment
                    ? faculties.find(f => f.id === assignment.faculty_id)
                    : null;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                        {c.course_code}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-900 max-w-xs">
                        {c.title}
                      </td>
                      <td className="px-3 py-3.5">
                        <Badge
                          variant={c.course_type === 'Theory' ? 'primary' : 'secondary'}
                          size="sm"
                        >
                          {c.course_type === 'Theory' ? (
                            <BookText className="h-3 w-3" />
                          ) : (
                            <FlaskConical className="h-3 w-3" />
                          )}
                          <span>{c.course_type}</span>
                        </Badge>
                      </td>
                      <td className="px-3 py-3.5 text-center font-mono font-bold text-slate-800">
                        {c.weekly_hours}h
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {c.required_specialization}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        {c.course_type === 'Theory' ? (
                          <span className="text-slate-400 text-[11px] italic">Not Required</span>
                        ) : c.required_lab_skills.length === 0 ? (
                          <span className="text-slate-400 text-[11px]">None specified</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {c.required_lab_skills.map(s => (
                              <span
                                key={s}
                                className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 text-[10px] font-medium border border-sky-200/50"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        {assignedFaculty ? (
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span className="font-medium text-slate-900">{assignedFaculty.full_name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(c)}
                            title="Edit Course"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingCourse(c)}
                            title="Delete Course"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Total Curriculum Hours: <strong>{totalHours} hours / week</strong></span>
          <span>Courses: {courses.filter(c => c.course_type === 'Theory').length} Theory + {courses.filter(c => c.course_type === 'Lab').length} Lab = {courses.length} Total</span>
        </div>
      </div>

      {/* Add / Edit Course Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingCourse ? `Edit Course: ${editingCourse.course_code}` : 'Add Curriculum Course'}
        subtitle="Define course teaching hours, specialization criteria, and laboratory prerequisites."
        maxWidth="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Course Code *
              </label>
              <input
                type="text"
                value={formData.course_code}
                onChange={e => setFormData({ ...formData, course_code: e.target.value })}
                placeholder="e.g. CS501"
                className={`w-full px-3 py-2 text-xs rounded-lg border ${
                  formErrors.course_code ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                } focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500`}
              />
              {formErrors.course_code && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.course_code}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Course Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Artificial Intelligence & Intelligent Systems"
                className={`w-full px-3 py-2 text-xs rounded-lg border ${
                  formErrors.title ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                } focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500`}
              />
              {formErrors.title && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.title}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Course Type *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleTypeChange('Theory')}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border transition-colors flex items-center justify-center gap-1.5 ${
                    formData.course_type === 'Theory'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <BookText className="h-3.5 w-3.5" />
                  <span>Theory</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('Lab')}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border transition-colors flex items-center justify-center gap-1.5 ${
                    formData.course_type === 'Lab'
                      ? 'bg-sky-50 border-sky-300 text-sky-700 font-semibold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FlaskConical className="h-3.5 w-3.5" />
                  <span>Lab</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Weekly Teaching Hours *
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={formData.weekly_hours}
                onChange={e => setFormData({ ...formData, weekly_hours: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-400">Theory standard: 4h; Lab standard: 3h</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Required Academic Specialization *
            </label>
            <input
              type="text"
              value={formData.required_specialization}
              onChange={e => setFormData({ ...formData, required_specialization: e.target.value })}
              placeholder="e.g. Artificial Intelligence, Database Systems, Computer Networks"
              className={`w-full px-3 py-2 text-xs rounded-lg border ${
                formErrors.required_specialization ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
              } focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500`}
            />
            {formErrors.required_specialization && (
              <p className="text-[11px] text-rose-500 mt-1">{formErrors.required_specialization}</p>
            )}
            <p className="text-[10px] text-slate-400 mt-0.5">Faculty must possess this specialization to be evaluated as Qualified(f, c).</p>
          </div>

          {formData.course_type === 'Lab' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Required Lab Skills & Tools * (comma-separated)
              </label>
              <input
                type="text"
                value={formData.required_lab_skills}
                onChange={e => setFormData({ ...formData, required_lab_skills: e.target.value })}
                placeholder="e.g. Python, PyTorch, Docker, Wireshark, SQL"
                className={`w-full px-3 py-2 text-xs rounded-lg border ${
                  formErrors.required_lab_skills ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                } focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500`}
              />
              {formErrors.required_lab_skills && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.required_lab_skills}</p>
              )}
              <p className="text-[10px] text-slate-400 mt-0.5">Lab courses require faculty to possess all specified skills.</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
            >
              {editingCourse ? 'Save Course Changes' : 'Create Course'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Course Dialog */}
      {deletingCourse && (
        <ConfirmDialog
          isOpen={Boolean(deletingCourse)}
          onClose={() => setDeletingCourse(null)}
          onConfirm={() => deleteCourse(deletingCourse.id)}
          title="Delete Course"
          message={`Are you sure you want to remove ${deletingCourse.course_code} (${deletingCourse.title}) from the department curriculum?`}
          confirmLabel="Delete Course"
          variant="danger"
        />
      )}
    </div>
  );
};
