import type { AIProvider } from "./types";
import { createXAIProvider, XAIProvider } from "./providers/xai";
import { createOpenAIProvider, OpenAIProvider } from "./providers/openai";
import { createOllamaProvider, OllamaProvider } from "./providers/ollama";

/**
 * Available provider names
 */
export type ProviderName = "openai" | "xai" | "ollama";

/**
 * Provider priority order (first available will be used)
 */
const PROVIDER_PRIORITY: ProviderName[] = ["openai", "xai", "ollama"];

/**
 * Cached provider instances
 */
const providerCache: Partial<Record<ProviderName, AIProvider>> = {};

/**
 * Get a specific AI provider by name
 */
export function getProviderByName(name: ProviderName): AIProvider | null {
  // Check cache first
  if (providerCache[name]) {
    return providerCache[name]!;
  }

  let provider: AIProvider | null = null;

  switch (name) {
    case "openai":
      provider = createOpenAIProvider();
      break;
    case "xai":
      provider = createXAIProvider();
      break;
    case "ollama":
      provider = createOllamaProvider();
      break;
  }

  if (provider) {
    providerCache[name] = provider;
  }

  return provider;
}

/**
 * Get the configured AI provider
 *
 * Provider selection priority:
 * 1. Explicit AI_PROVIDER env var
 * 2. First available provider from priority list
 *
 * Environment variables:
 * - AI_PROVIDER: "openai" | "xai" | "ollama" - Force a specific provider
 * - OPENAI_API_KEY: Required for OpenAI
 * - XAI_API_KEY: Required for X.AI/Grok
 * - OLLAMA_ENABLED: Set to "true" to enable Ollama
 * - OLLAMA_BASE_URL: Ollama server URL (default: http://localhost:11434)
 */
export function getAIProvider(): AIProvider | null {
  // Check for explicit provider selection
  const explicitProvider = process.env.AI_PROVIDER as ProviderName | undefined;
  if (explicitProvider) {
    const provider = getProviderByName(explicitProvider);
    if (provider) {
      return provider;
    }
    console.warn(
      `Requested AI provider "${explicitProvider}" is not available. Falling back to auto-detection.`
    );
  }

  // Auto-detect based on available credentials
  for (const name of PROVIDER_PRIORITY) {
    const provider = getProviderByName(name);
    if (provider) {
      return provider;
    }
  }

  return null;
}

/**
 * Get all available providers
 */
export function getAvailableProviders(): Map<ProviderName, AIProvider> {
  const available = new Map<ProviderName, AIProvider>();

  for (const name of PROVIDER_PRIORITY) {
    const provider = getProviderByName(name);
    if (provider) {
      available.set(name, provider);
    }
  }

  return available;
}

/**
 * Check if any AI provider is configured
 */
export function hasAIProvider(): boolean {
  return getAIProvider() !== null;
}

/**
 * Get provider info for debugging/status
 */
export function getProviderStatus(): {
  configured: ProviderName | null;
  available: ProviderName[];
  details: Record<ProviderName, { available: boolean; reason?: string }>;
} {
  const available: ProviderName[] = [];
  const details: Record<ProviderName, { available: boolean; reason?: string }> = {
    openai: { available: false },
    xai: { available: false },
    ollama: { available: false },
  };

  // Check OpenAI
  if (process.env.OPENAI_API_KEY) {
    available.push("openai");
    details.openai = { available: true };
  } else {
    details.openai = { available: false, reason: "OPENAI_API_KEY not set" };
  }

  // Check XAI
  if (process.env.XAI_API_KEY) {
    available.push("xai");
    details.xai = { available: true };
  } else {
    details.xai = { available: false, reason: "XAI_API_KEY not set" };
  }

  // Check Ollama
  if (process.env.OLLAMA_ENABLED === "true" || process.env.OLLAMA_BASE_URL) {
    available.push("ollama");
    details.ollama = { available: true };
  } else {
    details.ollama = { available: false, reason: "OLLAMA_ENABLED not set" };
  }

  const provider = getAIProvider();
  const configured = provider ? (provider.name as ProviderName) : null;

  return { configured, available, details };
}

