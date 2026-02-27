export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export const DEFAULT_MODELS = [
  "google/gemini-2.0-flash-001",
  "stepfun/step-2-16k-nothink", 
  "meta-llama/llama-3.3-70b-instruct"
];

export interface ModelInfo {
  id: string;
  name: string;
  pricing: {
    prompt: number;  // $ per 1M tokens
    completion: number;
  };
  context_length: number;
  top_provider?: {
    is_moderated: boolean;
  };
}

export interface ModelsResponse {
  data: ModelInfo[];
}

// Fetch available models from OpenRouter, sorted by cost (cheapest first)
export async function fetchModels(options: {
  free?: boolean;
  maxCost?: number;  // max $/1M tokens
  limit?: number;
} = {}): Promise<ModelInfo[]> {
  const response = await fetch("https://openrouter.ai/api/v1/models");
  
  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status}`);
  }
  
  const data = await response.json() as ModelsResponse;
  let models = data.data;
  
  // Filter by cost
  if (options.free) {
    models = models.filter(m => m.pricing.prompt === 0 && m.pricing.completion === 0);
  } else if (options.maxCost !== undefined) {
    models = models.filter(m => 
      (m.pricing.prompt + m.pricing.completion) / 2 <= options.maxCost!
    );
  }
  
  // Sort by cost (cheapest first), then by context length (longer = better)
  models.sort((a, b) => {
    const costA = a.pricing.prompt + a.pricing.completion;
    const costB = b.pricing.prompt + b.pricing.completion;
    if (costA !== costB) return costA - costB;
    return b.context_length - a.context_length;
  });
  
  if (options.limit) {
    models = models.slice(0, options.limit);
  }
  
  return models;
}

// Format model info for display
export function formatModelInfo(model: ModelInfo): string {
  const cost = model.pricing.prompt === 0 && model.pricing.completion === 0
    ? "FREE"
    : `$${((model.pricing.prompt + model.pricing.completion) / 2).toFixed(2)}/1M`;
  const ctx = model.context_length >= 1000000 
    ? `${(model.context_length / 1000000).toFixed(1)}M`
    : `${Math.round(model.context_length / 1000)}k`;
  return `${model.id} (${cost}, ${ctx} ctx)`;
}

export class OpenRouterClient {
  private apiKey: string;
  private baseUrl = "https://openrouter.ai/api/v1";

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("OPENROUTER_API_KEY environment variable is required");
    }
  }

  async chat(
    messages: Message[],
    model: string,
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
        "HTTP-Referer": "https://github.com/Raylinkh/cobblers",
        "X-Title": "Cobblers"
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${error}`);
    }

    const data = await response.json() as ChatCompletionResponse;
    return data.choices[0]?.message?.content || "";
  }

  async *chatStream(
    messages: Message[],
    model: string,
    options: { temperature?: number; maxTokens?: number } = {}
  ): AsyncGenerator<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
        "HTTP-Referer": "https://github.com/Raylinkh/cobblers",
        "X-Title": "Cobblers"
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
        stream: true
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") return;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
  }
}
