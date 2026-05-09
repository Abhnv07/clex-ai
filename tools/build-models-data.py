#!/usr/bin/env python3
"""
Generate public_assets/models-data.js from the live NVIDIA /v1/models list.

Source-of-truth = NVIDIA's currently-published catalog (as fetched against
the user's nvapi-... key). Anything in the existing models-data.js that's
NOT in the live list is dropped — those are the 404 / 410 models users
were hitting in the playground.

Each entry is annotated with a credit cost and a category. Categories
restrict where the model can be reasonably called from /api/chat (which is
chat-completions only):

  text      → general LLM
  code      → coding-tuned LLM
  vision    → multimodal text+image (still chat-completions)
  reasoning → thinking / reasoning specialist
  safety    → guard / moderation
  embedding → vector embeddings (NOT chat-completions, hidden from picker)
  rerank    → reranker (NOT chat-completions, hidden from picker)
  audio     → speech / lipsync (NOT chat-completions, hidden from picker)
  image     → image gen / vision encode (NOT chat-completions, hidden)
  video     → video gen / detection (NOT chat-completions, hidden)
"""
import json
import sys

# ── Per-model overrides that the simple heuristic below can't infer ─────
# Mapping is { exact_id : (credits, category, description) }.
OVERRIDES = {
    # ── 15 cr — multimodal frontier / 400B+ class ────────────────────────
    "mistralai/mistral-large-3-675b-instruct-2512":
        (15, "text", "Mistral's flagship 675B dense reasoning model."),
    "meta/llama-4-maverick-17b-128e-instruct":
        (15, "vision", "Meta Llama 4 Maverick — multimodal text+image, 128 experts."),
    "qwen/qwen3-coder-480b-a35b-instruct":
        (15, "code", "Qwen 480B-A35B coder — frontier coding model."),

    # ── 10 cr — flagship reasoning / 200B+ class / new generation ────────
    "moonshotai/kimi-k2.6":
        (10, "text", "Moonshot Kimi K2.6 — flagship long-context reasoning."),
    "moonshotai/kimi-k2-thinking":
        (10, "reasoning", "Moonshot Kimi K2 Thinking — chain-of-thought reasoning."),
    "deepseek-ai/deepseek-v4-pro":
        (10, "text", "DeepSeek V4 Pro — frontier reasoning + coding."),
    "deepseek-ai/deepseek-v4-flash":
        (10, "text", "DeepSeek V4 Flash — fast frontier reasoning."),
    "qwen/qwen3.5-397b-a17b":
        (10, "text", "Qwen 3.5 397B-A17B — frontier MoE."),
    "nvidia/llama-3.1-nemotron-ultra-253b-v1":
        (10, "reasoning", "NVIDIA Nemotron Ultra 253B — frontier reasoning."),
    "nvidia/nemotron-3-super-120b-a12b":
        (10, "text", "NVIDIA Nemotron 3 Super 120B-A12B — flagship MoE."),
    "openai/gpt-oss-120b":
        (10, "text", "OpenAI GPT-OSS 120B — open-weights flagship."),
    "mistralai/mistral-medium-3.5-128b":
        (10, "text", "Mistral Medium 3.5 128B — flagship dense."),
    "mistralai/mistral-small-4-119b-2603":
        (10, "text", "Mistral Small 4 119B — newest medium-class flagship."),
    "mistralai/devstral-2-123b-instruct-2512":
        (10, "code", "Mistral Devstral 2 123B — flagship coding model."),
    "google/gemma-4-31b-it":
        (10, "text", "Google Gemma 4 31B — newest open Gemma flagship."),
    "minimaxai/minimax-m2.7":
        (10, "text", "MiniMax M2.7 — latest flagship."),
    "minimaxai/minimax-m2.5":
        (10, "text", "MiniMax M2.5 — flagship reasoning + agentic."),
    "z-ai/glm-5.1":
        (10, "text", "Z.ai GLM 5.1 — newest flagship."),
    "writer/palmyra-creative-122b":
        (10, "text", "Writer Palmyra Creative 122B — long-form creative."),
    "writer/palmyra-fin-70b-32k":
        (10, "text", "Writer Palmyra Fin 70B — finance-tuned."),
    "writer/palmyra-med-70b-32k":
        (10, "text", "Writer Palmyra Med 70B — medical-tuned."),
    "writer/palmyra-med-70b":
        (10, "text", "Writer Palmyra Med 70B — medical-tuned."),

    # ── 5 cr — premium 200B / large dense / multimodal vision ────────────
    "moonshotai/kimi-k2-instruct":
        (5, "text", "Moonshot Kimi K2 Instruct — premium long-context."),
    "z-ai/glm4.7":
        (5, "text", "Z.ai GLM 4.7 — premium reasoning."),
    "z-ai/glm5":
        (5, "text", "Z.ai GLM 5 — premium reasoning + agentic."),
    "qwen/qwen3.5-122b-a10b":
        (5, "text", "Qwen 3.5 122B-A10B — premium MoE."),
    "qwen/qwen3-next-80b-a3b-thinking":
        (5, "reasoning", "Qwen 3 Next 80B-A3B Thinking — chain-of-thought."),
    "qwen/qwen3-next-80b-a3b-instruct":
        (5, "text", "Qwen 3 Next 80B-A3B — premium MoE."),
    "mistralai/mixtral-8x22b-instruct-v0.1":
        (5, "text", "Mistral Mixtral 8×22B — premium MoE."),
    "mistralai/mistral-large":
        (5, "text", "Mistral Large — premium dense."),
    "mistralai/mistral-large-2-instruct":
        (5, "text", "Mistral Large 2 — premium dense."),
    "abacusai/dracarys-llama-3.1-70b-instruct":
        (5, "text", "Abacus AI Dracarys 70B — premium fine-tune."),
    "stockmark/stockmark-2-100b-instruct":
        (5, "text", "Stockmark 2 100B — premium Japanese-tuned."),
    "openai/gpt-oss-20b":
        (5, "text", "OpenAI GPT-OSS 20B — open-weights mid-flagship."),
    "stepfun-ai/step-3.5-flash":
        (5, "text", "StepFun 3.5 Flash — fast premium reasoning."),

    # ── 3 cr — large 49–123B / 80B-A3B ───────────────────────────────────
    "meta/llama-3.3-70b-instruct":
        (3, "text", "Meta Llama 3.3 70B — large general-purpose."),
    "meta/llama-3.1-70b-instruct":
        (3, "text", "Meta Llama 3.1 70B — large general-purpose."),
    "meta/codellama-70b":
        (3, "code", "Meta CodeLlama 70B — large coding model."),
    "meta/llama2-70b":
        (3, "text", "Meta Llama 2 70B — legacy large model."),
    "nvidia/llama-3.1-nemotron-51b-instruct":
        (3, "text", "NVIDIA Nemotron 51B — large reasoning."),
    "nvidia/llama-3.1-nemotron-70b-instruct":
        (3, "text", "NVIDIA Nemotron 70B — large reasoning."),
    "nvidia/llama-3.3-nemotron-super-49b-v1":
        (3, "text", "NVIDIA Nemotron Super 49B — large reasoning."),
    "nvidia/llama-3.3-nemotron-super-49b-v1.5":
        (3, "text", "NVIDIA Nemotron Super 49B v1.5 — large reasoning."),
    "nvidia/llama3-chatqa-1.5-70b":
        (3, "text", "NVIDIA ChatQA 1.5 70B — RAG-tuned."),
    "qwen/qwen2.5-coder-32b-instruct":
        (3, "code", "Qwen 2.5 Coder 32B — large coding model."),
    "ibm/granite-34b-code-instruct":
        (3, "code", "IBM Granite 34B Code — large coding model."),
    "databricks/dbrx-instruct":
        (3, "text", "Databricks DBRX 132B-A36B — large MoE."),
    "ai21labs/jamba-1.5-large-instruct":
        (3, "text", "AI21 Jamba 1.5 Large — large hybrid SSM/Transformer."),
    "01-ai/yi-large":
        (3, "text", "01.AI Yi Large — large Chinese-tuned."),
    "nvidia/nemotron-4-340b-instruct":
        (3, "text", "NVIDIA Nemotron 4 340B Instruct."),
    "nvidia/nemotron-4-340b-reward":
        (3, "text", "NVIDIA Nemotron 4 340B Reward (eval-only)."),
    "meta/llama-3.2-90b-vision-instruct":
        (3, "vision", "Meta Llama 3.2 90B Vision — large multimodal."),
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning":
        (3, "reasoning", "NVIDIA Nemotron 3 Nano Omni 30B-A3B Reasoning."),
    "nvidia/nemotron-3-nano-30b-a3b":
        (3, "text", "NVIDIA Nemotron 3 Nano 30B-A3B."),
    "nvidia/nemotron-nano-3-30b-a3b":
        (3, "text", "NVIDIA Nemotron Nano 3 30B-A3B."),
    "nvidia/ising-calibration-1-35b-a3b":
        (3, "text", "NVIDIA Ising Calibration 1 35B-A3B."),

    # ── 2 cr — mid 10–35B ────────────────────────────────────────────────
    "bytedance/seed-oss-36b-instruct":
        (2, "text", "ByteDance Seed-OSS 36B."),
    "mistralai/mistral-medium-3-instruct":
        (2, "text", "Mistral Medium 3."),
    "mistralai/codestral-22b-instruct-v0.1":
        (2, "code", "Mistral Codestral 22B."),
    "mistralai/mistral-nemotron":
        (2, "text", "Mistral Nemotron 12B (NVIDIA collab)."),
    "mistralai/magistral-small-2506":
        (2, "text", "Mistral Magistral Small 2506."),
    "mistralai/ministral-14b-instruct-2512":
        (2, "text", "Mistral Ministral 14B."),
    "google/gemma-3-27b-it":
        (2, "text", "Google Gemma 3 27B."),
    "google/gemma-3-12b-it":
        (2, "text", "Google Gemma 3 12B."),
    "google/gemma-3-4b-it":
        (2, "text", "Google Gemma 3 4B."),
    "google/gemma-3n-e2b-it":
        (2, "text", "Google Gemma 3n E2B (efficient)."),
    "google/gemma-3n-e4b-it":
        (2, "text", "Google Gemma 3n E4B (efficient)."),
    "meta/llama-3.2-11b-vision-instruct":
        (2, "vision", "Meta Llama 3.2 11B Vision — multimodal mid."),
    "meta/llama-guard-4-12b":
        (2, "safety", "Meta Llama Guard 4 12B — safety classifier."),
    "ibm/granite-3.0-8b-instruct":
        (2, "text", "IBM Granite 3.0 8B."),
    "ibm/granite-3.0-3b-a800m-instruct":
        (2, "text", "IBM Granite 3.0 3B-A800M."),
    "ibm/granite-8b-code-instruct":
        (2, "code", "IBM Granite 8B Code."),
    "bigcode/starcoder2-15b":
        (2, "code", "BigCode StarCoder2 15B."),
    "deepseek-ai/deepseek-coder-6.7b-instruct":
        (2, "code", "DeepSeek Coder 6.7B."),
    "microsoft/phi-3.5-moe-instruct":
        (2, "text", "Microsoft Phi 3.5 MoE."),
    "microsoft/phi-4-mini-instruct":
        (2, "text", "Microsoft Phi 4 Mini."),
    "microsoft/phi-4-multimodal-instruct":
        (2, "vision", "Microsoft Phi 4 Multimodal."),
    "microsoft/phi-3-vision-128k-instruct":
        (2, "vision", "Microsoft Phi 3 Vision 128K."),
    "microsoft/kosmos-2":
        (2, "vision", "Microsoft Kosmos 2 — multimodal."),
    "upstage/solar-10.7b-instruct":
        (2, "text", "Upstage Solar 10.7B."),
    "sarvamai/sarvam-m":
        (2, "text", "Sarvam M — Indic LLM."),
    "nv-mistralai/mistral-nemo-12b-instruct":
        (2, "text", "NVIDIA-Mistral Nemo 12B."),
    "nvidia/llama-3.1-nemotron-nano-vl-8b-v1":
        (2, "vision", "NVIDIA Nemotron Nano VL 8B — multimodal."),
    "nvidia/nemotron-nano-12b-v2-vl":
        (2, "vision", "NVIDIA Nemotron Nano 12B v2 VL — multimodal."),

    # ── 1 cr — small / safety / utility (≤9B) ────────────────────────────
    "meta/llama-3.1-8b-instruct":
        (1, "text", "Meta Llama 3.1 8B — fast small."),
    "meta/llama-3.2-3b-instruct":
        (1, "text", "Meta Llama 3.2 3B — fast small."),
    "meta/llama-3.2-1b-instruct":
        (1, "text", "Meta Llama 3.2 1B — fast small."),
    "mistralai/mistral-7b-instruct-v0.3":
        (1, "text", "Mistral 7B v0.3."),
    "google/gemma-2-2b-it":
        (1, "text", "Google Gemma 2 2B."),
    "google/gemma-2b":
        (1, "text", "Google Gemma 2B."),
    "google/recurrentgemma-2b":
        (1, "text", "Google RecurrentGemma 2B."),
    "google/codegemma-1.1-7b":
        (1, "code", "Google CodeGemma 1.1 7B."),
    "google/codegemma-7b":
        (1, "code", "Google CodeGemma 7B."),
    "nvidia/llama-3.1-nemotron-nano-8b-v1":
        (1, "text", "NVIDIA Nemotron Nano 8B."),
    "nvidia/nvidia-nemotron-nano-9b-v2":
        (1, "text", "NVIDIA Nemotron Nano 9B v2."),
    "nvidia/nemotron-mini-4b-instruct":
        (1, "text", "NVIDIA Nemotron Mini 4B."),
    "nvidia/mistral-nemo-minitron-8b-8k-instruct":
        (1, "text", "NVIDIA Mistral-Nemo Minitron 8B 8K."),
    "nvidia/llama-3.1-nemoguard-8b-content-safety":
        (1, "safety", "NVIDIA NemoGuard 8B Content Safety."),
    "nvidia/llama-3.1-nemoguard-8b-topic-control":
        (1, "safety", "NVIDIA NemoGuard 8B Topic Control."),
    "nvidia/llama-3.1-nemotron-safety-guard-8b-v3":
        (1, "safety", "NVIDIA Nemotron Safety Guard 8B v3."),
    "nvidia/nemotron-3-content-safety":
        (1, "safety", "NVIDIA Nemotron 3 Content Safety."),
    "nvidia/nemotron-content-safety-reasoning-4b":
        (1, "safety", "NVIDIA Nemotron Content Safety Reasoning 4B."),
    "nvidia/cosmos-reason2-8b":
        (1, "reasoning", "NVIDIA Cosmos Reason 2 8B."),
    "nvidia/riva-translate-4b-instruct":
        (1, "text", "NVIDIA Riva Translate 4B."),
    "nvidia/riva-translate-4b-instruct-v1.1":
        (1, "text", "NVIDIA Riva Translate 4B v1.1."),
    "nvidia/gliner-pii":
        (1, "safety", "NVIDIA GLiNER PII."),
    "aisingapore/sea-lion-7b-instruct":
        (1, "text", "AI Singapore Sea-Lion 7B."),
    "zyphra/zamba2-7b-instruct":
        (1, "text", "Zyphra Zamba 2 7B."),
    "nvidia/neva-22b":
        (2, "vision", "NVIDIA NeVA 22B — multimodal."),
    "nvidia/vila":
        (2, "vision", "NVIDIA VILA — multimodal."),
    "adept/fuyu-8b":
        (1, "vision", "Adept Fuyu 8B — multimodal."),
    "google/deplot":
        (1, "vision", "Google DePlot — chart understanding."),
}

