import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { db } from './server/store';
import {
  getHaircutConsultation,
  generateBarberBio,
  generateServiceDescription,
  getSupportAssistantReply
} from './server/gemini';
import { rankBarbersForCustomer, parseNaturalLanguageQuery } from './server/matching';
import { Booking, BookingStatus, UserRole } from './src/types';
import {
  ingestFile,
  applyReview,
  intelligenceStore,
  operationalEventBus,
  ingestionTelemetry,
  registerIntelligenceSubscribers,
  IngestionError,
  type TenantContext,
  type ReviewDecision,
} from './server/intelligence/index';

dotenv.config();

// The in-memory store is intentionally a local/demo backend.  Never treat the
// role switcher as authentication in a deployed environment.
let currentUserId = 'cust-1';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3002);

  // 35mb accommodates base64-encoded document uploads (~33% inflation) for the
  // Universal File Intelligence ingest endpoint.
  app.use(express.json({ limit: '35mb' }));
  app.use(express.urlencoded({ extended: true }));

  const isDemoMode = (process.env.APP_MODE || 'demo') !== 'production';
  const requestUser = (req: express.Request) => {
    // The header is useful for deterministic integration tests and local
    // development only. A real deployment must place a verified identity here
    // at the edge (or replace this store with Supabase Auth-backed lookups).
    const headerUserId = req.header('x-user-id');
    return db.users.get(isDemoMode && headerUserId ? headerUserId : currentUserId);
  };
  const requireUser = (req: express.Request, res: express.Response) => {
    const user = requestUser(req);
    if (!user || (!isDemoMode && !req.header('x-user-id'))) {
      res.status(401).json({ error: 'Authentication required' });
      return null;
    }
    return user;
  };
  const requireRoles = (req: express.Request, res: express.Response, roles: UserRole[]) => {
    const user = requireUser(req, res);
    if (!user) return null;
    if (!roles.includes(user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return null;
    }
    return user;
  };
  const canAccessBooking = (user: ReturnType<typeof requestUser>, booking: Booking) =>
    Boolean(user && (user.role === 'admin' || user.role === 'support' || booking.customerId === user.id || booking.barberId === user.id));


  // Canonical Domain & Legacy Domain Redirect Middleware (BarberGo -> BarberPilot)
  app.use((req, res, next) => {
    const host = req.headers.host || '';
    if (host.includes('barbergo.com') || host.includes('barber-go.com')) {
      const targetUrl = 'https://barberpilot.com' + req.originalUrl;
      return res.redirect(301, targetUrl);
    }
    next();
  });

  // Request logger
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // ----------------------------------------------------
  // HEALTH & CONFIG
  // ----------------------------------------------------
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.get('/api/config', (req, res) => {
    res.json(db.settings);
  });

  app.post('/api/config', (req, res) => {
    if (!requireRoles(req, res, ['admin'])) return;
    const updates = req.body;
    db.settings = { ...db.settings, ...updates };

    db.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      adminId: 'admin-1',
      adminName: 'Alexandra Chen',
      action: 'UPDATE_PLATFORM_SETTINGS',
      targetType: 'settings',
      targetId: 'global_settings',
      details: `Updated platform configuration: ${Object.keys(updates).join(', ')}`,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, settings: db.settings });
  });

  // ----------------------------------------------------
  // AUTH & USERS (Seamless 4-Role Testing Switcher)
  // ----------------------------------------------------
  app.get('/api/auth/me', (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    const customerProfile = db.customerProfiles.get(user.id);
    const barberProfile = db.barberProfiles.get(user.id);
    const services = db.services.get(user.id) || [];
    const availability = db.availabilities.get(user.id);
    const documents = db.documents.get(user.id) || [];

    res.json({
      user,
      customerProfile,
      barberProfile,
      services,
      availability,
      documents
    });
  });

  app.post('/api/auth/switch-role', (req, res) => {
    if (!isDemoMode) return res.status(404).json({ error: 'Not available in production' });
    if (!requireUser(req, res)) return;
    const { role, userId } = req.body;
    if (userId && db.users.has(userId)) {
      currentUserId = userId;
    } else {
      // Find default user for role
      const found = Array.from(db.users.values()).find((u) => u.role === role);
      if (found) {
        currentUserId = found.id;
      }
    }
    const user = db.users.get(currentUserId)!;
    res.json({ success: true, user });
  });

  app.post('/api/auth/update-profile', (req, res) => {
    const { fullName, phone, avatarUrl, preferences, emergencyContact, addresses } = req.body;
    const user = requireUser(req, res);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (fullName) user.fullName = fullName;
    if (phone) user.phone = phone;
    if (avatarUrl) user.avatarUrl = avatarUrl;
    user.updatedAt = new Date().toISOString();

    if (user.role === 'customer') {
      let cust = db.customerProfiles.get(user.id);
      if (!cust) {
        cust = { userId: user.id, savedAddresses: [], favorites: [] };
        db.customerProfiles.set(user.id, cust);
      }
      if (preferences) {
        cust.hairType = preferences.hairType ?? cust.hairType;
        cust.favoriteStyles = preferences.favoriteStyles ?? cust.favoriteStyles;
        cust.notes = preferences.notes ?? cust.notes;
        cust.accessibilityNotes = preferences.accessibilityNotes ?? cust.accessibilityNotes;
      }
      if (emergencyContact) cust.emergencyContact = emergencyContact;
      if (addresses) cust.savedAddresses = addresses;
    }

    res.json({ success: true, user, profile: db.customerProfiles.get(user.id) });
  });

  app.post('/api/auth/verify-contact', (req, res) => {
    const { type } = req.body; // 'email' | 'phone'
    const user = requireUser(req, res);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (type === 'email') user.emailVerified = true;
    if (type === 'phone') user.phoneVerified = true;
    user.isVerified = user.emailVerified && user.phoneVerified;

    res.json({ success: true, user });
  });

  // ----------------------------------------------------
  // BARBERS, SEARCH & SMART MATCHING
  // ----------------------------------------------------
  app.get('/api/barbers', (req, res) => {
    const {
      query,
      category,
      minRating,
      maxPrice,
      lat,
      lng,
      maxDistanceMiles,
      onlyVerified,
      hairType
    } = req.query;

    const userLat = lat ? parseFloat(lat as string) : 37.7903;
    const userLng = lng ? parseFloat(lng as string) : -122.3995;

    // Optional Natural Language Search Parsing
    let effectiveCategory = category as string;
    let effectiveMaxPrice = maxPrice ? parseFloat(maxPrice as string) : undefined;
    let effectiveMinRating = minRating ? parseFloat(minRating as string) : undefined;

    if (query && typeof query === 'string') {
      const parsed = parseNaturalLanguageQuery(query);
      if (parsed.category && (!category || category === 'All')) {
        effectiveCategory = parsed.category;
      }
      if (parsed.maxPrice && !maxPrice) {
        effectiveMaxPrice = parsed.maxPrice;
      }
      if (parsed.minRating && !minRating) {
        effectiveMinRating = parsed.minRating;
      }
    }

    const customerUser = db.users.get(currentUserId);
    const customerProfile = customerUser ? db.customerProfiles.get(customerUser.id) : null;

    const rawBarbers = Array.from(db.barberProfiles.values()).map((profile) => {
      const user = db.users.get(profile.userId)!;
      const services = db.services.get(profile.userId) || [];
      const distanceMiles = db.calculateDistanceMiles(
        userLat,
        userLng,
        profile.coordinates.lat,
        profile.coordinates.lng
      );
      const isWithinRadius = distanceMiles <= profile.travelRadiusMiles;

      return {
        user,
        profile,
        services,
        distanceMiles,
        isWithinRadius
      };
    });

    // Apply filtering
    let filtered = rawBarbers.filter((item) => {
      if (!item.user || item.user.isBanned || item.user.isSuspended) return false;
      if (onlyVerified === 'true' && !item.profile.idVerified) return false;
      if (effectiveMinRating && item.profile.rating < effectiveMinRating) return false;
      if (maxDistanceMiles && item.distanceMiles > parseFloat(maxDistanceMiles as string)) return false;

      if (query && typeof query === 'string') {
        const q = query.toLowerCase();
        const matchesName = item.user.fullName.toLowerCase().includes(q);
        const matchesBio = item.profile.bio.toLowerCase().includes(q);
        const matchesService = item.services.some((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
        const matchesCity = item.profile.serviceAreaCities.some((c) => c.toLowerCase().includes(q));
        const matchesSpecialty = (item.profile.specialties || []).some((sp) => sp.toLowerCase().includes(q));
        if (!matchesName && !matchesBio && !matchesService && !matchesCity && !matchesSpecialty && !effectiveCategory) return false;
      }

      if (effectiveCategory && effectiveCategory !== 'All') {
        const hasCategory = item.services.some((s) => s.category.toLowerCase() === effectiveCategory.toLowerCase() || s.name.toLowerCase().includes(effectiveCategory.toLowerCase()));
        if (!hasCategory) return false;
      }

      if (effectiveMaxPrice) {
        const lowestPrice = Math.min(...item.services.map((s) => s.price));
        if (lowestPrice > effectiveMaxPrice) return false;
      }

      return true;
    });

    // Rank candidates using background smart matching engine
    const ranked = rankBarbersForCustomer(
      filtered,
      customerProfile,
      effectiveCategory,
      { lat: userLat, lng: userLng }
    );

    res.json(ranked);
  });

  app.post('/api/barbers/smart-match', (req, res) => {
    const { category, timing, lat, lng, locationType } = req.body;
    const userLat = lat ? parseFloat(lat) : 37.7903;
    const userLng = lng ? parseFloat(lng) : -122.3995;

    const customerUser = db.users.get(currentUserId);
    const customerProfile = customerUser ? db.customerProfiles.get(customerUser.id) : null;

    const rawBarbers = Array.from(db.barberProfiles.values())
      .filter((p) => p.isAcceptingBookings && !p.isPaused)
      .map((profile) => {
        const user = db.users.get(profile.userId)!;
        const services = db.services.get(profile.userId) || [];
        const distanceMiles = db.calculateDistanceMiles(
          userLat,
          userLng,
          profile.coordinates.lat,
          profile.coordinates.lng
        );
        return {
          user,
          profile,
          services,
          distanceMiles,
          isWithinRadius: distanceMiles <= profile.travelRadiusMiles
        };
      });

    const ranked = rankBarbersForCustomer(
      rawBarbers,
      customerProfile,
      category,
      { lat: userLat, lng: userLng }
    );

    const bestMatch = ranked.length > 0 ? ranked[0] : null;
    const alternatives = ranked.slice(1, 4);

    res.json({
      success: true,
      bestMatch,
      alternatives,
      totalMatched: ranked.length
    });
  });

  app.get('/api/barbers/:id', (req, res) => {
    const barberId = req.params.id;
    const user = db.users.get(barberId);
    const profile = db.barberProfiles.get(barberId);
    const services = db.services.get(barberId) || [];
    const availability = db.availabilities.get(barberId);
    const documents = db.documents.get(barberId) || [];

    if (!user || !profile) {
      return res.status(404).json({ error: 'Barber not found' });
    }

    // Get reviews for this barber from completed bookings
    const reviews = Array.from(db.bookings.values())
      .filter((b) => b.barberId === barberId && b.review)
      .map((b) => ({
        ...b.review!,
        customerName: b.customerName,
        customerAvatar: b.customerAvatar,
        serviceName: b.service.name,
        date: b.date
      }));

    res.json({
      user,
      profile,
      services,
      availability,
      documents,
      reviews
    });
  });

  app.post('/api/barbers/:id/update-profile', (req, res) => {
    const barberId = req.params.id;
    const actor = requireUser(req, res);
    if (!actor) return;
    if (actor.role !== 'admin' && (actor.role !== 'barber' || actor.id !== barberId)) {
      return res.status(403).json({ error: 'You can only edit your own barber profile' });
    }
    const profile = db.barberProfiles.get(barberId);
    if (!profile) return res.status(404).json({ error: 'Barber not found' });

    Object.assign(profile, req.body);
    res.json({ success: true, profile });
  });

  app.post('/api/barbers/:id/update-services', (req, res) => {
    const barberId = req.params.id;
    const actor = requireUser(req, res);
    if (!actor) return;
    if (actor.role !== 'admin' && (actor.role !== 'barber' || actor.id !== barberId)) {
      return res.status(403).json({ error: 'You can only edit your own services' });
    }
    const { services } = req.body;
    if (!services || !Array.isArray(services)) {
      return res.status(400).json({ error: 'Invalid services array' });
    }

    db.services.set(barberId, services);
    res.json({ success: true, services });
  });

  app.post('/api/barbers/:id/update-availability', (req, res) => {
    const barberId = req.params.id;
    const actor = requireUser(req, res);
    if (!actor) return;
    if (actor.role !== 'admin' && (actor.role !== 'barber' || actor.id !== barberId)) {
      return res.status(403).json({ error: 'You can only edit your own availability' });
    }
    const { availability } = req.body;
    if (!availability) return res.status(400).json({ error: 'Invalid availability object' });

    db.availabilities.set(barberId, availability);
    res.json({ success: true, availability });
  });

  app.post('/api/barbers/:id/upload-document', (req, res) => {
    const barberId = req.params.id;
    const actor = requireUser(req, res);
    if (!actor) return;
    if (actor.role !== 'admin' && (actor.role !== 'barber' || actor.id !== barberId)) {
      return res.status(403).json({ error: 'You can only upload your own documents' });
    }
    const { type, name, fileUrl } = req.body;

    const doc = {
      id: `doc-${Date.now()}`,
      barberId,
      type,
      name,
      fileUrl: fileUrl || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
      status: 'pending' as const,
      submittedAt: new Date().toISOString()
    };

    const currentDocs = db.documents.get(barberId) || [];
    currentDocs.push(doc);
    db.documents.set(barberId, currentDocs);

    // Update barber profile license status if it was license
    const profile = db.barberProfiles.get(barberId);
    if (profile && type === 'barber_license') {
      profile.licenseStatus = 'pending_verification';
    }

    res.json({ success: true, doc });
  });

  app.get('/api/barbers/:id/availability-slots', (req, res) => {
    const barberId = req.params.id;
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const availability = db.availabilities.get(barberId);

    if (!availability) {
      return res.json({ available: false, slots: [] });
    }

    // Determine day of week
    const dayOfWeek = new Date(date)
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toLowerCase() as
      | 'monday'
      | 'tuesday'
      | 'wednesday'
      | 'thursday'
      | 'friday'
      | 'saturday'
      | 'sunday';

    const dayConfig = availability.weeklySchedule[dayOfWeek];
    if (!dayConfig || !dayConfig.enabled || availability.unavailableDates.includes(date)) {
      return res.json({ available: false, slots: [] });
    }

    // Generate slots (e.g. 09:00, 10:00, 11:00...)
    const slots: { time: string; available: boolean; reason?: string }[] = [];
    const bookedTimes = Array.from(db.bookings.values())
      .filter((b) => b.barberId === barberId && b.date === date && !['declined', 'customer_canceled', 'barber_canceled'].includes(b.status))
      .map((b) => b.time);

    for (let hour = 8; hour <= 19; hour++) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`;
      const isBooked = bookedTimes.includes(timeStr);
      const isBreak = availability.breaks.some((br) => br.start <= timeStr && br.end > timeStr);

      slots.push({
        time: timeStr,
        available: !isBooked && !isBreak,
        reason: isBooked ? 'Booked' : isBreak ? 'Break' : undefined
      });
    }

    res.json({ available: true, slots });
  });

  // ----------------------------------------------------
  // PRICING ENGINE
  // ----------------------------------------------------
  app.post('/api/pricing/calculate', (req, res) => {
    const {
      servicePrice = 0,
      addOnsPrice = 0,
      travelDistanceMiles = 5,
      barberBaseTravelFee = 15,
      barberTravelFeePerMile = 1.25,
      promoCode,
      tipAmount = 0
    } = req.body;

    const pricing = db.calculatePricing(
      servicePrice,
      addOnsPrice,
      travelDistanceMiles,
      barberBaseTravelFee,
      barberTravelFeePerMile,
      promoCode,
      tipAmount
    );

    res.json(pricing);
  });

  // ----------------------------------------------------
  // BOOKINGS & LIFECYCLE STATE MACHINE
  // ----------------------------------------------------
  app.get('/api/bookings', (req, res) => {
    const { userId, role, status } = req.query;
    let allBookings = Array.from(db.bookings.values());

    if (userId) {
      if (role === 'barber') {
        allBookings = allBookings.filter((b) => b.barberId === userId);
      } else if (role === 'customer') {
        allBookings = allBookings.filter((b) => b.customerId === userId);
      }
    }

    if (status) {
      allBookings = allBookings.filter((b) => b.status === status);
    }

    // Sort newest first
    allBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(allBookings);
  });

  app.get('/api/bookings/:id', (req, res) => {
    const booking = db.bookings.get(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  });

  app.post('/api/bookings/create', (req, res) => {
    const {
      barberId,
      serviceId,
      selectedAddOnIds = [],
      date,
      time,
      address,
      haircutNotes,
      referencePhotos = [],
      promoCode,
      tipAmount = 0
    } = req.body;

    const customer = db.users.get(currentUserId);
    const barber = db.users.get(barberId);
    const barberProfile = db.barberProfiles.get(barberId);
    const barberServices = db.services.get(barberId) || [];

    if (!customer || !barber || !barberProfile) {
      return res.status(400).json({ error: 'Invalid customer or barber' });
    }

    const service = barberServices.find((s) => s.id === serviceId);
    if (!service) return res.status(400).json({ error: 'Service not found' });

    const selectedAddOns = (service.addOns || []).filter((a) => selectedAddOnIds.includes(a.id));
    const addOnsTotal = selectedAddOns.reduce((acc, a) => acc + a.price, 0);

    // Calculate distance
    const distanceMiles = db.calculateDistanceMiles(
      address.lat || 37.7903,
      address.lng || -122.3995,
      barberProfile.coordinates.lat,
      barberProfile.coordinates.lng
    );

    // Double-booking check
    const existingConflicting = Array.from(db.bookings.values()).find(
      (b) =>
        b.barberId === barberId &&
        b.date === date &&
        b.time === time &&
        !['declined', 'customer_canceled', 'barber_canceled'].includes(b.status)
    );

    if (existingConflicting) {
      return res.status(409).json({ error: 'This time slot was just booked by another client. Please select another slot.' });
    }

    const pricing = db.calculatePricing(
      service.price,
      addOnsTotal,
      distanceMiles,
      barberProfile.baseTravelFee,
      barberProfile.travelFeePerMile,
      promoCode,
      tipAmount
    );

    const bookingId = `bk-${Date.now()}`;
    const now = new Date().toISOString();

    const newBooking: Booking = {
      id: bookingId,
      customerId: customer.id,
      customerName: customer.fullName,
      customerPhone: customer.phone,
      customerAvatar: customer.avatarUrl,
      barberId: barber.id,
      barberName: barber.fullName,
      barberPhone: barber.phone,
      barberAvatar: barber.avatarUrl,
      service,
      selectedAddOns,
      date,
      time,
      durationMinutes: service.durationMinutes + selectedAddOns.reduce((sum, a) => sum + a.durationMinutes, 0),
      status: 'requested',
      address,
      haircutNotes,
      referencePhotos,
      pricing,
      paymentStatus: 'authorized',
      paymentIntentId: `pi_test_${Date.now()}`,
      promoCodeApplied: promoCode,
      statusHistory: [
        {
          status: 'requested',
          timestamp: now,
          actorId: customer.id,
          actorRole: 'customer',
          note: 'Customer submitted appointment request & authorized card payment'
        }
      ],
      tracking: {
        isEnRoute: false
      },
      createdAt: now,
      updatedAt: now
    };

    db.bookings.set(bookingId, newBooking);

    // Notify barber
    const barberNotifs = db.notifications.get(barberId) || [];
    barberNotifs.unshift({
      id: `notif-${Date.now()}`,
      userId: barberId,
      title: 'New Booking Request!',
      body: `${customer.fullName} requested ${service.name} on ${date} at ${time}.`,
      type: 'booking',
      read: false,
      bookingId,
      createdAt: now
    });
    db.notifications.set(barberId, barberNotifs);

    res.json({ success: true, booking: newBooking });
  });

  // State transitions: accept, decline, reschedule, en_route, arrive, start, complete, cancel
  app.post('/api/bookings/:id/transition', (req, res) => {
    const { id } = req.params;
    const { nextStatus, note, reason, proposedDate, proposedTime } = req.body;
    const booking = db.bookings.get(id);
    const currentUser = db.users.get(currentUserId);

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const now = new Date().toISOString();

    if (nextStatus === 'reschedule_proposed') {
      booking.status = 'reschedule_proposed';
      booking.rescheduleProposal = {
        proposedDate,
        proposedTime,
        proposedBy: currentUser.role === 'barber' ? 'barber' : 'customer',
        reason: reason || 'Scheduling adjustment proposed',
        status: 'pending',
        createdAt: now
      };
    } else if (nextStatus === 'reschedule_accepted') {
      if (booking.rescheduleProposal) {
        booking.date = booking.rescheduleProposal.proposedDate;
        booking.time = booking.rescheduleProposal.proposedTime;
        booking.rescheduleProposal.status = 'accepted';
      }
      booking.status = 'confirmed';
    } else if (nextStatus === 'reschedule_declined') {
      if (booking.rescheduleProposal) {
        booking.rescheduleProposal.status = 'declined';
      }
      booking.status = 'requested';
    } else {
      booking.status = nextStatus as BookingStatus;
    }

    // Specific logic per state
    if (nextStatus === 'en_route') {
      booking.tracking.isEnRoute = true;
      const barberProfile = db.barberProfiles.get(booking.barberId);
      booking.tracking.barberLocation = barberProfile?.currentLocation || { lat: 37.7834, lng: -122.4082 };
      booking.tracking.estimatedArrival = 'In 12 minutes';
    } else if (nextStatus === 'arrived') {
      booking.tracking.isEnRoute = false;
      booking.tracking.checkedInAt = now;
    } else if (nextStatus === 'service_started') {
      booking.tracking.serviceStartedAt = now;
    } else if (nextStatus === 'completed') {
      booking.tracking.completedAt = now;
      booking.paymentStatus = 'captured';

      // Increment barber stats
      const barberProfile = db.barberProfiles.get(booking.barberId);
      if (barberProfile) {
        barberProfile.completedBookingsCount += 1;
        barberProfile.bookingVolumeThisMonth += 1;
      }
    } else if (nextStatus === 'customer_canceled' || nextStatus === 'barber_canceled') {
      booking.paymentStatus = 'refunded';
    }

    booking.statusHistory.unshift({
      status: booking.status,
      timestamp: now,
      actorId: currentUser.id,
      actorRole: currentUser.role,
      note: note || reason
    });
    booking.updatedAt = now;

    // Send push notification to the opposite party
    const targetUserId = currentUser.id === booking.customerId ? booking.barberId : booking.customerId;
    const notifs = db.notifications.get(targetUserId) || [];
    notifs.unshift({
      id: `notif-${Date.now()}`,
      userId: targetUserId,
      title: `Booking Update: ${booking.service.name}`,
      body: `Status changed to ${booking.status.replace('_', ' ').toUpperCase()}`,
      type: 'booking',
      read: false,
      bookingId: booking.id,
      createdAt: now
    });
    db.notifications.set(targetUserId, notifs);

    res.json({ success: true, booking });
  });

  app.post('/api/bookings/:id/add-tip', (req, res) => {
    const { id } = req.params;
    const { tipAmount } = req.body;
    const booking = db.bookings.get(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    booking.pricing.tip = tipAmount;
    booking.pricing.finalTotal = Math.round((booking.pricing.finalTotal + tipAmount) * 100) / 100;
    booking.pricing.barberEarnings.tips = tipAmount;
    booking.pricing.barberEarnings.netPayout = Math.round((booking.pricing.barberEarnings.netPayout + tipAmount) * 100) / 100;

    // Notify barber
    const barberNotifs = db.notifications.get(booking.barberId) || [];
    barberNotifs.unshift({
      id: `notif-${Date.now()}`,
      userId: booking.barberId,
      title: 'Generous Tip Received!',
      body: `${booking.customerName} added a $${tipAmount.toFixed(2)} tip for your service.`,
      type: 'payment',
      read: false,
      bookingId: booking.id,
      createdAt: new Date().toISOString()
    });
    db.notifications.set(booking.barberId, barberNotifs);

    res.json({ success: true, booking });
  });

  app.post('/api/bookings/:id/review', (req, res) => {
    const { id } = req.params;
    const { rating, comment, photos } = req.body;
    const booking = db.bookings.get(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const review = {
      id: `rev-${Date.now()}`,
      rating,
      comment,
      photos: photos || [],
      createdAt: new Date().toISOString()
    };
    booking.review = review;

    // Update barber average rating & review count
    const barberProfile = db.barberProfiles.get(booking.barberId);
    if (barberProfile) {
      const allBarberReviews = Array.from(db.bookings.values())
        .filter((b) => b.barberId === booking.barberId && b.review)
        .map((b) => b.review!.rating);

      const total = allBarberReviews.reduce((sum, r) => sum + r, 0);
      barberProfile.rating = Math.round((total / allBarberReviews.length) * 100) / 100;
      barberProfile.reviewCount = allBarberReviews.length;
    }

    res.json({ success: true, booking });
  });

  app.post('/api/bookings/:id/dispute', (req, res) => {
    const { id } = req.params;
    const { reason, description, evidenceUrls } = req.body;
    const booking = db.bookings.get(id);
    const currentUser = db.users.get(currentUserId);
    if (!booking || !currentUser) return res.status(404).json({ error: 'Booking not found' });

    booking.status = 'disputed';
    booking.dispute = {
      id: `disp-${Date.now()}`,
      raisedBy: currentUser.role === 'barber' ? 'barber' : 'customer',
      reason,
      description,
      evidenceUrls: evidenceUrls || [],
      status: 'open',
      createdAt: new Date().toISOString()
    };

    db.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      adminId: 'system',
      adminName: 'Platform Security Guard',
      action: 'DISPUTE_FILED',
      targetType: 'dispute',
      targetId: booking.id,
      details: `Dispute filed by ${currentUser.fullName}: ${reason}`,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, booking });
  });

  app.post('/api/bookings/:id/update-location', (req, res) => {
    const { id } = req.params;
    const { lat, lng } = req.body;
    const booking = db.bookings.get(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    booking.tracking.barberLocation = { lat, lng };
    const barberProfile = db.barberProfiles.get(booking.barberId);
    if (barberProfile) {
      barberProfile.currentLocation = { lat, lng, updatedAt: new Date().toISOString() };
    }

    res.json({ success: true, location: { lat, lng } });
  });

  // ----------------------------------------------------
  // IN-APP MESSAGING
  // ----------------------------------------------------
  app.get('/api/messages/:bookingId', (req, res) => {
    const messages = db.messages.get(req.params.bookingId) || [];
    res.json(messages);
  });

  app.post('/api/messages', (req, res) => {
    const { bookingId, text, imageUrl } = req.body;
    const booking = db.bookings.get(bookingId);
    const currentUser = db.users.get(currentUserId);

    if (!booking || !currentUser) return res.status(400).json({ error: 'Invalid booking or user' });

    const recipientId = currentUser.id === booking.customerId ? booking.barberId : booking.customerId;
    const message = {
      id: `msg-${Date.now()}`,
      bookingId,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      senderRole: currentUser.role,
      recipientId,
      text,
      imageUrl,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    const thread = db.messages.get(bookingId) || [];
    thread.push(message);
    db.messages.set(bookingId, thread);

    res.json({ success: true, message });
  });

  app.get('/api/messages/conversations', (req, res) => {
    const currentUser = db.users.get(currentUserId);
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const conversations: any[] = [];
    const processedBookingIds = new Set<string>();

    // Scan all bookings the user participates in
    const userBookings = Array.from(db.bookings.values()).filter(
      (b) => b.customerId === currentUser.id || b.barberId === currentUser.id
    );

    userBookings.forEach((b) => {
      processedBookingIds.add(b.id);
      const thread = db.messages.get(b.id) || [];
      const isCustomer = currentUser.id === b.customerId;
      const otherParticipantId = isCustomer ? b.barberId : b.customerId;
      const otherUser = db.users.get(otherParticipantId);
      const otherProfile = isCustomer ? db.barberProfiles.get(otherParticipantId) : null;

      const lastMsg = thread.length > 0 ? thread[thread.length - 1] : null;
      const unreadCount = thread.filter((m) => m.recipientId === currentUser.id && !m.isRead).length;

      conversations.push({
        bookingId: b.id,
        bookingDate: b.date,
        bookingTime: b.time,
        bookingStatus: b.status,
        serviceName: b.service.name,
        otherUser: {
          id: otherParticipantId,
          name: isCustomer ? b.barberName : b.customerName,
          avatar: isCustomer ? b.barberAvatar : b.customerAvatar,
          phone: isCustomer ? b.barberPhone : b.customerPhone,
          role: isCustomer ? 'barber' : 'customer',
          rating: otherProfile?.rating
        },
        lastMessage: lastMsg ? {
          text: lastMsg.text,
          createdAt: lastMsg.createdAt,
          senderName: lastMsg.senderName,
          senderId: lastMsg.senderId
        } : {
          text: `Booking confirmed for ${b.service.name}`,
          createdAt: b.createdAt,
          senderName: 'System',
          senderId: 'system'
        },
        unreadCount,
        updatedAt: lastMsg ? lastMsg.createdAt : b.updatedAt
      });
    });

    // Sort by latest message/activity
    conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    res.json(conversations);
  });

  // ----------------------------------------------------
  // NOTIFICATIONS
  // ----------------------------------------------------
  app.get('/api/notifications', (req, res) => {
    const notifs = db.notifications.get(currentUserId) || [];
    res.json(notifs);
  });

  app.post('/api/notifications/:id/read', (req, res) => {
    const notifs = db.notifications.get(currentUserId) || [];
    const item = notifs.find((n) => n.id === req.params.id);
    if (item) item.read = true;
    res.json({ success: true });
  });

  // ----------------------------------------------------
  // PROMO CODES
  // ----------------------------------------------------
  app.get('/api/promo-codes/validate/:code', (req, res) => {
    const promo = db.promoCodes.get(req.params.code.toUpperCase());
    if (!promo || !promo.isActive) {
      return res.status(404).json({ error: 'Invalid or expired promo code' });
    }
    if (promo.currentUses >= promo.maxUses) {
      return res.status(400).json({ error: 'This promo code has reached maximum redemptions.' });
    }
    res.json(promo);
  });

  app.post('/api/promo-codes', (req, res) => {
    const { code, discountType, discountValue, minSpend, maxDiscount, maxUses, expiresAt } = req.body;
    const promo = {
      id: `promo-${Date.now()}`,
      code: code.toUpperCase(),
      discountType,
      discountValue: parseFloat(discountValue),
      minSpend: parseFloat(minSpend || 0),
      maxDiscount: maxDiscount ? parseFloat(maxDiscount) : undefined,
      currentUses: 0,
      maxUses: parseInt(maxUses || 100),
      expiresAt: expiresAt || '2026-12-31T23:59:59Z',
      isActive: true
    };
    db.promoCodes.set(promo.code, promo);
    res.json({ success: true, promo });
  });

  // ----------------------------------------------------
  // SAFETY & INCIDENT REPORTS
  // ----------------------------------------------------
  app.post('/api/safety/report', (req, res) => {
    const { reportedUserId, bookingId, incidentType, description, severity } = req.body;
    const reporter = db.users.get(currentUserId);
    const reportedUser = db.users.get(reportedUserId);

    if (!reporter) return res.status(401).json({ error: 'Unauthorized' });

    const report = {
      id: `safe-${Date.now()}`,
      reporterId: reporter.id,
      reporterName: reporter.fullName,
      reporterRole: reporter.role,
      reportedUserId: reportedUserId || 'unknown',
      reportedUserName: reportedUser?.fullName || 'User',
      bookingId,
      incidentType,
      description,
      severity: severity || 'medium',
      status: 'pending' as const,
      createdAt: new Date().toISOString()
    };

    db.safetyReports.set(report.id, report);

    db.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      adminId: 'system',
      adminName: 'Safety Watchdog',
      action: 'SAFETY_INCIDENT_REPORTED',
      targetType: 'user',
      targetId: reportedUserId || 'none',
      details: `[${severity?.toUpperCase()}] ${incidentType}: ${description.slice(0, 100)}`,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, report });
  });

  // ----------------------------------------------------
  // ADMIN DASHBOARD METRICS & CONTROLS
  // ----------------------------------------------------
  app.get('/api/admin/metrics', (req, res) => {
    const allBookings = Array.from(db.bookings.values());
    const completedBookings = allBookings.filter((b) => b.status === 'completed');
    const grossBookingValue = allBookings.reduce((sum, b) => sum + b.pricing.finalTotal, 0);
    const platformFeesEarned = completedBookings.reduce((sum, b) => sum + b.pricing.platformFee, 0);
    const barberSubscriptionsRevenue = Array.from(db.barberProfiles.values()).reduce((sum, p) => {
      const plan = db.settings.subscriptionPlans.find((s) => s.id === p.subscriptionTier);
      return sum + (plan ? plan.pricePerMonth : 0);
    }, 0);

    const activeBarbers = Array.from(db.barberProfiles.values()).filter((p) => p.isAcceptingBookings).length;
    const activeCustomers = Array.from(db.customerProfiles.values()).length;
    const openDisputes = allBookings.filter((b) => b.status === 'disputed' || b.dispute?.status === 'open').length;

    res.json({
      grossBookingValue: Math.round(grossBookingValue * 100) / 100,
      platformFeesEarned: Math.round(platformFeesEarned * 100) / 100,
      barberSubscriptionsRevenue: Math.round(barberSubscriptionsRevenue * 100) / 100,
      totalRevenue: Math.round((platformFeesEarned + barberSubscriptionsRevenue) * 100) / 100,
      completedBookingsCount: completedBookings.length,
      totalBookingsCount: allBookings.length,
      activeBarbers,
      activeCustomers,
      openDisputes
    });
  });

  app.get('/api/admin/barber-verification-queue', (req, res) => {
    const queue = Array.from(db.barberProfiles.values()).map((p) => {
      const user = db.users.get(p.userId)!;
      const docs = db.documents.get(p.userId) || [];
      return {
        user,
        profile: p,
        documents: docs
      };
    });
    res.json(queue);
  });

  app.post('/api/admin/verify-barber', (req, res) => {
    const { barberId, status, idVerified, backgroundCheckStatus } = req.body;
    const profile = db.barberProfiles.get(barberId);
    const user = db.users.get(barberId);
    if (!profile || !user) return res.status(404).json({ error: 'Barber not found' });

    if (status) profile.licenseStatus = status;
    if (idVerified !== undefined) profile.idVerified = idVerified;
    if (backgroundCheckStatus) profile.backgroundCheckStatus = backgroundCheckStatus;

    db.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      adminId: currentUserId,
      adminName: 'Alexandra Chen',
      action: 'UPDATE_BARBER_VERIFICATION',
      targetType: 'barber',
      targetId: barberId,
      details: `Updated verification status for ${user.fullName}: License=${profile.licenseStatus}, ID=${profile.idVerified}, BackgroundCheck=${profile.backgroundCheckStatus}`,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, profile });
  });

  app.get('/api/admin/disputes', (req, res) => {
    const disputes = Array.from(db.bookings.values())
      .filter((b) => b.dispute)
      .map((b) => ({
        booking: b,
        dispute: b.dispute!
      }));
    res.json(disputes);
  });

  app.post('/api/admin/resolve-dispute', (req, res) => {
    const { bookingId, resolution, refundAmount, notes } = req.body;
    const booking = db.bookings.get(bookingId);
    if (!booking || !booking.dispute) return res.status(404).json({ error: 'Dispute not found' });

    booking.dispute.status = resolution === 'refund' ? 'resolved' : 'rejected';
    booking.dispute.resolutionNotes = notes;
    booking.dispute.refundAmount = refundAmount || 0;
    booking.dispute.resolvedAt = new Date().toISOString();

    if (resolution === 'refund') {
      booking.status = 'refunded';
      booking.paymentStatus = 'refunded';
    }

    db.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      adminId: currentUserId,
      adminName: 'Alexandra Chen',
      action: 'RESOLVE_DISPUTE',
      targetType: 'dispute',
      targetId: bookingId,
      details: `Resolved dispute for booking ${bookingId}: ${resolution} ($${refundAmount || 0} refund)`,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, booking });
  });

  app.get('/api/admin/audit-logs', (req, res) => {
    res.json(db.auditLogs);
  });

  app.get('/api/admin/export-csv', (req, res) => {
    const type = req.query.type || 'bookings';
    if (type === 'bookings') {
      let csv = 'ID,Date,Time,Customer,Barber,Service,Total,Status,PlatformFee,BarberNetPayout\n';
      Array.from(db.bookings.values()).forEach((b) => {
        csv += `"${b.id}","${b.date}","${b.time}","${b.customerName}","${b.barberName}","${b.service.name}",${b.pricing.finalTotal},"${b.status}",${b.pricing.platformFee},${b.pricing.barberEarnings.netPayout}\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=barberpilot-bookings.csv');
      return res.send(csv);
    }
    res.status(400).send('Invalid export type');
  });

  // ----------------------------------------------------
  // GEMINI AI INTEGRATIONS (Server-side API routes)
  // ----------------------------------------------------
  app.post('/api/ai/haircut-consultation', async (req, res) => {
    try {
      const consultation = await getHaircutConsultation(req.body);
      res.json({ result: consultation });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Consultation failed' });
    }
  });

  app.post('/api/ai/barber-bio', async (req, res) => {
    try {
      const bio = await generateBarberBio(req.body);
      res.json({ result: bio });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Bio generation failed' });
    }
  });

  app.post('/api/ai/service-description', async (req, res) => {
    try {
      const desc = await generateServiceDescription(req.body);
      res.json({ result: desc });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Service description generation failed' });
    }
  });

  app.post('/api/ai/support-assistant', async (req, res) => {
    try {
      const reply = await getSupportAssistantReply(req.body);
      res.json({ result: reply });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Support AI failed' });
    }
  });

  // ----------------------------------------------------
  // STRIPE PAYMENTS & CONNECT SIMULATOR / WEBHOOK
  // ----------------------------------------------------
  app.post('/api/stripe/create-payment-intent', (req, res) => {
    const { amount, currency = 'usd', customerId, barberId } = req.body;
    res.json({
      clientSecret: `pi_test_${Date.now()}_secret_${Math.random().toString(36).substring(7)}`,
      status: 'requires_payment_method',
      amount,
      currency,
      testMode: true,
      message: 'Stripe test payment intent ready'
    });
  });

  app.post('/api/stripe/connect-onboard', (req, res) => {
    const { barberId } = req.body;
    const profile = db.barberProfiles.get(barberId);
    if (!profile) return res.status(404).json({ error: 'Barber profile not found' });

    profile.stripeAccountId = `acct_stripe_${barberId}_${Date.now()}`;
    profile.stripeAccountStatus = 'active';

    res.json({
      success: true,
      accountLink: `https://connect.stripe.com/setup/s/${profile.stripeAccountId}`,
      profile
    });
  });

  app.post('/api/stripe/update-subscription', (req, res) => {
    const { barberId, planId } = req.body;
    const profile = db.barberProfiles.get(barberId);
    if (!profile) return res.status(404).json({ error: 'Barber not found' });

    profile.subscriptionTier = planId;
    profile.subscriptionStatus = 'active';
    profile.subscriptionRenewalDate = new Date(Date.now() + 30 * 86400000).toISOString();

    res.json({ success: true, profile });
  });

  // ----------------------------------------------------
  // WORKQORA UNIVERSAL FILE INTELLIGENCE
  // ----------------------------------------------------
  registerIntelligenceSubscribers();

  // Tenant identity is derived from the authenticated server session — never
  // from the request body. This demo derives a stable org id from the platform
  // name and a single primary location.
  const orgSlug = (db.settings.appName || 'workqora')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const deriveTenant = (req: express.Request): TenantContext => {
    const user = requestUser(req);
    return {
      organizationId: `org_${orgSlug}`,
      locationId: 'loc_primary',
      actorUserId: user?.id,
      actorKind: 'user',
    };
  };

  const HTTP_STATUS_FOR_CODE: Record<string, number> = {
    UNSUPPORTED_FILE: 415,
    FILE_TOO_LARGE: 413,
    MALFORMED_DOCUMENT: 400,
    OCR_FAILED: 422,
    LOW_CONFIDENCE: 422,
    PARSER_FAILED: 422,
    ENTITY_RESOLUTION_REQUIRED: 409,
    TENANT_ACCESS_DENIED: 403,
    DUPLICATE_DOCUMENT: 409,
    MUTATION_REQUIRES_CONFIRMATION: 409,
    PROVIDER_UNAVAILABLE: 503,
    NOT_IMPLEMENTED: 501,
  };
  const sendIngestionError = (res: express.Response, err: unknown) => {
    if (err instanceof IngestionError) {
      const status = HTTP_STATUS_FOR_CODE[err.code] ?? 400;
      return res.status(status).json({
        error: err.message,
        code: err.code,
        retryable: err.retryable,
        details: err.details,
      });
    }
    console.error('[intelligence] unexpected error:', err);
    return res.status(500).json({ error: 'Internal ingestion error', code: 'PARSER_FAILED' });
  };

  // Serialize a stored document detail for API responses (trims raw text).
  const serializeDetail = (detail: ReturnType<typeof intelligenceStore.getDocument>) => {
    if (!detail) return null;
    return {
      document: detail.document,
      classification: detail.classification,
      extraction: detail.extraction
        ? {
            method: detail.extraction.method,
            confidence: detail.extraction.confidence,
            rowCount: detail.extraction.rowCount,
            textPreview: detail.extraction.rawText.slice(0, 800),
          }
        : undefined,
      rosterRows: detail.rosterRows,
      reviewStatus: detail.reviewStatus,
      reviewedBy: detail.reviewedBy,
      reviewedAt: detail.reviewedAt,
      links: detail.links,
      processingRuns: detail.processingRuns,
    };
  };

  // Drop-to-ingest: accepts a base64-encoded file, runs the universal pipeline.
  app.post('/api/intelligence/ingest', async (req, res) => {
    const user = requireRoles(req, res, ['admin', 'support']);
    if (!user) return;
    try {
      const { filename, mimeType, dataBase64, source, purpose } = req.body || {};
      if (!filename || !dataBase64) {
        return res.status(400).json({ error: 'filename and dataBase64 are required', code: 'MALFORMED_DOCUMENT' });
      }
      const base64 = String(dataBase64).includes(',')
        ? String(dataBase64).split(',').pop()!
        : String(dataBase64);
      const bytes = new Uint8Array(Buffer.from(base64, 'base64'));

      const outcome = await ingestFile({
        tenant: deriveTenant(req),
        source: source || 'file_upload',
        originalFilename: filename,
        declaredMimeType: mimeType,
        bytes,
        ingestionPurpose: purpose || 'employee_import',
      });

      db.auditLogs.unshift({
        id: `audit-${Date.now()}`,
        adminId: user.id,
        adminName: user.fullName,
        action: outcome.deduplicated ? 'INTELLIGENCE_INGEST_DUPLICATE' : 'INTELLIGENCE_INGEST',
        targetType: 'document',
        targetId: outcome.document.documentId,
        details: `Ingested "${outcome.document.originalFilename}" as ${outcome.classification?.category} (${outcome.rosterRows.length} rows)`,
        timestamp: new Date().toISOString(),
      });

      res.json({
        ...outcome,
        detail: serializeDetail(intelligenceStore.getDocument(outcome.document.documentId)),
      });
    } catch (err) {
      sendIngestionError(res, err);
    }
  });

  app.get('/api/intelligence/documents', (req, res) => {
    const user = requireRoles(req, res, ['admin', 'support']);
    if (!user) return;
    const tenant = deriveTenant(req);
    const docs = intelligenceStore.listDocuments(tenant).map((d) => ({
      document: d.document,
      classification: d.classification,
      reviewStatus: d.reviewStatus,
      rowCount: d.rosterRows.length,
    }));
    res.json(docs);
  });

  app.get('/api/intelligence/documents/:id', (req, res) => {
    const user = requireRoles(req, res, ['admin', 'support']);
    if (!user) return;
    const tenant = deriveTenant(req);
    const detail = intelligenceStore.getDocument(req.params.id);
    if (!detail || detail.document.organizationId !== tenant.organizationId) {
      return res.status(404).json({ error: 'Document not found', code: 'TENANT_ACCESS_DENIED' });
    }
    res.json(serializeDetail(detail));
  });

  app.post('/api/intelligence/documents/:id/review', (req, res) => {
    const user = requireRoles(req, res, ['admin']);
    if (!user) return;
    try {
      const { decision, selectedRowIndexes } = req.body || {};
      const result = applyReview({
        tenant: deriveTenant(req),
        documentId: req.params.id,
        decision: (decision as ReviewDecision) || 'approve_all_safe',
        selectedRowIndexes,
      });
      db.auditLogs.unshift({
        id: `audit-${Date.now()}`,
        adminId: user.id,
        adminName: user.fullName,
        action: 'INTELLIGENCE_REVIEW',
        targetType: 'document',
        targetId: req.params.id,
        details: `Review ${decision}: created ${result.created}, updated ${result.updated}`,
        timestamp: new Date().toISOString(),
      });
      res.json({ ...result, detail: serializeDetail(intelligenceStore.getDocument(req.params.id)) });
    } catch (err) {
      sendIngestionError(res, err);
    }
  });

  app.get('/api/intelligence/employees', (req, res) => {
    const user = requireRoles(req, res, ['admin', 'support']);
    if (!user) return;
    res.json(intelligenceStore.listEmployees(deriveTenant(req)));
  });

  app.get('/api/intelligence/events', (req, res) => {
    const user = requireRoles(req, res, ['admin', 'support']);
    if (!user) return;
    const tenant = deriveTenant(req);
    res.json(
      operationalEventBus.recent({
        organizationId: tenant.organizationId,
        limit: Number(req.query.limit) || 100,
      }),
    );
  });

  app.get('/api/intelligence/observability', (req, res) => {
    const user = requireRoles(req, res, ['admin', 'support']);
    if (!user) return;
    res.json(ingestionTelemetry.snapshot());
  });

  // ----------------------------------------------------
  // VITE & FRONTEND MOUNTING
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BarberPilot Server running at http://localhost:${PORT}`);
  });
}

startServer();
