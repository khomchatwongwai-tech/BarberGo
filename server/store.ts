import {
  User,
  CustomerProfile,
  BarberProfile,
  Service,
  BarberAvailability,
  BarberDocument,
  Booking,
  Message,
  AppNotification,
  PlatformSettings,
  AuditLog,
  PromoCode,
  SafetyReport,
  BookingPricing,
  BookingStatus,
  StatusHistoryItem,
  BarberOffer,
  BarberCalendarDay,
  BarberCalendarSlot,
  AppSubscriptionPlan,
  UserSubscription,
  BillingInvoice,
  BillingEvent,
  SubscriptionPlanId,
  BillingInterval
} from '../src/types';

export const BARBERPILOT_PLATFORM_FEE_RATE = 0.05; // Authoritative 5% marketplace transaction fee

export const BARBER_SUBSCRIPTION_PLANS: AppSubscriptionPlan[] = [
  {
    id: 'solo' as any,
    name: 'Solo',
    tagline: 'Essential mobile barber business kit',
    pricePerMonth: 19.99,
    pricePerYear: 199.90,
    trialDays: 14,
    isPopular: false,
    description: 'Great for independent barbers getting started with on-demand mobile bookings.',
    features: [
      'Up to 35 customer booking opportunities / month',
      'Standard marketplace smart match ranking',
      '1 Primary service travel radius',
      'Direct Stripe Connect bank payouts',
      'In-app client messaging & style notes'
    ],
    featureList: [
      { text: '35 customer opportunities / mo', included: true },
      { text: 'Standard search & map ranking', included: true },
      { text: '1 Primary service area radius', included: true },
      { text: 'Direct Stripe Connect payouts', included: true },
      { text: '14-Day Free Trial included', included: true },
      { text: 'Priority dispatch boost', included: false },
      { text: 'AI Demand Forecasting & Bio Writer', included: false }
    ],
    limits: {
      aiConsultationsPerMonth: 5,
      bookingDiscountPercent: 0,
      platformFeeWaiver: false,
      priorityDispatch: false,
      vipSupport: false,
      directBarberLine: true,
      barberMonthlyBookings: 35
    }
  },
  {
    id: 'growth' as any,
    name: 'Growth',
    tagline: 'Accelerate your client base and booking volume',
    pricePerMonth: 49.99,
    pricePerYear: 479.90,
    trialDays: 14,
    isPopular: true,
    description: 'Enhanced visibility and client retention tools for busy mobile professionals.',
    features: [
      'Up to 100 customer booking opportunities / month',
      'Enhanced search visibility boost (1.5x)',
      '3 Service area regions or custom radius',
      'Verified Pro Master Barber badge',
      'Repeat & Preferred customer tagging',
      'Priority dispatch notifications'
    ],
    featureList: [
      { text: '100 customer opportunities / mo', included: true, highlight: true },
      { text: '1.5x Search & Map Visibility Boost', included: true, highlight: true },
      { text: '3 Service areas / extended radius', included: true },
      { text: 'Verified Pro Master Barber badge', included: true },
      { text: 'Repeat client tagging & fast rebook', included: true },
      { text: 'Priority dispatch queue', included: true }
    ],
    limits: {
      aiConsultationsPerMonth: 25,
      bookingDiscountPercent: 0,
      platformFeeWaiver: false,
      priorityDispatch: true,
      vipSupport: false,
      directBarberLine: true,
      barberMonthlyBookings: 100
    }
  },
  {
    id: 'professional' as any,
    name: 'Professional',
    tagline: 'Maximum allowable capacity, AI tools & VIP priority',
    pricePerMonth: 89.99,
    pricePerYear: 869.90,
    trialDays: 14,
    isPopular: false,
    description: 'Unlimited volume, top-tier search boost, AI business suite, and VIP concierge.',
    features: [
      'Unlimited monthly customer opportunities',
      'Maximum marketplace visibility boost (3x)',
      'Unlimited service areas & extended-distance routing',
      'Elite Master Barber gold badge',
      'AI Demand Forecasting, Bio & Service description generator',
      'VIP concierge line & instant payouts'
    ],
    featureList: [
      { text: 'Unlimited customer booking opportunities', included: true, highlight: true },
      { text: 'Maximum 3x Marketplace Search Boost', included: true, highlight: true },
      { text: 'Unlimited service travel areas', included: true },
      { text: 'Elite Master Barber Gold Badge', included: true },
      { text: 'AI Business Suite & Bio Optimizer', included: true },
      { text: '24/7 VIP dedicated support & Instant Payouts', included: true }
    ],
    limits: {
      aiConsultationsPerMonth: -1,
      bookingDiscountPercent: 0,
      platformFeeWaiver: false,
      priorityDispatch: true,
      vipSupport: true,
      directBarberLine: true,
      barberMonthlyBookings: null
    }
  }
];

export const APP_SUBSCRIPTION_PLANS: AppSubscriptionPlan[] = BARBER_SUBSCRIPTION_PLANS;

export class DataStore {
  users: Map<string, User> = new Map();
  customerProfiles: Map<string, CustomerProfile> = new Map();
  barberProfiles: Map<string, BarberProfile> = new Map();
  services: Map<string, Service[]> = new Map(); // barberId -> services
  availabilities: Map<string, BarberAvailability> = new Map(); // barberId -> availability
  documents: Map<string, BarberDocument[]> = new Map(); // barberId -> docs
  bookings: Map<string, Booking> = new Map();
  messages: Map<string, Message[]> = new Map(); // bookingId -> messages
  notifications: Map<string, AppNotification[]> = new Map(); // userId -> notifications
  promoCodes: Map<string, PromoCode> = new Map();
  offers: Map<string, BarberOffer> = new Map(); // offerId -> BarberOffer
  safetyReports: Map<string, SafetyReport> = new Map();
  subscriptions: Map<string, UserSubscription> = new Map(); // userId -> UserSubscription
  invoices: Map<string, BillingInvoice[]> = new Map(); // userId -> BillingInvoice[]
  billingEvents: BillingEvent[] = [];
  auditLogs: AuditLog[] = [];
  settings: PlatformSettings;

