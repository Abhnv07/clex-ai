import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Clock3, DollarSign, KeyRound, Zap } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import PageIntro from '../components/PageIntro';
import PanelState from '../components/PanelState';
import StatCard from '../components/StatCard';
import { formatCompactNumber, formatUsd, timeAgo } from '../lib/format';
import { getApiErrorMessage, getAnalytics } from '../services/api';
import type { AnalyticsResponse } from '../types/api';

type OverviewData = Pick<AnalyticsResponse, 'overview' | 'daily' | 'top_models' | 'recent_requests'>;

const emptyOverview: OverviewData = {
  overview: {
    total_requests: 0,
    total_tokens: 0,
    total_cost: 0,
    avg_duration_ms: 0,
    error_rate: 0,
    active_api_keys: 0,
    prompt_tokens: 0,
    completion_tokens: 0,
  },
  daily: [],
  top_models: [],
  recent_requests: [],
};

const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="glass-card rounded-xl border border-white/10 p-3 text-xs">
      <div className="mb-1 text-gray-400">{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="font-semibold text-white">
          {entry.name}: {entry.name.includes('Cost') ? formatUsd(entry.value, 4) : formatCompactNumber(entry.value)}
        </div>
      ))}
    </div>
  );
};

export default function Overview() {
  const [data, setData] = useState<OverviewData>(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getAnalytics(30)
      .then((response) => {
        if (cancelled) return;
        setData({
          overview: response.overview,
          daily: response.daily,
          top_models: response.top_models,
          recent_requests: response.recent_requests,
        });
        setError(null);
      })
      .catch((requestError) => {
        if (cancelled) return;
        setError(getApiErrorMessage(requestError));
        setData(emptyOverview);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <PanelState
        loading
        title="Loading overview"
        message="Pulling request volume, cost, and key activity from the backend."
      />
    );
  }

  if (error) {
    return (
      <PanelState
        title="Overview unavailable"
        message={error}
        action={
          <button type="button" className="btn-secondary" onClick={() => window.location.reload()}>
            Retry
          </button>
        }
      />
    );
  }

  const overview = data.overview;

  return (
    <div className="space-y-6">
      <PageIntro
        tone="gold"
        eyebrow="Overview"
        title="One view for keys, costs, and request health."
        description="This mirrors the CLEX site shell, but every metric on this screen comes from the authenticated backend instead of placeholder dashboard data."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Total Requests" value={formatCompactNumber(overview.total_requests)} icon={<Activity size={18} className="text-black" />} color="gold" />
        <StatCard label="Total Tokens" value={formatCompactNumber(overview.total_tokens)} subValue={`${formatCompactNumber(overview.prompt_tokens)} in / ${formatCompactNumber(overview.completion_tokens)} out`} icon={<Zap size={18} className="text-black" />} color="gold" />
        <StatCard label="Spend" value={formatUsd(overview.total_cost)} icon={<DollarSign size={18} className="text-black" />} color="purple" />
        <StatCard label="Active Keys" value={overview.active_api_keys} icon={<KeyRound size={18} className="text-black" />} color="amber" />
        <StatCard label="Avg Latency" value={`${overview.avg_duration_ms}ms`} icon={<Clock3 size={18} className="text-black" />} color="gold" />
        <StatCard label="Error Rate" value={`${overview.error_rate.toFixed(2)}%`} icon={<AlertTriangle size={18} className="text-black" />} color="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="glass-card rounded-[28px] p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-gray-500">Request volume</h2>
          {data.daily.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.daily}>
                  <defs>
                    <linearGradient id="overviewRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(value: string) => value.slice(5)} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={formatCompactNumber} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="requests" stroke="#22d3ee" fill="url(#overviewRequests)" strokeWidth={2} name="Requests" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <PanelState title="No traffic yet" message="Once requests start flowing through the API, daily request volume will show up here." />
          )}
        </div>

        <div className="glass-card rounded-[28px] p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-gray-500">Recent requests</h2>
          {data.recent_requests.length ? (
            <div className="space-y-3">
              {data.recent_requests.slice(0, 6).map((request) => (
                <div key={request.id} className="rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-white">{request.model}</div>
                      <div className="mt-1 text-xs text-gray-500">{timeAgo(request.created_at)}</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                      request.status < 300 ? 'bg-[#c9a96e]/10 text-[#c9a96e]' : request.status < 500 ? 'bg-amber-500/10 text-amber-300' : 'bg-red-500/10 text-red-300'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-400">
                    <span>{formatCompactNumber(request.total_tokens)} tokens</span>
                    <span>{request.duration_ms}ms</span>
                    <span>{formatUsd(request.estimated_cost, 4)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <PanelState title="No requests recorded" message="Run your first authenticated `/v1/chat/completions` request to populate this feed." />
          )}
        </div>
      </div>

      <div className="glass-card rounded-[28px] p-6">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-gray-500">Top models</h2>
        {data.top_models.length ? (
          <div className="space-y-4">
            {data.top_models.map((model) => {
              const maxRequests = Math.max(...data.top_models.map((entry) => entry.requests));
              const width = maxRequests ? (model.requests / maxRequests) * 100 : 0;
              return (
                <div key={model.model}>
                  <div className="mb-1 flex items-center justify-between gap-4">
                    <span className="truncate text-sm font-medium text-white">{model.model}</span>
                    <span className="text-xs text-gray-500">
                      {formatCompactNumber(model.requests)} req · {formatUsd(model.cost, 4)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#c9a96e] to-[#d4b87a]"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <PanelState title="Model usage will appear here" message="As soon as the backend starts logging successful requests, the most-used models will be ranked here." />
        )}
      </div>
    </div>
  );
}
