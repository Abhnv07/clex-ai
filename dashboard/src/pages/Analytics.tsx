import { useEffect, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import PageIntro from '../components/PageIntro';
import PanelState from '../components/PanelState';
import StatCard from '../components/StatCard';
import { formatCompactNumber, formatUsd } from '../lib/format';
import { getApiErrorMessage, getAnalytics } from '../services/api';
import type { AnalyticsResponse } from '../types/api';

const COLORS = ['#22d3ee', '#34d399', '#a78bfa', '#fbbf24', '#f87171', '#38bdf8', '#4ade80'];

const emptyAnalytics: AnalyticsResponse = {
  period: {
    days: 30,
    since: new Date().toISOString(),
  },
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

export default function Analytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsResponse>(emptyAnalytics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getAnalytics(days)
      .then((response) => {
        if (cancelled) return;
        setData(response);
        setError(null);
      })
      .catch((requestError) => {
        if (cancelled) return;
        setError(getApiErrorMessage(requestError));
        setData(emptyAnalytics);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [days]);

  if (loading) {
    return (
      <PanelState
        loading
        title="Loading analytics"
        message="Aggregating request counts, token totals, and cost trends for your dashboard."
      />
    );
  }

  if (error) {
    return (
      <PanelState
        title="Analytics unavailable"
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
  const pieData = data.top_models.map((model) => ({
    name: model.model.split('/').pop() || model.model,
    value: model.cost,
  }));
  const projectedMonthlyCost = data.daily.length ? (overview.total_cost / data.daily.length) * 30 : 0;

  return (
    <div className="space-y-6">
      <PageIntro
        tone="violet"
        eyebrow="Analytics"
        title="Break usage down by day, model, and cost."
        description="Use the live analytics endpoint to verify which models are driving volume, where spend is concentrated, and how traffic changes over time."
        action={(
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1">
            {[7, 14, 30, 90].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDays(value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  days === value
                    ? 'bg-white text-black'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {value}d
              </button>
            ))}
          </div>
        )}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Requests" value={formatCompactNumber(overview.total_requests)} icon={<span className="text-black">R</span>} color="gold" />
        <StatCard label="Tokens" value={formatCompactNumber(overview.total_tokens)} subValue={`${formatCompactNumber(overview.prompt_tokens)} in / ${formatCompactNumber(overview.completion_tokens)} out`} icon={<span className="text-black">T</span>} color="gold" />
        <StatCard label="Spend" value={formatUsd(overview.total_cost)} subValue={`Projected ${formatUsd(projectedMonthlyCost)} / mo`} icon={<span className="text-black">$</span>} color="purple" />
        <StatCard label="Avg Latency" value={`${overview.avg_duration_ms}ms`} subValue={`${overview.error_rate.toFixed(2)}% error rate`} icon={<span className="text-black">L</span>} color="amber" />
      </div>

      {data.daily.length ? (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
            <div className="glass-card rounded-[28px] p-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-gray-500">Daily requests</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.daily}>
                    <defs>
                      <linearGradient id="analyticsRequests" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(value: string) => value.slice(5)} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={formatCompactNumber} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="requests" stroke="#22d3ee" fill="url(#analyticsRequests)" strokeWidth={2} name="Requests" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card rounded-[28px] p-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-gray-500">Cost by model</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} strokeWidth={0}>
                      {pieData.map((entry, index) => (
                        <Cell key={`${entry.name}-${COLORS[index % COLORS.length]}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
            <div className="glass-card rounded-[28px] p-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-gray-500">Token throughput</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.top_models}>
                    <XAxis dataKey="model" hide />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={formatCompactNumber} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="tokens" radius={[10, 10, 0, 0]} name="Tokens">
                      {data.top_models.map((model, index) => (
                        <Cell key={model.model} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card rounded-[28px] p-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-gray-500">Model ranking</h2>
              <div className="space-y-4">
                {data.top_models.map((model) => {
                  const total = overview.total_requests || 1;
                  return (
                    <div key={model.model}>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium text-white">{model.model}</span>
                        <span className="text-xs text-gray-500">{((model.requests / total) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#c9a96e] to-[#d4b87a]"
                          style={{ width: `${(model.requests / total) * 100}%` }}
                        />
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        {formatCompactNumber(model.requests)} requests · {formatCompactNumber(model.tokens)} tokens · {formatUsd(model.cost, 4)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : (
        <PanelState
          title="Analytics will fill in automatically"
          message="Once the backend logs real usage, this page will start showing live daily trends, token throughput, and cost concentration."
        />
      )}
    </div>
  );
}