  constructor() {
    this.settings = {
      appName: 'BarberPilot',
      logoText: 'BarberPilot',
      tagline: 'Master Barbers Delivered to Your Door',
      primaryColor: '#0F172A',
      accentColor: '#0284C7', // Sky 600
      platformFeePercent: 5.0, // Canonical 5% marketplace fee
      minPlatformFee: 1.00,
      maxPlatformFee: 15.00,
      taxRatePercent: 8.5,
      cancellationCutoffHours: 24,
      lateCancellationFeePercent: 50,
      emergencyHelpline: '1-800-555-CUTS',
      allowNewBarberRegistration: true,
      maintenanceMode: false,
      supportedCities: [
        'San Francisco, CA',
        'Oakland, CA',
        'San Jose, CA',
        'Los Angeles, CA',
        'New York, NY',
        'Austin, TX',
        'Miami, FL'
      ],
      appMode: (process.env.APP_MODE as any) || 'demo',
      stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('...')),
      subscriptionPlans: [
        {
          id: 'solo',
          name: 'Solo Tier',
          pricePerMonth: 19.99,
          bookingLimit: 35,
          description: 'Essential mobile barber business kit for independent mobile barbers.',
          features: [
            'Up to 35 customer opportunities / month',
            'Standard marketplace match ranking',
            '1 Primary service travel radius',
            'Direct Stripe Connect payouts',
            'In-app client messaging & style notes'
          ]
        },
        {
          id: 'growth',
          name: 'Growth Tier (Most Popular)',
          pricePerMonth: 49.99,
          bookingLimit: 100,
          isPopular: true,
          description: 'Enhanced visibility and client retention tools for busy mobile professionals.',
          features: [
            'Up to 100 customer opportunities / month',
            'Enhanced search visibility boost (1.5x)',
            '3 Service area regions or custom radius',
            'Verified Pro Master Barber badge',
            'Repeat & Preferred customer tagging',
            'Priority dispatch notifications'
          ]
        },
        {
          id: 'professional',
          name: 'Professional Tier',
          pricePerMonth: 89.99,
          bookingLimit: null, // Unlimited
          description: 'Unlimited volume, maximum visibility boost, and AI business tools.',
          features: [
            'Unlimited monthly customer opportunities',
            'Maximum marketplace visibility boost (3x)',
            'Unlimited service areas & extended routing',
            'Elite Master Barber gold badge',
            'AI Demand Forecasting & Bio Optimizer',
            'VIP concierge line & instant payouts'
          ]
        }
      ]
    };

