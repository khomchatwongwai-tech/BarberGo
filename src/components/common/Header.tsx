import React, { useState } from 'react';
import { useLanguage, useTranslation } from '../../context/LanguageContext';
import { SupportedLanguage } from '../../types';
import {  useAuth } from '../../context/AuthContext';
import {  useConfig } from '../../context/ConfigContext';
import { 
  Scissors,
  Bell,
  Sparkles,
  LifeBuoy,
  ShieldAlert,
  Clock,
  MapPin,
  CheckCircle,
  Menu,
  X
} from 'lucide-react';
import {  SafetyModal } from './SafetyModal';

interface HeaderProps {
  activeTab?: string;
  onNavigate?: (tab: string) => void;
  onOpenHaircutAI?: () => void;
  onOpenSupportAI?: () => void;
  onOpenConsultation?: () => void;
  onOpenSupport?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  // i18n hook

  // i18n hook

  activeTab,
  onNavigate,
  onOpenHaircutAI,
  onOpenSupportAI,
  onOpenConsultation,
  onOpenSupport
}) => {
  const { user, notifications, unreadNotificationCount, markNotificationRead } = useAuth();
  const { settings } = useConfig();
  const { currentLanguage, setLanguage, t } = useLanguage();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);

  const handleOpenConsultation = onOpenHaircutAI || onOpenConsultation;
  const handleOpenSupport = onOpenSupportAI || onOpenSupport;

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'barber':
        return <span className="rounded-full bg-sky-50 border border-sky-200 px-2 py-0.5 text-[11px] font-bold text-sky-700">Pro Barber</span>;
      case 'admin':
        return <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-bold text-indigo-700">Admin</span>;
      case 'support':
        return <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-bold text-blue-700">Support</span>;
      default:
        return <span className="rounded-full bg-sky-50 border border-sky-200 px-2 py-0.5 text-[11px] font-bold text-sky-700">Customer</span>;
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs" id="main-app-header">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Brand Logo & Tagline */}
          <div
            onClick={() => onNavigate && onNavigate(user?.role === 'barber' ? 'dashboard' : user?.role === 'admin' ? 'overview' : 'explore')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-sky-400 text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <Scissors className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-slate-900 font-sans">
                  {settings.appName}
                </span>
                {getRoleBadge()}
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block font-medium">
                {settings.tagline}
              </p>
            </div>
          </div>

          {/* Action Controls & User Summary */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* AI Haircut Consultant Button */}
            {user?.role === 'customer' && handleOpenConsultation && (
              <button
                onClick={handleOpenConsultation}
                className="flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 transition-all hover:bg-sky-100 hover:border-sky-300 shadow-xs"
                title="Get AI Haircut & Style Advice"
                id="header-ai-consultant-btn"
              >
                <Sparkles className="h-3.5 w-3.5 text-sky-500" />
                <span className="hidden sm:inline">Ask BarberGo AI</span>
              </button>
            )}

            {/* Safety SOS Helpline */}
            <button
              onClick={() => setShowSafetyModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 hover:border-red-300 transition-all shadow-xs"
              title="24/7 Safety Helpline"
              id="header-safety-sos-btn"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
              <span className="hidden sm:inline">Safety SOS</span>
            </button>

            {/* Support Help */}
            {handleOpenSupport && (
              <button
                onClick={handleOpenSupport}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-xs"
                title="Instant Support & Policies"
                id="header-support-btn"
              >
                <LifeBuoy className="h-3.5 w-3.5 text-sky-500" />
                <span className="hidden md:inline">Support</span>
              </button>
            )}

            {/* Language Selector Dropdown */}
            <div className="relative">
              <select
                value={currentLanguage}
                onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                className="flex h-9 items-center rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500"
                id="header-language-select"
                title={t('interfaceLanguage')}
              >
                <option value="en">🇺🇸 EN</option>
                <option value="es">🇪🇸 ES</option>
                <option value="zh">🇨🇳 ZH</option>
                <option value="th">🇹🇭 TH</option>
                <option value="ko">🇰🇷 KO</option>
                <option value="ja">🇯🇵 JA</option>
                <option value="vi">🇻🇳 VI</option>
                <option value="fr">🇫🇷 FR</option>
              </select>
            </div>

            {/* Notification Bell with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-xs"
                title="Notifications"
                id="header-notifications-btn"
              >
                <Bell className="h-4 w-4" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white shadow">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {showNotifications && (
                <div
                  className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  id="notifications-popover"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <h4 className="text-xs font-bold text-slate-900">Notifications</h4>
                    <span className="text-[11px] text-sky-600 font-medium">
                      {unreadNotificationCount} unread
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2 divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <p className="py-4 text-center text-xs text-slate-500">No notifications yet.</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationRead(n.id)}
                          className={`pt-2 flex items-start gap-2.5 cursor-pointer rounded-xl p-2 transition-colors ${
                            !n.read ? 'bg-sky-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 mt-0.5">
                            <Clock className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-900 leading-snug">{n.title}</p>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{n.message}</p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {!n.read && (
                            <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0 mt-1.5" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar */}
            {user && (
              <div className="flex items-center gap-2.5 pl-1 sm:pl-2">
                <img
                  src={user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'}
                  alt={user.fullName}
                  className="h-9 w-9 rounded-xl object-cover border-2 border-sky-400 shadow-xs"
                />
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[110px]">
                    {user.fullName}
                  </p>
                  <p className="text-[10px] text-slate-500 capitalize">{user.role}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Safety SOS Modal */}
      {showSafetyModal && (
        <SafetyModal
          isOpen={showSafetyModal}
          onClose={() => setShowSafetyModal(false)}
        />
      )}
    </>
  );
};