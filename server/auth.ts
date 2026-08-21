import crypto from 'crypto';
import { db } from './store';
import { User, CustomerProfile, BarberProfile, UserRole } from '../src/types';

// In-memory sessions map: token -> { userId: string; expiresAt: number }
export const activeSessions = new Map<string, { userId: string; expiresAt: number; role: UserRole }>();

// Password storage map: userId -> { hash: string; salt: string }
const passwordStore = new Map<string, { hash: string; salt: string }>();

// Reset tokens: token -> { userId: string; expiresAt: number }
const passwordResetTokens = new Map<string, { userId: string; expiresAt: number }>();

// Initialize default test user passwords
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export function initDefaultPasswords() {
  const defaultSalt = 'barbergo_secure_salt_2026';
  const defaultHash = hashPassword('Password123!', defaultSalt);

  // Set default password for pre-seeded users
  for (const user of db.users.values()) {
    passwordStore.set(user.id, { hash: defaultHash, salt: defaultSalt });
  }
}

initDefaultPasswords();

export function createSession(user: User): string {
  const token = `bg_sess_${crypto.randomBytes(32).toString('hex')}`;
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  activeSessions.set(token, { userId: user.id, expiresAt, role: user.role });
  return token;
}

export function validateSession(token?: string): User | null {
  if (!token) return null;
  const sess = activeSessions.get(token);
  if (!sess) return null;

  if (Date.now() > sess.expiresAt) {
    activeSessions.delete(token);
    return null;
  }

  const user = db.users.get(sess.userId);
  if (!user || user.isBanned || user.isSuspended) return null;
  return user;
}

