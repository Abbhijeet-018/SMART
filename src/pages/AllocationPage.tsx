import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Cpu,
  Layers,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  GitBranch,
  Flame,
  HelpCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SolverAlgorithm } from '../types';
import { Badge } from '../components/common/Badge';
import { validateAllocationPlan } from '../engine/validator';
import { solveAllocationCSP } from '../engine/cspSolver';
import { solveAllocationHillClimbing } from '../engine/hillClimber';

export const AllocationPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    faculties,
    courses,
    currentPlan,
    generateAllocation,
    isComputing,
    resetToDemoData,
    addToast
  } = useApp();

  const [selectedAlgorithm, setSelectedAlgorithm] = useState<SolverAlgorithm>('csp_mrv_backtracking');
  const [comparisonResults, setComparisonResults] = useState<{
    csp?: any;
    hillClimbing?: any;
  }>({});
  const [isComparing, setIsComparing] = useState(false);
  const [validationReport, setValidationReport] = useState<any>(null);

  // Workflow steps definition
  const currentStep = !currentPlan ? 3 : 4;
  const steps = [
    { number: 1, title: 'Review Data', desc: `${faculties.length} Faculty, ${courses.length} Courses`, href: '/faculty' },
    { number: 2, title: 'Check Eligibility', desc: 'Verify Specialization & Lab Skills', href: '/eligibility' },
    { number: 3, title: 'Generate Allocation', desc: 'CSP Solver or Hill Climbing', active: true },
    { number: 4, title: 'Results & Schedule', desc: 'Inspect Loads & Adjustments', href: '/results' }
  ];

  const handleGenerate = async () => {
    const res = await generateAllocation(selectedAlgorithm);
    if (res.success) {
      navigate('/results');
    }
  };

  const handleRunComparison = async () => {
    setIsComparing(true);
    await new Promise(r => setTimeout(r, 80));

    try {
      const cspRes = solveAllocationCSP(faculties, courses);
      const hcRes = solveAllocationHillClimbing(faculties, courses, { seed: 1024 });

      setComparisonResults({
        csp: cspRes,
        hillClimbing: hcRes
      });
      addToast('success', 'Plan Comparison Completed', 'Compared CSP Branch-and-Bound against Hill Climbing.');
    } catch (e: any) {
      addToast('error', 'Comparison Failed', e.message);
    } finally {
      setIsComparing(false);
    }
  };

  const handleRunValidation = () => {
    if (!currentPlan) {
      addToast('warning', 'No Active Plan', 'Please generate an allocation plan first before running validation.');
      return;
    }
    const report = validateAllocationPlan(faculties, courses, currentPlan.assignments);
    setValidationReport(report);
    if (report.is_valid) {
      addToast('success', 'Validation Passed', 'All hard constraints, workload caps, and prerequisites satisfied.');
    } else {
      addToast('error', 'Validation Failed', report.error_summary || 'Hard constraint violations found.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                AI Allocation Engine & Solver
              </h1>
              <Badge variant="primary" size="sm">Exact CSP & Local Search</Badge>
            </div>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Select an optimization algorithm to generate a mathematically sound, balanced teaching schedule respecting faculty caps and curriculum requirements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRunComparison}
              disabled={isComparing || isComputing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 transition-colors shadow-2xs disabled:opacity-50"
            >
              <GitBranch className="h-3.5 w-3.5 text-slate-500" />
              <span>{isComparing ? 'Comparing...' : 'Compare Algorithms'}</span>
            </button>

            <button
              onClick={handleRunValidation}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 transition-colors shadow-2xs"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
              <span>Run Validation</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm('Reset dataset to initial 5 faculty and 10 courses?')) {
                  resetToDemoData();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 transition-colors shadow-2xs"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
              <span>Reset Demo Data</span>
            </button>
          </div>
        </div>

        {/* Workflow Stepper */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {steps.map(step => {
              const isPast = step.number < currentStep;
              const isCurrent = step.number === currentStep;

              return (
                <div
                  key={step.number}
                  className={`p-3 rounded-lg border transition-all ${
                    isCurrent
                      ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900 shadow-2xs'
                      : isPast
                      ? 'bg-slate-50/60 border-slate-200 text-slate-700'
                      : 'bg-white border-slate-100 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isCurrent
                          ? 'bg-indigo-600 text-white'
                          : isPast
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isPast ? '✓' : step.number}
                    </span>
                    <span className="text-xs font-semibold">{step.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Algorithm Selection & Run Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Algorithm Selector & Launch */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Choose Allocation Optimization Algorithm
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Algorithm Option 1: CSP MRV Backtracking */}
              <div
                onClick={() => setSelectedAlgorithm('csp_mrv_backtracking')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedAlgorithm === 'csp_mrv_backtracking'
                    ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                      <Cpu className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-900">
                      Constraint Satisfaction (CSP)
                    </span>
                  </div>
                  <Badge variant="primary" size="sm">Recommended</Badge>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Minimum Remaining Values (MRV) heuristic with Forward Checking and Branch-and-Bound pruning. Lexicographically minimizes max load, then variance.
                </p>
                <div className="mt-3 pt-2 border-t border-slate-200/50 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Guarantees: Global Optimality</span>
                  <span className="font-semibold text-indigo-600">Exact Solver</span>
                </div>
              </div>

              {/* Algorithm Option 2: Hill Climbing with Restarts */}
              <div
                onClick={() => setSelectedAlgorithm('hill_climbing_restart')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedAlgorithm === 'hill_climbing_restart'
                    ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Flame className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-900">
                      Hill Climbing (Random Restarts)
                    </span>
                  </div>
                  <Badge variant="warning" size="sm">Heuristic</Badge>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Iterative local search with seeded random restarts and neighborhood course-swap moves. Good for very large faculty spaces.
                </p>
                <div className="mt-3 pt-2 border-t border-slate-200/50 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Guarantees: Feasible Local Optimum</span>
                  <span className="font-semibold text-amber-600">Approximate</span>
                </div>
              </div>
            </div>

            {/* Launch Button */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Ready to allocate <strong>{courses.length} courses</strong> ({courses.reduce((sum, c) => sum + c.weekly_hours, 0)} hours) across <strong>{faculties.length} faculty</strong>.
              </div>

              <button
                onClick={handleGenerate}
                disabled={isComputing}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                <span>{isComputing ? 'Computing Optimal Plan...' : 'Generate Allocation Now'}</span>
              </button>
            </div>
          </div>

          {/* Algorithm Comparison Table if executed */}
          {comparisonResults.csp && comparisonResults.hillClimbing && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-indigo-600" />
                <span>Measured Algorithm Comparison (Empirical Benchmarks)</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Algorithm</th>
                      <th className="px-3 py-2 font-semibold">Search Steps / Nodes</th>
                      <th className="px-3 py-2 font-semibold">Branches Pruned</th>
                      <th className="px-3 py-2 font-semibold">Elapsed Time</th>
                      <th className="px-3 py-2 font-semibold text-center">Max Load</th>
                      <th className="px-3 py-2 font-semibold text-center">Variance (σ²)</th>
                      <th className="px-3 py-2 font-semibold">Optimality Proven</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr className="bg-indigo-50/20">
                      <td className="px-3 py-2.5 font-bold text-indigo-700">CSP (MRV & Branch-Bound)</td>
                      <td className="px-3 py-2.5 font-mono">{comparisonResults.csp.metrics.search_nodes} steps</td>
                      <td className="px-3 py-2.5 font-mono text-emerald-600">{comparisonResults.csp.metrics.branches_pruned} pruned</td>
                      <td className="px-3 py-2.5 font-mono font-semibold">{comparisonResults.csp.metrics.elapsed_ms} ms</td>
                      <td className="px-3 py-2.5 text-center font-bold font-mono text-emerald-700">{comparisonResults.csp.objective_values.max_load} hrs</td>
                      <td className="px-3 py-2.5 text-center font-mono">{comparisonResults.csp.objective_values.variance}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant="success" size="sm">Yes (Exact)</Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2.5 font-bold text-amber-700">Hill Climbing (Restarts)</td>
                      <td className="px-3 py-2.5 font-mono">{comparisonResults.hillClimbing.metrics.search_nodes} iterations</td>
                      <td className="px-3 py-2.5 font-mono text-slate-400">N/A (Local Search)</td>
                      <td className="px-3 py-2.5 font-mono font-semibold">{comparisonResults.hillClimbing.metrics.elapsed_ms} ms</td>
                      <td className="px-3 py-2.5 text-center font-bold font-mono">{comparisonResults.hillClimbing.objective_values.max_load} hrs</td>
                      <td className="px-3 py-2.5 text-center font-mono">{comparisonResults.hillClimbing.objective_values.variance}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant="warning" size="sm">No (Heuristic)</Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Active Plan Solver Metrics & Validation Summary */}
        <div className="space-y-4">
          {currentPlan ? (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-900">Current Measured Run Metrics</span>
                <Badge
                  variant={currentPlan.solver_metrics.optimality_proven ? 'success' : 'warning'}
                  size="sm"
                >
                  {currentPlan.solver_metrics.optimality_proven ? 'Optimal Proven' : 'Feasible'}
                </Badge>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Algorithm:</span>
                  <span className="font-semibold text-slate-900">
                    {currentPlan.algorithm === 'csp_mrv_backtracking' ? 'CSP (MRV + Bound)' : 'Hill Climbing'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Search Nodes Explored:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {currentPlan.solver_metrics.search_nodes} nodes
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Branches Pruned:</span>
                  <span className="font-mono font-semibold text-indigo-600">
                    {currentPlan.solver_metrics.branches_pruned} branches
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Computation Time:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {currentPlan.solver_metrics.elapsed_ms} ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Max Assigned Load:</span>
                  <span className="font-bold text-emerald-600">
                    {currentPlan.objective_values.max_load} hrs/wk
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Min Assigned Load:</span>
                  <span className="font-medium text-slate-700">
                    {currentPlan.objective_values.min_load} hrs/wk
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Load Variance (σ²):</span>
                  <span className="font-mono font-medium text-slate-700">
                    {currentPlan.objective_values.variance}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  onClick={() => navigate('/results')}
                  className="w-full py-2 px-3 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Inspect Results & Explainability</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs text-center py-8">
              <Cpu className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <h4 className="text-xs font-semibold text-slate-700">No Allocation Generated Yet</h4>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                Click 'Generate Allocation Now' to execute the CSP constraint engine on the current faculty and course dataset.
              </p>
            </div>
          )}

          {/* Validation Report Widget */}
          {validationReport && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs text-xs space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-semibold text-slate-900">Constraint Validation Audit</span>
                <Badge variant={validationReport.is_valid ? 'success' : 'danger'} size="sm">
                  {validationReport.is_valid ? 'Passed' : 'Violations'}
                </Badge>
              </div>
              <div className="space-y-1.5">
                {validationReport.checks.map((chk: any) => (
                  <div key={chk.id} className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-600">{chk.name}</span>
                    <span className={chk.status === 'passed' ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                      {chk.status === 'passed' ? '✓ Passed' : '✗ Failed'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
