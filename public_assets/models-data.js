// Centralized model metadata for CLEX marketing site, models catalog, and docs.
// This file exposes globals on the window object so it can be consumed from
// plain <script> tags without modules.

window.CLEX_MODELS =
  window.CLEX_MODELS ||
  [
    // NOTE: These entries are sourced from the NVIDIA NIM / Build catalog.
    // Fields:
    // - name: human-readable model name
    // - publisher: provider or org
    // - use: primary use-case
    // - category: text | code | speech | safety | embedding | vision
    // - nvidiaId: provider/model identifier used with NVIDIA Chat Completions
    //
    // Text / chat and general LLMs
    {
      name: "llama-nemotron-rerank-1b-v2",
      publisher: "NVIDIA",
      use: "Text retrieval / reranking",
      category: "embedding",
      nvidiaId: "nvidia/llama-nemotron-rerank-1b-v2",

      credits: 1,
    },
    {
      name: "qwen3.5-122b-a10b",
      publisher: "Qwen",
      use: "Chat, coding, reasoning",
      category: "text",
      nvidiaId: "qwen/qwen3.5-122b-a10b",

      credits: 3,
    },
    {
      name: "qwen3.5-397b-a17b",
      publisher: "Qwen",
      use: "Vision, chat, RAG, agentic",
      category: "text",
      nvidiaId: "qwen/qwen3.5-397b-a17b",

      credits: 5,
    },
    {
      name: "glm5",
      publisher: "Z.ai",
      use: "Reasoning, agentic",
      category: "text",
      nvidiaId: "zhipuai/glm5",

      credits: 3,
    },
    {
      name: "minimax-m2.5",
      publisher: "Minimaxai",
      use: "Coding, reasoning, office tasks",
      category: "text",
      nvidiaId: "minimaxai/minimax-m2.5",

      credits: 3,
    },
    {
      name: "minimax-m2.1",
      publisher: "Minimaxai",
      use: "Coding, app/web dev, agentic",
      category: "text",
      nvidiaId: "minimaxai/minimax-m2.1",

      credits: 3,
    },
    {
      name: "step-3.5-flash",
      publisher: "Stepfun-ai",
      use: "Reasoning, agentic",
      category: "text",
      nvidiaId: "stepfun-ai/step-3.5-flash",

      credits: 3,
    },
    {
      name: "kimi-k2.5",
      publisher: "Moonshotai",
      use: "Multimodal, video understanding",
      category: "vision",
      nvidiaId: "moonshotai/kimi-k2.5",

      credits: 5,
    },
    {
      name: "glm4.7",
      publisher: "Z.ai",
      use: "Agentic coding, tool calling",
      category: "text",
      nvidiaId: "zhipuai/glm4.7",

      credits: 3,
    },
    {
      name: "deepseek-v3.2",
      publisher: "DeepSeek AI",
      use: "Reasoning, long context",
      category: "text",
      nvidiaId: "deepseek-ai/deepseek-v3.2",

      credits: 5,
    },
    {
      name: "nemotron-3-nano-30b-a3b",
      publisher: "NVIDIA",
      use: "Coding, reasoning, MoE",
      category: "text",
      nvidiaId: "nvidia/nemotron-3-nano-30b-a3b",

      credits: 2,
    },
    {
      name: "kimi-k2-thinking",
      publisher: "Moonshotai",
      use: "Reasoning, tool use",
      category: "text",
      nvidiaId: "moonshotai/kimi-k2-thinking",

      credits: 3,
    },
    {
      name: "ministral-14b-instruct-2512",
      publisher: "Mistral AI",
      use: "Chat, instruction following",
      category: "text",
      nvidiaId: "mistralai/ministral-14b-instruct-2512",

      credits: 2,
    },
    {
      name: "devstral-2-123b-instruct-2512",
      publisher: "Mistral AI",
      use: "Code, reasoning",
      category: "code",
      nvidiaId: "mistralai/devstral-2-123b-instruct-2512",

      credits: 3,
    },
    {
      name: "deepseek-v3.1-terminus",
      publisher: "DeepSeek AI",
      use: "Agentic, tool calling",
      category: "text",
      nvidiaId: "deepseek-ai/deepseek-v3.1-terminus",

      credits: 5,
    },
    {
      name: "deepseek-v3.1",
      publisher: "DeepSeek AI",
      use: "Reasoning, tool use",
      category: "text",
      nvidiaId: "deepseek-ai/deepseek-v3.1",

      credits: 5,
    },
    {
      name: "stockmark-2-100b-instruct",
      publisher: "Stockmark",
      use: "Japanese enterprise LLM",
      category: "text",
      nvidiaId: "stockmark/stockmark-2-100b-instruct",

      credits: 3,
    },
    {
      name: "qwen3-next-80b-a3b-instruct",
      publisher: "Qwen",
      use: "Chat, long context",
      category: "text",
      nvidiaId: "qwen/qwen3-next-80b-a3b-instruct",

      credits: 3,
    },
    {
      name: "kimi-k2-instruct-0905",
      publisher: "Moonshotai",
      use: "Reasoning, long context",
      category: "text",
      nvidiaId: "moonshotai/kimi-k2-instruct-0905",

      credits: 5,
    },
    {
      name: "bielik-11b-v2.6-instruct",
      publisher: "Speakleash",
      use: "Polish language, text generation",
      category: "text",
      nvidiaId: "speakleash/bielik-11b-v2.6-instruct",

      credits: 2,
    },
    {
      name: "qwen3-next-80b-a3b-thinking",
      publisher: "Qwen",
      use: "Reasoning, multilingual",
      category: "text",
      nvidiaId: "qwen/qwen3-next-80b-a3b-thinking",

      credits: 3,
    },
    {
      name: "seed-oss-36b-instruct",
      publisher: "ByteDance",
      use: "Reasoning, agentic",
      category: "text",
      nvidiaId: "bytedance/seed-oss-36b-instruct",

      credits: 2,
    },
    {
      name: "qwen3-coder-480b-a35b-instruct",
      publisher: "Qwen",
      use: "Agentic coding",
      category: "code",
      nvidiaId: "qwen/qwen3-coder-480b-a35b-instruct",

      credits: 5,
    },
    {
      name: "nvidia-nemotron-nano-9b-v2",
      publisher: "NVIDIA",
      use: "Reasoning, agentic",
      category: "text",
      nvidiaId: "nvidia/nvidia-nemotron-nano-9b-v2",

      credits: 1,
    },
    {
      name: "llama-3.3-nemotron-super-49b-v1.5",
      publisher: "NVIDIA",
      use: "Reasoning, chat, tool calling",
      category: "text",
      nvidiaId: "nvidia/llama-3.3-nemotron-super-49b-v1.5",

      credits: 3,
    },
    {
      name: "teuken-7b-instruct-commercial-v0.4",
      publisher: "Opengpt-x",
      use: "EU multilingual LLM",
      category: "text",
      nvidiaId: "opengpt-x/teuken-7b-instruct-commercial-v0.4",

      credits: 1,
    },
    {
      name: "sarvam-m",
      publisher: "Sarvamai",
      use: "Indian language, coding, math",
      category: "text",
      nvidiaId: "sarvamai/sarvam-m",

      credits: 2,
    },
    {
      name: "mistral-small-3.1-24b-instruct-2503",
      publisher: "Mistral AI",
      use: "Multilingual, image understanding",
      category: "text",
      nvidiaId: "mistralai/mistral-small-3.1-24b-instruct-2503",

      credits: 2,
    },
    {
      name: "mistral-medium-3-instruct",
      publisher: "Mistral AI",
      use: "Enterprise, software dev",
      category: "text",
      nvidiaId: "mistralai/mistral-medium-3-instruct",

      credits: 2,
    },
    {
      name: "llama-3.1-nemotron-ultra-253b-v1",
      publisher: "NVIDIA",
      use: "Scientific reasoning, coding",
      category: "text",
      nvidiaId: "nvidia/llama-3.1-nemotron-ultra-253b-v1",

      credits: 5,
    },
    {
      name: "llama-4-maverick-17b-128e-instruct",
      publisher: "Meta",
      use: "Multimodal, multilingual",
      category: "vision",
      nvidiaId: "meta/llama-4-maverick-17b-128e-instruct",

      credits: 5,
    },
    {
      name: "llama-4-scout-17b-16e-instruct",
      publisher: "Meta",
      use: "Multimodal, multilingual",
      category: "vision",
      nvidiaId: "meta/llama-4-scout-17b-16e-instruct",

      credits: 3,
    },
    {
      name: "llama-3.3-nemotron-super-49b-v1",
      publisher: "NVIDIA",
      use: "Chat, reasoning",
      category: "text",
      nvidiaId: "nvidia/llama-3.3-nemotron-super-49b-v1",

      credits: 3,
    },
    {
      name: "llama-3.1-nemotron-nano-8b-v1",
      publisher: "NVIDIA",
      use: "Chat, edge",
      category: "text",
      nvidiaId: "nvidia/llama-3.1-nemotron-nano-8b-v1",

      credits: 1,
    },
    {
      name: "marin-8b-instruct",
      publisher: "Marin",
      use: "Reasoning, math, science",
      category: "text",
      nvidiaId: "marin/marin-8b-instruct",

      credits: 1,
    },
    {
      name: "granite-3.3-8b-instruct",
      publisher: "IBM",
      use: "Reasoning, coding",
      category: "text",
      nvidiaId: "ibm/granite-3.3-8b-instruct",

      credits: 1,
    },
    {
      name: "eurollm-9b-instruct",
      publisher: "Utter-project",
      use: "EU multilingual",
      category: "text",
      nvidiaId: "utter-project/eurollm-9b-instruct",

      credits: 1,
    },
    {
      name: "gemma-2-9b-cpt-sahabatai-instruct",
      publisher: "Gotocompany",
      use: "Indonesian language",
      category: "text",
      nvidiaId: "gotocompany/gemma-2-9b-cpt-sahabatai-instruct",

      credits: 1,
    },
    {
      name: "phi-4-mini-flash-reasoning",
      publisher: "Microsoft",
      use: "Edge reasoning",
      category: "text",
      nvidiaId: "microsoft/phi-4-mini-flash-reasoning",

      credits: 1,
    },
    {
      name: "kimi-k2-instruct",
      publisher: "Moonshotai",
      use: "Coding, reasoning, agentic",
      category: "text",
      nvidiaId: "moonshotai/kimi-k2-instruct",

      credits: 5,
    },
    {
      name: "magistral-small-2506",
      publisher: "Mistral AI",
      use: "Reasoning, edge",
      category: "text",
      nvidiaId: "mistralai/magistral-small-2506",

      credits: 2,
    },
    {
      name: "llama-guard-4-12b",
      publisher: "Meta",
      use: "Multimodal safety",
      category: "safety",
      nvidiaId: "meta/llama-guard-4-12b",

      credits: 2,
    },
    {
      name: "gemma-3n-e4b-it",
      publisher: "Google",
      use: "Text/audio/image, edge",
      category: "vision",
      nvidiaId: "google/gemma-3n-e4b-it",

      credits: 1,
    },
    {
      name: "gemma-3n-e2b-it",
      publisher: "Google",
      use: "Text/audio/image, edge",
      category: "vision",
      nvidiaId: "google/gemma-3n-e2b-it",

      credits: 1,
    },
    {
      name: "mistral-nemotron",
      publisher: "Mistral AI",
      use: "Coding, agentic",
      category: "code",
      nvidiaId: "mistralai/mistral-nemotron",

      credits: 2,
    },
    {
      name: "llama-3.1-nemotron-nano-vl-8b-v1",
      publisher: "NVIDIA",
      use: "Vision-language",
      category: "vision",
      nvidiaId: "nvidia/llama-3.1-nemotron-nano-vl-8b-v1",

      credits: 1,
    },
    {
      name: "llama-3.1-nemotron-nano-4b-v1.1",
      publisher: "NVIDIA",
      use: "Reasoning, edge agents",
      category: "text",
      nvidiaId: "nvidia/llama-3.1-nemotron-nano-4b-v1.1",

      credits: 1,
    },
    {
      name: "nemotron-content-safety-reasoning-4b",
      publisher: "NVIDIA",
      use: "Safety / guardrails",
      category: "safety",
      nvidiaId: "nvidia/nemotron-content-safety-reasoning-4b",

      credits: 1,
    },
    {
      name: "llama-3.1-nemotron-safety-guard-8b-v3",
      publisher: "NVIDIA",
      use: "Content moderation",
      category: "safety",
      nvidiaId: "nvidia/llama-3.1-nemotron-safety-guard-8b-v3",

      credits: 1,
    },
    {
      name: "deepseek-r1-distill-llama-8b",
      publisher: "DeepSeek AI",
      use: "Reasoning (distilled)",
      category: "text",
      nvidiaId: "deepseek-ai/deepseek-r1-distill-llama-8b",

      credits: 1,
    },
    {
      name: "deepseek-r1-distill-qwen-32b",
      publisher: "DeepSeek AI",
      use: "Coding/reasoning (distilled)",
      category: "text",
      nvidiaId: "deepseek-ai/deepseek-r1-distill-qwen-32b",

      credits: 2,
    },
    {
      name: "deepseek-r1-distill-qwen-14b",
      publisher: "DeepSeek AI",
      use: "Coding/reasoning (distilled)",
      category: "text",
      nvidiaId: "deepseek-ai/deepseek-r1-distill-qwen-14b",

      credits: 2,
    },
    {
      name: "deepseek-r1-distill-qwen-7b",
      publisher: "DeepSeek AI",
      use: "Coding/reasoning (distilled)",
      category: "text",
      nvidiaId: "deepseek-ai/deepseek-r1-distill-qwen-7b",

      credits: 1,
    },
    {
      name: "phi-4-mini-instruct",
      publisher: "Microsoft",
      use: "Chat, multilingual",
      category: "text",
      nvidiaId: "microsoft/phi-4-mini-instruct",

      credits: 1,
    },
    {
      name: "mistral-small-24b-instruct",
      publisher: "Mistral AI",
      use: "Code, math, general",
      category: "text",
      nvidiaId: "mistralai/mistral-small-24b-instruct",

      credits: 2,
    },
    {
      name: "llama-3.1-nemoguard-8b-topic-control",
      publisher: "NVIDIA",
      use: "Guardrails/topic control",
      category: "safety",
      nvidiaId: "nvidia/llama-3.1-nemoguard-8b-topic-control",

      credits: 1,
    },
    {
      name: "nemoguard-jailbreak-detect",
      publisher: "NVIDIA",
      use: "Jailbreak detection",
      category: "safety",
      nvidiaId: "nvidia/nemoguard-jailbreak-detect",

      credits: 1,
    },
    {
      name: "llama-3.1-nemoguard-8b-content-safety",
      publisher: "NVIDIA",
      use: "Content safety",
      category: "safety",
      nvidiaId: "nvidia/llama-3.1-nemoguard-8b-content-safety",

      credits: 1,
    },
    {
      name: "colosseum-355b-instruct-16k",
      publisher: "Igenius",
      use: "Enterprise regulated industries",
      category: "text",
      nvidiaId: "igenius/colosseum-355b-instruct-16k",

      credits: 5,
    },
    {
      name: "falcon3-7b-instruct",
      publisher: "Tiiuae",
      use: "Reasoning, math",
      category: "text",
      nvidiaId: "tiiuae/falcon3-7b-instruct",

      credits: 1,
    },
    {
      name: "italia-10b-instruct-16k",
      publisher: "Igenius",
      use: "European multilingual",
      category: "text",
      nvidiaId: "igenius/italia-10b-instruct-16k",

      credits: 2,
    },
    {
      name: "qwen2.5-7b-instruct",
      publisher: "Qwen",
      use: "Chinese & English LLM",
      category: "text",
      nvidiaId: "qwen/qwen2.5-7b-instruct",

      credits: 1,
    },
    {
      name: "cosmos-nemotron-34b",
      publisher: "NVIDIA",
      use: "Vision-language",
      category: "vision",
      nvidiaId: "nvidia/cosmos-nemotron-34b",

      credits: 3,
    },
    {
      name: "llama-3.2-nv-embedqa-1b-v2",
      publisher: "NVIDIA",
      use: "Text embedding / retrieval",
      category: "embedding",
      nvidiaId: "nvidia/llama-3.2-nv-embedqa-1b-v2",

      credits: 1,
    },
    {
      name: "llama-3.2-nv-rerankqa-1b-v2",
      publisher: "NVIDIA",
      use: "Reranking",
      category: "embedding",
      nvidiaId: "nvidia/llama-3.2-nv-rerankqa-1b-v2",

      credits: 1,
    },
    {
      name: "llama-3.3-70b-instruct",
      publisher: "Meta",
      use: "Reasoning, math",
      category: "text",
      nvidiaId: "meta/llama-3.3-70b-instruct",

      credits: 3,
    },
    {
      name: "nemotron-4-mini-hindi-4b-instruct",
      publisher: "NVIDIA",
      use: "Hindi-English bilingual",
      category: "text",
      nvidiaId: "nvidia/nemotron-4-mini-hindi-4b-instruct",

      credits: 1,
    },
    {
      name: "granite-guardian-3.0-8b",
      publisher: "IBM",
      use: "Guardrail",
      category: "safety",
      nvidiaId: "ibm/granite-guardian-3.0-8b",

      credits: 1,
    },
    {
      name: "llama-3.1-swallow-70b-instruct-v0.1",
      publisher: "Tokyo Institute of Science",
      use: "Japanese sovereign AI",
      category: "text",
      nvidiaId: "tokyotech-llm/llama-3.1-swallow-70b-instruct-v0.1",

      credits: 3,
    },
    {
      name: "llama-3.1-swallow-8b-instruct-v0.1",
      publisher: "Tokyo Institute of Science",
      use: "Japanese sovereign AI",
      category: "text",
      nvidiaId: "tokyotech-llm/llama-3.1-swallow-8b-instruct-v0.1",

      credits: 1,
    },
    {
      name: "llama-3.1-nemotron-70b-reward",
      publisher: "NVIDIA",
      use: "Reward model (RLHF)",
      category: "text",
      nvidiaId: "nvidia/llama-3.1-nemotron-70b-reward",

      credits: 3,
    },
    {
      name: "llama-3.2-3b-instruct",
      publisher: "Meta",
      use: "Chat, reasoning",
      category: "text",
      nvidiaId: "meta/llama-3.2-3b-instruct",

      credits: 1,
    },
    {
      name: "llama-3.2-1b-instruct",
      publisher: "Meta",
      use: "Chat, reasoning",
      category: "text",
      nvidiaId: "meta/llama-3.2-1b-instruct",

      credits: 1,
    },
    {
      name: "qwen2-7b-instruct",
      publisher: "Qwen",
      use: "Chinese & English LLM",
      category: "text",
      nvidiaId: "qwen/qwen2-7b-instruct",

      credits: 1,
    },
    {
      name: "dracarys-llama-3.1-70b-instruct",
      publisher: "Abacus.AI",
      use: "Code, summarization",
      category: "text",
      nvidiaId: "abacusai/dracarys-llama-3.1-70b-instruct",

      credits: 5,
    },
    {
      name: "llama-3.1-405b-instruct",
      publisher: "Meta",
      use: "Synthetic data, coding",
      category: "text",
      nvidiaId: "meta/llama-3.1-405b-instruct",

      credits: 5,
    },
    {
      name: "llama-3.1-70b-instruct",
      publisher: "Meta",
      use: "Chat",
      category: "text",
      nvidiaId: "meta/llama-3.1-70b-instruct",

      credits: 3,
    },
    {
      name: "llama-3.1-8b-instruct",
      publisher: "Meta",
      use: "Chat",
      category: "text",
      nvidiaId: "meta/llama-3.1-8b-instruct",

      credits: 1,
    },
    {
      name: "phi-3-medium-128k-instruct",
      publisher: "Microsoft",
      use: "Chat, reasoning",
      category: "text",
      nvidiaId: "microsoft/phi-3-medium-128k-instruct",

      credits: 2,
    },
    {
      name: "gemma-2-27b-it",
      publisher: "Google",
      use: "Chat, text generation",
      category: "text",
      nvidiaId: "google/gemma-2-27b-it",

      credits: 2,
    },
    {
      name: "gemma-2-9b-it",
      publisher: "Google",
      use: "Chat, text generation",
      category: "text",
      nvidiaId: "google/gemma-2-9b-it",

      credits: 1,
    },
    {
      name: "llama3-chatqa-1.5-8b",
      publisher: "NVIDIA",
      use: "Text chatbot/search",
      category: "text",
      nvidiaId: "nvidia/llama3-chatqa-1.5-8b",

      credits: 1,
    },
    {
      name: "mistral-7b-instruct-v0.3",
      publisher: "Mistral AI",
      use: "Chat",
      category: "text",
      nvidiaId: "mistralai/mistral-7b-instruct-v0.3",

      credits: 1,
    },
    {
      name: "solar-10.7b-instruct",
      publisher: "Upstage",
      use: "NLP, reasoning, math",
      category: "text",
      nvidiaId: "upstage/solar-10.7b-instruct",

      credits: 2,
    },
    {
      name: "nv-embed-v1",
      publisher: "NVIDIA",
      use: "Text embeddings",
      category: "embedding",
      nvidiaId: "nvidia/nv-embed-v1",

      credits: 1,
    },
    {
      name: "bge-m3",
      publisher: "BAAI",
      use: "Text retrieval / embeddings",
      category: "embedding",
      nvidiaId: "baai/bge-m3",

      credits: 1,
    },
    {
      name: "breeze-7b-instruct",
      publisher: "MediaTek",
      use: "Traditional Chinese chat",
      category: "text",
      nvidiaId: "mediatek/breeze-7b-instruct",

      credits: 1,
    },
    {
      name: "phi-3-small-8k-instruct",
      publisher: "Microsoft",
      use: "Chat",
      category: "text",
      nvidiaId: "microsoft/phi-3-small-8k-instruct",

      credits: 1,
    },
    {
      name: "phi-3-small-128k-instruct",
      publisher: "Microsoft",
      use: "Chat (long context)",
      category: "text",
      nvidiaId: "microsoft/phi-3-small-128k-instruct",

      credits: 1,
    },
    {
      name: "phi-3-medium-4k-instruct",
      publisher: "Microsoft",
      use: "Chat",
      category: "text",
      nvidiaId: "microsoft/phi-3-medium-4k-instruct",

      credits: 2,
    },
    {
      name: "sea-lion-7b-instruct",
      publisher: "AI Singapore",
      use: "Southeast Asian languages",
      category: "text",
      nvidiaId: "ai-singapore/sea-lion-7b-instruct",

      credits: 1,
    },
    {
      name: "phi-3-mini-4k-instruct",
      publisher: "Microsoft",
      use: "Chat",
      category: "text",
      nvidiaId: "microsoft/phi-3-mini-4k-instruct",

      credits: 1,
    },
    {
      name: "phi-3-mini-128k-instruct",
      publisher: "Microsoft",
      use: "Chat (long context)",
      category: "text",
      nvidiaId: "microsoft/phi-3-mini-128k-instruct",

      credits: 1,
    },
    {
      name: "mixtral-8x22b-instruct-v0.1",
      publisher: "Mistral AI",
      use: "Advanced reasoning",
      category: "text",
      nvidiaId: "mistralai/mixtral-8x22b-instruct-v0.1",

      credits: 5,
    },
    {
      name: "llama3-70b-instruct",
      publisher: "Meta",
      use: "Chat",
      category: "text",
      nvidiaId: "meta/llama3-70b-instruct",

      credits: 3,
    },
    {
      name: "llama3-8b-instruct",
      publisher: "Meta",
      use: "Chat",
      category: "text",
      nvidiaId: "meta/llama3-8b-instruct",

      credits: 1,
    },
    {
      name: "rerank-qa-mistral-4b",
      publisher: "NVIDIA",
      use: "Ranking / reranking",
      category: "embedding",
      nvidiaId: "nvidia/rerank-qa-mistral-4b",

      credits: 1,
    },
    {
      name: "gemma-7b",
      publisher: "Google",
      use: "Chat, text generation",
      category: "text",
      nvidiaId: "google/gemma-7b",

      credits: 1,
    },
    {
      name: "mistral-7b-instruct-v0.2",
      publisher: "Mistral AI",
      use: "Chat",
      category: "text",
      nvidiaId: "mistralai/mistral-7b-instruct-v0.2",

      credits: 1,
    },
    {
      name: "mixtral-8x7b-instruct",
      publisher: "Mistral AI",
      use: "Advanced reasoning",
      category: "text",
      nvidiaId: "mistralai/mixtral-8x7b-instruct",

      credits: 3,
    },
    {
      name: "llama-3-taiwan-70b-instruct",
      publisher: "Yen-Ting Lin",
      use: "Traditional Mandarin",
      category: "text",
      nvidiaId: "yentinglin/llama-3-taiwan-70b-instruct",

      credits: 1,
    },
    {
      name: "llama-3-swallow-70b-instruct-v0.1",
      publisher: "TokyoTech-LLM",
      use: "Japanese",
      category: "text",
      nvidiaId: "tokyotech-llm/llama-3-swallow-70b-instruct-v0.1",

      credits: 1,
    },
    {
      name: "jamba-1.5-mini-instruct",
      publisher: "AI21 Labs",
      use: "Chat, generative AI",
      category: "text",
      nvidiaId: "ai21labs/jamba-1.5-mini-instruct",

      credits: 1,
    },
    {
      name: "nemotron-mini-4b-instruct",
      publisher: "NVIDIA",
      use: "Chat, RAG",
      category: "text",
      nvidiaId: "nvidia/nemotron-mini-4b-instruct",

      credits: 1,
    },
    {
      name: "mistral-nemo-minitron-8b-base",
      publisher: "NVIDIA",
      use: "Chat, content generation",
      category: "text",
      nvidiaId: "nvidia/mistral-nemo-minitron-8b-base",

      credits: 1,
    },
    {
      name: "phi-3.5-mini-instruct",
      publisher: "Microsoft",
      use: "Chat, edge",
      category: "text",
      nvidiaId: "microsoft/phi-3.5-mini-instruct",

      credits: 1,
    },
    {
      name: "rakutenai-7b-instruct",
      publisher: "Rakuten",
      use: "Chat",
      category: "text",
      nvidiaId: "rakuten/rakutenai-7b-instruct",

      credits: 1,
    },
    {
      name: "rakutenai-7b-chat",
      publisher: "Rakuten",
      use: "Chat",
      category: "text",
      nvidiaId: "rakuten/rakutenai-7b-chat",

      credits: 1,
    },
    {
      name: "chatglm3-6b",
      publisher: "THUDM",
      use: "Chinese/English chat, translation",
      category: "text",
      nvidiaId: "thudm/chatglm3-6b",

      credits: 1,
    },
    {
      name: "baichuan2-13b-chat",
      publisher: "Baichuan AI",
      use: "Chinese/English chat",
      category: "text",
      nvidiaId: "baichuan-ai/baichuan2-13b-chat",

      credits: 1,
    },
    {
      name: "gpt-oss-20b",
      publisher: "OpenAI",
      use: "Text reasoning, math",
      category: "text",
      nvidiaId: "openai/gpt-oss-20b",

      credits: 1,
    },
    {
      name: "gpt-oss-120b",
      publisher: "OpenAI",
      use: "Text reasoning (MoE)",
      category: "text",
      nvidiaId: "openai/gpt-oss-120b",

      credits: 1,
    },

    // Code-focused models
    {
      name: "usdcode",
      publisher: "NVIDIA",
      use: "OpenUSD coding",
      category: "code",
      nvidiaId: "nvidia/usdcode",

      credits: 1,
    },
    {
      name: "qwen2.5-coder-32b-instruct",
      publisher: "Qwen",
      use: "Code generation, reasoning, fixing",
      category: "code",
      nvidiaId: "qwen/qwen2.5-coder-32b-instruct",

      credits: 1,
    },
    {
      name: "qwen2.5-coder-7b-instruct",
      publisher: "Qwen",
      use: "Code completion",
      category: "code",
      nvidiaId: "qwen/qwen2.5-coder-7b-instruct",

      credits: 1,
    },
    {
      name: "mamba-codestral-7b-v0.1",
      publisher: "Mistral AI",
      use: "Code completion",
      category: "code",
      nvidiaId: "mistralai/mamba-codestral-7b-v0.1",

      credits: 1,
    },
    {
      name: "starcoder2-7b",
      publisher: "BigCode",
      use: "Code completion, Python",
      category: "code",
      nvidiaId: "bigcode/starcoder2-7b",

      credits: 1,
    },
    {
      name: "qwq-32b",
      publisher: "Qwen",
      use: "Coding, reasoning",
      category: "code",
      nvidiaId: "qwen/qwq-32b",

      credits: 1,
    },

    // Speech / audio and TTS
    {
      name: "parakeet-ctc-0.6b-zh-tw",
      publisher: "NVIDIA",
      use: "Mandarin Taiwanese English ASR",
      category: "speech",
      nvidiaId: "nvidia/parakeet-ctc-0.6b-zh-tw",

      credits: 1,
    },
    {
      name: "parakeet-ctc-0.6b-zh-cn",
      publisher: "NVIDIA",
      use: "Mandarin English ASR",
      category: "speech",
      nvidiaId: "nvidia/parakeet-ctc-0.6b-zh-cn",

      credits: 1,
    },
    {
      name: "parakeet-ctc-0.6b-es",
      publisher: "NVIDIA",
      use: "Spanish-English ASR",
      category: "speech",
      nvidiaId: "nvidia/parakeet-ctc-0.6b-es",

      credits: 1,
    },
    {
      name: "parakeet-ctc-0.6b-vi",
      publisher: "NVIDIA",
      use: "Vietnamese-English ASR",
      category: "speech",
      nvidiaId: "nvidia/parakeet-ctc-0.6b-vi",

      credits: 1,
    },
    {
      name: "parakeet-tdt-0.6b-v2",
      publisher: "NVIDIA",
      use: "English ASR with timestamps",
      category: "speech",
      nvidiaId: "nvidia/parakeet-tdt-0.6b-v2",

      credits: 1,
    },
    {
      name: "parakeet-ctc-1.1b-asr",
      publisher: "NVIDIA",
      use: "English ASR",
      category: "speech",
      nvidiaId: "nvidia/parakeet-ctc-1.1b-asr",

      credits: 1,
    },
    {
      name: "parakeet-ctc-0.6b-asr",
      publisher: "NVIDIA",
      use: "English ASR",
      category: "speech",
      nvidiaId: "nvidia/parakeet-ctc-0.6b-asr",

      credits: 1,
    },
    {
      name: "parakeet-1.1b-rnnt-multilingual-asr",
      publisher: "NVIDIA",
      use: "25-language ASR",
      category: "speech",
      nvidiaId: "nvidia/parakeet-1.1b-rnnt-multilingual-asr",

      credits: 1,
    },
    {
      name: "whisper-large-v3",
      publisher: "OpenAI",
      use: "Speech recognition",
      category: "speech",
      nvidiaId: "openai/whisper-large-v3",

      credits: 1,
    },
    {
      name: "canary-1b-asr",
      publisher: "NVIDIA",
      use: "Multilingual speech-to-text & translation",
      category: "speech",
      nvidiaId: "nvidia/canary-1b-asr",

      credits: 1,
    },
    {
      name: "phi-4-multimodal-instruct",
      publisher: "Microsoft",
      use: "Speech + image reasoning",
      category: "speech",
      nvidiaId: "microsoft/phi-4-multimodal-instruct",

      credits: 1,
    },
    {
      name: "magpie-tts-flow",
      publisher: "NVIDIA",
      use: "Text-to-speech",
      category: "speech",
      nvidiaId: "nvidia/magpie-tts-flow",

      credits: 1,
    },
  ];

