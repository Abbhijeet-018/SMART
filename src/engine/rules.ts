import { Faculty, Course, EligibilityResult, EligibilityFactCheck } from '../types';

/**
 * Knowledge Base Predicates:
 * 1. Qualified(f, c) :- faculty f possesses required specialization of course c.
 * 2. Available(f)    :- faculty f status is 'Available'.
 * 3. LabSkilled(f, c):- course c is 'Theory' OR (course c is 'Lab' AND faculty f has all required lab skills).
 * 4. Restricted(f, c):- course c has explicit eligible faculty restriction and f is in that list.
 * 5. Eligible(f, c)  :- Available(f) ∧ Qualified(f, c) ∧ LabSkilled(f, c) ∧ Restricted(f, c).
 */

export interface BackwardProofStep {
  subgoal: string;
  result: boolean;
  premise: string;
  evidence: string;
}

export interface BackwardExplanation {
  goal: string;
  faculty_name: string;
  course_code: string;
  is_eligible: boolean;
  steps: BackwardProofStep[];
  verdict: string;
}

/**
 * Evaluates individual facts for a faculty-course pair
 */
export function evaluateFacts(faculty: Faculty, course: Course): EligibilityFactCheck {
  // 1. Qualified check: faculty's specializations contain course's required_specialization (case-insensitive substring or exact match)
  const reqSpec = course.required_specialization.trim().toLowerCase();
  const qualified = faculty.specializations.some(s => {
    const sLow = s.trim().toLowerCase();
    return sLow === reqSpec || sLow.includes(reqSpec) || reqSpec.includes(sLow);
  });

  // 2. Available check
  const available = faculty.availability === 'Available';

  // 3. Lab skills check:
  // Theory courses do NOT require lab skills.
  // Lab courses require ALL specified lab skills.
  let lab_skilled = true;
  if (course.course_type === 'Lab') {
    if (course.required_lab_skills.length === 0) {
      lab_skilled = true;
    } else {
      const facSkillsLower = faculty.lab_skills.map(skill => skill.trim().toLowerCase());
      lab_skilled = course.required_lab_skills.every(reqSkill =>
        facSkillsLower.includes(reqSkill.trim().toLowerCase())
      );
    }
  }

  // 4. Restricted list check (optional course restriction)
  let meets_restrictions = true;
  if (course.eligible_faculty_restrictions && course.eligible_faculty_restrictions.length > 0) {
    meets_restrictions = course.eligible_faculty_restrictions.includes(faculty.id);
  }

  return { qualified, available, lab_skilled, meets_restrictions };
}

/**
 * Backward Chaining Query:
 * Goal: Prove Eligible(faculty, course)
 * Steps query subgoals in logical order: Available -> Qualified -> LabSkilled -> Restricted
 */
export function backwardChainingQuery(faculty: Faculty, course: Course): BackwardExplanation {
  const facts = evaluateFacts(faculty, course);
  const steps: BackwardProofStep[] = [];

  // Subgoal 1: Available(faculty)
  steps.push({
    subgoal: `Available(${faculty.faculty_code})`,
    result: facts.available,
    premise: `Faculty must have active availability status.`,
    evidence: facts.available
      ? `Faculty is currently marked as 'Available'.`
      : `Faculty status is '${faculty.availability}' (not 'Available').`
  });

  // Subgoal 2: Qualified(faculty, course)
  const reqSpec = course.required_specialization;
  steps.push({
    subgoal: `Qualified(${faculty.faculty_code}, ${course.course_code})`,
    result: facts.qualified,
    premise: `Faculty specializations must include '${reqSpec}'.`,
    evidence: facts.qualified
      ? `Faculty has matching specialization among [${faculty.specializations.join(', ')}].`
      : `Specialization mismatch. Faculty has [${faculty.specializations.join(', ')}], which does not cover '${reqSpec}'.`
  });

  // Subgoal 3: LabSkilled(faculty, course)
  if (course.course_type === 'Theory') {
    steps.push({
      subgoal: `LabSkilled(${faculty.faculty_code}, ${course.course_code})`,
      result: true,
      premise: `Course is of type 'Theory'. Lab skills are not required for theory courses.`,
      evidence: `Theory course axiom: ∀f LabSkilled(f, c) where c.type = 'Theory'.`
    });
  } else {
    const facSkillsLower = faculty.lab_skills.map(s => s.trim().toLowerCase());
    const missingSkills = course.required_lab_skills.filter(
      req => !facSkillsLower.includes(req.trim().toLowerCase())
    );
    steps.push({
      subgoal: `LabSkilled(${faculty.faculty_code}, ${course.course_code})`,
      result: facts.lab_skilled,
      premise: `Lab course requires faculty to possess all required tool/software skills: [${course.required_lab_skills.join(', ')}].`,
      evidence: facts.lab_skilled
        ? `Faculty possesses all required lab skills: [${course.required_lab_skills.join(', ')}].`
        : `Missing required lab skill(s): [${missingSkills.join(', ')}]. Faculty only has: [${faculty.lab_skills.join(', ')}].`
    });
  }

  // Subgoal 4: Meets restriction (if any)
  if (course.eligible_faculty_restrictions && course.eligible_faculty_restrictions.length > 0) {
    steps.push({
      subgoal: `EligibleRestriction(${faculty.faculty_code}, ${course.course_code})`,
      result: facts.meets_restrictions,
      premise: `Course has an explicit restriction list.`,
      evidence: facts.meets_restrictions
        ? `Faculty ID ${faculty.id} is present in explicit eligible list.`
        : `Faculty ID ${faculty.id} is NOT in explicit course restriction whitelist.`
    });
  }

  const is_eligible = facts.available && facts.qualified && facts.lab_skilled && facts.meets_restrictions;

  let verdict: string;
  if (is_eligible) {
    verdict = `SUCCESS: Eligible(${faculty.faculty_code}, ${course.course_code}) proven valid through rule satisfaction.`;
  } else {
    const failedSteps = steps.filter(s => !s.result).map(s => s.subgoal);
    verdict = `FAILED: Ineligible. Subgoals failed: ${failedSteps.join(' ∧ ')}.`;
  }

  return {
    goal: `Eligible(${faculty.faculty_code}, ${course.course_code})`,
    faculty_name: faculty.full_name,
    course_code: course.course_code,
    is_eligible,
    steps,
    verdict
  };
}

