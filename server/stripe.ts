import Stripe from 'stripe';
import { db, APP_SUBSCRIPTION_PLANS } from './store';
import { BookingPricing, SubscriptionPlanId, BillingInterval, UserSubscription, BillingInvoice } from '../src/types';

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey.includes('sk_test_...') || secretKey.trim() === '') {
    return null;
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia' as any
    });
  }
  return stripeClient;
}

export function isStripeLiveConfigured(): boolean {
  const stripe = getStripe();
  return Boolean(stripe);
}

export interface CreatePaymentIntentParams {
  amountInCents: number;
  currency?: string;
  customerId: string;
  barberId: string;
  bookingId: string;
  serviceName: string;
  platformFeeInCents: number;
  customerEmail?: string;
}

/**
 * Creates a Stripe PaymentIntent with platform fee splitting for marketplace.
 */
export async function createMarketplacePaymentIntent(params: CreatePaymentIntentParams) {
  const stripe = getStripe();
  const isDemo = process.env.APP_MODE !== 'production';

  if (!stripe) {
    if (!isDemo) {
      throw new Error('Online payments are temporarily unavailable. Live payment gateway is not configured.');
    }
    // Sandbox / Demo mode Payment Intent
    const mockIntentId = `pi_demo_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const mockClientSecret = `${mockIntentId}_secret_${Math.random().toString(36).substring(7)}`;

    return {
      id: mockIntentId,
      clientSecret: mockClientSecret,
      amount: params.amountInCents,
      currency: params.currency || 'usd',
      status: 'requires_payment_method',
      livemode: false,
      isDemo: true
    };
  }

  const barberProfile = db.barberProfiles.get(params.barberId);
  const destinationAccount = barberProfile?.stripeAccountId;

  const intentParams: Stripe.PaymentIntentCreateParams = {
    amount: params.amountInCents,
    currency: params.currency || 'usd',
    payment_method_types: ['card'],
    receipt_email: params.customerEmail,
    metadata: {
      bookingId: params.bookingId,
      customerId: params.customerId,
      barberId: params.barberId,
      serviceName: params.serviceName,
      platformFee: (params.platformFeeInCents / 100).toFixed(2)
    },
    description: `BarberGo booking #${params.bookingId} - ${params.serviceName}`
  };

  // If barber has connected Stripe Account, route payment via Stripe Connect Direct/Destination Charge
  if (destinationAccount && barberProfile?.stripeAccountStatus === 'active') {
    intentParams.application_fee_amount = params.platformFeeInCents;
    intentParams.transfer_data = {
      destination: destinationAccount
    };
  }

  const intent = await stripe.paymentIntents.create(intentParams);
  return {
    id: intent.id,
    clientSecret: intent.client_secret,
    amount: intent.amount,
    currency: intent.currency,
    status: intent.status,
    livemode: intent.livemode,
    isDemo: false
  };
}

/**
 * Confirm or capture PaymentIntent
 */
export async function confirmOrCapturePayment(paymentIntentId: string) {
  const stripe = getStripe();
  const isDemo = process.env.APP_MODE !== 'production';

  if (!stripe || paymentIntentId.startsWith('pi_demo_') || paymentIntentId.startsWith('pi_test_')) {
    if (!isDemo && !stripe) {
      throw new Error('Online payments are temporarily unavailable.');
    }
    return {
      id: paymentIntentId,
      status: 'succeeded',
      captured: true,
      amount_received: 5500
    };
  }

  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return {
    id: intent.id,
    status: intent.status,
    captured: intent.status === 'succeeded',
    amount_received: intent.amount_received
  };
}

/**
 * Refund a transaction via Stripe
 */
export async function processStripeRefund(paymentIntentId: string, amountInCents?: number, reason?: string) {
  const stripe = getStripe();
  const isDemo = process.env.APP_MODE !== 'production';

  if (!stripe || paymentIntentId.startsWith('pi_demo_') || paymentIntentId.startsWith('pi_test_')) {
    if (!isDemo && !stripe) {
      throw new Error('Refund processing requires active Stripe gateway.');
    }
    return {
      id: `re_demo_${Date.now()}`,
      payment_intent: paymentIntentId,
      amount: amountInCents || 5000,
      status: 'succeeded'
    };
  }

  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amountInCents,
    reason: (reason as any) || 'requested_by_customer'
  });

  return refund;
}

