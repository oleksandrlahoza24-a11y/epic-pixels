// ============================================================
//  Ardy's ASI — Model Registry & API Configuration
//  models.js
// ============================================================

const OPENROUTER_API_KEY = "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";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// ── Image Generation (via Pollinations – free, no key needed) ──
const IMAGE_GEN_URL = "https://image.pollinations.ai/prompt/";

// ============================================================
//  MODEL DEFINITIONS
// ============================================================

const MODELS = [
  {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    name: "NVIDIA Nemotron 3 Super",
    shortName: "Nemotron 3",
    provider: "NVIDIA via OpenRouter",
    badge: "FREE",
    badgeColor: "#00d9a3",
    icon: "⚡",
    contextWindow: "1M tokens",
    price: "Free",
    released: "Mar 11, 2026",
    weeklyTokens: "696B",
    modalities: ["text"],
    strengths: ["Long-context reasoning", "Multi-agent tasks", "Code generation", "SWE-Bench", "AIME 2025"],
    architecture: "Hybrid Mamba-Transformer MoE (120B params, 12B active)",
    description:
      "NVIDIA's flagship open hybrid MoE model. 120B parameters with only 12B active per token thanks to Latent MoE — calling 4 experts for the cost of one. Built on a hybrid Mamba-Transformer architecture with multi-token prediction (MTP), it delivers 50%+ higher token throughput than comparable open models. Fully open weights under the NVIDIA Open License.",
    highlights: [
      "1 million token context window",
      "Multi-environment RL training across 10+ environments",
      "Leads AIME 2025, TerminalBench, SWE-Bench Verified",
      "Open weights on HuggingFace",
    ],
    links: {
      overview: "https://openrouter.ai/nvidia/nemotron-3-super-120b-a12b:free",
      weights: "https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-FP8",
      benchmarks: "https://openrouter.ai/nvidia/nemotron-3-super-120b-a12b:free/benchmarks",
    },
    recommended: true,
    systemPrompt:
      "You are Ardy's ASI — an advanced AI coding assistant powered by NVIDIA Nemotron 3 Super. You specialise in writing clean, efficient, well-documented code in any language. When writing code always wrap it in triple-backtick fenced blocks with the language identifier. Explain your reasoning clearly and concisely. Be direct, thorough, and professional.",
  },
];

// ============================================================
//  ACTIVE MODEL (default)
// ============================================================

let activeModelId = MODELS[0].id;

function getActiveModel() {
  return MODELS.find((m) => m.id === activeModelId) || MODELS[0];
}

function setActiveModel(id) {
  if (MODELS.find((m) => m.id === id)) {
    activeModelId = id;
    return true;
  }
  return false;
}

// ============================================================
//  OPENROUTER CHAT API HELPER
// ============================================================

async function sendChatMessage(messages, onChunk, signal) {
  const model = getActiveModel();

  const body = {
    model: model.id,
    messages: [
      { role: "system", content: model.systemPrompt },
      ...messages,
    ],
    stream: true,
    temperature: 0.7,
    max_tokens: 4096,
  };

  const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": window.location.href,
      "X-Title": "Ardy's ASI",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") break;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed?.choices?.[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          onChunk(delta, fullText);
        }
      } catch (_) {}
    }
  }

  return fullText;
}

// ============================================================
//  IMAGE GENERATION HELPER (Pollinations)
// ============================================================

async function generateImage(prompt) {
  const encoded = encodeURIComponent(prompt);
  const url = `${IMAGE_GEN_URL}${encoded}?width=768&height=768&nologo=true&enhance=true`;
  return url; // Pollinations returns image directly via URL
}

// ============================================================
//  EXPORT
// ============================================================

window.ASI = window.ASI || {};
Object.assign(window.ASI, {
  MODELS,
  OPENROUTER_BASE_URL,
  getActiveModel,
  setActiveModel,
  sendChatMessage,
  generateImage,
});
