export default function ImpactLedgerSkeleton() {
  return (
    <div
      className="relative overflow-hidden border border-slate-300 bg-[#f9f8f2] px-5 py-6 shadow-[0_10px_25px_rgba(15,23,42,0.08)]"
      style={{ borderRadius: '26px 22px 30px 20px / 20px 30px 22px 28px' }}
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.18) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
      <div className="relative z-10 animate-pulse space-y-4">
        <div className="h-3 w-36 rounded bg-slate-200" />
        <div className="h-7 w-64 rounded bg-slate-200" />
        <div className="h-4 w-40 rounded bg-slate-200" />
        <div className="space-y-3">
          <div className="h-20 w-full rounded-xl bg-slate-200" />
          <div className="h-20 w-full rounded-xl bg-slate-200" />
          <div className="h-20 w-full rounded-xl bg-slate-200" />
        </div>
        <div className="h-4 w-11/12 rounded bg-slate-200" />
      </div>
    </div>
  );
}