/**
 * Onboard Barber to Stripe Connect
 */
export async function createStripeConnectAccountLink(barberId: string, returnUrl: string, refreshUrl: string) {
  const stripe = getStripe();
  const barber = db.users.get(barberId);
  const profile = db.barberProfiles.get(barberId);

  if (!barber || !profile) {
    throw new Error('Barber profile not found.');
  }

  if (!stripe) {
    // Generate Sandbox Stripe Connect URL
    const demoAccountId = `acct_demo_${barberId}_${Date.now()}`;
    profile.stripeAccountId = demoAccountId;
    profile.stripeAccountStatus = 'active';

    return {
      url: `${returnUrl}?connect=success&account_id=${demoAccountId}`,
      accountId: demoAccountId,
      isDemo: true
    };
  }

  let accountId = profile.stripeAccountId;
  if (!accountId || accountId.startsWith('acct_demo_')) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: barber.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      business_type: 'individual',
      individual: {
        email: barber.email
      }
    });
    accountId = account.id;
    profile.stripeAccountId = accountId;
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding'
  });

  return {
    url: accountLink.url,
    accountId,
    isDemo: false
  };
}

/**
 * User / Customer subscription checkout via Stripe Billing
 * Supports 4 plans (free, basic, pro, premium) & monthly/annual intervals
 */
export async function createCustomerSubscriptionCheckout(params: {
  userId: string;
  planId: SubscriptionPlanId;
  billingInterval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
}) {
  const { userId, planId, billingInterval, successUrl, cancelUrl } = params;
  const user = db.users.get(userId);
  const plan = APP_SUBSCRIPTION_PLANS.find((p) => p.id === planId);

  if (!user || !plan) {
    throw new Error('Invalid user or plan selected.');
  }

  // If free plan selected, activate immediately without Stripe checkout
  if (plan.id === 'free') {
    const now = new Date().toISOString();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const sub: UserSubscription = {
      id: `sub_${userId}_free`,
      userId,
      planId: 'free',
      status: 'active',
      billingInterval: 'month',
      amount: 0,
      currency: 'USD',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      usageThisCycle: {
        aiConsultationsUsed: 0,
        bookingsCompleted: 0,
        discountsSaved: 0
      },
      createdAt: now,
      updatedAt: now
    };
    db.subscriptions.set(userId, sub);
    return {
      url: `${successUrl}?plan=free&activated=true`,
      isFree: true,
      isDemo: true
    };
  }

  const priceAmount = billingInterval === 'year' ? plan.pricePerYear : plan.pricePerMonth;
  const stripe = getStripe();

  if (!stripe) {
    // Sandbox / Instant Activation for demo environment
    const now = new Date().toISOString();
    const trialDays = plan.trialDays || 14;
    const trialEnd = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
    const periodEnd = new Date(
      Date.now() + (billingInterval === 'year' ? 365 : 30) * 24 * 60 * 60 * 1000
    ).toISOString();

    const existingSub = db.subscriptions.get(userId);
    const newSub: UserSubscription = {
      id: `sub_${userId}_${Date.now()}`,
      userId,
      planId: plan.id,
      status: 'active',
      billingInterval,
      amount: priceAmount,
      currency: 'USD',
      trialStartDate: now,
      trialEndDate: trialEnd,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      stripeCustomerId: `cus_demo_${userId}`,
      stripeSubscriptionId: `sub_demo_${Date.now()}`,
      paymentMethod: {
        brand: 'Visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2028
      },
      usageThisCycle: existingSub?.usageThisCycle || {
        aiConsultationsUsed: 0,
        bookingsCompleted: 0,
        discountsSaved: 0
      },
      createdAt: existingSub?.createdAt || now,
      updatedAt: now
    };

    db.subscriptions.set(userId, newSub);

    // Create demo invoice
    const invoiceNum = `INV-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const invoice: BillingInvoice = {
      id: `inv-${Date.now()}`,
      userId,
      subscriptionId: newSub.id,
      invoiceNumber: invoiceNum,
      amount: priceAmount,
      currency: 'USD',
      status: 'paid',
      planName: `${plan.name} Membership (${billingInterval === 'year' ? 'Annual' : 'Monthly'})`,
      billingInterval,
      date: now,
      periodStart: now,
      periodEnd: periodEnd,
      pdfUrl: '#',
      receiptUrl: '#',
      paymentMethod: { brand: 'Visa', last4: '4242' }
    };
    db.addInvoice(userId, invoice);

    db.recordBillingEvent({
      userId,
      type: 'customer.subscription.created',
      amount: priceAmount,
      currency: 'USD',
      status: 'succeeded',
      data: { planId: plan.id, billingInterval, trialDays }
    });

    return {
      url: `${successUrl}?plan=${plan.id}&interval=${billingInterval}&session_id=cs_demo_${Date.now()}`,
      isDemo: true,
      subscription: newSub
    };
  }

  // Live Stripe Checkout Session
  const sessionCreateParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `BarberGo ${plan.name} Membership`,
            description: `${plan.tagline} • ${plan.description}`,
            images: ['https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&auto=format&fit=crop&q=80']
          },
          unit_amount: Math.round(priceAmount * 100),
          recurring: {
            interval: billingInterval
          }
        },
        quantity: 1
      }
    ],
    subscription_data: {
      trial_period_days: plan.trialDays > 0 ? plan.trialDays : undefined,
      metadata: {
        userId,
        planId: plan.id,
        billingInterval
      }
    },
    metadata: {
      userId,
      planId: plan.id,
      billingInterval
    },
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&plan=${plan.id}&interval=${billingInterval}`,
    cancel_url: cancelUrl
  };

  const session = await stripe.checkout.sessions.create(sessionCreateParams);

  return {
    url: session.url,
    sessionId: session.id,
    isDemo: false
  };
}

