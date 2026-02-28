export type ActionViaAnalysisContent = {
  environmentalTension: string;
  regenerativeLever: string;
  economicWin: string;
  sourceRef: string;
};

export const DEFAULT_ACTION_VIA_ANALYSIS_CONTENT: ActionViaAnalysisContent = {
  environmentalTension: 'The city canopy is carrying moderate heat stress through the afternoon window.',
  regenerativeLever:
    "Regenerative lever: choose the rail-and-sidewalk sequence for short hops; it's the cleanest relief path in dense corridors.",
  economicWin:
    'Economic win: this district retains roughly {retention_pct}% of local spend, so meals here reinforce neighborhood continuity.',
  sourceRef: 'WHO Urban Health Observatory / Local Municipal Heat Bulletins / GDS-Index Economic Leakage Report 2026',
};

export const ACTION_VIA_ANALYSIS_CONTENT_BY_CITY: Record<string, ActionViaAnalysisContent> = {
  'bangkok-thailand': {
    environmentalTension: 'The city canopy is under humidity and heat pressure, especially across afternoon road corridors.',
    regenerativeLever:
      "Regenerative lever: the Skytrain-to-sidewalk chain reduces idle-traffic exposure and keeps movement cooler at street level.",
    economicWin:
      'Economic win: this neighborhood retains about {retention_pct}% of local spend, so market and cafe stops feed district resilience.',
    sourceRef: 'WHO Heat-Health Guidance / Bangkok Metropolitan Climate Data / GDS-Index Economic Leakage Report 2026',
  },
  'paris-france': {
    environmentalTension: 'Urban core air load rises during commuter waves, with tighter pressure near major intersections.',
    regenerativeLever:
      "Regenerative lever: metro-plus-walk transfers cut curbside congestion and reduce high-friction movement through heritage zones.",
    economicWin:
      'Economic win: this neighborhood retains about {retention_pct}% of local spend, so lunch here strengthens cultural storefront continuity.',
    sourceRef: 'WHO Urban Air Quality Guidance / Ville de Paris Mobility Data / GDS-Index Economic Leakage Report 2026',
  },
  'london-uk': {
    environmentalTension: 'Road-side particulate pressure increases near peak transfer windows around central hubs.',
    regenerativeLever:
      "Regenerative lever: rail-first movement with short walking links lowers lane pressure and smooths last-mile city flow.",
    economicWin:
      'Economic win: this neighborhood retains about {retention_pct}% of local spend, so independent purchases remain in local circulation.',
    sourceRef: 'WHO Urban Air Guidance / TfL Open Mobility Data / GDS-Index Economic Leakage Report 2026',
  },
  'tokyo-japan': {
    environmentalTension: 'Heat and crowd density stack around high-volume transfer points in midday commuter arcs.',
    regenerativeLever:
      "Regenerative lever: station-to-sidewalk sequencing keeps personal exposure lower and protects corridor throughput.",
    economicWin:
      'Economic win: this neighborhood retains about {retention_pct}% of local spend, so neighborhood businesses keep cultural depth in place.',
    sourceRef: 'WHO Urban Climate Guidance / Tokyo Metropolitan Mobility Signals / GDS-Index Economic Leakage Report 2026',
  },
  'new-york-us': {
    environmentalTension: 'Traffic delay and curb idling intensify roadside stress in high-density cross-town periods.',
    regenerativeLever:
      "Regenerative lever: subway and protected-walk segments reduce delay exposure and stabilize personal movement time.",
    economicWin:
      'Economic win: this neighborhood retains about {retention_pct}% of local spend, so local dining spend lands back in district payroll.',
    sourceRef: 'WHO Urban Health Signals / NYC Open Data Mobility Feeds / GDS-Index Economic Leakage Report 2026',
  },
  'rome-italy': {
    environmentalTension: 'Historic center corridors show elevated congestion pressure during tour and commute overlap hours.',
    regenerativeLever:
      "Regenerative lever: rail or tram plus short shaded walks lowers queue pressure and protects heritage-zone airflow.",
    economicWin:
      'Economic win: this neighborhood retains about {retention_pct}% of local spend, so cafe and artisan spend supports historic continuity.',
    sourceRef: 'WHO Urban Heat Guidance / Roma Mobilita Data / GDS-Index Economic Leakage Report 2026',
  },
  'barcelona-spain': {
    environmentalTension: 'Coastal heat pockets and intersection congestion combine during midday through early evening.',
    regenerativeLever:
      "Regenerative lever: metro-to-sidewalk routing eases lane load and keeps district movement in low-emission channels.",
    economicWin:
      'Economic win: this neighborhood retains about {retention_pct}% of local spend, so local stops directly sustain block-level identity.',
    sourceRef: 'WHO Climate-Health Guidance / Ajuntament de Barcelona Mobility Data / GDS-Index Economic Leakage Report 2026',
  },
  'dubai-uae': {
    environmentalTension: 'Thermal load and arterial traffic pressure rise quickly in daytime movement windows.',
    regenerativeLever:
      "Regenerative lever: metro-first trips with short indoor-connected walks reduce exposure and limit high-idle lane demand.",
    economicWin:
      'Economic win: this neighborhood retains about {retention_pct}% of local spend, so neighborhood retail ecosystems stay locally anchored.',
    sourceRef: 'WHO Heat Resilience Guidance / RTA Dubai Data / GDS-Index Economic Leakage Report 2026',
  },
  'seoul-south-korea': {
    environmentalTension: 'Fine particulate and corridor crowding spike around transfer peaks in central movement zones.',
    regenerativeLever:
      "Regenerative lever: rail priority and pedestrian connectors reduce exposure windows while preserving network flow.",
    economicWin:
      'Economic win: this neighborhood retains about {retention_pct}% of local spend, so daily purchases reinforce district-level cultural economy.',
    sourceRef: 'WHO Air Quality Guidance / Seoul Open Data Plaza Mobility Signals / GDS-Index Economic Leakage Report 2026',
  },
  'mexico-city-mexico': {
    environmentalTension: 'Altitude basin conditions and road congestion amplify air stress during high-volume traffic periods.',
    regenerativeLever:
      "Regenerative lever: metro and metrobus corridors absorb pressure fast, reducing curbside queue exposure and idle emissions.",
    economicWin:
      'Economic win: this neighborhood retains about {retention_pct}% of local spend, so local meals become direct heritage investment.',
    sourceRef: 'WHO Air Quality Guidance / CDMX Movilidad Data / GDS-Index Economic Leakage Report 2026',
  },
};
