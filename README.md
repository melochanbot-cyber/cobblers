# 🪑 Cobblers

Multi-agent deliberation CLI & web UI — let AI personas debate and synthesize.

Instead of getting one AI's opinion, convene a **council** of AI personas that debate, challenge each other, and synthesize their discussion into actionable insights.

## Why?

Single-agent AI gives you one perspective with confident delivery and hidden blind spots. Cobblers gives you:

- **Multiple perspectives** — Different personas approach problems differently
- **Visible reasoning** — See the debate, not just the conclusion
- **Preserved dissent** — Disagreements aren't smoothed over
- **Stress-tested ideas** — Each persona challenges the others

## Quick Start

```bash
# Install
npm install -g cobblers

# Set your OpenRouter API key
export OPENROUTER_API_KEY="sk-or-..."

# Ask a question
cobblers ask "Should we use a monolith or microservices for our new project?"

# Review code
cobblers review ./src/auth.ts

# Make a decision
cobblers decide --options "Launch now, Wait for feature X, Pivot entirely"

# Start web UI
cobblers serve
```

## Installation

```bash
# From npm (when published)
npm install -g cobblers

# From source
git clone https://github.com/Raylinkh/cobblers.git
cd cobblers
npm install
npm run build
npm link
```

## Configuration

### API Key (Required)

Cobblers uses [OpenRouter](https://openrouter.ai) to access multiple AI models. Get your API key at https://openrouter.ai/keys

```bash
export OPENROUTER_API_KEY="sk-or-v1-..."
```

### Default Models

By default, Cobblers uses these free/cheap models:
- `google/gemini-2.0-flash-001`
- `stepfun/step-2-16k-nothink`
- `meta-llama/llama-3.3-70b-instruct`

Override with `--models`:
```bash
cobblers ask "..." --models "anthropic/claude-3-haiku,openai/gpt-4o-mini"
```

## CLI Commands

### `cobblers ask <question>`

General deliberation on any question.

```bash
cobblers ask "What's the best approach to handle authentication in a serverless app?"

# With options
cobblers ask "Should we rewrite in Rust?" \
  --agents 4 \
  --rounds 3 \
  --models "google/gemini-2.0-flash-001,anthropic/claude-3-haiku"
```

Options:
- `-a, --agents <n>` — Number of personas (default: 3)
- `-r, --rounds <n>` — Deliberation rounds (default: 2)
- `-m, --models <list>` — Comma-separated model list

### `cobblers review <file>`

Code review with security, maintainability, and performance perspectives.

```bash
cobblers review ./src/api/auth.ts
cobblers review ./package.json --agents 2
```

### `cobblers decide --options <list>`

Decision analysis with pros, cons, and risk assessment.

```bash
cobblers decide --options "Next.js, Remix, Astro"
cobblers decide --options "Build in-house, Buy SaaS, Partner with vendor"
```

### `cobblers serve`

Start the web interface.

```bash
cobblers serve           # Default port 3000
cobblers serve -p 8080   # Custom port
```

## Default Personas

1. **Pragmatist** — Practical, grounded. Focuses on what works now, resource constraints, simplest solutions.

2. **Devil's Advocate** — Challenges assumptions, surfaces risks, plays out worst-case scenarios.

3. **Systems Thinker** — Big picture perspective, second-order effects, long-term consequences.

For code review, specialized personas are used:
- Security Reviewer
- Maintainability Reviewer  
- Performance Reviewer

## Web Interface

The web UI provides:
- Ask, Review, and Decide modes
- Configurable agents, rounds, and models
- Real-time streaming output
- Dark theme

Start with `cobblers serve` and open http://localhost:3000

## How It Works

1. **Input** — You provide a question, code, or decision options
2. **Deliberation** — Each persona responds in turn, seeing previous responses
3. **Rounds** — Multiple rounds let personas respond to each other
4. **Synthesis** — A neutral facilitator summarizes consensus, dissent, and recommendations

## Example Output

```
🪑 Council assembling...

─── Round 1: Pragmatist ───
For a 2-person team, I'd strongly recommend starting with a monolith...

─── Round 1: Devil's Advocate ───
While I understand the pragmatic appeal, let's consider what happens at scale...

─── Round 1: Systems Thinker ───
The real question isn't "monolith vs microservices" but "what's your growth trajectory?"...

─── Round 2: Pragmatist ───
Fair points about scale, but let me push back on the timeline assumptions...

[...]

═══════════════════════════════════════════════════════════════
SYNTHESIS
═══════════════════════════════════════════════════════════════

**Consensus:**
- Start with a monolith, but design for future extraction
- Key modules to isolate now: auth, billing, core domain logic

**Dissent:**
- Devil's Advocate notes migration costs will still be paid later
- Flag for revisit at 10x scale

**Recommendation:**
Monolith with modular boundaries. Revisit architecture at 10k users.
```

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode
npm run dev

# Run locally
node dist/index.js ask "test question"
```

## License

MIT

## Credits

Built for thinking better, not just faster.
