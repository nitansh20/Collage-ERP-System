import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { DashboardProvider } from './context/DashboardContext.js';
import { AppLayout } from './components/layout/AppLayout.js';
import { AccessDeniedPage } from './components/common/AccessDeniedPage.js';
import { ToastContainer } from './components/common/Toast.js';

// Pages
import { DashboardPage } from './pages/DashboardPage.js';
import { StudentsPage } from './pages/StudentsPage.js';
import { AdmissionsPage } from './pages/AdmissionsPage.js';
import { AcademicPage } from './pages/AcademicPage.js';
import { AcademicResourcesPage } from './pages/AcademicResourcesPage.js';
import { TimetablePage } from './pages/TimetablePage.js';
import { AttendancePage } from './pages/AttendancePage.js';
import { BulkResourceImportPage } from './pages/BulkResourceImportPage.js';
import { BulkMarksImportPage } from './pages/BulkMarksImportPage.js';
import { BulkValidationPage } from './pages/BulkValidationPage.js';
import { FeesPage } from './pages/FeesPage.js';
import { HostelPage } from './pages/HostelPage.js';
import { LibraryPage } from './pages/LibraryPage.js';
import { FacultyPage } from './pages/FacultyPage.js';
import { NotificationsPage } from './pages/NotificationsPage.js';
import { DocumentsPage } from './pages/DocumentsPage.js';
import { UsersPage } from './pages/UsersPage.js';
import { SecuritySessionsPage } from './pages/SecuritySessionsPage.js';
import { AuditPage } from './pages/AuditPage.js';
import { ReportsPage } from './pages/ReportsPage.js';
import { LoginPage } from './pages/LoginPage.js';

export const AppContent: React.FC = () => {
  const { currentPersona, isAuthenticated, hasAccess } = useAuth();

  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    return window.location.pathname === '/' ? '/dashboard' : window.location.pathname;
  });
  const [isGlobalNewAdmissionOpen, setIsGlobalNewAdmissionOpen] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname === '/' ? '/dashboard' : window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (route: string) => {
    window.history.pushState({}, '', route);
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Standalone Full-Screen Login Experience (Without ERP Sidebar/Header chrome)
  if (!isAuthenticated || currentRoute === '/login') {
    return (
      <div className="min-h-screen bg-[#0F172A] font-sans antialiased text-slate-900">
        <LoginPage onNavigate={navigateTo} />
        <ToastContainer />
      </div>
    );
  }

  const renderRoutePage = () => {
    // Role-Based Access Control gate check:
    if (!hasAccess(currentRoute)) {
      return (
        <AccessDeniedPage
          requestedRoute={currentRoute}
          currentPersona={currentPersona}
          onNavigate={navigateTo}
        />
      );
    }

    switch (currentRoute) {
      case '/dashboard':
        return <DashboardPage onNavigate={navigateTo} onOpenNewAdmission={() => setIsGlobalNewAdmissionOpen(true)} />;
      case '/students':
        return <StudentsPage />;
      case '/admissions':
        return (
          <AdmissionsPage
            isNewModalOpen={isGlobalNewAdmissionOpen}
            onCloseNewModal={() => setIsGlobalNewAdmissionOpen(false)}
          />
        );
      case '/academic':
        return <AcademicPage />;
      case '/academic/resources':
      case '/resources':
        return <AcademicResourcesPage onNavigate={navigateTo} />;
      case '/timetable':
        return <TimetablePage />;
      case '/attendance':
        return <AttendancePage />;
      case '/bulk/resources':
        return <BulkResourceImportPage onNavigate={navigateTo} />;
      case '/bulk/marks':
        return <BulkMarksImportPage />;
      case '/bulk/validation':
        return <BulkValidationPage />;
      case '/fees':
        return <FeesPage />;
      case '/hostels':
        return <HostelPage />;
      case '/library':
        return <LibraryPage />;
      case '/faculty':
        return <FacultyPage />;
      case '/notifications':
        return <NotificationsPage />;
      case '/documents':
        return <DocumentsPage />;
      case '/users':
        return <UsersPage />;
      case '/settings/security':
        return <SecuritySessionsPage />;
      case '/audit':
        return <AuditPage />;
      case '/reports':
        return <ReportsPage />;
      default:
        return <DashboardPage onNavigate={navigateTo} onOpenNewAdmission={() => setIsGlobalNewAdmissionOpen(true)} />;
    }
  };

  return (
    <AppLayout
      currentRoute={currentRoute}
      onNavigate={navigateTo}
      onOpenNewAdmission={() => {
        if (currentRoute !== '/admissions') {
          navigateTo('/admissions');
        }
        setIsGlobalNewAdmissionOpen(true);
      }}
    >
      {renderRoutePage()}
    </AppLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DashboardProvider>
        <AppContent />
      </DashboardProvider>
    </AuthProvider>
  );
}
