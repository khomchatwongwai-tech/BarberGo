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
  const prompt = `You are an elite master mobile barber stylist for BarberPilot.
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
5. Practical Barber Note (a short 1-sentence prompt the customer can copy into their BarberPilot appointment notes).`;

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
  const prompt = `Write a high-converting, professional, 3-paragraph bio for a licensed mobile barber on the BarberPilot platform.
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
  const prompt = `Write an enticing, premium service description (3-4 sentences) for a mobile barber menu item on BarberPilot.
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
  const prompt = `You are BarberPilot Assistant, the official AI support copilot for BarberPilot (on-demand mobile barber marketplace).
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
    return `Hello! On BarberPilot, cancellations made more than 24 hours before your appointment are eligible for a 100% full refund. For cancellations within 24 hours, a 50% late fee applies to compensate the mobile barber for their reserved travel slot. Barbers receive 100% of all customer tips. If you need immediate assistance with an active booking, you can also reach our 24/7 support team through the Help tab.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt
    });
    return response.text || 'We are here to help! Please let us know how we can assist with your BarberPilot experience.';
  } catch (err) {
    console.error('Gemini support bot error:', err);
    return 'Thank you for reaching out to BarberPilot support. Our team is dedicated to providing smooth, safe mobile barber appointments.';
  }
}

export interface AssistantChatParams {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  userRole?: string;
  userName?: string;
  customerHairType?: string;
  nearbyBarbersSummary?: Array<{ id: string; name: string; rating: number; specialties: string[]; price: number }>;
}

