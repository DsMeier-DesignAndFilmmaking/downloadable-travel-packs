interface NativePlatformPreviewProps {
  className?: string;
}

interface PlatformCardConfig {
  id: 'ios' | 'android';
  title: string;
  ariaLabel: string;
  optimizationCopy: string;
  runtimeCopy: string;
}

const PLATFORM_CARDS: PlatformCardConfig[] = [
  {
    id: 'ios',
    title: 'iOS Native App',
    ariaLabel: 'iOS native app in development',
    optimizationCopy: 'Optimized for offline city packs.',
    runtimeCopy: 'Built for real-time exploration.',
  },
  {
    id: 'android',
    title: 'Android Native App',
    ariaLabel: 'Android native app in development',
    optimizationCopy: 'Optimized for offline city packs.',
    runtimeCopy: 'Designed for field use.',
  },
];

function AppleLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M16.36 12.93c-.02-2.18 1.78-3.23 1.86-3.28-1.02-1.49-2.6-1.69-3.17-1.71-1.35-.14-2.64.79-3.32.79-.69 0-1.75-.77-2.88-.75-1.48.02-2.85.86-3.61 2.19-1.54 2.67-.39 6.61 1.11 8.78.73 1.06 1.6 2.25 2.74 2.2 1.1-.05 1.52-.71 2.85-.71 1.34 0 1.72.71 2.87.68 1.19-.02 1.94-1.07 2.66-2.13.84-1.22 1.19-2.41 1.21-2.47-.03-.02-2.31-.89-2.32-3.59Z"
      />
      <path
        fill="currentColor"
        d="M14.17 6.5c.6-.73 1.01-1.73.9-2.75-.86.03-1.9.57-2.52 1.29-.56.64-1.05 1.66-.92 2.64.96.07 1.94-.49 2.54-1.18Z"
      />
    </svg>
  );
}

function AndroidLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M7.7 8.18 6.42 5.95a.55.55 0 1 1 .95-.55l1.3 2.25a8.22 8.22 0 0 1 6.66 0l1.3-2.25a.55.55 0 0 1 .95.55L16.3 8.18c1.24.72 2.05 1.86 2.05 3.14H5.65c0-1.28.81-2.42 2.05-3.14Zm.96 5.03h1.2v5.35h-1.2a1.1 1.1 0 0 1-1.1-1.1v-3.15a1.1 1.1 0 0 1 1.1-1.1Zm6.48 0h1.2a1.1 1.1 0 0 1 1.1 1.1v3.15a1.1 1.1 0 0 1-1.1 1.1h-1.2v-5.35ZM10.52 6.7a.48.48 0 1 0 0 .96.48.48 0 0 0 0-.96Zm2.96 0a.48.48 0 1 0 0 .96.48.48 0 0 0 0-.96Zm-6.6 5.5h10.24v6.04a1.6 1.6 0 0 1-1.6 1.6H8.48a1.6 1.6 0 0 1-1.6-1.6V12.2Z"
      />
    </svg>
  );
}

function PlatformIcon({ id }: { id: PlatformCardConfig['id'] }) {
  if (id === 'ios') return <AppleLogo />;
  return <AndroidLogo />;
}

export default function NativePlatformPreview({ className = '' }: NativePlatformPreviewProps) {
  return (
    <section aria-label="Native platform capability preview" className={className}>
      <div className="mx-auto w-full max-w-4xl">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Platform Capability Preview
        </p>
        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
          Native builds in progress for offline-first field workflows.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          {PLATFORM_CARDS.map((platform) => (
            <div
              key={platform.id}
              role="group"
              aria-label={platform.ariaLabel}
              aria-disabled="true"
              tabIndex={0}
              className="
                rounded-2xl border border-slate-200 bg-white p-5 shadow-sm cursor-default select-none
                transition-[filter,background-color,border-color] duration-200 hover:brightness-[1.02]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50
                dark:border-slate-700 dark:bg-slate-900 dark:hover:brightness-[1.03] dark:focus-visible:ring-amber-400/40
              "
            >
              {/* Reuses pack-module primitives: neutral surface, thin border, rounded-2xl, and low-elevation shadow. */}
              <div className="flex items-start gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                  <PlatformIcon id={platform.id} />
                </div>
                <div>
                  <h3 className="text-[15px] font-medium text-slate-900 dark:text-slate-100">
                    {platform.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Native build in progress
                  </p>
                </div>
              </div>

              <dl className="mt-5 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Status
                  </dt>
                  <dd className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                    {/* Amber status dot mirrors existing syncing/building semantic in the product system. */}
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                    In Development
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Launch Window
                  </dt>
                  <dd className="text-xs font-medium text-slate-700 dark:text-slate-200">
                    Upcoming
                  </dd>
                </div>
              </dl>

              <div className="my-4 h-px bg-slate-200 dark:bg-slate-700" />

              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {platform.optimizationCopy}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {platform.runtimeCopy}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Cards are keyboard-focusable informational groups (not buttons/links) to preserve non-interactive semantics. */}
    </section>
  );
}
