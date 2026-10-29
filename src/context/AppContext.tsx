import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Faculty,
  Course,
  AllocationPlan,
  AuditEvent,
  AppSettings,
  SolverAlgorithm,
  CourseAssignment
} from '../types';
import { StorageService } from '../services/storage';
import { solveAllocationCSP } from '../engine/cspSolver';
import { solveAllocationHillClimbing } from '../engine/hillClimber';
import { validateAllocationPlan, validateProposedOverride } from '../engine/validator';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

interface AppContextType {
  faculties: Faculty[];
  courses: Course[];
  settings: AppSettings;
  currentPlan: AllocationPlan | null;
  savedPlans: AllocationPlan[];
  auditLogs: AuditEvent[];
  isDemoMode: boolean;
  isComputing: boolean;
  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], title: string, message: string) => void;
  removeToast: (id: string) => void;
  // Faculty CRUD
  addFaculty: (faculty: Omit<Faculty, 'id' | 'created_at'>) => boolean;
  updateFaculty: (id: string, updates: Partial<Faculty>) => boolean;
  deleteFaculty: (id: string) => boolean;
  // Course CRUD
  addCourse: (course: Omit<Course, 'id' | 'created_at'>) => boolean;
  updateCourse: (id: string, updates: Partial<Course>) => boolean;
  deleteCourse: (id: string) => boolean;
  // Settings
  updateSettings: (newSettings: AppSettings) => void;
  // Plan Operations
  generateAllocation: (algorithm?: SolverAlgorithm) => Promise<{ success: boolean; error?: string }>;
  applyManualOverride: (courseId: string, newFacultyId: string, reason: string) => { success: boolean; error?: string };
  setCurrentPlan: (plan: AllocationPlan | null) => void;
  resetToDemoData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());
  const [currentPlan, setCurrentPlanState] = useState<AllocationPlan | null>(null);
  const [savedPlans, setSavedPlans] = useState<AllocationPlan[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [isDemoMode] = useState<boolean>(StorageService.isDemoMode());
  const [isComputing, setIsComputing] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Initialize storage on mount
  useEffect(() => {
    StorageService.initStorage();
    setFaculties(StorageService.getFaculties());
    setCourses(StorageService.getCourses());
    setSettings(StorageService.getSettings());
    setCurrentPlanState(StorageService.getCurrentPlan());
    setSavedPlans(StorageService.getSavedPlans());
    setAuditLogs(StorageService.getAuditLogs());
  }, []);

  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const setCurrentPlan = (plan: AllocationPlan | null) => {
    setCurrentPlanState(plan);
    StorageService.saveCurrentPlan(plan);
  };

  // Faculty CRUD
  const addFaculty = (facultyData: Omit<Faculty, 'id' | 'created_at'>): boolean => {
    // Check for duplicate code
    if (faculties.some(f => f.faculty_code.toLowerCase() === facultyData.faculty_code.toLowerCase())) {
      addToast('error', 'Duplicate Faculty Code', `Faculty code ${facultyData.faculty_code} is already in use.`);
      return false;
    }

    const newFaculty: Faculty = {
      ...facultyData,
      id: `fac-${Date.now()}`,
      created_at: new Date().toISOString()
    };

    const updated = [...faculties, newFaculty];
    setFaculties(updated);
    StorageService.saveFaculties(updated);
    StorageService.addAuditLog('FACULTY_UPDATED', `Added new faculty member: ${newFaculty.full_name} (${newFaculty.faculty_code}).`);
    setAuditLogs(StorageService.getAuditLogs());
    addToast('success', 'Faculty Added', `${newFaculty.full_name} was registered successfully.`);
    return true;
  };

  const updateFaculty = (id: string, updates: Partial<Faculty>): boolean => {
    const existing = faculties.find(f => f.id === id);
    if (!existing) return false;

    if (updates.faculty_code && updates.faculty_code.toLowerCase() !== existing.faculty_code.toLowerCase()) {
      if (faculties.some(f => f.id !== id && f.faculty_code.toLowerCase() === updates.faculty_code!.toLowerCase())) {
        addToast('error', 'Duplicate Faculty Code', `Code ${updates.faculty_code} is already assigned to another faculty.`);
        return false;
      }
    }

    const updated = faculties.map(f => (f.id === id ? { ...f, ...updates } : f));
    setFaculties(updated);
    StorageService.saveFaculties(updated);
    StorageService.addAuditLog('FACULTY_UPDATED', `Updated faculty profile: ${existing.full_name}.`);
    setAuditLogs(StorageService.getAuditLogs());
    addToast('success', 'Faculty Updated', `Changes for ${existing.full_name} have been saved.`);
    return true;
  };

  const deleteFaculty = (id: string): boolean => {
    const existing = faculties.find(f => f.id === id);
    if (!existing) return false;

    // Check if faculty is actively assigned in current plan
    if (currentPlan && currentPlan.assignments.some(a => a.faculty_id === id)) {
      addToast('error', 'Cannot Delete Faculty', `${existing.full_name} is assigned to active courses in the current allocation plan.`);
      return false;
    }

    const updated = faculties.filter(f => f.id !== id);
    setFaculties(updated);
    StorageService.saveFaculties(updated);
    StorageService.addAuditLog('FACULTY_UPDATED', `Deleted faculty member: ${existing.full_name} (${existing.faculty_code}).`);
    setAuditLogs(StorageService.getAuditLogs());
    addToast('info', 'Faculty Removed', `${existing.full_name} was removed from the department directory.`);
    return true;
  };

  // Course CRUD
  const addCourse = (courseData: Omit<Course, 'id' | 'created_at'>): boolean => {
    if (courses.some(c => c.course_code.toLowerCase() === courseData.course_code.toLowerCase())) {
      addToast('error', 'Duplicate Course Code', `Course code ${courseData.course_code} already exists.`);
      return false;
    }

    if (courseData.weekly_hours <= 0) {
      addToast('error', 'Invalid Hours', 'Weekly hours must be a positive number.');
      return false;
    }

    const newCourse: Course = {
      ...courseData,
      id: `crs-${Date.now()}`,
      created_at: new Date().toISOString()
    };

    const updated = [...courses, newCourse];
    setCourses(updated);
    StorageService.saveCourses(updated);
    StorageService.addAuditLog('COURSE_UPDATED', `Added new curriculum course: ${newCourse.course_code} - ${newCourse.title}.`);
    setAuditLogs(StorageService.getAuditLogs());
    addToast('success', 'Course Added', `${newCourse.course_code} registered successfully.`);
    return true;
  };

  const updateCourse = (id: string, updates: Partial<Course>): boolean => {
    const existing = courses.find(c => c.id === id);
    if (!existing) return false;

    if (updates.course_code && updates.course_code.toLowerCase() !== existing.course_code.toLowerCase()) {
      if (courses.some(c => c.id !== id && c.course_code.toLowerCase() === updates.course_code!.toLowerCase())) {
        addToast('error', 'Duplicate Course Code', `Course code ${updates.course_code} is already in use.`);
        return false;
      }
    }

    if (updates.weekly_hours !== undefined && updates.weekly_hours <= 0) {
      addToast('error', 'Invalid Hours', 'Weekly hours must be greater than zero.');
      return false;
    }

    const updated = courses.map(c => (c.id === id ? { ...c, ...updates } : c));
    setCourses(updated);
    StorageService.saveCourses(updated);
    StorageService.addAuditLog('COURSE_UPDATED', `Updated course details: ${existing.course_code}.`);
    setAuditLogs(StorageService.getAuditLogs());
    addToast('success', 'Course Updated', `${existing.course_code} updated successfully.`);
    return true;
  };

  const deleteCourse = (id: string): boolean => {
    const existing = courses.find(c => c.id === id);
    if (!existing) return false;

    const updated = courses.filter(c => c.id !== id);
    setCourses(updated);
    StorageService.saveCourses(updated);
    StorageService.addAuditLog('COURSE_UPDATED', `Removed course: ${existing.course_code} (${existing.title}).`);
    setAuditLogs(StorageService.getAuditLogs());
    addToast('info', 'Course Deleted', `${existing.course_code} was deleted.`);
    return true;
  };

  const updateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
    addToast('success', 'Settings Saved', 'Department policy configurations updated.');
  };

  // Plan Operations
  const generateAllocation = async (
    algorithm: SolverAlgorithm = 'csp_mrv_backtracking'
  ): Promise<{ success: boolean; error?: string }> => {
    setIsComputing(true);
    // Yield to allow UI loading state to render smoothly
    await new Promise(resolve => setTimeout(resolve, 80));

    try {
      const solverResult = algorithm === 'csp_mrv_backtracking'
        ? solveAllocationCSP(faculties, courses)
        : solveAllocationHillClimbing(faculties, courses);

      setIsComputing(false);

      if (!solverResult.feasible) {
        addToast('error', 'Allocation Failed', solverResult.failure_reason || 'No feasible assignment satisfies all hard constraints.');
        return { success: false, error: solverResult.failure_reason };
      }

      const newPlan: AllocationPlan = {
        id: `plan-${Date.now()}`,
        name: `Allocation Plan - ${algorithm === 'csp_mrv_backtracking' ? 'CSP (MRV & Branch-Bound)' : 'Hill Climbing (Random Restart)'}`,
        semester: settings.semester,
        academic_year: settings.academic_year,
        department: settings.department,
        status: 'active',
        algorithm,
        solver_metrics: solverResult.metrics,
        objective_values: solverResult.objective_values,
        assignments: solverResult.assignments,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes: `Computed in ${solverResult.metrics.elapsed_ms}ms with ${solverResult.metrics.search_nodes} search steps.`
      };

      setCurrentPlan(newPlan);
      StorageService.savePlanToList(newPlan);
      setSavedPlans(StorageService.getSavedPlans());

      StorageService.addAuditLog(
        'PLAN_GENERATED',
        `Generated AI Allocation Plan using ${algorithm}. Explored ${solverResult.metrics.search_nodes} nodes, pruned ${solverResult.metrics.branches_pruned} branches in ${solverResult.metrics.elapsed_ms}ms. Max load: ${solverResult.objective_values.max_load}h.`,
        newPlan.id
      );
      setAuditLogs(StorageService.getAuditLogs());

      addToast(
        'success',
        'Allocation Generated',
        `Optimized assignment found for all ${courses.length} courses! Max load: ${solverResult.objective_values.max_load}h.`
      );
      return { success: true };
    } catch (err: any) {
      setIsComputing(false);
      addToast('error', 'Execution Error', err.message || 'An unexpected error occurred during optimization.');
      return { success: false, error: err.message };
    }
  };

  const applyManualOverride = (
    courseId: string,
    newFacultyId: string,
    reason: string
  ): { success: boolean; error?: string } => {
    if (!currentPlan) {
      return { success: false, error: 'No active plan loaded.' };
    }

    const check = validateProposedOverride(
      faculties,
      courses,
      currentPlan.assignments,
      courseId,
      newFacultyId,
      reason
    );

    if (!check.can_apply) {
      addToast('error', 'Override Prohibited', check.error_message || 'Hard constraint violation.');
      return { success: false, error: check.error_message };
    }

    // Apply override
    const faculty = faculties.find(f => f.id === newFacultyId)!;
    const course = courses.find(c => c.id === courseId)!;

    const updatedAssignments: CourseAssignment[] = currentPlan.assignments.map(a => {
      if (a.course_id === courseId) {
        return {
          ...a,
          faculty_id: newFacultyId,
          is_manual_override: true,
          override_reason: reason.trim(),
          override_timestamp: new Date().toISOString(),
          explanation: `HOD Manual Override: Reassigned to ${faculty.full_name}. Justification: "${reason.trim()}". Passed all hard-constraint validations.`
        };
      }
      return a;
    });

    // Recompute faculty loads and objective values
    const newLoads: Record<string, number> = {};
    for (const f of faculties) newLoads[f.id] = 0;
    for (const a of updatedAssignments) {
      const c = courses.find(x => x.id === a.course_id);
      if (c) newLoads[a.faculty_id] = (newLoads[a.faculty_id] || 0) + c.weekly_hours;
    }

    const report = validateAllocationPlan(faculties, courses, updatedAssignments);

    const updatedPlan: AllocationPlan = {
      ...currentPlan,
      status: 'customized',
      assignments: updatedAssignments,
      objective_values: report.objective_values,
      updated_at: new Date().toISOString()
    };

    setCurrentPlan(updatedPlan);
    StorageService.savePlanToList(updatedPlan);
    setSavedPlans(StorageService.getSavedPlans());

    StorageService.addAuditLog(
      'ASSIGNMENT_OVERRIDDEN',
      `Manual assignment override applied for course ${course.course_code}. Reassigned to ${faculty.full_name}. Reason: "${reason.trim()}". New max load: ${report.objective_values.max_load}h.`,
      updatedPlan.id
    );
    setAuditLogs(StorageService.getAuditLogs());

    addToast('success', 'Assignment Updated', `Course ${course.course_code} reassigned to ${faculty.full_name}. Workloads re-evaluated.`);
    return { success: true };
  };

  const resetToDemoData = () => {
    const data = StorageService.resetToSeedData();
    setFaculties(data.faculties);
    setCourses(data.courses);
    setSettings(data.settings);
    setCurrentPlan(null);
    setSavedPlans([]);
    setAuditLogs(StorageService.getAuditLogs());
    addToast('info', 'Demo Data Restored', 'Fictional 5 faculty & 10 courses seed dataset restored.');
  };

  return (
    <AppContext.Provider
      value={{
        faculties,
        courses,
        settings,
        currentPlan,
        savedPlans,
        auditLogs,
        isDemoMode,
        isComputing,
        toasts,
        addToast,
        removeToast,
        addFaculty,
        updateFaculty,
        deleteFaculty,
        addCourse,
        updateCourse,
        deleteCourse,
        updateSettings,
        generateAllocation,
        applyManualOverride,
        setCurrentPlan,
        resetToDemoData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
