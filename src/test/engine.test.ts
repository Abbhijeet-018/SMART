import { describe, it, expect } from 'vitest';
import { SEED_FACULTIES, SEED_COURSES } from '../data/seedData';
import { computeEligibility, backwardChainingQuery, evaluateFacts } from '../engine/rules';
import { solveAllocationCSP } from '../engine/cspSolver';
import { solveAllocationHillClimbing } from '../engine/hillClimber';
import { validateAllocationPlan, validateProposedOverride } from '../engine/validator';
import { Course, Faculty } from '../types';

describe('FacultyFlow AI - Core Allocation Engine Unit Tests', () => {
  it('verifies seed dataset integrity: 5 faculty, 10 courses, 37 total weekly hours', () => {
    expect(SEED_FACULTIES.length).toBe(5);
    expect(SEED_COURSES.length).toBe(10);
    const totalHours = SEED_COURSES.reduce((sum, c) => sum + c.weekly_hours, 0);
    expect(totalHours).toBe(37);
  });

  describe('Rule Engine & Eligibility Deduction', () => {
    it('proves qualified faculty is eligible for matching theory course', () => {
      const rajesh = SEED_FACULTIES.find(f => f.full_name.includes('Rajesh'))!;
      const cs501 = SEED_COURSES.find(c => c.course_code === 'CS501')!;

      const result = computeEligibility(rajesh, cs501);
      expect(result.is_eligible).toBe(true);
      expect(result.facts.qualified).toBe(true);
      expect(result.facts.available).toBe(true);
      expect(result.facts.lab_skilled).toBe(true); // Axiom: Theory does not require lab skills
    });

    it('rejects faculty when specialization does not match course', () => {
      const vikram = SEED_FACULTIES.find(f => f.full_name.includes('Vikram'))!; // Networks
      const cs501 = SEED_COURSES.find(c => c.course_code === 'CS501')!; // AI

      const result = computeEligibility(vikram, cs501);
      expect(result.is_eligible).toBe(false);
      expect(result.facts.qualified).toBe(false);
      expect(result.reason).toContain('Specialization mismatch');
    });

    it('enforces lab skill requirements for lab courses', () => {
      const karthik = SEED_FACULTIES.find(f => f.full_name.includes('Karthik'))!; // Lacks SQL
      const cs504 = SEED_COURSES.find(c => c.course_code === 'CS504')!; // Database Lab requiring SQL

      const result = computeEligibility(karthik, cs504);
      expect(result.is_eligible).toBe(false);
    });

    it('supports backward chaining with explainable proof steps', () => {
      const anita = SEED_FACULTIES.find(f => f.full_name.includes('Anita'))!;
      const cs504 = SEED_COURSES.find(c => c.course_code === 'CS504')!;

      const explanation = backwardChainingQuery(anita, cs504);
      expect(explanation.is_eligible).toBe(true);
      expect(explanation.steps.length).toBeGreaterThanOrEqual(3);
      expect(explanation.verdict).toContain('SUCCESS');
    });

    it('handles unavailable faculty correctly', () => {
      const fac: Faculty = {
        ...SEED_FACULTIES[0],
        availability: 'On Leave'
      };
      const cs501 = SEED_COURSES[0];
      const result = computeEligibility(fac, cs501);
      expect(result.is_eligible).toBe(false);
      expect(result.facts.available).toBe(false);
    });
  });

  describe('CSP Allocation Engine (MRV + Branch-and-Bound)', () => {
    it('finds a feasible allocation for all 10 courses with max load 8 hours', () => {
      const result = solveAllocationCSP(SEED_FACULTIES, SEED_COURSES);

      expect(result.feasible).toBe(true);
      expect(result.assignments.length).toBe(10);
      expect(result.objective_values.max_load).toBe(8);
      expect(result.objective_values.min_load).toBe(7);
      expect(result.objective_values.load_range).toBe(1);
      expect(result.metrics.optimality_proven).toBe(true);

      // Verify all courses are assigned
      const assignedCourseIds = new Set(result.assignments.map(a => a.course_id));
      expect(assignedCourseIds.size).toBe(10);

      // Verify total hours assigned = 37
      const totalAssigned = result.assignments.reduce((sum, a) => sum + a.weekly_hours, 0);
      expect(totalAssigned).toBe(37);
    });

    it('detects infeasible problem when total hours exceed faculty cap', () => {
      // Artificially reduce caps to 5h each (total cap = 25h < 37h)
      const constrainedFaculties = SEED_FACULTIES.map(f => ({
        ...f,
        max_weekly_hours: 5
      }));

      const result = solveAllocationCSP(constrainedFaculties, SEED_COURSES);
      expect(result.feasible).toBe(false);
      expect(result.failure_reason).toContain('exceeds');
    });

    it('detects infeasible problem when a course has no qualified faculty', () => {
      const impossibleCourse: Course = {
        id: 'crs-impossible',
        course_code: 'BIO999',
        title: 'Quantum Bioinformatics',
        course_type: 'Theory',
        weekly_hours: 4,
        required_specialization: 'Quantum Bio',
        required_lab_skills: [],
        created_at: new Date().toISOString()
      };

      const result = solveAllocationCSP(SEED_FACULTIES, [...SEED_COURSES, impossibleCourse]);
      expect(result.feasible).toBe(false);
      expect(result.blocking_courses?.length).toBeGreaterThan(0);
    });
  });

  describe('Hill Climbing with Random Restarts', () => {
    it('produces a feasible assignment respecting hard constraints', () => {
      const result = solveAllocationHillClimbing(SEED_FACULTIES, SEED_COURSES, {
        max_restarts: 6,
        max_iterations_per_restart: 40,
        seed: 42
      });

      expect(result.feasible).toBe(true);
      expect(result.assignments.length).toBe(10);
      expect(result.metrics.optimality_proven).toBe(false); // Distinction between exact CSP and local search
    });
  });

  describe('Plan Validation & HOD Overrides', () => {
    it('validates a valid plan successfully', () => {
      const cspResult = solveAllocationCSP(SEED_FACULTIES, SEED_COURSES);
      const report = validateAllocationPlan(SEED_FACULTIES, SEED_COURSES, cspResult.assignments);

      expect(report.is_valid).toBe(true);
      expect(report.total_required_hours).toBe(37);
      expect(report.total_assigned_hours).toBe(37);
      expect(report.unassigned_courses).toBe(0);
      expect(report.duplicate_courses).toBe(0);
    });

    it('rejects an override that assigns an ineligible faculty', () => {
      const cspResult = solveAllocationCSP(SEED_FACULTIES, SEED_COURSES);
      const vikram = SEED_FACULTIES.find(f => f.full_name.includes('Vikram'))!; // Networks
      const cs501 = SEED_COURSES.find(c => c.course_code === 'CS501')!; // AI

      const check = validateProposedOverride(
        SEED_FACULTIES,
        SEED_COURSES,
        cspResult.assignments,
        cs501.id,
        vikram.id,
        'HOD emergency manual reassignment'
      );

      expect(check.can_apply).toBe(false);
      expect(check.error_message).toContain('ineligible');
    });

    it('rejects an override without a justification reason', () => {
      const cspResult = solveAllocationCSP(SEED_FACULTIES, SEED_COURSES);
      const rajesh = SEED_FACULTIES[0];
      const cs501 = SEED_COURSES[0];

      const check = validateProposedOverride(
        SEED_FACULTIES,
        SEED_COURSES,
        cspResult.assignments,
        cs501.id,
        rajesh.id,
        ''
      );

      expect(check.can_apply).toBe(false);
      expect(check.error_message).toContain('reason');
    });
  });
});
