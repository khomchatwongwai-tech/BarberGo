import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Scissors,
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  Briefcase,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Camera,
  ChevronRight,
  ArrowLeft,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register-customer' | 'register-barber' | 'forgot-password';
  onSuccess?: () => void;
}

export const AuthPortalModal: React.FC<AuthPortalModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess
}) => {
  const {
    login,
    registerCustomerAccount,
    registerBarberAccount,
    forgotPassword,
    signInWithGoogle
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register-customer' | 'register-barber' | 'forgot-password'>(initialMode);
  
  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Customer Register Form State
  const [custFirstName, setCustFirstName] = useState('');
  const [custLastName, setCustLastName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custPassword, setCustPassword] = useState('');
  const [custConfirmPassword, setCustConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Barber Register Form State (Multi-step)
  const [barberStep, setBarberStep] = useState<1 | 2 | 3>(1);
  const [barberFirstName, setBarberFirstName] = useState('');
  const [barberLastName, setBarberLastName] = useState('');
  const [barberEmail, setBarberEmail] = useState('');
  const [barberPhone, setBarberPhone] = useState('');
  const [barberPassword, setBarberPassword] = useState('');
  const [barberBusinessName, setBarberBusinessName] = useState('');
  const [barberExperienceYears, setBarberExperienceYears] = useState(5);
  const [barberTravelRadius, setBarberTravelRadius] = useState(15);
  const [barberShopAddress, setBarberShopAddress] = useState('');
  const [barberBio, setBarberBio] = useState('');
  const [barberLicenseNumber, setBarberLicenseNumber] = useState('');
  const [barberServices, setBarberServices] = useState([
    { name: 'Signature Master Haircut', price: 45, durationMinutes: 45, category: 'Haircut', description: 'Precision scissor and clipper cut tailored to facial structure.' },
    { name: 'Skin Fade + Razor Finish', price: 50, durationMinutes: 45, category: 'Fade', description: 'Seamless skin fade with straight razor lineup and cooling aftershave.' },
    { name: 'Beard Sculpting & Hot Towel', price: 30, durationMinutes: 30, category: 'Beard', description: 'Beard shaping with hot towel steam treatment and organic essential oils.' }
  ]);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');

  // Status & Feedback State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [barberSuccessModal, setBarberSuccessModal] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!loginEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setLoading(true);
    const result = await login(loginEmail, loginPassword, rememberMe);
    setLoading(false);

    if (result.success) {
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setErrorMessage(result.error || 'Invalid email or password.');
    }
  };

  const handleCustomerRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!custFirstName || !custLastName || !custEmail || !custPhone || !custPassword) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }
    if (custPassword !== custConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (custPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (!acceptTerms) {
      setErrorMessage('You must accept the Terms of Service and Privacy Policy to proceed.');
      return;
    }

    setLoading(true);
    const result = await registerCustomerAccount({
      firstName: custFirstName,
      lastName: custLastName,
      email: custEmail,
      phone: custPhone,
      password: custPassword
    });
    setLoading(false);

    if (result.success) {
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setErrorMessage(result.error || 'Registration failed.');
    }
  };

  const handleBarberRegisterSubmit = async () => {
    setErrorMessage('');
    if (!barberFirstName || !barberLastName || !barberEmail || !barberPhone || !barberPassword) {
      setErrorMessage('Please complete all personal and contact fields.');
      return;
    }

    setLoading(true);
    const result = await registerBarberAccount({
      firstName: barberFirstName,
      lastName: barberLastName,
      email: barberEmail,
      phone: barberPhone,
      password: barberPassword,
      businessName: barberBusinessName || `${barberFirstName} ${barberLastName}`,
      experienceYears: barberExperienceYears,
      travelRadiusMiles: barberTravelRadius,
      servicePricing: barberServices,
      shopAddress: barberShopAddress,
      licenseNumber: barberLicenseNumber,
      bio: barberBio
    });
    setLoading(false);

    if (result.success) {
      setBarberSuccessModal(true);
    } else {
      setErrorMessage(result.error || 'Barber registration failed.');
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!forgotEmail) {
      setErrorMessage('Please enter your email.');
      return;
    }

    setLoading(true);
    const res = await forgotPassword(forgotEmail);
    setLoading(false);
    setForgotSubmitted(true);
    setForgotMessage(res.message);
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setLoading(true);
    const res = await signInWithGoogle();
    setLoading(false);
    if (res.success) {
      if (onSuccess) onSuccess();
      onClose();
    } else if (res.error) {
      setErrorMessage(res.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]"
        id="auth-portal-container"
      >
        {/* Header with Sky Blue Branding */}
        <div className="relative bg-gradient-to-r from-sky-500 via-sky-400 to-sky-600 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-inner">
              <Scissors className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">BarberPilot</h2>
              <p className="text-xs text-sky-100 font-medium">On-Demand Master Grooming</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            id="close-auth-modal-btn"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-2xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* ========================================================================= */}
          {/* 1. LOGIN MODE */}
          {/* ========================================================================= */}
          {mode === 'login' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Welcome Back</h3>
                <p className="text-xs text-slate-500 mt-0.5">Sign in to book barbers, manage appointments, or track earnings</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2.5 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none transition-all shadow-xs"
                      id="login-email-input"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot-password');
                        setErrorMessage('');
                      }}
                      className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2.5 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none transition-all shadow-xs"
                      id="login-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded text-sky-500 focus:ring-sky-400 h-4 w-4 border-slate-300"
                    />
                    <span className="text-xs text-slate-600 font-medium">Remember me</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-sky-500 py-3 text-xs font-bold text-white shadow-md shadow-sky-500/20 hover:bg-sky-400 disabled:opacity-50 transition-all cursor-pointer"
                  id="login-submit-btn"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  <span>Sign In to BarberPilot</span>
                </button>
              </form>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  or
                </span>
              </div>

              {/* Continue with Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-all cursor-pointer"
                id="google-signin-btn"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Switch to Customer Register */}
              <div className="text-center pt-2">
                <p className="text-xs text-slate-600">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register-customer');
                      setErrorMessage('');
                    }}
                    className="font-bold text-sky-600 hover:text-sky-700 hover:underline"
                    id="switch-to-customer-register-btn"
                  >
                    Create Account
                  </button>
                </p>
              </div>

              {/* Callout: Are you a barber? */}
              <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-sky-900">Are you a barber?</p>
                  <p className="text-[11px] text-sky-700 mt-0.5">Join BarberPilot to earn on your own schedule with direct payouts.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register-barber');
                    setErrorMessage('');
                  }}
                  className="shrink-0 rounded-xl bg-sky-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-sky-600 transition-colors"
                  id="join-as-barber-btn"
                >
                  Join as Barber
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* 2. CUSTOMER REGISTRATION MODE */}
          {/* ========================================================================= */}
          {mode === 'register-customer' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Create Client Account</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Book top freelance barbers anywhere in your city</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage('');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" /> Back to Log In
                </button>
              </div>

              <form onSubmit={handleCustomerRegisterSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Marcus"
                      value={custFirstName}
                      onChange={(e) => setCustFirstName(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Vance"
                      value={custLastName}
                      onChange={(e) => setCustLastName(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="marcus@example.com"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone (For Arrival SMS)</label>
                  <input
                    type="tel"
                    required
                    placeholder="+1 (415) 555-0198"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={custPassword}
                      onChange={(e) => setCustPassword(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={custConfirmPassword}
                      onChange={(e) => setCustConfirmPassword(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-0.5 rounded text-sky-500 focus:ring-sky-400 h-4 w-4 border-slate-300"
                    />
                    <span className="text-[11px] text-slate-600 leading-tight">
                      I accept BarberPilot's{' '}
                      <span className="text-sky-600 font-semibold underline">Terms of Service</span> and{' '}
                      <span className="text-sky-600 font-semibold underline">Privacy Policy</span>.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-sky-500 py-3 text-xs font-bold text-white shadow-md shadow-sky-500/20 hover:bg-sky-400 disabled:opacity-50 transition-all cursor-pointer mt-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  <span>Create Account & Log In</span>
                </button>
              </form>

              <div className="text-center pt-2">
                <p className="text-xs text-slate-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMessage('');
                    }}
                    className="font-bold text-sky-600 hover:text-sky-700 hover:underline"
                  >
                    Log In
                  </button>
                </p>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* 3. BARBER PROFESSIONAL ONBOARDING REGISTRATION */}
          {/* ========================================================================= */}
          {mode === 'register-barber' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Barber Partner Application</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Step {barberStep} of 3 • Mobile & freelance barbers</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage('');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
              </div>

              {/* Progress Indicator */}
              <div className="flex items-center gap-2">
                <div className={`h-1.5 flex-1 rounded-full ${barberStep >= 1 ? 'bg-sky-500' : 'bg-slate-200'}`} />
                <div className={`h-1.5 flex-1 rounded-full ${barberStep >= 2 ? 'bg-sky-500' : 'bg-slate-200'}`} />
                <div className={`h-1.5 flex-1 rounded-full ${barberStep >= 3 ? 'bg-sky-500' : 'bg-slate-200'}`} />
              </div>

              {/* STEP 1: Personal & Account */}
              {barberStep === 1 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">First Name</label>
                      <input
                        type="text"
                        placeholder="Marcus"
                        value={barberFirstName}
                        onChange={(e) => setBarberFirstName(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        placeholder="Sterling"
                        value={barberLastName}
                        onChange={(e) => setBarberLastName(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Business / Brand Name</label>
                    <input
                      type="text"
                      placeholder="Marcus Sterling Master Grooming"
                      value={barberBusinessName}
                      onChange={(e) => setBarberBusinessName(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="marcus@barber.com"
                      value={barberEmail}
                      onChange={(e) => setBarberEmail(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="+1 (415) 555-0144"
                        value={barberPhone}
                        onChange={(e) => setBarberPhone(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={barberPassword}
                        onChange={(e) => setBarberPassword(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!barberFirstName || !barberLastName || !barberEmail || !barberPhone || !barberPassword) {
                        setErrorMessage('Please fill in all personal and contact details.');
                        return;
                      }
                      setErrorMessage('');
                      setBarberStep(2);
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-sky-500 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-500/20 hover:bg-sky-400 mt-2"
                  >
                    <span>Continue: Experience & Radius</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* STEP 2: Experience & Travel Coverage */}
              {barberStep === 2 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Years of Experience</label>
                      <input
                        type="number"
                        min="1"
                        max="40"
                        value={barberExperienceYears}
                        onChange={(e) => setBarberExperienceYears(Number(e.target.value))}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Travel Radius (Miles)</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={barberTravelRadius}
                        onChange={(e) => setBarberTravelRadius(Number(e.target.value))}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Cosmetology / Barber License #</label>
                    <input
                      type="text"
                      placeholder="e.g. CA-BARB-849102"
                      value={barberLicenseNumber}
                      onChange={(e) => setBarberLicenseNumber(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Shop Address (Optional for In-Studio)</label>
                    <input
                      type="text"
                      placeholder="e.g. 500 Howard St, Suite 400"
                      value={barberShopAddress}
                      onChange={(e) => setBarberShopAddress(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Professional Bio</label>
                    <textarea
                      rows={2}
                      placeholder="Tell clients about your grooming philosophy, specialties, and background..."
                      value={barberBio}
                      onChange={(e) => setBarberBio(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setBarberStep(1)}
                      className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setBarberStep(3)}
                      className="flex-1 rounded-2xl bg-sky-500 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-500/20 hover:bg-sky-400"
                    >
                      Next: Services & Submit
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Services & Verification Notice */}
              {barberStep === 3 && (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-700">Offered Services & Pricing</label>
                      <span className="text-[11px] text-sky-600 font-semibold">{barberServices.length} default services</span>
                    </div>

                    <div className="space-y-2 max-h-36 overflow-y-auto">
                      {barberServices.map((srv, idx) => (
                        <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-900">{srv.name}</p>
                            <p className="text-[10px] text-slate-500">{srv.durationMinutes} min • {srv.category}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-sky-700">${srv.price}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pending Verification Notice */}
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-2.5">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-900">Verification Policy</p>
                      <p className="text-[11px] text-amber-800 leading-tight mt-0.5">
                        New barber accounts start as <strong className="font-bold">Pending Verification</strong>. Our admin team validates credentials and license records before bookings unlock.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setBarberStep(2)}
                      className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleBarberRegisterSubmit}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-sky-500 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-500/20 hover:bg-sky-400 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      <span>Submit Application</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* 4. FORGOT PASSWORD MODE */}
          {/* ========================================================================= */}
          {mode === 'forgot-password' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Reset Password</h3>
                  <p className="text-xs text-slate-500 mt-0.5">We'll send secure password recovery instructions</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setForgotSubmitted(false);
                    setErrorMessage('');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
              </div>

              {!forgotSubmitted ? (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Registered Account Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        placeholder="name@example.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2.5 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-sky-500 py-3 text-xs font-bold text-white shadow-md shadow-sky-500/20 hover:bg-sky-400 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    <span>Send Reset Instructions</span>
                  </button>
                </form>
              ) : (
                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-white shadow-md">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Check Your Inbox</h4>
                    <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                      {forgotMessage || 'If an account exists for this email, password reset instructions have been sent.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setForgotSubmitted(false);
                    }}
                    className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-500"
                  >
                    Return to Log In
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* SUCCESS MODAL FOR BARBER REGISTRATION */}
          {/* ========================================================================= */}
          {barberSuccessModal && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
              <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl text-center space-y-4 border border-slate-100 animate-in zoom-in-95 duration-200">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg shadow-amber-500/30">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Application Submitted!</h3>
                  <div className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                    Status: Pending Verification
                  </div>
                  <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                    Welcome to BarberPilot! Your account has been created. Our administrative team will review your licensing and portfolio. You can now access your Barber Dashboard to customize your schedule and services.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBarberSuccessModal(false);
                    if (onSuccess) onSuccess();
                    onClose();
                  }}
                  className="w-full rounded-2xl bg-sky-500 py-3 text-xs font-bold text-white shadow-md hover:bg-sky-400 transition-colors"
                >
                  Enter Barber Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
