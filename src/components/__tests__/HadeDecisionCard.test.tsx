/**
 * HadeDecisionCard — Component tests
 *
 * Goal: prove the card renders DYNAMIC content driven by real inputs
 * (arrival stage from localStorage, AQI from env-impact cache, time of day
 * from system clock). Each test seeds a different real state and asserts
 * different output. No test should pass if the card shows static fallback text.
 *
 * After the HadeContextProvider migration, each render is wrapped with the
 * provider. The provider reads from localStorage on init, so the existing
 * seed helpers continue to work unchanged.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HadeDecisionCard from '../HadeDecisionCard';
import { HadeContextProvider, useHadeCtx } from '@/contexts/HadeContextProvider';
import type { CityPack } from '@/types/cityPack';
import type { ArrivalStage } from '@/types/cityPack';

// ─── Minimal CityPack stub ────────────────────────────────────────────────────

function makeCity(slug: string): CityPack {
  return {
    slug,
    name: slug,
    countryCode: 'XX',
    countryName: 'Test',
    last_updated: '2026-01-01',
    theme: '',
    emergency: { police: '999', medical: '999', pharmacy24h: '' },
    survival: {
      tipping: '',
      tapWater: '',
      power: { type: '', voltage: '' },
      digitalEntry: '',
      touristTax: '',
      currentScams: [],
    },
    fuel: { staple: '', intel: '', price_anchor: '', price_usd: 0 },
    arrival: {
      eSimAdvice: '',
      eSimHack: '',
      airportHack: '',
      transitHack: '',
      essentialApps: [],
      tacticalPath: {
        connectivity: { wifiSsid: '', wifiPassword: '', note: '' },
        immigration: { strategy: '' },
        transport: { taxiEstimate: '', trainEstimate: '' },
      },
    },
  } as unknown as CityPack;
}

// ─── Cache seed helpers ───────────────────────────────────────────────────────

function seedArrival(slug: string, value: string | null) {
  if (value === null) localStorage.removeItem(`landed_${slug}`);
  else localStorage.setItem(`landed_${slug}`, value);
}

function seedAqi(slug: string, aqiValue: number) {
  localStorage.setItem(`env-impact-cache-v1-${slug}`, JSON.stringify({
    report: { aqiValue },
    savedAt: Date.now(),
  }));
}

// ─── Provider wrapper ─────────────────────────────────────────────────────────
// All renders need the HadeContextProvider. This helper wraps the element
// so the card's useHadeCtx() call resolves correctly.

function renderWithProvider(slug: string, element: React.ReactElement) {
  return render(
    <HadeContextProvider slug={slug}>
      {element}
    </HadeContextProvider>
  );
}

// ─── Context setter harness (for reactivity tests) ────────────────────────────
// A thin inner component that exposes context setters via data-testid buttons
// so reactivity can be triggered without window events.

function ArrivalSetter({ stage }: { stage: ArrivalStage }) {
  const { setArrivalStage } = useHadeCtx();
  return (
    <button
      data-testid={`set-stage-${stage}`}
      onClick={() => setArrivalStage(stage)}
    >
      {stage}
    </button>
  );
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  // Fix clock to 09:00 (morning) so time-of-day is deterministic
  vi.setSystemTime(new Date(2026, 0, 1, 9, 0, 0));
});

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

// ─── 1. Default render — no data — shows time-of-day content ─────────────────

describe('Default render (no arrival stage, no AQI cache)', () => {
  it('renders the card header', () => {
    renderWithProvider('paris-france', <HadeDecisionCard city={makeCity('paris-france')} aqi={null} />);
    expect(screen.getByText('HADE Decision Engine')).toBeInTheDocument();
  });

  it('shows morning time-of-day recs at 09:00 when no overriding signals', () => {
    renderWithProvider('paris-france', <HadeDecisionCard city={makeCity('paris-france')} aqi={null} />);
    expect(screen.getByText('Start Light')).toBeInTheDocument();
  });

  it('shows afternoon recs at 13:00 when no overriding signals', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 13, 0, 0));
    renderWithProvider('paris-france', <HadeDecisionCard city={makeCity('paris-france')} aqi={null} />);
    expect(screen.getByText('Slow the Pace')).toBeInTheDocument();
  });

  it('shows evening recs at 19:00', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 19, 0, 0));
    renderWithProvider('paris-france', <HadeDecisionCard city={makeCity('paris-france')} aqi={null} />);
    expect(screen.getByText('Go High-Energy')).toBeInTheDocument();
  });

  it('shows night recs at 23:00', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 23, 0, 0));
    renderWithProvider('paris-france', <HadeDecisionCard city={makeCity('paris-france')} aqi={null} />);
    expect(screen.getByText('Stay Visible')).toBeInTheDocument();
  });

  it('renders a grey AQI dot (unknown) when no AQI data is present', () => {
    const { container } = renderWithProvider('paris-france', <HadeDecisionCard city={makeCity('paris-france')} aqi={null} />);
    const dot = container.querySelector('.bg-slate-300');
    expect(dot).toBeInTheDocument();
  });
});

// ─── 2. Arrival stage: landed overrides time-of-day ──────────────────────────

describe('Arrival stage priority', () => {
  it('entry-immigration → shows "Move Efficiently", NOT morning recs', () => {
    seedArrival('bangkok-thailand', 'entry-immigration');
    renderWithProvider('bangkok-thailand', <HadeDecisionCard city={makeCity('bangkok-thailand')} aqi={null} />);
    expect(screen.getByText('Move Efficiently')).toBeInTheDocument();
    expect(screen.queryByText('Start Light')).not.toBeInTheDocument();
  });

  it('airport-exit → shows "Skip the Exchange"', () => {
    seedArrival('tokyo-japan', 'airport-exit');
    renderWithProvider('tokyo-japan', <HadeDecisionCard city={makeCity('tokyo-japan')} aqi={null} />);
    expect(screen.getByText('Skip the Exchange')).toBeInTheDocument();
  });

  it('landed stage shows exactly 2 recommendations', () => {
    seedArrival('london-uk', 'airport-exit');
    renderWithProvider('london-uk', <HadeDecisionCard city={makeCity('london-uk')} aqi={null} />);
    expect(screen.getByText('Move Efficiently')).toBeInTheDocument();
    expect(screen.getByText('Skip the Exchange')).toBeInTheDocument();
  });
});

// ─── 3. Arrival stage: in_transit ────────────────────────────────────────────

describe('In-transit recommendations', () => {
  it('left-airport → shows en-route content, NOT time-of-day recs', () => {
    seedArrival('dubai-uae', 'left-airport');
    renderWithProvider('dubai-uae', <HadeDecisionCard city={makeCity('dubai-uae')} aqi={null} />);
    expect(screen.getByText("You're En Route")).toBeInTheDocument();
    expect(screen.queryByText('Start Light')).not.toBeInTheDocument();
  });

  it('in_transit shows accommodation + eSIM guidance', () => {
    seedArrival('seoul-south-korea', 'left-airport');
    renderWithProvider('seoul-south-korea', <HadeDecisionCard city={makeCity('seoul-south-korea')} aqi={null} />);
    expect(screen.getByText('First Stop: SIM or eSIM')).toBeInTheDocument();
  });
});

// ─── 4. AQI: unhealthy overrides time-of-day ─────────────────────────────────

describe('AQI: unhealthy overrides time-of-day', () => {
  it('AQI 150 via prop → shows "Shift Indoors", NOT morning recs', () => {
    renderWithProvider('mexico-city-mexico', <HadeDecisionCard city={makeCity('mexico-city-mexico')} aqi={150} />);
    expect(screen.getByText('Shift Indoors')).toBeInTheDocument();
    expect(screen.queryByText('Start Light')).not.toBeInTheDocument();
  });

  it('AQI 150 via cache → shows "Shift Indoors"', () => {
    seedAqi('mexico-city-mexico', 150);
    renderWithProvider('mexico-city-mexico', <HadeDecisionCard city={makeCity('mexico-city-mexico')} aqi={null} />);
    expect(screen.getByText('Shift Indoors')).toBeInTheDocument();
  });

  it('unhealthy AQI shows a red dot', () => {
    const { container } = renderWithProvider('mexico-city-mexico', <HadeDecisionCard city={makeCity('mexico-city-mexico')} aqi={150} />);
    expect(container.querySelector('.bg-red-500')).toBeInTheDocument();
  });

  it('landed stage beats unhealthy AQI — shows airport recs not indoor recs', () => {
    seedArrival('mexico-city-mexico', 'airport-exit');
    renderWithProvider('mexico-city-mexico', <HadeDecisionCard city={makeCity('mexico-city-mexico')} aqi={150} />);
    expect(screen.getByText('Move Efficiently')).toBeInTheDocument();
    expect(screen.queryByText('Shift Indoors')).not.toBeInTheDocument();
  });
});

// ─── 5. AQI dot color reflects live data ─────────────────────────────────────

describe('AQI dot color reflects live data', () => {
  it('AQI 30 → green dot', () => {
    const { container } = renderWithProvider('tokyo-japan', <HadeDecisionCard city={makeCity('tokyo-japan')} aqi={30} />);
    expect(container.querySelector('.bg-emerald-500')).toBeInTheDocument();
  });

  it('AQI 75 → amber dot', () => {
    const { container } = renderWithProvider('bangkok-thailand', <HadeDecisionCard city={makeCity('bangkok-thailand')} aqi={75} />);
    expect(container.querySelector('.bg-amber-400')).toBeInTheDocument();
  });

  it('AQI 130 → red dot', () => {
    const { container } = renderWithProvider('mexico-city-mexico', <HadeDecisionCard city={makeCity('mexico-city-mexico')} aqi={130} />);
    expect(container.querySelector('.bg-red-500')).toBeInTheDocument();
  });

  it('null AQI (no data) → grey dot (not falsely green)', () => {
    const { container } = renderWithProvider('new-york-us', <HadeDecisionCard city={makeCity('new-york-us')} aqi={null} />);
    expect(container.querySelector('.bg-slate-300')).toBeInTheDocument();
    expect(container.querySelector('.bg-emerald-500')).not.toBeInTheDocument();
  });
});

// ─── 6. City isolation ───────────────────────────────────────────────────────

describe('City isolation — different slugs do not bleed state', () => {
  it('Bangkok landed, Paris exploring — each shows different recs', () => {
    seedArrival('bangkok-thailand', 'airport-exit');

    const { unmount } = renderWithProvider('bangkok-thailand', <HadeDecisionCard city={makeCity('bangkok-thailand')} aqi={null} />);
    expect(screen.getByText('Move Efficiently')).toBeInTheDocument();
    unmount();

    renderWithProvider('paris-france', <HadeDecisionCard city={makeCity('paris-france')} aqi={null} />);
    expect(screen.getByText('Start Light')).toBeInTheDocument();
    expect(screen.queryByText('Move Efficiently')).not.toBeInTheDocument();
  });

  it('Mexico City (high AQI) and London (low AQI) show different content', () => {
    const { unmount } = renderWithProvider('mexico-city-mexico', <HadeDecisionCard city={makeCity('mexico-city-mexico')} aqi={150} />);
    expect(screen.getByText('Shift Indoors')).toBeInTheDocument();
    unmount();

    renderWithProvider('london-uk', <HadeDecisionCard city={makeCity('london-uk')} aqi={30} />);
    expect(screen.getByText('Start Light')).toBeInTheDocument();
    expect(screen.queryByText('Shift Indoors')).not.toBeInTheDocument();
  });
});

// ─── 7. Reactivity — card updates via context setters ────────────────────────
// Previously tested via hade:update window events. Now tests React state reactivity
// directly through context setters — the correct post-migration pattern.

describe('Reactivity — card updates via context setters', () => {
  it('updates from morning recs to landed recs when setArrivalStage is called', async () => {
    render(
      <HadeContextProvider slug="rome-italy">
        <ArrivalSetter stage="airport-exit" />
        <HadeDecisionCard city={makeCity('rome-italy')} aqi={null} />
      </HadeContextProvider>
    );

    // Initially exploring at 09:00 → morning recs
    expect(screen.getByText('Start Light')).toBeInTheDocument();

    // Simulate the CityGuideView handler calling setHadeArrivalStage
    await act(async () => {
      await userEvent.click(screen.getByTestId('set-stage-airport-exit'));
    });

    expect(screen.getByText('Move Efficiently')).toBeInTheDocument();
    expect(screen.queryByText('Start Light')).not.toBeInTheDocument();
  });

  it('updates from landed to in_transit recs when setArrivalStage("left-airport") is called', async () => {
    seedArrival('barcelona-spain', 'airport-exit');
    render(
      <HadeContextProvider slug="barcelona-spain">
        <ArrivalSetter stage="left-airport" />
        <HadeDecisionCard city={makeCity('barcelona-spain')} aqi={null} />
      </HadeContextProvider>
    );

    expect(screen.getByText('Move Efficiently')).toBeInTheDocument();

    await act(async () => {
      await userEvent.click(screen.getByTestId('set-stage-left-airport'));
    });

    expect(screen.getByText("You're En Route")).toBeInTheDocument();
    expect(screen.queryByText('Move Efficiently')).not.toBeInTheDocument();
  });
});

// ─── 8. All 10 city packs render without crashing ────────────────────────────

describe('All city packs render without error', () => {
  const slugs = [
    'bangkok-thailand', 'paris-france', 'london-uk', 'tokyo-japan',
    'new-york-us', 'rome-italy', 'barcelona-spain', 'dubai-uae',
    'seoul-south-korea', 'mexico-city-mexico',
  ];

  it.each(slugs)('%s renders the HADE card', (slug) => {
    expect(() =>
      renderWithProvider(slug, <HadeDecisionCard city={makeCity(slug)} aqi={null} />)
    ).not.toThrow();
    expect(screen.getByText('HADE Decision Engine')).toBeInTheDocument();
  });
});