export async function chatWithBarberGoAssistant(params: AssistantChatParams) {
  const ai = getGeminiClient();
  const role = params.userRole || 'customer';
  const userName = params.userName || 'Client';

  const barbersContext = params.nearbyBarbersSummary && params.nearbyBarbersSummary.length > 0
    ? `\nAvailable Licensed Mobile Barbers in System:\n` +
      params.nearbyBarbersSummary
        .map((b) => `- ${b.name} (ID: ${b.id}, Rating: ${b.rating}★, Starting: $${b.price}, Specialties: ${b.specialties.join(', ')})`)
        .join('\n')
    : '';

  const systemInstruction = `You are "BarberGo AI Assistant", the intelligent stylist and concierge for the BarberGo on-demand mobile barber marketplace.
Your goal is to give top-tier style advice, haircut consultations, grooming product suggestions, and seamless marketplace booking guidance.

Client Info:
- Name: ${userName}
- Platform Role: ${role}
- Hair Profile: ${params.customerHairType || 'Not specified (ask if relevant)'}
${barbersContext}

Capabilities & Knowledge:
1. Haircut & Facial Hair Consultations:
   - Understand taper vs fade (skin fade, drop fade, burst fade, low taper, mid taper).
   - Scissor cuts, textured crops, pompadours, buzz cuts, curls/coils styling.
   - Beard sculpting, hot towel shaves, razor edge lineups.
   - Clipper guards (e.g. #0.5, #1, #2, #3, open/closed lever).
   - Maintenance products: Matte clay (textured look), Pomade (high shine/slick), Sea salt spray (volume/waves), Beard oil (hydration).

2. BarberGo Mobile Marketplace:
   - Vetted, state-licensed master barbers travel with mobile kits (vacuum clippers, sanitized shears, ring light, disposable neck strips).
   - On-demand dispatch (arriving within ~45 min) or scheduled advance bookings.
   - Transparent pricing with 6% platform fee, barbers receive 100% of customer tips.
   - Cancellation: 100% refund >24h before; 50% late fee <24h.

3. Action Tags (Include these when appropriate to enable interactive 1-click UI actions in the app):
   - When suggesting a service category, append: [SUGGESTED_CATEGORY: Fade] (options: Haircut, Fade, Beard, Hair + Beard, Kids Cut, Luxury Hot Towel)
   - When recommending a concise note for the client to paste in their appointment, append: [BARBER_NOTE: Mid-skin taper with scissor textured top and razor neckline]
   - When recommending one of the available barbers, append: [RECOMMENDED_BARBER_ID: <barber-id>]

Keep responses friendly, confident, concise, and formatted in clear Markdown with bullet points where helpful.`;

  if (!ai) {
    // Intelligent fallback
    const lastUserMessage = params.messages[params.messages.length - 1]?.content.toLowerCase() || '';
    if (lastUserMessage.includes('fade') || lastUserMessage.includes('taper')) {
      return {
        reply: `**Taper vs. Fade Breakdown:**\n\n* **Fade:** Blends the hair completely down to the skin around the entire circumference of the head (sides and back).\n* **Taper:** Only fades down at two specific points — the sideburns/temples and the nape of the neck, keeping length around the ears.\n\n**Stylist Recommendation:** A **Mid-Skin Taper Fade** gives you crisp precision with natural flow on top.\n\n[SUGGESTED_CATEGORY: Fade]\n[BARBER_NOTE: Mid skin taper, #1.5 open on sides, textured scissor crop on top, straight razor neckline]`,
        suggestedCategory: 'Fade',
        barberNote: 'Mid skin taper, #1.5 open on sides, textured scissor crop on top, straight razor neckline'
      };
    } else if (lastUserMessage.includes('beard') || lastUserMessage.includes('shave')) {
      return {
        reply: `For optimal beard definition, we recommend a **Hair + Beard Sculpting** service. Your mobile barber will use a hot towel treatment, zero-gap trimmer line-up on the cheek gradient, and finish with organic sandalwood beard oil.\n\n[SUGGESTED_CATEGORY: Hair + Beard]\n[BARBER_NOTE: 4mm boxed beard trim, natural cheek fade, sharp mustache contour, razor cleanup]`,
        suggestedCategory: 'Hair + Beard',
        barberNote: '4mm boxed beard trim, natural cheek fade, sharp mustache contour, razor cleanup'
      };
    }

    return {
      reply: `Welcome to **BarberGo AI**! I can help you pick the perfect haircut style, recommend guard sizes for your mobile barber, suggest styling products, or match you with a top-rated mobile barber in your area.\n\nWhat kind of look or service are you exploring today?\n\n[SUGGESTED_CATEGORY: Haircut]`,
      suggestedCategory: 'Haircut',
      barberNote: 'Clean scissor cut with natural neck taper'
    };
  }

  try {
    // Build conversational content
    const conversationPrompt = params.messages
      .map((m) => `${m.role === 'user' ? 'Client' : 'BarberGo AI'}: ${m.content}`)
      .join('\n\n');

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: conversationPrompt,
      config: {
        systemInstruction,
        temperature: 0.7
      }
    });

    const rawText = response.text || '';
    
    // Extract metadata tags if present
    let suggestedCategory: string | undefined;
    let barberNote: string | undefined;
    let recommendedBarberId: string | undefined;

    const catMatch = rawText.match(/\[SUGGESTED_CATEGORY:\s*([^\]]+)\]/i);
    if (catMatch) suggestedCategory = catMatch[1].trim();

    const noteMatch = rawText.match(/\[BARBER_NOTE:\s*([^\]]+)\]/i);
    if (noteMatch) barberNote = noteMatch[1].trim();

    const barberMatch = rawText.match(/\[RECOMMENDED_BARBER_ID:\s*([^\]]+)\]/i);
    if (barberMatch) recommendedBarberId = barberMatch[1].trim();

    // Clean tags from display text for clean presentation
    const cleanText = rawText
      .replace(/\[SUGGESTED_CATEGORY:[^\]]+\]/gi, '')
      .replace(/\[BARBER_NOTE:[^\]]+\]/gi, '')
      .replace(/\[RECOMMENDED_BARBER_ID:[^\]]+\]/gi, '')
      .trim();

    return {
      reply: cleanText,
      suggestedCategory,
      barberNote,
      recommendedBarberId
    };
  } catch (err: any) {
    console.error('Gemini Assistant chat error:', err);
    return {
      reply: `I recommend a crisp mid taper fade with a scissor-textured top. Our mobile master barbers carry professional equipment directly to your location.\n\n[SUGGESTED_CATEGORY: Fade]`,
      suggestedCategory: 'Fade',
      barberNote: 'Mid taper fade with scissor textured top'
    };
  }
}
