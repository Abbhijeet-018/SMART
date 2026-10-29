import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Faculty, Designation, AvailabilityStatus } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

export const FacultyPage: React.FC = () => {
  const { faculties, addFaculty, updateFaculty, deleteFaculty, currentPlan, courses, settings } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [designationFilter, setDesignationFilter] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [detailFaculty, setDetailFaculty] = useState<Faculty | null>(null);
  const [deletingFaculty, setDeletingFaculty] = useState<Faculty | null>(null);

  // Form Fields State
  const [formData, setFormData] = useState({
    faculty_code: '',
    full_name: '',
    designation: 'Assistant Professor' as Designation,
    specializations: '',
    lab_skills: '',
    max_weekly_hours: 16,
    availability: 'Available' as AvailabilityStatus,
    notes: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleOpenAddModal = () => {
    setEditingFaculty(null);
    setFormData({
      faculty_code: `FAC-${Math.floor(100 + Math.random() * 900)}`,
      full_name: '',
      designation: 'Assistant Professor',
      specializations: '',
      lab_skills: '',
      max_weekly_hours: settings.designation_caps['Assistant Professor'] || 16,
      availability: 'Available',
      notes: ''
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (faculty: Faculty) => {
    setEditingFaculty(faculty);
    setFormData({
      faculty_code: faculty.faculty_code,
      full_name: faculty.full_name,
      designation: faculty.designation,
      specializations: faculty.specializations.join(', '),
      lab_skills: faculty.lab_skills.join(', '),
      max_weekly_hours: faculty.max_weekly_hours,
      availability: faculty.availability,
      notes: faculty.notes || ''
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  const handleDesignationChange = (newDesignation: Designation) => {
    // Automatically suggest default cap based on designation if user hasn't overridden
    const defaultCap = settings.designation_caps[newDesignation] || 14;
    setFormData(prev => ({
      ...prev,
      designation: newDesignation,
      max_weekly_hours: defaultCap
    }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.full_name.trim()) errors.full_name = 'Full name is required.';
    if (!formData.faculty_code.trim()) errors.faculty_code = 'Faculty ID / Code is required.';
    if (formData.max_weekly_hours <= 0 || formData.max_weekly_hours > 30) {
      errors.max_weekly_hours = 'Weekly hours cap must be between 1 and 30 hours.';
    }
    if (!formData.specializations.trim()) {
      errors.specializations = 'At least one specialization is required.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const specsArray = formData.specializations
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const labSkillsArray = formData.lab_skills
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const payload = {
      faculty_code: formData.faculty_code.trim(),
      full_name: formData.full_name.trim(),
      designation: formData.designation,
      specializations: specsArray,
      lab_skills: labSkillsArray,
      max_weekly_hours: Number(formData.max_weekly_hours),
      availability: formData.availability,
      notes: formData.notes.trim()
    };

    if (editingFaculty) {
      const success = updateFaculty(editingFaculty.id, payload);
      if (success) setIsFormModalOpen(false);
    } else {
      const success = addFaculty(payload);
      if (success) setIsFormModalOpen(false);
    }
  };

  // Filtered and sorted faculty list
  const filteredFaculty = useMemo(() => {
    return faculties.filter(f => {
      const matchesSearch =
        f.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.faculty_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.specializations.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDesignation =
        designationFilter === 'all' || f.designation === designationFilter;

      const matchesAvailability =
        availabilityFilter === 'all' || f.availability === availabilityFilter;

      return matchesSearch && matchesDesignation && matchesAvailability;
    });
  }, [faculties, searchQuery, designationFilter, availabilityFilter]);

  // Compute workload for each faculty
  const getFacultyAssignedCourses = (facultyId: string) => {
    if (!currentPlan) return [];
    return currentPlan.assignments
      .filter(a => a.faculty_id === facultyId)
      .map(a => {
        const course = courses.find(c => c.id === a.course_id);
        return {
          ...a,
          course_code: course?.course_code || 'CRS',
          title: course?.title || 'Unknown Course',
          course_type: course?.course_type || 'Theory',
          weekly_hours: course?.weekly_hours || a.weekly_hours
        };
      });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Faculty Directory</h1>
            <Badge variant="neutral" size="sm">{faculties.length} Members</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage department faculty profiles, research specializations, laboratory proficiencies, and weekly hour caps.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Faculty Member</span>
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
            placeholder="Search by faculty name, ID, or specialization..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={designationFilter}
            onChange={e => setDesignationFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Designations</option>
            <option value="Professor">Professor</option>
            <option value="Associate Professor">Associate Professor</option>
            <option value="Assistant Professor">Assistant Professor</option>
          </select>

          <select
            value={availabilityFilter}
            onChange={e => setAvailabilityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Availability</option>
            <option value="Available">Available</option>
            <option value="On Leave">On Leave</option>
            <option value="Sabbatical">Sabbatical</option>
          </select>
        </div>
      </div>

      {/* Faculty Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 font-semibold">Faculty Member</th>
                <th className="px-3 py-3.5 font-semibold">Designation</th>
                <th className="px-3 py-3.5 font-semibold">Specializations</th>
                <th className="px-3 py-3.5 font-semibold">Lab Skills</th>
                <th className="px-3 py-3.5 font-semibold text-center">Workload</th>
                <th className="px-3 py-3.5 font-semibold">Availability</th>
                <th className="px-4 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredFaculty.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No faculty members match the current search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredFaculty.map(f => {
                  const assigned = currentPlan
                    ? currentPlan.assignments
                        .filter(a => a.faculty_id === f.id)
                        .reduce((sum, a) => sum + a.weekly_hours, 0)
                    : 0;
                  const isOverCap = assigned > f.max_weekly_hours;
                  const utilization = f.max_weekly_hours > 0 ? (assigned / f.max_weekly_hours) * 100 : 0;

                  return (
                    <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{f.full_name}</div>
                        <div className="text-[11px] font-mono text-slate-400">{f.faculty_code}</div>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="text-slate-600 font-medium">{f.designation}</span>
                      </td>
                      <td className="px-3 py-3.5 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {f.specializations.map(spec => (
                            <span
                              key={spec}
                              className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200/60"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {f.lab_skills.length === 0 ? (
                            <span className="text-slate-400 italic text-[11px]">No lab skills</span>
                          ) : (
                            f.lab_skills.map(skill => (
                              <span
                                key={skill}
                                className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 text-[10px] font-medium border border-sky-200/50"
                              >
                                {skill}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <div className="font-mono font-semibold text-slate-800">
                          {assigned}h <span className="text-slate-400 font-normal">/ {f.max_weekly_hours}h</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {utilization.toFixed(0)}% used
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <Badge
                          variant={
                            f.availability === 'Available'
                              ? 'success'
                              : f.availability === 'On Leave'
                              ? 'danger'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {f.availability}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDetailFaculty(f)}
                            title="View Faculty Assignments"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(f)}
                            title="Edit Profile"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingFaculty(f)}
                            title="Delete Faculty"
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
          <span>Showing {filteredFaculty.length} of {faculties.length} faculty members</span>
          <span className="italic">Note: Max teaching hour caps are sample project defaults (Professor 14h, Associate 14h, Assistant 16h), not official university statutes.</span>
        </div>
      </div>

      {/* Add / Edit Faculty Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingFaculty ? `Edit Faculty: ${editingFaculty.full_name}` : 'Add New Faculty Member'}
        subtitle="Configure academic qualifications, lab technical competencies, and weekly teaching caps."
        maxWidth="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Faculty Code / Employee ID *
              </label>
              <input
                type="text"
                value={formData.faculty_code}
                onChange={e => setFormData({ ...formData, faculty_code: e.target.value })}
                placeholder="e.g. FAC-AI-01"
                className={`w-full px-3 py-2 text-xs rounded-lg border ${
                  formErrors.faculty_code ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                } focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500`}
              />
              {formErrors.faculty_code && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.faculty_code}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name with Title *
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="e.g. Dr. Rajesh Sharma"
                className={`w-full px-3 py-2 text-xs rounded-lg border ${
                  formErrors.full_name ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                } focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500`}
              />
              {formErrors.full_name && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.full_name}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Designation *
              </label>
              <select
                value={formData.designation}
                onChange={e => handleDesignationChange(e.target.value as Designation)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="Professor">Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Assistant Professor">Assistant Professor</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Max Weekly Hours Cap *
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={formData.max_weekly_hours}
                onChange={e => setFormData({ ...formData, max_weekly_hours: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-400">Default for {formData.designation}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Availability Status *
              </label>
              <select
                value={formData.availability}
                onChange={e => setFormData({ ...formData, availability: e.target.value as AvailabilityStatus })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="Available">Available</option>
                <option value="On Leave">On Leave</option>
                <option value="Sabbatical">Sabbatical</option>
                <option value="Part-Time Available">Part-Time Available</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Academic Specializations * (comma-separated)
            </label>
            <input
              type="text"
              value={formData.specializations}
              onChange={e => setFormData({ ...formData, specializations: e.target.value })}
              placeholder="e.g. Artificial Intelligence, Machine Learning, Deep Learning"
              className={`w-full px-3 py-2 text-xs rounded-lg border ${
                formErrors.specializations ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
              } focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500`}
            />
            {formErrors.specializations && (
              <p className="text-[11px] text-rose-500 mt-1">{formErrors.specializations}</p>
            )}
            <p className="text-[10px] text-slate-400 mt-0.5">Used by CSP rule engine to match course discipline requirements.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lab Skills & Technical Proficiencies (comma-separated)
            </label>
            <input
              type="text"
              value={formData.lab_skills}
              onChange={e => setFormData({ ...formData, lab_skills: e.target.value })}
              placeholder="e.g. Python, PyTorch, Docker, Wireshark, SQL"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">Mandatory for laboratory course eligibility matching.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Faculty Profile Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional research interests, lab in-charge roles, or department notes..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

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
              {editingFaculty ? 'Save Faculty Changes' : 'Create Faculty Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Faculty Detail Drawer Modal */}
      {detailFaculty && (
        <Modal
          isOpen={Boolean(detailFaculty)}
          onClose={() => setDetailFaculty(null)}
          title={`Faculty Details: ${detailFaculty.full_name}`}
          subtitle={`${detailFaculty.designation} (${detailFaculty.faculty_code})`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-400 block">Weekly Teaching Cap:</span>
                <span className="font-semibold text-slate-900">{detailFaculty.max_weekly_hours} hours / week</span>
              </div>
              <div>
                <span className="text-slate-400 block">Availability:</span>
                <Badge variant={detailFaculty.availability === 'Available' ? 'success' : 'danger'} size="sm">
                  {detailFaculty.availability}
                </Badge>
              </div>
            </div>

            <div>
              <span className="text-slate-500 font-semibold block mb-1">Specializations:</span>
              <div className="flex flex-wrap gap-1">
                {detailFaculty.specializations.map(s => (
                  <span key={s} className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-slate-500 font-semibold block mb-1">Lab Competencies:</span>
              <div className="flex flex-wrap gap-1">
                {detailFaculty.lab_skills.map(s => (
                  <span key={s} className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <h4 className="font-semibold text-slate-900 mb-2">
                Currently Assigned Courses in Active Plan:
              </h4>
              {getFacultyAssignedCourses(detailFaculty.id).length === 0 ? (
                <p className="text-slate-400 italic">No courses currently assigned to this faculty member.</p>
              ) : (
                <div className="space-y-2">
                  {getFacultyAssignedCourses(detailFaculty.id).map(c => (
                    <div
                      key={c.course_id}
                      className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-slate-900">
                          {c.course_code}: {c.title}
                        </div>
                        <div className="text-[11px] text-slate-500">{c.course_type} course</div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-indigo-600">{c.weekly_hours} hrs/wk</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingFaculty && (
        <ConfirmDialog
          isOpen={Boolean(deletingFaculty)}
          onClose={() => setDeletingFaculty(null)}
          onConfirm={() => deleteFaculty(deletingFaculty.id)}
          title="Delete Faculty Profile"
          message={`Are you sure you want to remove ${deletingFaculty.full_name} (${deletingFaculty.faculty_code}) from the department directory? This will remove all associated profile records.`}
          confirmLabel="Delete Faculty"
          variant="danger"
        />
      )}
    </div>
  );
};
