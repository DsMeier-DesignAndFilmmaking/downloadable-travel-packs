/**
 * TransportMatrixCard — arrival transport options: cheapest, fastest, door-to-door, comfort.
 * Pure display; renders nothing if transportMatrix is missing.
 */

export interface TransportMatrix {
  cheapest?: string;
  fastest_traffic?: string;
  door_to_door?: string;
  comfort_luggage?: string;
}

export interface TransportMatrixCardProps {
  transportMatrix?: TransportMatrix | null;
}

const ROWS: { key: keyof TransportMatrix; label: string }[] = [
  { key: 'cheapest', label: 'Cheapest' },
  { key: 'fastest_traffic', label: 'Fastest (Traffic)' },
  { key: 'door_to_door', label: 'Door-to-door' },
  { key: 'comfort_luggage', label: 'Comfort (Luggage)' },
];

export default function TransportMatrixCard({ transportMatrix }: TransportMatrixCardProps) {
  if (transportMatrix == null || typeof transportMatrix !== 'object') {
    return null;
  }

  const hasAny = ROWS.some(
    ({ key }) => typeof transportMatrix[key] === 'string' && (transportMatrix[key] as string).trim() !== ''
  );
  if (!hasAny) {
    return null;
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 md:p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        Transport Matrix
      </p>
      <div className="mt-3 space-y-0.5">
        {ROWS.map(({ key, label }) => {
          const value = transportMatrix[key];
          const text = typeof value === 'string' ? value.trim() : '';
          if (text === '') return null;
          return (
            <div
              key={key}
              className="border-b border-neutral-100 py-2 last:border-b-0 last:pb-0"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                {label}
              </p>
              <p className="mt-0.5 text-sm font-medium text-[#222222] leading-relaxed tracking-[0.01em]">
                {text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
