import { Faculty, Course, CourseAssignment, PlanObjectiveMetrics, SolverMetrics } from '../types';
import { getEligibleFacultiesForCourse, computeEligibility } from './rules';
import { calculateWorkloadMetrics, SolverResult } from './cspSolver';

export interface HillClimberOptions {
  max_restarts?: number;
  max_iterations_per_restart?: number;
  seed?: number;
}

// Pseudo-random number generator with reproducible seed (Linear Congruential Generator)
class SeededRandom {
  private state: number;
  constructor(seed: number = 42) {
    this.state = seed % 2147483647;
    if (this.state <= 0) this.state += 2147483646;
  }
  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return (this.state - 1) / 2147483646;
  }
  choice<T>(array: T[]): T {
    const idx = Math.floor(this.next() * array.length);
    return array[idx];
  }
}

/**
 * Hill Climbing with Random Restarts for Faculty Workload Optimization
 * 
 * Local Search Formulation:
 * - State: An assignment of every course to an eligible faculty member.
 * - Constraint check: Hard capacity caps must not be violated.
 * - Objective evaluation: Cost = 1000 * max_load + 10 * variance + range
 * - Neighbor generation:
 *   1. Course reassignment: Move a course to another eligible faculty who has capacity.
 *   2. Course swap: Swap the assigned faculty of two courses if both faculties are eligible for the other course.
 */
