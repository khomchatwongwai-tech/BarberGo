import React, { useState } from 'react';
import { ConfigProvider, useConfig } from './context/ConfigContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { RoleSwitcherBar } from './components/common/RoleSwitcherBar';

// Customer Components
import { CustomerExplore } from './components/customer/CustomerExplore';
import { CustomerBookingsView } from './components/customer/CustomerBookingsView';
import { CustomerProfileView } from './components/customer/CustomerProfileView';
import { BookingFlowModal } from './components/customer/BookingFlowModal';
import { BarberDetailModal } from './components/customer/BarberDetailModal';

// Barber Components
import { BarberDashboardView } from './components/barber/BarberDashboardView';
import { BarberRequestsView } from './components/barber/BarberRequestsView';
import { BarberScheduleView } from './components/barber/BarberScheduleView';
import { BarberEarningsView } from './components/barber/BarberEarningsView';
import { BarberProfileManageView } from './components/barber/BarberProfileManageView';

// Messaging
import { MessagesInboxView } from './components/messaging/MessagesInboxView';

// Admin Components
import { AdminOverview } from './components/admin/AdminOverview';
import { AdminSettingsView } from './components/admin/AdminSettingsView';
import { AdminBarberVerificationView } from './components/admin/AdminBarberVerificationView';
import { AdminDisputesView } from './components/admin/AdminDisputesView';
import { AdminPromoCodesView } from './components/admin/AdminPromoCodesView';
import { AdminBookingsView } from './components/admin/AdminBookingsView';
import { AdminPaymentsView } from './components/admin/AdminPaymentsView';
import { UniversalFileIntelligenceView } from './components/admin/UniversalFileIntelligenceView';

// Support Components
import { SupportQueueView } from './components/support/SupportQueueView';

// AI Drawers and Modals
import { AskBarberPilotAIModal } from './components/ai/AskBarberGoAIModal';
import { AISupportDrawer } from './components/ai/AISupportDrawer';
import { AIBioModal } from './components/ai/AIBioModal';

