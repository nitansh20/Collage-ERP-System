import React, { useState } from 'react';
import { Sidebar } from './Sidebar.js';
import { Header } from './Header.js';
import { ToastContainer } from '../common/Toast.js';
import { useAuth } from '../../context/AuthContext.js';

interface AppLayoutProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  onOpenNewAdmission: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentRoute,
  onNavigate,
  onOpenNewAdmission,
  children,
}) => {
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const { isSessionLocked, unlockSession, currentPersona } = useAuth();
  const [passcode, setPasscode] = useState('');

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    unlockSession();
    setPasscode('');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Session Lockout Modal Shield */}
      {isSessionLocked && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px]">lock</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Workstation Suspended</h3>
              <p className="text-xs text-slate-500 font-mono">
                {currentPersona?.name} • {currentPersona?.roleLabel}
              </p>
            </div>
            <form onSubmit={handleUnlockSubmit} className="space-y-3 pt-2">
              <input
                type="password"
                placeholder="Enter PIN or Passcode (Any to unlock)"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center font-mono text-sm tracking-widest focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Resume Authorized Workstation
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Persistent Sidebar */}
      <Sidebar
        currentRoute={currentRoute}
        onNavigate={onNavigate}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <Header
          onOpenMobileSidebar={() => setIsOpenMobile(true)}
          onNavigate={onNavigate}
          onOpenNewAdmission={onOpenNewAdmission}
          currentRoute={currentRoute}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};
