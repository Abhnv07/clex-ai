// ═══════════════════════════════════════════════════════════════════════════
// Credit-pricing for the Clex AI playground.
//
// Every chat completion charges N credits. Daily credit caps live on plans
// (see plans.ts → PLAN_LIMITS.creditsPerDay) and reset at 00:00 UTC.
//
// Tiers — pick by model size / class. Anything not in the explicit map below
// falls back to DEFAULT_MODEL_COST so adding a new model never breaks the API.
//
//   1 credit   →  small / utility / embedding / safety / rerank (≤ ~9B)
//   2 credits  →  mid-size text & code (~10–35B, plus small MoE A3B)
//   3 credits  →  big dense or 49–123B + 80B-A3B thinking
//   5 credits  →  premium 200B+ MoE, 250B+ dense, multimodal video
//   10 credits →  flagship frontier reasoning (Kimi K2.6, DeepSeek V4,
//                 Qwen3.5 397B, GPT-OSS 120B, Mistral Large 3.5+)
//   15 credits →  multimodal frontier (Llama-4 Maverick vision, 480B+ MoE,
//                 image-edit, lipsync, video gen — these last three need
//                 a non-/chat upstream and are reserved for a future PR)
//
// Keep in sync with public_assets/models-data.js and tools/build-models-data.py
// — the latter is the single source-of-truth generator. Server's the truth
// for billing; clients can be slightly out of date without breaking quotas.
// ═══════════════════════════════════════════════════════════════════════════

export type CreditCost = 1 | 2 | 3 | 5 | 10 | 15;

export const DEFAULT_MODEL_COST: CreditCost = 1;