// Small curated list for homepage \"Best-in-Class Models\" slider.
window.CLEX_TOP_MODELS = [
  {
    name: "deepseek-v3.2",
    publisher: "DeepSeek AI",
    use: "Reasoning, long context",
    badge: "Top pick",
    color: "#4f5bd5",
  },
  {
    name: "llama-3.3-70b-instruct",
    publisher: "Meta",
    use: "Chat, reasoning, math",
    badge: "Flagship",
    color: "#0081FB",
  },
  {
    name: "mistral-medium-3-instruct",
    publisher: "Mistral AI",
    use: "Enterprise-grade coding & chat",
    badge: "Production",
    color: "#FF7000",
  },
  {
    name: "gemma-2-27b-it",
    publisher: "Google",
    use: "General chat & generation",
    badge: "Popular",
    color: "#34d399",
  },
  {
    name: "gpt-oss-120b",
    publisher: "OpenAI",
    use: "Mixture-of-experts reasoning",
    badge: "Power",
    color: "#ffffff",
  },
];

// Curated marquee data for homepage model strip.
window.CLEX_MARQUEE_MODELS = [
  {
    name: "gpt-oss-120b",
    provider: "openai",
    context: "Model-specific",
    maxOutput: "Model-specific",
    pricingNote: "See provider",
  },
  {
    name: "llama-3.3-70b-instruct",
    provider: "meta",
    context: "Model-specific",
    maxOutput: "Model-specific",
    pricingNote: "See provider",
  },
  {
    name: "deepseek-v3.2",
    provider: "deepseek-ai",
    context: "Model-specific",
    maxOutput: "Model-specific",
    pricingNote: "See provider",
  },
  {
    name: "mistral-medium-3-instruct",
    provider: "mistralai",
    context: "Model-specific",
    maxOutput: "Model-specific",
    pricingNote: "See provider",
  },
  {
    name: "qwen2.5-7b-instruct",
    provider: "qwen",
    context: "Model-specific",
    maxOutput: "Model-specific",
    pricingNote: "See provider",
  },
  {
    name: "nv-embed-v1",
    provider: "nvidia",
    context: "Embedding",
    maxOutput: "Vector",
    pricingNote: "See provider",
  },
  {
    name: "whisper-large-v3",
    provider: "openai",
    context: "Audio → text",
    maxOutput: "Transcript",
    pricingNote: "Per minute",
  },
  {
    name: "magpie-tts-flow",
    provider: "nvidia",
    context: "Text → audio",
    maxOutput: "Speech",
    pricingNote: "Per second",
  },
];

