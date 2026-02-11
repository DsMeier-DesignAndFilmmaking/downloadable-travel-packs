/**
 * TravelPacks V2 — Travel Survival data
 * Top 10 cities 2026: research-backed emergency, infrastructure, transit, and scams.
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

/** Operational Infrastructure Specs */
export interface FacilityIntel {
  access: string
  hygiene: string
  protocol: string
  availability: string
}

export interface City {
  slug: string
  emergency: CityEmergency
  frictionPoints: CityFrictionPoints
  facility_intel: FacilityIntel
  transit: CityTransit
  scams: string[]
  aiInsights?: string | null
}

export const cities: City[] = [
  {
    slug: 'bangkok-thailand',
    emergency: {
      police: '191',
      medical: '1669',
      notes: 'Tourist Police 1155 (24h, English). Hospitals like Bumrungrad have English-speaking staff.',
    },
    frictionPoints: {
      water: 'Bottled water only; avoid ice from street vendors. Refill at hotels.',
      power: '230V, Type A/B/C/F. Bring adapters.',
      tipping: 'Not expected but appreciated (10–20 baht).',
      toilets: 'Mix of Western and squat; carry tissue.',
    },
    facility_intel: {
      access: "Free (Malls/BTS) / 5-10 THB (Public)",
      hygiene: "High in malls; variable in public",
      protocol: "Paper in bin (Bidet/Hose common)",
      availability: "High in SkyTrain (BTS) & Malls"
    },
    transit: {
      app: 'Grab, Bolt. BTS/MRT for rail.',
      payment: 'Cash dominant for taxis. Rabbit card for BTS.',
      etiquette: 'Don’t touch monks; offer seats to elderly.',
    },
    scams: [
      'Tuk-tuk drivers saying attractions are closed',
      'Gem and suit scams (overpriced jewelry)',
      'Taxi refusing meter or taking long routes',
    ],
  },
  {
    slug: 'paris-france',
    emergency: {
      police: '17',
      medical: '15 (SAMU)',
      notes: 'EU emergency 112. Pickpockets common on Metro.',
    },
    frictionPoints: {
      water: 'Tap water safe (ask “carafe d’eau”).',
      power: '230V, Type E (2-pin).',
      tipping: 'Service compris (included). Round up 5%.',
      toilets: 'Pay toilets common (€0.50–1).',
    },
    facility_intel: {
      access: "Paid (€0.50 - €1.50) / Café Purchase",
      hygiene: "Reliable in Museums/Dept Stores",
      protocol: "Flush paper (Standard)",
      availability: "Scarce; use 'Sanisette' street pods"
    },
    transit: {
      app: 'RATP (official), Citymapper, Uber.',
      payment: 'Contactless card accepted. Navigo for Metro.',
      etiquette: 'Give up seats for elderly; keep bags closed.',
    },
    scams: [
      'Friendship bracelet tied to wrist',
      'Petition or clipboard distraction',
      'Gold ring “found” on ground scam',
    ],
  },
  {
    slug: 'london-uk',
    emergency: {
      police: '999 or 101',
      medical: '999 (ambulance), 111 (NHS advice)',
      notes: 'No routine ambulance charge. A&E for emergencies.',
    },
    frictionPoints: {
      water: 'Tap water safe; refill at cafés.',
      power: '230V, Type G (UK 3-pin).',
      tipping: '10–12% in restaurants if not included.',
      toilets: 'Public toilets often paid.',
    },
    facility_intel: {
      access: "Free (Museums) / Paid (Stations)",
      hygiene: "Excellent in Malls & Galleries",
      protocol: "Flush paper (Standard)",
      availability: "Moderate; widespread in pubs"
    },
    transit: {
      app: 'TfL Go, Citymapper. Oyster/Contactless.',
      payment: 'Contactless card or Apple/Google Pay.',
      etiquette: 'Stand on the right on escalators.',
    },
    scams: [
      'Fake ticket sellers outside venues',
      'Distraction / “spill” pickpockets',
      'Unlicensed minicabs',
    ],
  },
  {
    slug: 'dubai-uae',
    emergency: {
      police: '999',
      medical: '998',
      notes: 'Private hospitals common. Avoid PDA and public intoxication.',
    },
    frictionPoints: {
      water: 'Bottled water standard; tap often desalinated.',
      power: '230V, Type G (UK).',
      tipping: '10–15% in restaurants.',
      toilets: 'Western standard; free and clean.',
    },
    facility_intel: {
      access: "Free (Universal)",
      hygiene: "Superior / High-end",
      protocol: "Flush paper (Bidet standard)",
      availability: "Abundant in all Malls & Metro"
    },
    transit: {
      app: 'Careem, Uber, RTA Dubai.',
      payment: 'Card accepted. Nol card for Metro.',
      etiquette: 'Women-only carriages on Metro.',
    },
    scams: [
      'Fake luxury goods in souks',
      'Timeshare and property investment pitches',
      'Unlicensed tour operators',
    ],
  },
  {
    slug: 'singapore',
    emergency: {
      police: '999',
      medical: '995',
      notes: 'Strict laws (litter, gum). Hospitals excellent.',
    },
    frictionPoints: {
      water: 'Tap water safe to drink.',
      power: '230V, Type G (UK).',
      tipping: 'Not customary; 10% service usually added.',
      toilets: 'Western, clean, and available.',
    },
    facility_intel: {
      access: "Free / Nominal charge (€0.10)",
      hygiene: "Exceptional / Hospital Grade",
      protocol: "Flush paper (Standard)",
      availability: "Ubiquitous in MRT & Shopping centers"
    },
    transit: {
      app: 'Grab, Gojek. MRT/LRT.',
      payment: 'Contactless and EZ-Link cards.',
      etiquette: 'No eating/drinking on MRT; queue strictly.',
    },
    scams: [
      'Overpriced SIM cards/electronics (Sim Lim Square)',
      'Unlicensed money changers',
      'Hidden fees in harbour tour packages',
    ],
  },
  {
    slug: 'istanbul-turkey',
    emergency: {
      police: '155',
      medical: '112',
      notes: 'Tourist Police in Sultanahmet.',
    },
    frictionPoints: {
      water: 'Bottled water preferred.',
      power: '230V, Type F (Euro).',
      tipping: '10% in restaurants; round up taxis.',
      toilets: 'Mix of Western and squat.',
    },
    facility_intel: {
      access: "Paid (₺5–₺10) / Istanbulkart sometimes",
      hygiene: "High in Malls; basic in bazaars",
      protocol: "Paper in bin (Bidet common)",
      availability: "High in mosques & transit hubs"
    },
    transit: {
      app: 'BiTaksi, Istanbulkart.',
      payment: 'Istanbulkart for public transit; cash for taxis.',
      etiquette: 'Give seats to elderly; keep bags in front.',
    },
    scams: [
      'Shoe shine brush drop scam',
      'Friendly strangers inviting to bars (extortion)',
      'Taxi meter tampering',
    ],
  },
  {
    slug: 'tokyo-japan',
    emergency: {
      police: '110',
      medical: '119',
      notes: 'Few speak English. Hospitals require upfront payment.',
    },
    frictionPoints: {
      water: 'Tap water safe; widespread vending machines.',
      power: '100V, Type A/B (US-style).',
      tipping: 'Not customary; often considered rude.',
      toilets: 'Western high-tech (Washlets).',
    },
    facility_intel: {
      access: "Free (Universal)",
      hygiene: "Superior / High-tech",
      protocol: "Flush paper (Bidet standard)",
      availability: "High in Dept stores & Konbini (7-11)"
    },
    transit: {
      app: 'Google Maps, Suica/Pasmo in Apple Wallet.',
      payment: 'IC cards (Suica) or cash for small shops.',
      etiquette: 'No talking on trains; no eating while walking.',
    },
    scams: [
      'Kabukicho “bar touts” (extortionate tabs)',
      'Fake club invitations with hidden covers',
      'Overpriced “tourist” restaurants',
    ],
  },
  {
    slug: 'antalya-turkey',
    emergency: {
      police: '155',
      medical: '112',
      notes: 'Tourist Police in Kaleiçi.',
    },
    frictionPoints: {
      water: 'Bottled water recommended.',
      power: '230V, Type F. Adapter for US/UK.',
      tipping: '10% restaurants; round up taxis.',
      toilets: 'Western in hotels/malls.',
    },
    facility_intel: {
      access: "Free in Hotels / Paid on Beaches",
      hygiene: "High in tourist zones",
      protocol: "Paper in bin preferred",
      availability: "Moderate; use Shopping Malls"
    },
    transit: {
      app: 'BiTaksi, AntRay.',
      payment: 'Cash for dolmuş; Kentkart for tram.',
      etiquette: 'Dress modestly near mosques.',
    },
    scams: [
      'All-inclusive boat trips with hidden extras',
      'Fake designer goods in bazaars',
      'Unmetered airport taxis',
    ],
  },
  {
    slug: 'seoul-south-korea',
    emergency: {
      police: '112',
      medical: '119',
      notes: 'Tourist Police in Myeongdong.',
    },
    frictionPoints: {
      water: 'Tap water safe; purified stations in subway.',
      power: '220V, Type C/F.',
      tipping: 'Not expected; can be refused.',
      toilets: 'Western; clean in subway/malls.',
    },
    facility_intel: {
      access: "Free (Subways / Malls)",
      hygiene: "Very High / Modern",
      protocol: "Flush paper (Standard)",
      availability: "Excellent; every subway station"
    },
    transit: {
      app: 'Kakao T, Naver Map.',
      payment: 'T-money card for transit; cards accepted.',
      etiquette: 'Priority seats for elderly strictly observed.',
    },
    scams: [
      'Overpriced skincare in tourist hubs',
      'Fake K-pop scouts asking for money',
      'Unlicensed airport taxis',
    ],
  },
  {
    slug: 'hong-kong',
    emergency: {
      police: '999',
      medical: '999',
      notes: 'Ambulance free. Public hospitals cheap.',
    },
    frictionPoints: {
      water: 'Tap safe but boiled/bottled preferred.',
      power: '220V, Type G (UK).',
      tipping: '10% service usually on bill.',
      toilets: 'Western in malls/MTR.',
    },
    facility_intel: {
      access: "Free (Malls / Stations)",
      hygiene: "High / Modern",
      protocol: "Flush paper (Standard)",
      availability: "High in Shopping Podiums & MTR"
    },
    transit: {
      app: 'MTR Mobile, Octopus.',
      payment: 'Octopus card is essential.',
      etiquette: 'Queue strictly; stand on right on escalators.',
    },
    scams: [
      'Fake electronics in Sham Shui Po',
      'Overpriced TST tailor shops',
      'Tea ceremony invitation scam',
    ],
  },
]

export function getCityBySlug(slug: string): City | undefined {
  return cities.find((c) => c.slug === slug)
}

export function getCitySlugs(): string[] {
  return cities.map((c) => c.slug)
}