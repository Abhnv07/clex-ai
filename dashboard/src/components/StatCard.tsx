import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: ReactNode;
  color?: 'gold' | 'emerald' | 'purple' | 'amber';
}

const colorMap = {
  gold: 'from-[#c9a96e] to-[#d4b87a]',
  emerald: 'from-emerald-400 to-emerald-600',
  purple: 'from-purple-400 to-purple-600',
  amber: 'from-amber-400 to-amber-600',
};

const glowMap = {
  gold: 'rgba(201,169,110,0.15)',
  emerald: 'rgba(52,211,153,0.15)',
  purple: 'rgba(168,85,247,0.15)',
  amber: 'rgba(251,191,36,0.15)',
};

export default function StatCard({ label, value, subValue, icon, color = 'gold' }: StatCardProps) {
  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center`}
          style={{ boxShadow: `0 0 20px ${glowMap[color]}` }}
        >
          {icon}
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-[#c9a96e] animate-pulse opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
      <div className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">{label}</div>
      {subValue && <div className="text-xs text-gray-600 mt-1">{subValue}</div>}
    </div>
  );
}
