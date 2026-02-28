export function formatCityLabel(label: string | undefined | null): string {
  if (!label) return 'City Breath';

  const cleaned = label.trim().toLowerCase().replaceAll('_', '-').replace(/\s+/g, '-');
  if (!cleaned) return 'City Breath';

  const segments = cleaned.split('-').filter(Boolean);
  if (segments.length <= 1) return titleCaseSegment(cleaned);

  const citySegment = segments.slice(0, -1).join('-');
  const countrySegment = segments[segments.length - 1];
  return `${titleCaseSegment(citySegment)}, ${titleCaseWord(countrySegment)}`;
}

function titleCaseWord(word: string): string {
  if (word.length <= 3) return word.toUpperCase();
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function titleCaseSegment(segment: string): string {
  return segment
    .split('-')
    .filter(Boolean)
    .map((word) => titleCaseWord(word))
    .join(' ');
}
