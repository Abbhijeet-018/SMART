import React, { useState } from 'react';
import {
  Menu,
  Bell,
  RotateCcw,
  ShieldCheck,
  Calendar,
  Search,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../common/Badge';

interface NavbarProps {
  onOpenSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSidebar }) => {
  const { settings, isDemoMode, auditLogs, resetToDemoData, currentPlan } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-6">
      {/* Left section: mobile toggle, semester & department */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-900">{settings.department}</span>
          <span className="text-slate-300">/</span>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            <span>{settings.semester}</span>
          </div>
        </div>
      </div>

      {/* Center/Right section: Demo indicator, reset button, notifications, profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Demo Mode Badge */}
        {isDemoMode && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium cursor-help"
            title="Running in local evaluation mode with browser localStorage persistence. No real database required."
          >
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="hidden md:inline">Demo Mode:</span>
            <span>Local Browser Storage</span>
          </div>
        )}

        {/* Quick Reset Demo Data Button */}
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Reset faculty and courses to standard 5 faculty / 10 courses seed dataset?')) {
              resetToDemoData();
            }
          }}
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
          title="Restore seed data (5 faculty, 10 courses, 37 total hours)"
        >
          <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
          <span>Reset Demo</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Bell className="h-4 w-4" />
            {auditLogs.length > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-600" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white border border-slate-200 shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Recent Audit Activity
                </span>
                <span className="text-[11px] text-slate-400">{auditLogs.length} events</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {auditLogs.slice(0, 6).map(log => (
                  <div key={log.id} className="p-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-slate-900">{log.action.replace('_', ' ')}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{log.details}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Coordinator Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="h-8 w-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-semibold text-xs shadow-2xs">
            AC
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-semibold text-slate-900 flex items-center gap-1">
              <span>Dr. A. K. Sen</span>
              <ShieldCheck className="h-3 w-3 text-indigo-600" />
            </div>
            <p className="text-[10px] text-slate-500">Academic Coordinator, CSE</p>
          </div>
        </div>
      </div>
    </header>
  );
};
