import {
  Faculty,
  Course,
  CourseAssignment,
  PlanObjectiveMetrics,
  SolverMetrics,
  CandidateEvaluation
} from '../types';
import { getEligibleFacultiesForCourse, computeEligibility } from './rules';

export interface SolverResult {
  feasible: boolean;
  assignments: CourseAssignment[];
  objective_values: PlanObjectiveMetrics;
  metrics: SolverMetrics;
  failure_reason?: string;
  blocking_courses?: { course_code: string; title: string; reason: string }[];
  explored_plans?: number;
}

export interface CSPOptions {
  max_search_nodes?: number; // safety cutoff if needed, default high
  enable_branch_and_bound?: boolean;
}

/**
 * Calculates variance and standard deviation of workload across all faculty
 */
export function calculateWorkloadMetrics(
  facultyLoads: Record<string, number>,
  facultyIds: string[]
): PlanObjectiveMetrics {
  const loads = facultyIds.map(id => facultyLoads[id] || 0);
  if (loads.length === 0) {
    return {
      max_load: 0,
      min_load: 0,
      load_range: 0,
      variance: 0,
      std_dev: 0,
      faculty_loads: facultyLoads
    };
  }

  const max_load = Math.max(...loads);
  const min_load = Math.min(...loads);
  const load_range = max_load - min_load;
  const mean = loads.reduce((a, b) => a + b, 0) / loads.length;
  const variance = loads.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / loads.length;
  const std_dev = Math.sqrt(variance);

  return {
    max_load,
    min_load,
    load_range,
    variance: Number(variance.toFixed(4)),
    std_dev: Number(std_dev.toFixed(4)),
    faculty_loads: { ...facultyLoads }
  };
}

/**
 * Compares two objective states lexicographically:
 * 1. Minimize max_load
 * 2. Minimize variance
 */
function isBetterObjective(
  candidate: PlanObjectiveMetrics,
  currentBest: PlanObjectiveMetrics | null
): boolean {
  if (!currentBest) return true;
  if (candidate.max_load < currentBest.max_load) return true;
  if (candidate.max_load > currentBest.max_load) return false;
  // If max_load is identical, prefer smaller variance
  if (candidate.variance < currentBest.variance) return true;
  if (candidate.variance > currentBest.variance) return false;
  // If variance is also identical, prefer smaller load range
  return candidate.load_range < currentBest.load_range;
}

/**
 * Constraint Satisfaction Problem (CSP) Solver using:
 * - Minimum Remaining Values (MRV) for Variable Selection
 * - Least Constraining Value / Workload Balancing for Value Ordering
 * - Forward Checking of Capacity & Eligibility Domains
 * - Branch-and-Bound Pruning against Best Known Max Workload & Variance
 */
