import { BarberProfile, CustomerProfile, Service, User } from '../src/types';

export interface SmartMatchCandidate {
  user: User;
  profile: BarberProfile;
  services: Service[];
  distanceMiles: number;
  isWithinRadius: boolean;
  matchScore: number;
  matchReasons: string[];
  estimatedArrivalMinutes: number;
  isBestMatch?: boolean;
  searchStage?: 1 | 2 | 3 | 4; // 1: 0-5mi, 2: 5-10mi, 3: 10-15mi, 4: >15mi
  isFavorite?: boolean;
  hasRebooked?: boolean;
}

export function parseNaturalLanguageQuery(query: string): {
  category?: string;
  maxPrice?: number;
  timing?: 'asap' | 'tonight' | 'any';
  locationType?: 'mobile' | 'studio';
  specialty?: string;
  minRating?: number;
} {
  const q = query.toLowerCase().trim();
  const filters: ReturnType<typeof parseNaturalLanguageQuery> = {};

  // Category detection
  if (q.includes('fade') || q.includes('taper') || q.includes('skin fade')) {
    filters.category = 'Fade';
  } else if (q.includes('beard') || q.includes('shave') || q.includes('mustache') || q.includes('lineup') || q.includes('line up')) {
    filters.category = 'Beard';
  } else if (q.includes('kid') || q.includes('child') || q.includes('boy')) {
    filters.category = 'Kids Cut';
  } else if (q.includes('hair + beard') || q.includes('combo') || q.includes('full service')) {
    filters.category = 'Hair + Beard';
  } else if (q.includes('haircut') || q.includes('cut') || q.includes('trim')) {
    filters.category = 'Haircut';
  }

  // Price detection (e.g. "under $30", "under 40", "below $50", "cheap")
  const priceMatch = q.match(/(?:under|below|less than|\$)\s*(\d+)/i) || q.match(/(\d+)\s*(?:dollars|bucks)/i);
  if (priceMatch && priceMatch[1]) {
    filters.maxPrice = parseInt(priceMatch[1], 10);
  }

  // Timing detection
  if (q.includes('now') || q.includes('asap') || q.includes('urgent') || q.includes('immediately')) {
    filters.timing = 'asap';
  } else if (q.includes('tonight') || q.includes('evening') || q.includes('later today')) {
    filters.timing = 'tonight';
  }

  // Location intent
  if (q.includes('my house') || q.includes('home') || q.includes('hotel') || q.includes('office') || q.includes('come to me') || q.includes('mobile')) {
    filters.locationType = 'mobile';
  } else if (q.includes('shop') || q.includes('studio') || q.includes('chair') || q.includes('go to barber')) {
    filters.locationType = 'studio';
  }

  // Specialty / Hair type
  if (q.includes('curly') || q.includes('texture') || q.includes('afro') || q.includes('asian') || q.includes('scissor') || q.includes('design')) {
    filters.specialty = q.includes('curly') ? 'curly' : q.includes('afro') ? 'afro' : 'specialty';
  }

  // Rating intent
  if (q.includes('best') || q.includes('top rated') || q.includes('5 star') || q.includes('premier')) {
    filters.minRating = 4.8;
  }

  return filters;
}

/**
 * Calculates the BarberGo Matching Score (0-100) using weighted factors:
 * 1. Distance & ETA (30%)
 * 2. Availability (20%)
 * 3. Service Match (15%)
 * 4. Rating & Reviews (15%)
 * 5. Reliability & Response (10%)
 * 6. Subscription Visibility Boost (10%)
 */
