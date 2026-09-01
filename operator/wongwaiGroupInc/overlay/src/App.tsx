import { ResetPasswordView } from './components/ResetPasswordView';
import React, { useState, useEffect, useCallback } from 'react';
import { LoginView } from './components/LoginView';
import { TopNavbar } from './components/TopNavbar';
import { Sidebar, NavTab } from './components/Sidebar';

import { OverviewView } from './components/views/OverviewView';
import { RevenueView } from './components/views/RevenueView';
import { MarketMindView } from './components/views/MarketMindView';
import { ShiftForceView } from './components/views/ShiftForceView';
import { BarberGoView } from './components/views/BarberGoView';
import { SupportInboxView } from './components/views/SupportInboxView';
import { AlertCenterView } from './components/views/AlertCenterView';
import { AiCeoView } from './components/views/AiCeoView';
import { SystemHealthView } from './components/views/SystemHealthView';
import { ProductComparisonView } from './components/views/ProductComparisonView';
import { ReportsView } from './components/views/ReportsView';
import { AddProductView } from './components/views/AddProductView';
import { IntegrationsView } from './components/views/IntegrationsView';
import { SettingsView } from './components/views/SettingsView';
import { ReconciliationView } from './components/views/ReconciliationView';
import { ExecutiveOsView } from './components/views/ExecutiveOsView';

import { api, getStoredToken, clearStoredToken } from './lib/api';
import {
  OwnerSession,
  CompanyOverview,
  Product,
  AlertItem,
  SupportTicket,
  OperatingCostItem,
  ProductSystemHealth,
  ExecutiveReport,
  MarketMindMetrics,
  ShiftForceMetrics,
  BarberGoMetrics,
} from './types';

