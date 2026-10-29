import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CheckSquare,
  Sparkles,
  BarChart3,
  FileText,
  Settings,
  GraduationCap,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { faculties, courses, currentPlan } = useApp();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Faculty Directory', href: '/faculty', icon: Users, badge: faculties.length },
    { name: 'Courses', href: '/courses', icon: BookOpen, badge: courses.length },
    { name: 'Eligibility Matrix', href: '/eligibility', icon: CheckSquare },
    { name: 'AI Allocation Engine', href: '/allocation', icon: Sparkles, highlight: true },
    {
      name: 'Results & Overrides',
      href: '/results',
      icon: BarChart3,
      status: currentPlan ? currentPlan.status : undefined
    },
    { name: 'Audit & Reports', href: '/reports', icon: FileText },
    { name: 'Rules & Settings', href: '/settings', icon: Settings }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-sm tracking-tight">FacultyFlow</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/50">AI</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Workload Optimization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Platform Navigation
          </div>
          {navigation.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => onClose()}
                className={({ isActive }) =>
                  `group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`h-4 w-4 transition-colors ${
                          isActive
                            ? 'text-indigo-600'
                            : item.highlight
                            ? 'text-indigo-500 group-hover:text-indigo-600'
                            : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                      />
                      <span>{item.name}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          isActive
                            ? 'bg-indigo-200/70 text-indigo-800'
                            : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {item.status && (
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded-md ${
                          item.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Department Info & PBL Tag Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="rounded-lg bg-white p-3 border border-slate-200 text-xs shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="font-medium text-slate-700">B.Tech CSE PBL</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">v1.0</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-tight">
              AI Decision-Support System for Fair Academic Workload Allocation.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
