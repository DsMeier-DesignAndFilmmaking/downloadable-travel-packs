/**
 * ScoutPacks V2 — Tactical Field Intel
 * Top 10 cities 2026: research-backed emergency, survival, transit, and tactical protocols.
 */

export interface CityEmergency {
  police: string;
  medical: string;
  notes: string;
}

export interface CitySurvival {
  water: string;
  power: string;
  tipping: string;
  toilets: string;
}

export interface CityTransit {
  app: string;
  payment: string;
  etiquette: string;
}

export interface CityTactical {
  connectivity: string;
  weather: string;
  payment_logic: string;
}

export interface City {
  slug: string;
  name: string;
  country: string;
  last_updated: string;
  emergency: CityEmergency;
  survival: CitySurvival;
  transit: CityTransit;
  tactical: CityTactical;
  scams: string[];
  field_hacks: string[];
}

export const cities: City[] = [
  {
    slug: 'bangkok-thailand',
    name: 'Bangkok',
    country: 'Thailand',
    last_updated: '2026-02-11',
    emergency: {
      police: '191',
      medical: '1669',
      notes: 'Tourist Police 1155 (English). Use Bumrungrad or Samitivej hospitals for top English care.',
    },
    survival: {
      water: 'Non-potable. Ice in restaurants is factory-made and safe.',
      power: '220V, Type A/B/C/F. Type O is local but fits C.',
      tipping: 'Not expected. Round up 20 THB for taxis/cafes.',
      toilets: 'BTS stations have NO toilets. Use connected malls (Terminal 21, Siam Paragon).',
    },
    transit: {
      app: 'Grab (Reliability), Bolt (Cheaper).',
      payment: 'Rabbit Card (BTS), Contactless EMV (Visa/MC) for MRT.',
      etiquette: 'No eating/drinking on trains. Head lower than elders/monks.',
    },
    tactical: {
      connectivity: 'Skip BKK Airport SIMs (3x markup). Get a "Normal" SIM at any 7-Eleven in town.',
      weather: 'Afternoon storms hit 4pm (June-Oct). Surface traffic dies; stay underground (MRT).',
      payment_logic: 'Ask "PromptPay?" Most street food takes QR. Use Wise/Revolut scan.',
    },
    scams: [
      'The "Grand Palace is closed" tuk-tuk redirect.',
      'Unmetered Taxis: Insist on meter or use Grab.',
      'Bird seed/bracelet "gifts" that demand payment.',
    ],
    field_hacks: [
      'Use the Orange Flag boat to bypass Silom traffic for 16 THB.',
      '7-Eleven is your AC and Wi-Fi safety valve.',
    ],
  },
  {
    slug: 'paris-france',
    name: 'Paris',
    country: 'France',
    last_updated: '2026-02-11',
    emergency: {
      police: '17',
      medical: '15',
      notes: 'EU-wide 112. "Urgent Care" is "Maison Médicale de Garde" for non-life-threatening.',
    },
    survival: {
      water: 'Tap is world-class. Use "Fontaine Wallace" for free refills.',
      power: '230V, Type E (2-pin). Needs grounded adapter for UK/US.',
      tipping: 'Service Compris (included). Leave €1-2 "pourboire" for coffee/lunch.',
      toilets: 'Pay toilets (€0.50) common. Use "Sanisettes" (gray street pods) or museum WCs.',
    },
    transit: {
      app: 'Citymapper (Gold Standard), RATP Bonjour.',
      payment: 'Navigo Easy card or Apple/Google Wallet (Navigo). No paper tickets soon.',
      etiquette: 'Always say "Bonjour" when entering shops. Stand on right on escalators.',
    },
    tactical: {
      connectivity: 'Orange Holiday eSIM is best for speed, but Free Mobile (€19) is best for data volume.',
      weather: 'Cobblestones are ice-slick when wet. High-grip footwear is tactical, not optional.',
      payment_logic: 'Apple/Google Pay is everywhere. Cash is rare except in old-school boulangeries.',
    },
    scams: [
      'The "Found Gold Ring" distraction at the Tuileries.',
      '"Friendship" string bracelets at Sacré-Cœur.',
      'Unofficial Taxis at CDG (Follow official green signs only).',
    ],
    field_hacks: [
      'The "Vélib" bikes are faster than the Metro for 1-3km trips.',
      'Visit Louvre/Orsay on late-night openings to avoid the cruise-ship crowds.',
    ],
  },
  {
    slug: 'london-uk',
    name: 'London',
    country: 'UK',
    last_updated: '2026-02-11',
    emergency: {
      police: '999',
      medical: '999',
      notes: 'Dial 111 for non-emergency medical. NHS care is free at point of use for emergencies.',
    },
    survival: {
      water: 'Safe and high quality. Refill at any pub—they must provide tap water by law.',
      power: '230V, Type G (UK 3-pin). Highest safety standard.',
      tipping: '12.5% usually added as "Service Charge." Check bill before adding extra.',
      toilets: 'Major stations (King\'s Cross, etc.) are free. Department stores are best.',
    },
    transit: {
      app: 'TfL Go, Citymapper.',
      payment: 'Strictly Contactless or Oyster. Buses do NOT accept cash.',
      etiquette: 'Stand on the right. Let passengers off first. Do not make eye contact on Tube.',
    },
    tactical: {
      connectivity: 'Three or EE eSIMs have best urban penetration. Avoid "Roaming" via US carriers.',
      weather: "The 'London Drizzle' is constant. An 'Umbrella' is useless in wind—get a technical shell jacket.",
      payment_logic: "Total cashless transition. Even buskers and street markets take contactless.",
    },
    scams: [
      'Fake "Ticket Inspectors" asking for your card (rare but happening).',
      'The "Spill on your coat" distraction theft.',
      'Fake charity collectors in Leicester Square.',
    ],
    field_hacks: [
      'Elizabeth Line is the fastest way from LHR to Central London.',
      'Use the "Uber Boat" (Thames Clippers) for a cheap scenic river cruise.',
    ],
  },
  {
    slug: 'dubai-uae',
    name: 'Dubai',
    country: 'UAE',
    last_updated: '2026-02-11',
    emergency: {
      police: '999',
      medical: '998',
      notes: 'Strict laws on PDA/Public intoxication. Hospitals like Mediclinic are top-tier.',
    },
    survival: {
      water: 'Tap is desalinated (safe but flat). Most buy bottled or use hotel filters.',
      power: '230V, Type G (UK standard).',
      tipping: '10-15% expected. AED 5-10 for Valet/Porters is standard.',
      toilets: 'Luxury standard in malls. "Bidet hoses" are the norm.',
    },
    transit: {
      app: 'Careem (Halal Uber), Dubai Drive (RTA).',
      payment: 'Nol Card required for Metro/Bus. Taxis take card/Careem Pay.',
      etiquette: 'No eating on Metro. Women-only carriages are strictly enforced.',
    },
    tactical: {
      connectivity: 'Etisalat or du Visitor SIMs are expensive but have 5G everywhere.',
      weather: 'Heat is lethal May-Sept. Stay in "The Climate Loop" (Malls/Metro/Connected Tunnels).',
      payment_logic: 'Careem Pay is the super-app choice for everything digital.',
    },
    scams: [
      '"Gold" jewelry in Souks that is actually plated brass.',
      'Timeshare "free dinner" pitches near Dubai Mall.',
      'Unofficial "Limo" drivers charging 5x the RTA rate.',
    ],
    field_hacks: [
      'The Abra (water taxi) across Dubai Creek is still only 1 AED.',
      'Visit the Museum of the Future at night to see the calligraphy lit up.',
    ],
  },
  {
    slug: 'singapore',
    name: 'Singapore',
    country: 'Singapore',
    last_updated: '2026-02-11',
    emergency: {
      police: '999',
      medical: '995',
      notes: 'Tourist Police 1800 255 0000. Fines for litter/gum are strictly enforced.',
    },
    survival: {
      water: 'Tap is drinkable and high quality. Refill anywhere.',
      power: '230V, Type G (UK).',
      tipping: 'Not expected. 10% Service + 9% GST already on the bill.',
      toilets: 'Free and ultra-clean in every MRT and Shopping Mall.',
    },
    transit: {
      app: 'Grab, Gojek, Citymapper.',
      payment: 'Visa/Mastercard Contactless for MRT/Bus. Simple tap-on, tap-off.',
      etiquette: 'No durians on trains. Stand on the left. No eating/drinking in stations.',
    },
    tactical: {
      connectivity: 'Singtel or StarHub eSIM. Massive 5G speeds in the underground tunnels.',
      weather: 'The "Daily 3pm Shower" is real. MRT stations are the best shelter.',
      payment_logic: 'Contactless is king. Use "GrabPay" for Hawker Centers to avoid cash.',
    },
    scams: [
      'Sim Lim Square "Model" Electronics scams (check shop ratings).',
      'Overpriced "Ladies Drinks" in Clark Quay bars.',
      'Rental scams for "condos" (only trust official platforms).',
    ],
    field_hacks: [
      'Eat at Hawker Centers for Michelin-quality food under $10.',
      'The "Jewel" at Changi is better than most city attractions—go early.',
    ],
  },
  {
    slug: 'tokyo-japan',
    name: 'Tokyo',
    country: 'Japan',
    last_updated: '2026-02-11',
    emergency: {
      police: '110',
      medical: '119',
      notes: 'Most dispatchers don\'t speak English. Use Google Translate or "Japan Help Line."',
    },
    survival: {
      water: 'Tap is safe and tasty. Vending machines (Jihanki) are on every corner.',
      power: '100V, Type A (US 2-pin). No grounding pin. Needs 100V compatibility.',
      tipping: 'Strictly NOT allowed. Can be seen as an insult or mistake.',
      toilets: 'The "Washlet" (heated/bidet) is standard. Department stores are best.',
    },
    transit: {
      app: 'Google Maps (Unbeatable for Tokyo), Japan Transit by Navitime.',
      payment: 'Suica/Pasmo (Digital in Apple/Google Wallet). Some small ramen shops are CASH ONLY.',
      etiquette: 'SILENCE on trains. No phone calls. Carry your trash home (no bins).',
    },
    tactical: {
      connectivity: 'Ubigi or Airalo eSIM. Avoid Pocket Wi-Fi—it\'s another thing to charge/return.',
      weather: "Humidity in July/Aug is extreme. Buy 'Cooling Wipes' at any Conbini (Lawson/7-11).",
      payment_logic: 'Add Suica to your Apple Wallet before arrival. It works for transit AND vending machines.',
    },
    scams: [
      'Roppongi/Kabukicho "Drink Touts" (Never follow them).',
      'Fake Monks asking for donations near Senso-ji.',
      'Overpriced "Tourist Izakayas" in Shinjuku Golden Gai.',
    ],
    field_hacks: [
      'Use "Konbini" (7-Eleven/FamilyMart) for high-quality, cheap meals.',
      'The "Yamanote Line" is a loop; if you miss your stop, just stay on.',
    ],
  }
];

export function getCityBySlug(slug: string): City | undefined {
  return cities.find((c) => c.slug === slug);
}

export function getCitySlugs(): string[] {
  return cities.map((c) => c.slug);
}