import React from 'react';
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
  CreditCard
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
          { id: 'dashboard', label: 'Home', icon: <LayoutDashboard className="h-5 w-5" /> },
          { id: 'requests', label: 'Requests', icon: <Inbox className="h-5 w-5" /> },
          { id: 'calendar', label: 'Schedule', icon: <Calendar className="h-5 w-5" /> },
          { id: 'earnings', label: 'Earnings', icon: <DollarSign className="h-5 w-5" /> },
          { id: 'profile', label: 'Profile', icon: <UserCheck className="h-5 w-5" /> }
        ];

      case 'admin':
        return [
          { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-5 w-5" /> },
          { id: 'verifications', label: 'Barbers', icon: <FileCheck2 className="h-5 w-5" /> },
          { id: 'bookings', label: 'Bookings', icon: <Calendar className="h-5 w-5" /> },
          { id: 'payments', label: 'Payments', icon: <CreditCard className="h-5 w-5" /> },
          { id: 'disputes', label: 'Disputes', icon: <AlertCircle className="h-5 w-5" /> },
          { id: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> }
        ];

      case 'customer':
      default:
        return [
          { id: 'explore', label: 'Home', icon: <Home className="h-5 w-5" /> },
          { id: 'bookings', label: 'Bookings', icon: <Calendar className="h-5 w-5" /> },
          { id: 'messages', label: 'Messages', icon: <MessageSquare className="h-5 w-5" /> },
          { id: 'profile', label: 'Profile', icon: <User className="h-5 w-5" /> }
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
