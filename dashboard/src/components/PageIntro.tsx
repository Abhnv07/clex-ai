import type { ReactNode } from 'react';

type Tone = 'gold' | 'emerald' | 'violet' | 'amber';

const toneClasses: Record<Tone, { badge: string; dot: string }> = {
  gold: {
    badge: 'bg-[#c9a96e]/10 border-[#c9a96e]/30 text-[#c9a96e]',
    dot: 'bg-[#c9a96e]',
  },
  emerald: {
    badge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200',
    dot: 'bg-emerald-300',
  },
  violet: {
    badge: 'bg-violet-500/10 border-violet-500/30 text-violet-200',
    dot: 'bg-violet-300',
  },
  amber: {
    badge: 'bg-amber-500/10 border-amber-500/30 text-amber-200',
    dot: 'bg-amber-300',
  },
};

export default function PageIntro({
  tone,
  eyebrow,
  title,
  description,
  action,
}: {
  tone: Tone;
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const toneStyle = toneClasses[tone];

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-3xl">
        <div className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 ${toneStyle.badge}`}>
          <div className={`h-1.5 w-1.5 rounded-full ${toneStyle.dot}`} />
          <span className="text-xs font-semibold uppercase tracking-[0.2em]">{eyebrow}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-400 md:text-lg">
          {description}
        </p>
      </div>
      {action ? <div className="flex items-center gap-3">{action}</div> : null}
    </div>
  );
}
