// /v1/models — OpenAI-compatible model list endpoint.
//
// Returns:
//   {
//     "object": "list",
//     "data": [
//       { "id": "<nvidiaId>", "object": "model", "owned_by": "<publisher>",
//         "created": 0,
//         "x_clex_credits": <cost>, "x_clex_tier": "<label>",
//         "x_clex_use": "<use>", "x_clex_category": "<category>" },
//       ...
//     ]
//   }
//
// The `x_clex_*` fields are extensions and are SAFE to ignore for plain
// OpenAI clients — they only check `id`. We expose them so dashboards can
// render the credit cost without a second round-trip to /api/credits/pricing.
//
// No auth required — the model list is public; you still need a clex_ key
// to actually call /v1/chat/completions.

import type { Env } from '../../lib/types';
import { jsonResponse } from '../../lib/respond';
import { MODEL_CREDIT_COST, DEFAULT_MODEL_COST, creditTierName } from '../../lib/credits';
import { CLEX_MODELS } from '../../lib/models-catalog';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const data = CLEX_MODELS.map((m) => {
    const credits = MODEL_CREDIT_COST[m.nvidiaId] ?? DEFAULT_MODEL_COST;
    return {
      id: m.nvidiaId,
      object: 'model',
      created: 0,
      owned_by: m.publisher,
      x_clex_name: m.name,
      x_clex_use: m.use,
      x_clex_category: m.category,
      x_clex_credits: credits,
      x_clex_tier: creditTierName(credits),
    };
  });

  return jsonResponse(
    { object: 'list', data },
    { status: 200, headers: { 'cache-control': 'public, max-age=300' } },
    request,
    env
  );
};

export const onRequestOptions: PagesFunction<Env> = async ({ request, env }) => {
  return jsonResponse({}, { status: 204 }, request, env);
};