const AppContent: React.FC = () => {
  const { user, currentRole } = useAuth();
  const { settings } = useConfig();

  // Active view tabs
  const [customerTab, setCustomerTab] = useState<'explore' | 'bookings' | 'messages' | 'profile'>('explore');
  const [barberTab, setBarberTab] = useState<'dashboard' | 'requests' | 'calendar' | 'earnings' | 'profile'>('dashboard');
  const [adminTab, setAdminTab] = useState<'overview' | 'settings' | 'verifications' | 'disputes' | 'promo_codes' | 'bookings' | 'payments' | 'file_intelligence'>('overview');
  const [supportTab, setSupportTab] = useState<'queue'>('queue');

  // Customer Booking & Barber Modals
  const [bookingFlowOpen, setBookingFlowOpen] = useState(false);
  const [bookingPreselectedBarberId, setBookingPreselectedBarberId] = useState<string | undefined>(undefined);
  const [bookingPreselectedServiceId, setBookingPreselectedServiceId] = useState<string | undefined>(undefined);
  const [bookingPreselectedCategory, setBookingPreselectedCategory] = useState<string | undefined>(undefined);
  const [bookingConsultationNotes, setBookingConsultationNotes] = useState<string | undefined>(undefined);

  const [selectedBarberDetailId, setSelectedBarberDetailId] = useState<string | null>(null);

  // AI Modal states
  const [showAskAI, setShowAskAI] = useState(false);
  const [showSupportAI, setShowSupportAI] = useState(false);
  const [showBioAI, setShowBioAI] = useState(false);

  // Sync bottom nav tabs
  const currentActiveTab =
    currentRole === 'customer'
      ? customerTab
      : currentRole === 'barber'
      ? barberTab
      : currentRole === 'admin'
      ? adminTab
      : supportTab;

  const handleTabChange = (tab: string) => {
    if (currentRole === 'customer') {
      if (tab === 'home') setCustomerTab('explore');
      else setCustomerTab(tab as any);
    } else if (currentRole === 'barber') {
      setBarberTab(tab as any);
    } else if (currentRole === 'admin') {
      setAdminTab(tab as any);
    } else if (currentRole === 'support') {
      setSupportTab(tab as any);
    }
  };

  const handleOpenBookingFlow = (barberId?: string, serviceId?: string, category?: string, notes?: string) => {
    setBookingPreselectedBarberId(barberId);
    setBookingPreselectedServiceId(serviceId);
    setBookingPreselectedCategory(category);
    setBookingConsultationNotes(notes);
    setBookingFlowOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans selection:bg-sky-400 selection:text-white">
      {/* Dev / Demo Role Quick Switcher (shown in non-production or sandbox) */}
      {settings.appMode !== 'production' && <RoleSwitcherBar />}

      {/* Header */}
      <Header
        activeTab={currentActiveTab}
        onNavigate={handleTabChange}
        onOpenHaircutAI={() => setShowAskAI(true)}
        onOpenSupportAI={() => setShowSupportAI(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* CUSTOMER PORTAL (4 Tabs) */}
        {currentRole === 'customer' && (
          <>
            {customerTab === 'explore' && (
              <CustomerExplore
                onSelectBarber={(id) => setSelectedBarberDetailId(id)}
                onOpenBookingFlow={handleOpenBookingFlow}
                onOpenAskAI={() => setShowAskAI(true)}
              />
            )}
            {customerTab === 'bookings' && (
              <CustomerBookingsView
                onOpenConsultation={() => setShowAskAI(true)}
                onBookAgain={(barberId, serviceId) => handleOpenBookingFlow(barberId, serviceId)}
              />
            )}
            {customerTab === 'messages' && <MessagesInboxView />}
            {customerTab === 'profile' && <CustomerProfileView />}
          </>
        )}

        {/* BARBER FREELANCE PORTAL (5 Tabs) */}
        {currentRole === 'barber' && (
          <>
            {barberTab === 'dashboard' && (
              <BarberDashboardView
                onNavigateTab={(tab) => setBarberTab(tab as any)}
                onOpenBioGenerator={() => setShowBioAI(true)}
              />
            )}
            {barberTab === 'requests' && <BarberRequestsView />}
            {barberTab === 'calendar' && <BarberScheduleView />}
            {barberTab === 'earnings' && <BarberEarningsView />}
            {barberTab === 'profile' && <BarberProfileManageView />}
          </>
        )}

        {/* ADMIN PORTAL (6 Tabs) */}
        {currentRole === 'admin' && (
          <>
            {adminTab === 'overview' && (
              <AdminOverview onNavigate={(tab) => setAdminTab(tab as any)} />
            )}
            {adminTab === 'settings' && <AdminSettingsView />}
            {adminTab === 'verifications' && <AdminBarberVerificationView />}
            {adminTab === 'disputes' && <AdminDisputesView />}
            {adminTab === 'promo_codes' && <AdminPromoCodesView />}
            {adminTab === 'bookings' && <AdminBookingsView />}
            {adminTab === 'payments' && <AdminPaymentsView />}
            {adminTab === 'file_intelligence' && <UniversalFileIntelligenceView />}
          </>
        )}

        {/* SUPPORT AGENT PORTAL */}
        {currentRole === 'support' && (
          <>
            {supportTab === 'queue' && (
              <SupportQueueView onOpenAICopilot={() => setShowSupportAI(true)} />
            )}
          </>
        )}
      </main>

      {/* Bottom Nav for Mobile Screens */}
      <BottomNav
        role={currentRole}
        activeTab={currentActiveTab}
        onTabChange={handleTabChange}
        onChangeTab={handleTabChange}
      />

      {/* Single 6-Step Guided Booking Flow Modal */}
      {bookingFlowOpen && (
        <BookingFlowModal
          isOpen={bookingFlowOpen}
          onClose={() => setBookingFlowOpen(false)}
          preselectedBarberId={bookingPreselectedBarberId}
          preselectedServiceId={bookingPreselectedServiceId}
          preselectedCategory={bookingPreselectedCategory}
          preselectedNotes={bookingConsultationNotes}
          onBookingComplete={(booking) => {
            setCustomerTab('bookings');
          }}
        />
      )}

      {/* Barber Detail & Portfolio Discovery Modal */}
      {selectedBarberDetailId && (
        <BarberDetailModal
          barberId={selectedBarberDetailId}
          isOpen={!!selectedBarberDetailId}
          onClose={() => setSelectedBarberDetailId(null)}
          onStartBooking={(barberId, serviceId) => {
            setSelectedBarberDetailId(null);
            handleOpenBookingFlow(barberId, serviceId);
          }}
        />
      )}

      {/* Invisible AI: Consolidated Ask BarberPilot AI Stylist Assistant */}
      {showAskAI && (
        <AskBarberPilotAIModal
          isOpen={showAskAI}
          onClose={() => setShowAskAI(false)}
          onSelectServiceAndBook={(category, notes) => {
            setShowAskAI(false);
            handleOpenBookingFlow(undefined, undefined, category, notes);
          }}
        />
      )}

      {/* Support AI Assistant */}
      {showSupportAI && (
        <AISupportDrawer
          isOpen={showSupportAI}
          onClose={() => setShowSupportAI(false)}
        />
      )}

      {/* Barber AI Bio & Service Copywriter */}
      {showBioAI && (
        <AIBioModal
          isOpen={showBioAI}
          onClose={() => setShowBioAI(false)}
          barberName={user?.fullName || 'Master Barber'}
          onApplyBio={() => setShowBioAI(false)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <ConfigProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ConfigProvider>
  );
}
