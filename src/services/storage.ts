import { Faculty, Course, AllocationPlan, AuditEvent, AppSettings } from '../types';
import { SEED_FACULTIES, SEED_COURSES, INITIAL_SETTINGS } from '../data/seedData';
import { isSupabaseConfigured, supabase } from './supabaseClient';

const STORAGE_KEYS = {
  FACULTIES: 'facultyflow_faculties_v1',
  COURSES: 'facultyflow_courses_v1',
  SETTINGS: 'facultyflow_settings_v1',
  CURRENT_PLAN: 'facultyflow_current_plan_v1',
  SAVED_PLANS: 'facultyflow_saved_plans_v1',
  AUDIT_LOGS: 'facultyflow_audit_logs_v1',
  IS_INITIALIZED: 'facultyflow_initialized_v1'
};

export const StorageService = {
  isDemoMode(): boolean {
    return !isSupabaseConfigured;
  },

  initStorage(): void {
    if (!localStorage.getItem(STORAGE_KEYS.IS_INITIALIZED)) {
      this.resetToSeedData();
    }
  },

  resetToSeedData(): { faculties: Faculty[]; courses: Course[]; settings: AppSettings } {
    localStorage.setItem(STORAGE_KEYS.FACULTIES, JSON.stringify(SEED_FACULTIES));
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(SEED_COURSES));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    localStorage.removeItem(STORAGE_KEYS.CURRENT_PLAN);
    localStorage.removeItem(STORAGE_KEYS.SAVED_PLANS);

    const initialAudit: AuditEvent[] = [
      {
        id: 'evt-init',
        action: 'DATA_RESET',
        details: 'Initial academic seed dataset configured with 5 faculty and 10 courses (37 weekly teaching hours).',
        performed_by: 'System Initializer',
        timestamp: new Date().toISOString()
      }
    ];
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(initialAudit));
    localStorage.setItem(STORAGE_KEYS.IS_INITIALIZED, 'true');

    return {
      faculties: SEED_FACULTIES,
      courses: SEED_COURSES,
      settings: INITIAL_SETTINGS
    };
  },

  getFaculties(): Faculty[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FACULTIES);
      return data ? JSON.parse(data) : SEED_FACULTIES;
    } catch {
      return SEED_FACULTIES;
    }
  },

  saveFaculties(faculties: Faculty[]): void {
    localStorage.setItem(STORAGE_KEYS.FACULTIES, JSON.stringify(faculties));
  },

  getCourses(): Course[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.COURSES);
      return data ? JSON.parse(data) : SEED_COURSES;
    } catch {
      return SEED_COURSES;
    }
  },

  saveCourses(courses: Course[]): void {
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
  },

  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  },

  saveSettings(settings: AppSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  getCurrentPlan(): AllocationPlan | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_PLAN);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveCurrentPlan(plan: AllocationPlan | null): void {
    if (plan) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_PLAN, JSON.stringify(plan));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_PLAN);
    }
  },

  getSavedPlans(): AllocationPlan[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SAVED_PLANS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  savePlanToList(plan: AllocationPlan): void {
    const list = this.getSavedPlans();
    const existingIndex = list.findIndex(p => p.id === plan.id);
    if (existingIndex >= 0) {
      list[existingIndex] = plan;
    } else {
      list.unshift(plan);
    }
    localStorage.setItem(STORAGE_KEYS.SAVED_PLANS, JSON.stringify(list));
  },

  getAuditLogs(): AuditEvent[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addAuditLog(action: AuditEvent['action'], details: string, planId?: string): void {
    const logs = this.getAuditLogs();
    const newLog: AuditEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      plan_id: planId,
      action,
      details,
      performed_by: 'Head of Department (HOD)',
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog);
    // Keep last 100 entries
    if (logs.length > 100) logs.pop();
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
  }
};