/**
 * Computes eligibility for a single pair and generates forward reasoning trace
 */
export function computeEligibility(faculty: Faculty, course: Course): EligibilityResult {
  const facts = evaluateFacts(faculty, course);
  const proof_trace: string[] = [];

  // Step 1: Availability
  if (facts.available) {
    proof_trace.push(`Fact: Available(${faculty.faculty_code}) is TRUE.`);
  } else {
    proof_trace.push(`Fact: Available(${faculty.faculty_code}) is FALSE (${faculty.availability}).`);
  }

  // Step 2: Qualification
  if (facts.qualified) {
    proof_trace.push(`Fact: Qualified(${faculty.faculty_code}, ${course.course_code}) is TRUE. Matches specialization '${course.required_specialization}'.`);
  } else {
    proof_trace.push(`Fact: Qualified(${faculty.faculty_code}, ${course.course_code}) is FALSE. Lacks specialization '${course.required_specialization}'.`);
  }

  // Step 3: Lab Skills
  if (course.course_type === 'Theory') {
    proof_trace.push(`Rule: Course is Theory -> LabSkilled(${faculty.faculty_code}, ${course.course_code}) trivially TRUE.`);
  } else {
    if (facts.lab_skilled) {
      proof_trace.push(`Fact: LabSkilled(${faculty.faculty_code}, ${course.course_code}) is TRUE. Faculty has [${course.required_lab_skills.join(', ')}].`);
    } else {
      proof_trace.push(`Fact: LabSkilled(${faculty.faculty_code}, ${course.course_code}) is FALSE. Missing required lab skills.`);
    }
  }

  const is_eligible = facts.available && facts.qualified && facts.lab_skilled && facts.meets_restrictions;

  let reason = 'Eligible: Meets all academic, availability, and lab competency requirements.';
  if (!facts.available) {
    reason = `Ineligible: Faculty unavailable (${faculty.availability}).`;
  } else if (!facts.qualified) {
    reason = `Ineligible: Specialization mismatch. Needs '${course.required_specialization}'.`;
  } else if (!facts.lab_skilled) {
    reason = `Ineligible: Missing required lab skills for ${course.course_code}.`;
  } else if (!facts.meets_restrictions) {
    reason = `Ineligible: Excluded by department course restrictions.`;
  }

  if (is_eligible) {
    proof_trace.push(`Conclusion: Eligible(${faculty.faculty_code}, ${course.course_code}) holds by conjunction of axioms.`);
  } else {
    proof_trace.push(`Conclusion: Ineligible(${faculty.faculty_code}, ${course.course_code}) due to unsatisfied condition: ${reason}`);
  }

  return {
    faculty_id: faculty.id,
    course_id: course.id,
    is_eligible,
    facts,
    reason,
    proof_trace
  };
}

/**
 * Forward Chaining:
 * Derives the complete eligibility matrix for all (faculty, course) combinations.
 */
export function buildEligibilityMatrix(
  faculties: Faculty[],
  courses: Course[]
): Map<string, EligibilityResult> {
  const matrix = new Map<string, EligibilityResult>();

  for (const faculty of faculties) {
    for (const course of courses) {
      const key = `${faculty.id}::${course.id}`;
      const result = computeEligibility(faculty, course);
      matrix.set(key, result);
    }
  }

  return matrix;
}

/**
 * Returns a list of all eligible faculty for a course
 */
export function getEligibleFacultiesForCourse(
  course: Course,
  faculties: Faculty[]
): Faculty[] {
  return faculties.filter(faculty => {
    const res = computeEligibility(faculty, course);
    return res.is_eligible;
  });
}
