import React from 'react';
import { useAuth } from '../../context/AuthContext.js';

interface SidebarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  route: string;
  label: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
}

interface NavGroup {
  groupName: string;
  items: NavItem[];
}

const allNavGroups: NavGroup[] = [
  {
    groupName: 'Institutional Core',
    items: [
      { route: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { route: '/students', label: 'Students Directory', icon: 'school' },
      { route: '/admissions', label: 'Admissions & Scrutiny', icon: 'how_to_reg' },
      { route: '/academic', label: 'Curriculum & Syllabi', icon: 'menu_book' },
      { route: '/academic/resources', label: 'LMS Learning Materials', icon: 'folder_open' },
      { route: '/timetable', label: 'Class Timetable', icon: 'calendar_month' },
      { route: '/attendance', label: 'Attendance', icon: 'fact_check' },
    ],
  },
  {
    groupName: 'Academic Automation Engine',
    items: [
      { route: '/bulk/resources', label: 'Bulk Materials Ingest', icon: 'upload_file', badge: '8-Stage', badgeColor: 'bg-blue-100 text-blue-700' },
      { route: '/bulk/marks', label: 'Faculty Marks Upload', icon: 'fact_check', badge: 'ACID Gate', badgeColor: 'bg-emerald-100 text-emerald-700' },
      { route: '/bulk/validation', label: 'Pre-Flight Schema Audit', icon: 'rule' },
    ],
  },
  {
    groupName: 'Campus Living & Services',
    items: [
      { route: '/fees', label: 'Student Fees & Challans', icon: 'payments' },
      { route: '/hostels', label: 'Hostel Hall Allocations', icon: 'hotel' },
      { route: '/library', label: 'Central Library Catalog', icon: 'local_library' },
      { route: '/faculty', label: 'Faculty HR & Payroll', icon: 'badge' },
      { route: '/notifications', label: 'Circulars & Notices', icon: 'campaign' },
      { route: '/documents', label: 'Official Documents', icon: 'verified' },
    ],
  },
  {
    groupName: 'Governance & Security',
    items: [
      { route: '/users', label: 'IAM Personnel & RBAC', icon: 'manage_accounts' },
      { route: '/settings/security', label: 'Active Sessions Monitor', icon: 'security', badge: 'Live', badgeColor: 'bg-rose-100 text-rose-700' },
      { route: '/audit', label: 'Cryptographic Audit Trail', icon: 'history_edu' },
      { route: '/reports', label: 'Statutory Reports', icon: 'analytics' },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { currentPersona, lockSession, logout, hasAccess } = useAuth();

  // Strict Role-Based Access Control filtering of navigation items
  const authorizedGroups = allNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasAccess(item.route)),
    }))
    .filter((group) => group.items.length > 0);

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'STUDENT':
      case 'STUDENT_REP':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'FAC_MEMBER':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'SUPER_ADMIN':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'BURSAR_FINANCE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'DEAN_ACADEMICS':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'COE_OFFICER':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'HOSTEL_WARDEN':
        return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0f172a] text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 shrink-0">
          <div
            onClick={() => onNavigate('/dashboard')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold font-mono text-sm shadow-md shadow-amber-500/20">
              H
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight leading-tight">
                Hogward University
              </h2>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-blue-400 tracking-wider uppercase">
                  College ERP
                </span>
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-300">
                  RBAC
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Role Clearance Strip */}
        <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-400">
            Clearance Level
          </span>
          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(
              currentPersona?.role
            )}`}
          >
            {currentPersona?.role || 'GUEST'}
          </span>
        </div>

        {/* Scrollable Authorized Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {authorizedGroups.map((group) => (
            <div key={group.groupName} className="space-y-1">
              <h4 className="px-3 text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                {group.groupName}
              </h4>
              <div className="space-y-0.5 pt-1">
                {group.items.map((item) => {
                  const isActive = currentRoute === item.route;
                  return (
                    <button
                      key={item.route}
                      onClick={() => {
                        onNavigate(item.route);
                        onCloseMobile();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`material-symbols-outlined text-[18px] ${
                            isActive ? 'text-white' : 'text-slate-400'
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                            item.badgeColor || 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Active Identity & Sign Out Footer */}
        <div className="p-3 border-t border-slate-800 shrink-0 bg-slate-950/70 space-y-2">
          <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={currentPersona?.avatar}
                alt={currentPersona?.name}
                className="w-8 h-8 rounded-xl object-cover border border-slate-700 shrink-0"
              />
              <div className="min-w-0">
                <h5 className="text-xs font-bold text-white truncate">{currentPersona?.name}</h5>
                <p className="text-[10px] text-slate-400 font-mono truncate">
                  {currentPersona?.roleLabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={lockSession}
                title="Lock Workstation"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">lock</span>
              </button>
              <button
                onClick={async () => {
                  await logout();
                  onNavigate('/login');
                }}
                title="Sign Out to Login Gateway"
                className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200 border border-rose-800/40 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