    this.seedInitialData();
  }

  seedInitialData() {
    // 1. Seed Users
    const customerUser: User = {
      id: 'cust-1',
      email: 'marcus.vance@example.com',
      phone: '+1 (415) 555-0192',
      role: 'customer',
      fullName: 'Marcus Vance',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      isVerified: true,
      emailVerified: true,
      phoneVerified: true,
      isBanned: false,
      isSuspended: false,
      createdAt: '2025-01-10T10:00:00Z',
      updatedAt: '2025-01-10T10:00:00Z'
    };

    const barber1User: User = {
      id: 'barber-1',
      email: 'devon.carter@barberpilot.pro',
      phone: '+1 (415) 555-0144',
      role: 'barber',
      fullName: 'Devon "Blade" Carter',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      isVerified: true,
      emailVerified: true,
      phoneVerified: true,
      isBanned: false,
      isSuspended: false,
      createdAt: '2024-11-01T08:00:00Z',
      updatedAt: '2025-02-01T12:00:00Z'
    };

    const barber2User: User = {
      id: 'barber-2',
      email: 'sofia.reyes@barberpilot.pro',
      phone: '+1 (415) 555-0178',
      role: 'barber',
      fullName: 'Sofia Reyes',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
      isVerified: true,
      emailVerified: true,
      phoneVerified: true,
      isBanned: false,
      isSuspended: false,
      createdAt: '2024-12-15T09:30:00Z',
      updatedAt: '2025-02-10T15:00:00Z'
    };

    const barber3User: User = {
      id: 'barber-3',
      email: 'jamal.washington@barberpilot.pro',
      phone: '+1 (510) 555-0129',
      role: 'barber',
      fullName: 'Jamal Washington',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
      isVerified: true,
      emailVerified: true,
      phoneVerified: true,
      isBanned: false,
      isSuspended: false,
      createdAt: '2025-01-05T11:00:00Z',
      updatedAt: '2025-02-12T10:00:00Z'
    };

    const adminUser: User = {
      id: 'admin-1',
      email: 'alexandra.chen@barberpilot.app',
      phone: '+1 (415) 555-0100',
      role: 'admin',
      fullName: 'Alexandra Chen (Platform Director)',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
      isVerified: true,
      emailVerified: true,
      phoneVerified: true,
      isBanned: false,
      isSuspended: false,
      createdAt: '2024-10-01T00:00:00Z',
      updatedAt: '2025-02-01T00:00:00Z'
    };

    const supportUser: User = {
      id: 'support-1',
      email: 'jordan.rivera@barberpilot.app',
      phone: '+1 (415) 555-0111',
      role: 'support',
      fullName: 'Jordan Rivera (Lead Support Specialist)',
      avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80',
      isVerified: true,
      emailVerified: true,
      phoneVerified: true,
      isBanned: false,
      isSuspended: false,
      createdAt: '2024-10-15T00:00:00Z',
      updatedAt: '2025-02-01T00:00:00Z'
    };

    this.users.set(customerUser.id, customerUser);
    this.users.set(barber1User.id, barber1User);
    this.users.set(barber2User.id, barber2User);
    this.users.set(barber3User.id, barber3User);
    this.users.set(adminUser.id, adminUser);
    this.users.set(supportUser.id, supportUser);

    // 2. Seed Customer Profile
    this.customerProfiles.set('cust-1', {
      userId: 'cust-1',
      hairType: 'Thick & Textured, Low Skin Fade Preference',
      favoriteStyles: ['Mid Taper Fade', 'Beard Line-Up', 'Razor Edge', 'Textured Crop'],
      notes: 'Sensitive skin around neck; prefers organic aftershave mist and razor finish.',
      accessibilityNotes: 'Elevator access available at entrance. Please call upon arrival.',
      savedAddresses: [
        {
          id: 'addr-1',
          label: 'Apartment (Home)',
          street: '450 Mission St, Apt 14B',
          apartment: '14B',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94105',
          lat: 37.7903,
          lng: -122.3995,
          instructions: 'Buzz 1402 on call box. Building has front desk concierge.',
          isDefault: true
        },
        {
          id: 'addr-2',
          label: 'Tech HQ (Office)',
          street: '100 Montgomery St, 8th Floor',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94104',
          lat: 37.7915,
          lng: -122.4024,
          instructions: 'Meet in Executive Wellness Suite 802. Visitor pass registered.',
          isDefault: false
        }
      ],
      favorites: ['barber-1', 'barber-2'],
      emergencyContact: {
        name: 'Sarah Vance',
        phone: '+1 (415) 555-0891',
        relationship: 'Spouse'
      }
    });

    // 3. Seed Barber Profiles
    this.barberProfiles.set('barber-1', {
      userId: 'barber-1',
      bio: 'Master Barber with 12+ years of luxury mobile grooming experience. Specializing in precision skin tapers, scissor work, executive beard sculpting, and hot towel charcoal treatments. Fully equipped with sterilized cordless shears, vacuum clipper attachments, portable vanity lighting, and fresh linen.',
      experienceYears: 12,
      rating: 4.96,
      reviewCount: 148,
      completedBookingsCount: 312,
      travelRadiusMiles: 15,
      baseTravelFee: 15.0,
      travelFeePerMile: 1.25,
      serviceAreaZipCodes: ['94102', '94103', '94105', '94107', '94109', '94110', '94114', '94117'],
      serviceAreaCities: ['San Francisco', 'Daly City', 'South San Francisco'],
      coordinates: { lat: 37.7749, lng: -122.4194 },
      currentLocation: { lat: 37.7810, lng: -122.4120, updatedAt: new Date().toISOString() },
      stripeAccountId: 'acct_1Nxb992817Blade',
      stripeAccountStatus: 'active',
      subscriptionTier: 'professional',
      subscriptionStatus: 'active',
      subscriptionRenewalDate: '2026-09-01T00:00:00Z',
      bookingVolumeThisMonth: 38,
      isAcceptingBookings: true,
      isPaused: false,
      licenseNumber: 'CA-BAR-994821',
      licenseState: 'CA',
      licenseStatus: 'verified',
      idVerified: true,
      backgroundCheckStatus: 'cleared',
      insuranceDocumentUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80',
      portfolioImages: [
        'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?w=600&auto=format&fit=crop&q=80'
      ],
      languages: ['English', 'Spanish'],
      cancellationPolicy: 'flexible'
    });

    this.barberProfiles.set('barber-2', {
      userId: 'barber-2',
      bio: 'Editorial and celebrity mobile stylist specializing in modern shears, textured crops, clean line-ups, and rejuvenating scalp treatments. Bringing the five-star salon experience directly into your luxury suite, high-rise, or penthouse with zero mess.',
      experienceYears: 8,
      rating: 4.93,
      reviewCount: 94,
      completedBookingsCount: 189,
      travelRadiusMiles: 12,
      baseTravelFee: 18.0,
      travelFeePerMile: 1.5,
      serviceAreaZipCodes: ['94102', '94104', '94108', '94115', '94123', '94129'],
      serviceAreaCities: ['San Francisco', 'Sausalito', 'Tiburon'],
      coordinates: { lat: 37.7983, lng: -122.4385 },
      currentLocation: { lat: 37.7940, lng: -122.4280, updatedAt: new Date().toISOString() },
      stripeAccountId: 'acct_1Nxb883718Sofia',
      stripeAccountStatus: 'active',
      subscriptionTier: 'growth',
      subscriptionStatus: 'active',
      subscriptionRenewalDate: '2026-08-28T00:00:00Z',
      bookingVolumeThisMonth: 22,
      isAcceptingBookings: true,
      isPaused: false,
      licenseNumber: 'CA-BAR-817290',
      licenseState: 'CA',
      licenseStatus: 'verified',
      idVerified: true,
      backgroundCheckStatus: 'cleared',
      portfolioImages: [
        'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1593702295094-ada74bc4a149?w=600&auto=format&fit=crop&q=80'
      ],
      languages: ['English', 'Spanish', 'Portuguese'],
      cancellationPolicy: 'moderate'
    });

    this.barberProfiles.set('barber-3', {
      userId: 'barber-3',
      bio: 'East Bay & SF mobile grooming veteran. Known for immaculate low/mid/high fades, organic beard oils, straight razor finishes, and tailored father-and-son packages.',
      experienceYears: 10,
      rating: 4.88,
      reviewCount: 76,
      completedBookingsCount: 140,
      travelRadiusMiles: 20,
      baseTravelFee: 12.0,
      travelFeePerMile: 1.0,
      serviceAreaZipCodes: ['94607', '94612', '94609', '94704', '94105'],
      serviceAreaCities: ['Oakland', 'Berkeley', 'San Francisco', 'Alameda'],
      coordinates: { lat: 37.8044, lng: -122.2712 },
      currentLocation: { lat: 37.8060, lng: -122.2680, updatedAt: new Date().toISOString() },
      stripeAccountId: 'acct_1Nxb774819Jamal',
      stripeAccountStatus: 'active',
      subscriptionTier: 'solo',
      subscriptionStatus: 'active',
      subscriptionRenewalDate: '2026-09-10T00:00:00Z',
      bookingVolumeThisMonth: 16,
      isAcceptingBookings: true,
      isPaused: false,
      licenseNumber: 'CA-BAR-552190',
      licenseState: 'CA',
      licenseStatus: 'verified',
      idVerified: true,
      backgroundCheckStatus: 'cleared',
      portfolioImages: [
        'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&auto=format&fit=crop&q=80'
      ],
      languages: ['English'],
      cancellationPolicy: 'flexible'
    });

    // 4. Seed Services for Barbers
    const bladeServices: Service[] = [
      {
        id: 'srv-101',
        barberId: 'barber-1',
        name: 'The Executive Signature Fade & Cut',
        category: 'Haircut',
        description: 'Comprehensive consultation, custom clipper fade or scissor cut, neck taper, razor edge clean up, and botanical cooling aftershave mist.',
        price: 75.0,
        durationMinutes: 45,
        requiredEquipment: ['Cordless Clippers', 'Disinfected Shears', 'Sanitized Cape', 'LED Vanity Light'],
        isActive: true,
        addOns: [
          { id: 'addon-1', name: 'Beard Sculpt & Razor Shape', price: 30.0, durationMinutes: 20, description: 'Trimming, line definition with straight razor, organic sandalwood oil treatment.' },
          { id: 'addon-2', name: 'Hot Towel & Charcoal Facial', price: 25.0, durationMinutes: 15, description: 'Steamed lavender towel wrap, pore detox mask, and invigorating face massage.' },
          { id: 'addon-3', name: 'Grey Blending Camo Treatment', price: 40.0, durationMinutes: 20, description: 'Natural, subtle demi-permanent grey reduction for hair or beard.' }
        ]
      },
      {
        id: 'srv-102',
        barberId: 'barber-1',
        name: 'Royal VIP Full Groom Package',
        category: 'VIP Combo',
        description: 'Our pinnacle 80-minute experience: Master haircut, beard architecture, dual hot towels, scalp scrub massage, eyebrow contour, and cold-pressed beard elixir.',
        price: 135.0,
        durationMinutes: 80,
        requiredEquipment: ['Full Mobile Barber Kit', 'Hot Towel Steamer', 'Vanity Ring Light'],
        isActive: true,
        addOns: [
          { id: 'addon-4', name: 'Deep Exfoliating Scalp Scrub', price: 20.0, durationMinutes: 10, description: 'Tea tree and sea salt scalp purifier to remove buildup.' }
        ]
      },
      {
        id: 'srv-103',
        barberId: 'barber-1',
        name: 'Traditional Hot Towel Straight Razor Shave',
        category: 'Shave',
        description: 'Classic barber ritual: Pre-shave essential oils, 3 hot steamed towels, rich warm lather, single-use Feather Japanese straight razor, and cold towel close.',
        price: 60.0,
        durationMinutes: 40,
        requiredEquipment: ['Towel Steamer', 'Warm Lather Machine', 'Straight Razor Single-use Blades'],
        isActive: true,
        addOns: [
          { id: 'addon-5', name: 'Anti-Aging Hyaluronic Eye Treatment', price: 18.0, durationMinutes: 10, description: 'Cooling under-eye hydrogel masks to soothe fatigue.' }
        ]
      },
      {
        id: 'srv-104',
        barberId: 'barber-1',
        name: 'Young Gentleman Cut (Ages 4–12)',
        category: 'Kids',
        description: 'Patient, gentle styling and haircut for young boys with candy treat and styling pomade.',
        price: 50.0,
        durationMinutes: 35,
        isActive: true,
        addOns: []
      }
    ];

    const sofiaServices: Service[] = [
      {
        id: 'srv-201',
        barberId: 'barber-2',
        name: 'Modern Precision Scissor & Fade',
        category: 'Haircut',
        description: 'Custom scissor shaping, seamless skin or shadow fade, textured finish with matte paste styling.',
        price: 80.0,
        durationMinutes: 50,
        isActive: true,
        addOns: [
          { id: 'addon-201', name: 'Luxury Beard Shaping', price: 35.0, durationMinutes: 20, description: 'Bespoke contouring and conditioning.' },
          { id: 'addon-202', name: 'Nourishing Hair Mask', price: 25.0, durationMinutes: 15, description: 'Argan oil hydration treatment.' }
        ]
      },
      {
        id: 'srv-202',
        barberId: 'barber-2',
        name: 'Penthouse Luxe Grooming Experience',
        category: 'VIP Combo',
        description: 'Haircut, beard sculpting, scalp massage, hot towel treatment, and custom take-home styling cream.',
        price: 150.0,
        durationMinutes: 90,
        isActive: true,
        addOns: []
      }
    ];

    const jamalServices: Service[] = [
      {
        id: 'srv-301',
        barberId: 'barber-3',
        name: 'Classic Mobile Taper & Lineup',
        category: 'Haircut',
        description: 'Sharp crisp hairline, clean taper or fade, razor finish, and bay rum splash.',
        price: 65.0,
        durationMinutes: 45,
        isActive: true,
        addOns: [
          { id: 'addon-301', name: 'Beard Trimming & Oil', price: 25.0, durationMinutes: 15, description: 'Sculpted finish with organic oil.' }
        ]
      }
    ];

    this.services.set('barber-1', bladeServices);
    this.services.set('barber-2', sofiaServices);
    this.services.set('barber-3', jamalServices);

    // 5. Seed Availabilities
    const defaultSchedule = {
      enabled: true,
      slots: [
        { start: '08:00', end: '12:00' },
        { start: '13:00', end: '19:00' }
      ]
    };

    this.availabilities.set('barber-1', {
      barberId: 'barber-1',
      weeklySchedule: {
        monday: { ...defaultSchedule },
        tuesday: { ...defaultSchedule },
        wednesday: { ...defaultSchedule },
        thursday: { ...defaultSchedule },
        friday: { ...defaultSchedule, slots: [{ start: '08:00', end: '20:00' }] },
        saturday: { enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
        sunday: { enabled: false, slots: [] }
      },
      unavailableDates: ['2026-12-25', '2026-01-01'],
      breaks: [{ start: '12:00', end: '13:00', label: 'Lunch Break & Sanitization' }],
      minimumNoticeHours: 2,
      bufferMinutesBetweenAppointments: 25
    });

    this.availabilities.set('barber-2', {
      barberId: 'barber-2',
      weeklySchedule: {
        monday: { enabled: false, slots: [] },
        tuesday: { ...defaultSchedule },
        wednesday: { ...defaultSchedule },
        thursday: { ...defaultSchedule },
        friday: { ...defaultSchedule },
        saturday: { enabled: true, slots: [{ start: '10:00', end: '19:00' }] },
        sunday: { enabled: true, slots: [{ start: '10:00', end: '16:00' }] }
      },
      unavailableDates: [],
      breaks: [{ start: '12:30', end: '13:30', label: 'Rest & Travel buffer' }],
      minimumNoticeHours: 3,
      bufferMinutesBetweenAppointments: 30
    });

    this.availabilities.set('barber-3', {
      barberId: 'barber-3',
      weeklySchedule: {
        monday: { ...defaultSchedule },
        tuesday: { ...defaultSchedule },
        wednesday: { ...defaultSchedule },
        thursday: { ...defaultSchedule },
        friday: { ...defaultSchedule },
        saturday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
        sunday: { enabled: false, slots: [] }
      },
      unavailableDates: [],
      breaks: [],
      minimumNoticeHours: 2,
      bufferMinutesBetweenAppointments: 20
    });

    // 6. Seed Documents
    this.documents.set('barber-1', [
      {
        id: 'doc-101',
        barberId: 'barber-1',
        type: 'barber_license',
        name: 'California Barber License #CA-BAR-994821.pdf',
        fileUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
        status: 'approved',
        submittedAt: '2024-11-02T10:00:00Z',
        reviewedAt: '2024-11-03T14:30:00Z'
      },
      {
        id: 'doc-102',
        barberId: 'barber-1',
        type: 'liability_insurance',
        name: 'Commercial Mobile General Liability Policy.pdf',
        fileUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80',
        status: 'approved',
        submittedAt: '2024-11-02T10:15:00Z',
        reviewedAt: '2024-11-03T14:30:00Z'
      },
      {
        id: 'doc-103',
        barberId: 'barber-1',
        type: 'government_id',
        name: 'CA Real ID Driver License.pdf',
        fileUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80',
        status: 'approved',
        submittedAt: '2024-11-02T09:45:00Z',
        reviewedAt: '2024-11-03T14:30:00Z'
      }
    ]);

    // 7. Seed Promo Codes
    this.promoCodes.set('FRESHFADE', {
      id: 'promo-1',
      code: 'FRESHFADE',
      discountType: 'percentage',
      discountValue: 20,
      minSpend: 50,
      maxDiscount: 25,
      currentUses: 43,
      maxUses: 200,
      expiresAt: '2026-12-31T23:59:59Z',
      isActive: true
    });

    this.promoCodes.set('FIRSTCUT', {
      id: 'promo-2',
      code: 'FIRSTCUT',
      discountType: 'fixed',
      discountValue: 15,
      minSpend: 60,
      currentUses: 128,
      maxUses: 500,
      expiresAt: '2026-12-31T23:59:59Z',
      isActive: true
    });

    this.promoCodes.set('VIP50', {
      id: 'promo-3',
      code: 'VIP50',
      discountType: 'percentage',
      discountValue: 50,
      minSpend: 100,
      maxDiscount: 75,
      currentUses: 14,
      maxUses: 50,
      expiresAt: '2026-09-30T23:59:59Z',
      isActive: true
    });

    // 8. Seed Bookings in various state stages
    // Booking 1: Completed with 5-star review and generous tip
    const b1History: StatusHistoryItem[] = [
      { status: 'requested', timestamp: '2026-08-10T14:00:00Z', actorId: 'cust-1', actorRole: 'customer', note: 'Booking requested' },
      { status: 'accepted', timestamp: '2026-08-10T14:05:00Z', actorId: 'barber-1', actorRole: 'barber', note: 'Devon confirmed appointment' },
      { status: 'confirmed', timestamp: '2026-08-10T14:05:00Z', actorId: 'barber-1', actorRole: 'barber' },
      { status: 'en_route', timestamp: '2026-08-11T13:30:00Z', actorId: 'barber-1', actorRole: 'barber', note: 'Barber en route' },
      { status: 'arrived', timestamp: '2026-08-11T13:52:00Z', actorId: 'barber-1', actorRole: 'barber', note: 'Barber arrived on site & completed safety check' },
      { status: 'service_started', timestamp: '2026-08-11T14:00:00Z', actorId: 'barber-1', actorRole: 'barber', note: 'Service initiated' },
      { status: 'completed', timestamp: '2026-08-11T14:50:00Z', actorId: 'barber-1', actorRole: 'barber', note: 'Haircut and styling completed' }
    ];

    const booking1: Booking = {
      id: 'bk-901',
      customerId: 'cust-1',
      customerName: 'Marcus Vance',
      customerPhone: '+1 (415) 555-0192',
      customerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      barberId: 'barber-1',
      barberName: 'Devon "Blade" Carter',
      barberPhone: '+1 (415) 555-0144',
      barberAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      service: bladeServices[0],
      selectedAddOns: [bladeServices[0].addOns[0]], // Beard Sculpt
      date: '2026-08-11',
      time: '14:00',
      durationMinutes: 65,
      status: 'completed',
      address: {
        street: '450 Mission St, Apt 14B',
        apartment: '14B',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        lat: 37.7903,
        lng: -122.3995,
        instructions: 'Buzz 1402 on call box.'
      },
      haircutNotes: 'Low skin taper, keep bulk on top textured with matte clay. Shape beard with crisp cheeks.',
      referencePhotos: ['https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&auto=format&fit=crop&q=80'],
      pricing: {
        servicePrice: 75.0,
        addOnsPrice: 30.0,
        travelFee: 15.0,
        platformFee: 6.30,
        estimatedTax: 8.93,
        discount: 0.0,
        tip: 25.0,
        finalTotal: 160.23,
        barberEarnings: {
          serviceRevenue: 75.0,
          addOnsRevenue: 30.0,
          travelFeeRevenue: 15.0,
          tips: 25.0,
          stripeFeeEstimate: 4.80,
          netPayout: 140.20
        }
      },
      paymentStatus: 'captured',
      paymentIntentId: 'pi_test_1N9283719BladeDone',
      statusHistory: b1History,
      tracking: {
        isEnRoute: false,
        checkedInAt: '2026-08-11T13:52:00Z',
        serviceStartedAt: '2026-08-11T14:00:00Z',
        completedAt: '2026-08-11T14:50:00Z'
      },
      review: {
        id: 'rev-1',
        rating: 5,
        comment: 'Devon is without question the best mobile barber in the Bay Area. Arrived right on time with his mobile station, put down clean mats, disinfected tools, and gave me an immaculate skin fade. Absolutely worth every dollar!',
        photos: ['https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&auto=format&fit=crop&q=80'],
        barberReply: 'Much appreciated Marcus! Always a pleasure to keep you looking sharp. See you next month!',
        createdAt: '2026-08-11T16:00:00Z'
      },
      createdAt: '2026-08-10T14:00:00Z',
      updatedAt: '2026-08-11T16:00:00Z'
    };

    // Booking 2: Active / En Route (live tracking visible!)
    const todayStr = '2026-08-16';
    const booking2: Booking = {
      id: 'bk-902',
      customerId: 'cust-1',
      customerName: 'Marcus Vance',
      customerPhone: '+1 (415) 555-0192',
      customerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      barberId: 'barber-1',
      barberName: 'Devon "Blade" Carter',
      barberPhone: '+1 (415) 555-0144',
      barberAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      service: bladeServices[1], // Royal VIP Groom
      selectedAddOns: [],
      date: todayStr,
      time: '15:30',
      durationMinutes: 80,
      status: 'en_route',
      address: {
        street: '450 Mission St, Apt 14B',
        apartment: '14B',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        lat: 37.7903,
        lng: -122.3995,
        instructions: 'Buzz 1402 on call box.'
      },
      haircutNotes: 'Big corporate presentation tomorrow morning. VIP treatment + hot towels + fresh taper.',
      pricing: {
        servicePrice: 135.0,
        addOnsPrice: 0.0,
        travelFee: 15.0,
        platformFee: 8.10,
        estimatedTax: 11.48,
        discount: 20.0,
        tip: 0.0, // Tip pending completion
        finalTotal: 149.58,
        barberEarnings: {
          serviceRevenue: 135.0,
          addOnsRevenue: 0.0,
          travelFeeRevenue: 15.0,
          tips: 0.0,
          stripeFeeEstimate: 4.50,
          netPayout: 145.50
        }
      },
      paymentStatus: 'authorized',
      paymentIntentId: 'pi_test_1N9283820BladeEnRoute',
      promoCodeApplied: 'FRESHFADE',
      statusHistory: [
        { status: 'requested', timestamp: '2026-08-15T09:00:00Z', actorId: 'cust-1', actorRole: 'customer' },
        { status: 'accepted', timestamp: '2026-08-15T09:12:00Z', actorId: 'barber-1', actorRole: 'barber' },
        { status: 'confirmed', timestamp: '2026-08-15T09:12:00Z', actorId: 'barber-1', actorRole: 'barber' },
        { status: 'en_route', timestamp: '2026-08-16T15:05:00Z', actorId: 'barber-1', actorRole: 'barber', note: 'Devon is driving your way (approx 8 mins away).' }
      ],
      tracking: {
        isEnRoute: true,
        barberLocation: { lat: 37.7834, lng: -122.4082 },
        estimatedArrival: '15:24'
      },
      createdAt: '2026-08-15T09:00:00Z',
      updatedAt: '2026-08-16T15:05:00Z'
    };

    // Booking 3: Upcoming Confirmed with Barber 2
    const booking3: Booking = {
      id: 'bk-903',
      customerId: 'cust-1',
      customerName: 'Marcus Vance',
      customerPhone: '+1 (415) 555-0192',
      customerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      barberId: 'barber-2',
      barberName: 'Sofia Reyes',
      barberPhone: '+1 (415) 555-0178',
      barberAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
      service: sofiaServices[0],
      selectedAddOns: [sofiaServices[0].addOns[0]],
      date: '2026-08-20',
      time: '11:00',
      durationMinutes: 70,
      status: 'confirmed',
      address: {
        street: '100 Montgomery St, 8th Floor',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94104',
        lat: 37.7915,
        lng: -122.4024,
        instructions: 'Executive suite 802'
      },
      haircutNotes: 'Scissor texturizing and modern luxury finish.',
      pricing: {
        servicePrice: 80.0,
        addOnsPrice: 35.0,
        travelFee: 18.0,
        platformFee: 6.90,
        estimatedTax: 9.78,
        discount: 0.0,
        tip: 0.0,
        finalTotal: 149.68,
        barberEarnings: {
          serviceRevenue: 80.0,
          addOnsRevenue: 35.0,
          travelFeeRevenue: 18.0,
          tips: 0.0,
          stripeFeeEstimate: 4.40,
          netPayout: 128.60
        }
      },
      paymentStatus: 'authorized',
      paymentIntentId: 'pi_test_1N9283999SofiaConfirmed',
      statusHistory: [
        { status: 'requested', timestamp: '2026-08-14T10:00:00Z', actorId: 'cust-1', actorRole: 'customer' },
        { status: 'accepted', timestamp: '2026-08-14T10:18:00Z', actorId: 'barber-2', actorRole: 'barber' },
        { status: 'confirmed', timestamp: '2026-08-14T10:18:00Z', actorId: 'barber-2', actorRole: 'barber' }
      ],
      tracking: {
        isEnRoute: false
      },
      createdAt: '2026-08-14T10:00:00Z',
      updatedAt: '2026-08-14T10:18:00Z'
    };

    // Booking 4: Requested pending acceptance for Devon
    const booking4: Booking = {
      id: 'bk-904',
      customerId: 'cust-1',
      customerName: 'Marcus Vance',
      customerPhone: '+1 (415) 555-0192',
      customerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      barberId: 'barber-1',
      barberName: 'Devon "Blade" Carter',
      barberPhone: '+1 (415) 555-0144',
      barberAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      service: bladeServices[2], // Hot Towel Straight Razor Shave
      selectedAddOns: [bladeServices[2].addOns[0]],
      date: '2026-08-22',
      time: '10:00',
      durationMinutes: 50,
      status: 'requested',
      address: {
        street: '450 Mission St, Apt 14B',
        apartment: '14B',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        lat: 37.7903,
        lng: -122.3995
      },
      haircutNotes: 'Weekend morning shave and eye refresher before charity gala.',
      pricing: {
        servicePrice: 60.0,
        addOnsPrice: 18.0,
        travelFee: 15.0,
        platformFee: 4.68,
        estimatedTax: 6.63,
        discount: 0.0,
        tip: 0.0,
        finalTotal: 104.31,
        barberEarnings: {
          serviceRevenue: 60.0,
          addOnsRevenue: 18.0,
          travelFeeRevenue: 15.0,
          tips: 0.0,
          stripeFeeEstimate: 3.20,
          netPayout: 89.80
        }
      },
      paymentStatus: 'authorized',
      paymentIntentId: 'pi_test_1N9283444BladeRequested',
      statusHistory: [
        { status: 'requested', timestamp: '2026-08-16T08:00:00Z', actorId: 'cust-1', actorRole: 'customer' }
      ],
      tracking: {
        isEnRoute: false
      },
      createdAt: '2026-08-16T08:00:00Z',
      updatedAt: '2026-08-16T08:00:00Z'
    };

    this.bookings.set(booking1.id, booking1);
    this.bookings.set(booking2.id, booking2);
    this.bookings.set(booking3.id, booking3);
    this.bookings.set(booking4.id, booking4);

    // 9. Seed Messages for Active Booking bk-902
    this.messages.set('bk-902', [
      {
        id: 'msg-1',
        bookingId: 'bk-902',
        senderId: 'cust-1',
        senderName: 'Marcus Vance',
        senderRole: 'customer',
        recipientId: 'barber-1',
        text: 'Hey Devon, parked in front of the building or should I reserve the visitor guest spot?',
        isRead: true,
        createdAt: '2026-08-16T15:00:00Z'
      },
      {
        id: 'msg-2',
        bookingId: 'bk-902',
        senderId: 'barber-1',
        senderName: 'Devon "Blade" Carter',
        senderRole: 'barber',
        recipientId: 'cust-1',
        text: 'Hey Marcus! I will take the temporary loading zone right out front. Got all mobile equipment locked and ready. See you in 15 mins!',
        isRead: true,
        createdAt: '2026-08-16T15:02:00Z'
      }
    ]);

    // 10. Seed Notifications
    this.notifications.set('cust-1', [
      {
        id: 'notif-1',
        userId: 'cust-1',
        title: 'Barber En Route!',
        body: 'Devon Carter is on his way to 450 Mission St. ETA 15:24.',
        type: 'booking',
        read: false,
        bookingId: 'bk-902',
        createdAt: '2026-08-16T15:05:00Z'
      },
      {
        id: 'notif-2',
        userId: 'cust-1',
        title: 'Booking Confirmed',
        body: 'Sofia Reyes accepted your booking for Aug 20 at 11:00 AM.',
        type: 'booking',
        read: true,
        bookingId: 'bk-903',
        createdAt: '2026-08-14T10:18:00Z'
      }
    ]);

    this.notifications.set('barber-1', [
      {
        id: 'notif-101',
        userId: 'barber-1',
        title: 'New Booking Request',
        body: 'Marcus Vance requested a Traditional Shave on Aug 22, 10:00 AM.',
        type: 'booking',
        read: false,
        bookingId: 'bk-904',
        createdAt: '2026-08-16T08:00:00Z'
      }
    ]);

    // 11. Seed Audit Logs
    this.auditLogs.push(
      {
        id: 'audit-1',
        adminId: 'admin-1',
        adminName: 'Alexandra Chen',
        action: 'VERIFY_BARBER_LICENSE',
        targetType: 'barber',
        targetId: 'barber-1',
        details: 'Verified California Barber License #CA-BAR-994821 with State Board database.',
        timestamp: '2024-11-03T14:30:00Z'
      },
      {
        id: 'audit-2',
        adminId: 'admin-1',
        adminName: 'Alexandra Chen',
        action: 'UPDATE_PLATFORM_FEE',
        targetType: 'settings',
        targetId: 'platform_fee',
        details: 'Adjusted default transaction fee percentage to 6.0% with $1.99 minimum.',
        timestamp: '2025-01-15T09:00:00Z'
      }
    );

    // 12. Seed Live Barber Broadcast Offers
    const offer1: BarberOffer = {
      id: 'offer-1',
      barberId: 'barber-1',
      barberName: 'Devon "Blade" Carter',
      barberAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      barberRating: 4.98,
      barberSpecialties: ['Skin Fade', 'Beard Sculpt', 'Hot Towel'],
      title: '⚡ Flash Opening: $20 OFF Signature Skin Fade in SOMA / FiDi',
      description: 'Mobile van is currently parked on Mission St with zero-gap clippers & hot steam towels ready. Available for immediate dispatch to your home or office!',
      serviceCategory: 'Fade',
      serviceName: 'Signature Precision Skin & Taper Fade',
      originalPrice: 75.0,
      discountedPrice: 55.0,
      discountPercentage: 27,
      availableTimeWindow: 'Today • 2:30 PM – 5:30 PM',
      locationArea: 'Downtown SF, SOMA & FiDi (within 8 miles)',
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      isClaimed: false,
      createdAt: new Date().toISOString(),
      tags: ['⚡ Flash Deal', '🚗 Free Travel Included', '🧴 Free Tea Tree Scalp Rinse']
    };

    const offer2: BarberOffer = {
      id: 'offer-2',
      barberId: 'barber-2',
      barberName: 'Sofia Reyes',
      barberAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      barberRating: 5.0,
      barberSpecialties: ['Precision Scissor Cut', 'Luxe Beard', 'Hair Mask'],
      title: '✨ Penthouse Luxe Combo: $30 OFF in Marina / Pacific Heights',
      description: 'Full luxury experience: Scissor cut + Beard sculpting + Scalp rejuvenation with Dyson Supersonic finish.',
      serviceCategory: 'VIP Combo',
      serviceName: 'Penthouse Luxe Grooming Experience',
      originalPrice: 150.0,
      discountedPrice: 120.0,
      discountPercentage: 20,
      availableTimeWindow: 'Today • 4:00 PM – 8:00 PM',
      locationArea: 'Marina, Pacific Heights & Nob Hill',
      expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      isClaimed: false,
      createdAt: new Date().toISOString(),
      tags: ['👑 VIP Experience', '✂️ Master Scissor Cut', '💆 Argan Oil Scalp Mask']
    };

    const offer3: BarberOffer = {
      id: 'offer-3',
      barberId: 'barber-3',
      barberName: 'Jamal Williams',
      barberAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
      barberRating: 4.92,
      barberSpecialties: ['Sharp Lineup', 'Beard Contour', 'Razor Edge'],
      title: '🔥 Early Evening Special: Classic Taper + Crisp Razor Lineup $50',
      description: 'Razor sharp lines, clean taper, and organic bay rum splash. Mobile station sanitized between appointments.',
      serviceCategory: 'Haircut',
      serviceName: 'Classic Mobile Taper & Lineup',
      originalPrice: 65.0,
      discountedPrice: 50.0,
      discountPercentage: 23,
      availableTimeWindow: 'Tonight • 6:00 PM – 9:30 PM',
      locationArea: 'Mission, Castro & Potrero Hill',
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      isClaimed: false,
      createdAt: new Date().toISOString(),
      tags: ['🔥 Evening Slot', '🪒 Straight Razor Lineup', '⭐️ 4.92 Rated']
    };

    this.offers.set(offer1.id, offer1);
    this.offers.set(offer2.id, offer2);
    this.offers.set(offer3.id, offer3);

    // 13. Seed Subscriptions & Invoices
    const nowIso = new Date().toISOString();
    const trialEndIso = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const periodEndIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const customerSubscription: UserSubscription = {
      id: 'sub-cust-1',
      userId: 'cust-1',
      planId: 'pro',
      status: 'active',
      billingInterval: 'month',
      amount: 19.99,
      currency: 'USD',
      trialStartDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      trialEndDate: trialEndIso,
      currentPeriodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      currentPeriodEnd: periodEndIso,
      cancelAtPeriodEnd: false,
      stripeCustomerId: 'cus_demo_cust1_8892',
      stripeSubscriptionId: 'sub_demo_pro_1102',
      paymentMethod: {
        brand: 'Visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2028
      },
      usageThisCycle: {
        aiConsultationsUsed: 3,
        bookingsCompleted: 2,
        discountsSaved: 23.50
      },
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: nowIso
    };
    this.subscriptions.set('cust-1', customerSubscription);

    // Invoices for cust-1
    this.invoices.set('cust-1', [
      {
        id: 'inv-1002',
        userId: 'cust-1',
        subscriptionId: 'sub-cust-1',
        invoiceNumber: 'INV-2026-00981',
        amount: 19.99,
        currency: 'USD',
        status: 'paid',
        planName: 'Pro Membership',
        billingInterval: 'month',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        periodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        periodEnd: periodEndIso,
        pdfUrl: '#',
        receiptUrl: '#',
        paymentMethod: { brand: 'Visa', last4: '4242' }
      },
      {
        id: 'inv-1001',
        userId: 'cust-1',
        subscriptionId: 'sub-cust-1',
        invoiceNumber: 'INV-2026-00412',
        amount: 19.99,
        currency: 'USD',
        status: 'paid',
        planName: 'Pro Membership',
        billingInterval: 'month',
        date: new Date(Date.now() - 37 * 24 * 60 * 60 * 1000).toISOString(),
        periodStart: new Date(Date.now() - 37 * 24 * 60 * 60 * 1000).toISOString(),
        periodEnd: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        pdfUrl: '#',
        receiptUrl: '#',
        paymentMethod: { brand: 'Visa', last4: '4242' }
      }
    ]);

    // Initial billing events
    this.billingEvents.push(
      {
        id: 'evt-1',
        userId: 'cust-1',
        type: 'customer.subscription.created',
        amount: 19.99,
        currency: 'USD',
        status: 'success',
        data: { plan: 'pro', interval: 'month' },
        createdAt: new Date(Date.now() - 37 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'evt-2',
        userId: 'cust-1',
        type: 'invoice.paid',
        amount: 19.99,
        currency: 'USD',
        status: 'success',
        data: { invoiceNumber: 'INV-2026-00981' },
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    );
  }

  // --- Subscription & Billing Helpers ---
  getUserSubscription(userId: string): UserSubscription {
    let sub = this.subscriptions.get(userId);
    if (!sub) {
      // Default to free tier
      const now = new Date().toISOString();
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      sub = {
        id: `sub-free-${userId}`,
        userId,
        planId: 'free',
        status: 'active',
        billingInterval: 'month',
        amount: 0,
        currency: 'USD',
        currentPeriodStart: now,
        currentPeriodEnd: nextMonth,
        cancelAtPeriodEnd: false,
        usageThisCycle: {
          aiConsultationsUsed: 0,
          bookingsCompleted: 0,
          discountsSaved: 0
        },
        createdAt: now,
        updatedAt: now
      };
      this.subscriptions.set(userId, sub);
    }
    return sub;
  }

  getInvoices(userId: string): BillingInvoice[] {
    return this.invoices.get(userId) || [];
  }

  addInvoice(userId: string, invoice: BillingInvoice): void {
    const list = this.invoices.get(userId) || [];
    list.unshift(invoice);
    this.invoices.set(userId, list);
  }

  recordBillingEvent(event: Omit<BillingEvent, 'id' | 'createdAt'>): BillingEvent {
    const fullEvent: BillingEvent = {
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    this.billingEvents.unshift(fullEvent);
    return fullEvent;
  }

  // --- Broadcast Offers Helpers ---
  getOffers(activeOnly: boolean = true): BarberOffer[] {
    const all = Array.from(this.offers.values());
    if (!activeOnly) return all;
    const now = Date.now();
    return all.filter((o) => !o.isClaimed && new Date(o.expiresAt).getTime() > now);
  }

  createOffer(data: Omit<BarberOffer, 'id' | 'createdAt' | 'isClaimed'>): BarberOffer {
    const id = `offer-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newOffer: BarberOffer = {
      ...data,
      id,
      isClaimed: false,
      createdAt: new Date().toISOString()
    };
    this.offers.set(id, newOffer);
    return newOffer;
  }

  claimOffer(offerId: string, customerId: string): BarberOffer | null {
    const offer = this.offers.get(offerId);
    if (!offer || offer.isClaimed) return null;
    offer.isClaimed = true;
    offer.claimedByCustomerId = customerId;
    return offer;
  }

  deleteOffer(offerId: string, barberId: string): boolean {
    const offer = this.offers.get(offerId);
    if (!offer || (offer.barberId !== barberId && barberId !== 'admin-1')) return false;
    return this.offers.delete(offerId);
  }

  // --- Barber Calendar & Availability Calculations ---
  getBarberCalendar(barberId: string, daysAhead: number = 14): BarberCalendarDay[] {
    const availability = this.availabilities.get(barberId);
    const barberBookings = Array.from(this.bookings.values()).filter(
      (b) => b.barberId === barberId && b.status !== 'cancelled' && b.status !== 'declined'
    );

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const result: BarberCalendarDay[] = [];

    const now = new Date();

    for (let i = 0; i < daysAhead; i++) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + i);
      const dateStr = targetDate.toISOString().split('T')[0];
      const dayIndex = targetDate.getDay();
      const dayName = dayNames[dayIndex];

      const dayConfig = availability?.weeklySchedule?.[dayName] || { enabled: true, start: '09:00', end: '18:00', slots: [{ start: '09:00', end: '18:00' }] };
      const isBlocked = (availability?.unavailableDates || []).includes(dateStr);
      const isWorkingDay = dayConfig.enabled && !isBlocked;

      const slots: BarberCalendarSlot[] = [];

      if (isWorkingDay) {
        // Parse start and end hours
        const startTimeStr = (dayConfig.slots && dayConfig.slots[0]?.start) || dayConfig.start || '09:00';
        const endTimeStr = (dayConfig.slots && dayConfig.slots[dayConfig.slots.length - 1]?.end) || dayConfig.end || '18:00';

        const [startH, startM] = startTimeStr.split(':').map(Number);
        const [endH, endM] = endTimeStr.split(':').map(Number);

        const startMinutes = (isNaN(startH) ? 9 : startH) * 60 + (isNaN(startM) ? 0 : startM);
        const endMinutes = (isNaN(endH) ? 18 : endH) * 60 + (isNaN(endM) ? 0 : endM);
        const step = 60; // 60-minute appointment slots

        let idx = 0;
        for (let m = startMinutes; m <= endMinutes - 45; m += step) {
          const hour = Math.floor(m / 60);
          const min = m % 60;
          const period = hour >= 12 ? 'PM' : 'AM';
          const displayH = hour % 12 === 0 ? 12 : hour % 12;
          const displayHStr = displayH < 10 ? `0${displayH}` : `${displayH}`;
          const displayMStr = min < 10 ? `0${min}` : `${min}`;
          const tStr = `${displayHStr}:${displayMStr} ${period}`;
          const militaryStr = `${hour.toString().padStart(2, '0')}:${displayMStr}`;

          // Check if break
          const isBreak = (availability?.breaks || []).some(
            (br) => militaryStr >= br.start && militaryStr < br.end
          ) || (tStr === '01:00 PM' && (availability?.breaks?.length ?? 0) > 0);

          // Check if booked
          const matchedBooking = barberBookings.find(
            (b) => b.date === dateStr && (
              b.time === tStr ||
              b.time.includes(tStr.replace(' AM', '').replace(' PM', '')) ||
              b.time.toLowerCase().includes(tStr.toLowerCase()) ||
              b.time === militaryStr
            )
          );

          const isBooked = Boolean(matchedBooking);
          const isAvailable = !isBreak && !isBooked && !isBlocked;

          slots.push({
            id: `slot-${dateStr}-${idx}`,
            time: tStr,
            isoDateTime: `${dateStr}T${tStr}`,
            isAvailable,
            isBooked,
            isBreak,
            isBlocked,
            bookingId: matchedBooking?.id,
            customerName: matchedBooking?.customerName,
            serviceName: matchedBooking?.service?.name,
            location: matchedBooking?.address?.street
          });
          idx++;
        }
      }

      result.push({
        date: dateStr,
        dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        isWorkingDay,
        isBlocked,
        slots
      });
    }

    return result;
  }

  // Calculation helpers
  calculatePricing(
    servicePrice: number,
    addOnsPrice: number,
    travelDistanceMiles: number,
    barberBaseTravelFee: number,
    barberTravelFeePerMile: number,
    promoCode?: string,
    tipAmount: number = 0
  ): BookingPricing {
    const subtotal = servicePrice + addOnsPrice;
    const travelFee = Math.round((barberBaseTravelFee + travelDistanceMiles * barberTravelFeePerMile) * 100) / 100;
    
    // Canonical BarberPilot 5% platform marketplace fee calculated server-side
    const platformFee = Math.round(subtotal * BARBERPILOT_PLATFORM_FEE_RATE * 100) / 100;

    // Estimated local sales tax (8.5% on taxable services and travel surcharge)
    const estimatedTax = Math.round((subtotal + travelFee) * (this.settings.taxRatePercent / 100) * 100) / 100;

    // Promo code discount
    let discount = 0;
    if (promoCode && this.promoCodes.has(promoCode)) {
      const promo = this.promoCodes.get(promoCode)!;
      if (promo.isActive && subtotal >= promo.minSpend) {
        if (promo.discountType === 'percentage') {
          const calculated = (subtotal * promo.discountValue) / 100;
          discount = promo.maxDiscount ? Math.min(promo.maxDiscount, calculated) : calculated;
        } else {
          discount = promo.discountValue;
        }
        discount = Math.round(discount * 100) / 100;
      }
    }

    const finalTotal = Math.max(0, Math.round((subtotal + travelFee + platformFee + estimatedTax - discount + tipAmount) * 100) / 100);

    // Barber Earnings: 95% of service subtotal (after 5% BarberPilot fee) + 100% of travel fee + 100% of tips
    const barberServiceRevenue = Math.round(subtotal * (1 - BARBERPILOT_PLATFORM_FEE_RATE) * 100) / 100;
    const netPayout = Math.max(0, Math.round((barberServiceRevenue + travelFee + tipAmount) * 100) / 100);
    const stripeFeeEstimate = Math.round((finalTotal * 0.029 + 0.30) * 100) / 100;

    return {
      servicePrice,
      addOnsPrice,
      travelFee,
      platformFee,
      estimatedTax,
      discount,
      tip: tipAmount,
      total: finalTotal,
      finalTotal,
      barberEarnings: {
        serviceRevenue: servicePrice,
        addOnsRevenue: addOnsPrice,
        travelFeeRevenue: travelFee,
        tips: tipAmount,
        stripeFeeEstimate,
        netPayout
      }
    };
  }

  // Distance helper (Haversine formula in miles)
  calculateDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3958.8; // Earth's radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }
}

export const db = new DataStore();