/**
 * Creates a Stripe Customer Portal session so user can manage subscriptions/invoices/cards
 */
export async function createStripeCustomerPortalSession(userId: string, returnUrl: string) {
  const stripe = getStripe();
  const sub = db.subscriptions.get(userId);

  if (!stripe || !sub?.stripeCustomerId || sub.stripeCustomerId.startsWith('cus_demo_')) {
    return {
      url: returnUrl,
      isDemo: true,
      message: 'Demo customer portal simulated.'
    };
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: returnUrl
  });

  return {
    url: portalSession.url,
    isDemo: false
  };
}

/**
 * Handle Stripe Webhook Events securely
 */
export async function handleStripeWebhookEvent(event: Stripe.Event) {
  const eventType = event.type;
  const dataObject = event.data.object as any;

  db.recordBillingEvent({
    userId: dataObject.metadata?.userId || dataObject.customer,
    type: eventType,
    stripeEventId: event.id,
    amount: dataObject.amount_total ? dataObject.amount_total / 100 : undefined,
    currency: dataObject.currency?.toUpperCase(),
    status: 'received',
    data: { id: dataObject.id, status: dataObject.status }
  });

  switch (eventType) {
    case 'checkout.session.completed': {
      const session = dataObject as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const planId = session.metadata?.planId as SubscriptionPlanId;
      const billingInterval = (session.metadata?.billingInterval as BillingInterval) || 'month';

      if (userId && planId) {
        const plan = APP_SUBSCRIPTION_PLANS.find((p) => p.id === planId);
        const amount = billingInterval === 'year' ? (plan?.pricePerYear || 0) : (plan?.pricePerMonth || 0);
        const now = new Date().toISOString();
        const periodEnd = new Date(
          Date.now() + (billingInterval === 'year' ? 365 : 30) * 24 * 60 * 60 * 1000
        ).toISOString();

        const updatedSub: UserSubscription = {
          id: `sub_${session.subscription || Date.now()}`,
          userId,
          planId,
          status: 'active',
          billingInterval,
          amount,
          currency: 'USD',
          trialStartDate: now,
          trialEndDate: plan?.trialDays ? new Date(Date.now() + plan.trialDays * 86400000).toISOString() : undefined,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          usageThisCycle: {
            aiConsultationsUsed: 0,
            bookingsCompleted: 0,
            discountsSaved: 0
          },
          createdAt: now,
          updatedAt: now
        };

        db.subscriptions.set(userId, updatedSub);

        // Add initial invoice
        db.addInvoice(userId, {
          id: `inv-${Date.now()}`,
          userId,
          subscriptionId: updatedSub.id,
          invoiceNumber: `INV-2026-${Math.floor(10000 + Math.random() * 90000)}`,
          amount,
          currency: 'USD',
          status: 'paid',
          planName: `${plan?.name || planId} Membership`,
          billingInterval,
          date: now,
          periodStart: now,
          periodEnd,
          pdfUrl: '#',
          receiptUrl: '#'
        });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = dataObject as Stripe.Subscription;
      const customerId = subscription.customer as string;
      for (const [uid, sub] of db.subscriptions.entries()) {
        if (sub.stripeCustomerId === customerId || sub.stripeSubscriptionId === subscription.id) {
          sub.status = 'canceled';
          sub.canceledAt = new Date().toISOString();
          sub.updatedAt = new Date().toISOString();
          db.subscriptions.set(uid, sub);
        }
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = dataObject as Stripe.Subscription;
      const customerId = subscription.customer as string;
      for (const [uid, sub] of db.subscriptions.entries()) {
        if (sub.stripeCustomerId === customerId || sub.stripeSubscriptionId === subscription.id) {
          sub.status = subscription.status as any;
          sub.cancelAtPeriodEnd = subscription.cancel_at_period_end;
          sub.updatedAt = new Date().toISOString();
          db.subscriptions.set(uid, sub);
        }
      }
      break;
    }

    case 'invoice.paid': {
      const invoice = dataObject as Stripe.Invoice;
      const customerId = invoice.customer as string;
      for (const [uid, sub] of db.subscriptions.entries()) {
        if (sub.stripeCustomerId === customerId) {
          db.addInvoice(uid, {
            id: `inv-${invoice.id}`,
            userId: uid,
            subscriptionId: sub.id,
            invoiceNumber: invoice.number || `INV-${Date.now()}`,
            amount: (invoice.amount_paid || 0) / 100,
            currency: (invoice.currency || 'usd').toUpperCase(),
            status: 'paid',
            planName: sub.planId.toUpperCase(),
            billingInterval: sub.billingInterval,
            date: new Date(invoice.created * 1000).toISOString(),
            periodStart: new Date(invoice.period_start * 1000).toISOString(),
            periodEnd: new Date(invoice.period_end * 1000).toISOString(),
            pdfUrl: invoice.invoice_pdf || undefined,
            receiptUrl: invoice.hosted_invoice_url || undefined
          });
        }
      }
      break;
    }
  }

  return { received: true };
}

/**
 * Barber subscription checkout via Stripe Billing
 */
export async function createBarberSubscriptionCheckout(
  barberId: string,
  planId: 'starter' | 'pro' | 'elite',
  successUrl: string,
  cancelUrl: string
) {
  const stripe = getStripe();
  const barber = db.users.get(barberId);
  const plan = db.settings.subscriptionPlans.find((p) => p.id === planId);

  if (!barber || !plan) {
    throw new Error('Invalid plan or barber.');
  }

  if (!stripe) {
    const profile = db.barberProfiles.get(barberId);
    if (profile) {
      profile.subscriptionTier = planId;
      profile.subscriptionStatus = 'active';
      profile.subscriptionRenewalDate = new Date(Date.now() + 30 * 86400000).toISOString();
    }
    return {
      url: `${successUrl}?plan=${planId}&session_id=cs_demo_${Date.now()}`,
      isDemo: true
    };
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: barber.email,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `BarberGo ${plan.name} Membership`,
            description: plan.description
          },
          unit_amount: Math.round(plan.pricePerMonth * 100),
          recurring: {
            interval: 'month'
          }
        },
        quantity: 1
      }
    ],
    metadata: {
      barberId,
      planId
    },
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&plan=${planId}`,
    cancel_url: cancelUrl
  });

  return {
    url: session.url,
    sessionId: session.id,
    isDemo: false
  };
}
