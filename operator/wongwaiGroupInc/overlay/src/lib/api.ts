import {
  CompanyOverview,
  Product,
  MarketMindMetrics,
  ShiftForceMetrics,
  BarberGoMetrics,
  AlertItem,
  OpsEvent,
  SupportTicket,
  ProductSystemHealth,
  OperatingCostItem,
  ExecutiveReport,
  AuditLog,
  OwnerSession
} from '../types';

const TOKEN_KEY = 'occ_owner_token';
const SESSION_DATA_KEY = 'occ_session_cache';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_DATA_KEY);
}

export async function fetchApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-owner-token'] = token;
  }

  const response = await fetch(endpoint, {
    credentials: 'same-origin',
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    const errorData = await response.json().catch(() => ({}));
    if (endpoint !== '/api/auth/login' && endpoint !== '/api/auth/session') {
      // Clear expired session
      clearStoredToken();
      window.dispatchEvent(new CustomEvent('occ_auth_error', { detail: errorData }));
    }
    throw new Error(errorData.message || errorData.error || 'Unauthorized owner access required');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (body: { email?: string; password?: string; token?: string; googleAuthSimulated?: boolean }) =>
    fetchApi<OwnerSession>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  checkSession: () => fetchApi<OwnerSession>('/api/auth/session'),
  logout: () => fetchApi<{ status: string }>('/api/auth/logout', { method: 'POST' }),
  requestPasswordReset: (email: string) =>
    fetchApi<{ success: boolean; message: string }>('/api/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  confirmPasswordReset: (token: string, newPassword: string) =>
    fetchApi<{ success: boolean; message: string }>('/api/auth/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),
  getAuditLogs: () => fetchApi<AuditLog[]>('/api/auth/audit-logs'),

  // Mode
  getMode: () => fetchApi<{ mode: 'demo' | 'production' }>('/api/mode'),
  setMode: (mode: 'demo' | 'production') =>
    fetchApi<{ status: string; mode: string }>('/api/mode', { method: 'POST', body: JSON.stringify({ mode }) }),

  // Overview & Products
  getOverview: () => fetchApi<CompanyOverview>('/api/overview'),
  getProducts: () => fetchApi<Product[]>('/api/products'),
  addProduct: (product: Partial<Product>) =>
    fetchApi<{ product: Product; rawWebhookSecret: string }>('/api/products', {
      method: 'POST',
      body: JSON.stringify(product),
    }),

  // Product deep metrics
  getMarketMind: () => fetchApi<MarketMindMetrics>('/api/products/marketmind'),
  getShiftForce: () => fetchApi<ShiftForceMetrics>('/api/products/shiftforce'),
  getBarberGo: () => fetchApi<BarberGoMetrics>('/api/products/barbergo'),

  // Revenue & Costs
  getRevenueBreakdown: () => fetchApi<any>('/api/revenue/breakdown'),
  getOperatingCosts: () => fetchApi<OperatingCostItem[]>('/api/revenue/costs'),

  // Alerts
  getAlerts: () => fetchApi<AlertItem[]>('/api/alerts'),
  acknowledgeAlert: (id: string, note?: string) =>
    fetchApi<AlertItem>(`/api/alerts/${id}/acknowledge`, { method: 'POST', body: JSON.stringify({ note }) }),
  resolveAlert: (id: string, note?: string) =>
    fetchApi<AlertItem>(`/api/alerts/${id}/resolve`, { method: 'POST', body: JSON.stringify({ note }) }),
  addAlertNote: (id: string, note: string) =>
    fetchApi<AlertItem>(`/api/alerts/${id}/note`, { method: 'POST', body: JSON.stringify({ note }) }),

  // Events & Webhooks
  getEvents: () => fetchApi<OpsEvent[]>('/api/events'),
  testSignature: (slug: string, payload: any) =>
    fetchApi<{ timestamp: string; signature: string; secretUsed: string }>('/api/events/test-signature', {
      method: 'POST',
      body: JSON.stringify({ slug, payload }),
    }),
  sendTestEvent: (event: any, headers?: Record<string, string>) =>
    fetchApi<{ status: string; eventId: string }>('/api/events', {
      method: 'POST',
      headers: { 'x-test-dispatch': 'true', ...(headers || {}) },
      body: JSON.stringify(event),
    }),

  // Support
  getSupportTickets: () => fetchApi<SupportTicket[]>('/api/support/tickets'),
  resolveTicket: (id: string) => fetchApi<SupportTicket>(`/api/support/tickets/${id}/resolve`, { method: 'POST' }),
  addTicketNote: (id: string, note: string) =>
    fetchApi<SupportTicket>(`/api/support/tickets/${id}/notes`, { method: 'POST', body: JSON.stringify({ note }) }),

  // Systems Health
  getSystemsHealth: () => fetchApi<ProductSystemHealth[]>('/api/systems/health'),
  pingSystems: () => fetchApi<{ status: string; systems: ProductSystemHealth[] }>('/api/systems/ping', { method: 'POST' }),

  // Reports
  getReports: () => fetchApi<ExecutiveReport[]>('/api/reports'),
  generateReport: (type: string) =>
    fetchApi<ExecutiveReport>('/api/reports/generate', { method: 'POST', body: JSON.stringify({ type }) }),

  // AI CEO
  askAiCeo: (prompt: string) =>
    fetchApi<{ response: string; model: string; timestamp: string }>('/api/ai-ceo/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),

  corporateHealth: () => fetchApi('/api/corporate/health'),
  corporateProducts: () => fetchApi('/api/corporate/products'),
};