export function solveAllocationCSP(
  faculties: Faculty[],
  courses: Course[],
  options: CSPOptions = {}
): SolverResult {
  const startTime = performance.now();
  let searchNodes = 0;
  let branchesPruned = 0;
  let totalFeasiblePlansFound = 0;
  const maxSearchNodes = options.max_search_nodes ?? 100000;
  const useBranchAndBound = options.enable_branch_and_bound ?? true;

  // 1. Initial Domain Construction & Infeasibility Pre-check
  const facultyMap = new Map(faculties.map(f => [f.id, f]));
  const facultyIds = faculties.map(f => f.id);
  const courseDomains = new Map<string, string[]>();
  const blockingCourses: { course_code: string; title: string; reason: string }[] = [];

  for (const course of courses) {
    const eligibleFaculty = getEligibleFacultiesForCourse(course, faculties);
    if (eligibleFaculty.length === 0) {
      blockingCourses.push({
        course_code: course.course_code,
        title: course.title,
        reason: `No eligible faculty found with required specialization '${course.required_specialization}' and availability.`
      });
    }
    courseDomains.set(course.id, eligibleFaculty.map(f => f.id));
  }

  // Check total capacity vs total demanded hours
  const totalCourseHours = courses.reduce((sum, c) => sum + c.weekly_hours, 0);
  const totalFacultyCapacity = faculties.reduce((sum, f) => sum + f.max_weekly_hours, 0);

  if (totalCourseHours > totalFacultyCapacity) {
    const elapsed = performance.now() - startTime;
    return {
      feasible: false,
      assignments: [],
      objective_values: calculateWorkloadMetrics({}, facultyIds),
      metrics: {
        algorithm: 'csp_mrv_backtracking',
        search_nodes: 0,
        branches_pruned: 0,
        elapsed_ms: Number(elapsed.toFixed(2)),
        optimality_proven: true,
        feasible: false
      },
      failure_reason: `Total required course teaching hours (${totalCourseHours}h) exceeds the total department faculty teaching capacity (${totalFacultyCapacity}h).`,
      blocking_courses: blockingCourses
    };
  }

  if (blockingCourses.length > 0) {
    const elapsed = performance.now() - startTime;
    return {
      feasible: false,
      assignments: [],
      objective_values: calculateWorkloadMetrics({}, facultyIds),
      metrics: {
        algorithm: 'csp_mrv_backtracking',
        search_nodes: 0,
        branches_pruned: 0,
        elapsed_ms: Number(elapsed.toFixed(2)),
        optimality_proven: true,
        feasible: false
      },
      failure_reason: `One or more courses have an empty domain (no qualified and available faculty).`,
      blocking_courses: blockingCourses
    };
  }

  // 2. CSP Search State
  let bestAssignments: Map<string, string> | null = null;
  let bestObjective: PlanObjectiveMetrics | null = null;

  // Initialize faculty loads
  const currentFacultyLoads: Record<string, number> = {};
  for (const f of faculties) {
    currentFacultyLoads[f.id] = 0;
  }

  const assignedCourses = new Map<string, string>(); // courseId -> facultyId
  const remainingCourseIds = new Set(courses.map(c => c.id));

  /**
   * MRV (Minimum Remaining Values) Variable Selection:
   * Chooses the unassigned course with the smallest number of currently feasible faculty values.
   * Tie-breaker: largest weekly hours (most constrained in time).
   */
  function selectNextVariable(): Course | null {
    let chosenCourse: Course | null = null;
    let minDomainSize = Infinity;
    let maxHours = -1;

    for (const courseId of remainingCourseIds) {
      const course = courses.find(c => c.id === courseId)!;
      const domain = courseDomains.get(courseId) || [];

      // Count only faculty in domain who still have capacity for this course
      let feasibleValuesCount = 0;
      for (const facultyId of domain) {
        const fac = facultyMap.get(facultyId)!;
        if (currentFacultyLoads[facultyId] + course.weekly_hours <= fac.max_weekly_hours) {
          feasibleValuesCount++;
        }
      }

      if (
        feasibleValuesCount < minDomainSize ||
        (feasibleValuesCount === minDomainSize && course.weekly_hours > maxHours)
      ) {
        minDomainSize = feasibleValuesCount;
        maxHours = course.weekly_hours;
        chosenCourse = course;
      }
    }

    return chosenCourse;
  }

  /**
   * Recursive Backtracking with Forward Checking & Branch-and-Bound
   */
  function backtrack(): void {
    searchNodes++;
    if (searchNodes > maxSearchNodes) {
      return;
    }

    // Base Case: All courses assigned
    if (remainingCourseIds.size === 0) {
      totalFeasiblePlansFound++;
      const currentObjective = calculateWorkloadMetrics(currentFacultyLoads, facultyIds);
      if (isBetterObjective(currentObjective, bestObjective)) {
        bestObjective = currentObjective;
        bestAssignments = new Map(assignedCourses);
      }
      return;
    }

    // Branch-and-bound lower bound check
    if (useBranchAndBound && bestObjective !== null) {
      const currentMax = Math.max(...facultyIds.map(id => currentFacultyLoads[id]));
      if (currentMax > bestObjective.max_load) {
        branchesPruned++;
        return; // Current partial assignment is already strictly worse than best complete solution
      }

      // Theoretical lower bound of remaining hours across all faculty
      const remainingHours = Array.from(remainingCourseIds)
        .map(cid => courses.find(c => c.id === cid)!.weekly_hours)
        .reduce((a, b) => a + b, 0);
      const currentSum = facultyIds.reduce((sum, id) => sum + currentFacultyLoads[id], 0);
      const theoreticalLowerBoundMax = Math.ceil((currentSum + remainingHours) / faculties.length);

      if (theoreticalLowerBoundMax > bestObjective.max_load) {
        branchesPruned++;
        return;
      }
    }

    // Select Variable via MRV
    const course = selectNextVariable();
    if (!course) return;

    const domain = courseDomains.get(course.id) || [];

    // Filter feasible candidates who do not violate hard max_weekly_hours cap
    const feasibleCandidates = domain.filter(facultyId => {
      const faculty = facultyMap.get(facultyId)!;
      return currentFacultyLoads[facultyId] + course.weekly_hours <= faculty.max_weekly_hours;
    });

    // If a variable has 0 feasible values, backtrack! (Dead end)
    if (feasibleCandidates.length === 0) {
      branchesPruned++;
      return;
    }

    // Value Ordering: Order candidates by current workload ascending (least loaded faculty first)
    // to promote balanced allocation early in the search tree.
    feasibleCandidates.sort((a, b) => {
      const loadA = currentFacultyLoads[a];
      const loadB = currentFacultyLoads[b];
      if (loadA !== loadB) return loadA - loadB;
      // Deterministic tie-breaker
      return a.localeCompare(b);
    });

    // Try values
    for (const facultyId of feasibleCandidates) {
      // Forward Checking: check if assigning this course leaves any unassigned course with 0 feasible options
      currentFacultyLoads[facultyId] += course.weekly_hours;
      assignedCourses.set(course.id, facultyId);
      remainingCourseIds.delete(course.id);

      // Perform forward check
      let forwardCheckPassed = true;
      for (const remainingId of remainingCourseIds) {
        const remCourse = courses.find(c => c.id === remainingId)!;
        const remDomain = courseDomains.get(remainingId) || [];
        const hasFeasibleFaculty = remDomain.some(fId => {
          const f = facultyMap.get(fId)!;
          return currentFacultyLoads[fId] + remCourse.weekly_hours <= f.max_weekly_hours;
        });

        if (!hasFeasibleFaculty) {
          forwardCheckPassed = false;
          break;
        }
      }

      if (forwardCheckPassed) {
        backtrack();
      } else {
        branchesPruned++;
      }

      // Revert assignment (Backtrack)
      remainingCourseIds.add(course.id);
      assignedCourses.delete(course.id);
      currentFacultyLoads[facultyId] -= course.weekly_hours;
    }
  }

  // Execute CSP Backtracking
  backtrack();

  const elapsed = performance.now() - startTime;
  const optimality_proven = searchNodes <= maxSearchNodes;

  if (!bestAssignments || !bestObjective) {
    return {
      feasible: false,
      assignments: [],
      objective_values: calculateWorkloadMetrics({}, facultyIds),
      metrics: {
        algorithm: 'csp_mrv_backtracking',
        search_nodes: searchNodes,
        branches_pruned: branchesPruned,
        elapsed_ms: Number(elapsed.toFixed(2)),
        optimality_proven,
        feasible: false
      },
      failure_reason: `No assignment could be found that simultaneously satisfies all eligibility, specialization, lab competency, and individual faculty weekly hour caps.`,
      explored_plans: totalFeasiblePlansFound
    };
  }

  const finalAssignments: Map<string, string> = bestAssignments!;
  const finalObjective: PlanObjectiveMetrics = bestObjective!;

  // 3. Build Detailed Explainable Assignments
  // For each course, record why the faculty was chosen and what alternatives existed
  const finalFacultyLoads: Record<string, number> = {};
  for (const f of faculties) finalFacultyLoads[f.id] = 0;

  const resultAssignments: CourseAssignment[] = [];

  for (const course of courses) {
    const assignedFacultyId = finalAssignments.get(course.id)!;
    const assignedFaculty = facultyMap.get(assignedFacultyId)!;
    const domain = courseDomains.get(course.id) || [];

    // Build candidate evaluations
    const candidate_evaluations: CandidateEvaluation[] = faculties.map(fac => {
      const isEligible = domain.includes(fac.id);
      const currentLoad = finalFacultyLoads[fac.id] || 0;
      const projectedLoad = currentLoad + course.weekly_hours;
      const exceedsCap = projectedLoad > fac.max_weekly_hours;
      const isSelected = fac.id === assignedFacultyId;

      let reason = '';
      if (!isEligible) {
        const elig = computeEligibility(fac, course);
        reason = elig.reason;
      } else if (exceedsCap) {
        reason = `Would exceed weekly cap: ${projectedLoad}h > ${fac.max_weekly_hours}h cap.`;
      } else if (isSelected) {
        reason = `Selected: Qualified, available, capacity valid, and minimized maximum department load to ${finalObjective.max_load}h.`;
      } else {
        reason = `Eligible and within cap (${currentLoad}h), but assigning to ${assignedFaculty.full_name} resulted in better overall department workload fairness.`;
      }

      return {
        faculty_id: fac.id,
        faculty_name: fac.full_name,
        is_eligible: isEligible,
        reason,
        current_load_before: currentLoad,
        projected_load_after: projectedLoad,
        exceeds_cap: exceedsCap,
        selected: isSelected
      };
    });

    const loadBefore = finalFacultyLoads[assignedFacultyId];
    finalFacultyLoads[assignedFacultyId] += course.weekly_hours;
    const loadAfter = finalFacultyLoads[assignedFacultyId];

    const explanation = `Assigned to ${assignedFaculty.full_name} (${assignedFaculty.designation}) who is eligible for '${course.required_specialization}', has available capacity (${loadBefore}h -> ${loadAfter}h of ${assignedFaculty.max_weekly_hours}h max), and keeps overall workload within optimal peak load (${finalObjective.max_load}h).`;

    resultAssignments.push({
      course_id: course.id,
      faculty_id: assignedFacultyId,
      weekly_hours: course.weekly_hours,
      explanation,
      candidate_evaluations
    });
  }

  return {
    feasible: true,
    assignments: resultAssignments,
    objective_values: bestObjective,
    metrics: {
      algorithm: 'csp_mrv_backtracking',
      search_nodes: searchNodes,
      branches_pruned: branchesPruned,
      elapsed_ms: Number(elapsed.toFixed(2)),
      optimality_proven,
      feasible: true
    },
    explored_plans: totalFeasiblePlansFound
  };
}
