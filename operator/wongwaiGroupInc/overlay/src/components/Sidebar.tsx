import React from 'react';
import {
  LayoutDashboard,
  DollarSign,
  Package,
  TrendingUp,
  Briefcase,
  Scissors,
  PlusCircle,
  Headphones,
  AlertOctagon,
  Sparkles,
  Server,
  FileText,
  PieChart,
  Scale,
  Webhook,
  Settings,
  Crown,
  CheckCheck,
  Building2,
} from 'lucide-react';
import { Product } from '../types';

export type NavTab =
  | 'overview'
  | 'revenue'
  | 'reconciliation'
  | 'products'
  | 'marketmind'
  | 'shiftforce'
  | 'barbergo'
  | 'add-product'
  | 'support'
  | 'alerts'
  | 'ai-ceo'
  | 'systems'
  | 'comparison'
  | 'reports'
  | 'costs'
  | 'integrations'
  | 'settings'
  | string; // for dynamic future products `prod-[slug]`

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  products: Product[];
  activeAlertCount: number;
  openTicketCount: number;
  criticalAlertCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  products,
  activeAlertCount,
  openTicketCount,
  criticalAlertCount,
}) => {
  // Built-in fixed products and any custom dynamic future products
  const standardProducts = ['marketmind', 'shiftforce', 'barbergo'];
  const customProducts = products.filter(p => !standardProducts.includes(p.slug));

  const mainNav = [
    { id: 'executive', label: 'Corporate OS', icon: Building2 },
    { id: 'overview', label: 'Overview Cockpit', icon: LayoutDashboard },
    { id: 'revenue', label: 'Revenue & Cash Matrix', icon: DollarSign },
    {
      id: 'reconciliation',
      label: 'Reconciliation Center',
      icon: CheckCheck,
      badge: '1 Action',
      badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold',
      highlight: true
    },
  ];

  const productNav = [
    { id: 'marketmind', label: 'MarketMind AI', icon: TrendingUp, tag: 'FinTech', gold: true },
    { id: 'shiftforce', label: 'ShiftForce', icon: Briefcase, tag: 'B2B SaaS', gold: false },
    { id: 'barbergo', label: 'BarberGo', icon: Scissors, tag: 'Marketplace', gold: false },
  ];

  const opsNav = [
    {
      id: 'alerts',
      label: 'Alert Center',
      icon: AlertOctagon,
      badge: activeAlertCount > 0 ? activeAlertCount : null,
      badgeColor: criticalAlertCount > 0 ? 'bg-rose-600 text-white' : 'bg-[#D4AF37] text-[#0B0C10] font-black'
    },
    {
      id: 'support',
      label: 'Support Inbox',
      icon: Headphones,
      badge: openTicketCount > 0 ? openTicketCount : null,
      badgeColor: 'bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#F3E5AB]'
    },
    { id: 'ai-ceo', label: 'AI CEO Analyst', icon: Sparkles, highlight: true },
    { id: 'systems', label: 'System Health & SLA', icon: Server },
  ];

  const analyticsNav = [
    { id: 'comparison', label: 'Product Scorecard', icon: Scale },
    { id: 'reports', label: 'Executive Digests', icon: FileText },
    { id: 'costs', label: 'Operating Expenses', icon: PieChart },
  ];

  const systemNav = [
    { id: 'integrations', label: 'Webhooks & HMAC', icon: Webhook },
    { id: 'settings', label: 'Security & Access', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex w-64 bg-[#090A0F] border-r border-[#D4AF37]/20 text-[#D8D4C7] flex-col h-[calc(100vh-5.75rem)] sticky top-[5.75rem] overflow-y-auto select-none shrink-0 py-4 px-3 shadow-2xl">
      
      {/* 1. Main Navigation */}
      <div className="space-y-1 mb-5">
        <div className="px-3 pb-1 text-[10px] font-bold text-[#AA771C] uppercase tracking-[0.15em] flex items-center gap-1">
          <Crown className="w-3 h-3 text-[#D4AF37]" />
          <span>Core Command</span>
        </div>
        {mainNav.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                isActive
                  ? 'bg-gradient-to-r from-[#BF953F] via-[#F3E5AB] to-[#AA771C] text-[#0B0C10] font-bold shadow-md shadow-[#D4AF37]/25'
                  : 'text-[#D8D4C7] hover:bg-[#141722] hover:text-[#F3E5AB]'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#0B0C10]' : 'text-[#D4AF37]'}`} />
              <span className="flex-1 truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Connected Products */}
      <div className="space-y-1 mb-5">
        <div className="flex items-center justify-between px-3 pb-1">
          <span className="text-[10px] font-bold text-[#AA771C] uppercase tracking-[0.15em]">
            Connected Ventures ({products.length})
          </span>
          <button
            onClick={() => onSelectTab('add-product')}
            className="text-[10px] text-[#F3E5AB] hover:text-white font-bold flex items-center gap-0.5 cursor-pointer bg-[#D4AF37]/15 px-1.5 py-0.5 rounded border border-[#D4AF37]/30 transition-colors"
            title="Connect a new future app"
          >
            <PlusCircle className="w-3 h-3 text-[#D4AF37]" />
            <span>Add</span>
          </button>
        </div>

        {productNav.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer text-left ${
                isActive
                  ? 'bg-gradient-to-r from-[#BF953F] via-[#F3E5AB] to-[#AA771C] text-[#0B0C10] font-bold shadow-md shadow-[#D4AF37]/25'
                  : 'text-[#D8D4C7] hover:bg-[#141722] hover:text-[#F3E5AB]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#0B0C10]' : 'text-[#D4AF37]'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                  isActive ? 'bg-[#0B0C10]/20 text-[#0B0C10]' : 'bg-[#141722] text-[#D4AF37] border border-[#D4AF37]/20'
                }`}
              >
                {item.tag}
              </span>
            </button>
          );
        })}

        {/* Dynamic Future Products */}
        {customProducts.map((p) => {
          const tabKey = `prod-${p.slug}`;
          const isActive = currentTab === tabKey;
          return (
            <button
              key={p.id}
              onClick={() => onSelectTab(tabKey)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer text-left ${
                isActive
                  ? 'bg-gradient-to-r from-[#BF953F] via-[#F3E5AB] to-[#AA771C] text-[#0B0C10] font-bold shadow-md shadow-[#D4AF37]/25'
                  : 'text-[#D8D4C7] hover:bg-[#141722] hover:text-[#F3E5AB]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Package className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#0B0C10]' : 'text-[#D4AF37]'}`} />
                <span className="truncate">{p.name}</span>
              </div>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                  isActive ? 'bg-[#0B0C10]/20 text-[#0B0C10]' : 'bg-[#141722] text-[#F3E5AB]'
                }`}
              >
                Custom
              </span>
            </button>
          );
        })}

        {/* Add Product Button */}
        <button
          onClick={() => onSelectTab('add-product')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer text-left border border-dashed ${
            currentTab === 'add-product'
              ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#F3E5AB]'
              : 'border-[#D4AF37]/25 text-[#8A8472] hover:border-[#D4AF37]/50 hover:text-[#F3E5AB] hover:bg-[#141722]/50'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>+ Connect Future App</span>
        </button>
      </div>

      {/* 3. Operations & AI */}
      <div className="space-y-1 mb-5">
        <div className="px-3 pb-1 text-[10px] font-bold text-[#AA771C] uppercase tracking-[0.15em]">
          Operations & Intelligence
        </div>
        {opsNav.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer text-left ${
                isActive
                  ? 'bg-gradient-to-r from-[#BF953F] via-[#F3E5AB] to-[#AA771C] text-[#0B0C10] font-bold shadow-md shadow-[#D4AF37]/25'
                  : item.highlight
                  ? 'bg-gradient-to-r from-[#2B230C]/60 to-[#1A1608]/40 border border-[#D4AF37]/40 text-[#F3E5AB] hover:brightness-125'
                  : 'text-[#D8D4C7] hover:bg-[#141722] hover:text-[#F3E5AB]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-[#0B0C10]' : item.highlight ? 'text-[#F3E5AB]' : 'text-[#D4AF37]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Strategic Analytics & Reports */}
      <div className="space-y-1 mb-5">
        <div className="px-3 pb-1 text-[10px] font-bold text-[#AA771C] uppercase tracking-[0.15em]">
          Executive Analytics
        </div>
        {analyticsNav.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer text-left ${
                isActive
                  ? 'bg-gradient-to-r from-[#BF953F] via-[#F3E5AB] to-[#AA771C] text-[#0B0C10] font-bold shadow-md shadow-[#D4AF37]/25'
                  : 'text-[#D8D4C7] hover:bg-[#141722] hover:text-[#F3E5AB]'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#0B0C10]' : 'text-[#D4AF37]'}`} />
              <span className="flex-1 truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* 5. System & Settings */}
      <div className="space-y-1 mt-auto pt-4 border-t border-[#D4AF37]/20">
        <div className="px-3 pb-1 text-[10px] font-bold text-[#AA771C] uppercase tracking-[0.15em]">
          Security & Webhooks
        </div>
        {systemNav.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer text-left ${
                isActive
                  ? 'bg-gradient-to-r from-[#BF953F] via-[#F3E5AB] to-[#AA771C] text-[#0B0C10] font-bold shadow-md shadow-[#D4AF37]/25'
                  : 'text-[#8A8472] hover:bg-[#141722] hover:text-[#F3E5AB]'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#0B0C10]' : 'text-[#D4AF37]'}`} />
              <span className="flex-1 truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};