# Skip these — they're not chat-completions targets even though /v1/models
# advertises them. Embeddings / rerankers / image gen / video / audio.
HIDDEN_FROM_PICKER = {
    # embeddings + rerankers
    "baai/bge-m3",
    "nvidia/embed-qa-4",
    "nvidia/llama-3.2-nemoretriever-1b-vlm-embed-v1",
    "nvidia/llama-3.2-nemoretriever-300m-embed-v1",
    "nvidia/llama-3.2-nv-embedqa-1b-v1",
    "nvidia/llama-3.2-nv-embedqa-1b-v2",
    "nvidia/llama-nemotron-embed-1b-v2",
    "nvidia/llama-nemotron-embed-vl-1b-v2",
    "nvidia/nemoretriever-parse",
    "nvidia/nemotron-parse",
    "nvidia/nv-embed-v1",
    "nvidia/nv-embedcode-7b-v1",
    "nvidia/nv-embedqa-e5-v5",
    "nvidia/nv-embedqa-mistral-7b-v2",
    "snowflake/arctic-embed-l",
    "nvidia/nvclip",
    # image / video / synth detectors — different endpoints
    "nvidia/ai-synthetic-video-detector",
}


def category_of(model_id: str, override_cat: str | None) -> str:
    if override_cat:
        return override_cat
    if "embed" in model_id or "rerank" in model_id:
        return "embedding"
    if "guard" in model_id or "safety" in model_id:
        return "safety"
    if "code" in model_id or "coder" in model_id:
        return "code"
    if "vision" in model_id or "vl-" in model_id or "-vl" in model_id:
        return "vision"
    return "text"


