/**
 * AgenticValueProp — Superior marketing hero for landing/onboarding.
 * Three columns: Compliance Autopilot, Friction Masking, Real-Time Shield.
 * Deep charcoal + emerald palette; sequential fade-in via Framer Motion.
 */

import { motion, type Variants } from 'framer-motion';
import { Shield, Layers, Zap } from 'lucide-react';

const COLUMNS = [
  {
    id: 'compliance',
    icon: Shield,
    title: 'Compliance Autopilot',
    tagline: 'We watch the borders, you watch the views.',
  },
  {
    id: 'friction',
    icon: Layers,
    title: 'Friction Masking',
    tagline: 'Skip the digital bureaucracy.',
  },
  {
    id: 'shield',
    icon: Zap,
    title: 'Real-Time Shield',
    tagline: 'Instant detours for heat, crowds, and delays.',
  },
] as const;

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1,
    },
  },
};

const columnVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function AgenticValueProp() {
  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="rounded-2xl border border-emerald-800/40 bg-[#1c1f20] p-6 shadow-xl md:p-8 ring-1 ring-emerald-900/20"
      aria-label="Why Travel Packs"
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const Icon = col.icon;
          return (
            <motion.div
              key={col.id}
              variants={columnVariants}
              className="flex flex-col items-start text-left"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20">
                <Icon size={20} aria-hidden />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                {col.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                {col.tagline}
              </p>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
