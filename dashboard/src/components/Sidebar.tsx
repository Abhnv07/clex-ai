import { NavLink } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  ExternalLink,
  Key,
  LayoutDashboard,
  ScrollText,
  ShieldCheck,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/keys', icon: Key, label: 'API Keys', end: false },
  { to: '/usage', icon: ScrollText, label: 'Usage Logs', end: false },
  { to: '/analytics', icon: BarChart3, label: 'Analytics', end: false },
];

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="dashboard-sidebar glass-card sticky top-28 overflow-hidden rounded-[28px] p-4">
      <div className="mb-5 border-b border-white/6 px-2 pb-5">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#c9a96e]/20 bg-[#c9a96e]/10 px-3 py-1">
          <Activity size={12} className="text-[#c9a96e]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#c9a96e]">
            Developer Control
          </span>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#c9a96e] to-[#d4b87a] shadow-[0_0_18px_rgba(201,169,110,0.25)]">
            <span className="text-sm font-extrabold text-black">C</span>
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight text-white">CLEX Dashboard</div>
            <div className="mt-1 text-sm leading-relaxed text-gray-400">
              Same CLEX shell, now wired for keys, usage, and analytics.
            </div>
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-2 px-1">
        {links.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `dashboard-nav-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-6 rounded-2xl border border-white/6 bg-white/[0.03] p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
          <ShieldCheck size={13} className="text-[#c9a96e]" />
          Session
        </div>
        <div className="text-sm font-medium text-white">{user?.displayName || 'CLEX developer'}</div>
        <div className="mt-1 break-all text-xs leading-relaxed text-gray-400">{user?.email}</div>
      </div>

      <div className="mt-4 flex flex-col gap-1 border-t border-white/5 px-1 pt-4">
        <a href="https://ai.clex.in/docs.html" target="_blank" rel="noreferrer" className="dashboard-utility-link">
          <ExternalLink size={16} />
          <span>API Docs</span>
        </a>
        <a href="https://ai.clex.in" target="_blank" rel="noreferrer" className="dashboard-utility-link">
          <ExternalLink size={16} />
          <span>clex.in</span>
        </a>
      </div>
    </aside>
  );
}
