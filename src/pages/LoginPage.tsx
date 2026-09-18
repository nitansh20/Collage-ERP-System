import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  GraduationCap,
  Briefcase,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  User,
  KeyRound,
  Phone,
  ArrowRight,
  X,
  Send,
  CheckCircle2,
  Sparkles,
  Calendar,
  Building2,
  AlertCircle,
  HelpCircle,
  Clock,
  Shield,
  FileText,
} from 'lucide-react';

interface LoginPageProps {
  onNavigate: (route: string) => void;
}

type AccessTier = 'STUDENT' | 'FACULTY' | 'ADMIN';

interface DemoAccount {
  id: string;
  name: string;
  roleLabel: string;
  category: 'Student' | 'Department HOD / Faculty' | 'Finance Officer' | 'Super Admin';
  tier: AccessTier;
  identifier: string;
  password: string;
  avatar: string;
  badge: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'user_student',
    name: 'Aarav Sharma',
    roleLabel: 'Undergraduate Student (B.Tech CSE)',
    category: 'Student',
    tier: 'STUDENT',
    identifier: '21CS042',
    password: 'student123',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    badge: 'Roll: 21CS042',
  },
  {
    id: 'user_faculty_cse',
    name: 'Dr. P. Sundaram',
    roleLabel: 'Associate Professor & Course Lead',
    category: 'Department HOD / Faculty',
    tier: 'FACULTY',
    identifier: 'psundaram@hogward.edu',
    password: 'faculty123',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    badge: 'Faculty ID: FAC-099',
  },
  {
    id: 'user_bursar',
    name: 'Meera Deshmukh',
    roleLabel: 'Chief Financial Officer & Bursar',
    category: 'Finance Officer',
    tier: 'ADMIN',
    identifier: 'bursar@hogward.edu',
    password: 'finance123',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    badge: 'Finance Directorate',
  },
  {
    id: 'user_super_admin',
    name: 'Dr. Aris Thorne',
    roleLabel: 'Dean of IT & System Administrator',
    category: 'Super Admin',
    tier: 'ADMIN',
    identifier: 'admin@hogward.edu',
    password: 'admin123',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    badge: 'Full Clearance',
  },
];

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { loginWithCredentials, login, showToast } = useAuth();

  // Role Switcher: 'STUDENT' (default) | 'FACULTY' | 'ADMIN'
  const [activeTier, setActiveTier] = useState<AccessTier>('STUDENT');
  const [identifier, setIdentifier] = useState('21CS042');
  const [password, setPassword] = useState('student123');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Discreet Demo Drawer & Modal States
  const [isDemoDrawerOpen, setIsDemoDrawerOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Switch role category tab and update credentials placeholder
  const handleTierChange = (tier: AccessTier) => {
    setActiveTier(tier);
    if (tier === 'STUDENT') {
      setIdentifier('21CS042');
      setPassword('student123');
    } else if (tier === 'FACULTY') {
      setIdentifier('psundaram@hogward.edu');
      setPassword('faculty123');
    } else {
      setIdentifier('admin@hogward.edu');
      setPassword('admin123');
    }
  };

  // Primary Login Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      showToast('error', 'Required Fields', 'Please enter your institutional identifier and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await loginWithCredentials(identifier.trim(), password.trim());
      if (result.success) {
        onNavigate('/dashboard');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1-Click Quick-Fill from Demo Accounts Drawer
  const handleAutoFillAccount = (account: DemoAccount, directLogin: boolean = false) => {
    setActiveTier(account.tier);
    setIdentifier(account.identifier);
    setPassword(account.password);
    setIsDemoDrawerOpen(false);

    if (directLogin) {
      setIsSubmitting(true);
      login(account.id).then((success) => {
        setIsSubmitting(false);
        if (success) {
          onNavigate('/dashboard');
        }
      });
    } else {
      showToast(
        'info',
        'Credentials Populated',
        `Ready to sign in as ${account.name} (${account.category})`
      );
    }
  };

  // Single Sign-On (SSO) Handler
  const handleSSOLogin = async (provider: 'Google Workspace' | 'Microsoft 365') => {
    setIsSubmitting(true);
    try {
      const targetId =
        activeTier === 'STUDENT'
          ? 'user_student'
          : activeTier === 'FACULTY'
          ? 'user_faculty_cse'
          : 'user_super_admin';

      const success = await login(targetId);
      if (success) {
        showToast(
          'success',
          `${provider} Verified`,
          'Institutional Single Sign-On session confirmed.'
        );
        onNavigate('/dashboard');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password Recovery handler
  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      showToast('error', 'Missing Identifier', 'Please enter your registered Student ID or University Email.');
      return;
    }
    setIsResetting(true);
    setTimeout(() => {
      setIsResetting(false);
      setIsForgotPasswordOpen(false);
      showToast(
        'success',
        'Reset Link Sent',
        `A secure passcode recovery link has been dispatched to ${resetEmail.trim()}.`
      );
      setResetEmail('');
    }, 750);
  };

  // Dynamic input label based on active role
  const getIdentifierLabel = () => {
    switch (activeTier) {
      case 'STUDENT':
        return 'Roll Number / Enrollment ID';
      case 'FACULTY':
        return 'Faculty ID / Institutional Email';
      case 'ADMIN':
        return 'Admin Username / Email';
    }
  };

  // Dynamic input placeholder based on active role
  const getIdentifierPlaceholder = () => {
    switch (activeTier) {
      case 'STUDENT':
        return 'e.g. 21CS042';
      case 'FACULTY':
        return 'e.g. psundaram@hogward.edu';
      case 'ADMIN':
        return 'e.g. admin@hogward.edu';
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0B1120] text-slate-100 selection:bg-amber-600 selection:text-white">
      {/* =========================================================================
          1. LEFT / INSTITUTIONAL BRANDING & SECURITY CLEARANCE PANEL (45% Split)
          Hogward University emblem, security policy, and IT helpdesk
          (Zero internal announcements/deadlines leaked to unauthorized public)
         ========================================================================= */}
      <section
        id="login-branding-panel"
        className="w-full lg:w-[45%] bg-[#0B1120] p-8 sm:p-12 lg:p-14 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800/80"
      >
        {/* Ambient Institutional Lighting */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-7 max-w-lg">
          {/* University Emblem, Name & Motto */}
          <div className="space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 flex items-center justify-center shadow-xl shadow-amber-950/50 border border-amber-400/30 shrink-0">
                <Building2 className="w-7 h-7 text-amber-100" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-serif">
                    Hogward University
                  </h1>
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-700/50">
                    EST. 1954
                  </span>
                </div>
                <p className="text-xs text-amber-200/70 font-medium">
                  Draco Dormiens Nunquam Titillandus • Excellence in Wisdom & Honor
                </p>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                Unified Authentication Portal
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Centralized statutory identity gateway for Hogward University students, faculty researchers, and administrative governance.
              </p>
            </div>
          </div>

          {/* Institutional Cybersecurity & Access Policy Directives */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Security & Access Clearance Directives
              </span>
              <span className="text-[10px] text-slate-500 font-mono">IAM GATEWAY</span>
            </div>

            <div className="space-y-3">
              {/* Directive 1: Authorized Access Only */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1 hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Authorized University Personnel Only</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Access to institutional registries, courseware, and student dossiers is strictly limited to verified Hogward students, faculty, and designated staff.
                </p>
              </div>

              {/* Directive 2: Data Confidentiality */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1 hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Confidentiality & Privacy Standards</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  All internal marks, transcripts, admissions, and financial records are protected by strict institutional privacy covenants and data governance laws.
                </p>
              </div>

              {/* Directive 3: Statutory Audit Telemetry */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1 hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Cryptographic Session Integrity</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Sign-in requests are verified with role-based access control (RBAC), TLS 1.3 encryption, and real-time audit event logging.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Portal Helpdesk & Institutional Compliance Contacts */}
        <div className="relative z-10 pt-6 border-t border-slate-800 mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-400">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
              Campus IT Helpdesk & Support
            </span>
            <div className="text-slate-300 font-medium flex items-center gap-2">
              <span>helpdesk@hogward.edu</span>
              <span className="text-slate-500">•</span>
              <span>+1 (555) 019-4820</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
            <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              ISO 27001
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 flex items-center gap-1">
              <Lock className="w-3 h-3 text-blue-400" />
              256-Bit SSL
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. RIGHT SIDE (55% Split)
          Clean, focused authentication card with centered form
         ========================================================================= */}
      <section
        id="login-form-panel"
        className="w-full lg:w-[55%] bg-slate-50 flex items-center justify-center p-6 sm:p-10 lg:p-12"
      >
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-7 sm:p-9 space-y-6">
          {/* Card Header */}
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Sign In to Portal
            </h3>
            <p className="text-xs text-slate-500">
              Select your user category and enter your institutional credentials.
            </p>
          </div>

          {/* Role Switcher: Segmented Pill Selector */}
          <div
            id="role-switcher-segmented-bar"
            className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 gap-1"
          >
            {/* Student Tab (Default) */}
            <button
              type="button"
              id="tab-student"
              onClick={() => handleTierChange('STUDENT')}
              className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTier === 'STUDENT'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Student</span>
            </button>

            {/* Faculty / Staff Tab */}
            <button
              type="button"
              id="tab-faculty"
              onClick={() => handleTierChange('FACULTY')}
              className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTier === 'FACULTY'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Faculty / Staff</span>
            </button>

            {/* Administrator / Dean Tab */}
            <button
              type="button"
              id="tab-admin"
              onClick={() => handleTierChange('ADMIN')}
              className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTier === 'ADMIN'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin / Dean</span>
            </button>
          </div>

          {/* Dynamic Admin Notice for Hardware Token / 2FA */}
          {activeTier === 'ADMIN' && (
            <div
              id="admin-2fa-notice"
              className="p-3 rounded-xl bg-blue-50/80 border border-blue-100 flex items-start gap-2.5 text-blue-900 text-xs"
            >
              <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">Privileged Administrative Access</span>
                <span className="text-[11px] text-blue-700 leading-relaxed block">
                  Hardware Token / 2FA: High-clearance accounts require cryptographically verified sessions and institutional audit logging.
                </span>
              </div>
            </div>
          )}

          {/* Authentication Form */}
          <form id="portal-login-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Dynamic Role-Based Identifier Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="portal-identifier"
                className="block text-xs font-bold text-slate-700"
              >
                {getIdentifierLabel()}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 pointer-events-none">
                  {activeTier === 'STUDENT' ? (
                    <GraduationCap className="w-4 h-4" />
                  ) : activeTier === 'FACULTY' ? (
                    <Briefcase className="w-4 h-4" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                </span>
                <input
                  id="portal-identifier"
                  type="text"
                  name="identifier"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={getIdentifierPlaceholder()}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Password Input with Toggleable Eye Icon */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="portal-password"
                  className="block text-xs font-bold text-slate-700"
                >
                  Password
                </label>
                <button
                  type="button"
                  id="btn-forgot-password-link"
                  onClick={() => setIsForgotPasswordOpen(true)}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                >
                  Forgot Password / Reset PIN
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="portal-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your security passcode"
                  required
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  id="btn-toggle-password-visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 p-1 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember This Device & Encrypted Channel */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="chk-remember-device"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-600">Remember this device</span>
              </label>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>SSL Encrypted</span>
              </div>
            </div>

            {/* Prominent Action Button: Sign In to Portal */}
            <div className="pt-2">
              <button
                type="submit"
                id="btn-submit-sign-in"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-wait"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Sign In to Portal</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* SSO Divider */}
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400 font-medium">
                Single Sign-On (SSO)
              </span>
            </div>
          </div>

          {/* Single Sign-On Options: Google Workspace & Microsoft 365 */}
          <div className="space-y-2.5">
            {/* Google Workspace */}
            <button
              type="button"
              id="btn-sso-google"
              onClick={() => handleSSOLogin('Google Workspace')}
              disabled={isSubmitting}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2.5 transition-colors cursor-pointer shadow-2xs"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google Workspace</span>
            </button>

            {/* Microsoft 365 */}
            <button
              type="button"
              id="btn-sso-microsoft"
              onClick={() => handleSSOLogin('Microsoft 365')}
              disabled={isSubmitting}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2.5 transition-colors cursor-pointer shadow-2xs"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <rect width="10.5" height="10.5" fill="#f25022" />
                <rect x="13.5" width="10.5" height="10.5" fill="#7fba00" />
                <rect y="13.5" width="10.5" height="10.5" fill="#00a4ef" />
                <rect x="13.5" y="13.5" width="10.5" height="10.5" fill="#ffb900" />
              </svg>
              <span>Sign in with Microsoft 365</span>
            </button>
          </div>

          {/* Portal Security Footer Note */}
          <div className="pt-2 text-center">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Protected by Hogward IAM Security Gateways. Unauthorized access attempts are monitored and recorded.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. DISCRETE FLOATING BOTTOM-RIGHT BUTTON
          "Demo Quick-Fill Accounts"
         ========================================================================= */}
      <div className="fixed bottom-5 right-5 z-40">
        <button
          type="button"
          id="btn-demo-quick-fill-trigger"
          onClick={() => setIsDemoDrawerOpen(true)}
          className="px-4 py-2.5 rounded-full bg-slate-900/95 hover:bg-slate-900 text-white text-xs font-semibold border border-slate-700 shadow-xl backdrop-blur-md flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Demo Quick-Fill Accounts</span>
        </button>
      </div>

      {/* =========================================================================
          4. DISCRETE SLIDE-OUT DRAWER / MODAL FOR DEMO QUICK-FILL ACCOUNTS
          Allows testers to 1-click populate credentials for:
          - Student
          - Department HOD / Faculty
          - Finance Officer
          - Super Admin
         ========================================================================= */}
      {isDemoDrawerOpen && (
        <div
          id="demo-quick-fill-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
        >
          <div
            className="fixed inset-0"
            onClick={() => setIsDemoDrawerOpen(false)}
          />

          <div
            id="demo-quick-fill-sheet"
            className="relative w-full max-w-lg bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-5 z-10 max-h-[90vh] flex flex-col text-slate-900"
          >
            {/* Sheet Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-bold text-slate-900">
                    Demo Quick-Fill Accounts
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  1-click populate test credentials or sign in directly to evaluate role-based clearance.
                </p>
              </div>
              <button
                type="button"
                id="btn-close-demo-drawer"
                onClick={() => setIsDemoDrawerOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 4 Required Demo Accounts List */}
            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {DEMO_ACCOUNTS.map((account) => (
                <div
                  key={account.id}
                  id={`quick-fill-card-${account.id}`}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={account.avatar}
                      alt={account.name}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {account.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                          {account.category}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium block truncate">
                        {account.roleLabel}
                      </span>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        ID: <code className="text-slate-800 font-semibold">{account.identifier}</code> • Pass:{' '}
                        <code className="text-slate-800 font-semibold">{account.password}</code>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      id={`btn-autofill-${account.id}`}
                      onClick={() => handleAutoFillAccount(account, false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                      Fill Form
                    </button>
                    <button
                      type="button"
                      id={`btn-direct-login-${account.id}`}
                      onClick={() => handleAutoFillAccount(account, true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Sign In</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Sheet Footer */}
            <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-500">
              <span>All 4 primary user roles configured with authenticated RBAC permissions.</span>
              <button
                type="button"
                onClick={() => setIsDemoDrawerOpen(false)}
                className="font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          5. PASSWORD RECOVERY / FORGOT PASSWORD MODAL
         ========================================================================= */}
      {isForgotPasswordOpen && (
        <div
          id="forgot-password-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
        >
          <div
            className="fixed inset-0"
            onClick={() => setIsForgotPasswordOpen(false)}
          />

          <div
            id="forgot-password-modal"
            className="relative w-full max-w-md bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-4 z-10 text-slate-900"
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Self-Service Passcode Reset
                  </h3>
                  <p className="text-xs text-slate-500">
                    Reset institutional access credentials
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-forgot-password"
                onClick={() => setIsForgotPasswordOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Enter your Roll Number or registered University Email address. A secure passcode recovery authorization link will be dispatched to your verified university email.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label
                  htmlFor="input-recovery-email"
                  className="block text-xs font-bold text-slate-700"
                >
                  Roll Number or University Email
                </label>
                <input
                  id="input-recovery-email"
                  type="text"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="e.g. 21CS042 or user@hogward.edu"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  id="btn-cancel-recovery"
                  onClick={() => setIsForgotPasswordOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-recovery"
                  disabled={isResetting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-75"
                >
                  {isResetting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Recovery Link</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
