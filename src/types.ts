export type UserRole = 'customer' | 'barber' | 'admin' | 'support';
export type AppMode = 'demo' | 'production';

export interface User {
  id: string;
  email: string;
  phone: string;
  role: UserRole;
  fullName: string;
  avatarUrl: string;
  isVerified: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  isBanned: boolean;
  isSuspended: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id?: string;
  label?: string; // Home, Office, Hotel, etc.
  street: string;
  apartment?: string;
  city: string;
  state: string;
  zip?: string;
  zipCode?: string;
  lat?: number;
  lng?: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
  notes?: string;
  instructions?: string;
  isDefault?: boolean;
}

export interface CustomerProfile {
  userId: string;
  hairType?: string;
  favoriteStyles?: string[];
  notes?: string;
  accessibilityNotes?: string;
  savedAddresses: Address[];
  favorites: string[]; // Barber IDs
  haircutPreferences?: {
    hairType: string;
    preferredStyles: string[];
    notes: string;
  };
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  preferredPaymentMethodId?: string;
}

export interface BarberDocument {
  id: string;
  barberId: string;
  type: 'government_id' | 'barber_license' | 'liability_insurance' | 'certifications' | string;
  name?: string;
  fileUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  submittedAt?: string;
  uploadedAt?: string;
  reviewedAt?: string;
  expiryDate?: string;
}

export interface ServiceAddOn {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  description: string;
}

export type ServiceAddon = ServiceAddOn;

export interface Service {
  id: string;
  barberId: string;
  name: string;
  category: 'Haircut' | 'Fade' | 'Beard' | 'Kids Cut' | 'Hair + Beard' | 'Shave' | 'Styling' | 'Kids' | 'VIP Combo' | 'Color & Treatment' | string;
  description: string;
  price: number;
  durationMinutes: number;
  duration?: number;
  requiredEquipment?: string[];
  equipmentProvided?: string[];
  addOns?: ServiceAddOn[];
  addons?: ServiceAddOn[];
  isActive?: boolean;
}

export interface DaySchedule {
  enabled: boolean;
  start?: string;
  end?: string;
  slots?: { start: string; end: string }[];
}

export interface BarberAvailability {
  barberId: string;
  weeklySchedule: {
    monday: DaySchedule;
    tuesday: DaySchedule;
    wednesday: DaySchedule;
    thursday: DaySchedule;
    friday: DaySchedule;
    saturday: DaySchedule;
    sunday: DaySchedule;
  };
  unavailableDates?: string[];
  breaks?: { start: string; end: string; label: string }[];
  minimumAdvanceNoticeHours?: number;
  minimumNoticeHours?: number;
  bufferMinutesBetweenAppointments: number;
}

export type BarberSubscriptionTier = 'starter' | 'pro' | 'elite' | 'solo' | 'growth' | 'professional' | string;

export interface BarberProfile {
  userId: string;
  bio: string;
  experienceYears: number;
  rating: number;
  reviewCount: number;
  completedBookingsCount: number;
  cancellationRate?: number;
  responseTimeMinutes?: number;
  travelRadiusMiles: number;
  baseTravelFee: number;
  travelFeePerMile: number;
  serviceAreaZipCodes?: string[];
  serviceAreaCities: string[];
  coordinates: {
    lat: number;
    lng: number;
  };
  currentLocation?: {
    lat: number;
    lng: number;
    updatedAt: string;
    isLive?: boolean;
  };
  stripeAccountId?: string;
  stripeAccountStatus?: 'unlinked' | 'pending' | 'active' | 'restricted';
  subscriptionPlanId?: string;
  subscriptionTier?: BarberSubscriptionTier;
  subscriptionStatus?: 'active' | 'past_due' | 'trialing' | 'canceled';
  subscriptionRenewalDate?: string;
  bookingVolumeThisMonth?: number;
  isAcceptingBookings: boolean;
  isPaused?: boolean;
  pauseReason?: string;
  licenseNumber: string;
  licenseState?: string;
  licenseStatus?: 'unsubmitted' | 'pending_verification' | 'verified' | 'rejected';
  idVerified: boolean;
  backgroundCheckStatus?: 'none' | 'pending' | 'cleared' | 'flagged';
  insuranceDocumentUrl?: string;
  portfolioImages?: string[];
  specialties?: string[];
  languages?: string[];
  cancellationPolicy?: 'flexible' | 'moderate' | 'strict';
}

export type BookingStatus =
  | 'draft'
  | 'payment_pending'
  | 'requested'
  | 'accepted'
  | 'declined'
  | 'reschedule_proposed'
  | 'confirmed'
  | 'en_route'
  | 'arrived'
  | 'in_progress'
  | 'service_started'
  | 'completed'
  | 'cancelled'
  | 'customer_canceled'
  | 'barber_canceled'
  | 'no_show'
  | 'refund_pending'
  | 'refunded'
  | 'disputed';

export interface StatusHistoryItem {
  status: BookingStatus;
  timestamp: string;
  note?: string;
  actorId?: string;
  actorRole?: UserRole;
}

