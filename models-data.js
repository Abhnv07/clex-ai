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
    },
    {
      name: "qwen3.5-122b-a10b",
      publisher: "Qwen",
      use: "Chat, coding, reasoning",
      category: "text",
      nvidiaId: "qwen/qwen3.5-122b-a10b",
    },
    {
      name: "qwen3.5-397b-a17b",
      publisher: "Qwen",
      use: "Vision, chat, RAG, agentic",
      category: "text",
      nvidiaId: "qwen/qwen3.5-397b-a17b",
    },
    {
      name: "glm5",
      publisher: "Z.ai",
      use: "Reasoning, agentic",
      category: "text",
      nvidiaId: "zhipuai/glm5",
    },
    {
      name: "minimax-m2.5",
      publisher: "Minimaxai",
      use: "Coding, reasoning, office tasks",
      category: "text",
      nvidiaId: "minimaxai/minimax-m2.5",
    },
    {
      name: "minimax-m2.1",
      publisher: "Minimaxai",
      use: "Coding, app/web dev, agentic",
      category: "text",
      nvidiaId: "minimaxai/minimax-m2.1",
    },
    {
      name: "step-3.5-flash",
      publisher: "Stepfun-ai",
      use: "Reasoning, agentic",
      category: "text",
      nvidiaId: "stepfun-ai/step-3.5-flash",
    },
    {
      name: "kimi-k2.5",
      publisher: "Moonshotai",
      use: "Multimodal, video understanding",
      category: "vision",
      nvidiaId: "moonshotai/kimi-k2.5",
    },
    {
      name: "glm4.7",
      publisher: "Z.ai",
      use: "Agentic coding, tool calling",
      category: "text",
      nvidiaId: "zhipuai/glm4.7",
    },
    {
      name: "deepseek-v3.2",
      publisher: "DeepSeek AI",
      use: "Reasoning, long context",
      category: "text",
      nvidiaId: "deepseek-ai/deepseek-v3.2",
    },
    {
      name: "nemotron-3-nano-30b-a3b",
      publisher: "NVIDIA",
      use: "Coding, reasoning, MoE",
      category: "text",
      nvidiaId: "nvidia/nemotron-3-nano-30b-a3b",
    },
    {
      name: "kimi-k2-thinking",
      publisher: "Moonshotai",
      use: "Reasoning, tool use",
      category: "text",
      nvidiaId: "moonshotai/kimi-k2-thinking",
    },
    {
      name: "ministral-14b-instruct-2512",
      publisher: "Mistral AI",
      use: "Chat, instruction following",
      category: "text",
      nvidiaId: "mistralai/ministral-14b-instruct-2512",
    },
    {
      name: "devstral-2-123b-instruct-2512",
      publisher: "Mistral AI",
      use: "Code, reasoning",
      category: "code",
      nvidiaId: "mistralai/devstral-2-123b-instruct-2512",
    },
    {
      name: "deepseek-v3.1-terminus",
      publisher: "DeepSeek AI",
      use: "Agentic, tool calling",
      category: "text",
      nvidiaId: "deepseek-ai/deepseek-v3.1-terminus",
    },
    {
      name: "deepseek-v3.1",
      publisher: "DeepSeek AI",
      use: "Reasoning, tool use",
      category: "text",
      nvidiaId: "deepseek-ai/deepseek-v3.1",
    },
    {
      name: "stockmark-2-100b-instruct",
      publisher: "Stockmark",
      use: "Japanese enterprise LLM",
      category: "text",
      nvidiaId: "stockmark/stockmark-2-100b-instruct",
    },
    {
      name: "qwen3-next-80b-a3b-instruct",
      publisher: "Qwen",
      use: "Chat, long context",
      category: "text",
      nvidiaId: "qwen/qwen3-next-80b-a3b-instruct",
    },
    {
      name: "kimi-k2-instruct-0905",
      publisher: "Moonshotai",
      use: "Reasoning, long context",
      category: "text",
      nvidiaId: "moonshotai/kimi-k2-instruct-0905",
    },
    {
      name: "bielik-11b-v2.6-instruct",
      publisher: "Speakleash",
      use: "Polish language, text generation",
      category: "text",
      nvidiaId: "speakleash/bielik-11b-v2.6-instruct",
    },
    {
      name: "qwen3-next-80b-a3b-thinking",
      publisher: "Qwen",
      use: "Reasoning, multilingual",
      category: "text",
      nvidiaId: "qwen/qwen3-next-80b-a3b-thinking",
    },
    {
      name: "seed-oss-36b-instruct",
      publisher: "ByteDance",
      use: "Reasoning, agentic",
      category: "text",
      nvidiaId: "bytedance/seed-oss-36b-instruct",
    },
    {
      name: "qwen3-coder-480b-a35b-instruct",
      publisher: "Qwen",
      use: "Agentic coding",
      category: "code",
      nvidiaId: "qwen/qwen3-coder-480b-a35b-instruct",
    },
    {
      name: "nvidia-nemotron-nano-9b-v2",
      publisher: "NVIDIA",
      use: "Reasoning, agentic",
      category: "text",
      nvidiaId: "nvidia/nvidia-nemotron-nano-9b-v2",
    },
    {
      name: "llama-3.3-nemotron-super-49b-v1.5",
      publisher: "NVIDIA",
      use: "Reasoning, chat, tool calling",
      category: "text",
      nvidiaId: "nvidia/llama-3.3-nemotron-super-49b-v1.5",
    },
    {
      name: "teuken-7b-instruct-commercial-v0.4",
      publisher: "Opengpt-x",
      use: "EU multilingual LLM",
      category: "text",
      nvidiaId: "opengpt-x/teuken-7b-instruct-commercial-v0.4",
    },
    {
      name: "sarvam-m",
      publisher: "Sarvamai",
      use: "Indian language, coding, math",
      category: "text",
      nvidiaId: "sarvamai/sarvam-m",
    },
    {
      name: "mistral-small-3.1-24b-instruct-2503",
      publisher: "Mistral AI",
      use: "Multilingual, image understanding",
      category: "text",
      nvidiaId: "mistralai/mistral-small-3.1-24b-instruct-2503",
    },
    {
      name: "mistral-medium-3-instruct",
      publisher: "Mistral AI",
      use: "Enterprise, software dev",
      category: "text",
      nvidiaId: "mistralai/mistral-medium-3-instruct",
    },
    {
      name: "llama-3.1-nemotron-ultra-253b-v1",
      publisher: "NVIDIA",
      use: "Scientific reasoning, coding",
      category: "text",
      nvidiaId: "nvidia/llama-3.1-nemotron-ultra-253b-v1",
    },
    {
      name: "llama-4-maverick-17b-128e-instruct",
      publisher: "Meta",
      use: "Multimodal, multilingual",
      category: "vision",
      nvidiaId: "meta/llama-4-maverick-17b-128e-instruct",
    },
    {
      name: "llama-4-scout-17b-16e-instruct",
      publisher: "Meta",
      use: "Multimodal, multilingual",
      category: "vision",
      nvidiaId: "meta/llama-4-scout-17b-16e-instruct",
    },
    {
      name: "llama-3.3-nemotron-super-49b-v1",
      publisher: "NVIDIA",
      use: "Chat, reasoning",
      category: "text",
      nvidiaId: "nvidia/llama-3.3-nemotron-super-49b-v1",
    },
    {
      name: "llama-3.1-nemotron-nano-8b-v1",
      publisher: "NVIDIA",
      use: "Chat, edge",
      category: "text",
      nvidiaId: "nvidia/llama-3.1-nemotron-nano-8b-v1",
    },
    {
      name: "marin-8b-instruct",
      publisher: "Marin",
      use: "Reasoning, math, science",
      category: "text",
      nvidiaId: "marin/marin-8b-instruct",
    },
    {
      name: "granite-3.3-8b-instruct",
      publisher: "IBM",
      use: "Reasoning, coding",
      category: "text",
      nvidiaId: "ibm/granite-3.3-8b-instruct",
    },
    {
      name: "eurollm-9b-instruct",
      publisher: "Utter-project",
      use: "EU multilingual",
      category: "text",
      nvidiaId: "utter-project/eurollm-9b-instruct",
    },
    {
      name: "gemma-2-9b-cpt-sahabatai-instruct",
      publisher: "Gotocompany",
      use: "Indonesian language",
      category: "text",
      nvidiaId: "gotocompany/gemma-2-9b-cpt-sahabatai-instruct",
    },
    {
      name: "phi-4-mini-flash-reasoning",
      publisher: "Microsoft",
      use: "Edge reasoning",
      category: "text",
      nvidiaId: "microsoft/phi-4-mini-flash-reasoning",
    },
    {
      name: "kimi-k2-instruct",
      publisher: "Moonshotai",
      use: "Coding, reasoning, agentic",
      category: "text",
      nvidiaId: "moonshotai/kimi-k2-instruct",
    },
    {
      name: "magistral-small-2506",
      publisher: "Mistral AI",
      use: "Reasoning, edge",
      category: "text",
      nvidiaId: "mistralai/magistral-small-2506",
    },
    {
      name: "llama-guard-4-12b",
      publisher: "Meta",
      use: "Multimodal safety",
      category: "safety",
      nvidiaId: "meta/llama-guard-4-12b",
    },
    {
      name: "gemma-3n-e4b-it",
      publisher: "Google",
      use: "Text/audio/image, edge",
      category: "vision",
      nvidiaId: "google/gemma-3n-e4b-it",
    },
    {
      name: "gemma-3n-e2b-it",
      publisher: "Google",
      use: "Text/audio/image, edge",
      category: "vision",
      nvidiaId: "google/gemma-3n-e2b-it",
    },
    {
      name: "mistral-nemotron",
      publisher: "Mistral AI",
      use: "Coding, agentic",
      category: "code",
      nvidiaId: "mistralai/mistral-nemotron",
    },
    {
      name: "llama-3.1-nemotron-nano-vl-8b-v1",
      publisher: "NVIDIA",
      use: "Vision-language",
      category: "vision",
      nvidiaId: "nvidia/llama-3.1-nemotron-nano-vl-8b-v1",
    },
    {
      name: "llama-3.1-nemotron-nano-4b-v1.1",
      publisher: "NVIDIA",
      use: "Reasoning, edge agents",
      category: "text",
      nvidiaId: "nvidia/llama-3.1-nemotron-nano-4b-v1.1",
    },
    {
      name: "nemotron-content-safety-reasoning-4b",
      publisher: "NVIDIA",
      use: "Safety / guardrails",
      category: "safety",
      nvidiaId: "nvidia/nemotron-content-safety-reasoning-4b",
    },
    {
      name: "llama-3.1-nemotron-safety-guard-8b-v3",
      publisher: "NVIDIA",
      use: "Content moderation",
      category: "safety",
      nvidiaId: "nvidia/llama-3.1-nemotron-safety-guard-8b-v3",
    },
    {
      name: "deepseek-r1-distill-llama-8b",
      publisher: "DeepSeek AI",
      use: "Reasoning (distilled)",
      category: "text",
      nvidiaId: "deepseek-ai/deepseek-r1-distill-llama-8b",
    },
    {
      name: "deepseek-r1-distill-qwen-32b",
      publisher: "DeepSeek AI",
      use: "Coding/reasoning (distilled)",
      category: "text",
      nvidiaId: "deepseek-ai/deepseek-r1-distill-qwen-32b",
    },
    {
      name: "deepseek-r1-distill-qwen-14b",
      publisher: "DeepSeek AI",
      use: "Coding/reasoning (distilled)",
      category: "text",
      nvidiaId: "deepseek-ai/deepseek-r1-distill-qwen-14b",
    },
    {
      name: "deepseek-r1-distill-qwen-7b",
      publisher: "DeepSeek AI",
      use: "Coding/reasoning (distilled)",
      category: "text",
      nvidiaId: "deepseek-ai/deepseek-r1-distill-qwen-7b",
    },
    {
      name: "phi-4-mini-instruct",
      publisher: "Microsoft",
      use: "Chat, multilingual",
      category: "text",
      nvidiaId: "microsoft/phi-4-mini-instruct",
    },
    {
      name: "mistral-small-24b-instruct",
      publisher: "Mistral AI",
      use: "Code, math, general",
      category: "text",
      nvidiaId: "mistralai/mistral-small-24b-instruct",
    },
    {
      name: "llama-3.1-nemoguard-8b-topic-control",
      publisher: "NVIDIA",
      use: "Guardrails/topic control",
      category: "safety",
      nvidiaId: "nvidia/llama-3.1-nemoguard-8b-topic-control",
    },
    {
      name: "nemoguard-jailbreak-detect",
      publisher: "NVIDIA",
      use: "Jailbreak detection",
      category: "safety",
      nvidiaId: "nvidia/nemoguard-jailbreak-detect",
    },
    {
      name: "llama-3.1-nemoguard-8b-content-safety",
      publisher: "NVIDIA",
      use: "Content safety",
      category: "safety",
      nvidiaId: "nvidia/llama-3.1-nemoguard-8b-content-safety",
    },
    {
      name: "colosseum-355b-instruct-16k",
      publisher: "Igenius",
      use: "Enterprise regulated industries",
      category: "text",
      nvidiaId: "igenius/colosseum-355b-instruct-16k",
    },
    {
      name: "falcon3-7b-instruct",
      publisher: "Tiiuae",
      use: "Reasoning, math",
      category: "text",
      nvidiaId: "tiiuae/falcon3-7b-instruct",
    },
    {
      name: "italia-10b-instruct-16k",
      publisher: "Igenius",
      use: "European multilingual",
      category: "text",
      nvidiaId: "igenius/italia-10b-instruct-16k",
    },
    {
      name: "qwen2.5-7b-instruct",
      publisher: "Qwen",
      use: "Chinese & English LLM",
      category: "text",
      nvidiaId: "qwen/qwen2.5-7b-instruct",
    },
    {
      name: "cosmos-nemotron-34b",
      publisher: "NVIDIA",
      use: "Vision-language",
      category: "vision",
      nvidiaId: "nvidia/cosmos-nemotron-34b",
    },
    {
      name: "llama-3.2-nv-embedqa-1b-v2",
      publisher: "NVIDIA",
      use: "Text embedding / retrieval",
      category: "embedding",
      nvidiaId: "nvidia/llama-3.2-nv-embedqa-1b-v2",
    },
    {
      name: "llama-3.2-nv-rerankqa-1b-v2",
      publisher: "NVIDIA",
      use: "Reranking",
      category: "embedding",
      nvidiaId: "nvidia/llama-3.2-nv-rerankqa-1b-v2",
    },
    {
      name: "llama-3.3-70b-instruct",
      publisher: "Meta",
      use: "Reasoning, math",
      category: "text",
      nvidiaId: "meta/llama-3.3-70b-instruct",
    },
    {
      name: "nemotron-4-mini-hindi-4b-instruct",
      publisher: "NVIDIA",
      use: "Hindi-English bilingual",
      category: "text",
      nvidiaId: "nvidia/nemotron-4-mini-hindi-4b-instruct",
    },
    {
      name: "granite-guardian-3.0-8b",
      publisher: "IBM",
      use: "Guardrail",
      category: "safety",
      nvidiaId: "ibm/granite-guardian-3.0-8b",
    },
    {
      name: "llama-3.1-swallow-70b-instruct-v0.1",
      publisher: "Tokyo Institute of Science",
      use: "Japanese sovereign AI",
      category: "text",
      nvidiaId: "tokyotech-llm/llama-3.1-swallow-70b-instruct-v0.1",
    },
    {
      name: "llama-3.1-swallow-8b-instruct-v0.1",
      publisher: "Tokyo Institute of Science",
      use: "Japanese sovereign AI",
      category: "text",
      nvidiaId: "tokyotech-llm/llama-3.1-swallow-8b-instruct-v0.1",
    },
    {
      name: "llama-3.1-nemotron-70b-reward",
      publisher: "NVIDIA",
      use: "Reward model (RLHF)",
      category: "text",
      nvidiaId: "nvidia/llama-3.1-nemotron-70b-reward",
    },
    {
      name: "llama-3.2-3b-instruct",
      publisher: "Meta",
      use: "Chat, reasoning",
      category: "text",
      nvidiaId: "meta/llama-3.2-3b-instruct",
    },
    {
      name: "llama-3.2-1b-instruct",
      publisher: "Meta",
      use: "Chat, reasoning",
      category: "text",
      nvidiaId: "meta/llama-3.2-1b-instruct",
    },
    {
      name: "qwen2-7b-instruct",
      publisher: "Qwen",
      use: "Chinese & English LLM",
      category: "text",
      nvidiaId: "qwen/qwen2-7b-instruct",
    },
    {
      name: "dracarys-llama-3.1-70b-instruct",
      publisher: "Abacus.AI",
      use: "Code, summarization",
      category: "text",
      nvidiaId: "abacusai/dracarys-llama-3.1-70b-instruct",
    },
    {
      name: "llama-3.1-405b-instruct",
      publisher: "Meta",
      use: "Synthetic data, coding",
      category: "text",
      nvidiaId: "meta/llama-3.1-405b-instruct",
    },
    {
      name: "llama-3.1-70b-instruct",
      publisher: "Meta",
      use: "Chat",
      category: "text",
      nvidiaId: "meta/llama-3.1-70b-instruct",
    },
    {
      name: "llama-3.1-8b-instruct",
      publisher: "Meta",
      use: "Chat",
      category: "text",
      nvidiaId: "meta/llama-3.1-8b-instruct",
    },
    {
      name: "phi-3-medium-128k-instruct",
      publisher: "Microsoft",
      use: "Chat, reasoning",
      category: "text",
      nvidiaId: "microsoft/phi-3-medium-128k-instruct",
    },
    {
      name: "gemma-2-27b-it",
      publisher: "Google",
      use: "Chat, text generation",
      category: "text",
      nvidiaId: "google/gemma-2-27b-it",
    },
    {
      name: "gemma-2-9b-it",
      publisher: "Google",
      use: "Chat, text generation",
      category: "text",
      nvidiaId: "google/gemma-2-9b-it",
    },
    {
      name: "llama3-chatqa-1.5-8b",
      publisher: "NVIDIA",
      use: "Text chatbot/search",
      category: "text",
      nvidiaId: "nvidia/llama3-chatqa-1.5-8b",
    },
    {
      name: "mistral-7b-instruct-v0.3",
      publisher: "Mistral AI",
      use: "Chat",
      category: "text",
      nvidiaId: "mistralai/mistral-7b-instruct-v0.3",
    },
    {
      name: "solar-10.7b-instruct",
      publisher: "Upstage",
      use: "NLP, reasoning, math",
      category: "text",
      nvidiaId: "upstage/solar-10.7b-instruct",
    },
    {
      name: "nv-embed-v1",
      publisher: "NVIDIA",
      use: "Text embeddings",
      category: "embedding",
      nvidiaId: "nvidia/nv-embed-v1",
    },
    {
      name: "bge-m3",
      publisher: "BAAI",
      use: "Text retrieval / embeddings",
      category: "embedding",
      nvidiaId: "baai/bge-m3",
    },
    {
      name: "breeze-7b-instruct",
      publisher: "MediaTek",
      use: "Traditional Chinese chat",
      category: "text",
      nvidiaId: "mediatek/breeze-7b-instruct",
    },
    {
      name: "phi-3-small-8k-instruct",
      publisher: "Microsoft",
      use: "Chat",
      category: "text",
      nvidiaId: "microsoft/phi-3-small-8k-instruct",
    },
    {
      name: "phi-3-small-128k-instruct",
      publisher: "Microsoft",
      use: "Chat (long context)",
      category: "text",
      nvidiaId: "microsoft/phi-3-small-128k-instruct",
    },
    {
      name: "phi-3-medium-4k-instruct",
      publisher: "Microsoft",
      use: "Chat",
      category: "text",
      nvidiaId: "microsoft/phi-3-medium-4k-instruct",
    },
    {
      name: "sea-lion-7b-instruct",
      publisher: "AI Singapore",
      use: "Southeast Asian languages",
      category: "text",
      nvidiaId: "ai-singapore/sea-lion-7b-instruct",
    },
    {
      name: "phi-3-mini-4k-instruct",
      publisher: "Microsoft",
      use: "Chat",
      category: "text",
      nvidiaId: "microsoft/phi-3-mini-4k-instruct",
    },
    {
      name: "phi-3-mini-128k-instruct",
      publisher: "Microsoft",
      use: "Chat (long context)",
      category: "text",
      nvidiaId: "microsoft/phi-3-mini-128k-instruct",
    },
    {
      name: "mixtral-8x22b-instruct-v0.1",
      publisher: "Mistral AI",
      use: "Advanced reasoning",
      category: "text",
      nvidiaId: "mistralai/mixtral-8x22b-instruct-v0.1",
    },
    {
      name: "llama3-70b-instruct",
      publisher: "Meta",
      use: "Chat",
      category: "text",
      nvidiaId: "meta/llama3-70b-instruct",
    },
    {
      name: "llama3-8b-instruct",
      publisher: "Meta",
      use: "Chat",
      category: "text",
      nvidiaId: "meta/llama3-8b-instruct",
    },
    {
      name: "rerank-qa-mistral-4b",
      publisher: "NVIDIA",
      use: "Ranking / reranking",
      category: "embedding",
      nvidiaId: "nvidia/rerank-qa-mistral-4b",
    },
    {
      name: "gemma-7b",
      publisher: "Google",
      use: "Chat, text generation",
      category: "text",
      nvidiaId: "google/gemma-7b",
    },
    {
      name: "mistral-7b-instruct-v0.2",
      publisher: "Mistral AI",
      use: "Chat",
      category: "text",
      nvidiaId: "mistralai/mistral-7b-instruct-v0.2",
    },
    {
      name: "mixtral-8x7b-instruct",
      publisher: "Mistral AI",
      use: "Advanced reasoning",
      category: "text",
      nvidiaId: "mistralai/mixtral-8x7b-instruct",
    },
    {
      name: "llama-3-taiwan-70b-instruct",
      publisher: "Yen-Ting Lin",
      use: "Traditional Mandarin",
      category: "text",
      nvidiaId: "yentinglin/llama-3-taiwan-70b-instruct",
    },
    {
      name: "llama-3-swallow-70b-instruct-v0.1",
      publisher: "TokyoTech-LLM",
      use: "Japanese",
      category: "text",
      nvidiaId: "tokyotech-llm/llama-3-swallow-70b-instruct-v0.1",
    },
    {
      name: "jamba-1.5-mini-instruct",
      publisher: "AI21 Labs",
      use: "Chat, generative AI",
      category: "text",
      nvidiaId: "ai21labs/jamba-1.5-mini-instruct",
    },
    {
      name: "nemotron-mini-4b-instruct",
      publisher: "NVIDIA",
      use: "Chat, RAG",
      category: "text",
      nvidiaId: "nvidia/nemotron-mini-4b-instruct",
    },
    {
      name: "mistral-nemo-minitron-8b-base",
      publisher: "NVIDIA",
      use: "Chat, content generation",
      category: "text",
      nvidiaId: "nvidia/mistral-nemo-minitron-8b-base",
    },
    {
      name: "phi-3.5-mini-instruct",
      publisher: "Microsoft",
      use: "Chat, edge",
      category: "text",
      nvidiaId: "microsoft/phi-3.5-mini-instruct",
    },
    {
      name: "rakutenai-7b-instruct",
      publisher: "Rakuten",
      use: "Chat",
      category: "text",
      nvidiaId: "rakuten/rakutenai-7b-instruct",
    },
    {
      name: "rakutenai-7b-chat",
      publisher: "Rakuten",
      use: "Chat",
      category: "text",
      nvidiaId: "rakuten/rakutenai-7b-chat",
    },
    {
      name: "chatglm3-6b",
      publisher: "THUDM",
      use: "Chinese/English chat, translation",
      category: "text",
      nvidiaId: "thudm/chatglm3-6b",
    },
    {
      name: "baichuan2-13b-chat",
      publisher: "Baichuan AI",
      use: "Chinese/English chat",
      category: "text",
      nvidiaId: "baichuan-ai/baichuan2-13b-chat",
    },
    {
      name: "gpt-oss-20b",
      publisher: "OpenAI",
      use: "Text reasoning, math",
      category: "text",
      nvidiaId: "openai/gpt-oss-20b",
    },
    {
      name: "gpt-oss-120b",
      publisher: "OpenAI",
      use: "Text reasoning (MoE)",
      category: "text",
      nvidiaId: "openai/gpt-oss-120b",
    },

    // Code-focused models
    {
      name: "usdcode",
      publisher: "NVIDIA",
      use: "OpenUSD coding",
      category: "code",
      nvidiaId: "nvidia/usdcode",
    },
    {
      name: "qwen2.5-coder-32b-instruct",
      publisher: "Qwen",
      use: "Code generation, reasoning, fixing",
      category: "code",
      nvidiaId: "qwen/qwen2.5-coder-32b-instruct",
    },
    {
      name: "qwen2.5-coder-7b-instruct",
      publisher: "Qwen",
      use: "Code completion",
      category: "code",
      nvidiaId: "qwen/qwen2.5-coder-7b-instruct",
    },
    {
      name: "mamba-codestral-7b-v0.1",
      publisher: "Mistral AI",
      use: "Code completion",
      category: "code",
      nvidiaId: "mistralai/mamba-codestral-7b-v0.1",
    },
    {
      name: "starcoder2-7b",
      publisher: "BigCode",
      use: "Code completion, Python",
      category: "code",
      nvidiaId: "bigcode/starcoder2-7b",
    },
    {
      name: "qwq-32b",
      publisher: "Qwen",
      use: "Coding, reasoning",
      category: "code",
      nvidiaId: "qwen/qwq-32b",
    },

    // Speech / audio and TTS
    {
      name: "parakeet-ctc-0.6b-zh-tw",
      publisher: "NVIDIA",
      use: "Mandarin Taiwanese English ASR",
      category: "speech",
      nvidiaId: "nvidia/parakeet-ctc-0.6b-zh-tw",
    },
    {
      name: "parakeet-ctc-0.6b-zh-cn",
      publisher: "NVIDIA",
      use: "Mandarin English ASR",
      category: "speech",
      nvidiaId: "nvidia/parakeet-ctc-0.6b-zh-cn",
    },
    {
      name: "parakeet-ctc-0.6b-es",
      publisher: "NVIDIA",
      use: "Spanish-English ASR",
      category: "speech",
      nvidiaId: "nvidia/parakeet-ctc-0.6b-es",
    },
    {
      name: "parakeet-ctc-0.6b-vi",
      publisher: "NVIDIA",
      use: "Vietnamese-English ASR",
      category: "speech",
      nvidiaId: "nvidia/parakeet-ctc-0.6b-vi",
    },
    {
      name: "parakeet-tdt-0.6b-v2",
      publisher: "NVIDIA",
      use: "English ASR with timestamps",
      category: "speech",
      nvidiaId: "nvidia/parakeet-tdt-0.6b-v2",
    },
    {
      name: "parakeet-ctc-1.1b-asr",
      publisher: "NVIDIA",
      use: "English ASR",
      category: "speech",
      nvidiaId: "nvidia/parakeet-ctc-1.1b-asr",
    },
    {
      name: "parakeet-ctc-0.6b-asr",
      publisher: "NVIDIA",
      use: "English ASR",
      category: "speech",
      nvidiaId: "nvidia/parakeet-ctc-0.6b-asr",
    },
    {
      name: "parakeet-1.1b-rnnt-multilingual-asr",
      publisher: "NVIDIA",
      use: "25-language ASR",
      category: "speech",
      nvidiaId: "nvidia/parakeet-1.1b-rnnt-multilingual-asr",
    },
    {
      name: "whisper-large-v3",
      publisher: "OpenAI",
      use: "Speech recognition",
      category: "speech",
      nvidiaId: "openai/whisper-large-v3",
    },
    {
      name: "canary-1b-asr",
      publisher: "NVIDIA",
      use: "Multilingual speech-to-text & translation",
      category: "speech",
      nvidiaId: "nvidia/canary-1b-asr",
    },
    {
      name: "phi-4-multimodal-instruct",
      publisher: "Microsoft",
      use: "Speech + image reasoning",
      category: "speech",
      nvidiaId: "microsoft/phi-4-multimodal-instruct",
    },
    {
      name: "magpie-tts-flow",
      publisher: "NVIDIA",
      use: "Text-to-speech",
      category: "speech",
      nvidiaId: "nvidia/magpie-tts-flow",
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

  // Only set model-specific values where they are well-known.
  const knownModelMetadata = {
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
  };

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
    const known = knownModelMetadata[id] || {};

    return {
      id,
      name: modelName,
      provider,
      category,
      capabilities: Array.isArray(rawModel?.capabilities)
        ? rawModel.capabilities
        : categoryToCapabilities[category] || ["text"],
      context_window:
        typeof known.context_window === "number" ? known.context_window : null,
      max_output_tokens:
        typeof known.max_output_tokens === "number"
          ? known.max_output_tokens
          : null,
      input_cost:
        typeof known.input_cost === "number" ? known.input_cost : null,
      output_cost:
        typeof known.output_cost === "number" ? known.output_cost : null,
      knowledge_cutoff: known.knowledge_cutoff || null,
      isPreview: Boolean(rawModel?.isPreview || known.isPreview),
      comingSoon: Boolean(rawModel?.comingSoon || known.comingSoon),
      description,

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
    if (typeof value !== "number") return "Model-specific";
    return value >= 1000 ? `${Math.round(value / 1000)}k` : String(value);
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
        context: formatTokenCount(model.context_window),
        maxOut: formatTokenCount(model.max_output_tokens),
      };
    })
    .filter(Boolean);

  window.CLEX_MARQUEE_MODELS = canonicalModels
    .filter((model) =>
      ["text", "code", "embedding", "speech", "vision"].includes(model.category),
    )
    .slice(0, 14)
    .map((model) => ({
      id: model.id,
      name: model.id,
      provider: providerSlug(model.provider),
      context: formatTokenCount(model.context_window),
      maxOutput: formatTokenCount(model.max_output_tokens),
      pricingNote:
        model.input_cost != null || model.output_cost != null
          ? `$${model.input_cost ?? "?"}/${
              model.output_cost ?? "?"
            } per 1M tokens`
          : "See provider docs",
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
