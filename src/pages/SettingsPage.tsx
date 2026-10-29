import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Sliders,
  Calendar,
  Building,
  RotateCcw,
  Save,
  CheckCircle2,
  Info,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppSettings, DesignationCaps } from '../types';
import { Badge } from '../components/common/Badge';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, resetToDemoData, addToast } = useApp();

  const [formData, setFormData] = useState<AppSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  const handleCapChange = (designation: keyof DesignationCaps, value: number) => {
    setFormData(prev => ({
      ...prev,
      designation_caps: {
        ...prev.designation_caps,
        [designation]: Number(value)
      }
    }));
    setHasChanges(true);
  };

  const handlePreferenceToggle = (key: keyof AppSettings['optimization_preferences']) => {
    setFormData(prev => ({
      ...prev,
      optimization_preferences: {
        ...prev.optimization_preferences,
        [key]: !prev.optimization_preferences[key]
      }
    }));
    setHasChanges(true);
  };

  const handleHardConstraintToggle = (key: keyof AppSettings['hard_constraints']) => {
    setFormData(prev => ({
      ...prev,
      hard_constraints: {
        ...prev.hard_constraints,
        [key]: !prev.hard_constraints[key]
      }
    }));
    setHasChanges(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const { Professor, 'Associate Professor': Assoc, 'Assistant Professor': Asst } = formData.designation_caps;
    if (Professor <= 0 || Assoc <= 0 || Asst <= 0) {
      addToast('error', 'Invalid Caps', 'Teaching hour caps must be strictly positive numbers.');
      return;
    }

    updateSettings(formData);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Rules & Policy Settings</h1>
            <Badge variant="neutral" size="sm">Department Policy Configuration</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Configure designation weekly teaching caps, academic semester metadata, hard feasibility constraints, and soft fairness optimization preferences.
          </p>
        </div>

        <button
          onClick={() => {
            if (window.confirm('Reset all department policies and data to standard seed dataset?')) {
              resetToDemoData();
            }
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs self-start sm:self-auto"
        >
          <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
          <span>Restore Default Policies</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Department & Semester Info */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Building className="h-4 w-4 text-indigo-600" />
            <span>Academic Department & Term Configuration</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={e => {
                  setFormData({ ...formData, department: e.target.value });
                  setHasChanges(true);
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Active Semester Term</label>
              <input
                type="text"
                value={formData.semester}
                onChange={e => {
                  setFormData({ ...formData, semester: e.target.value });
                  setHasChanges(true);
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Academic Year</label>
              <input
                type="text"
                value={formData.academic_year}
                onChange={e => {
                  setFormData({ ...formData, academic_year: e.target.value });
                  setHasChanges(true);
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Workload Caps by Designation */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-indigo-600" />
              <span>Configurable Weekly Teaching Hour Caps (by Faculty Designation)</span>
            </h2>
            <Badge variant="neutral" size="sm">Sample Project Defaults</Badge>
          </div>
          <p className="text-xs text-slate-500">
            Set maximum weekly teaching workload caps by cadre. Default benchmark values are Professor 14h, Associate Professor 14h, and Assistant Professor 16h.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <label className="block font-bold text-slate-900 mb-1">Professor</label>
              <span className="text-[11px] text-slate-500 block mb-2">Research & Administrative Allowance</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="4"
                  max="30"
                  value={formData.designation_caps.Professor}
                  onChange={e => handleCapChange('Professor', Number(e.target.value))}
                  className="w-24 px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold text-slate-900"
                />
                <span className="text-slate-600 font-medium">hours / week</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <label className="block font-bold text-slate-900 mb-1">Associate Professor</label>
              <span className="text-[11px] text-slate-500 block mb-2">Core Theory & Lab Supervision</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="4"
                  max="30"
                  value={formData.designation_caps['Associate Professor']}
                  onChange={e => handleCapChange('Associate Professor', Number(e.target.value))}
                  className="w-24 px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold text-slate-900"
                />
                <span className="text-slate-600 font-medium">hours / week</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <label className="block font-bold text-slate-900 mb-1">Assistant Professor</label>
              <span className="text-[11px] text-slate-500 block mb-2">Teaching & Practical Laboratory Load</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="4"
                  max="30"
                  value={formData.designation_caps['Assistant Professor']}
                  onChange={e => handleCapChange('Assistant Professor', Number(e.target.value))}
                  className="w-24 px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold text-slate-900"
                />
                <span className="text-slate-600 font-medium">hours / week</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hard Constraints vs Soft Preferences */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Hard Constraints */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-600" />
                <span>Hard Feasibility Constraints (Non-Negotiable)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Plans violating any active hard constraint will be flagged as Infeasible and rejected by the solver.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.hard_constraints.enforce_caps}
                  onChange={() => handleHardConstraintToggle('enforce_caps')}
                  className="mt-0.5 h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-semibold text-slate-900 block">Strict Weekly Workload Caps</span>
                  <span className="text-slate-500">
                    Never assign a teaching course if total hours exceed faculty member's max cap.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.hard_constraints.require_qualification}
                  onChange={() => handleHardConstraintToggle('require_qualification')}
                  className="mt-0.5 h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-semibold text-slate-900 block">Academic Specialization Matching</span>
                  <span className="text-slate-500">
                    Enforce Qualified(f, c) rule for theory and lab curriculum disciplines.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.hard_constraints.require_lab_skills}
                  onChange={() => handleHardConstraintToggle('require_lab_skills')}
                  className="mt-0.5 h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-semibold text-slate-900 block">Laboratory Software Competency</span>
                  <span className="text-slate-500">
                    Require all specified software/tool competencies for lab-type courses.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.hard_constraints.require_availability}
                  onChange={() => handleHardConstraintToggle('require_availability')}
                  className="mt-0.5 h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-semibold text-slate-900 block">Active Availability Check</span>
                  <span className="text-slate-500">
                    Prohibit course assignment to faculty on sabbatical or medical leave.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Right: Soft Preferences */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-indigo-600" />
                <span>Soft Optimization Preferences (Fairness Objectives)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Guiding priorities used to discriminate among multiple feasible schedules.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.optimization_preferences.minimize_max_load}
                  onChange={() => handlePreferenceToggle('minimize_max_load')}
                  className="mt-0.5 h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-semibold text-slate-900 block">Minimax Peak Load Objective</span>
                  <span className="text-slate-500">
                    Primary lexicographic goal: Minimize max(L) across all faculty members.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.optimization_preferences.minimize_variance}
                  onChange={() => handlePreferenceToggle('minimize_variance')}
                  className="mt-0.5 h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-semibold text-slate-900 block">Workload Variance Minimization (σ²)</span>
                  <span className="text-slate-500">
                    Secondary tie-breaker: Minimize variance to spread hours equally across cadre.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.optimization_preferences.balance_theory_lab}
                  onChange={() => handlePreferenceToggle('balance_theory_lab')}
                  className="mt-0.5 h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-semibold text-slate-900 block">Equitable Theory vs Lab Distribution</span>
                  <span className="text-slate-500">
                    Distribute practical lab batches evenly rather than burdening junior faculty.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {hasChanges ? 'You have unsaved changes in policy settings.' : 'All policy settings are up to date.'}
          </span>

          <button
            type="submit"
            disabled={!hasChanges}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>Save Department Policy</span>
          </button>
        </div>
      </form>
    </div>
  );
};
