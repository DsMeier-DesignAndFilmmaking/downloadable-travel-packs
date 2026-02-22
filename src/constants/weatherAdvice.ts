export function isClimateSafetyWarning(temp: number, condition: string, uv: number): boolean {
  const normalized = condition.toLowerCase();
  const hasStormRisk = normalized.includes('thunderstorm') || normalized.includes('storm');
  return hasStormRisk || uv >= 8 || temp > 35;
}

export function getClimateAdviceV8(temp: number, condition: string, uv: number): string {
  const normalized = condition.toLowerCase();

  // Priority 1: immediate safety risks (storm cells / very high UV).
  if (normalized.includes('thunderstorm') || normalized.includes('storm')) {
    if (uv >= 8) {
      return 'STORM + UV SAFETY: Use covered transit now, avoid open areas, and limit direct sun exposure between checkpoints.';
    }
    return 'STORM SAFETY: Delay walking routes and use covered metro or taxi corridors until cells pass.';
  }

  if (uv >= 8) {
    return 'UV SAFETY: Very high UV. Sunscreen, hat, and shade breaks are mandatory before outdoor movement.';
  }

  // Priority 2: extreme temperature conditions.
  if (temp > 35) {
    return 'EXTREME HEAT: Avoid long walks, move by AC transit, and hydrate before each route segment.';
  }

  if (temp < 10) {
    return 'CHILL FACTOR: Layer up and prioritize indoor transfer hubs for navigation comfort.';
  }

  // Priority 3: specific precipitation scenarios.
  if (normalized.includes('drizzle')) {
    return 'LIGHT DRIZZLE: Pavement can still get slick. Keep rain shell ready and favor covered sidewalks.';
  }

  if (normalized.includes('showers')) {
    return 'PASSING SHOWERS: Keep routes flexible and use short covered transfers between stops.';
  }

  if (normalized.includes('rain')) {
    return 'RAIN ACTIVE: Surfaces are slippery. Metro or taxi is safer than long outdoor walking legs.';
  }

  if (normalized.includes('snow')) {
    return 'SNOW CONDITIONS: Slow pace on sidewalks and prioritize heated indoor wayfinding hubs.';
  }

  if (normalized.includes('fog')) {
    return 'LOW VISIBILITY: Stay on lit primary routes and confirm pickups with landmark-based location sharing.';
  }

  // Priority 4: low-friction weather.
  return 'MILD CLIMATE: Conditions are stable for walking and exploration.';
}