export function rankBarbersForCustomer(
  barbers: {
    user: User;
    profile: BarberProfile;
    services: Service[];
    distanceMiles: number;
    isWithinRadius: boolean;
  }[],
  customerProfile?: CustomerProfile | null,
  requestedCategory?: string,
  _userCoords?: { lat: number; lng: number },
  maxRadiusLimit?: number
): SmartMatchCandidate[] {
  const ranked: SmartMatchCandidate[] = barbers.map((b) => {
    const reasons: string[] = [];
    const travelMins = Math.max(6, Math.round(b.distanceMiles * 2.4 + 4));

    // Determine Search Radius Stage (1: 0-5mi, 2: 5-10mi, 3: 10-15mi, 4: >15mi)
    let searchStage: 1 | 2 | 3 | 4 = 1;
    if (b.distanceMiles <= 5) {
      searchStage = 1;
    } else if (b.distanceMiles <= 10) {
      searchStage = 2;
    } else if (b.distanceMiles <= 15) {
      searchStage = 3;
    } else {
      searchStage = 4;
    }

    // 1. Factor 1: Distance & ETA (Weight: 30 pts max)
    let distanceScore = 0;
    if (b.distanceMiles <= 2) {
      distanceScore = 30;
      reasons.push(`Super close (${travelMins}m ETA)`);
    } else if (b.distanceMiles <= 5) {
      distanceScore = 26;
      reasons.push(`${b.distanceMiles.toFixed(1)} mi away (~${travelMins} min)`);
    } else if (b.distanceMiles <= 10) {
      distanceScore = 18;
      reasons.push(`Stage 2 radius (${b.distanceMiles.toFixed(1)} mi)`);
    } else if (b.distanceMiles <= 15) {
      distanceScore = 10;
    } else {
      distanceScore = 4;
    }

    // 2. Factor 2: Availability (Weight: 20 pts max)
    let availabilityScore = 0;
    if (b.profile.isAcceptingBookings && !b.profile.isPaused) {
      availabilityScore = 20;
      reasons.push(`Ready for instant dispatch`);
    } else if (b.profile.isAcceptingBookings) {
      availabilityScore = 14;
    } else {
      availabilityScore = 5;
    }

    // 3. Factor 3: Service Match & Specialties (Weight: 15 pts max)
    let serviceScore = 8;
    if (requestedCategory) {
      const matchCat = b.services.find(
        (s) =>
          s.category.toLowerCase() === requestedCategory.toLowerCase() ||
          s.name.toLowerCase().includes(requestedCategory.toLowerCase())
      );
      if (matchCat) {
        serviceScore = 15;
        reasons.push(`${requestedCategory} Master ($${matchCat.price})`);
      }
    }
    if (customerProfile?.hairType && b.profile.bio.toLowerCase().includes(customerProfile.hairType.toLowerCase())) {
      serviceScore = Math.min(15, serviceScore + 4);
      reasons.push(`Specializes in ${customerProfile.hairType} hair`);
    }

    // 4. Factor 4: Rating & Reviews (Weight: 15 pts max)
    let ratingScore = 0;
    if (b.profile.rating >= 4.95) {
      ratingScore = 15;
      reasons.push(`★ ${b.profile.rating.toFixed(1)} (${b.profile.reviewCount}+ reviews)`);
    } else if (b.profile.rating >= 4.8) {
      ratingScore = 13;
      reasons.push(`★ ${b.profile.rating.toFixed(1)} top-rated`);
    } else if (b.profile.rating >= 4.5) {
      ratingScore = 10;
    } else {
      ratingScore = 6;
    }

    // 5. Factor 5: Reliability & Response (Weight: 10 pts max)
    let reliabilityScore = 5;
    if (b.profile.idVerified) {
      reliabilityScore += 2;
    }
    if (b.profile.completedBookingsCount > 30) {
      reliabilityScore += 3;
    }
    if ((b.profile.cancellationRate ?? 0) < 0.02) {
      reliabilityScore += 2;
      reasons.push(`100% reliable on-time track record`);
    }
    reliabilityScore = Math.min(10, reliabilityScore);

    // 6. Factor 6: Subscription Tier & Visibility Boost (Weight: 10 pts max)
    let subscriptionScore = 3;
    const tier = b.profile.subscriptionTier || b.profile.subscriptionPlanId || 'basic';
    if (tier === 'ultra') {
      subscriptionScore = 10;
      reasons.push(`Ultra Master Barber status`);
    } else if (tier === 'premium' || tier === 'elite') {
      subscriptionScore = 8;
      reasons.push(`Premium priority partner`);
    } else if (tier === 'pro') {
      subscriptionScore = 6;
    } else {
      subscriptionScore = 4;
    }

    // Bonus for customer favorite / repeat client
    const isFavorite = Boolean(customerProfile?.favorites?.includes(b.profile.userId));
    if (isFavorite) {
      reasons.unshift(`❤️ Your Favorite Barber`);
    }

    const totalScore = Math.min(
      100,
      Math.max(
        15,
        Math.round(
          distanceScore +
            availabilityScore +
            serviceScore +
            ratingScore +
            reliabilityScore +
            subscriptionScore +
            (isFavorite ? 15 : 0)
        )
      )
    );

    return {
      ...b,
      matchScore: totalScore,
      matchReasons: Array.from(new Set(reasons)).slice(0, 3),
      estimatedArrivalMinutes: travelMins,
      searchStage,
      isFavorite
    };
  });

  // Filter if max radius limit is passed
  let filtered = ranked;
  if (maxRadiusLimit && maxRadiusLimit > 0) {
    filtered = ranked.filter((b) => b.distanceMiles <= maxRadiusLimit);
  }

  // Sort descending by calculated match score
  filtered.sort((a, b) => b.matchScore - a.matchScore);

  // Designate top candidate as Best Match
  if (filtered.length > 0) {
    filtered[0].isBestMatch = true;
  }

  return filtered;
}
