import { Faculty, Course, CourseAssignment, PlanObjectiveMetrics } from '../types';
import { computeEligibility } from './rules';
import { calculateWorkloadMetrics } from './cspSolver';

export interface ConstraintCheckItem {
  id: string;
  name: string;
  category: 'hard' | 'soft';
  status: 'passed' | 'failed' | 'warning';
  description: string;
  details?: string;
  affected_entities?: string[];
}

export interface PlanValidationReport {
  is_valid: boolean;
  total_courses: number;
  assigned_courses: number;
  unassigned_courses: number;
  duplicate_courses: number;
  total_required_hours: number;
  total_assigned_hours: number;
  checks: ConstraintCheckItem[];
  faculty_loads: Record<string, { assigned_hours: number; max_hours: number; utilization_pct: number; exceeds: boolean }>;
  objective_values: PlanObjectiveMetrics;
  error_summary?: string;
}

/**
 * Validates a complete allocation plan against all academic and policy hard/soft constraints
 */
export function validateAllocationPlan(
  faculties: Faculty[],
  courses: Course[],
  assignments: CourseAssignment[]
): PlanValidationReport {
  const checks: ConstraintCheckItem[] = [];
  const facultyMap = new Map(faculties.map(f => [f.id, f]));
  const courseMap = new Map(courses.map(c => [c.id, c]));

  // Track hours and assignments per faculty
  const facultyLoads: Record<string, number> = {};
  for (const f of faculties) facultyLoads[f.id] = 0;

  // 1. Completeness & Duplication Checks
  const assignedCourseIds = new Set<string>();
  const duplicateCourseIds: string[] = [];
  let totalAssignedHours = 0;

  for (const a of assignments) {
    if (assignedCourseIds.has(a.course_id)) {
      duplicateCourseIds.push(a.course_id);
    }
    assignedCourseIds.add(a.course_id);

    const course = courseMap.get(a.course_id);
    if (course) {
      // Validate that weekly_hours matches course's true weekly_hours
      totalAssignedHours += course.weekly_hours;
      facultyLoads[a.faculty_id] = (facultyLoads[a.faculty_id] || 0) + course.weekly_hours;
    }
  }

  const unassignedCourses = courses.filter(c => !assignedCourseIds.has(c.id));
  const totalRequiredHours = courses.reduce((sum, c) => sum + c.weekly_hours, 0);

  // Check 1: All courses assigned exactly once
  const allCoursesAssigned = unassignedCourses.length === 0 && duplicateCourseIds.length === 0 && assignments.length === courses.length;
  checks.push({
    id: 'completeness',
    name: 'Course Coverage & Uniqueness',
    category: 'hard',
    status: allCoursesAssigned ? 'passed' : 'failed',
    description: allCoursesAssigned
      ? `All ${courses.length} courses are assigned exactly once with no duplicates.`
      : `Missing ${unassignedCourses.length} unassigned course(s) and found ${duplicateCourseIds.length} duplicate assignment(s).`,
    affected_entities: [
      ...unassignedCourses.map(c => c.course_code),
      ...duplicateCourseIds.map(id => courseMap.get(id)?.course_code || id)
    ]
  });

  // Check 2: Total weekly hours match
  const hoursMatch = totalAssignedHours === totalRequiredHours;
  checks.push({
    id: 'hours_integrity',
    name: 'Weekly Hours Integrity',
    category: 'hard',
    status: hoursMatch ? 'passed' : 'failed',
    description: hoursMatch
      ? `Total assigned weekly hours (${totalAssignedHours}h) matches total required curriculum hours (${totalRequiredHours}h).`
      : `Assigned hours (${totalAssignedHours}h) do not match required curriculum hours (${totalRequiredHours}h).`
  });

  // Check 3: Faculty Workload Maximum Weekly Hour Caps
  const overCapFaculty: string[] = [];
  const facultyLoadDetails: PlanValidationReport['faculty_loads'] = {};

  for (const f of faculties) {
    const assigned = facultyLoads[f.id] || 0;
    const max = f.max_weekly_hours;
    const exceeds = assigned > max;
    const pct = max > 0 ? Number(((assigned / max) * 100).toFixed(1)) : 0;

    facultyLoadDetails[f.id] = {
      assigned_hours: assigned,
      max_hours: max,
      utilization_pct: pct,
      exceeds
    };

    if (exceeds) {
      overCapFaculty.push(`${f.full_name} (${assigned}h / ${max}h max)`);
    }
  }

  checks.push({
    id: 'capacity_caps',
    name: 'Maximum Weekly Workload Caps',
    category: 'hard',
    status: overCapFaculty.length === 0 ? 'passed' : 'failed',
    description: overCapFaculty.length === 0
      ? `All faculty members are within their configured weekly teaching hour limits.`
      : `${overCapFaculty.length} faculty member(s) exceed maximum teaching hours: ${overCapFaculty.join(', ')}.`,
    affected_entities: overCapFaculty
  });

  // Check 4: Academic Eligibility & Specialization match
  const ineligibleAssignments: string[] = [];
  const missingLabSkillAssignments: string[] = [];
  const unavailableAssignments: string[] = [];

  for (const a of assignments) {
    const faculty = facultyMap.get(a.faculty_id);
    const course = courseMap.get(a.course_id);

    if (!faculty || !course) {
      ineligibleAssignments.push(`Invalid reference: Faculty or Course not found in directory.`);
      continue;
    }

    const elig = computeEligibility(faculty, course);
    if (!elig.is_eligible) {
      if (!elig.facts.available) {
        unavailableAssignments.push(`${faculty.full_name} assigned to ${course.course_code} while marked as '${faculty.availability}'.`);
      }
      if (!elig.facts.qualified) {
        ineligibleAssignments.push(`${faculty.full_name} not specialized for ${course.course_code} (${course.required_specialization}).`);
      }
      if (!elig.facts.lab_skilled) {
        missingLabSkillAssignments.push(`${faculty.full_name} lacks lab competencies for ${course.course_code} (${course.required_lab_skills.join(', ')}).`);
      }
    }
  }

  checks.push({
    id: 'qualification_match',
    name: 'Faculty Specialization & Subject Competency',
    category: 'hard',
    status: ineligibleAssignments.length === 0 ? 'passed' : 'failed',
    description: ineligibleAssignments.length === 0
      ? `All assignments strictly match faculty specialization and academic discipline.`
      : `${ineligibleAssignments.length} assignment(s) have specialization mismatches: ${ineligibleAssignments.join('; ')}.`,
    affected_entities: ineligibleAssignments
  });

  checks.push({
    id: 'lab_skills',
    name: 'Lab Software & Technical Competencies',
    category: 'hard',
    status: missingLabSkillAssignments.length === 0 ? 'passed' : 'failed',
    description: missingLabSkillAssignments.length === 0
      ? `All laboratory courses are staffed by faculty possessing required technical proficiencies.`
      : `${missingLabSkillAssignments.length} lab assignment(s) lack required skills: ${missingLabSkillAssignments.join('; ')}.`,
    affected_entities: missingLabSkillAssignments
  });

  checks.push({
    id: 'availability',
    name: 'Active Faculty Availability',
    category: 'hard',
    status: unavailableAssignments.length === 0 ? 'passed' : 'failed',
    description: unavailableAssignments.length === 0
      ? `All assigned faculty are actively available for teaching.`
      : `${unavailableAssignments.length} faculty assigned during inactive status: ${unavailableAssignments.join('; ')}.`,
    affected_entities: unavailableAssignments
  });

  // Calculate objective fairness metrics
  const objective_values = calculateWorkloadMetrics(facultyLoads, faculties.map(f => f.id));

  // Soft check: Workload fairness
  checks.push({
    id: 'workload_fairness',
    name: 'Department Workload Balance (Soft Metric)',
    category: 'soft',
    status: objective_values.load_range <= 2 ? 'passed' : 'warning',
    description: `Current max load: ${objective_values.max_load}h, min load: ${objective_values.min_load}h (spread: ${objective_values.load_range}h, variance: ${objective_values.variance}).`,
  });

  // Determine overall validity (all hard checks must pass)
  const hardChecks = checks.filter(c => c.category === 'hard');
  const isValid = hardChecks.every(c => c.status === 'passed');

  let error_summary: string | undefined;
  if (!isValid) {
    const failedDescriptions = hardChecks
      .filter(c => c.status === 'failed')
      .map(c => `${c.name}: ${c.description}`);
    error_summary = failedDescriptions.join(' | ');
  }

  return {
    is_valid: isValid,
    total_courses: courses.length,
    assigned_courses: assignments.length,
    unassigned_courses: unassignedCourses.length,
    duplicate_courses: duplicateCourseIds.length,
    total_required_hours: totalRequiredHours,
    total_assigned_hours: totalAssignedHours,
    checks,
    faculty_loads: facultyLoadDetails,
    objective_values,
    error_summary
  };
}

