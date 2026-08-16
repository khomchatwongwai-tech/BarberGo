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
  userCoords?: { lat: number; lng: number }
): SmartMatchCandidate[] {
  const ranked: SmartMatchCandidate[] = barbers.map((b) => {
    let score = 50; // base score
    const reasons: string[] = [];

    // 1. Distance & Arrival calculation (Est. ~2.5 mins per mile + 5 min prep)
    const travelMins = Math.max(5, Math.round(b.distanceMiles * 2.5 + 4));
    if (b.distanceMiles <= 3) {
      score += 25;
      reasons.push(`${travelMins} min estimated arrival`);
    } else if (b.distanceMiles <= 6) {
      score += 15;
      reasons.push(`Nearby (${b.distanceMiles.toFixed(1)} miles)`);
    } else if (b.distanceMiles <= 10) {
      score += 5;
    } else {
      score -= 10;
    }

    // 2. Rating & Review volume
    if (b.profile.rating >= 4.9) {
      score += 20;
      reasons.push(`${b.profile.rating.toFixed(1)} ★ (${b.profile.reviewCount}+ reviews)`);
    } else if (b.profile.rating >= 4.7) {
      score += 12;
    }

    // 3. Category & Specialty Match
    if (requestedCategory) {
      const matchCat = b.services.find(
        (s) => s.category.toLowerCase() === requestedCategory.toLowerCase() || s.name.toLowerCase().includes(requestedCategory.toLowerCase())
      );
      if (matchCat) {
        score += 15;
        reasons.push(`${requestedCategory} specialist ($${matchCat.price})`);
      }
    }

    // 4. Hair type & Customer preferences match
    if (customerProfile?.hairType && b.profile.bio.toLowerCase().includes(customerProfile.hairType.toLowerCase())) {
      score += 10;
      reasons.push(`Matches ${customerProfile.hairType} hair profile`);
    }

    // 5. Repeat / Favorite relationship
    if (customerProfile?.favorites?.includes(b.profile.userId)) {
      score += 30;
      reasons.push(`Your Favorite Barber`);
    }

    // 6. Reliability & Completion Rate
    if (b.profile.completedBookingsCount > 20) {
      score += 10;
    }
    if ((b.profile.cancellationRate ?? 0) < 0.03) {
      score += 8;
    }

    // 7. Identity & License Verified
    if (b.profile.idVerified) {
      score += 5;
    }

    return {
      ...b,
      matchScore: Math.min(100, Math.max(10, score)),
      matchReasons: reasons.slice(0, 3),
      estimatedArrivalMinutes: travelMins
    };
  });

  // Sort descending by calculated match score
  ranked.sort((a, b) => b.matchScore - a.matchScore);

  // Designate the top candidate as Best Match
  if (ranked.length > 0) {
    ranked[0].isBestMatch = true;
  }

  return ranked;
}