export function App() {
  const [session, setSession] = useState<OwnerSession | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [appMode, setAppMode] = useState<'demo' | 'production'>('demo');
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [dateRange, setDateRange] = useState<string>('This month');
  const [darkMode, setDarkMode] = useState<boolean>(true);

  // Core Data
  const [overview, setOverview] = useState<CompanyOverview | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [operatingCosts, setOperatingCosts] = useState<OperatingCostItem[]>([]);
  const [systemsHealth, setSystemsHealth] = useState<ProductSystemHealth[]>([]);
  const [reports, setReports] = useState<ExecutiveReport[]>([]);

  // Product deep metrics
  const [marketMindMetrics, setMarketMindMetrics] = useState<MarketMindMetrics | null>(null);
  const [shiftForceMetrics, setShiftForceMetrics] = useState<ShiftForceMetrics | null>(null);
  const [barberGoMetrics, setBarberGoMetrics] = useState<BarberGoMetrics | null>(null);

  // Initial Auth Check
  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        setCheckingAuth(false);
        return;
      }

      try {
        const currentSession = await api.checkSession();
        setSession(currentSession);
      } catch {
        clearStoredToken();
        setSession(null);
      } finally {
        setCheckingAuth(false);
      }
    };

    initAuth();

    const handleAuthError = () => {
      setSession(null);
    };
    window.addEventListener('occ_auth_error', handleAuthError);
    return () => window.removeEventListener('occ_auth_error', handleAuthError);
  }, []);

  // Fetch all primary operational telemetry
  const loadAllData = useCallback(async () => {
    if (!session) return;
    try {
      const [
        ovRes,
        prodRes,
        alertRes,
        ticketRes,
        costRes,
        sysRes,
        repRes,
        modeRes,
        mmRes,
        sfRes,
        bgRes,
      ] = await Promise.all([
        api.getOverview().catch(() => null),
        api.getProducts().catch(() => []),
        api.getAlerts().catch(() => []),
        api.getSupportTickets().catch(() => []),
        api.getOperatingCosts().catch(() => []),
        api.getSystemsHealth().catch(() => []),
        api.getReports().catch(() => []),
        api.getMode().catch(() => ({ mode: 'demo' as const })),
        api.getMarketMind().catch(() => null),
        api.getShiftForce().catch(() => null),
        api.getBarberGo().catch(() => null),
      ]);

      if (ovRes) setOverview(ovRes);
      if (prodRes) setProducts(prodRes);
      if (alertRes) setAlerts(alertRes);
      if (ticketRes) setSupportTickets(ticketRes);
      if (costRes) setOperatingCosts(costRes);
      if (sysRes) setSystemsHealth(sysRes);
      if (repRes) setReports(repRes);
      if (modeRes) setAppMode(modeRes.mode);
      if (mmRes) setMarketMindMetrics(mmRes);
      if (sfRes) setShiftForceMetrics(sfRes);
      if (bgRes) setBarberGoMetrics(bgRes);
    } catch (err) {
      console.error('Error fetching dashboard telemetry:', err);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      loadAllData();
      // Regular background poll every 10 seconds for real-time telemetry
      const interval = setInterval(loadAllData, 10000);
      return () => clearInterval(interval);
    }
  }, [session, loadAllData]);

  const handleToggleMode = async (newMode: 'demo' | 'production') => {
    try {
      await api.setMode(newMode);
      setAppMode(newMode);
      loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle mode');
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      clearStoredToken();
      setSession(null);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#08090C] flex flex-col items-center justify-center text-[#AA771C]">
        <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-3 shadow-lg shadow-[#D4AF37]/20" />
        <span className="text-xs font-mono tracking-wider text-[#F3E5AB]">
          VERIFYING PRIVATE OWNER PERMISSIONS...
        </span>
      </div>
    );
  }

  // Password Reset Route Check
  const isResetPasswordPath = typeof window !== 'undefined' && (
    window.location.pathname === '/reset-password' ||
    window.location.search.includes('token=')
  );

  if (isResetPasswordPath) {
    return <ResetPasswordView onBackToLogin={() => {
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, '/');
      }
      setSession(null);
    }} />;
  }

  // 1. Unauthenticated -> Strict Owner Login Portal
  if (!session) {
    return <LoginView onLoginSuccess={(s) => setSession(s)} />;
  }

  const activeAlertCount = alerts.filter((a) => a.status === 'active').length;
  const criticalAlertCount = alerts.filter((a) => a.status === 'active' && a.severity === 'red').length;
  const openTicketCount = supportTickets.filter((t) => t.status !== 'Resolved').length;

  return (
    <div className="min-h-screen bg-[#08090C] text-[#E8E6DF] flex flex-col font-sans antialiased selection:bg-[#D4AF37]/30 selection:text-[#F3E5AB]">
      
      {/* Top Navbar */}
      <TopNavbar
        session={session}
        appMode={appMode}
        onToggleMode={handleToggleMode}
        dateRange={dateRange}
        onSelectDateRange={setDateRange}
        onOpenAiCeo={() => setCurrentTab('ai-ceo')}
        onOpenAlerts={() => setCurrentTab('alerts')}
        alerts={alerts}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
      />

      {/* Mobile executive strip */}
      <div className="md:hidden flex gap-2 overflow-x-auto border-b border-[#D4AF37]/20 px-3 py-2">
        {['executive', 'overview', 'alerts', 'systems', 'ai-ceo'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setCurrentTab(tab as NavTab)}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-[11px] ${
              currentTab === tab ? 'border-[#D4AF37] bg-[#D4AF37] text-[#0B0C10]' : 'border-[#D4AF37]/30'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Fixed Multi-App Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          products={products}
          activeAlertCount={activeAlertCount}
          openTicketCount={openTicketCount}
          criticalAlertCount={criticalAlertCount}
        />

        {/* Dynamic Content Viewport */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {currentTab === 'executive' && <ExecutiveOsView />}

          {currentTab === 'overview' && (
            <OverviewView
              overview={overview}
              alerts={alerts}
              products={products}
              dateRange={dateRange}
              onNavigate={(tab) => setCurrentTab(tab as NavTab)}
            />
          )}

          {currentTab === 'revenue' && (
            <RevenueView
              overview={overview}
              operatingCosts={operatingCosts}
              products={products}
              dateRange={dateRange}
            />
          )}

          {currentTab === 'reconciliation' && (
            <ReconciliationView />
          )}

          {currentTab === 'marketmind' && (
            <MarketMindView metrics={marketMindMetrics} />
          )}

          {currentTab === 'shiftforce' && (
            <ShiftForceView metrics={shiftForceMetrics} />
          )}

          {currentTab === 'barbergo' && (
            <BarberGoView metrics={barberGoMetrics} />
          )}

          {currentTab === 'alerts' && (
            <AlertCenterView alerts={alerts} onRefreshAlerts={loadAllData} />
          )}

          {currentTab === 'support' && (
            <SupportInboxView
              tickets={supportTickets}
              onRefreshTickets={loadAllData}
            />
          )}

          {currentTab === 'ai-ceo' && <AiCeoView />}

          {currentTab === 'systems' && (
            <SystemHealthView
              healthList={systemsHealth}
              onRefresh={loadAllData}
            />
          )}

          {currentTab === 'comparison' && (
            <ProductComparisonView products={products} />
          )}

          {currentTab === 'reports' && (
            <ReportsView reports={reports} onRefreshReports={loadAllData} />
          )}

          {currentTab === 'costs' && (
            <RevenueView
              overview={overview}
              operatingCosts={operatingCosts}
              products={products}
              dateRange={dateRange}
            />
          )}

          {currentTab === 'add-product' && (
            <AddProductView
              onProductAdded={(newP) => {
                setProducts((prev) => [...prev, newP]);
                loadAllData();
              }}
            />
          )}

          {currentTab === 'integrations' && (
            <IntegrationsView products={products} onRefreshAll={loadAllData} />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              session={session}
              appMode={appMode}
              onToggleMode={handleToggleMode}
              onLogout={handleLogout}
            />
          )}

          {/* Dynamic Future Product Fallback View */}
          {currentTab.startsWith('prod-') && (
            <div className="bg-[#0F1117] border border-[#D4AF37]/30 rounded-2xl p-8 text-center space-y-4 shadow-xl">
              <h2 className="text-xl font-bold text-white font-['Cinzel',serif] text-gold-gradient">Custom Product Ingestion Live</h2>
              <p className="text-xs text-[#A6A08D] max-w-md mx-auto">
                This connected future product is receiving normalized <code className="text-[#F3E5AB] font-mono bg-[#141722] px-1.5 py-0.5 rounded border border-[#D4AF37]/20">ops_events</code> via HMAC webhook.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setCurrentTab('integrations')}
                  className="px-4 py-2 bg-gradient-to-r from-[#BF953F] via-[#F3E5AB] to-[#AA771C] text-[#0B0C10] text-xs font-bold rounded-xl shadow-md shadow-[#D4AF37]/20 hover:brightness-110 cursor-pointer"
                >
                  Test Event Ingestion
                </button>
              </div>
            </div>
          )}
        </main>

      </div>

    </div>
  );
}

export default App;