// Explicit per-model overrides. All keys MUST be the exact nvidiaId we send
// upstream (e.g. "qwen/qwen3-coder-480b-a35b-instruct"). Lookups are case-
// insensitive — see creditCostFor().
//
// Models not in NVIDIA's live /v1/models list are tagged "[deprecated]" and
// kept here only as defensive guards: if a user pastes an old slug we still
// charge the right (older) tier and let the upstream return its own 404/410.
export const MODEL_CREDIT_COST: Record<string, CreditCost> = {
  // ── 15 credits — multimodal frontier ───────────────────────────────────
  // Reachable via /api/chat:
  'meta/llama-4-maverick-17b-128e-instruct': 15,
  'mistralai/mistral-large-3-675b-instruct-2512': 15,
  'qwen/qwen3-coder-480b-a35b-instruct': 15,
  // Image / audio (different upstreams, kept for future expansion):
  'qwen/qwen-image': 15,
  'qwen/qwen-image-edit': 15,
  'sync/lipsync-2': 15,

  // ── 10 credits — flagship frontier reasoning ───────────────────────────
  'moonshotai/kimi-k2.6': 10,
  'moonshotai/kimi-k2-thinking': 10,
  'deepseek-ai/deepseek-v4-pro': 10,
  'deepseek-ai/deepseek-v4-flash': 10,
  'qwen/qwen3.5-397b-a17b': 10,
  'nvidia/llama-3.1-nemotron-ultra-253b-v1': 10,
  'nvidia/nemotron-3-super-120b-a12b': 10,
  'openai/gpt-oss-120b': 10,
  'mistralai/mistral-medium-3.5-128b': 10,
  'mistralai/mistral-small-4-119b-2603': 10,
  'mistralai/devstral-2-123b-instruct-2512': 10,
  'google/gemma-4-31b-it': 10,
  'minimaxai/minimax-m2.5': 10,
  'minimaxai/minimax-m2.7': 10,
  'z-ai/glm-5.1': 10,
  'z-ai/glm4.7': 10,
  'writer/palmyra-creative-122b': 10,
  'writer/palmyra-fin-70b-32k': 10,
  'writer/palmyra-med-70b-32k': 10,
  'writer/palmyra-med-70b': 10,
  // [deprecated slugs — defensive billing for old links]:
  'moonshotai/kimi-k2.5': 10,
  'moonshotai/kimi-k2-instruct-0905': 10,
  'deepseek-ai/deepseek-v3.1': 10,
  'deepseek-ai/deepseek-v3.1-terminus': 10,
  'deepseek-ai/deepseek-v3.2': 10,
  'meta/llama-3.1-405b-instruct': 10,

  // ── 5 credits — premium 200B+ MoE / 250B+ dense / multimodal vision ────
  'moonshotai/kimi-k2-instruct': 5,
  'mistralai/mixtral-8x22b-instruct-v0.1': 5,
  'mistralai/mistral-large': 5,
  'mistralai/mistral-large-2-instruct': 5,
  'qwen/qwen3-next-80b-a3b-instruct': 5,
  'qwen/qwen3-next-80b-a3b-thinking': 5,
  'qwen/qwen3.5-122b-a10b': 5,
  'z-ai/glm5': 5,
  'stockmark/stockmark-2-100b-instruct': 5,
  'openai/gpt-oss-20b': 5,
  'stepfun-ai/step-3.5-flash': 5,
  'abacusai/dracarys-llama-3.1-70b-instruct': 5,

  // ── 3 credits — large 49–123B / 80B-A3B thinking / multimodal vision ──
  'meta/llama-3.3-70b-instruct': 3,
  'meta/llama-3.1-70b-instruct': 3,
  'meta/codellama-70b': 3,
  'meta/llama2-70b': 3,
  'meta/llama-3.2-90b-vision-instruct': 3,
  'nvidia/llama-3.1-nemotron-51b-instruct': 3,
  'nvidia/llama-3.1-nemotron-70b-instruct': 3,
  'nvidia/llama-3.3-nemotron-super-49b-v1': 3,
  'nvidia/llama-3.3-nemotron-super-49b-v1.5': 3,
  'nvidia/llama3-chatqa-1.5-70b': 3,
  'nvidia/nemotron-4-340b-instruct': 3,
  'nvidia/nemotron-4-340b-reward': 3,
  'nvidia/nemotron-3-nano-30b-a3b': 3,
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning': 3,
  'nvidia/nemotron-nano-3-30b-a3b': 3,
  'nvidia/ising-calibration-1-35b-a3b': 3,
  'qwen/qwen2.5-coder-32b-instruct': 3,
  'ibm/granite-34b-code-instruct': 3,
  'databricks/dbrx-instruct': 3,
  'ai21labs/jamba-1.5-large-instruct': 3,
  '01-ai/yi-large': 3,

  // ── 2 credits — mid 10–35B + small MoE A3B ─────────────────────────────
  'mistralai/mistral-medium-3-instruct': 2,
  'mistralai/magistral-small-2506': 2,
  'mistralai/mistral-nemotron': 2,
  'mistralai/codestral-22b-instruct-v0.1': 2,
  'mistralai/ministral-14b-instruct-2512': 2,
  'bytedance/seed-oss-36b-instruct': 2,
  'sarvamai/sarvam-m': 2,
  'meta/llama-guard-4-12b': 2,
  'meta/llama-3.2-11b-vision-instruct': 2,
  'upstage/solar-10.7b-instruct': 2,
  'google/gemma-3-27b-it': 2,
  'google/gemma-3-12b-it': 2,
  'google/gemma-3-4b-it': 2,
  'google/gemma-3n-e2b-it': 2,
  'google/gemma-3n-e4b-it': 2,
  'ibm/granite-3.0-8b-instruct': 2,
  'ibm/granite-3.0-3b-a800m-instruct': 2,
  'ibm/granite-8b-code-instruct': 2,
  'bigcode/starcoder2-15b': 2,
  'deepseek-ai/deepseek-coder-6.7b-instruct': 2,
  'microsoft/phi-3.5-moe-instruct': 2,
  'microsoft/phi-4-mini-instruct': 2,
  'microsoft/phi-4-multimodal-instruct': 2,
  'microsoft/phi-3-vision-128k-instruct': 2,
  'microsoft/kosmos-2': 2,
  'nv-mistralai/mistral-nemo-12b-instruct': 2,
  'nvidia/llama-3.1-nemotron-nano-vl-8b-v1': 2,
  'nvidia/nemotron-nano-12b-v2-vl': 2,
  'nvidia/neva-22b': 2,
  'nvidia/vila': 2,

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
    case 10:
      return 'Flagship';
    case 15:
      return 'Frontier';
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
      { cost: 5, label: 'Premium', description: '200B+ MoE / 250B+ dense · agentic + long context' },
      { cost: 10, label: 'Flagship', description: 'Frontier reasoning · Kimi K2.6, DeepSeek V4, Qwen3.5 397B, GPT-OSS 120B' },
      { cost: 15, label: 'Frontier', description: 'Multimodal frontier · Llama-4 Maverick vision, 480B+ coder, image edit, lipsync' },
    ],
    models: Object.entries(MODEL_CREDIT_COST)
      .map(([model, cost]) => ({ model, cost }))
      .sort((a, b) => (a.cost === b.cost ? a.model.localeCompare(b.model) : a.cost - b.cost)),
  };
}
