/**
 * TravelPacks V2 — Travel Survival data
 * Top 10 cities 2025: research-backed emergency, friction points, transit, and scams.
 */

export interface CityEmergency {
  police: string
  medical: string
  notes: string
}

export interface CityFrictionPoints {
  water: string
  power: string
  tipping: string
  toilets: string
}

export interface CityTransit {
  app: string
  payment: string
  etiquette: string
}

export interface City {
  slug: string
  emergency: CityEmergency
  frictionPoints: CityFrictionPoints
  transit: CityTransit
  scams: string[]
  /** Placeholder for AI-generated insights (future: generated on demand). */
  aiInsights?: string | null
}

export const cities: City[] = [
  {
    slug: 'bangkok-thailand',
    emergency: {
      police: '191',
      medical: '1669',
      notes: 'Tourist Police 1155 (24h, English). Keep embassy number; hospitals like Bumrungrad have English-speaking staff.',
    },
    frictionPoints: {
      water: 'Bottled water only; avoid ice from street vendors. Refill at 7-Eleven or hotels.',
      power: '230V, Type A/B/C/F. Bring adapters; power cuts rare in central areas.',
      tipping: 'Not expected but appreciated (10–20 baht). Restaurants may add 10% service.',
      toilets: 'Mix of Western and squat; carry tissue. Shopping malls and BTS stations are reliable.',
    },
    transit: {
      app: 'Grab (ride + food), Bolt. BTS/MRT for skytrain and metro.',
      payment: 'Cash dominant for taxis/tuk-tuks. Rabbit card for BTS/MRT.',
      etiquette: 'Don’t touch monks; offer seats to elderly. No eating/drinking on BTS.',
    },
    scams: [
      'Tuk-tuk drivers saying attractions are closed and taking you to gem/jewelry shops',
      'Gem and suit scams (overpriced, “export-only” deals)',
      'Taxi refusing meter or taking long routes',
      'Friendly strangers leading to commission restaurants or fake tours',
      'Grand Palace “closed” redirect to other temples with inflated fees',
    ],
  },
  {
    slug: 'paris-france',
    emergency: {
      police: '17',
      medical: '15 (SAMU)',
      notes: 'EU emergency 112. Pickpockets common on Metro and at landmarks; report at commissariat.',
    },
    frictionPoints: {
      water: 'Tap water is safe (ask “carafe d’eau”). Public fountains (fontaines) in parks.',
      power: '230V, Type E (2-pin). Adapter needed for US/UK plugs.',
      tipping: 'Service compris (included). Round up or 5–10% for great service.',
      toilets: 'Pay toilets common (€0.50–1). Cafés expect a small purchase for WC use.',
    },
    transit: {
      app: 'RATP (official), Citymapper, Uber, Bolt.',
      payment: 'Contactless card widely accepted. Navigo or ticket+ for Metro/RER.',
      etiquette: 'Give up seats for elderly/pregnant; keep bags closed; no eye contact with petition scammers.',
    },
    scams: [
      'Friendship bracelet / “free” ring tied to your wrist then demand for payment',
      'Petition or clipboard distraction while accomplice pickpockets',
      'Gold ring “found” on ground — “is it yours?” then demand reward',
      'Overpriced cafés and restaurants near major sights',
      'Unofficial taxi drivers at Gare du Nord / CDG charging flat rip-off fares',
    ],
  },
  {
    slug: 'london-uk',
    emergency: {
      police: '999 or 101 (non-urgent)',
      medical: '999 (ambulance), 111 (NHS advice)',
      notes: 'No routine ambulance charge. A&E for emergencies; minor injuries at walk-in centres.',
    },
    frictionPoints: {
      water: 'Tap water safe; refill at cafés or public refill points.',
      power: '230V, Type G (UK 3-pin). Adapter required for non-UK plugs.',
      tipping: '10–12% in restaurants if no service charge. Not mandatory.',
      toilets: 'Public toilets often paid; use in stations, museums, or cafés.',
    },
    transit: {
      app: 'TfL Go, Citymapper, Uber. Oyster or contactless for Tube/bus.',
      payment: 'Contactless card or Apple/Google Pay on Tube and buses.',
      etiquette: 'Stand on the right on escalators; let people off before boarding; no eating smelly food.',
    },
    scams: [
      'Fake ticket sellers outside venues (buy only at box office or official sites)',
      'Distraction / “spill” while someone steals phone or wallet',
      'Fake charity collectors with cloned card readers',
      'Unlicensed minicabs — only use black cabs or booked minicabs',
      'ATM skimmers and “helpful” strangers at cash machines',
    ],
  },
  {
    slug: 'dubai-uae',
    emergency: {
      police: '999',
      medical: '998 (ambulance), 997 (civil defence)',
      notes: 'Private hospitals common; travel insurance recommended. Sharia applies; avoid PDA and intoxication in public.',
    },
    frictionPoints: {
      water: 'Bottled water standard; tap technically safe but often desalinated taste.',
      power: '230V, Type G (UK). Type C also in some buildings.',
      tipping: '10–15% in restaurants; AED 5–10 for delivery/valet. Not always expected in hotels.',
      toilets: 'Western standard in malls and hotels; free and clean.',
    },
    transit: {
      app: 'Careem, Uber, RTA Dubai (Nol card). Metro and tram for main areas.',
      payment: 'Card widely accepted. Nol card for Metro/tram/bus.',
      etiquette: 'Women-only carriages on Metro; no eating/drinking in Metro; dress modestly.',
    },
    scams: [
      'Fake luxury goods and “designer” bags in souks',
      'Timeshare and property investment pitches with “free” desert safari',
      'Overpriced tours and activities sold on the street or beach',
      'Romance/dating scams leading to extortion',
      'Unlicensed tour operators and desert safari no-shows',
    ],
  },
  {
    slug: 'singapore',
    emergency: {
      police: '999',
      medical: '995',
      notes: 'Strict laws (litter, jaywalking, chewing gum). Hospitals excellent; bring ID and insurance details.',
    },
    frictionPoints: {
      water: 'Tap water safe to drink; refill stations in MRT and malls.',
      power: '230V, Type G (UK). Adapter for US/other plugs.',
      tipping: 'Not customary; 10% service charge often on bill. No need to add more.',
      toilets: 'Western, clean, and widely available; some charge a small fee.',
    },
    transit: {
      app: 'Grab, Gojek, ComfortDelGro. MRT/LRT with EZ-Link or contactless.',
      payment: 'Contactless and cards everywhere. EZ-Link or NETS FlashPay for transit.',
      etiquette: 'No eating/drinking on MRT; no durian; queue and stand on left on escalators.',
    },
    scams: [
      'Fake electronics and SIM cards in Sim Lim Square (research sellers)',
      'Overpriced bars and “ladies’ drinks” in Clarke Quay / nightlife',
      'Fake lottery or inheritance scams (emails/calls)',
      'Unlicensed money changers offering “too good” rates',
      'Tour packages sold at harbour with hidden fees or no show',
    ],
  },
  {
    slug: 'istanbul-turkey',
    emergency: {
      police: '155',
      medical: '112',
      notes: 'Tourist Police in Sultanahmet. Private hospitals (e.g. American Hospital) have English staff.',
    },
    frictionPoints: {
      water: 'Bottled water preferred; tap not recommended for drinking.',
      power: '230V, Type F (Euro). Adapter for US/UK.',
      tipping: '10% in restaurants; round up taxis. Small change for hamam and porters.',
      toilets: 'Mix of Western and squat; carry tissue. Often paid (₺2–5) or café purchase.',
    },
    transit: {
      app: 'BiTaksi, Uber (limited), Istanbulkart for tram/metro/ferry.',
      payment: 'Istanbulkart for all public transport; cash for some taxis.',
      etiquette: 'Give seats to elderly; avoid rush hour if possible; keep bags in front.',
    },
    scams: [
      'Shoe shine dropping brush then overcharging for “clean”',
      'Friendly strangers inviting to bars or restaurants with huge bills',
      'Carpet shop “tea and chat” leading to high-pressure sales',
      'Taxi meter tampering or “broken” meter and inflated fare',
      'Fake guides at Hagia Sophia / Blue Mosque offering “official” tours',
    ],
  },
  {
    slug: 'tokyo-japan',
    emergency: {
      police: '110',
      medical: '119',
      notes: 'Few speak English; use translation app. Hospitals may require upfront payment; claim on insurance.',
    },
    frictionPoints: {
      water: 'Tap water safe; many public fountains and vending machines.',
      power: '100V, Type A/B (US-style). No adapter for US; step-down for 230V countries.',
      tipping: 'Not customary; can be seen as rude. No tipping in taxis or restaurants.',
      toilets: 'Mix of Western and high-tech; often free and clean. Many with bidet.',
    },
    transit: {
      app: 'Google Maps, Japan Travel by Navitime, Suica/Pasmo in Apple Wallet.',
      payment: 'Suica/Pasmo (IC cards) for trains/buses; cash still common in small shops.',
      etiquette: 'No phones in priority seats; no talking on trains; queue neatly; no eating while walking.',
    },
    scams: [
      'Roppongi and Kabukicho “bar touts” leading to overpriced drinks and tab',
      'Fake “massage” or “club” invitations with hidden cover charges',
      'Taxi drivers taking long routes (rare; most honest)',
      'Overpriced “tourist” restaurants in main districts',
      'Fake or marked-up tax-free goods — buy at reputable department stores',
    ],
  },
  {
    slug: 'antalya-turkey',
    emergency: {
      police: '155',
      medical: '112',
      notes: 'Tourist Police in Kaleiçi. Private hospitals in Lara/Kundu; travel insurance advised.',
    },
    frictionPoints: {
      water: 'Bottled water recommended; tap not for drinking.',
      power: '230V, Type F. Adapter for US/UK.',
      tipping: '10% restaurants; round up taxis; small change for porters and hamam.',
      toilets: 'Western in hotels and malls; carry tissue for public ones.',
    },
    transit: {
      app: 'BiTaksi, AntRay (tram). Dolmuş for shared minibus; cash.',
      payment: 'Cash common for dolmuş and taxis; Kentkart for tram.',
      etiquette: 'Dress modestly near mosques; haggle in bazaars, not in fixed-price shops.',
    },
    scams: [
      'All-inclusive “free” boat trips with hidden extras and overpriced drinks',
      'Timeshare and property pitches with “free” transfer or tour',
      'Fake designer goods and overpriced leather in bazaars',
      'Taxi from airport with fixed “tourist” price instead of meter',
      'Bar/club tabs inflated after “free” first drink',
    ],
  },
  {
    slug: 'seoul-south-korea',
    emergency: {
      police: '112',
      medical: '119',
      notes: 'Tourist Police in Myeongdong (1330 hotline). Hospitals in Itaewon and Gangnam have English.',
    },
    frictionPoints: {
      water: 'Tap water safe (purified); refill at public stations and in subway.',
      power: '220V, Type C/F. Adapter for US plugs (flat 2-pin).',
      tipping: 'Not expected; can be refused. No tipping in taxis or restaurants.',
      toilets: 'Western; clean in subway and malls. Often free.',
    },
    transit: {
      app: 'Kakao T (taxi), KakaoMap, Naver Map. T-money or Cashbee for subway/bus.',
      payment: 'T-money for transit; cards widely accepted; some small places cash only.',
      etiquette: 'Priority seats for elderly; no eating on subway; stand on right on escalators.',
    },
    scams: [
      'Overpriced skincare and cosmetics in some tourist areas (compare with Olive Young)',
      'Fake K-pop or “model” scouts asking for money for “auditions”',
      'Bar hostess tabs in Hongdae/Itaewon with unclear pricing',
      'Unlicensed taxis at airport charging flat high fares',
      'Fake “duty-free” or “tax refund” schemes — use official counters',
    ],
  },
  {
    slug: 'hong-kong',
    emergency: {
      police: '999',
      medical: '999',
      notes: 'Ambulance free. Public hospitals cheap but crowded; private for faster care. Keep ID handy.',
    },
    frictionPoints: {
      water: 'Tap water technically safe; many use boiled or bottled. Refill at MTR and parks.',
      power: '220V, Type G (UK). Adapter for US/other.',
      tipping: '10% in restaurants; no tip in taxis. Service charge often on bill.',
      toilets: 'Western in malls and MTR; some squat in older areas. Usually free.',
    },
    transit: {
      app: 'MTR Mobile, HK Taxi, Uber. Octopus for MTR, bus, ferry, and retail.',
      payment: 'Octopus card for almost everything; contactless and cards widely accepted.',
      etiquette: 'Queue; stand on right on escalators; no eating on MTR; mask in some settings if required.',
    },
    scams: [
      'Fake electronics and phones in Golden Computer Arcade / Sham Shui Po',
      'Overpriced tailor and suit shops in TST with pressure sales',
      'Fake branded goods in Temple Street and Ladies’ Market',
      '“Tea ceremony” or “tea house” invitations leading to huge bills',
      'Unlicensed money changers and “too good” exchange rates',
    ],
  },
]

export function getCityBySlug(slug: string): City | undefined {
  return cities.find((c) => c.slug === slug)
}

export function getCitySlugs(): string[] {
  return cities.map((c) => c.slug)
}
