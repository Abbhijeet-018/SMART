import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  Cpu,
  Layers
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import { useApp } from '../context/AppContext';
import { BENCHMARK_REFERENCE } from '../data/seedData';
import { Badge } from '../components/common/Badge';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    faculties,
    courses,
    currentPlan,
    generateAllocation,
    isComputing,
    auditLogs
  } = useApp();

  const totalCourseHours = courses.reduce((sum, c) => sum + c.weekly_hours, 0);
  const totalCapacity = faculties.reduce((sum, f) => sum + f.max_weekly_hours, 0);
  const theoryCount = courses.filter(c => c.course_type === 'Theory').length;
  const labCount = courses.filter(c => c.course_type === 'Lab').length;

  // Faculty workload statistics
  const facultyWorkloadData = faculties.map(f => {
    let assignedHours = 0;
    if (currentPlan) {
      assignedHours = currentPlan.assignments
        .filter(a => a.faculty_id === f.id)
        .reduce((sum, a) => sum + a.weekly_hours, 0);
    }
    const utilization = f.max_weekly_hours > 0 ? (assignedHours / f.max_weekly_hours) * 100 : 0;
    return {
      id: f.id,
      name: f.full_name.replace('Dr. ', '').replace('Prof. ', ''),
      fullName: f.full_name,
      designation: f.designation,
      assigned: assignedHours,
      max: f.max_weekly_hours,
      utilization: Number(utilization.toFixed(1)),
      isOverCap: assignedHours > f.max_weekly_hours
    };
  });

  const overCapCount = facultyWorkloadData.filter(d => d.isOverCap).length;
  const assignedCoursesCount = currentPlan ? currentPlan.assignments.length : 0;
  const totalAssignedHours = facultyWorkloadData.reduce((sum, f) => sum + f.assigned, 0);
  const overallUtilization = totalCapacity > 0 ? ((totalAssignedHours / totalCapacity) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Faculty Workload & AI Allocation Overview
            </h1>
            <Badge variant="primary" size="sm">Automated Decision Support</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Intelligent constraint-satisfaction engine to balance teaching hours, honor specialization, and maintain faculty workload fairness under HOD authority.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/allocation')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-xs transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            <span>Generate AI Allocation</span>
          </button>
          {currentPlan && (
            <button
              onClick={() => navigate('/results')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm border border-slate-200 transition-colors shadow-2xs"
            >
              <span>View Results</span>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Faculty */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Faculty</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{faculties.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">All {faculties.length} available</div>
        </div>

        {/* Total Courses */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Curriculum Courses</span>
            <BookOpen className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{courses.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">{theoryCount} Theory, {labCount} Lab</div>
        </div>

        {/* Weekly Teaching Hours */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Curriculum Hours</span>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalCourseHours}h</div>
          <div className="text-[11px] text-slate-500 mt-1">Total weekly demand</div>
        </div>

        {/* Courses Assigned */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Courses Assigned</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {assignedCoursesCount} <span className="text-sm font-normal text-slate-400">/ {courses.length}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {assignedCoursesCount === courses.length && courses.length > 0
              ? '100% courses allocated'
              : `${courses.length - assignedCoursesCount} courses pending`}
          </div>
        </div>

        {/* Cap Violations */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Cap Compliance</span>
            {overCapCount > 0 ? (
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            )}
          </div>
          <div className={`text-2xl font-bold ${overCapCount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            {overCapCount === 0 ? '0 Exceeded' : `${overCapCount} Exceeded`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Hard cap limits verified</div>
        </div>

        {/* Allocation Status */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Plan Status</span>
            <Layers className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-sm font-bold text-slate-900 mt-1">
            {currentPlan ? (
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs uppercase font-bold tracking-wider ${
                  currentPlan.status === 'customized'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {currentPlan.status === 'customized' ? 'Customized' : 'Active Plan'}
              </span>
            ) : (
              <span className="text-xs text-slate-400">No active plan</span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {currentPlan ? 'AI schedule ready' : 'Run allocation engine'}
          </div>
        </div>
      </div>

      {/* Main Charts & Workload Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Workload vs Max Cap Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Workload Distribution (Assigned Hours vs. Maximum Allowed Hours)
              </h2>
              <p className="text-xs text-slate-500">
                Visualizing individual faculty teaching load against individual department caps
              </p>
            </div>
            {currentPlan && (
              <Badge variant="success" size="sm">
                Peak Load: {currentPlan.objective_values.max_load}h
              </Badge>
            )}
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={facultyWorkloadData}
                margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#475569' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 18]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    borderColor: '#e2e8f0',
                    fontSize: '12px'
                  }}
                  formatter={(val: any, name: any) => [
                    `${val} hrs/wk`,
                    name === 'assigned' ? 'Assigned Hours' : 'Maximum Cap'
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  formatter={(value: string) => (value === 'assigned' ? 'Assigned Teaching Hours' : 'Max Cap')}
                />
                <Bar dataKey="assigned" fill="#4f46e5" radius={[4, 4, 0, 0]} name="assigned" />
                <Bar dataKey="max" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="max" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Department Capacity & Summary */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-1">
              Workload Utilization & Capacity
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Aggregate teaching hour deployment across CSE faculty
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700">Department Teaching Load</span>
                  <span className="font-bold text-slate-900">{overallUtilization}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all"
                    style={{ width: `${Math.min(Number(overallUtilization), 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                  <span>{totalAssignedHours}h Assigned</span>
                  <span>{totalCapacity}h Total Capacity</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Average Load per Faculty:</span>
                  <span className="font-semibold text-slate-900">
                    {faculties.length > 0 ? (totalAssignedHours / faculties.length).toFixed(1) : 0} hrs/wk
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Maximum Faculty Load:</span>
                  <span className="font-semibold text-indigo-700">
                    {currentPlan ? `${currentPlan.objective_values.max_load} hrs/wk` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Workload Spread (Max - Min):</span>
                  <span className="font-semibold text-slate-900">
                    {currentPlan ? `${currentPlan.objective_values.load_range} hrs/wk` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Load Variance (σ²):</span>
                  <span className="font-semibold text-slate-900">
                    {currentPlan ? currentPlan.objective_values.variance : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => navigate('/eligibility')}
              className="w-full py-2 px-3 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
            >
              <Cpu className="h-3.5 w-3.5 text-slate-500" />
              <span>Inspect Eligibility Rules Matrix</span>
            </button>
          </div>
        </div>
      </div>

      {/* Historical Report Benchmark Panel vs Current Calculated Result */}
      <div className="bg-slate-900 text-white p-6 rounded-xl shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wide">
                University Project Report Benchmark (Reference Figures)
              </h3>
              <p className="text-xs text-slate-400">
                Official documented PBL project reference figures for algorithmic search space pruning.
              </p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
            Historical Project Baseline
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
            <div className="text-[11px] text-slate-400">Reference Faculty</div>
            <div className="text-lg font-bold text-white mt-0.5">{BENCHMARK_REFERENCE.faculty_count} Faculty</div>
            <div className="text-[10px] text-slate-500">Seed sample size</div>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
            <div className="text-[11px] text-slate-400">Reference Courses</div>
            <div className="text-lg font-bold text-white mt-0.5">{BENCHMARK_REFERENCE.course_count} Courses</div>
            <div className="text-[10px] text-slate-500">7 Theory + 3 Lab</div>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
            <div className="text-[11px] text-slate-400">Reference Hours</div>
            <div className="text-lg font-bold text-white mt-0.5">{BENCHMARK_REFERENCE.total_hours} hrs/wk</div>
            <div className="text-[10px] text-slate-500">Total course demand</div>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
            <div className="text-[11px] text-slate-400">Reported Max Load</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">{BENCHMARK_REFERENCE.reported_max_load} hrs/wk</div>
            <div className="text-[10px] text-slate-500">Optimal upper bound</div>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
            <div className="text-[11px] text-slate-400">Exhaustive Search</div>
            <div className="text-lg font-bold text-rose-400 mt-0.5">24,733 steps</div>
            <div className="text-[10px] text-slate-500">Without MRV & pruning</div>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
            <div className="text-[11px] text-slate-400">Pruned CSP Search</div>
            <div className="text-lg font-bold text-indigo-400 mt-0.5">169 steps</div>
            <div className="text-[10px] text-emerald-400">99.32% search reduction</div>
          </div>
        </div>

        {/* Comparison with Current Calculated Run */}
        {currentPlan && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
            <div>
              <span className="text-slate-300 font-medium">Current Measured Run: </span>
              <span>
                Explored <strong className="text-white">{currentPlan.solver_metrics.search_nodes}</strong> steps, pruned{' '}
                <strong className="text-white">{currentPlan.solver_metrics.branches_pruned}</strong> branches in{' '}
                <strong className="text-indigo-400">{currentPlan.solver_metrics.elapsed_ms}ms</strong>. Max load:{' '}
                <strong className="text-emerald-400">{currentPlan.objective_values.max_load}h</strong>.
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Algorithm: {currentPlan.algorithm === 'csp_mrv_backtracking' ? 'CSP (MRV & Bound)' : 'Hill Climbing'}
            </span>
          </div>
        )}
      </div>

      {/* Faculty Workload Table & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Faculty Workload Summary Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Faculty Workload Summary</h3>
            <button
              onClick={() => navigate('/faculty')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
            >
              <span>Manage Directory</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 font-semibold">Faculty Member</th>
                  <th className="px-3 py-3 font-semibold">Designation</th>
                  <th className="px-3 py-3 font-semibold text-center">Assigned / Cap</th>
                  <th className="px-3 py-3 font-semibold">Utilization</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {facultyWorkloadData.map(f => (
                  <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{f.fullName}</td>
                    <td className="px-3 py-3 text-slate-500">{f.designation}</td>
                    <td className="px-3 py-3 text-center font-mono font-medium">
                      {f.assigned}h <span className="text-slate-400">/ {f.max}h</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              f.isOverCap
                                ? 'bg-rose-500'
                                : f.utilization > 80
                                ? 'bg-amber-500'
                                : 'bg-indigo-600'
                            }`}
                            style={{ width: `${Math.min(f.utilization, 100)}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">{f.utilization}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {f.isOverCap ? (
                        <Badge variant="danger" size="sm">Over Cap</Badge>
                      ) : f.assigned > 0 ? (
                        <Badge variant="success" size="sm">Optimal</Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">Unallocated</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Recent Audit Activity */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Recent Allocation Activity</h3>
            <div className="space-y-3">
              {auditLogs.slice(0, 4).map(log => (
                <div key={log.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="font-semibold text-slate-800">{log.action.replace('_', ' ')}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] line-clamp-2 leading-relaxed">{log.details}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => navigate('/reports')}
            className="w-full mt-4 py-2 text-xs font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 rounded-lg transition-colors text-center"
          >
            View Full Audit Logs & Reports
          </button>
        </div>
      </div>
    </div>
  );
};