// Normalize legacy model entries into a canonical schema used across pages.
(function normalizeClexModelCatalog() {
  const rawModels = Array.isArray(window.CLEX_MODELS) ? window.CLEX_MODELS : [];

  const providerByPrefix = {
    nvidia: "NVIDIA",
    meta: "Meta",
    openai: "OpenAI",
    google: "Google",
    qwen: "Qwen",
    mistralai: "Mistral AI",
    "deepseek-ai": "DeepSeek",
    microsoft: "Microsoft",
    ibm: "IBM",
    baai: "BAAI",
    ai21labs: "AI21 Labs",
    bytedance: "ByteDance",
  };

  const categoryToCapabilities = {
    text: ["text"],
    code: ["text", "code"],
    speech: ["speech"],
    vision: ["text", "vision"],
    embedding: ["embedding"],
    safety: ["text"],
  };

  const categoryLabels = {
    text: "Text & Chat",
    code: "Code",
    speech: "Speech",
    vision: "Vision",
    embedding: "Embedding",
    safety: "Safety",
  };

  // Only set model-specific values where they are well-known.
  const exactModelMetadata = {
    "meta/llama-3.3-70b-instruct": {
      context_window: 131072,
      max_output_tokens: 8192,
      knowledge_cutoff: "December 2023",
    },
    "meta/llama-3.1-405b-instruct": {
      context_window: 131072,
      max_output_tokens: 8192,
      knowledge_cutoff: "December 2023",
    },
    "meta/llama-3.1-70b-instruct": {
      context_window: 131072,
      max_output_tokens: 8192,
      knowledge_cutoff: "December 2023",
    },
    "meta/llama-3.1-8b-instruct": {
      context_window: 131072,
      max_output_tokens: 8192,
      knowledge_cutoff: "December 2023",
    },
    "meta/llama-3.2-3b-instruct": {
      context_window: 131072,
      max_output_tokens: 8192,
      knowledge_cutoff: "December 2023",
    },
    "meta/llama-3.2-1b-instruct": {
      context_window: 131072,
      max_output_tokens: 8192,
      knowledge_cutoff: "December 2023",
    },
  };

  const modelMetadataRules = [
    {
      test: /^meta\/llama-4-(?:maverick|scout)-/i,
      values: {
        context_display: "1M+",
        max_output_tokens: 16384,
      },
    },
    {
      test: /\/(whisper-large-v3|parakeet[^/]*|canary-1b-asr|phi-4-multimodal-instruct)$/i,
      values: {
        context_display: "Audio input",
        max_output_display: "Transcript",
        pricing_display: "Per minute",
      },
    },
    {
      test: /\/magpie-tts-flow$/i,
      values: {
        context_display: "Text input",
        max_output_display: "Speech audio",
        pricing_display: "Per second",
      },
    },
    {
      test: /\/(nv-embed-v1|bge-m3|[^/]*embedqa[^/]*|[^/]*rerankqa[^/]*|[^/]*rerank[^/]*|llama-nemotron-rerank-1b-v2)$/i,
      values: {
        context_display: "Document chunks",
        max_output_display: "Vector / ranking",
        input_cost: 0.02,
        output_cost: null,
        pricing_display: "$0.02 per 1M input",
      },
    },
    {
      test: /\/(guard|guardian|safety|nemoguard)/i,
      values: {
        context_window: 8192,
        max_output_tokens: 512,
        max_output_display: "Safety labels",
      },
    },
    {
      test: /\/(deepseek-v3|deepseek-r1|qwen3|qwen2\.5|qwen2-7b|qwq-|glm5|glm4\.7|gpt-oss-|kimi-k2|step-3\.5|mistral-small-3\.1|mistral-medium-3|devstral|magistral|mistral-nemotron|minimax-m2|sarvam-m|seed-oss-36b|stockmark-2-100b)/i,
      values: {
        context_window: 131072,
        max_output_tokens: 8192,
      },
    },
    {
      test: /\/(ministral|mistral-small-24b|mistral-7b|mixtral-|solar-10\.7b|jamba-1\.5|marin-8b|granite-3\.3|eurollm-9b|bielik-11b|teuken-7b|falcon3-7b|colosseum-355b|italia-10b|rakutenai|chatglm3|baichuan2|sea-lion-7b|breeze-7b|phi-4-mini|phi-3\.5-mini|phi-3-medium-|phi-3-small-|phi-3-mini-|gemma-3n-|qwen2\.5-coder-|qwen3-coder-|starcoder2-|usdcode|mamba-codestral|llama3-chatqa|dracarys-llama-3\.1-70b)/i,
      values: {
        context_window: 32768,
        max_output_tokens: 8192,
      },
    },
    {
      test: /\/(gemma-2-|gemma-7b)/i,
      values: {
        context_window: 8192,
        max_output_tokens: 8192,
      },
    },
    {
      test: /\/(llama-(?:3\.1|3\.2|3\.3)|llama3-|swallow|taiwan|nemotron-|llama-3\.[123]-nemotron|mistral-nemo-minitron)/i,
      values: {
        context_window: 131072,
        max_output_tokens: 8192,
      },
    },
  ];

  function toTitleCaseFromSlug(value) {
    if (!value) return "";
    return value
      .split(/[-_]/)
      .map((part) => {
        if (/^\d/.test(part)) return part.toUpperCase();
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(" ");
  }

  function normalizeProvider(rawProvider, modelId) {
    if (typeof rawProvider === "string" && rawProvider.trim()) {
      return rawProvider.trim();
    }
    const prefix = String(modelId || "").split("/")[0].toLowerCase();
    return providerByPrefix[prefix] || toTitleCaseFromSlug(prefix || "Unknown");
  }

  function normalizeCategory(rawCategory) {
    const value = String(rawCategory || "text").toLowerCase();
    if (value in categoryToCapabilities) return value;
    return "text";
  }

  function formatNumericTokenCount(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    if (value >= 1_048_576) {
      return `${Math.round(value / 1_048_576)}M`;
    }
    if (value >= 1_024) {
      return `${Math.round(value / 1_024)}k`;
    }
    return String(value);
  }

  function formatPriceValue(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) return "?";
    return value.toFixed(2);
  }

  function inferParameterDisplay(modelId) {
    const id = String(modelId || "");
    const moeMatch = id.match(/(\d+(?:\.\d+)?)b-a(\d+(?:\.\d+)?)b/i);
    if (moeMatch) {
      return `${moeMatch[1]}B (${moeMatch[2]}B act.)`;
    }

    const expertsMatch = id.match(/(\d+(?:\.\d+)?)b-(\d+)e/i);
    if (expertsMatch) {
      return `${expertsMatch[1]}B x${expertsMatch[2]}E`;
    }

    const denseMixtureMatch = id.match(/(\d+)x(\d+(?:\.\d+)?)b/i);
    if (denseMixtureMatch) {
      return `${denseMixtureMatch[1]}x${denseMixtureMatch[2]}B`;
    }

    const scaleMatch = id.match(/(\d+(?:\.\d+)?)([bm])/i);
    if (scaleMatch) {
      return `${scaleMatch[1]}${scaleMatch[2].toUpperCase()}`;
    }

    const labeledVersion =
      id.match(/glm(\d+(?:\.\d+)?)/i) ||
      id.match(/step-(\d+(?:\.\d+)?)/i) ||
      id.match(/minimax-m(\d+(?:\.\d+)?)/i) ||
      id.match(/kimi-k(\d+(?:\.\d+)?)/i);
    if (labeledVersion) {
      return labeledVersion[0]
        .replace(/^[^a-z0-9]+/i, "")
        .replace(/-/g, " ")
        .toUpperCase();
    }

    const tierMatch =
      id.match(/mistral-medium-(\d+)/i) ||
      id.match(/mistral-small-(\d+(?:\.\d+)?)/i);
    if (tierMatch) {
      return `Tier ${tierMatch[1]}`;
    }

    if (/embed|rerank/i.test(id)) return "Embedding";
    if (/guard|guardian|safety|nemoguard/i.test(id)) return "Guardrail";
    if (/whisper|parakeet|canary|magpie/i.test(id)) return "Audio";

    return "Specialized";
  }

  function inferParameterBillions(modelId) {
    const id = String(modelId || "");
    const denseMixtureMatch = id.match(/(\d+)x(\d+(?:\.\d+)?)b/i);
    if (denseMixtureMatch) {
      return Number(denseMixtureMatch[1]) * Number(denseMixtureMatch[2]);
    }

    const scaleMatch = id.match(/(\d+(?:\.\d+)?)([bm])/i);
    if (!scaleMatch) return null;

    const value = Number(scaleMatch[1]);
    if (!Number.isFinite(value)) return null;
    return scaleMatch[2].toLowerCase() === "m" ? value / 1000 : value;
  }

  function inferContextWindow(id, category) {
    if (category === "embedding" || category === "speech") return null;

    const tokenMatch = String(id).match(/(\d+)(k|m)\b/i);
    if (tokenMatch) {
      const magnitude = tokenMatch[2].toLowerCase() === "m" ? 1_000_000 : 1024;
      return Number(tokenMatch[1]) * magnitude;
    }

    if (/^meta\/llama-4-(?:maverick|scout)-/i.test(id)) return null;
    if (/\/(gemma-2-|gemma-7b)/i.test(id)) return 8192;
    if (/\/(mistral-7b|mixtral-|ministral|mistral-small-24b|solar-10\.7b|jamba-1\.5|falcon3-7b|rakutenai|chatglm3|baichuan2|sea-lion-7b|breeze-7b)/i.test(id)) {
      return 32768;
    }
    if (/\/(deepseek-v3|deepseek-r1|qwen3|qwen2\.5|qwen2-7b|qwq-|glm5|glm4\.7|gpt-oss-|kimi-k2|step-3\.5|mistral-small-3\.1|mistral-medium-3|devstral|magistral|mistral-nemotron|minimax-m2|sarvam-m|seed-oss-36b|stockmark-2-100b|llama-(?:3\.1|3\.2|3\.3)|llama3-|swallow|taiwan|nemotron-|mistral-nemo-minitron)/i.test(id)) {
      return 131072;
    }
    if (/\/(qwen2\.5-coder-|qwen3-coder-|starcoder2-|usdcode|mamba-codestral|phi-4-mini|phi-3\.5-mini|phi-3-medium-|phi-3-small-|phi-3-mini-|gemma-3n-|colosseum-355b|italia-10b|marin-8b|granite-3\.3|eurollm-9b|bielik-11b|teuken-7b|dracarys-llama-3\.1-70b|llama3-chatqa)/i.test(id)) {
      return 32768;
    }

    if (category === "safety") return 8192;
    if (category === "vision") return 32768;
    return 32768;
  }

  function inferMaxOutputTokens(id, category, contextWindow) {
    if (category === "embedding" || category === "speech") return null;
    if (category === "safety") return 512;
    if (/^meta\/llama-4-(?:maverick|scout)-/i.test(id)) return 16384;
    if (/\/gpt-oss-/i.test(id)) return 16384;
    if (/\/(phi-|gemma-|mistral-7b|mixtral-|ministral|mistral-small-24b|qwen2\.5-coder-|qwen3-coder-|starcoder2-|usdcode|mamba-codestral)/i.test(id)) {
      return 8192;
    }
    if (typeof contextWindow === "number" && contextWindow >= 131072) {
      return 8192;
    }
    return 4096;
  }

  function inferPricing(id, category, parameterBillions) {
    if (category === "embedding") {
      return {
        input_cost: 0.02,
        output_cost: null,
        pricing_display: "$0.02 per 1M input",
      };
    }

    if (category === "speech") {
      return {
        input_cost: null,
        output_cost: null,
        pricing_display: /magpie-tts-flow$/i.test(id)
          ? "Per second"
          : "Per minute",
      };
    }

    const idString = String(id || "");
    const isPremium =
      /\/(gpt-oss-120b|llama-3\.1-405b-instruct|llama-4-|qwen3\.5-397b-a17b|qwen3-coder-480b-a35b-instruct|colosseum-355b|llama-3\.1-nemotron-ultra-253b|deepseek-v3|mistral-medium-3|step-3\.5-flash|minimax-m2\.5|kimi-k2\.5)/i.test(
        idString,
      ) || (typeof parameterBillions === "number" && parameterBillions >= 70);

    const isStandard =
      !isPremium &&
      (/\/(devstral|qwen2\.5-coder-|mistral-small-|mixtral-|gemma-2-27b-it|gpt-oss-20b|glm5|glm4\.7|kimi-k2|magistral|mistral-nemotron|phi-4|gemma-3n|llama-3\.3|deepseek-r1-distill-qwen-32b|qwen3-next-80b-a3b)/i.test(
        idString,
      ) ||
        category === "code" ||
        category === "vision" ||
        (typeof parameterBillions === "number" && parameterBillions >= 20));

    const input_cost = isPremium ? 0.8 : isStandard ? 0.2 : 0.05;
    const output_cost = isPremium ? 2.4 : isStandard ? 0.6 : 0.15;
    return {
      input_cost,
      output_cost,
      pricing_display: `$${formatPriceValue(input_cost)} / $${formatPriceValue(output_cost)} per 1M`,
    };
  }

  function resolveMetadata(id, category) {
    const exact = exactModelMetadata[id] || {};
    const ruleMatch =
      modelMetadataRules.find((rule) => rule.test.test(id))?.values || {};
    const inferredContextWindow = inferContextWindow(id, category);

    const context_window =
      typeof exact.context_window === "number"
        ? exact.context_window
        : typeof inferredContextWindow === "number"
          ? inferredContextWindow
          : typeof ruleMatch.context_window === "number"
            ? ruleMatch.context_window
            : null;

    const max_output_tokens =
      typeof exact.max_output_tokens === "number"
        ? exact.max_output_tokens
        : typeof ruleMatch.max_output_tokens === "number"
          ? ruleMatch.max_output_tokens
          : inferMaxOutputTokens(id, category, context_window);

    const pricing = inferPricing(id, category, inferParameterBillions(id));

    return {
      context_window,
      max_output_tokens,
      input_cost:
        typeof exact.input_cost === "number"
          ? exact.input_cost
          : typeof ruleMatch.input_cost === "number"
            ? ruleMatch.input_cost
            : pricing.input_cost,
      output_cost:
        typeof exact.output_cost === "number"
          ? exact.output_cost
          : typeof ruleMatch.output_cost === "number"
            ? ruleMatch.output_cost
            : pricing.output_cost,
      knowledge_cutoff:
        exact.knowledge_cutoff || ruleMatch.knowledge_cutoff || null,
      context_display: ruleMatch.context_display || null,
      max_output_display: ruleMatch.max_output_display || null,
      pricing_display: ruleMatch.pricing_display || pricing.pricing_display,
    };
  }

  function normalizeModel(rawModel) {
    const id = String(
      rawModel?.id || rawModel?.nvidiaId || rawModel?.model || "",
    ).trim();
    if (!id || !id.includes("/")) return null;

    const category = normalizeCategory(rawModel?.category);
    const provider = normalizeProvider(rawModel?.provider || rawModel?.publisher, id);
    const modelName = rawModel?.name || id.split("/")[1] || id;
    const description =
      rawModel?.description || rawModel?.use || "Model-specific capabilities";
    const resolvedMetadata = resolveMetadata(id, category);
    const params_display = inferParameterDisplay(id);
    const context_display =
      resolvedMetadata.context_display ||
      formatNumericTokenCount(resolvedMetadata.context_window) ||
      "Model-specific";
    const max_output_display =
      resolvedMetadata.max_output_display ||
      formatNumericTokenCount(resolvedMetadata.max_output_tokens) ||
      (category === "embedding"
        ? "Vector / ranking"
        : category === "speech"
          ? "Transcript"
          : "Model-specific");
    const pricing_display =
      resolvedMetadata.pricing_display ||
      (resolvedMetadata.input_cost != null || resolvedMetadata.output_cost != null
        ? `$${formatPriceValue(resolvedMetadata.input_cost)} / $${formatPriceValue(resolvedMetadata.output_cost)} per 1M`
        : "See provider docs");
    const cutoff_display =
      resolvedMetadata.knowledge_cutoff || "Provider specific";

    return {
      id,
      name: modelName,
      provider,
      category,
      capabilities: Array.isArray(rawModel?.capabilities)
        ? rawModel.capabilities
        : categoryToCapabilities[category] || ["text"],
      context_window:
        typeof resolvedMetadata.context_window === "number"
          ? resolvedMetadata.context_window
          : null,
      max_output_tokens:
        typeof resolvedMetadata.max_output_tokens === "number"
          ? resolvedMetadata.max_output_tokens
          : null,
      input_cost:
        typeof resolvedMetadata.input_cost === "number"
          ? resolvedMetadata.input_cost
          : null,
      output_cost:
        typeof resolvedMetadata.output_cost === "number"
          ? resolvedMetadata.output_cost
          : null,
      knowledge_cutoff: resolvedMetadata.knowledge_cutoff || null,
      params_display,
      context_display,
      max_output_display,
      pricing_display,
      cutoff_display,
      category_label: categoryLabels[category] || "Model",
      isPreview: Boolean(rawModel?.isPreview),
      comingSoon: Boolean(rawModel?.comingSoon),
      description,

      // Credit cost per call. Server-side lib/credits.ts is the source of
      // truth; this is the advertised value that the catalog ships to the
      // client. Falls back to 1 (DEFAULT_MODEL_COST) if the entry didn't
      // declare one.
      credits: typeof rawModel?.credits === "number" ? rawModel.credits : 1,

      // Legacy aliases used by older page scripts.
      publisher: provider,
      use: description,
      nvidiaId: id,
    };
  }

  const uniqueModelsById = new Map();
  for (const rawModel of rawModels) {
    const normalized = normalizeModel(rawModel);
    if (!normalized) continue;
    if (!uniqueModelsById.has(normalized.id)) {
      uniqueModelsById.set(normalized.id, normalized);
    }
  }

  const canonicalModels = Array.from(uniqueModelsById.values());
  window.CLEX_MODELS = canonicalModels;

  const modelsById = new Map(canonicalModels.map((model) => [model.id, model]));
  const providerColor = {
    NVIDIA: "#76b900",
    Meta: "#0081FB",
    "DeepSeek AI": "#4f5bd5",
    DeepSeek: "#4f5bd5",
    OpenAI: "#22c55e",
    Google: "#34d399",
    "Mistral AI": "#FF7000",
    Qwen: "#6366f1",
  };

  function formatTokenCount(value) {
    return formatNumericTokenCount(value) || "Model-specific";
  }

  function providerSlug(provider) {
    return String(provider || "")
      .toLowerCase()
      .replace(/\s+/g, "-");
  }

  const featuredIds = [
    "deepseek-ai/deepseek-v3.2",
    "meta/llama-3.3-70b-instruct",
    "mistralai/mistral-medium-3-instruct",
    "google/gemma-2-27b-it",
    "openai/gpt-oss-120b",
  ];

  window.CLEX_TOP_MODELS = featuredIds
    .map((id, index) => {
      const model = modelsById.get(id);
      if (!model) return null;
      const badge = ["Top Pick", "Flagship", "Production", "Popular", "Power"][
        index
      ];
      const color = providerColor[model.provider] || "#22d3ee";
      return {
        id: model.id,
        name: model.id,
        publisher: model.provider,
        use: model.description,
        badge,
        color,
        context: model.context_display || formatTokenCount(model.context_window),
        maxOut:
          model.max_output_display || formatTokenCount(model.max_output_tokens),
        pricing: model.pricing_display,
      };
    })
    .filter(Boolean);

  window.CLEX_MARQUEE_MODELS = canonicalModels
    .filter((model) =>
      ["text", "code", "embedding", "speech", "vision"].includes(model.category),
    )
    .map((model) => ({
      id: model.id,
      name: model.id,
      provider: providerSlug(model.provider),
      providerName: model.provider,
      category: model.category_label,
      params: model.params_display,
      context: model.context_display || formatTokenCount(model.context_window),
      maxOutput:
        model.max_output_display || formatTokenCount(model.max_output_tokens),
      pricingNote: model.pricing_display || "See provider docs",
      cutoff: model.cutoff_display || "Provider specific",
    }));

  const byCategory = canonicalModels.reduce((acc, model) => {
    acc[model.category] = (acc[model.category] || 0) + 1;
    return acc;
  }, {});

  window.CLEX_MODEL_STATS = {
    total: canonicalModels.length,
    byCategory,
  };
})();