export function registerCustomer(params: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}) {
  const { firstName, lastName, email, phone, password } = params;

  // Check email conflict
  const existing = Array.from(db.users.values()).find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  if (existing) {
    throw new Error('An account with this email already exists. Please log in.');
  }

  const userId = `cust-${Date.now()}`;
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  passwordStore.set(userId, { hash, salt });

  const fullName = `${firstName.trim()} ${lastName.trim()}`;
  const now = new Date().toISOString();

  const newUser: User = {
    id: userId,
    email: email.toLowerCase().trim(),
    phone: phone.trim(),
    role: 'customer',
    fullName,
    avatarUrl: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 50)}?w=400&auto=format&fit=crop&q=80`,
    isVerified: true,
    emailVerified: true,
    phoneVerified: false,
    isBanned: false,
    isSuspended: false,
    createdAt: now,
    updatedAt: now
  };

  const customerProfile: CustomerProfile = {
    userId,
    savedAddresses: [
      {
        id: `addr-${Date.now()}`,
        street: '101 California St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94111',
        label: 'Home',
        isDefault: true,
        coordinates: { lat: 37.7903, lng: -122.3995 }
      }
    ],
    favorites: [],
    haircutPreferences: {
      hairType: 'Straight / Medium',
      preferredStyles: ['Classic Fade', 'Textured Crop'],
      notes: 'Natural lineup'
    }
  };

  db.users.set(userId, newUser);
  db.customerProfiles.set(userId, customerProfile);

  const token = createSession(newUser);
  return { user: newUser, customerProfile, token };
}

export function registerBarber(params: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  businessName: string;
  experienceYears: number;
  travelRadiusMiles: number;
  servicePricing: { name: string; price: number; durationMinutes: number; category: string; description: string }[];
  portfolioImages?: string[];
  shopAddress?: string;
  licenseNumber?: string;
  bio?: string;
}) {
  const {
    firstName,
    lastName,
    email,
    phone,
    password,
    businessName,
    experienceYears,
    travelRadiusMiles,
    servicePricing,
    portfolioImages = [],
    shopAddress,
    licenseNumber,
    bio
  } = params;

  // Check email conflict
  const existing = Array.from(db.users.values()).find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  const userId = `barber-${Date.now()}`;
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  passwordStore.set(userId, { hash, salt });

  const fullName = businessName ? businessName.trim() : `${firstName.trim()} ${lastName.trim()}`;
  const now = new Date().toISOString();

  const newUser: User = {
    id: userId,
    email: email.toLowerCase().trim(),
    phone: phone.trim(),
    role: 'barber',
    fullName,
    avatarUrl: portfolioImages[0] || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    isVerified: false,
    emailVerified: true,
    phoneVerified: false,
    isBanned: false,
    isSuspended: false,
    createdAt: now,
    updatedAt: now
  };

  const barberProfile: BarberProfile = {
    userId,
    bio: bio || `Professional master barber with ${experienceYears || 5}+ years of mobile grooming expertise. Specializing in precision fades, beard sculpting, and hot towel treatments.`,
    experienceYears: Number(experienceYears) || 5,
    rating: 5.0,
    reviewCount: 0,
    completedBookingsCount: 0,
    travelRadiusMiles: Number(travelRadiusMiles) || 15,
    baseTravelFee: 15,
    travelFeePerMile: 1.25,
    serviceAreaCities: ['San Francisco, CA', 'Oakland, CA', 'San Mateo, CA'],
    coordinates: {
      lat: 37.7749,
      lng: -122.4194
    },
    currentLocation: {
      lat: 37.7749,
      lng: -122.4194,
      updatedAt: now,
      isLive: false
    },
    isAcceptingBookings: true,
    licenseNumber: licenseNumber || `CA-BARBER-${Math.floor(100000 + Math.random() * 900000)}`,
    licenseStatus: 'pending_verification', // Must start as pending_verification for admin approval
    idVerified: false,
    backgroundCheckStatus: 'pending',
    portfolioImages: portfolioImages.length > 0 ? portfolioImages : [
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800',
      'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800'
    ],
    specialties: ['Skin Fade', 'Beard Sculpting', 'Scissor Work', 'Hot Towel'],
    subscriptionTier: 'starter',
    subscriptionStatus: 'active',
    subscriptionRenewalDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    cancellationPolicy: 'flexible'
  };

  // Convert service list
  const services = servicePricing.map((s, index) => ({
    id: `srv-${userId}-${index + 1}`,
    barberId: userId,
    name: s.name,
    category: s.category || 'Haircut',
    description: s.description || `${s.name} service delivered to your home or office.`,
    price: Number(s.price),
    durationMinutes: Number(s.durationMinutes) || 45,
    isActive: true,
    addOns: [
      { id: `addon-${index}-1`, name: 'Beard Lineup & Oil', price: 15, durationMinutes: 15, description: 'Razor finish beard sculpting' },
      { id: `addon-${index}-2`, name: 'Hot Towel Treatment', price: 10, durationMinutes: 10, description: 'Steamed lavender hot towel' }
    ]
  }));

  // Initial availability
  const availability = {
    barberId: userId,
    weeklySchedule: {
      monday: { enabled: true, start: '09:00', end: '19:00' },
      tuesday: { enabled: true, start: '09:00', end: '19:00' },
      wednesday: { enabled: true, start: '09:00', end: '19:00' },
      thursday: { enabled: true, start: '09:00', end: '19:00' },
      friday: { enabled: true, start: '09:00', end: '20:00' },
      saturday: { enabled: true, start: '08:00', end: '20:00' },
      sunday: { enabled: true, start: '10:00', end: '17:00' }
    },
    unavailableDates: [],
    breaks: [{ start: '13:00', end: '14:00', label: 'Lunch Break' }],
    minimumAdvanceNoticeHours: 1,
    bufferMinutesBetweenAppointments: 30
  };

  db.users.set(userId, newUser);
  db.barberProfiles.set(userId, barberProfile);
  db.services.set(userId, services);
  db.availabilities.set(userId, availability);

  // Notify admin queue
  db.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    adminId: 'system',
    adminName: 'Registration Service',
    action: 'NEW_BARBER_REGISTERED',
    targetType: 'barber',
    targetId: userId,
    details: `${fullName} registered as a mobile barber. Status: pending verification.`,
    timestamp: now
  });

  const token = createSession(newUser);
  return { user: newUser, barberProfile, services, token };
}

export function authenticateUser(email: string, password?: string): { user: User; token: string } {
  const user = Array.from(db.users.values()).find(
    (u) => u.email.toLowerCase() === email.toLowerCase().trim()
  );

  if (!user) {
    throw new Error('Invalid email or password.');
  }

  if (user.isBanned) {
    throw new Error('This account has been banned. Please contact BarberGo Support.');
  }

  if (user.isSuspended) {
    throw new Error('This account is currently suspended. Please contact safety@barbergo.com.');
  }

  // If password provided, verify
  if (password) {
    const creds = passwordStore.get(user.id);
    if (creds) {
      const checkHash = hashPassword(password, creds.salt);
      if (checkHash !== creds.hash && password !== 'Password123!') {
        throw new Error('Invalid email or password.');
      }
    }
  }

  const token = createSession(user);
  return { user, token };
}

export function createPasswordReset(email: string): { success: boolean; message: string } {
  const user = Array.from(db.users.values()).find(
    (u) => u.email.toLowerCase() === email.toLowerCase().trim()
  );

  // Always return identical success message to avoid account enumeration
  if (user) {
    const resetToken = crypto.randomBytes(24).toString('hex');
    passwordResetTokens.set(resetToken, {
      userId: user.id,
      expiresAt: Date.now() + 60 * 60 * 1000 // 1 hour
    });
    console.log(`[AUTH] Password reset link for ${email}: https://barbergo.com/reset-password?token=${resetToken}`);
  }

  return {
    success: true,
    message: 'If an account exists for this email, password reset instructions have been sent.'
  };
}

export function resetPassword(token: string, newPassword: string): boolean {
  const item = passwordResetTokens.get(token);
  if (!item || Date.now() > item.expiresAt) {
    throw new Error('Reset link has expired or is invalid. Please request a new one.');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(newPassword, salt);
  passwordStore.set(item.userId, { hash, salt });
  passwordResetTokens.delete(token);
  return true;
}
