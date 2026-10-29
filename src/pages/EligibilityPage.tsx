import React, { useState } from 'react';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Cpu,
  ArrowRight,
  Filter,
  Info,
  Layers,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  computeEligibility,
  backwardChainingQuery,
  BackwardExplanation
} from '../engine/rules';
import { Faculty, Course } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const EligibilityPage: React.FC = () => {
  const { faculties, courses } = useApp();

  // Selected cell for deep explainability inspection
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [inspectionProof, setInspectionProof] = useState<BackwardExplanation | null>(null);

  // Filter state
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');

  const handleInspectCell = (faculty: Faculty, course: Course) => {
    setSelectedFaculty(faculty);
    setSelectedCourse(course);
    const proof = backwardChainingQuery(faculty, course);
    setInspectionProof(proof);
  };

  const displayedCourses = selectedCourseFilter === 'all'
    ? courses
    : courses.filter(c => c.id === selectedCourseFilter);

  // Compute summary stats
  let totalPairs = faculties.length * courses.length;
  let eligiblePairs = 0;
  for (const f of faculties) {
    for (const c of courses) {
      if (computeEligibility(f, c).is_eligible) eligiblePairs++;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Rule-Based Eligibility Matrix
            </h1>
            <Badge variant="primary" size="sm">First-Order Logic Engine</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Deductive qualification facts: Qualified(f, c), Available(f), LabSkilled(f, c), and Eligible(f, c). Click any cell for forward and backward chaining proof traces.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>{eligiblePairs} Eligible Pairs</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <XCircle className="h-4 w-4 text-rose-400" />
            <span>{totalPairs - eligiblePairs} Ineligible Pairs</span>
          </div>
        </div>
      </div>

      {/* Filter and Axiom Legend Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 text-xs">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-semibold text-slate-700">Filter Course:</span>
          <select
            value={selectedCourseFilter}
            onChange={e => setSelectedCourseFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All {courses.length} Curriculum Courses</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>
                {c.course_code}: {c.title} ({c.course_type})
              </option>
            ))}
          </select>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block" />
            <span>Eligible Pair</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-rose-400 inline-block" />
            <span>Ineligible (Click for proof)</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <Info className="h-3.5 w-3.5" />
            <span>Theory bypasses lab checks</span>
          </div>
        </div>
      </div>

      {/* Interactive Matrix Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                <th className="px-4 py-3.5 font-bold sticky left-0 bg-slate-50 z-10 border-r border-slate-200 min-w-[200px]">
                  Faculty Member / Department Code
                </th>
                {displayedCourses.map(course => (
                  <th key={course.id} className="px-3 py-3.5 font-semibold text-center min-w-[120px] border-r border-slate-100 last:border-r-0">
                    <div className="font-bold text-slate-900">{course.course_code}</div>
                    <div className="text-[10px] text-slate-500 font-normal truncate max-w-[110px]" title={course.title}>
                      {course.title}
                    </div>
                    <Badge
                      variant={course.course_type === 'Theory' ? 'primary' : 'secondary'}
                      size="sm"
                      className="mt-1"
                    >
                      {course.course_type} ({course.weekly_hours}h)
                    </Badge>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {faculties.map(faculty => (
                <tr key={faculty.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 sticky left-0 bg-white z-10 border-r border-slate-200 font-medium text-slate-900">
                    <div className="font-semibold">{faculty.full_name}</div>
                    <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                      <span>{faculty.faculty_code}</span>
                      <span>•</span>
                      <span className="text-slate-500">{faculty.designation}</span>
                    </div>
                  </td>

                  {displayedCourses.map(course => {
                    const result = computeEligibility(faculty, course);
                    const isEligible = result.is_eligible;

                    return (
                      <td
                        key={`${faculty.id}-${course.id}`}
                        onClick={() => handleInspectCell(faculty, course)}
                        className={`px-3 py-3 text-center border-r border-slate-100 last:border-r-0 cursor-pointer transition-all hover:ring-2 hover:ring-indigo-400/50 ${
                          isEligible
                            ? 'bg-emerald-50/40 hover:bg-emerald-50'
                            : 'bg-rose-50/20 hover:bg-rose-50/40'
                        }`}
                        title="Click to view full deductive backward-chaining proof trace"
                      >
                        <div className="flex flex-col items-center justify-center gap-1">
                          {isEligible ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Eligible</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-100/60 px-2 py-0.5 rounded-md">
                              <XCircle className="h-3 w-3" />
                              <span>Ineligible</span>
                            </span>
                          )}

                          <span className="text-[10px] text-slate-400 line-clamp-1 max-w-[110px]" title={result.reason}>
                            {isEligible ? 'Qualified' : result.facts.qualified ? 'Lab gap' : 'Spec mismatch'}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Click any cell to view backward chaining query derivation and logic steps.</span>
          <span>Matrix Dimensions: {faculties.length} Faculty × {displayedCourses.length} Courses</span>
        </div>
      </div>

      {/* Logic Deduction Rule Explainer Box */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
          <Cpu className="h-4 w-4 text-indigo-600" />
          <span>Underlying First-Order Logic Predicates & Inference Rules</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs mt-3">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="font-mono font-bold text-indigo-600">Qualified(f, c)</span>
            <p className="text-slate-600 mt-1 leading-relaxed">
              True iff faculty f’s academic specializations intersect with the course c’s required specialization discipline.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="font-mono font-bold text-indigo-600">Available(f)</span>
            <p className="text-slate-600 mt-1 leading-relaxed">
              True iff faculty f has an active availability status ('Available'). On Leave or Sabbatical evaluates to False.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="font-mono font-bold text-indigo-600">LabSkilled(f, c)</span>
            <p className="text-slate-600 mt-1 leading-relaxed">
              Trivially True for Theory courses. For Lab courses, true iff faculty f possesses all technical lab proficiencies.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="font-mono font-bold text-indigo-600">Eligible(f, c)</span>
            <p className="text-slate-600 mt-1 leading-relaxed">
              Derived by conjunction: <br />
              <code className="text-slate-800 font-mono bg-white px-1 py-0.5 rounded border border-slate-200">
                Available(f) ∧ Qualified(f, c) ∧ LabSkilled(f, c)
              </code>
            </p>
          </div>
        </div>
      </div>

      {/* Backward-Chaining Deep Inspection Modal */}
      {inspectionProof && selectedFaculty && selectedCourse && (
        <Modal
          isOpen={Boolean(inspectionProof)}
          onClose={() => setInspectionProof(null)}
          title={`Explainable Rule Deduction: ${inspectionProof.goal}`}
          subtitle={`Faculty: ${selectedFaculty.full_name} | Course: ${selectedCourse.course_code} (${selectedCourse.title})`}
          maxWidth="xl"
        >
          <div className="space-y-4 text-xs">
            {/* Final Verdict Banner */}
            <div
              className={`p-3.5 rounded-lg border flex items-center justify-between ${
                inspectionProof.is_eligible
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {inspectionProof.is_eligible ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-rose-600" />
                )}
                <div>
                  <span className="font-bold text-sm">
                    {inspectionProof.is_eligible ? 'ELIGIBLE' : 'INELIGIBLE'}
                  </span>
                  <p className="text-xs mt-0.5">{inspectionProof.verdict}</p>
                </div>
              </div>
              <Badge variant={inspectionProof.is_eligible ? 'success' : 'danger'}>
                {selectedCourse.course_type} ({selectedCourse.weekly_hours}h)
              </Badge>
            </div>

            {/* Proof Subgoals Table */}
            <div>
              <h4 className="font-semibold text-slate-800 mb-2">
                Backward-Chaining Subgoal Unfolding Trace:
              </h4>
              <div className="space-y-2.5">
                {inspectionProof.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      step.result ? 'bg-slate-50 border-slate-200' : 'bg-rose-50/50 border-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-slate-900">{step.subgoal}</span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          step.result ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {step.result ? 'Satisfied' : 'Failed'}
                      </span>
                    </div>
                    <div className="text-slate-500 mb-1">
                      <strong>Premise:</strong> {step.premise}
                    </div>
                    <div className="text-slate-700 bg-white p-2 rounded border border-slate-100 font-mono text-[11px]">
                      <strong>Evidence:</strong> {step.evidence}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Forward Chaining Derivation Summary */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-800 block mb-1">Forward Chaining Trace:</span>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 font-mono text-[11px]">
                {computeEligibility(selectedFaculty, selectedCourse).proof_trace.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
