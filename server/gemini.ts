import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (aiInstance) return aiInstance;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set. Using fallback assistant responses.');
    return null;
  }
  try {
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
    return aiInstance;
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
    return null;
  }
}

export async function getHaircutConsultation(data: {
  hairType: string;
  faceShape?: string;
  desiredLook?: string;
  haircutNotes?: string;
  vibe?: string;
}) {
  const ai = getGeminiClient();
  const prompt = `You are an elite master mobile barber stylist for BarberGo.
Provide an expert, professional, and practical haircut consultation based on the following client details:
- Hair Type/Texture: ${data.hairType}
- Face Shape: ${data.faceShape || 'Oval / Athletic'}
- Desired Aesthetic / Occasion: ${data.desiredLook || 'Clean, sharp, modern professional'}
- Client Notes: ${data.haircutNotes || 'None specified'}
- Personal Vibe: ${data.vibe || 'Polished Modern'}

Please format the response in clean, crisp Markdown with:
1. Recommended Style & Cut Name
2. Precise Clipper & Shears Technical Guide for the Barber (guard numbers, taper line, transition)
3. Facial Hair & Line-Up Pairing
4. Daily Styling & Maintenance (recommended product: pomade, matte clay, sea salt spray, or beard oil)
5. Practical Barber Note (a short 1-sentence prompt the customer can copy into their BarberGo appointment notes).`;

  if (!ai) {
    return `### Recommended Style: Tailored Mid-Skin Taper Fade with Textured Crop\n\n**Technical Guide for Barber:**\n- Start with #0.5 closed on the temple and nape, blending seamlessly into #1.5 open around the parietal ridge.\n- Point-cut scissors on top with 1.5 inches length retained for natural flow and texture.\n- Clean razor outline along the front temple arches and neckline.\n\n**Beard & Line-Up Pairing:**\n- Natural cheek gradient, faded sideburns connecting smoothly into a sharp 4mm boxed beard.\n\n**Daily Styling & Maintenance:**\n- Apply a dime-sized amount of matte texturizing clay on towel-damp hair. Finish with botanical cooling spray.\n\n**Barber Appointment Note:**\n*"Mid-skin taper with textured scissor crop on top, razor neck lineup, and conditioned beard trim."*`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt
    });
    return response.text || 'Unable to generate consultation at this time.';
  } catch (err: any) {
    console.error('Gemini error:', err);
    return `### Recommended Style: Modern Low Drop Fade with Scissor Texture\n\n**Technical Guide for Barber:**\n- #1 guard around the ears transitioning to #2 on the occipital ridge.\n- Scissor work across the crown maintaining 2 inches for directional styling.\n- Crisp razor finish on the perimeter.\n\n**Barber Appointment Note:**\n*"Low drop fade, scissor textured top, and natural beard shape-up."*`;
  }
}

export async function generateBarberBio(data: {
  barberName: string;
  experienceYears: number;
  specialties: string[];
  city: string;
  vibe: string;
}) {
  const ai = getGeminiClient();
  const prompt = `Write a high-converting, professional, 3-paragraph bio for a licensed mobile barber on the BarberGo platform.
- Name: ${data.barberName}
- Experience: ${data.experienceYears} years
- City / Service Area: ${data.city}
- Specialties: ${data.specialties.join(', ')}
- Tone & Vibe: ${data.vibe || 'Luxury, punctual, discreet, master craftsmanship'}

Highlight that they travel directly to client homes, luxury hotels, and offices with hospital-grade sanitization, portable ring lights, and vacuum clippers. Keep it under 180 words.`;

  if (!ai) {
    return `Master Barber ${data.barberName} brings over ${data.experienceYears} years of precision grooming directly to your door in ${data.city}. Specializing in ${data.specialties.join(', ')}, ${data.barberName} transforms any living room, luxury suite, or executive office into a private five-star barbershop.\n\nEquipped with cordless clippers, sanitized shears, portable vanity ring lighting, and fresh steamed towels, every appointment is delivered with uncompromising punctuality and zero cleanup required on your part.\n\nBook your personalized session today and experience effortless, luxury grooming on your own schedule.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt
    });
    return response.text || 'Master barber providing luxury mobile grooming services.';
  } catch (err) {
    console.error('Gemini bio error:', err);
    return `Master Barber ${data.barberName} brings over ${data.experienceYears} years of precision grooming directly to your door in ${data.city}. Specializing in ${data.specialties.join(', ')}.`;
  }
}

export async function generateServiceDescription(data: {
  serviceName: string;
  category: string;
  price: number;
  durationMinutes: number;
}) {
  const ai = getGeminiClient();
  const prompt = `Write an enticing, premium service description (3-4 sentences) for a mobile barber menu item on BarberGo.
- Service Name: ${data.serviceName}
- Category: ${data.category}
- Price: $${data.price}
- Duration: ${data.durationMinutes} minutes

Emphasize luxury, convenience, precision technique, and high-end grooming products.`;

  if (!ai) {
    return `An elevated ${data.durationMinutes}-minute mobile grooming ritual crafted for perfection. Includes an in-depth style consultation, precision clipper or scissor technique tailored to your head shape, straight-razor neck detailing, and a refreshing botanical aftershave mist. Designed for the client who demands effortless luxury at home.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt
    });
    return response.text || 'Premium mobile grooming service tailored to your exact style.';
  } catch (err) {
    console.error('Gemini service description error:', err);
    return `Comprehensive ${data.durationMinutes}-minute mobile grooming service including consultation, precision cutting, and razor neck finish.`;
  }
}

export async function getSupportAssistantReply(data: {
  userQuery: string;
  userRole: string;
}) {
  const ai = getGeminiClient();
  const prompt = `You are BarberGo Assistant, the official AI support copilot for BarberGo (on-demand mobile barber marketplace).
User Role: ${data.userRole}
User Inquiry: "${data.userQuery}"

Platform Policies Reference:
- Cancellation Policy: Full refund if cancelled more than 24 hours prior to appointment. Within 24 hours, a 50% late cancellation fee applies to compensate the mobile barber's reserved time and travel slot.
- Travel Radius: Barbers set their own radius (typically 10-20 miles).
- Fees: Transparent 6% platform transaction fee (minimum $1.99, max $12.99). Barbers keep 100% of customer tips and travel fees.
- Safety: Barbers are state-licensed and background-checked. Location is only tracked in real-time when the barber clicks "En Route" to an active booking. Emergency safety check-in happens upon arrival and departure.
- Stripe Payouts: Automatic rolling payouts directly to connected bank accounts.

Respond in a warm, professional, concise, and helpful manner (under 120 words).`;

  if (!ai) {
    return `Hello! On BarberGo, cancellations made more than 24 hours before your appointment are eligible for a 100% full refund. For cancellations within 24 hours, a 50% late fee applies to compensate the mobile barber for their reserved travel slot. Barbers receive 100% of all customer tips. If you need immediate assistance with an active booking, you can also reach our 24/7 support team through the Help tab.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt
    });
    return response.text || 'We are here to help! Please let us know how we can assist with your BarberGo experience.';
  } catch (err) {
    console.error('Gemini support bot error:', err);
    return 'Thank you for reaching out to BarberGo support. Our team is dedicated to providing smooth, safe mobile barber appointments.';
  }
}