export function solveAllocationHillClimbing(
  faculties: Faculty[],
  courses: Course[],
  options: HillClimberOptions = {}
): SolverResult {
  const startTime = performance.now();
  const facultyMap = new Map(faculties.map(f => [f.id, f]));
  const facultyIds = faculties.map(f => f.id);
  const rng = new SeededRandom(options.seed ?? 1024);

  const maxRestarts = options.max_restarts ?? 8;
  const maxIterations = options.max_iterations_per_restart ?? 60;

  let totalSearchSteps = 0;
  let restartsAttempted = 0;

  // Precompute eligible domains
  const courseDomains = new Map<string, string[]>();
  for (const course of courses) {
    const eligible = getEligibleFacultiesForCourse(course, faculties);
    if (eligible.length === 0) {
      const elapsed = performance.now() - startTime;
      return {
        feasible: false,
        assignments: [],
        objective_values: calculateWorkloadMetrics({}, facultyIds),
        metrics: {
          algorithm: 'hill_climbing_restart',
          search_nodes: 0,
          branches_pruned: 0,
          elapsed_ms: Number(elapsed.toFixed(2)),
          optimality_proven: false,
          feasible: false,
          iterations: 0,
          restarts: 0
        },
        failure_reason: `Course ${course.course_code} has no eligible faculty.`
      };
    }
    courseDomains.set(course.id, eligible.map(f => f.id));
  }

  function evaluateState(assignment: Map<string, string>): {
    metrics: PlanObjectiveMetrics;
    cost: number;
    isValid: boolean;
  } {
    const loads: Record<string, number> = {};
    for (const f of faculties) loads[f.id] = 0;

    let isValid = true;
    for (const course of courses) {
      const fId = assignment.get(course.id)!;
      loads[fId] += course.weekly_hours;
      const fac = facultyMap.get(fId)!;
      if (loads[fId] > fac.max_weekly_hours) {
        isValid = false;
      }
    }

    const metrics = calculateWorkloadMetrics(loads, facultyIds);
    // Heavy penalty for cap violations
    const penalty = isValid ? 0 : 50000;
    const cost = 1000 * metrics.max_load + 10 * metrics.variance + metrics.load_range + penalty;

    return { metrics, cost, isValid };
  }

  /**
   * Generates a random initial state trying to respect capacity where possible
   */
  function generateInitialState(): Map<string, string> {
    const assignment = new Map<string, string>();
    const loads: Record<string, number> = {};
    for (const f of faculties) loads[f.id] = 0;

    // Shuffle courses randomly
    const shuffledCourses = [...courses].sort(() => rng.next() - 0.5);

    for (const course of shuffledCourses) {
      const domain = courseDomains.get(course.id)!;
      // Filter for faculty who can fit this course without exceeding cap
      const fitting = domain.filter(fId => {
        const fac = facultyMap.get(fId)!;
        return (loads[fId] || 0) + course.weekly_hours <= fac.max_weekly_hours;
      });

      const chosenFacultyId = fitting.length > 0 ? rng.choice(fitting) : rng.choice(domain);
      assignment.set(course.id, chosenFacultyId);
      loads[chosenFacultyId] = (loads[chosenFacultyId] || 0) + course.weekly_hours;
    }

    return assignment;
  }

  let globalBestAssignment: Map<string, string> | null = null;
  let globalBestMetrics: PlanObjectiveMetrics | null = null;
  let globalBestCost = Infinity;

  // Outer restart loop
  for (let restart = 0; restart < maxRestarts; restart++) {
    restartsAttempted++;
    let currentAssignment = generateInitialState();
    let { metrics: currentMetrics, cost: currentCost, isValid: currentValid } = evaluateState(currentAssignment);

    if (currentValid && currentCost < globalBestCost) {
      globalBestCost = currentCost;
      globalBestAssignment = new Map(currentAssignment);
      globalBestMetrics = currentMetrics;
    }

    // Inner local search (hill climbing steepest-ascent or first-improvement)
    for (let iter = 0; iter < maxIterations; iter++) {
      totalSearchSteps++;
      let improved = false;

      // Examine neighborhood moves:
      // Move 1: Reassign single course
      for (const course of courses) {
        const currentFacultyId = currentAssignment.get(course.id)!;
        const domain = courseDomains.get(course.id)!;

        for (const candidateFacultyId of domain) {
          if (candidateFacultyId === currentFacultyId) continue;

          // Tentative move
          currentAssignment.set(course.id, candidateFacultyId);
          const evaluation = evaluateState(currentAssignment);

          if (evaluation.isValid && evaluation.cost < currentCost) {
            currentCost = evaluation.cost;
            currentMetrics = evaluation.metrics;
            improved = true;

            if (currentCost < globalBestCost) {
              globalBestCost = currentCost;
              globalBestAssignment = new Map(currentAssignment);
              globalBestMetrics = currentMetrics;
            }
            break; // First-improvement step
          } else {
            // Revert move
            currentAssignment.set(course.id, currentFacultyId);
          }
        }
        if (improved) break;
      }

      // If no single-reassignment improvement was found, try a swap move between two courses
      if (!improved) {
        for (let i = 0; i < courses.length; i++) {
          for (let j = i + 1; j < courses.length; j++) {
            const cA = courses[i];
            const cB = courses[j];
            const fA = currentAssignment.get(cA.id)!;
            const fB = currentAssignment.get(cB.id)!;

            if (fA === fB) continue;

            const domainA = courseDomains.get(cA.id)!;
            const domainB = courseDomains.get(cB.id)!;

            // Check if fA is eligible for cB AND fB is eligible for cA
            if (domainA.includes(fB) && domainB.includes(fA)) {
              currentAssignment.set(cA.id, fB);
              currentAssignment.set(cB.id, fA);

              const evalSwap = evaluateState(currentAssignment);
              if (evalSwap.isValid && evalSwap.cost < currentCost) {
                currentCost = evalSwap.cost;
                currentMetrics = evalSwap.metrics;
                improved = true;

                if (currentCost < globalBestCost) {
                  globalBestCost = currentCost;
                  globalBestAssignment = new Map(currentAssignment);
                  globalBestMetrics = currentMetrics;
                }
                break;
              } else {
                // Revert swap
                currentAssignment.set(cA.id, fA);
                currentAssignment.set(cB.id, fB);
              }
            }
          }
          if (improved) break;
        }
      }

      // If local optimum reached (no neighbor strictly improves cost), stop current restart trajectory
      if (!improved) {
        break;
      }
    }
  }

  const elapsed = performance.now() - startTime;

  if (!globalBestAssignment || !globalBestMetrics) {
    return {
      feasible: false,
      assignments: [],
      objective_values: calculateWorkloadMetrics({}, facultyIds),
      metrics: {
        algorithm: 'hill_climbing_restart',
        search_nodes: totalSearchSteps,
        branches_pruned: 0,
        elapsed_ms: Number(elapsed.toFixed(2)),
        optimality_proven: false, // Local search cannot prove global optimality
        feasible: false,
        iterations: totalSearchSteps,
        restarts: restartsAttempted
      },
      failure_reason: `Hill climbing could not discover a valid feasible plan within the allocated restart quota.`
    };
  }

  // Format Course Assignments
  const resultAssignments: CourseAssignment[] = [];
  const loadsSoFar: Record<string, number> = {};
  for (const f of faculties) loadsSoFar[f.id] = 0;

  for (const course of courses) {
    const fId = globalBestAssignment.get(course.id)!;
    const fac = facultyMap.get(fId)!;
    const before = loadsSoFar[fId];
    loadsSoFar[fId] += course.weekly_hours;
    const after = loadsSoFar[fId];

    resultAssignments.push({
      course_id: course.id,
      faculty_id: fId,
      weekly_hours: course.weekly_hours,
      explanation: `Allocated via Hill Climbing (Restart Search) to ${fac.full_name}. Capacity load ${before}h -> ${after}h of ${fac.max_weekly_hours}h cap.`
    });
  }

  return {
    feasible: true,
    assignments: resultAssignments,
    objective_values: globalBestMetrics,
    metrics: {
      algorithm: 'hill_climbing_restart',
      search_nodes: totalSearchSteps,
      branches_pruned: 0,
      elapsed_ms: Number(elapsed.toFixed(2)),
      optimality_proven: false, // Note: Local search heuristic cannot mathematically guarantee global optimality
      feasible: true,
      iterations: totalSearchSteps,
      restarts: restartsAttempted
    }
  };
}