export interface BookingPricing {
  servicePrice: number;
  addOnsPrice?: number;
  travelFee: number;
  platformFee: number;
  estimatedTax: number;
  discount?: number;
  tip: number;
  total?: number;
  finalTotal?: number;
  barberEarnings?: {
    serviceRevenue: number;
    addOnsRevenue: number;
    travelFeeRevenue: number;
    tips: number;
    stripeFeeEstimate: number;
    netPayout: number;
  };
}

export interface BookingRescheduleProposal {
  proposedDate: string;
  proposedTime: string;
  proposedBy: 'barber' | 'customer';
  reason: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface BookingReview {
  id: string;
  bookingId?: string;
  rating: number;
  comment: string;
  customerName?: string;
  customerAvatar?: string;
  date?: string;
  photos?: string[];
  barberReply?: string;
  createdAt: string;
}

export type Review = BookingReview;

export interface BookingDispute {
  id: string;
  bookingId?: string;
  raisedBy?: 'customer' | 'barber';
  reason: string;
  description?: string;
  evidenceUrls?: string[];
  status: 'open' | 'under_review' | 'resolved' | 'rejected' | string;
  resolution?: string;
  notes?: string;
  resolutionNotes?: string;
  refundAmount?: number;
  createdAt: string;
  resolvedAt?: string;
}

export type Dispute = BookingDispute;

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAvatar: string;
  barberId: string;
  barberName: string;
  barberPhone: string;
  barberAvatar: string;
  service: Service;
  selectedAddOns?: ServiceAddOn[];
  locationType?: 'mobile_come_to_me' | 'studio_go_to_barber';
  timingMode?: 'asap_now' | 'scheduled';
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:MM'
  durationMinutes: number;
  status: BookingStatus;
  address: Address;
  haircutNotes?: string;
  referencePhotos?: string[];
  pricing: BookingPricing;
  paymentStatus?: 'unpaid' | 'authorized' | 'captured' | 'refunded' | 'partially_refunded';
  paymentIntentId?: string;
  promoCodeApplied?: string;
  cancellationReason?: string;
  statusHistory?: StatusHistoryItem[];
  rescheduleProposal?: BookingRescheduleProposal;
  tracking?: {
    isEnRoute: boolean;
    isLiveGps?: boolean;
    barberLocation?: { lat: number; lng: number };
    estimatedArrival?: string;
    checkedInAt?: string;
    serviceStartedAt?: string;
    completedAt?: string;
  };
  review?: BookingReview;
  dispute?: BookingDispute;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  bookingId?: string;
  conversationId?: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string;
  recipientName?: string;
  text: string;
  imageUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'booking' | 'payment' | 'safety' | 'system' | 'message';
  read: boolean;
  bookingId?: string;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  pricePerMonth: number;
  bookingLimit: number | null; // null = unlimited
  description: string;
  features: string[];
}

export interface PlatformSettings {
  appName: string;
  logoText: string;
  logoUrl?: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  platformFeePercent: number; // e.g. 6%
  minPlatformFee: number; // $1.99
  maxPlatformFee: number; // $12.99
  taxRatePercent: number; // e.g. 8.25%
  cancellationCutoffHours: number; // e.g. 24h for full refund
  lateCancellationFeePercent: number; // e.g. 50%
  subscriptionPlans: SubscriptionPlan[];
  supportedCities: string[];
  emergencyHelpline: string;
  allowNewBarberRegistration?: boolean;
  maintenanceMode?: boolean;
  appMode?: AppMode;
  stripeConfigured?: boolean;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType: 'user' | 'barber' | 'booking' | 'payment' | 'dispute' | 'settings' | 'document';
  targetId: string;
  details: string;
  timestamp: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountPercent?: number;
  minSpend?: number;
  maxDiscount?: number;
  currentUses?: number;
  usedCount?: number;
  maxUses?: number;
  expiresAt?: string;
  expiryDate?: string;
  isActive?: boolean;
  active?: boolean;
}

export interface SafetyReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterRole: UserRole;
  reportedUserId: string;
  reportedUserName: string;
  bookingId?: string;
  incidentType: 'harassment' | 'no_show' | 'safety_concern' | 'property_damage' | 'unlicensed_activity' | 'fraud' | 'other';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  notes?: string;
  createdAt: string;
}

export interface SmartMatchResult {
  barberId: string;
  matchScore: number;
  reasons: string[];
  estimatedArrivalMinutes: number;
  isBestMatch?: boolean;
}

export interface ParsedSearchQuery {
  rawQuery: string;
  serviceCategory?: string;
  maxPrice?: number;
  timing?: 'asap' | 'tonight' | 'weekend' | 'any';
  locationType?: 'mobile' | 'studio';
  specialty?: string;
  targetCity?: string;
}

export type SupportedLanguage = 'en' | 'es' | 'zh' | 'th' | 'ko' | 'ja' | 'vi' | 'fr';
