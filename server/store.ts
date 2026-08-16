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
  StatusHistoryItem
} from '../src/types';

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
  safetyReports: Map<string, SafetyReport> = new Map();
  auditLogs: AuditLog[] = [];
  settings: PlatformSettings;

  constructor() {
    this.settings = {
      appName: 'BarberGo',
      logoText: 'BarberGo',
      tagline: 'Master Barbers Delivered to Your Door',
      primaryColor: '#0F172A',
      accentColor: '#D97706', // Premium warm gold
      platformFeePercent: 6.0,
      minPlatformFee: 1.99,
      maxPlatformFee: 12.99,
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
          id: 'starter',
          name: 'Starter',
          pricePerMonth: 19.99,
          bookingLimit: 20,
          description: 'Low monthly price with basic marketplace access.',
          features: [
            'Up to 20 completed bookings/mo',
            'Standard search visibility',
            'Stripe Direct Payouts',
            'Client in-app messaging'
          ]
        },
        {
          id: 'pro',
          name: 'Pro',
          pricePerMonth: 49.99,
          bookingLimit: 75,
          description: 'More booking visibility, advanced analytics, and lower platform fee.',
          features: [
            'Up to 75 completed bookings/mo',
            'Priority map placement',
            'Advanced calendar sync',
            'AI Profile & Service Writer',
            'Instant Payout capability',
            'Lower platform transaction fee'
          ]
        },
        {
          id: 'elite',
          name: 'Elite',
          pricePerMonth: 89.99,
          bookingLimit: null, // Unlimited
          description: 'Highest visibility, advanced AI business tools, priority support, and lowest fee.',
          features: [
            'Unlimited monthly bookings',
            'Highest search ranking & Elite badge',
            'Advanced AI business tools',
            'Priority 24/7 dedicated support',
            'Lowest platform transaction fee',
            'Comprehensive tax & revenue export'
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
      email: 'devon.carter@barbergo.pro',
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
      email: 'sofia.reyes@barbergo.pro',
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
      email: 'jamal.washington@barbergo.pro',
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
      email: 'alexandra.chen@barbergo.app',
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
      email: 'jordan.rivera@barbergo.app',
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
    
    // Platform fee calculation based on configurable admin rules
    const rawFee = subtotal * (this.settings.platformFeePercent / 100);
    const platformFee = Math.min(
      this.settings.maxPlatformFee,
      Math.max(this.settings.minPlatformFee, Math.round(rawFee * 100) / 100)
    );

    // Estimated tax
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

    // Barber Earnings: 100% of service + 100% of addons + 100% of travel fee + 100% of tips
    const barberGross = subtotal + travelFee + tipAmount;
    const stripeFeeEstimate = Math.round((finalTotal * 0.029 + 0.30) * 100) / 100;
    const netPayout = Math.max(0, Math.round((barberGross - (barberGross > 100 ? 2.50 : 1.50)) * 100) / 100);

    return {
      servicePrice,
      addOnsPrice,
      travelFee,
      platformFee,
      estimatedTax,
      discount,
      tip: tipAmount,
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