/**
 * Validates a single proposed manual override before applying it
 */
export function validateProposedOverride(
  faculties: Faculty[],
  courses: Course[],
  currentAssignments: CourseAssignment[],
  courseId: string,
  newFacultyId: string,
  overrideReason: string
): { can_apply: boolean; error_message?: string; projected_report?: PlanValidationReport } {
  if (!overrideReason || overrideReason.trim().length < 5) {
    return {
      can_apply: false,
      error_message: `A valid audit justification reason (minimum 5 characters) is required for any manual HOD override.`
    };
  }

  const faculty = faculties.find(f => f.id === newFacultyId);
  const course = courses.find(c => c.id === courseId);

  if (!faculty || !course) {
    return { can_apply: false, error_message: 'Faculty or Course record not found.' };
  }

  // Check eligibility rule for the proposed assignment
  const elig = computeEligibility(faculty, course);
  if (!elig.is_eligible) {
    return {
      can_apply: false,
      error_message: `Invalid Override: ${faculty.full_name} is ineligible for ${course.course_code}. Reason: ${elig.reason}`
    };
  }

  // Build projected assignment list
  const projectedAssignments = currentAssignments.map(a => {
    if (a.course_id === courseId) {
      return {
        ...a,
        faculty_id: newFacultyId,
        is_manual_override: true,
        override_reason: overrideReason.trim(),
        override_timestamp: new Date().toISOString()
      };
    }
    return a;
  });

  // Re-run all hard-constraint validations on the projected plan
  const report = validateAllocationPlan(faculties, courses, projectedAssignments);

  if (!report.is_valid) {
    return {
      can_apply: false,
      error_message: `Override Rejected: Proposed assignment violates hard constraints. ${report.error_summary}`,
      projected_report: report
    };
  }

  return {
    can_apply: true,
    projected_report: report
  };
}
