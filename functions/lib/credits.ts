// ═══════════════════════════════════════════════════════════════════════════
// Credit cost table.
//
// Every chat completion charges N credits. Daily credit caps live on plans
// (see plans.ts → PLAN_LIMITS.creditsPerDay) and reset at 00:00 UTC.
//
// Tiers — pick by model size / class. Anything not in the explicit map below
// falls back to DEFAULT_MODEL_COST so adding a new model never breaks the API.
//
//   1 credit  →  small / utility / embedding / safety / rerank (≤ ~9B)
//   2 credits →  mid-size text & code (~10–35B, plus small MoE A3B)
//   3 credits →  big dense or 49–123B + 80B-A3B thinking
//   5 credits →  premium 200B+ MoE, 250B+ dense, multimodal video
//
// Keep this in sync with public_assets/models-data.js (which advertises the
// same number under each model's `credits` field). The server is the source
// of truth — clients can be slightly out of date without breaking quotas.
// ═══════════════════════════════════════════════════════════════════════════

export type CreditCost = 1 | 2 | 3 | 5;

export const DEFAULT_MODEL_COST: CreditCost = 1;

// Explicit per-model overrides. All keys MUST be the exact nvidiaId we send
// upstream (e.g. "qwen/qwen3-coder-480b-a35b-instruct"). Lookups are case-
// insensitive — see creditCostFor().
export const MODEL_CREDIT_COST: Record<string, CreditCost> = {
  // ── 5 credits — premium 200B+ MoE / 250B+ dense / multimodal vision ────
  'moonshotai/kimi-k2-instruct': 5,
  'moonshotai/kimi-k2-instruct-0905': 5,
  'moonshotai/kimi-k2.5': 5,
  'qwen/qwen3.5-397b-a17b': 5,
  'qwen/qwen3-coder-480b-a35b-instruct': 5,
  'deepseek-ai/deepseek-v3.1': 5,
  'deepseek-ai/deepseek-v3.1-terminus': 5,
  'deepseek-ai/deepseek-v3.2': 5,
  'meta/llama-4-maverick-17b-128e-instruct': 5,
  'nvidia/llama-3.1-nemotron-ultra-253b-v1': 5,
  'meta/llama-3.1-405b-instruct': 5,
  'mistralai/mixtral-8x22b-instruct-v0.1': 5,
  'igenius/colosseum-355b-instruct-16k': 5,
  'abacusai/dracarys-llama-3.1-70b-instruct': 5,

  // ── 3 credits — large 49–123B / 80B-A3B thinking / multimodal vision ──
  'qwen/qwen3.5-122b-a10b': 3,
  'qwen/qwen3-next-80b-a3b-instruct': 3,
  'qwen/qwen3-next-80b-a3b-thinking': 3,
  'nvidia/llama-3.3-nemotron-super-49b-v1': 3,
  'nvidia/llama-3.3-nemotron-super-49b-v1.5': 3,
  'meta/llama-4-scout-17b-16e-instruct': 3,
  'meta/llama-3.3-70b-instruct': 3,
  'meta/llama-3.1-70b-instruct': 3,
  'meta/llama3-70b-instruct': 3,
  'tokyotech-llm/llama-3.1-swallow-70b-instruct-v0.1': 3,
  'nvidia/llama-3.1-nemotron-70b-reward': 3,
  'zhipuai/glm5': 3,
  'zhipuai/glm4.7': 3,
  'moonshotai/kimi-k2-thinking': 3,
  'stepfun-ai/step-3.5-flash': 3,
  'minimaxai/minimax-m2.1': 3,
  'minimaxai/minimax-m2.5': 3,
  'mistralai/devstral-2-123b-instruct-2512': 3,
  'stockmark/stockmark-2-100b-instruct': 3,
  'nvidia/cosmos-nemotron-34b': 3,
  'mistralai/mixtral-8x7b-instruct': 3,

  // ── 2 credits — mid 10–35B + small MoE A3B ─────────────────────────────
  'nvidia/nemotron-3-nano-30b-a3b': 2,
  'deepseek-ai/deepseek-r1-distill-qwen-32b': 2,
  'mistralai/mistral-medium-3-instruct': 2,
  'mistralai/magistral-small-2506': 2,
  'mistralai/mistral-nemotron': 2,
  'mistralai/mistral-small-3.1-24b-instruct-2503': 2,
  'mistralai/mistral-small-24b-instruct': 2,
  'bytedance/seed-oss-36b-instruct': 2,
  'mistralai/ministral-14b-instruct-2512': 2,
  'speakleash/bielik-11b-v2.6-instruct': 2,
  'sarvamai/sarvam-m': 2,
  'meta/llama-guard-4-12b': 2,
  'deepseek-ai/deepseek-r1-distill-qwen-14b': 2,
  'igenius/italia-10b-instruct-16k': 2,
  'upstage/solar-10.7b-instruct': 2,
  'google/gemma-2-27b-it': 2,
  'microsoft/phi-3-medium-4k-instruct': 2,
  'microsoft/phi-3-medium-128k-instruct': 2,

  // ── 1 credit — everything else (≤9B / utility / safety / embedding) ────
  // We don't list each one explicitly — they fall through to
  // DEFAULT_MODEL_COST. This keeps the table small and makes it obvious
  // which models cost more than baseline.
};

// Look up the credit cost for a model id. Falls back to DEFAULT_MODEL_COST.
// Case-insensitive so callers don't have to canonicalise.
export function creditCostFor(modelId: string | null | undefined): CreditCost {
  if (!modelId) return DEFAULT_MODEL_COST;
  const key = modelId.trim().toLowerCase();
  // Try exact (lowercased) match first.
  for (const id in MODEL_CREDIT_COST) {
    if (id.toLowerCase() === key) return MODEL_CREDIT_COST[id];
  }
  return DEFAULT_MODEL_COST;
}

// Friendly tier name for the UI.
export function creditTierName(cost: CreditCost): string {
  switch (cost) {
    case 1:
      return 'Cheap';
    case 2:
      return 'Standard';
    case 3:
      return 'Large';
    case 5:
      return 'Premium';
  }
}

// Snapshot used by /api/credits/pricing so dashboards / docs / models page
// can all render the same numbers without bundling this file client-side.
export function pricingSnapshot(): {
  default_cost: CreditCost;
  tiers: Array<{ cost: CreditCost; label: string; description: string }>;
  models: Array<{ model: string; cost: CreditCost }>;
} {
  return {
    default_cost: DEFAULT_MODEL_COST,
    tiers: [
      { cost: 1, label: 'Cheap', description: '≤9B params · utility / safety / embedding / rerank' },
      { cost: 2, label: 'Standard', description: '10–35B + small MoE-A3B · everyday text & code' },
      { cost: 3, label: 'Large', description: '49–123B + 80B-A3B thinking · heavier reasoning & long context' },
      { cost: 5, label: 'Premium', description: '200B+ MoE / 250B+ dense / multimodal video' },
    ],
    models: Object.entries(MODEL_CREDIT_COST)
      .map(([model, cost]) => ({ model, cost }))
      .sort((a, b) => (a.cost === b.cost ? a.model.localeCompare(b.model) : a.cost - b.cost)),
  };
}
