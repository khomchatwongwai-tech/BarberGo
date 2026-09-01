import React from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  Home,
  Calendar,
  MessageSquare,
  User,
  LayoutDashboard,
  Inbox,
  DollarSign,
  UserCheck,
  FileCheck2,
  AlertCircle,
  Settings,
  CreditCard,
  Network
} from 'lucide-react';
import { UserRole } from '../../types';

interface BottomNavProps {
  role?: UserRole;
  activeTab: string;
  onTabChange?: (tab: string) => void;
  onChangeTab?: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  role,
  activeTab,
  onTabChange,
  onChangeTab
}) => {
  const { user, currentRole } = useAuth();
  const { t } = useTranslation();
  const effectiveRole = role || user?.role || currentRole || 'customer';

  const handleSelectTab = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId);
    } else if (onChangeTab) {
      onChangeTab(tabId);
    }
  };

  // 4 Customer Tabs, 5 Barber Tabs, 6 Admin Tabs
  const getTabs = () => {
    switch (effectiveRole) {
      case 'barber':
        return [
          { id: 'dashboard', label: t('tabDashboard'), icon: <LayoutDashboard className="h-5 w-5" /> },
          { id: 'requests', label: t('tabRequests'), icon: <Inbox className="h-5 w-5" /> },
          { id: 'calendar', label: t('tabCalendar'), icon: <Calendar className="h-5 w-5" /> },
          { id: 'earnings', label: t('tabEarnings'), icon: <DollarSign className="h-5 w-5" /> },
          { id: 'profile', label: t('tabProfile'), icon: <UserCheck className="h-5 w-5" /> }
        ];

      case 'admin':
        return [
          { id: 'overview', label: t('tabAdminOverview'), icon: <LayoutDashboard className="h-5 w-5" /> },
          { id: 'file_intelligence', label: 'File AI', icon: <Network className="h-5 w-5" /> },
          { id: 'verifications', label: t('tabAdminVerifications'), icon: <FileCheck2 className="h-5 w-5" /> },
          { id: 'bookings', label: t('tabBookings'), icon: <Calendar className="h-5 w-5" /> },
          { id: 'payments', label: t('tabAdminPayments'), icon: <CreditCard className="h-5 w-5" /> },
          { id: 'disputes', label: t('tabAdminDisputes'), icon: <AlertCircle className="h-5 w-5" /> },
          { id: 'settings', label: t('tabAdminSettings'), icon: <Settings className="h-5 w-5" /> }
        ];

      case 'customer':
      default:
        return [
          { id: 'explore', label: t('tabExplore'), icon: <Home className="h-5 w-5" /> },
          { id: 'bookings', label: t('tabBookings'), icon: <Calendar className="h-5 w-5" /> },
          { id: 'messages', label: t('tabMessages'), icon: <MessageSquare className="h-5 w-5" /> },
          { id: 'profile', label: t('tabProfile'), icon: <User className="h-5 w-5" /> }
        ];
    }
  };

  const tabs = getTabs();

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav aria-label="Mobile Navigation" className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-xl px-2 py-1.5 md:hidden shadow-lg" id="mobile-bottom-nav">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id || (tab.id === 'explore' && activeTab === 'home');
            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                  isActive ? 'text-sky-600 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
                id={`mobile-nav-${tab.id}`}
              >
                <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-sky-50 text-sky-500' : ''}`}>
                  {tab.icon}
                </div>
                <span className="text-[10px] tracking-tight mt-0.5">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
