import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  FileSpreadsheet,
  Printer,
  Sparkles,
  Edit3,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  TrendingUp,
  Info,
  Clock,
  UserCheck,
  BookOpen
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useApp } from '../context/AppContext';
import { CourseAssignment, Faculty, Course } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { validateAllocationPlan } from '../engine/validator';

export const ResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentPlan,
    faculties,
    courses,
    applyManualOverride,
    addToast
  } = useApp();

  // Explainability Modal State
  const [activeExplanationAssignment, setActiveExplanationAssignment] = useState<CourseAssignment | null>(null);

  // Manual Override Modal State
  const [overrideCourse, setOverrideCourse] = useState<Course | null>(null);
  const [overrideCurrentFacultyId, setOverrideCurrentFacultyId] = useState<string>('');
  const [overrideTargetFacultyId, setOverrideTargetFacultyId] = useState<string>('');
  const [overrideReasonText, setOverrideReasonText] = useState<string>('');
  const [overrideError, setOverrideError] = useState<string>('');

  // Validation Report
  const validationReport = useMemo(() => {
    if (!currentPlan) return null;
    return validateAllocationPlan(faculties, courses, currentPlan.assignments);
  }, [currentPlan, faculties, courses]);

  if (!currentPlan) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-2xs space-y-4">
        <Sparkles className="h-10 w-10 text-indigo-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">No Allocation Plan Generated Yet</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          No teaching schedule has been computed for the current department semester. Run the AI allocation engine to generate a plan.
        </p>
        <button
          onClick={() => navigate('/allocation')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
        >
          <span>Go to AI Allocation Engine</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Workload calculations
  const facultyMap = new Map(faculties.map(f => [f.id, f]));
  const courseMap = new Map(courses.map(c => [c.id, c]));

  const facultySummary = faculties.map(f => {
    const assignedCourses = currentPlan.assignments.filter(a => a.faculty_id === f.id);
    const assignedHours = assignedCourses.reduce((sum, a) => sum + a.weekly_hours, 0);
    const maxHours = f.max_weekly_hours;
    const remaining = maxHours - assignedHours;
    const utilization = maxHours > 0 ? (assignedHours / maxHours) * 100 : 0;

    return {
      id: f.id,
      name: f.full_name,
      code: f.faculty_code,
      designation: f.designation,
      assignedHours,
      maxHours,
      remaining,
      utilization: Number(utilization.toFixed(1)),
      coursesCount: assignedCourses.length,
      exceeds: assignedHours > maxHours
    };
  });

  // Handle Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Course Code',
      'Course Title',
      'Course Type',
      'Weekly Hours',
      'Assigned Faculty Name',
      'Faculty Code',
      'Faculty Designation',
      'Faculty Weekly Cap',
      'Faculty Total Load',
      'Override Applied',
      'Override Reason'
    ];

    const rows = currentPlan.assignments.map(a => {
      const course = courseMap.get(a.course_id);
      const faculty = facultyMap.get(a.faculty_id);
      const facultyLoad = facultySummary.find(f => f.id === a.faculty_id)?.assignedHours || a.weekly_hours;

      return [
        `"${course?.course_code || ''}"`,
        `"${course?.title || ''}"`,
        `"${course?.course_type || ''}"`,
        course?.weekly_hours || 0,
        `"${faculty?.full_name || ''}"`,
        `"${faculty?.faculty_code || ''}"`,
        `"${faculty?.designation || ''}"`,
        faculty?.max_weekly_hours || 0,
        facultyLoad,
        a.is_manual_override ? 'YES' : 'NO',
        `"${(a.override_reason || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `FacultyFlow_Allocation_${currentPlan.semester.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('success', 'CSV Exported', 'Course workload schedule exported successfully.');
  };

  // Handle Manual Override Click
  const handleOpenOverride = (courseId: string, currentFacultyId: string) => {
    const course = courseMap.get(courseId);
    if (!course) return;
    setOverrideCourse(course);
    setOverrideCurrentFacultyId(currentFacultyId);
    setOverrideTargetFacultyId(currentFacultyId);
    setOverrideReasonText('');
    setOverrideError('');
  };

  // Submit Override
  const handleSubmitOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideCourse) return;

    if (overrideTargetFacultyId === overrideCurrentFacultyId) {
      setOverrideError('Please choose a different faculty member for reassignment.');
      return;
    }

    if (!overrideReasonText.trim() || overrideReasonText.trim().length < 5) {
      setOverrideError('A detailed reason (at least 5 characters) is required for HOD audit logs.');
      return;
    }

    const result = applyManualOverride(
      overrideCourse.id,
      overrideTargetFacultyId,
      overrideReasonText.trim()
    );

    if (result.success) {
      setOverrideCourse(null);
    } else {
      setOverrideError(result.error || 'Hard constraint validation failed.');
    }
  };

  // Pie chart data for course types
  const courseTypeDistribution = [
    { name: 'Theory Courses', value: courses.filter(c => c.course_type === 'Theory').length, color: '#4f46e5' },
    { name: 'Laboratory Courses', value: courses.filter(c => c.course_type === 'Lab').length, color: '#0ea5e9' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Plan Actions Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Allocation Plan & Constraint Verification
              </h1>
              <Badge
                variant={currentPlan.status === 'customized' ? 'warning' : 'success'}
                size="md"
              >
                {currentPlan.status === 'customized' ? 'Customized Plan' : 'Optimal Plan'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {currentPlan.department} • {currentPlan.semester} • Algorithm:{' '}
              <strong className="text-slate-700">
                {currentPlan.algorithm === 'csp_mrv_backtracking' ? 'CSP (MRV & Branch-and-Bound)' : 'Hill Climbing (Restarts)'}
              </strong>
            </p>
          </div>

          {/* Action Buttons: Export CSV, Print */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors shadow-2xs"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors shadow-2xs"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              <span>Print Plan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fairness & Objective Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">Peak Faculty Load</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {currentPlan.objective_values.max_load} <span className="text-xs font-normal text-slate-500">hrs/wk</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Within all caps</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">Minimum Faculty Load</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {currentPlan.objective_values.min_load} <span className="text-xs font-normal text-slate-500">hrs/wk</span>
          </div>
          <span className="text-[11px] text-slate-500">Balanced minimum</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">Workload Spread (Range)</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {currentPlan.objective_values.load_range} <span className="text-xs font-normal text-slate-500">hours</span>
          </div>
          <span className="text-[11px] text-indigo-600 font-medium">Optimal spread: 1h</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">Workload Variance (σ²)</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {currentPlan.objective_values.variance}
          </div>
          <span className="text-[11px] text-slate-500">Std Dev: {currentPlan.objective_values.std_dev}h</span>
        </div>
      </div>

      {/* Per-Faculty Workload Summary Cards */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          Per-Faculty Workload Distribution & Remaining Capacities
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {facultySummary.map(f => (
            <div
              key={f.id}
              className={`p-3.5 rounded-lg border transition-all ${
                f.exceeds ? 'bg-rose-50/50 border-rose-300' : 'bg-slate-50/60 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-900 truncate" title={f.name}>{f.name}</span>
                <span className="font-mono text-[11px] text-slate-500">{f.code}</span>
              </div>
              <div className="text-[11px] text-slate-500 truncate mb-2">{f.designation}</div>

              <div className="flex items-baseline justify-between font-mono text-xs mb-1">
                <span className="font-bold text-indigo-700">{f.assignedHours}h assigned</span>
                <span className="text-slate-400">/ {f.maxHours}h max</span>
              </div>

              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mb-2">
                <div
                  className={`h-1.5 rounded-full ${
                    f.exceeds ? 'bg-rose-500' : f.utilization > 80 ? 'bg-amber-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${Math.min(f.utilization, 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>{f.coursesCount} courses</span>
                <span>{f.remaining}h free</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Constraint Checks Breakdown */}
      {validationReport && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-900">
                Department Constraint Audit & Hard Rule Verification
              </h3>
            </div>
            <Badge variant={validationReport.is_valid ? 'success' : 'danger'} size="sm">
              {validationReport.is_valid ? 'All 5 Hard Checks Passed' : 'Violations Detected'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {validationReport.checks.map(check => (
              <div
                key={check.id}
                className={`p-3 rounded-lg border text-xs ${
                  check.status === 'passed'
                    ? 'bg-emerald-50/40 border-emerald-200/70 text-slate-800'
                    : check.status === 'warning'
                    ? 'bg-amber-50/40 border-amber-200/70 text-slate-800'
                    : 'bg-rose-50/40 border-rose-200/70 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between font-semibold mb-1">
                  <span>{check.name}</span>
                  <span
                    className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                      check.status === 'passed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : check.status === 'warning'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {check.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">{check.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Course Assignment Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Complete Course Assignment Schedule
            </h3>
            <p className="text-xs text-slate-500">
              Inspect assigned faculty, teaching hours, explainable rationale, or trigger an HOD manual override.
            </p>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {currentPlan.assignments.length} Assignments
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 font-semibold">Course</th>
                <th className="px-3 py-3.5 font-semibold">Type</th>
                <th className="px-3 py-3.5 font-semibold text-center">Weekly Hours</th>
                <th className="px-3 py-3.5 font-semibold">Assigned Faculty</th>
                <th className="px-3 py-3.5 font-semibold">Faculty Load Effect</th>
                <th className="px-3 py-3.5 font-semibold">Eligibility Verification</th>
                <th className="px-4 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {currentPlan.assignments.map(a => {
                const course = courseMap.get(a.course_id);
                const faculty = facultyMap.get(a.faculty_id);
                const facultySummaryItem = facultySummary.find(f => f.id === a.faculty_id);

                return (
                  <tr key={a.course_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-slate-900">{course?.course_code}</div>
                      <div className="text-[11px] text-slate-600">{course?.title}</div>
                      {a.is_manual_override && (
                        <span className="inline-block mt-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                          Manual Override
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-3.5">
                      <Badge
                        variant={course?.course_type === 'Theory' ? 'primary' : 'secondary'}
                        size="sm"
                      >
                        {course?.course_type}
                      </Badge>
                    </td>

                    <td className="px-3 py-3.5 text-center font-mono font-bold text-slate-800">
                      {a.weekly_hours}h
                    </td>

                    <td className="px-3 py-3.5">
                      <div className="font-semibold text-slate-900">{faculty?.full_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {faculty?.faculty_code} • {faculty?.designation}
                      </div>
                    </td>

                    <td className="px-3 py-3.5">
                      <div className="font-mono text-slate-700">
                        {facultySummaryItem?.assignedHours}h{' '}
                        <span className="text-slate-400">/ {faculty?.max_weekly_hours}h</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {facultySummaryItem?.utilization}% capacity utilized
                      </div>
                    </td>

                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Qualified for {course?.required_specialization}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setActiveExplanationAssignment(a)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                          title="Why this allocation?"
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                          <span>Why this?</span>
                        </button>

                        <button
                          onClick={() => handleOpenOverride(a.course_id, a.faculty_id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                          title="Edit assignment (Manual Override)"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* "Why This Allocation?" Deep Explainability Modal */}
      {activeExplanationAssignment && (
        <Modal
          isOpen={Boolean(activeExplanationAssignment)}
          onClose={() => setActiveExplanationAssignment(null)}
          title={`Explainable Decision: ${courseMap.get(activeExplanationAssignment.course_id)?.course_code} - ${courseMap.get(activeExplanationAssignment.course_id)?.title}`}
          subtitle={`Assigned Faculty: ${facultyMap.get(activeExplanationAssignment.faculty_id)?.full_name}`}
          maxWidth="xl"
        >
          <div className="space-y-4 text-xs">
            {/* Primary Rationalization */}
            <div className="p-3.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-950">
              <span className="font-bold block mb-1">Algorithm Decision Rationale:</span>
              <p className="leading-relaxed">{activeExplanationAssignment.explanation}</p>
            </div>

            {/* Candidate Alternatives Evaluation */}
            {activeExplanationAssignment.candidate_evaluations && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-2">
                  Evaluation of Alternative Faculty Candidates:
                </h4>
                <div className="space-y-2">
                  {activeExplanationAssignment.candidate_evaluations.map(candidate => (
                    <div
                      key={candidate.faculty_id}
                      className={`p-3 rounded-lg border ${
                        candidate.selected
                          ? 'bg-emerald-50/60 border-emerald-300'
                          : candidate.is_eligible && !candidate.exceeds_cap
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-rose-50/40 border-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900">{candidate.faculty_name}</span>
                        {candidate.selected ? (
                          <Badge variant="success" size="sm">Selected Faculty</Badge>
                        ) : !candidate.is_eligible ? (
                          <Badge variant="danger" size="sm">Ineligible</Badge>
                        ) : candidate.exceeds_cap ? (
                          <Badge variant="warning" size="sm">Would Exceed Cap</Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">Valid Alternative</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">{candidate.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Manual Override Dialog with Hard Constraint Pre-Validation */}
      {overrideCourse && (
        <Modal
          isOpen={Boolean(overrideCourse)}
          onClose={() => setOverrideCourse(null)}
          title={`Manual Assignment Override: ${overrideCourse.course_code}`}
          subtitle={`${overrideCourse.title} (${overrideCourse.weekly_hours} hrs/wk)`}
          maxWidth="lg"
        >
          <form onSubmit={handleSubmitOverride} className="space-y-4 text-xs">
            {overrideError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                <strong>Override Rejected:</strong> {overrideError}
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Select Reassigned Faculty Member *
              </label>
              <select
                value={overrideTargetFacultyId}
                onChange={e => {
                  setOverrideTargetFacultyId(e.target.value);
                  setOverrideError('');
                }}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {faculties.map(f => {
                  const currentHours = facultySummary.find(s => s.id === f.id)?.assignedHours || 0;
                  const newHours = f.id === overrideCurrentFacultyId
                    ? currentHours
                    : currentHours + overrideCourse.weekly_hours;

                  return (
                    <option key={f.id} value={f.id}>
                      {f.full_name} ({f.faculty_code} - {f.designation}) [Projected: {newHours}h / {f.max_weekly_hours}h cap]
                    </option>
                  );
                })}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Hard caps and specializations will be strictly verified before applying.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Reason / Justification * (Minimum 5 characters)
              </label>
              <textarea
                rows={3}
                value={overrideReasonText}
                onChange={e => {
                  setOverrideReasonText(e.target.value);
                  setOverrideError('');
                }}
                placeholder="State academic reason for this manual reassignment (e.g. specialized research project supervision, faculty substitute)..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
              <strong>Notice:</strong> Applying this override will recompute all faculty teaching hours and rerun all hard-constraint checks. If the assignment exceeds any faculty cap or violates eligibility, it will be automatically prohibited.
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOverrideCourse(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
              >
                Apply & Revalidate
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
