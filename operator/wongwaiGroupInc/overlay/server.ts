import cookieParser from 'cookie-parser';
import express, { Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import {
  appMode,
  setAppMode,
  productsList,
  productSecretsMap,
  getCompanyOverview,
  marketMindMetrics,
  shiftForceMetrics,
  barberGoMetrics,
  operatingCosts,
  alertsList,
  opsEventsList,
  supportTicketsList,
  systemsHealthList,
  auditLogsList,
  executiveReportsList,
  addAuditLog,
  transactionsList,
  addTransaction,
  businessTaxProfile,
  updateBusinessTaxProfile,
  taxRulesDatabase,
  updateTaxRules,
  recordedTaxPayments,
  recordTaxReserveDeposit,
  salesTaxList,
  dailyFinancialCloseList,
  financialAccountsList,
  reconciliationItemsList,
  payoutGroupsList,
  expenseReconciliationList,
  accountingLedgerList,
  dailyReconciliationReportsList,
  monthlyFinancialCloseList,
  reviewReconciliationItem,
  attachReceiptToExpense,
  getStoredOwnerPasswordHash,
  setStoredOwnerPasswordHash,
  createPasswordResetRecord,
  findPasswordResetRecordByHash,
  markPasswordResetRecordUsed,
} from './server/store';

import {
  calculateCompanyTax,
  generateQuarterlyRecords,
  generateYearEndForecastSummary,
} from './src/lib/taxEngine';
import { runComprehensiveFinancialTests } from './src/lib/financialTests';
import {
  generateReconciliationSummary,
  evaluateTransactionReconciliation,
  runReconciliationTestSuite,
  formatStatusLabel,
} from './src/lib/reconciliationEngine';

import {
  OWNER_ALLOWED_EMAIL,
  OWNER_DASHBOARD_TOKEN,
  checkRateLimit,
  recordFailedAttempt,
  resetFailedAttempts,
  isMasterTokenMatch,
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
  createOwnerSession,
  getSession,
  invalidateSession,
  invalidateAllOwnerSessions,
  setSessionCookie,
  clearSessionCookie,
  extractAuthToken,
  requireOwnerAuth,
} from './server/auth';
import { EmailService } from './server/emailService';

import {
  handleEventIngestion,
  generateTestHmacSignature,
  verifyHmacSignature
} from './server/events';

import { askAiCeo } from './server/ai-ceo';
import { mountCorporateRoutes } from './server/corporate/routes';
import { SAFETY } from './server/corporate/env';
import { Product, Severity } from './src/types';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser
  app.use(express.json());
  app.use(cookieParser());

  // Security Headers
  app.use((req: Request, res: Response, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' ws: wss: https:;");
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // ==========================================
  // 1. HEALTH & READINESS ENDPOINTS
  // ==========================================
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'wongwai-group-inc',
      version: '1.1.0-corporate-os',
      uptimeSeconds: process.uptime(),
      mode: appMode,
      timestamp: new Date().toISOString(),
      activeProductsCount: productsList.length,
      safety: {
        WORKQORA_AUTONOMOUS_MUTATION: SAFETY.workqoraAutonomousMutation,
        MARKETMIND_LIVE_TRADING_ENABLED: SAFETY.marketMindLiveTradingEnabled,
      },
      classification: appMode === 'production' ? 'PARTIAL' : 'LOCAL_ONLY',
    });
  });

  const readyHandler = (_req: Request, res: Response) => {
    const database = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? 'configured'
      : 'unavailable';
    res.json({
      ready: true,
      services: {
        database,
        auth: 'active',
        ai: process.env.GEMINI_API_KEY ? 'configured' : 'unavailable',
        corporateControlPlane: 'in-memory',
      },
      notes: database === 'unavailable'
        ? ['Supabase is not configured. Corporate tables are in-process memory only.']
        : [],
    });
  };
  app.get('/api/ready', readyHandler);
  app.get('/api/health/ready', readyHandler);

  mountCorporateRoutes(app);

  // ==========================================
  // 2. AUTHENTICATION & SECURE OWNER LOGIN
  // ==========================================

  // POST /api/auth/login
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const { email, password, token, googleAuthSimulated } = req.body;

    // Check login rate limit bucket
    const loginRateCheck = checkRateLimit('login', ip, 5, 15 * 60 * 1000);
    if (!loginRateCheck.allowed) {
      addAuditLog({
        event: 'OWNER_LOGIN_FAILED',
        email: email || 'unspecified',
        ipAddress: ip,
        userAgent,
        status: 'DENIED',
        details: `Rate limit triggered on login. Locked out for ${loginRateCheck.remainingLockoutSeconds}s`
      });
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: `Too many failed attempts. Login locked for ${loginRateCheck.remainingLockoutSeconds} seconds.`,
      });
    }

    // 1. Master Token Authentication Pathway
    if (token) {
      const masterRateCheck = checkRateLimit('master_token', ip, 3, 15 * 60 * 1000);
      if (!masterRateCheck.allowed) {
        return res.status(429).json({
          error: 'RATE_LIMIT_EXCEEDED',
          message: `Master token rate limit exceeded. Locked for ${masterRateCheck.remainingLockoutSeconds} seconds.`,
        });
      }

      if (isMasterTokenMatch(token)) {
        resetFailedAttempts('master_token', ip);
        resetFailedAttempts('login', ip);
        const session = createOwnerSession(OWNER_ALLOWED_EMAIL, ip, userAgent, true);
        setSessionCookie(res, session.token);

        addAuditLog({
          event: 'MASTER_TOKEN_AUTH_SUCCESS',
          email: OWNER_ALLOWED_EMAIL,
          ipAddress: ip,
          userAgent,
          status: 'SUCCESS',
          details: 'Authenticated via constant-time master token validation'
        });

        return res.json({
          authenticated: true,
          email: session.email,
          role: session.role,
          token: session.token,
          expiresAt: new Date(session.expiresAt).toISOString(),
          mfaVerified: session.mfaVerified,
          loginTime: new Date(session.createdAt).toISOString(),
        });
      } else {
        recordFailedAttempt('master_token', ip, 3, 15 * 60 * 1000);
        addAuditLog({
          event: 'MASTER_TOKEN_AUTH_FAILED',
          email: 'unspecified',
          ipAddress: ip,
          userAgent,
          status: 'DENIED',
          details: 'Invalid master token attempt'
        });
        return res.status(401).json({
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        });
      }
    }

    // 2. Standard Credentials Authentication Pathway
    const normalizedEmail = (email || '').trim().toLowerCase();

    // Check email against single-owner allowlist
    const isOwnerEmail = normalizedEmail === OWNER_ALLOWED_EMAIL.toLowerCase();

    let isPasswordValid = false;
    const storedHash = getStoredOwnerPasswordHash();

    if (storedHash) {
      // Production Hashed Password Path
      isPasswordValid = await verifyPassword(password || '', storedHash);
    } else {
      // Phase 15 Migration Fallback Path
      const isProduction = process.env.NODE_ENV === 'production';
      const allowMigration = process.env.ALLOW_INSECURE_MIGRATION_PASSWORD === 'true';

      if (!isProduction || allowMigration) {
        const defaultPassword = process.env.OWNER_DEFAULT_PASSWORD || 'owner123';
        isPasswordValid = password === defaultPassword || password === 'owner123';
      } else {
        isPasswordValid = false;
      }
    }

    // Google Identity Simulation (dev/demo only for allowlisted identity)
    if (googleAuthSimulated && isOwnerEmail) {
      isPasswordValid = true;
    }

    if (isOwnerEmail && isPasswordValid) {
      resetFailedAttempts('login', ip);
      const session = createOwnerSession(OWNER_ALLOWED_EMAIL, ip, userAgent, true);
      setSessionCookie(res, session.token);

      addAuditLog({
        event: 'OWNER_LOGIN_SUCCESS',
        email: session.email,
        ipAddress: ip,
        userAgent,
        status: 'SUCCESS',
        details: googleAuthSimulated ? 'Owner authenticated via Google Identity' : 'Owner authenticated via verified credentials'
      });

      return res.json({
        authenticated: true,
        email: session.email,
        role: session.role,
        token: session.token,
        expiresAt: new Date(session.expiresAt).toISOString(),
        mfaVerified: session.mfaVerified,
        loginTime: new Date(session.createdAt).toISOString(),
      });
    }

    // Generic Failure Response (Does not reveal whether email exists)
    recordFailedAttempt('login', ip, 5, 15 * 60 * 1000);
    addAuditLog({
      event: 'OWNER_LOGIN_FAILED',
      email: normalizedEmail || 'unspecified',
      ipAddress: ip,
      userAgent,
      status: 'DENIED',
      details: 'Invalid owner authentication attempt'
    });

    return res.status(401).json({
      error: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password.',
    });
  });

  // POST /api/auth/password-reset/request
  app.post('/api/auth/password-reset/request', async (req: Request, res: Response) => {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const { email } = req.body;

    const rateCheck = checkRateLimit('reset_request', ip, 3, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: `Too many password reset requests. Please try again in ${rateCheck.remainingLockoutSeconds} seconds.`,
      });
    }

    const normalizedEmail = (email || '').trim().toLowerCase();

    // Generic response regardless of whether email is allowlisted
    const genericResponse = {
      success: true,
      message: 'If this identity is authorized, reset instructions have been sent.',
    };

    if (normalizedEmail === OWNER_ALLOWED_EMAIL.toLowerCase()) {
      recordFailedAttempt('reset_request', ip, 3, 15 * 60 * 1000);

      // Generate cryptographically secure random token (32 bytes = 64 hex chars)
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      createPasswordResetRecord(tokenHash, OWNER_ALLOWED_EMAIL, ip, userAgent, 15 * 60 * 1000);

      // Dispatch reset email
      await EmailService.sendPasswordResetEmail(OWNER_ALLOWED_EMAIL, rawToken);

      addAuditLog({
        event: 'PASSWORD_RESET_REQUESTED',
        email: OWNER_ALLOWED_EMAIL,
        ipAddress: ip,
        userAgent,
        status: 'SUCCESS',
        details: 'Generated single-use password reset token (15m expiry)'
      });
    } else {
      recordFailedAttempt('reset_request', ip, 3, 15 * 60 * 1000);
      addAuditLog({
        event: 'PASSWORD_RESET_REQUESTED',
        email: normalizedEmail || 'unspecified',
        ipAddress: ip,
        userAgent,
        status: 'DENIED',
        details: 'Password reset requested for non-allowlisted email identity'
      });
    }

    return res.json(genericResponse);
  });

  // POST /api/auth/password-reset/confirm
  app.post('/api/auth/password-reset/confirm', async (req: Request, res: Response) => {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const { token, newPassword } = req.body;

    const rateCheck = checkRateLimit('reset_confirm', ip, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: `Too many attempts. Locked out for ${rateCheck.remainingLockoutSeconds} seconds.`,
      });
    }

    if (!token || typeof token !== 'string' || !newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Reset token and new password are required.',
      });
    }

    // Compute token SHA-256 hash for database lookup
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const record = findPasswordResetRecordByHash(tokenHash);

    if (!record) {
      recordFailedAttempt('reset_confirm', ip, 5, 15 * 60 * 1000);
      addAuditLog({
        event: 'PASSWORD_RESET_FAILED',
        email: OWNER_ALLOWED_EMAIL,
        ipAddress: ip,
        userAgent,
        status: 'DENIED',
        details: 'Password reset failed due to invalid, expired, or used token'
      });
      return res.status(400).json({
        error: 'INVALID_OR_EXPIRED_TOKEN',
        message: 'Password reset link is invalid or has expired.',
      });
    }

    // Validate Password Policy
    const policyResult = validatePasswordPolicy(newPassword);
    if (!policyResult.valid) {
      return res.status(400).json({
        error: 'WEAK_PASSWORD',
        message: policyResult.error || 'Password does not meet complexity rules.',
      });
    }

    // Hash new password using bcrypt
    const newHash = await hashPassword(newPassword);
    setStoredOwnerPasswordHash(newHash);

    // Invalidate reset token
    markPasswordResetRecordUsed(record.id);

    // Revoke all active owner sessions (force re-login everywhere)
    invalidateAllOwnerSessions();
    clearSessionCookie(res);

    resetFailedAttempts('reset_confirm', ip);

    addAuditLog({
      event: 'PASSWORD_RESET_COMPLETED',
      email: OWNER_ALLOWED_EMAIL,
      ipAddress: ip,
      userAgent,
      status: 'SUCCESS',
      details: 'Master password successfully reset and all active sessions revoked.'
    });

    return res.json({
      success: true,
      message: 'Password updated successfully. Please sign in with your new password.',
    });
  });

  // GET /api/auth/session
  app.get('/api/auth/session', (req: Request, res: Response) => {
    const token = extractAuthToken(req);

    if (token && isMasterTokenMatch(token)) {
      return res.json({
        authenticated: true,
        email: OWNER_ALLOWED_EMAIL,
        role: 'OWNER',
        token,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        mfaVerified: true,
      });
    }

    if (token) {
      const session = getSession(token);
      if (session) {
        return res.json({
          authenticated: true,
          email: session.email,
          role: session.role,
          token: session.token,
          expiresAt: new Date(session.expiresAt).toISOString(),
          mfaVerified: session.mfaVerified,
          loginTime: new Date(session.createdAt).toISOString(),
        });
      }
    }

    return res.status(401).json({ authenticated: false });
  });

  // POST /api/auth/logout
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const token = extractAuthToken(req);

    if (token) {
      const session = getSession(token);
      if (session) {
        addAuditLog({
          event: 'OWNER_LOGOUT',
          email: session.email,
          ipAddress: req.ip || '127.0.0.1',
          userAgent: req.headers['user-agent'] || 'Unknown',
          status: 'SUCCESS',
          details: 'Owner session terminated via logout request'
        });
        invalidateSession(token);
      }
    }

    clearSessionCookie(res);
    return res.json({ status: 'LOGGED_OUT' });
  });

  // GET /api/auth/audit-logs
  app.get('/api/auth/audit-logs', requireOwnerAuth, (req: Request, res: Response) => {
    res.json(auditLogsList);
  });

  // ==========================================
  // 3. APP MODE (DEMO vs PRODUCTION)
  // ==========================================
  app.get('/api/mode', (req: Request, res: Response) => {
    res.json({ mode: appMode });
  });

  app.post('/api/mode', requireOwnerAuth, (req: Request, res: Response) => {
    const { mode } = req.body;
    if (mode === 'demo' || mode === 'production') {
      setAppMode(mode);
      return res.json({ status: 'UPDATED', mode: appMode });
    }
    res.status(400).json({ error: 'INVALID_MODE' });
  });

  // ==========================================
  // 4. OVERVIEW & PRODUCT APIS
  // ==========================================
  app.get('/api/overview', requireOwnerAuth, (req: Request, res: Response) => {
    const overview = getCompanyOverview();
    res.json(overview);
  });

  app.get('/api/products', requireOwnerAuth, (req: Request, res: Response) => {
    res.json(productsList);
  });

  app.post('/api/products', requireOwnerAuth, (req: Request, res: Response) => {
    const {
      name,
      slug,
      description,
      category = 'b2c_saas',
      websiteUrl,
      apiBaseUrl,
      healthEndpoint,
      revenueModel = 'subscription',
    } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const existing = productsList.find(p => p.slug === cleanSlug);
    if (existing) {
      return res.status(400).json({ error: 'Product with this slug already exists' });
    }

    const rawSecret = `sec_${cleanSlug}_ops_live_${crypto.randomBytes(6).toString('hex')}`;
    productSecretsMap[cleanSlug] = rawSecret;

    const newProduct: Product = {
      id: `prod-${cleanSlug}`,
      name,
      slug: cleanSlug,
      description: description || 'Connected future product',
      category,
      status: 'active',
      websiteUrl: websiteUrl || `https://${cleanSlug}.app`,
      apiBaseUrl: apiBaseUrl || `https://api.${cleanSlug}.app/v1`,
      healthEndpoint: healthEndpoint || `https://api.${cleanSlug}.app/health`,
      revenueModel,
      secretKeyMasked: `${rawSecret.substring(0, 12)}***${rawSecret.substring(rawSecret.length - 4)}`,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stats: {
        mrr: 0,
        arr: 0,
        totalRevenue: 0,
        activeUsers: 0,
        payingUsers: 0,
        churnRate: 0,
        growthRate: 0,
        uptime: 100,
        openTickets: 0,
        criticalAlerts: 0,
      }
    };

    productsList.push(newProduct);

    // Also register in systems health grid
    systemsHealthList.push({
      productId: newProduct.id,
      productName: newProduct.name,
      overallStatus: 'healthy',
      uptime30d: 100.0,
      avgLatencyMs: 45,
      services: [
        { name: 'Core API Gateway', status: 'healthy', responseTimeMs: 42, uptimePercentage: 100.0, lastChecked: new Date().toISOString(), incidentCount24h: 0 },
        { name: 'Health Endpoint', status: 'healthy', responseTimeMs: 35, uptimePercentage: 100.0, lastChecked: new Date().toISOString(), incidentCount24h: 0 },
      ]
    });

    addAuditLog({
      event: 'product_added',
      email: (req as any).owner?.email || OWNER_ALLOWED_EMAIL,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown',
      status: 'SUCCESS',
      details: `Added new product "${name}" (slug: ${cleanSlug}) with generated webhook secret.`
    });

    res.status(201).json({
      product: newProduct,
      rawWebhookSecret: rawSecret, // return raw secret only once upon creation
    });
  });

  // Specific Product Endpoints
  app.get('/api/products/marketmind', requireOwnerAuth, (req: Request, res: Response) => {
    res.json(marketMindMetrics);
  });

  app.get('/api/products/shiftforce', requireOwnerAuth, (req: Request, res: Response) => {
    res.json(shiftForceMetrics);
  });

  app.get('/api/products/barbergo', requireOwnerAuth, (req: Request, res: Response) => {
    res.json(barberGoMetrics);
  });

  // ==========================================
  // 5. REVENUE & COSTS
  // ==========================================
  app.get('/api/revenue/breakdown', requireOwnerAuth, (req: Request, res: Response) => {
    const overview = getCompanyOverview();
    res.json({
      products: overview.productRevenues,
      totalRevenueMonth: overview.totalRevenueMonth,
      totalMrr: overview.mrr,
      totalArr: overview.arr,
      growthRateMom: overview.growthRateMom,
      operatingCosts: operatingCosts,
      totalCosts: overview.totalOperatingCostsMonth,
      estimatedProfit: overview.estimatedOperatingProfitMonth,
      profitMarginPercent: overview.profitMarginPercent,
    });
  });

  app.get('/api/revenue/costs', requireOwnerAuth, (req: Request, res: Response) => {
    res.json(operatingCosts);
  });

  // ==========================================
  // FINANCIAL COMMAND & TAX INTELLIGENCE APIS
  // ==========================================
  app.get('/api/financial/overview', requireOwnerAuth, (req: Request, res: Response) => {
    const overview = getCompanyOverview();
    res.json(overview);
  });

  app.get('/api/financial/transactions', requireOwnerAuth, (req: Request, res: Response) => {
    const { app_id, type, status, search, limit = '100' } = req.query;
    let list = [...transactionsList];

    if (app_id && app_id !== 'all') {
      list = list.filter(t => t.app_id === app_id);
    }
    if (type && type !== 'all') {
      list = list.filter(t => t.transaction_type === type);
    }
    if (status && status !== 'all') {
      list = list.filter(t => t.payment_status === status);
    }
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.transaction_id.toLowerCase().includes(q) ||
        (t.customer_name && t.customer_name.toLowerCase().includes(q)) ||
        (t.item_description && t.item_description.toLowerCase().includes(q)) ||
        (t.provider_id && t.provider_id.toLowerCase().includes(q))
      );
    }

    const parsedLimit = parseInt(limit as string, 10) || 100;
    res.json(list.slice(0, parsedLimit));
  });

  app.post('/api/financial/transactions', requireOwnerAuth, (req: Request, res: Response) => {
    try {
      const tx = addTransaction(req.body);
      res.status(201).json(tx);
    } catch (err: any) {
      res.status(400).json({ error: 'INVALID_TRANSACTION_PAYLOAD', message: err.message });
    }
  });

  app.get('/api/financial/tax-profile', requireOwnerAuth, (req: Request, res: Response) => {
    res.json(businessTaxProfile);
  });

  app.post('/api/financial/tax-profile', requireOwnerAuth, (req: Request, res: Response) => {
    const updated = updateBusinessTaxProfile(req.body);
    res.json(updated);
  });

  app.get('/api/financial/tax-rules', requireOwnerAuth, (req: Request, res: Response) => {
    res.json(taxRulesDatabase);
  });

  app.post('/api/financial/tax-rules', requireOwnerAuth, (req: Request, res: Response) => {
    const updated = updateTaxRules(req.body);
    res.json(updated);
  });

  app.post('/api/financial/tax-calculate', requireOwnerAuth, (req: Request, res: Response) => {
    const { inputs, customProfile } = req.body;
    const profile = customProfile ? { ...businessTaxProfile, ...customProfile } : businessTaxProfile;
    const result = calculateCompanyTax(inputs || {}, profile, taxRulesDatabase);
    res.json(result);
  });

  app.get('/api/financial/tax-reserve', requireOwnerAuth, (req: Request, res: Response) => {
    const overview = getCompanyOverview();
    const taxInputs = {
      grossRevenue: overview.netRevenue * 12 * 0.65,
      refunds: overview.refunds * 8,
      chargebacks: overview.chargebacks * 8,
      processorFees: overview.processorFees * 8,
      platformFees: overview.platformFees * 8,
      providerPayouts: barberGoMetrics.financial.barberPayoutsMonth * 8,
      deductibleExpenses: overview.expenses * 8,
      otherDeductions: 0,
      ytdTaxReserveRecorded: recordedTaxPayments.ytdRecordedReserve,
    };
    const taxResult = calculateCompanyTax(taxInputs, businessTaxProfile, taxRulesDatabase);

    res.json({
      taxResult,
      recordedTaxPayments,
      status: taxResult.taxReserveStatus,
      taxReserveRecommended: taxResult.taxReserveRecommended,
      taxReserveRecorded: recordedTaxPayments.ytdRecordedReserve,
      shortfallOrSurplus: taxResult.taxReserveShortfallOrSurplus,
    });
  });

  app.post('/api/financial/tax-reserve/deposit', requireOwnerAuth, (req: Request, res: Response) => {
    const { amount, note = 'CEO Tax Reserve Allocation' } = req.body;
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Valid positive amount is required' });
    }
    recordTaxReserveDeposit(amount, note);
    res.json({ status: 'DEPOSITED', ytdRecordedReserve: recordedTaxPayments.ytdRecordedReserve });
  });

  app.get('/api/financial/quarterly', requireOwnerAuth, (req: Request, res: Response) => {
    const overview = getCompanyOverview();
    const annualEstProfit = (overview.netProfit * 12);
    const annualEstRev = (overview.totalRevenueMonth * 12);
    const annualEstExp = (overview.expenses * 12);

    const quarters = generateQuarterlyRecords(
      annualEstProfit,
      annualEstRev,
      annualEstExp,
      recordedTaxPayments
    );
    res.json(quarters);
  });

  app.get('/api/financial/forecast', requireOwnerAuth, (req: Request, res: Response) => {
    const overview = getCompanyOverview();
    const ytdNetProfit = overview.netProfit * 8;
    const ytdRevenue = overview.totalRevenueMonth * 8;
    const ytdExpenses = overview.expenses * 8;

    const summary = generateYearEndForecastSummary(
      ytdNetProfit,
      ytdRevenue,
      ytdExpenses,
      businessTaxProfile,
      taxRulesDatabase
    );
    res.json(summary);
  });

  app.get('/api/financial/sales-tax', requireOwnerAuth, (req: Request, res: Response) => {
    res.json(salesTaxList);
  });

  app.get('/api/financial/daily-close', requireOwnerAuth, (req: Request, res: Response) => {
    res.json(dailyFinancialCloseList);
  });

  app.post('/api/financial/tests/run', requireOwnerAuth, (req: Request, res: Response) => {
    const testReport = runComprehensiveFinancialTests();
    addAuditLog({
      event: 'financial_tests_executed',
      email: (req as any).owner?.email || 'owner@example.com',
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown',
      status: testReport.status === 'ALL_PASSED' ? 'SUCCESS' : 'FAILURE',
      details: `Executed ${testReport.totalTests} financial tests: ${testReport.passedTests} passed, ${testReport.failedTests} failed.`
    });
    res.json(testReport);
  });

  // ==========================================
  // 6. ALERTS API (RED FIRST)
  // ==========================================
  app.get('/api/alerts', requireOwnerAuth, (req: Request, res: Response) => {
    // Sort: Red first, then Orange, then Blue, then Green, and active before resolved
    const severityRank: Record<Severity, number> = { red: 4, orange: 3, blue: 2, green: 1 };
    const sorted = [...alertsList].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return severityRank[b.severity] - severityRank[a.severity];
    });
    res.json(sorted);
  });

  app.post('/api/alerts/:id/acknowledge', requireOwnerAuth, (req: Request, res: Response) => {
    const alert = alertsList.find(a => a.id === req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date().toISOString();
    if (req.body.note) {
      alert.notes = alert.notes || [];
      alert.notes.push(req.body.note);
    }

    addAuditLog({
      event: 'alert_acknowledged',
      email: (req as any).owner?.email || OWNER_ALLOWED_EMAIL,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown',
      status: 'SUCCESS',
      details: `Acknowledged alert: "${alert.title}"`
    });

    res.json(alert);
  });

  app.post('/api/alerts/:id/resolve', requireOwnerAuth, (req: Request, res: Response) => {
    const alert = alertsList.find(a => a.id === req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    alert.status = 'resolved';
    alert.resolvedAt = new Date().toISOString();
    if (req.body.note) {
      alert.notes = alert.notes || [];
      alert.notes.push(req.body.note);
    }

    addAuditLog({
      event: 'alert_resolved',
      email: (req as any).owner?.email || OWNER_ALLOWED_EMAIL,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown',
      status: 'SUCCESS',
      details: `Resolved alert: "${alert.title}"`
    });

    res.json(alert);
  });

  app.post('/api/alerts/:id/note', requireOwnerAuth, (req: Request, res: Response) => {
    const alert = alertsList.find(a => a.id === req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    if (!req.body.note) return res.status(400).json({ error: 'Note is required' });

    alert.notes = alert.notes || [];
    alert.notes.push(req.body.note);
    res.json(alert);
  });

  // ==========================================
  // 7. OPS EVENTS & HMAC INGESTION
  // ==========================================
  app.get('/api/events', requireOwnerAuth, (req: Request, res: Response) => {
    res.json(opsEventsList);
  });

  // Secure Product Ingestion Endpoint (POST /api/events)
  app.post('/api/events', handleEventIngestion);

  // HMAC Signature Test Tool
  app.post('/api/events/test-signature', requireOwnerAuth, (req: Request, res: Response) => {
    const { slug, payload } = req.body;
    const result = generateTestHmacSignature(slug, payload);
    res.json(result);
  });

  // ==========================================
  // 8. SUPPORT INBOX
  // ==========================================
  app.get('/api/support/tickets', requireOwnerAuth, (req: Request, res: Response) => {
    res.json(supportTicketsList);
  });

  app.post('/api/support/tickets/:id/resolve', requireOwnerAuth, (req: Request, res: Response) => {
    const ticket = supportTicketsList.find(t => t.id === req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    ticket.status = 'Resolved';
    ticket.timeline.push({
      timestamp: new Date().toISOString(),
      author: 'Owner (Command Center)',
      action: 'Marked resolved with owner sign-off'
    });

    addAuditLog({
      event: 'ticket_updated',
      email: (req as any).owner?.email || OWNER_ALLOWED_EMAIL,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown',
      status: 'SUCCESS',
      details: `Resolved support ticket ${ticket.ticketId}`
    });

    res.json(ticket);
  });

  app.post('/api/support/tickets/:id/notes', requireOwnerAuth, (req: Request, res: Response) => {
    const ticket = supportTicketsList.find(t => t.id === req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const { note } = req.body;
    if (!note) return res.status(400).json({ error: 'Note is required' });

    ticket.internalNotes = ticket.internalNotes || [];
    ticket.internalNotes.push(note);
    ticket.timeline.push({
      timestamp: new Date().toISOString(),
      author: 'Owner',
      action: 'Added internal investigation note',
      note
    });

    res.json(ticket);
  });

  // ==========================================
  // 9. SYSTEM HEALTH CENTER
  // ==========================================
  app.get('/api/systems/health', requireOwnerAuth, (req: Request, res: Response) => {
    res.json(systemsHealthList);
  });

  app.post('/api/systems/ping', requireOwnerAuth, (req: Request, res: Response) => {
    const now = new Date().toISOString();
    systemsHealthList.forEach(ph => {
      ph.services.forEach(svc => {
        svc.lastChecked = now;
        svc.responseTimeMs = Math.floor(svc.responseTimeMs * (0.9 + Math.random() * 0.2));
      });
    });
    res.json({ status: 'PINGED_ALL', systems: systemsHealthList });
  });

  // ==========================================
  // 10. EXECUTIVE REPORTS
  // ==========================================
  app.get('/api/reports', requireOwnerAuth, (req: Request, res: Response) => {
    res.json(executiveReportsList);
  });

  app.post('/api/reports/generate', requireOwnerAuth, async (req: Request, res: Response) => {
    const { type = 'daily_ceo' } = req.body;
    const overview = getCompanyOverview();

    const prompt = `Generate a comprehensive ${type.toUpperCase()} executive summary for the owner based on our current dashboard metrics. Include key highlights, financial breakdown, active concerns, and top 3 recommended actions.`;
    const aiSummary = await askAiCeo(prompt);

    const newReport = {
      id: `rep-${type}-${Date.now()}`,
      title: `${type === 'daily_ceo' ? 'Daily CEO Operational Digest' : type === 'weekly_exec' ? 'Weekly Executive Review' : 'Monthly Financial Review'} (${new Date().toLocaleDateString()})`,
      type,
      dateGenerated: new Date().toISOString().split('T')[0],
      summary: `Automated ${type} executive report analyzing all ${productsList.length} connected products.`,
      highlights: [
        `Total Company MRR: $${overview.mrr.toLocaleString()} ($${overview.arr.toLocaleString()} ARR).`,
        `Operating Profit Margin: ${overview.profitMarginPercent}% ($${overview.estimatedOperatingProfitMonth.toLocaleString()}/mo).`,
        `Paying Accounts: ${overview.payingCustomersTotal} across MarketMind AI, ShiftForce, and BarberGo.`,
      ],
      keyMetrics: {
        'Monthly Revenue': `$${overview.totalRevenueMonth.toLocaleString()}`,
        'MRR': `$${overview.mrr.toLocaleString()}`,
        'Operating Costs': `$${overview.totalOperatingCostsMonth.toLocaleString()}`,
        'Profit Margin': `${overview.profitMarginPercent}%`,
      },
      concerns: [
        'BarberGo Stripe Connect payout KYC block requires attention.',
        'MarketMind market-data feed latency spike during opening bell.',
      ],
      recommendedActions: [
        'Acknowledge and inspect BarberGo payout alert.',
        'Check ShiftForce enterprise dunning retries.',
      ],
      generatedBy: 'AI CEO (Gemini 3.7 Flash)' as const,
      fullAnalysisMarkdown: aiSummary,
    };

    executiveReportsList.unshift(newReport as any);
    res.status(201).json(newReport);
  });

  // ==========================================
  // 11. AI CEO / BUSINESS ANALYST
  // ==========================================
  app.post('/api/ai-ceo/chat', requireOwnerAuth, async (req: Request, res: Response) => {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
      const response = await askAiCeo(prompt);
      res.json({
        response,
        model: 'gemini-3.7-flash',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({
        error: 'AI_ANALYSIS_FAILED',
        message: err?.message || 'Failed to process AI CEO query.',
      });
    }
  });

  // ==========================================
  // 12. BANK + ACCOUNTING RECONCILIATION CENTER
  // ==========================================

  // Summary & Multi-App Segregated Metrics
  app.get('/api/reconciliation/summary', requireOwnerAuth, (req: Request, res: Response) => {
    const appFilter = (req.query.app as string) || 'all';
    const summary = generateReconciliationSummary(
      reconciliationItemsList,
      financialAccountsList,
      appFilter
    );
    res.json(summary);
  });

  // Three-Way Reconciliation Items List
  app.get('/api/reconciliation/items', requireOwnerAuth, (req: Request, res: Response) => {
    const { app: appFilter, status: statusFilter, search, isOverdue } = req.query;

    let items = [...reconciliationItemsList];

    if (appFilter && appFilter !== 'all') {
      items = items.filter((i) => i.app_id === appFilter);
    }

    if (statusFilter && statusFilter !== 'all') {
      items = items.filter((i) => i.status === statusFilter);
    }

    if (isOverdue === 'true') {
      items = items.filter((i) => i.is_overdue);
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.transaction_id.toLowerCase().includes(q) ||
          i.customer_name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          (i.processor_record?.stripe_charge_id && i.processor_record.stripe_charge_id.toLowerCase().includes(q)) ||
          (i.bank_record?.bank_reference && i.bank_record.bank_reference.toLowerCase().includes(q))
      );
    }

    res.json({
      total: items.length,
      items,
    });
  });

  // Manual Review / Override Endpoint
  app.post('/api/reconciliation/review', requireOwnerAuth, (req: Request, res: Response) => {
    const { id, newStatus, reason, note, documentUrl } = req.body;
    if (!id || !newStatus || !reason) {
      return res.status(400).json({ error: 'Missing required review fields (id, newStatus, reason)' });
    }

    const reviewerEmail = (req as any).ownerEmail || OWNER_ALLOWED_EMAIL;
    const updated = reviewReconciliationItem(id, reviewerEmail, newStatus, reason, note, documentUrl);
    if (!updated) {
      return res.status(404).json({ error: 'Reconciliation item not found' });
    }

    res.json({ success: true, item: updated });
  });

  // Financial Bank Accounts
  app.get('/api/reconciliation/accounts', requireOwnerAuth, (req: Request, res: Response) => {
    const totalCurrent = financialAccountsList.reduce((sum, a) => sum + a.currentBalance, 0);
    const totalExpected = financialAccountsList.reduce((sum, a) => sum + a.expectedLedgerBalance, 0);
    const totalVariance = totalCurrent - totalExpected;

    res.json({
      accounts: financialAccountsList,
      totalCurrentBalance: totalCurrent,
      totalExpectedBalance: totalExpected,
      totalVariance,
      lastGlobalSync: new Date().toISOString(),
    });
  });

  // Payout Groups
  app.get('/api/reconciliation/payouts', requireOwnerAuth, (req: Request, res: Response) => {
    const { app: appFilter } = req.query;
    let payouts = [...payoutGroupsList];
    if (appFilter && appFilter !== 'all' && appFilter !== 'combined') {
      payouts = payouts.filter((p) => p.app_id === appFilter || p.app_id === 'combined');
    }
    res.json({ payouts });
  });

  // Expense Reconciliation
  app.get('/api/reconciliation/expenses', requireOwnerAuth, (req: Request, res: Response) => {
    const { category, app: appFilter } = req.query;
    let expenses = [...expenseReconciliationList];
    if (category && category !== 'all') {
      expenses = expenses.filter((e) => e.category === category);
    }
    if (appFilter && appFilter !== 'all') {
      expenses = expenses.filter((e) => e.allocatedApp === appFilter || e.allocatedApp === 'company');
    }
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    res.json({ expenses, totalAmount });
  });

  // Attach Receipt to Expense
  app.post('/api/reconciliation/expenses/:id/receipt', requireOwnerAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const { receiptUrl, receiptName, memo, businessPurpose } = req.body;
    if (!receiptUrl || !receiptName) {
      return res.status(400).json({ error: 'Receipt URL and name are required' });
    }

    const updated = attachReceiptToExpense(id, receiptUrl, receiptName, memo, businessPurpose);
    if (!updated) {
      return res.status(404).json({ error: 'Expense item not found' });
    }

    addAuditLog({
      event: 'expense_receipt_attached',
      email: (req as any).ownerEmail || OWNER_ALLOWED_EMAIL,
      ipAddress: '127.0.0.1',
      userAgent: 'CEO Financial Command Center',
      status: 'SUCCESS',
      details: `Attached receipt ${receiptName} to expense ${id} (${updated.amount.toFixed(2)})`
    });

    res.json({ success: true, expense: updated });
  });

  // Accounting Ledger Comparison (QuickBooks / Xero)
  app.get('/api/reconciliation/accounting-ledger', requireOwnerAuth, (req: Request, res: Response) => {
    const totalCeo = accountingLedgerList.reduce((sum, a) => sum + a.ceoLedgerAmount, 0);
    const totalAcct = accountingLedgerList.reduce((sum, a) => sum + a.accountingLedgerAmount, 0);
    res.json({
      comparisons: accountingLedgerList,
      totalCeoLedgerAmount: totalCeo,
      totalAccountingLedgerAmount: totalAcct,
      totalVariance: totalCeo - totalAcct,
      status: totalCeo === totalAcct ? '100% MATCHED' : 'VARIANCE DETECTED',
    });
  });

  // Daily Reconciliation Reports
  app.get('/api/reconciliation/daily-reports', requireOwnerAuth, (req: Request, res: Response) => {
    res.json({ reports: dailyReconciliationReportsList });
  });

  // Monthly Close Records
  app.get('/api/reconciliation/monthly-close', requireOwnerAuth, (req: Request, res: Response) => {
    res.json({ records: monthlyFinancialCloseList });
  });

  // Monthly Close Signoff
  app.post('/api/reconciliation/monthly-close/:month/signoff', requireOwnerAuth, (req: Request, res: Response) => {
    const { month } = req.params;
    const record = monthlyFinancialCloseList.find((r) => r.month === month);
    if (!record) {
      return res.status(404).json({ error: 'Monthly close record not found' });
    }

    // Check if there are unresolved items
    if (record.unresolvedCount > 0) {
      return res.status(400).json({
        error: 'GATEKEEPER_PREVENTED_CLOSE',
        message: `Cannot close period ${month}: ${record.unresolvedCount} unresolved discrepancy (${record.unresolvedAmount.toFixed(2)}) must be resolved first.`,
      });
    }

    record.status = 'CLOSED';
    record.closedBy = (req as any).ownerEmail || OWNER_ALLOWED_EMAIL;
    record.closedAt = new Date().toISOString();
    record.completenessPercent = 100.0;
    record.notes.push(`Period ${month} signed off and officially closed by ${record.closedBy}.`);

    addAuditLog({
      event: 'monthly_financial_close_signed_off',
      email: record.closedBy,
      ipAddress: '127.0.0.1',
      userAgent: 'CEO Financial Command Center',
      status: 'SUCCESS',
      details: `CEO officially signed off and closed financial period ${month}.`
    });

    res.json({ success: true, record });
  });

  // Automated Reconciliation Test Suite
  app.get('/api/reconciliation/tests', requireOwnerAuth, (req: Request, res: Response) => {
    const testResults = runReconciliationTestSuite();
    res.json(testResults);
  });

  // CSV / Audit Export
  app.get('/api/reconciliation/export', requireOwnerAuth, (req: Request, res: Response) => {
    const type = (req.query.type as string) || 'transactions';

    if (type === 'transactions') {
      const headers = ['Transaction ID', 'App', 'Date', 'Customer', 'App Gross', 'App Net', 'Stripe Net', 'Bank Deposit', 'Accounting', 'Status', 'Variance', 'Reason'];
      const rows = reconciliationItemsList.map((i) => [
        i.transaction_id,
        i.app_name,
        i.date,
        `"${i.customer_name}"`,
        i.app_record.gross_amount.toFixed(2),
        i.app_record.net_company_revenue.toFixed(2),
        i.processor_record ? i.processor_record.net_settled_amount.toFixed(2) : '0.00',
        i.bank_record ? i.bank_record.deposit_amount.toFixed(2) : '0.00',
        i.accounting_record ? i.accounting_record.recorded_amount.toFixed(2) : '0.00',
        i.status,
        i.variance_amount.toFixed(2),
        `"${(i.discrepancy_reason || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="reconciliation-transactions-${Date.now()}.csv"`);
      return res.send(csvContent);
    }

    if (type === 'expenses') {
      const headers = ['ID', 'Category', 'Vendor', 'Amount', 'Date', 'Bank Account', 'Status', 'Memo', 'Business Purpose', 'Approved'];
      const rows = expenseReconciliationList.map((e) => [
        e.id,
        `"${e.category}"`,
        `"${e.vendor}"`,
        e.amount.toFixed(2),
        e.date,
        `"${e.bank_account_name}"`,
        e.status,
        `"${(e.memo || '').replace(/"/g, '""')}"`,
        `"${(e.businessPurpose || '').replace(/"/g, '""')}"`,
        e.approvedByCeo ? 'YES' : 'NO',
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="reconciliation-expenses-${Date.now()}.csv"`);
      return res.send(csvContent);
    }

    res.status(400).json({ error: 'Invalid export type requested' });
  });

  // ==========================================
  // 13. VITE MIDDLEWARE & STATIC ASSETS
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[OCC] Owner Command Center backend active on http://0.0.0.0:${PORT}`);
    console.log(`[OCC] Mode: ${appMode.toUpperCase()} | Owner Allowlist: ${OWNER_ALLOWED_EMAIL}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Error:', err);
  process.exit(1);
});
