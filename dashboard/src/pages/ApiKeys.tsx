import { useEffect, useState } from 'react';
import { Check, Copy, Plus, Shield, Trash2 } from 'lucide-react';

import PageIntro from '../components/PageIntro';
import PanelState from '../components/PanelState';
import { formatShortDate } from '../lib/format';
import { createApiKey, getApiErrorMessage, listApiKeys, revokeApiKey } from '../services/api';
import type { ApiKeyItem } from '../types/api';

export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    listApiKeys()
      .then((response) => {
        if (cancelled) return;
        setKeys(response.data);
        setError(null);
      })
      .catch((requestError) => {
        if (cancelled) return;
        setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;

    try {
      const response = await createApiKey(newKeyName.trim());
      setCreatedKey(response.key);
      setKeys((current) => [
        {
          id: response.id,
          name: response.name,
          prefix: response.prefix,
          created_at: response.created_at,
          last_used: null,
          revoked_at: null,
          expires_at: response.expires_at,
          status: 'active',
        },
        ...current,
      ]);
      setNewKeyName('');
      setError(null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeApiKey(id);
      setKeys((current) => current.map((item) => (
        item.id === id
          ? { ...item, status: 'revoked', revoked_at: new Date().toISOString() }
          : item
      )));
      setRevokeConfirm(null);
      setError(null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  };

  const handleCopy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-6">
      <PageIntro
        tone="gold"
        eyebrow="API Keys"
        title="Create, reveal once, revoke fast."
        description="Dashboard key management now stays inside the same CLEX visual shell as the public site, while the backend keeps the one-time raw key reveal."
        action={(
          <button type="button" className="btn-primary flex items-center gap-2" onClick={() => { setShowCreate(true); setCreatedKey(null); }}>
            <Plus size={16} />
            Create Key
          </button>
        )}
      />

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {showCreate ? (
        <div className="glass-card rounded-[28px] p-6">
          {!createdKey ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Create a new API key</h2>
              <p className="max-w-2xl text-sm leading-relaxed text-gray-400">
                Generate a named credential for your app or environment. The raw key is shown only once.
              </p>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Key name
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(event) => setNewKeyName(event.target.value)}
                  className="login-input !px-4"
                  placeholder="Production, staging, playground, local"
                  autoFocus
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" className="btn-primary" disabled={!newKeyName.trim()} onClick={() => void handleCreate()}>
                  Generate key
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#c9a96e]/10 text-[#c9a96e]">
                  <Check size={18} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Key created</h2>
                  <p className="text-sm text-gray-400">Copy it now. You will not be able to reveal it again later.</p>
                </div>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-200">
                  <Shield size={14} />
                  One-time secret
                </div>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <code className="flex-1 break-all rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-[#c9a96e]">
                    {createdKey}
                  </code>
                  <button type="button" className="btn-secondary flex items-center justify-center gap-2" onClick={() => void handleCopy(createdKey)}>
                    {copied ? <Check size={15} className="text-[#c9a96e]" /> : <Copy size={15} />}
                    {copied ? 'Copied' : 'Copy key'}
                  </button>
                </div>
              </div>
              <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
                Done
              </button>
            </div>
          )}
        </div>
      ) : null}

      {loading ? (
        <PanelState loading title="Loading API keys" message="Fetching the keys attached to your authenticated dashboard account." />
      ) : (
        <div className="glass-card overflow-hidden rounded-[28px]">
          <div className="border-b border-white/6 px-6 py-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500">Current keys</h2>
          </div>
          {keys.length === 0 ? (
            <PanelState title="No keys yet" message="Create your first key to start calling `/v1/chat/completions` from your app." />
          ) : (
            <div className="divide-y divide-white/5">
              {keys.map((key) => (
                <div key={key.id} className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className={`mt-1 h-2.5 w-2.5 rounded-full ${key.status === 'active' ? 'bg-[#c9a96e]' : key.status === 'expired' ? 'bg-amber-400' : 'bg-gray-500'}`} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white">{key.name}</div>
                      <div className="mt-1 break-all font-mono text-xs text-gray-500">
                        {key.prefix}
                        ...••••••••••••••••
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 lg:justify-end">
                    <div className="text-xs text-gray-400">
                      <div>Created {formatShortDate(key.created_at)}</div>
                      <div className="mt-1 text-gray-500">Last used {formatShortDate(key.last_used)}</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                      key.status === 'active'
                        ? 'bg-[#c9a96e]/10 text-[#c9a96e]'
                        : key.status === 'expired'
                          ? 'bg-amber-500/10 text-amber-300'
                          : 'bg-gray-500/10 text-gray-300'
                    }`}>
                      {key.status}
                    </span>
                    {key.status === 'active' ? (
                      revokeConfirm === key.id ? (
                        <div className="flex items-center gap-2">
                          <button type="button" className="btn-danger" onClick={() => void handleRevoke(key.id)}>
                            Confirm revoke
                          </button>
                          <button type="button" className="btn-secondary" onClick={() => setRevokeConfirm(null)}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-300"
                          onClick={() => setRevokeConfirm(key.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      )
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
