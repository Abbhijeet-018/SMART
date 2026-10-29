export type Designation = 'Professor' | 'Associate Professor' | 'Assistant Professor';

export type CourseType = 'Theory' | 'Lab';

export type AvailabilityStatus = 'Available' | 'On Leave' | 'Sabbatical' | 'Part-Time Available';

export interface Faculty {
  id: string;
  faculty_code: string;
  full_name: string;
  designation: Designation;
  specializations: string[];
  lab_skills: string[];
  max_weekly_hours: number;
  availability: AvailabilityStatus;
  notes?: string;
  created_at: string;
}

export interface Course {
  id: string;
  course_code: string;
  title: string;
  course_type: CourseType;
  weekly_hours: number;
  required_specialization: string;
  required_lab_skills: string[];
  eligible_faculty_restrictions?: string[]; // optional explicitly restricted list
  created_at: string;
}

export interface EligibilityFactCheck {
  qualified: boolean;
  available: boolean;
  lab_skilled: boolean;
  meets_restrictions: boolean;
}

export interface EligibilityResult {
  faculty_id: string;
  course_id: string;
  is_eligible: boolean;
  facts: EligibilityFactCheck;
  reason: string;
  proof_trace: string[];
}

export interface CandidateEvaluation {
  faculty_id: string;
  faculty_name: string;
  is_eligible: boolean;
  reason: string;
  current_load_before: number;
  projected_load_after: number;
  exceeds_cap: boolean;
  selected: boolean;
  score?: number;
}

export interface CourseAssignment {
  course_id: string;
  faculty_id: string;
  weekly_hours: number;
  explanation: string;
  is_manual_override?: boolean;
  override_reason?: string;
  override_timestamp?: string;
  candidate_evaluations?: CandidateEvaluation[];
}

export type PlanStatus = 'active' | 'customized';

export type SolverAlgorithm = 'csp_mrv_backtracking' | 'hill_climbing_restart';

export interface PlanObjectiveMetrics {
  max_load: number;
  min_load: number;
  load_range: number;
  variance: number;
  std_dev: number;
  faculty_loads: Record<string, number>;
}

export interface SolverMetrics {
  algorithm: SolverAlgorithm;
  search_nodes: number;
  branches_pruned: number;
  elapsed_ms: number;
  optimality_proven: boolean;
  feasible: boolean;
  iterations?: number;
  restarts?: number;
}

export interface AllocationPlan {
  id: string;
  name: string;
  semester: string;
  academic_year: string;
  department: string;
  status: PlanStatus;
  algorithm: SolverAlgorithm;
  solver_metrics: SolverMetrics;
  objective_values: PlanObjectiveMetrics;
  assignments: CourseAssignment[];
  created_at: string;
  updated_at: string;
  notes?: string;
}

export interface AuditEvent {
  id: string;
  plan_id?: string;
  action: 'PLAN_GENERATED' | 'ASSIGNMENT_OVERRIDDEN' | 'DATA_RESET' | 'FACULTY_UPDATED' | 'COURSE_UPDATED';
  details: string;
  performed_by: string;
  timestamp: string;
}

export interface DesignationCaps {
  Professor: number;
  'Associate Professor': number;
  'Assistant Professor': number;
}

export interface AppSettings {
  department: string;
  semester: string;
  academic_year: string;
  designation_caps: DesignationCaps;
  optimization_preferences: {
    minimize_max_load: boolean;
    minimize_variance: boolean;
    balance_theory_lab: boolean;
  };
  hard_constraints: {
    enforce_caps: boolean;
    require_qualification: boolean;
    require_lab_skills: boolean;
    require_availability: boolean;
  };
}

export interface BenchmarkReference {
  name: string;
  description: string;
  faculty_count: number;
  course_count: number;
  total_hours: number;
  reported_max_load: number;
  exhaustive_search_steps: number;
  pruned_search_steps: number;
  search_reduction_pct: number;
}