def publisher_of(model_id: str) -> str:
    if "/" not in model_id:
        return "Unknown"
    org = model_id.split("/")[0]
    return {
        "01-ai": "01.AI",
        "abacusai": "Abacus AI",
        "ai21labs": "AI21",
        "aisingapore": "AI Singapore",
        "baai": "BAAI",
        "bigcode": "BigCode",
        "bytedance": "ByteDance",
        "databricks": "Databricks",
        "deepseek-ai": "DeepSeek",
        "google": "Google",
        "ibm": "IBM",
        "meta": "Meta",
        "microsoft": "Microsoft",
        "minimaxai": "MiniMax",
        "mistralai": "Mistral",
        "moonshotai": "Moonshot",
        "nv-mistralai": "NVIDIA + Mistral",
        "nvidia": "NVIDIA",
        "openai": "OpenAI",
        "qwen": "Qwen",
        "sarvamai": "Sarvam AI",
        "snowflake": "Snowflake",
        "stepfun-ai": "StepFun",
        "stockmark": "Stockmark",
        "upstage": "Upstage",
        "writer": "Writer",
        "z-ai": "Z.ai",
        "zyphra": "Zyphra",
        "adept": "Adept",
        "sync": "Sync",
    }.get(org, org.title())


def main():
    with open(sys.argv[1]) as f:
        data = json.load(f)
    ids = sorted({m["id"] for m in data["data"]})
    entries = []
    for mid in ids:
        if mid in HIDDEN_FROM_PICKER:
            continue
        ov = OVERRIDES.get(mid)
        if ov:
            credits, cat, desc = ov
        else:
            credits, cat, desc = 1, category_of(mid, None), ""
        # Force "embedding" / "rerank" hidden even if not in HIDDEN list
        if cat in {"embedding", "rerank", "audio", "image", "video"}:
            continue
        # short name = path part
        short = mid.split("/", 1)[1]
        entries.append(
            {
                "name": short,
                "publisher": publisher_of(mid),
                "use": desc or f"{cat.title()} model",
                "category": cat,
                "nvidiaId": mid,
                "credits": credits,
            }
        )

    # Sort: high credits first, then publisher, then name.
    entries.sort(key=lambda e: (-e["credits"], e["publisher"], e["name"]))

    # Emit JS file.
    out = [
        "// Centralized model metadata for CLEX marketing site, models catalog, docs",
        "// and the IDE playground. AUTO-GENERATED from the live NVIDIA /v1/models",
        "// list as of the build that touched this file. Re-run",
        "//   tools/build-models-data.py /tmp/nvmodels.json > public_assets/models-data.js",
        "// to refresh after NVIDIA adds or deprecates models.",
        "",
        "window.CLEX_MODELS = window.CLEX_MODELS || [",
    ]
    for e in entries:
        out.append("  {")
        out.append(f'    name: {json.dumps(e["name"])},')
        out.append(f'    publisher: {json.dumps(e["publisher"])},')
        out.append(f'    use: {json.dumps(e["use"])},')
        out.append(f'    category: {json.dumps(e["category"])},')
        out.append(f'    nvidiaId: {json.dumps(e["nvidiaId"])},')
        out.append(f'    credits: {e["credits"]},')
        out.append("  },")
    out.append("];")
    out.append("")
    print("\n".join(out))


if __name__ == "__main__":
    main()
