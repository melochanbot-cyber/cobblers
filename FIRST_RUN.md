# First Run Checklist

Quick guide to actually using Cobblers for the first time.

## Prerequisites

1. **OpenRouter API Key**
   - Sign up at https://openrouter.ai
   - Get API key from https://openrouter.ai/keys
   - Export it: `export OPENROUTER_API_KEY="sk-or-v1-..."`
   - (Or add to your shell rc file for persistence)

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build**
   ```bash
   npm run build
   ```

## First Use

Try a simple question first:

```bash
cobblers ask "What are the trade-offs between learning depth-first vs breadth-first?"
```

## Good First Questions

- **Decisions:** "Should I prioritize speed or quality for this MVP?"
- **Trade-offs:** "What are the pros and cons of serverless vs containers?"
- **Learning:** "How should I approach learning a new programming language?"
- **Strategy:** "When is it worth building vs buying a solution?"

## Expected Behavior

1. Shows each persona's perspective
2. Multiple rounds of deliberation
3. Final synthesis with consensus + dissent
4. Takes ~30-60 seconds depending on model speed

## Troubleshooting

**"API key not found"**
- Make sure OPENROUTER_API_KEY is exported
- Check with: `echo $OPENROUTER_API_KEY`

**Models not responding**
- Check OpenRouter status: https://openrouter.ai/status
- Try different models: `cobblers ask "question" --models gpt-4o-mini`

**Too slow**
- Use faster/cheaper models: `--models google/gemini-2.0-flash-001`

---

**Note:** This tool was built Feb 27, 2026 but hasn't been battle-tested yet. You're an early user!
