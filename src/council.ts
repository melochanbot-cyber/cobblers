import { OpenRouterClient, Message, DEFAULT_MODELS } from "./openrouter.js";
import { Persona, getPersonas } from "./personas.js";

export interface CouncilConfig {
  agents: number;
  rounds: number;
  models: string[];
  stream?: boolean;
  onToken?: (token: string) => void;
  onRoundStart?: (round: number, persona: Persona) => void;
}

export interface Turn {
  persona: Persona;
  model: string;
  content: string;
}

export interface Round {
  number: number;
  turns: Turn[];
}

export interface DeliberationResult {
  question: string;
  rounds: Round[];
  synthesis: string;
}

const DEFAULT_CONFIG: CouncilConfig = {
  agents: 3,
  rounds: 2,
  models: DEFAULT_MODELS,
  stream: false
};

export class Council {
  private client: OpenRouterClient;
  private config: CouncilConfig;
  private personas: Persona[];

  constructor(config: Partial<CouncilConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.client = new OpenRouterClient();
    this.personas = getPersonas(this.config.agents);
  }

  async deliberate(question: string): Promise<DeliberationResult> {
    const rounds: Round[] = [];
    let conversationHistory: string[] = [];

    // Run deliberation rounds
    for (let roundNum = 1; roundNum <= this.config.rounds; roundNum++) {
      const round: Round = { number: roundNum, turns: [] };
      
      for (let i = 0; i < this.personas.length; i++) {
        const persona = this.personas[i];
        const model = this.config.models[i % this.config.models.length];
        
        this.config.onRoundStart?.(roundNum, persona);

        const messages: Message[] = [
          { role: "system", content: persona.systemPrompt },
          { role: "user", content: this.buildPrompt(question, roundNum, conversationHistory, persona) }
        ];

        let content: string;
        if (this.config.stream && this.config.onToken) {
          content = "";
          for await (const token of this.client.chatStream(messages, model)) {
            content += token;
            this.config.onToken(token);
          }
        } else {
          content = await this.client.chat(messages, model);
        }

        round.turns.push({ persona, model, content });
        conversationHistory.push(`**${persona.name}:** ${content}`);
      }

      rounds.push(round);
    }

    // Generate synthesis
    const synthesis = await this.synthesize(question, rounds);

    return { question, rounds, synthesis };
  }

  private buildPrompt(
    question: string,
    roundNum: number,
    history: string[],
    persona: Persona
  ): string {
    let prompt = `**Question for deliberation:** ${question}\n\n`;
    
    if (history.length > 0) {
      prompt += `**Previous discussion:**\n${history.join("\n\n")}\n\n`;
    }

    prompt += `**Your turn (Round ${roundNum}):**\n`;
    prompt += `As the ${persona.role}, share your perspective. `;
    
    if (roundNum === 1) {
      prompt += "Give your initial take on this question.";
    } else {
      prompt += "Respond to what others have said. Agree, disagree, or build on their points.";
    }

    prompt += "\n\nKeep your response focused and substantive (2-3 paragraphs max).";

    return prompt;
  }

  private async synthesize(question: string, rounds: Round[]): Promise<string> {
    const allTurns = rounds.flatMap(r => r.turns);
    const discussion = allTurns.map(t => `**${t.persona.name}:** ${t.content}`).join("\n\n");

    const messages: Message[] = [
      {
        role: "system",
        content: `You are a neutral facilitator synthesizing a council deliberation. Your job is to:
1. Identify points of consensus
2. Preserve and highlight dissenting views (don't smooth over disagreements)
3. Provide a balanced recommendation (if appropriate)
4. Note any unresolved questions

Be concise but thorough. Use clear structure with headers.`
      },
      {
        role: "user",
        content: `**Original question:** ${question}

**Full deliberation:**
${discussion}

**Please synthesize this deliberation:**
- What did the council agree on?
- What key disagreements remain?
- What is the recommended path forward (if any)?
- What questions need further exploration?`
      }
    ];

    // Use first model for synthesis
    const model = this.config.models[0];
    
    if (this.config.stream && this.config.onToken) {
      let content = "";
      for await (const token of this.client.chatStream(messages, model)) {
        content += token;
        this.config.onToken(token);
      }
      return content;
    }

    return this.client.chat(messages, model);
  }

  async review(filePath: string, fileContent: string): Promise<DeliberationResult> {
    const question = `Review this code for quality, security, maintainability, and potential improvements:

**File:** ${filePath}

\`\`\`
${fileContent}
\`\`\`

Each persona should focus on their area of expertise while reviewing.`;

    // Override personas for code review
    this.personas = [
      {
        name: "Security Reviewer",
        role: "security expert",
        systemPrompt: "You are a security expert reviewing code. Focus on vulnerabilities, input validation, authentication, authorization, and secure coding practices."
      },
      {
        name: "Maintainability Reviewer", 
        role: "code quality expert",
        systemPrompt: "You focus on code maintainability: readability, naming, structure, documentation, DRY principles, and long-term maintenance concerns."
      },
      {
        name: "Performance Reviewer",
        role: "performance expert", 
        systemPrompt: "You focus on performance: algorithmic efficiency, memory usage, potential bottlenecks, and scalability considerations."
      }
    ].slice(0, this.config.agents);

    return this.deliberate(question);
  }

  async decide(options: string[]): Promise<DeliberationResult> {
    const optionsList = options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join("\n");
    
    const question = `We need to make a decision between the following options:

${optionsList}

Analyze each option's pros, cons, risks, and recommend which to choose (or if more information is needed).`;

    return this.deliberate(question);
  }
}

export function formatResult(result: DeliberationResult, color = true): string {
  const c = {
    reset: color ? "\x1b[0m" : "",
    bold: color ? "\x1b[1m" : "",
    dim: color ? "\x1b[2m" : "",
    cyan: color ? "\x1b[36m" : "",
    yellow: color ? "\x1b[33m" : "",
    green: color ? "\x1b[32m" : "",
    blue: color ? "\x1b[34m" : ""
  };

  let output = "";
  
  output += `\n${c.bold}${c.cyan}═══════════════════════════════════════════════════════════════${c.reset}\n`;
  output += `${c.bold}COUNCIL DELIBERATION${c.reset}\n`;
  output += `${c.dim}Question: ${result.question}${c.reset}\n`;
  output += `${c.cyan}═══════════════════════════════════════════════════════════════${c.reset}\n\n`;

  for (const round of result.rounds) {
    output += `${c.bold}${c.yellow}─── Round ${round.number} ${"─".repeat(50)}${c.reset}\n\n`;
    
    for (const turn of round.turns) {
      output += `${c.bold}${c.blue}${turn.persona.name}${c.reset} ${c.dim}(${turn.model})${c.reset}\n`;
      output += `${turn.content}\n\n`;
    }
  }

  output += `${c.bold}${c.green}═══════════════════════════════════════════════════════════════${c.reset}\n`;
  output += `${c.bold}SYNTHESIS${c.reset}\n`;
  output += `${c.green}═══════════════════════════════════════════════════════════════${c.reset}\n\n`;
  output += result.synthesis;
  output += "\n";

  return output;
}
